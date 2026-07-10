"use client";

import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import { formatDateTime, statusClass, statusLabel } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { CalendarDays, Plus, Stethoscope, UserRound, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppointmentsPage() {
  const router = useRouter();
  const roles = getSession()?.user.roles ?? [];
  const isDoctor = roles.includes("Doctor");
  const isPatient = roles.includes("Patient");
  const canSchedule = roles.some((role) =>
    ["Receptionist", "ClinicAdmin", "MedicalDirector", "Support", "OccupationalHealthAdmin"].includes(role),
  );
  const canJoinRole = roles.some((role) =>
    ["Doctor", "Patient", "MedicalDirector", "OccupationalHealthAdmin"].includes(role),
  );
  const canJoinAppointment = (appointment: Appointment) =>
    canJoinRole &&
    appointment.status === "InProgress" &&
    appointment.consentAccepted &&
    Boolean(appointment.roomName);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");

  useEffect(() => {
    api
      .getAppointments()
      .then(setAppointments)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar consultas."))
      .finally(() => setLoading(false));
  }, []);

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
        action={canSchedule ? (
          <Link
            href="/consultas/nova"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
          >
            <Plus size={17} /> Agendar consulta
          </Link>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
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
          action={canSchedule ? (
            <Link href="/consultas/nova" className="text-sm font-bold text-teal-600">
              Agendar agora
            </Link>
          ) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.15fr_1fr_1fr_.55fr_auto] gap-5 border-b border-slate-100 bg-slate-50/60 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400 lg:grid">
            <span>Paciente</span>
            <span>Medico</span>
            <span>Horario</span>
            <span>Status</span>
            <span>Acao</span>
          </div>
          <div className="divide-y divide-slate-100">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="grid gap-5 px-6 py-5 transition hover:bg-slate-50/50 lg:grid-cols-[1.15fr_1fr_1fr_.55fr_auto] lg:items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <UserRound size={17} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{appointment.patientName}</p>
                    <p className="mt-1 text-xs text-slate-400">Paciente</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Stethoscope size={16} className="shrink-0 text-teal-600" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{appointment.doctorName}</p>
                    <p className="mt-1 text-xs text-slate-400">{appointment.specialty}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{formatDateTime(appointment.scheduledAt)}</p>
                  <p className="mt-1 text-xs text-slate-400">Horario de Brasilia</p>
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-1.5 text-[11px] font-bold ${statusClass[appointment.status]}`}
                >
                  {statusLabel[appointment.status]}
                </span>
                {canJoinRole ? (
                  isDoctor && appointment.status === "Scheduled" ? (
                    <button
                      type="button"
                      onClick={() => startRoom(appointment.id)}
                      disabled={startingId === appointment.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-xs font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Video size={15} /> {startingId === appointment.id ? "Iniciando..." : "Iniciar sala"}
                    </button>
                  ) : canJoinAppointment(appointment) ? (
                    <Link
                      href={`/sala/${appointment.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-xs font-bold text-white hover:bg-teal-700"
                    >
                      <Video size={15} /> Entrar
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Aguardando sala</span>
                  )
                ) : <span />}
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
