"use client";

import { useRealtimeRefresh } from "@/lib/realtime";

import { modalityChipClass } from "@/components/doctor-schedule";
import { Badge, Card, ErrorBanner, LoadingState, PageHeader, buttonClass, cn } from "@/components/ui";
import { useConfirm } from "@/components/dialog";
import { EndConsultationDialog } from "@/components/end-consultation-dialog";
import {
  appointmentStatusLabel,
  appointmentStatusTone,
  canConcludeConsultation,
  canDoctorEnterExistingRoom,
  canStartRoom,
  isAppointmentMissed,
  isInPerson,
} from "@/lib/appointments";
import { formatBrazilDateInput, formatTime } from "@/lib/format";
import { MODALITY_LABELS } from "@/lib/types";
import type { Appointment, DoctorAvailabilitySlot, DoctorTimeOff, WeekDay } from "@/lib/types";
import { api } from "@/services/api";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, FileText, Video, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// Agenda do médico (Fase 2): mês, semana e dia, com os horários de atendimento e as folgas desenhados na grade.
// Mostra só as consultas em que ele é o médico designado (a API já filtra; regra C1).

type View = "month" | "week" | "day";
const VIEW_LABELS: Record<View, string> = { month: "Mês", week: "Semana", day: "Dia" };

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
function addMonths(key: string, months: number) {
  const date = keyToDate(`${key.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
function monthLabel(key: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(keyToDate(key));
}
// Monday-first grid covering the whole month of `key` (5 or 6 weeks).
function monthGrid(key: string) {
  const first = `${key.slice(0, 7)}-01`;
  const nextMonth = addMonths(first, 1);
  const cells: string[] = [];
  for (let day = mondayOf(first); day < nextMonth || cells.length % 7 !== 0; day = addDays(day, 1)) cells.push(day);
  return cells;
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
  const [timeOff, setTimeOff] = useState<DoctorTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [concludingId, setConcludingId] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const [items, schedule] = await Promise.all([api.getAppointments(), api.getMySchedule()]);
    setAppointments(items);
    setSlots(schedule.windows);
    setTimeOff(schedule.timeOff);
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
  const offReason = (key: string) => {
    const item = timeOff.find((entry) => entry.startDate <= key && entry.endDate >= key);
    return item ? item.reason || "Folga" : null;
  };

  const cancelledOfDay = appointments.filter(
    (item) => item.status === "Cancelled" && dayKeyOf(item.scheduledAt) === selectedDay,
  );

  const rangeLabel =
    view === "month"
      ? monthLabel(selectedDay)
      : view === "week"
        ? `${dayNumber(weekStart)} – ${dayNumber(addDays(weekStart, 6))}`
        : `${DAY_NAMES[weekDayOf(selectedDay)]}, ${dayNumber(selectedDay)}`;
  const step = (direction: 1 | -1) =>
    setSelectedDay(
      view === "month" ? addMonths(selectedDay, direction) : addDays(selectedDay, (view === "week" ? 7 : 1) * direction),
    );
  const openDay = (key: string) => {
    setSelectedDay(key);
    setView("day");
  };
  const previousLabel = { month: "Mês anterior", week: "Semana anterior", day: "Dia anterior" }[view];
  const nextLabel = { month: "Próximo mês", week: "Próxima semana", day: "Próximo dia" }[view];

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
        description="Suas consultas por mês, semana ou dia, com os horários em que você atende. Os agendamentos vêm da clínica ou do paciente."
        action={
          <Link href="/consultas/horarios" className={buttonClass}>
            <CalendarClock size={17} /> Horários de atendimento
          </Link>
        }
      />
      {error && <ErrorBanner message={error} />}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={previousLabel}
            onClick={() => step(-1)}
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
            aria-label={nextLabel}
            onClick={() => step(1)}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
          <p className="ml-2 text-sm font-bold text-ink first-letter:uppercase">{rangeLabel}</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Visão da agenda">
          {(["month", "week", "day"] as View[]).map((option) => (
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
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Carregando agenda..." />
      ) : view === "month" ? (
        <MonthGrid
          monthKey={selectedDay}
          today={today}
          byDay={byDay}
          slotsByDay={slotsByDay}
          offReason={offReason}
          onOpenDay={openDay}
        />
      ) : view === "week" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {days.map((key) => (
            <DayColumn
              key={key}
              dayKey={key}
              isToday={key === today}
              windows={offReason(key) ? [] : (slotsByDay.get(weekDayOf(key)) ?? [])}
              off={offReason(key)}
              appointments={byDay.get(key) ?? []}
              onOpenDay={() => openDay(key)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Horários de atendimento</p>
            {offReason(selectedDay) ? (
              <p className="mt-1 text-sm font-semibold text-amber-700">Folga: {offReason(selectedDay)}. Pacientes não marcam neste dia.</p>
            ) : (slotsByDay.get(weekDayOf(selectedDay)) ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-slate-600">Nenhum horário cadastrado para este dia da semana.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {(slotsByDay.get(weekDayOf(selectedDay)) ?? []).map((slot) => (
                  <span key={slot.id} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", modalityChipClass[slot.modality])}>
                    {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)} · {MODALITY_LABELS[slot.modality]}
                  </span>
                ))}
              </div>
            )}
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
                  onDeclaration={() =>
                    run(appointment.id, () => api.downloadAttendanceDeclaration(appointment.id), "Não foi possível gerar a declaração.")
                  }
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
    </>
  );
}

function MonthGrid({
  monthKey,
  today,
  byDay,
  slotsByDay,
  offReason,
  onOpenDay,
}: {
  monthKey: string;
  today: string;
  byDay: Map<string, Appointment[]>;
  slotsByDay: Map<WeekDay, DoctorAvailabilitySlot[]>;
  offReason: (key: string) => string | null;
  onOpenDay: (key: string) => void;
}) {
  const month = monthKey.slice(0, 7);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-[11px] font-bold uppercase text-slate-400">
        {WEEK.map((day) => (
          <span key={day} className="py-2">
            {DAY_NAMES[day].slice(0, 3)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(monthKey).map((key) => {
          const inMonth = key.startsWith(month);
          const items = byDay.get(key) ?? [];
          const off = offReason(key);
          const windows = off ? [] : (slotsByDay.get(weekDayOf(key)) ?? []);
          const modalities = Array.from(new Set(windows.map((window) => window.modality)));
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(key)}
              aria-label={`${DAY_NAMES[weekDayOf(key)]} ${dayNumber(key)}: ${items.length} consulta(s)${off ? `, ${off}` : ""}`}
              className={cn(
                "flex min-h-24 flex-col items-start gap-1 border-b border-r border-slate-100 p-2 text-left transition hover:bg-teal-50/50 sm:min-h-28",
                !inMonth && "bg-slate-50/60",
                key === today && "ring-2 ring-inset ring-teal-300",
              )}
            >
              <span className={cn("text-sm font-bold", inMonth ? "text-ink" : "text-slate-300", key === today && "text-teal-700")}>
                {Number(key.slice(8))}
              </span>
              {inMonth && items.length > 0 && (
                <span className="rounded bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {items.length} {items.length === 1 ? "consulta" : "consultas"}
                </span>
              )}
              {inMonth && off && (
                <span className="max-w-full truncate rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">{off}</span>
              )}
              {inMonth &&
                modalities.map((modality) => (
                  <span key={modality} className={cn("hidden rounded border px-1.5 py-0.5 text-[10px] font-semibold sm:inline", modalityChipClass[modality])}>
                    {MODALITY_LABELS[modality]}
                  </span>
                ))}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function DayColumn({
  dayKey,
  isToday,
  windows,
  off,
  appointments,
  onOpenDay,
}: {
  dayKey: string;
  isToday: boolean;
  windows: DoctorAvailabilitySlot[];
  off: string | null;
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
      {off && <p className="mb-1 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">{off}</p>}
      {windows.map((slot) => (
        <p key={slot.id} className={cn("mb-1 rounded border px-2 py-1 text-[11px] font-semibold", modalityChipClass[slot.modality])}>
          {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)} · {MODALITY_LABELS[slot.modality]}
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
            {isInPerson(appointment) && <span className="block text-[10px] font-semibold text-sky-700">Presencial</span>}
            <span className={cn("mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold", rowStatusClass(appointment))}>
              {rowStatusText(appointment)}
            </span>
          </button>
        ))}
      </div>
      {!off && windows.length === 0 && appointments.length === 0 && <p className="text-xs text-slate-300">Livre</p>}
    </section>
  );
}

function DayRow({
  appointment,
  busy,
  onStart,
  onConclude,
  onDeclaration,
  onCancel,
}: {
  appointment: Appointment;
  busy: boolean;
  onStart: () => void;
  onConclude: () => void;
  onDeclaration: () => void;
  onCancel: () => void;
}) {
  const canCancel = appointment.status === "Scheduled" && !isAppointmentMissed(appointment);
  return (
    <li className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
      <span className="w-16 shrink-0 text-base font-bold text-ink">{formatTime(appointment.scheduledAt)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{appointment.patientName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isInPerson(appointment)
            ? `Presencial · ${appointment.durationMinutes} min · ${appointment.location ?? "na clínica"}`
            : `Online · ${appointment.durationMinutes} min · ${appointment.consentAccepted ? "termo aceito" : "termo de telemedicina pendente"}`}
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
        {appointment.status === "Completed" && (
          <button
            type="button"
            onClick={onDeclaration}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 px-2 text-xs font-bold text-teal-700 hover:text-teal-900 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <FileText size={14} /> Declaração de comparecimento
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

const rowStatusText = appointmentStatusLabel;
const rowStatusClass = appointmentStatusTone;
