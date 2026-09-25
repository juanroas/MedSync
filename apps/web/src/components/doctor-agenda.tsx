"use client";

import { useRealtimeRefresh } from "@/lib/realtime";

import { Badge, Button, Card, ErrorBanner, LoadingState, PageHeader, buttonClass, cn, inputClass } from "@/components/ui";
import { useConfirm } from "@/components/dialog";
import { EndConsultationDialog } from "@/components/end-consultation-dialog";
import {
  appointmentStatusLabel,
  appointmentStatusTone,
  canConcludeConsultation,
  canDoctorEnterExistingRoom,
  canStartRoom,
  isAppointmentMissed,
} from "@/lib/appointments";
import { formatBrazilDateInput, formatTime } from "@/lib/format";
import type { Appointment, DoctorAvailabilitySlot, WeekDay } from "@/lib/types";
import { api } from "@/services/api";
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Plus, Trash2, Video, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

// Agenda do médico (Fase 2): semana e dia, com os horários de atendimento desenhados na grade.
// Mostra só as consultas em que ele é o médico designado (a API já filtra; regra C1).

type View = "week" | "day";

const WEEK: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES: Record<WeekDay, string> = {
  Monday: "Segunda",
  Tuesday: "Terça",
  Wednesday: "Quarta",
  Thursday: "Quinta",
  Friday: "Sexta",
  Saturday: "Sábado",
  Sunday: "Domingo",
};
const JS_DAY: WeekDay[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Days are handled as "yyyy-mm-dd" keys in Brasília time; a key becomes a Date at noon UTC for arithmetic.
function keyToDate(key: string) {
  return new Date(`${key}T12:00:00Z`);
}
function addDays(key: string, days: number) {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function weekDayOf(key: string): WeekDay {
  return JS_DAY[keyToDate(key).getUTCDay()];
}
function mondayOf(key: string) {
  return addDays(key, -WEEK.indexOf(weekDayOf(key)));
}
function dayKeyOf(iso: string) {
  return formatBrazilDateInput(new Date(iso));
}
function dayNumber(key: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(keyToDate(key));
}

export function DoctorAgenda() {
  const router = useRouter();
  const today = formatBrazilDateInput();
  const [view, setView] = useState<View>("day");
  const [selectedDay, setSelectedDay] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [concludingId, setConcludingId] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const [items, windows] = await Promise.all([api.getAppointments(), api.getMyAvailability()]);
    setAppointments(items);
    setSlots(windows);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar a agenda."))
      .finally(() => setLoading(false));
    // Room buttons depend on the clock: re-render every minute.
    const tick = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(tick);
  }, [load]);
  useRealtimeRefresh(["appointmentChanged"], () => load().catch(() => undefined));

  const weekStart = mondayOf(selectedDay);
  const days = view === "week" ? WEEK.map((_, index) => addDays(weekStart, index)) : [selectedDay];
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of [...appointments]
      .filter((item) => item.status !== "Cancelled")
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))) {
      const key = dayKeyOf(appointment.scheduledAt);
      map.set(key, [...(map.get(key) ?? []), appointment]);
    }
    return map;
  }, [appointments]);
  const slotsByDay = useMemo(() => {
    const map = new Map<WeekDay, DoctorAvailabilitySlot[]>();
    for (const slot of [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime)))
      map.set(slot.dayOfWeek, [...(map.get(slot.dayOfWeek) ?? []), slot]);
    return map;
  }, [slots]);

  const cancelledOfDay = appointments.filter(
    (item) => item.status === "Cancelled" && dayKeyOf(item.scheduledAt) === selectedDay,
  );

  const rangeLabel =
    view === "week"
      ? `${dayNumber(weekStart)} – ${dayNumber(addDays(weekStart, 6))}`
      : `${DAY_NAMES[weekDayOf(selectedDay)]}, ${dayNumber(selectedDay)}`;

  async function run(id: string, action: () => Promise<unknown>, failure: string) {
    setBusyId(id);
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Portal médico"
        title="Agenda"
        description="Suas consultas por semana ou por dia, com os horários em que você atende. Os agendamentos vêm da clínica ou do paciente."
        action={
          <button type="button" className={buttonClass} onClick={() => setShowSlotForm((value) => !value)}>
            {showSlotForm ? <X size={17} /> : <Plus size={17} />} {showSlotForm ? "Fechar" : "Adicionar horário"}
          </button>
        }
      />
      {error && <ErrorBanner message={error} />}
      {showSlotForm && (
        <AvailabilityForm
          onCreated={(slot) => {
            setSlots((items) => [...items, slot]);
            setShowSlotForm(false);
          }}
        />
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={view === "week" ? "Semana anterior" : "Dia anterior"}
            onClick={() => setSelectedDay(addDays(selectedDay, view === "week" ? -7 : -1))}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDay(today)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            type="button"
            aria-label={view === "week" ? "Próxima semana" : "Próximo dia"}
            onClick={() => setSelectedDay(addDays(selectedDay, view === "week" ? 7 : 1))}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
          <p className="ml-2 text-sm font-bold text-ink">{rangeLabel}</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Visão da agenda">
          {(["week", "day"] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => setView(option)}
              className={cn(
                "h-8 rounded-md px-4 text-xs font-bold transition",
                view === option ? "bg-teal-50 text-teal-800 ring-1 ring-teal-100" : "text-slate-500 hover:text-ink",
              )}
            >
              {option === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Carregando agenda..." />
      ) : view === "week" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((key) => (
            <DayColumn
              key={key}
              dayKey={key}
              isToday={key === today}
              windows={slotsByDay.get(weekDayOf(key)) ?? []}
              appointments={byDay.get(key) ?? []}
              onOpenDay={() => {
                setSelectedDay(key);
                setView("day");
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Horários de atendimento</p>
            <p className="mt-1 text-sm text-slate-600">
              {(slotsByDay.get(weekDayOf(selectedDay)) ?? []).map((slot) => `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`).join(" · ") ||
                "Nenhum horário cadastrado para este dia da semana."}
            </p>
          </div>
          {(byDay.get(selectedDay) ?? []).length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma consulta neste dia.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(byDay.get(selectedDay) ?? []).map((appointment) => (
                <DayRow
                  key={appointment.id}
                  appointment={appointment}
                  busy={busyId === appointment.id}
                  onStart={() =>
                    run(appointment.id, async () => {
                      await api.startConsultation(appointment.id);
                      router.push(`/sala/${appointment.id}`);
                    }, "Não foi possível iniciar a sala.")
                  }
                  onConclude={() => setConcludingId(appointment.id)}
                  onCancel={async () => {
                    const ok = await confirm({
                      title: "Cancelar esta consulta?",
                      description: `${appointment.patientName}, ${formatTime(appointment.scheduledAt)}. O paciente vê o cancelamento na lista dele.`,
                      confirmLabel: "Cancelar consulta",
                      danger: true,
                    });
                    if (ok) void run(appointment.id, () => api.cancelAppointment(appointment.id), "Não foi possível cancelar.");
                  }}
                />
              ))}
            </ul>
          )}
          {cancelledOfDay.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-3">
              <button type="button" onClick={() => setShowCancelled((value) => !value)} className="text-xs font-bold text-slate-500 hover:text-ink">
                {showCancelled ? "Ocultar canceladas" : `Mostrar canceladas (${cancelledOfDay.length})`}
              </button>
              {showCancelled && (
                <ul className="mt-2 space-y-1 text-sm text-slate-400">
                  {cancelledOfDay.map((item) => (
                    <li key={item.id}>
                      {formatTime(item.scheduledAt)} · {item.patientName} · cancelada
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {concludingId && (
        <EndConsultationDialog
          appointmentId={concludingId}
          open
          onClose={() => setConcludingId("")}
          onEnded={() => {
            setConcludingId("");
            void load();
          }}
        />
      )}
      {confirmDialog}

      {!loading && (
        <AvailabilityList
          slots={slots}
          onRemoved={(id) => setSlots((items) => items.filter((slot) => slot.id !== id))}
          onError={setError}
          confirm={confirm}
        />
      )}
    </>
  );
}

function DayColumn({
  dayKey,
  isToday,
  windows,
  appointments,
  onOpenDay,
}: {
  dayKey: string;
  isToday: boolean;
  windows: DoctorAvailabilitySlot[];
  appointments: Appointment[];
  onOpenDay: () => void;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-lg border bg-white p-3 xl:min-h-40",
        isToday ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200",
      )}
      aria-label={`${DAY_NAMES[weekDayOf(dayKey)]} ${dayNumber(dayKey)}`}
    >
      <button type="button" onClick={onOpenDay} className="mb-2 text-left">
        <p className={cn("text-xs font-bold uppercase", isToday ? "text-teal-700" : "text-slate-500")}>
          {DAY_NAMES[weekDayOf(dayKey)]}
        </p>
        <p className="text-sm font-bold text-ink">{dayNumber(dayKey)}</p>
      </button>
      {windows.map((slot) => (
        <p key={slot.id} className="mb-1 rounded bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-800">
          {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)} atende
        </p>
      ))}
      <div className="mt-1 space-y-1.5">
        {appointments.map((appointment) => (
          <button
            key={appointment.id}
            type="button"
            onClick={onOpenDay}
            className="block w-full rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-left hover:border-teal-200 hover:bg-teal-50"
          >
            <span className="block text-xs font-bold text-ink">{formatTime(appointment.scheduledAt)}</span>
            <span className="block truncate text-xs text-slate-600">{appointment.patientName}</span>
            <span className={cn("mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold", rowStatusClass(appointment))}>
              {rowStatusText(appointment)}
            </span>
          </button>
        ))}
      </div>
      {windows.length === 0 && appointments.length === 0 && <p className="text-xs text-slate-300">Livre</p>}
    </section>
  );
}

function DayRow({
  appointment,
  busy,
  onStart,
  onConclude,
  onCancel,
}: {
  appointment: Appointment;
  busy: boolean;
  onStart: () => void;
  onConclude: () => void;
  onCancel: () => void;
}) {
  const canCancel = appointment.status === "Scheduled" && !isAppointmentMissed(appointment);
  return (
    <li className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
      <span className="w-16 shrink-0 text-base font-bold text-ink">{formatTime(appointment.scheduledAt)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{appointment.patientName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {appointment.specialty} · {appointment.durationMinutes} min ·{" "}
          {appointment.consentAccepted ? "termo aceito" : "termo de telemedicina pendente"}
        </p>
      </div>
      <Badge className={rowStatusClass(appointment)}>{rowStatusText(appointment)}</Badge>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/prontuario/${appointment.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 hover:bg-teal-100"
        >
          <FileText size={15} /> Prontuário
        </Link>
        {canStartRoom(appointment) ? (
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-3 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Video size={15} /> {busy ? "Iniciando..." : "Iniciar sala"}
          </button>
        ) : canDoctorEnterExistingRoom(appointment) ? (
          <Link
            href={`/sala/${appointment.id}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-3 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Video size={15} /> Entrar na sala
          </Link>
        ) : null}
        {canConcludeConsultation(appointment) && (
          <button
            type="button"
            onClick={onConclude}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-200 hover:bg-teal-50"
          >
            <CheckCircle2 size={15} /> Concluir
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 px-2 text-xs font-bold text-slate-400 hover:text-red-600"
          >
            <XCircle size={14} /> Cancelar
          </button>
        )}
      </div>
    </li>
  );
}

function AvailabilityForm({ onCreated }: { onCreated: (slot: DoctorAvailabilitySlot) => void }) {
  const [form, setForm] = useState<{ dayOfWeek: WeekDay; startTime: string; endTime: string }>({
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "12:00",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.startTime >= form.endTime) {
      setError("O horário inicial precisa ser antes do final.");
      return;
    }
    setSaving(true);
    try {
      onCreated(
        await api.createMyAvailabilitySlot({
          dayOfWeek: form.dayOfWeek,
          startTime: `${form.startTime}:00`,
          endTime: `${form.endTime}:00`,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o horário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 p-6">
      <h2 className="font-bold text-ink">Novo horário de atendimento</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Pacientes só conseguem marcar dentro destes horários. Sem nenhum horário cadastrado, sua agenda fica sem restrição.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Dia da semana</span>
          <select
            className={inputClass}
            value={form.dayOfWeek}
            onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value as WeekDay })}
          >
            {WEEK.map((day) => (
              <option key={day} value={day}>
                {DAY_NAMES[day]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Início</span>
          <input className={inputClass} type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Fim</span>
          <input className={inputClass} type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
        </label>
        <Button type="submit" isLoading={saving}>
          Salvar horário
        </Button>
      </form>
    </Card>
  );
}

function AvailabilityList({
  slots,
  onRemoved,
  onError,
  confirm,
}: {
  slots: DoctorAvailabilitySlot[];
  onRemoved: (id: string) => void;
  onError: (message: string) => void;
  confirm: ReturnType<typeof useConfirm>[0];
}) {
  const sorted = [...slots].sort((a, b) => {
    const day = WEEK.indexOf(a.dayOfWeek) - WEEK.indexOf(b.dayOfWeek);
    return day !== 0 ? day : a.startTime.localeCompare(b.startTime);
  });

  async function remove(slot: DoctorAvailabilitySlot) {
    const label = `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`;
    const ok = await confirm({
      title: "Remover horário de atendimento?",
      description: `${label}. Consultas já marcadas nesse horário continuam valendo.`,
      confirmLabel: "Remover horário",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteMyAvailabilitySlot(slot.id);
      onRemoved(slot.id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Não foi possível remover o horário.");
    }
  }

  return (
    <Card className="mt-7 p-6">
      <h2 className="font-bold text-ink">Meus horários de atendimento</h2>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Nenhum horário cadastrado: pacientes podem pedir qualquer horário.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {sorted.map((slot) => (
            <li key={slot.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 py-1.5 pl-3 pr-1.5 text-sm">
              <span className="font-semibold text-ink">
                {DAY_NAMES[slot.dayOfWeek]} {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
              </span>
              <button
                type="button"
                onClick={() => remove(slot)}
                aria-label={`Remover ${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime.slice(0, 5)}`}
                className="grid size-7 place-items-center rounded text-slate-400 hover:bg-white hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const rowStatusText = appointmentStatusLabel;
const rowStatusClass = appointmentStatusTone;
