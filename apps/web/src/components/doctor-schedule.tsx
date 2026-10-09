"use client";

import { useConfirm } from "@/components/dialog";
import { Button, Card, ErrorBanner, LoadingState, PageHeader, cn, inputClass, secondaryButtonClass } from "@/components/ui";
import { formatBrazilDateInput } from "@/lib/format";
import { MODALITY_LABELS } from "@/lib/types";
import type { ConsultationModality, DoctorAvailabilitySlot, DoctorSchedule, DoctorTimeOff, WeekDay } from "@/lib/types";
import { api } from "@/services/api";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

// Horários de atendimento do médico: semana-padrão que se repete, duração da consulta, até quando o
// paciente pode marcar e folgas. Cada faixa é online, presencial (no endereço da clínica) ou as duas.

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
const SLOT_OPTIONS = [15, 20, 30, 45, 60];
const WINDOW_OPTIONS = [
  { days: 30, label: "30 dias à frente (1 mês)" },
  { days: 60, label: "60 dias à frente (2 meses)" },
  { days: 90, label: "90 dias à frente (3 meses)" },
  { days: 120, label: "120 dias à frente (4 meses)" },
  { days: 180, label: "180 dias à frente (6 meses)" },
];
const MODALITIES: ConsultationModality[] = ["Online", "InPerson", "Both"];

export const modalityChipClass: Record<ConsultationModality, string> = {
  Online: "border-teal-100 bg-teal-50 text-teal-800",
  InPerson: "border-sky-100 bg-sky-50 text-sky-800",
  Both: "border-violet-100 bg-violet-50 text-violet-800",
};

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotsIn(window: DoctorAvailabilitySlot, slotMinutes: number) {
  return Math.floor((minutesOf(window.endTime) - minutesOf(window.startTime)) / slotMinutes);
}

function formatDay(key: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(
    new Date(`${key}T12:00:00Z`),
  );
}

