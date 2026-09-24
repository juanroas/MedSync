"use client";

import { Card, EmptyState, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import {
  isAppointmentJoinWindowOpen,
  isAppointmentMissed,
  isAppointmentRoomJoinable,
  isAppointmentStaleInProgress,
} from "@/lib/appointments";
import { formatDateTime, statusClass, statusLabel } from "@/lib/format";
import type { Appointment, DoctorAvailabilitySlot, WeekDay } from "@/lib/types";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { CalendarDays, Clock, Clock3, FileText, Plus, Stethoscope, Trash2, UserRound, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type AppointmentTab = "active" | "history";

// Uma consulta vai para o Historico quando nao ha mais nada acionavel nela: ja aconteceu
// (concluida), foi cancelada, o paciente nao compareceu, ou a janela de atendimento fechou
// sem que a sala fosse aberta/encerrada. Tudo o mais (agendada dentro do prazo, em andamento
// dentro da janela) fica em Ativas.
function isAppointmentHistory(appointment: Appointment) {
  return (
    appointment.status === "Completed" ||
    appointment.status === "Cancelled" ||
    appointment.status === "NoShow" ||
    isAppointmentMissed(appointment) ||
    (appointment.status === "InProgress" && isAppointmentStaleInProgress(appointment))
  );
}

export default function AppointmentsPage() {
  const router = useRouter();
  const roles = getSession()?.user.roles ?? [];
  const isDoctor = roles.includes("Doctor");
  const isPatient = roles.includes("Patient");
  const canOperationalSchedule = roles.some((role) =>
    ["Receptionist", "ClinicAdmin", "MedicalDirector", "Support", "OccupationalHealthAdmin"].includes(role),
  );
  const canRequestOrSchedule = isPatient || canOperationalSchedule;
  const canJoinRole = roles.some((role) =>
    ["Doctor", "Patient", "MedicalDirector", "OccupationalHealthAdmin"].includes(role),
  );
  // Simplificacao de tela: quando o proprio perfil ja e o paciente ou o medico da linha, a coluna
  // correspondente so repetiria o mesmo nome em toda a lista, entao ela e omitida.
  const showPatientColumn = !isPatient;
  const showDoctorColumn = !isDoctor;
  const columnsClass =
    showPatientColumn && showDoctorColumn
      ? "lg:grid-cols-[1.05fr_.95fr_1fr_.55fr_300px]"
      : showPatientColumn
        ? "lg:grid-cols-[1.05fr_1fr_.55fr_300px]"
        : "lg:grid-cols-[.95fr_1fr_.55fr_300px]";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const [endingId, setEndingId] = useState("");
  const [cancelingId, setCancelingId] = useState("");
  const [tab, setTab] = useState<AppointmentTab>("active");
  const [, setNowTick] = useState(() => Date.now());
  const isMountedRef = useRef(false);
  const refreshingRef = useRef(false);

  const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotForm, setSlotForm] = useState<{ dayOfWeek: WeekDay; startTime: string; endTime: string }>({
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "12:00",
  });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState("");

  useEffect(() => {
    if (!isDoctor) {
      setSlotsLoading(false);
      return;
    }
    api
      .getMyAvailability()
      .then(setSlots)
      .catch((err) => setSlotError(err instanceof Error ? err.message : "Erro ao carregar disponibilidade."))
      .finally(() => setSlotsLoading(false));
  }, [isDoctor]);

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        const dayDiff = WEEKDAY_ORDER.indexOf(a.dayOfWeek) - WEEKDAY_ORDER.indexOf(b.dayOfWeek);
        return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
      }),
    [slots],
  );

  async function submitSlot(event: FormEvent) {
    event.preventDefault();
    setSlotSaving(true);
    setSlotError("");
    if (slotForm.startTime >= slotForm.endTime) {
      setSlotError("O horario inicial precisa ser antes do horario final.");
      setSlotSaving(false);
      return;
    }
    try {
      const created = await api.createMyAvailabilitySlot({
        dayOfWeek: slotForm.dayOfWeek,
        startTime: `${slotForm.startTime}:00`,
        endTime: `${slotForm.endTime}:00`,
      });
      setSlots((items) => [...items, created]);
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Erro ao salvar disponibilidade.");
    } finally {
      setSlotSaving(false);
    }
  }

  async function removeSlot(id: string) {
    setSlotError("");
    try {
      await api.deleteMyAvailabilitySlot(id);
      setSlots((items) => items.filter((slot) => slot.id !== id));
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Erro ao remover disponibilidade.");
    }
  }

  const activeAppointments = useMemo(
    () => appointments.filter((appointment) => !isAppointmentHistory(appointment)),
    [appointments],
  );
  const historyAppointments = useMemo(
    () => appointments.filter((appointment) => isAppointmentHistory(appointment)),
    [appointments],
  );
  const visibleAppointments = tab === "active" ? activeAppointments : historyAppointments;

  const loadAppointments = useCallback(async (showLoading: boolean) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (showLoading) setLoading(true);

    try {
      const items = await api.getAppointments();
      if (!isMountedRef.current) return;
      setAppointments(items);
      setError("");
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : "Erro ao carregar consultas.");
    } finally {
      refreshingRef.current = false;
      if (isMountedRef.current && showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadAppointments(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadAppointments]);

  useEffect(() => {
    function refreshWhenVisible() {
      setNowTick(Date.now());
      if (document.visibilityState === "visible") {
        loadAppointments(false);
      }
    }

    const minuteTick = window.setInterval(() => setNowTick(Date.now()), 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(minuteTick);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadAppointments]);

  async function startRoom(appointmentId: string) {
    setStartingId(appointmentId);
    setError("");
    try {
      await api.startConsultation(appointmentId);
      router.push(`/sala/${appointmentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar a sala.");
    } finally {
      setStartingId("");
    }
  }

  async function endRoom(appointmentId: string) {
    setEndingId(appointmentId);
    setError("");
    try {
      await api.endConsultation(appointmentId);
      setAppointments((items) =>
        items.map((item) =>
          item.id === appointmentId
            ? { ...item, status: "Completed", roomName: undefined, videoStatus: "Completed" }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel encerrar a consulta.");
    } finally {
      setEndingId("");
    }
  }

  async function cancelAppointment(appointmentId: string) {
    if (!window.confirm("Cancelar esta consulta? Esta acao nao pode ser desfeita.")) return;
    setCancelingId(appointmentId);
    setError("");
    try {
      const updated = await api.cancelAppointment(appointmentId);
      setAppointments((items) => items.map((item) => (item.id === appointmentId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cancelar a consulta.");
    } finally {
      setCancelingId("");
    }
  }

  function renderAppointmentAction(appointment: Appointment) {
    const canCancel =
      appointment.status === "Scheduled" &&
      !isAppointmentMissed(appointment) &&
      (isPatient || isDoctor || canOperationalSchedule);

    return (
      <div className={isDoctor ? "grid w-full gap-2 sm:grid-cols-[132px_minmax(144px,1fr)] lg:w-[300px]" : "flex flex-col items-end gap-2"}>
        {isDoctor && (
          <Link
            href={`/prontuario/${appointment.id}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-xs font-bold text-teal-700 hover:bg-teal-100"
          >
            <FileText size={15} /> Prontuario
          </Link>
        )}

        {isDoctor && canStartRoom(appointment) ? (
          <button
            type="button"
            onClick={() => startRoom(appointment.id)}
            disabled={startingId === appointment.id}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Video size={15} /> {startingId === appointment.id ? "Iniciando..." : "Iniciar sala"}
          </button>
        ) : (isAppointmentRoomJoinable(appointment) || canDoctorEnterExistingRoom(appointment)) ? (
          <Link
            href={`/sala/${appointment.id}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-xs font-bold text-white hover:bg-teal-700"
          >
            <Video size={15} /> Entrar na sala
          </Link>
        ) : isDoctor && isAppointmentStaleInProgress(appointment) ? (
          <button
            type="button"
            onClick={() => endRoom(appointment.id)}
            disabled={endingId === appointment.id}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Clock3 size={15} /> {endingId === appointment.id ? "Encerrando..." : "Encerrar"}
          </button>
        ) : isPatient && !appointment.consentAccepted && ["Scheduled", "InProgress"].includes(appointment.status) ? (
          <Link
            href={`/sala/${appointment.id}`}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-xs font-bold text-teal-700 hover:bg-teal-100"
          >
            <FileText size={15} /> Aceitar termo
          </Link>
        ) : isAppointmentMissed(appointment) ? (
          // A coluna Status ja exibe "Nao compareceu"; evita repetir o mesmo rotulo aqui.
          <span className="inline-flex h-10 w-full items-center justify-center px-3 text-xs text-slate-300">
            —
          </span>
        ) : isDoctor ? (
          <DoctorRoomNextStep appointment={appointment} />
        ) : (
          <AppointmentNextStep appointment={appointment} />
        )}

        {canCancel && (
          <button
            type="button"
            onClick={() => cancelAppointment(appointment.id)}
            disabled={cancelingId === appointment.id}
            className="inline-flex h-11 items-center justify-center gap-1.5 px-3 text-xs font-bold text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <XCircle size={14} /> {cancelingId === appointment.id ? "Cancelando..." : "Cancelar consulta"}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Agenda assistencial"
        title={isDoctor ? "Minha agenda medica" : isPatient ? "Minhas consultas" : "Consultas"}
        description={
          isDoctor
            ? "Consultas vinculadas ao seu atendimento. O medico nao cria a propria agenda neste modelo B2B."
            : isPatient
              ? "Acompanhe seus atendimentos autorizados e a entrada na sala."
              : "Acompanhe os proximos horarios e entre nas salas virtuais de atendimento."
        }
        action={canRequestOrSchedule ? (
          <Link
            href="/consultas/nova"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
          >
            <Plus size={17} /> {isPatient ? "Solicitar consulta" : "Agendar consulta"}
          </Link>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}

      {isDoctor && (
        <Card className="mb-7 p-6">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Minha disponibilidade</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Defina os dias e horarios em que voce atende. Pacientes so poderao agendar dentro dessas janelas.
              Enquanto nenhuma janela for cadastrada, sua agenda permanece sem restricao de horario.
            </p>
          </div>
          {slotError && <ErrorBanner message={slotError} />}
          <form onSubmit={submitSlot} className="mb-6 grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Dia da semana</span>
              <select
                className={inputClass}
                value={slotForm.dayOfWeek}
                onChange={(event) => setSlotForm({ ...slotForm, dayOfWeek: event.target.value as WeekDay })}
              >
                {WEEKDAY_ORDER.map((day) => (
                  <option key={day} value={day}>
                    {WEEKDAY_LABELS[day]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Inicio</span>
              <input
                className={inputClass}
                type="time"
                value={slotForm.startTime}
                onChange={(event) => setSlotForm({ ...slotForm, startTime: event.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Fim</span>
              <input
                className={inputClass}
                type="time"
                value={slotForm.endTime}
                onChange={(event) => setSlotForm({ ...slotForm, endTime: event.target.value })}
                required
              />
            </label>
            <button className={buttonClass} disabled={slotSaving}>
              <Plus size={17} /> {slotSaving ? "Salvando..." : "Adicionar"}
            </button>
          </form>
          {slotsLoading ? (
            <LoadingState label="Carregando disponibilidade..." />
          ) : sortedSlots.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma janela cadastrada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {sortedSlots.map((slot) => (
                <li
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2.5 font-semibold text-ink">
                    <Clock size={15} className="text-teal-600" />
                    {WEEKDAY_LABELS[slot.dayOfWeek]} - {slot.startTime.slice(0, 5)} as {slot.endTime.slice(0, 5)}
                  </span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => removeSlot(slot.id)}
                    aria-label="Remover janela de disponibilidade"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {loading ? (
        <LoadingState label="Carregando agenda..." />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title={isDoctor ? "Sem atendimentos vinculados" : isPatient ? "Voce ainda nao tem consultas" : "Agenda vazia"}
          description={
            isDoctor
              ? "Quando uma consulta for vinculada ao seu atendimento, ela aparece aqui."
              : isPatient
                ? "Quando sua elegibilidade gerar um atendimento, ele aparece aqui."
                : "Agende a primeira consulta para preparar uma sala virtual."
          }
          action={canRequestOrSchedule ? (
            <Link href="/consultas/nova" className="text-sm font-bold text-teal-600">
              {isPatient ? "Solicitar atendimento" : "Agendar agora"}
            </Link>
          ) : undefined}
        />
      ) : (
        <>
          <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-bold transition ${
                tab === "active" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-ink"
              }`}
            >
              Ativas
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  tab === "active" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {activeAppointments.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-xs font-bold transition ${
                tab === "history" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-ink"
              }`}
            >
              Historico
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  tab === "history" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {historyAppointments.length}
              </span>
            </button>
          </div>
          {visibleAppointments.length === 0 ? (
            <div className="rounded-lg border border-slate-100 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
              {tab === "active" ? "Nenhuma consulta ativa no momento." : "Nenhuma consulta no historico ainda."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className={`hidden gap-5 border-b border-slate-100 bg-slate-50/60 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 lg:grid ${columnsClass}`}>
                {showPatientColumn && <span>Paciente</span>}
                {showDoctorColumn && <span>Medico</span>}
                <span>Horario</span>
                <span>Status</span>
                <span>Acao</span>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className={`grid gap-5 px-6 py-5 transition hover:bg-slate-50/50 lg:items-center ${columnsClass}`}
                  >
                    {showPatientColumn && (
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                          <UserRound size={17} />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-ink">{appointment.patientName}</p>
                          <p className="mt-1 text-xs text-slate-400">Paciente</p>
                        </div>
                      </div>
                    )}
                    {showDoctorColumn && (
                      <div className="flex items-center gap-3">
                        <Stethoscope size={16} className="shrink-0 text-teal-600" />
                        <div>
                          <p className="text-sm font-semibold text-ink">{appointment.doctorName}</p>
                          <p className="mt-1 text-xs text-slate-400">{appointment.specialty}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">{formatDateTime(appointment.scheduledAt)}</p>
                      <p className="mt-1 text-xs text-slate-400">Horario de Brasilia</p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1.5 text-[11px] font-bold ${appointmentStatusClass(appointment)}`}
                    >
                      {appointmentStatusText(appointment)}
                    </span>
                    {canJoinRole || canOperationalSchedule ? renderAppointmentAction(appointment) : <span />}
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function AppointmentNextStep({ appointment, className = "" }: { appointment: Appointment; className?: string }) {
  const step = getAppointmentNextStep(appointment);

  return (
    <span className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold ${step.className} ${className}`}>
      {step.icon}
      {step.label}
    </span>
  );
}

function DoctorRoomNextStep({ appointment }: { appointment: Appointment }) {
  if (isAppointmentMissed(appointment)) {
    return <AppointmentNextStep appointment={appointment} className="w-full" />;
  }

  if (appointment.status === "Scheduled") {
    return (
      <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 text-xs font-bold text-slate-500">
        <Clock3 size={15} /> Sala abre 15 min antes
      </span>
    );
  }

  return <AppointmentNextStep appointment={appointment} className="w-full" />;
}

function getAppointmentNextStep(appointment: Appointment) {
  if (appointment.paymentRequired && appointment.paymentStatus !== "Paid") {
    return {
      label: "Pagamento pendente",
      icon: <Clock3 size={15} />,
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (isAppointmentMissed(appointment)) {
    return {
      label: "Nao compareceu",
      icon: <CalendarDays size={15} />,
      className: "bg-slate-100 text-slate-500",
    };
  }

  if (appointment.status === "Scheduled") {
    return {
      label: "Aguardando horario",
      icon: <Clock3 size={15} />,
      className: "bg-slate-50 text-slate-500",
    };
  }

  if (appointment.status === "InProgress") {
    if (isAppointmentStaleInProgress(appointment)) {
      return {
        label: "Horario encerrado",
        icon: <Clock3 size={15} />,
        className: "bg-slate-50 text-slate-500",
      };
    }

    return {
      label: "Aguardando medico",
      icon: <Video size={15} />,
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (appointment.status === "Completed") {
    return {
      label: "Atendimento concluido",
      icon: <CalendarDays size={15} />,
      className: "bg-teal-50 text-teal-700",
    };
  }

  return {
    label: statusLabel[appointment.status],
    icon: <CalendarDays size={15} />,
    className: "bg-slate-50 text-slate-500",
  };
}

function appointmentStatusText(appointment: Appointment) {
  if (isAppointmentMissed(appointment)) return "Nao compareceu";
  if (isAppointmentStaleInProgress(appointment)) return "Horario encerrado";
  return statusLabel[appointment.status];
}

function appointmentStatusClass(appointment: Appointment) {
  if (isAppointmentMissed(appointment)) return "bg-slate-100 text-slate-500";
  if (isAppointmentStaleInProgress(appointment)) return "bg-slate-50 text-slate-500";
  return statusClass[appointment.status];
}

function canStartRoom(appointment: Appointment) {
  if (appointment.roomName || !["Scheduled", "InProgress"].includes(appointment.status)) {
    return false;
  }

  return isAppointmentJoinWindowOpen(appointment);
}

function canDoctorEnterExistingRoom(appointment: Appointment) {
  return Boolean(appointment.roomName) &&
    ["Scheduled", "InProgress"].includes(appointment.status) &&
    appointment.videoStatus !== "Completed" &&
    appointment.videoStatus !== "Cancelled" &&
    appointment.videoStatus !== "Expired" &&
    isAppointmentJoinWindowOpen(appointment);
}