export function DoctorScheduleEditor() {
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [error, setError] = useState("");
  const [addingDay, setAddingDay] = useState<WeekDay | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(async () => setSchedule(await api.getMySchedule()), []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar seus horários."));
  }, [load]);

  async function removeWindow(window: DoctorAvailabilitySlot) {
    const ok = await confirm({
      title: "Remover esta faixa?",
      description: `${DAY_NAMES[window.dayOfWeek]} ${window.startTime.slice(0, 5)}–${window.endTime.slice(0, 5)}. Consultas já marcadas nesse horário continuam valendo.`,
      confirmLabel: "Remover faixa",
      danger: true,
    });
    if (!ok) return;
    setError("");
    try {
      await api.deleteMyAvailabilitySlot(window.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a faixa.");
    }
  }

  async function removeTimeOff(timeOff: DoctorTimeOff) {
    const ok = await confirm({
      title: "Liberar estes dias?",
      description: `${formatDay(timeOff.startDate)} a ${formatDay(timeOff.endDate)} voltam a aceitar marcações.`,
      confirmLabel: "Liberar dias",
    });
    if (!ok) return;
    setError("");
    try {
      await api.deleteMyTimeOff(timeOff.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível liberar os dias.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Portal médico"
        title="Horários de atendimento"
        description="Defina uma vez a sua semana-padrão: ela se repete toda semana. Pacientes só marcam dentro destes horários."
        action={
          <Link href="/consultas" className={secondaryButtonClass}>
            <ArrowLeft size={16} /> Voltar para a agenda
          </Link>
        }
      />
      {error && <ErrorBanner message={error} />}
      {!schedule ? (
        <LoadingState label="Carregando horários..." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-bold text-ink">Semana-padrão</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {schedule.windows.length === 0
                  ? "Nenhuma faixa cadastrada: hoje os pacientes podem pedir qualquer horário."
                  : `${schedule.windows.reduce((total, window) => total + slotsIn(window, schedule.slotMinutes), 0)} horários de ${schedule.slotMinutes} min por semana.`}
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {WEEK.map((day) => {
                const windows = schedule.windows
                  .filter((window) => window.dayOfWeek === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <li key={day} className="px-6 py-4" aria-label={DAY_NAMES[day]}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-24 shrink-0 text-sm font-bold text-ink">{DAY_NAMES[day]}</span>
                      <div className="flex flex-1 flex-wrap gap-2">
                        {windows.length === 0 && <span className="text-sm text-slate-400">Não atendo</span>}
                        {windows.map((window) => (
                          <span
                            key={window.id}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border py-1 pl-3 pr-1 text-sm font-semibold",
                              modalityChipClass[window.modality],
                            )}
                          >
                            {window.startTime.slice(0, 5)}–{window.endTime.slice(0, 5)} · {MODALITY_LABELS[window.modality]}
                            <button
                              type="button"
                              onClick={() => removeWindow(window)}
                              aria-label={`Remover ${DAY_NAMES[day]} ${window.startTime.slice(0, 5)}`}
                              className="grid size-7 place-items-center rounded text-current opacity-60 hover:bg-white hover:text-red-600 hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                      {addingDay !== day && (
                        <button
                          type="button"
                          onClick={() => setAddingDay(day)}
                          className="inline-flex h-9 items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
                        >
                          <Plus size={14} /> Adicionar faixa
                        </button>
                      )}
                    </div>
                    {addingDay === day && (
                      <WindowForm
                        day={day}
                        onCancel={() => setAddingDay(null)}
                        onSaved={async () => {
                          setAddingDay(null);
                          await load();
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-6">
            <SettingsCard schedule={schedule} onSaved={setSchedule} />
            <TimeOffCard timeOff={schedule.timeOff} onAdded={load} onRemove={removeTimeOff} />
          </div>
        </div>
      )}
      {confirmDialog}
    </>
  );
}

function WindowForm({ day, onCancel, onSaved }: { day: WeekDay; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<{ startTime: string; endTime: string; modality: ConsultationModality }>({
    startTime: "09:00",
    endTime: "12:00",
    modality: "Online",
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
      await api.createMyAvailabilitySlot({
        dayOfWeek: day,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        modality: form.modality,
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a faixa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.6fr] sm:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Início</span>
          <input className={inputClass} type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Fim</span>
          <input className={inputClass} type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
        </label>
        <fieldset>
          <legend className="mb-2 block text-xs font-bold text-slate-600">Modalidade</legend>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {MODALITIES.map((modality) => (
              <button
                key={modality}
                type="button"
                aria-pressed={form.modality === modality}
                onClick={() => setForm({ ...form, modality })}
                className={cn(
                  "h-9 rounded-md px-3 text-xs font-bold transition",
                  form.modality === modality ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:text-ink",
                )}
              >
                {modality === "Both" ? "Os dois" : MODALITY_LABELS[modality]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {form.modality !== "Online" && (
        <p className="mt-2 text-xs text-slate-500">O atendimento presencial acontece no endereço da clínica.</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button type="submit" isLoading={saving}>
          Salvar faixa
        </Button>
        <button type="button" onClick={onCancel} className="h-10 px-3 text-sm font-bold text-slate-500 hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SettingsCard({ schedule, onSaved }: { schedule: DoctorSchedule; onSaved: (schedule: DoctorSchedule) => void }) {
  const [slotMinutes, setSlotMinutes] = useState(schedule.slotMinutes);
  const [bookingWindowDays, setBookingWindowDays] = useState(schedule.bookingWindowDays);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const changed = slotMinutes !== schedule.slotMinutes || bookingWindowDays !== schedule.bookingWindowDays;
  const windowOptions = WINDOW_OPTIONS.some((option) => option.days === schedule.bookingWindowDays)
    ? WINDOW_OPTIONS
    : [...WINDOW_OPTIONS, { days: schedule.bookingWindowDays, label: `${schedule.bookingWindowDays} dias à frente` }];

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      onSaved(await api.updateMyScheduleSettings({ slotMinutes, bookingWindowDays }));
      setMessage("Regras salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as regras.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="font-bold text-ink">Regras da agenda</h2>
      <fieldset className="mt-4">
        <legend className="mb-2 block text-xs font-bold text-slate-600">Duração de cada consulta</legend>
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1">
          {SLOT_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              aria-pressed={slotMinutes === minutes}
              onClick={() => setSlotMinutes(minutes)}
              className={cn(
                "h-9 rounded-md px-3 text-xs font-bold transition",
                slotMinutes === minutes ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:text-ink",
              )}
            >
              {minutes} min
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-bold text-slate-600">Pacientes podem marcar até</span>
        <select className={inputClass} value={bookingWindowDays} onChange={(event) => setBookingWindowDays(Number(event.target.value))}>
          {windowOptions.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-xs leading-5 text-slate-500">Consultas já marcadas não mudam quando você altera estas regras.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && !changed && <p className="mt-3 text-sm text-teal-700">{message}</p>}
      <Button type="button" className="mt-4 w-full" onClick={save} isLoading={saving} disabled={!changed}>
        Salvar regras
      </Button>
    </Card>
  );
}

function TimeOffCard({
  timeOff,
  onAdded,
  onRemove,
}: {
  timeOff: DoctorTimeOff[];
  onAdded: () => Promise<void>;
  onRemove: (timeOff: DoctorTimeOff) => void;
}) {
  const today = formatBrazilDateInput();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ startDate: today, endDate: today, reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.endDate < form.startDate) {
      setError("O último dia precisa ser igual ou depois do primeiro.");
      return;
    }
    setSaving(true);
    try {
      await api.createMyTimeOff({ startDate: form.startDate, endDate: form.endDate, reason: form.reason || undefined });
      setOpen(false);
      setForm({ startDate: today, endDate: today, reason: "" });
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível bloquear as datas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-ink">Folgas e bloqueios</h2>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">
            <Plus size={14} /> Bloquear datas
          </button>
        )}
      </div>
      {timeOff.length === 0 && !open && <p className="mt-2 text-sm text-slate-500">Nenhuma folga marcada.</p>}
      {timeOff.length > 0 && (
        <ul className="mt-3 space-y-2">
          {timeOff.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 py-1.5 pl-3 pr-1.5 text-sm">
              <span>
                <span className="font-semibold text-ink">
                  {item.startDate === item.endDate ? formatDay(item.startDate) : `${formatDay(item.startDate)} a ${formatDay(item.endDate)}`}
                </span>
                {item.reason && <span className="text-slate-500"> · {item.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Liberar ${formatDay(item.startDate)}`}
                className="grid size-7 place-items-center rounded text-slate-400 hover:bg-white hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">De</span>
              <input className={inputClass} type="date" min={today} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Até</span>
              <input className={inputClass} type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
            </label>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Motivo (opcional, só você vê)</span>
            <input className={inputClass} maxLength={120} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Férias, congresso..." />
          </label>
          <div className="flex gap-2">
            <Button type="submit" isLoading={saving}>
              Bloquear
            </Button>
            <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 text-sm font-bold text-slate-500 hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
