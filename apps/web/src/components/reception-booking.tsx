"use client";

import { AvailabilityCalendar } from "@/components/availability-calendar";
import { Button, Card, cn, inputClass } from "@/components/ui";
import { formatBrazilDateInput, formatBrazilDateTimeInput, formatDate, formatTime } from "@/lib/format";
import { MODALITY_LABELS } from "@/lib/types";
import type { Appointment, AvailableDays, AvailableTime, ConsultationModality, Doctor, Patient } from "@/lib/types";
import { brazilLocalDateTimeToUtcIso, digitsOnly, isFutureBrazilLocalDateTime } from "@/lib/validation";
import { api } from "@/services/api";
import { CalendarPlus, Clock, MapPin, UserRound, Video } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

// Recepção (ADM da clínica): agenda pelo paciente que liga ou chega no balcão.
// Busca a pessoa por CPF ou nome, escolhe médico, modalidade e um horário livre (ou um encaixe).

const MODALITIES: ConsultationModality[] = ["InPerson", "Online"];

export function ReceptionBookingForm({
  doctors,
  patients,
  onBooked,
}: {
  doctors: Doctor[];
  patients: Patient[];
  onBooked: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cpfMatches, setCpfMatches] = useState<Patient[] | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [modality, setModality] = useState<ConsultationModality>("InPerson");
  const [days, setDays] = useState<AvailableDays | null>(null);
  const [slotDate, setSlotDate] = useState("");
  const [times, setTimes] = useState<AvailableTime[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [manual, setManual] = useState(false);
  const [price, setPrice] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Back from "Cadastrar pessoa": the new patient comes preselected (?paciente=id).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("paciente");
    const found = id ? patients.find((item) => item.id === id) : undefined;
    if (found) setPatient(found);
  }, [patients]);

  // A full CPF is looked up in the API (the list only has it masked); otherwise search by name.
  useEffect(() => {
    const digits = digitsOnly(query);
    if (digits.length !== 11) {
      setCpfMatches(null);
      return;
    }
    let active = true;
    api
      .getPatients(digits)
      .then((items) => active && setCpfMatches(items))
      .catch(() => active && setCpfMatches([]));
    return () => {
      active = false;
    };
  }, [query]);

  const nameMatches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (text.length < 2 || digitsOnly(query).length === 11) return [];
    return patients.filter((item) => `${item.name} ${item.socialName ?? ""}`.toLowerCase().includes(text)).slice(0, 6);
  }, [patients, query]);
  const matches = cpfMatches ?? nameMatches;

  useEffect(() => {
    setScheduledAt("");
    setTimes([]);
    if (!doctorId) return;
    let active = true;
    api
      .getAvailableDays(doctorId, modality)
      .then((result) => {
        if (!active) return;
        setDays(result);
        setManual(!result.restricted);
        setSlotDate(result.days[0] ?? "");
      })
      .catch(() => active && setDays(null));
    return () => {
      active = false;
    };
  }, [doctorId, modality]);

  useEffect(() => {
    if (!doctorId || !slotDate || manual) return;
    let active = true;
    api
      .getAvailableTimes(doctorId, slotDate, modality)
      .then((result) => active && setTimes(result))
      .catch(() => active && setTimes([]));
    return () => {
      active = false;
    };
  }, [doctorId, slotDate, modality, manual]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!patient) return setError("Busque e selecione o paciente.");
    if (!scheduledAt) return setError("Escolha um horário.");
    if (!isFutureBrazilLocalDateTime(scheduledAt)) return setError("Escolha um horário futuro (Brasília).");
    setSaving(true);
    try {
      await api.createAppointment({
        doctorId,
        patientId: patient.id,
        scheduledAt: brazilLocalDateTimeToUtcIso(scheduledAt),
        durationMinutes: duration,
        notes: notes || undefined,
        price: price ? Number(price) : undefined,
        paymentRequired,
        modality,
      });
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível agendar.");
    } finally {
      setSaving(false);
    }
  }

  const doctor = doctors.find((item) => item.id === doctorId);
  const label = "mb-2 block text-sm font-bold text-slate-700";

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <Card className="space-y-7 p-6 sm:p-8">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <section>
          <h2 className={label}>1. Paciente</h2>
          {patient ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3" data-testid="selected-patient">
              <div className="text-sm">
                <p className="font-bold text-ink">{patient.socialName || patient.name}</p>
                <p className="text-xs text-slate-600">
                  CPF {patient.cpfMasked} · nasc. {formatDate(patient.birthDate)}
                  {patient.motherName ? ` · mãe: ${patient.motherName}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setPatient(null)} className="text-xs font-bold text-teal-700 hover:text-teal-900">
                Trocar
              </button>
            </div>
          ) : (
            <>
              <input
                className={inputClass}
                aria-label="Buscar paciente por CPF ou nome"
                placeholder="CPF completo ou nome"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {matches.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {matches.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatient(item);
                          setQuery("");
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50"
                      >
                        <UserRound size={15} className="text-teal-700" />
                        <span className="font-semibold text-ink">{item.name}</span>
                        <span className="text-xs text-slate-500">CPF {item.cpfMasked}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(cpfMatches?.length === 0 || (query.trim().length >= 2 && matches.length === 0)) && (
                <p className="mt-2 text-xs text-slate-500">Nenhum paciente encontrado.</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Não encontrou?{" "}
                <Link href="/patients?novo=1&volta=/consultas/nova" className="font-bold text-teal-700 hover:text-teal-900">
                  Cadastrar pessoa
                </Link>
              </p>
            </>
          )}
        </section>

        <section className="space-y-4">
          <h2 className={label}>2. Médico, modalidade e horário</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Médico</span>
              <select className={inputClass} value={doctorId} onChange={(event) => setDoctorId(event.target.value)} required>
                {doctors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.specialty}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-2 block text-xs font-bold text-slate-600">Modalidade</legend>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                {MODALITIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={modality === option}
                    onClick={() => setModality(option)}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold transition",
                      modality === option ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:text-ink",
                    )}
                  >
                    {option === "InPerson" ? <MapPin size={14} /> : <Video size={14} />}
                    {MODALITY_LABELS[option]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {manual ? (
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">Data e horário (Brasília)</span>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={scheduledAt}
                  min={formatBrazilDateTimeInput()}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">Duração</span>
                <select className={inputClass} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                  {[15, 20, 30, 45, 60, 90].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutos
                    </option>
                  ))}
                </select>
              </label>
              {days?.restricted && (
                <button type="button" onClick={() => setManual(false)} className="w-fit text-xs font-bold text-teal-700 hover:text-teal-900">
                  Voltar para os horários livres
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              {days && days.days.length > 0 ? (
                <AvailabilityCalendar
                  key={`${doctorId}-${modality}`}
                  availableDays={days.days}
                  from={days.from}
                  to={days.to}
                  selected={slotDate}
                  onSelect={(day) => {
                    setSlotDate(day);
                    setScheduledAt("");
                  }}
                />
              ) : (
                <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  {doctor?.name ?? "Este médico"} não tem horários livres {modality === "InPerson" ? "presenciais" : "online"}.
                </p>
              )}
              <div>
                <span className="mb-2 block text-xs font-bold text-slate-600">Horários livres</span>
                {times.length === 0 ? (
                  <p className="text-sm text-slate-400">{slotDate ? "Nenhum horário livre neste dia." : "Escolha um dia."}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {times.map((time) => {
                      const local = formatBrazilDateTimeInput(new Date(time.startsAt));
                      const selected = local === scheduledAt;
                      return (
                        <button
                          key={time.startsAt}
                          type="button"
                          onClick={() => {
                            setScheduledAt(local);
                            setDuration(time.durationMinutes);
                          }}
                          className={cn(
                            "flex h-10 items-center justify-center gap-1 rounded-lg border text-sm font-bold transition",
                            selected
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700",
                          )}
                        >
                          <Clock size={13} /> {local.slice(11, 16)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button type="button" onClick={() => setManual(true)} className="mt-3 text-xs font-bold text-teal-700 hover:text-teal-900">
                  Encaixe em outro horário
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <h2 className={cn(label, "sm:col-span-2")}>3. Detalhes (opcional)</h2>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Valor (R$)</span>
            <input className={inputClass} type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
          <label className="flex items-center gap-3 self-end pb-3 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={paymentRequired} onChange={(event) => setPaymentRequired(event.target.checked)} />
            Exigir pagamento antes da consulta
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-600">Observação</span>
            <textarea
              className={`${inputClass} h-20 resize-none py-2.5`}
              maxLength={500}
              placeholder="Motivo da consulta ou recado para o médico"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </section>

        <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600" data-testid="booking-summary">
            {patient ? (patient.socialName || patient.name) : "Paciente"} · {doctor?.name ?? "Médico"} ·{" "}
            {scheduledAt ? `${scheduledAt.slice(8, 10)}/${scheduledAt.slice(5, 7)} às ${scheduledAt.slice(11, 16)}` : "horário"} ·{" "}
            {MODALITY_LABELS[modality]}
          </p>
          <Button type="submit" isLoading={saving}>
            <CalendarPlus size={17} /> Confirmar agendamento
          </Button>
        </div>
      </Card>

      <TodayAtClinic />
    </form>
  );
}

function TodayAtClinic() {
  const [items, setItems] = useState<Appointment[] | null>(null);
  useEffect(() => {
    const today = formatBrazilDateInput();
    api
      .getAppointments()
      .then((all) =>
        setItems(
          all
            .filter((item) => item.status !== "Cancelled" && formatBrazilDateInput(new Date(item.scheduledAt)) === today)
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
        ),
      )
      .catch(() => setItems([]));
  }, []);

  return (
    <Card className="h-fit overflow-hidden">
      <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-ink">Hoje na clínica</h2>
      {items === null ? (
        <p className="px-5 py-4 text-sm text-slate-400">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-400">Nenhuma consulta hoje.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-3 text-sm">
              <span className="font-bold text-ink">{formatTime(item.scheduledAt)}</span> {item.patientName} · {item.doctorName}{" "}
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  item.modality === "InPerson" ? "bg-sky-50 text-sky-700" : "bg-teal-50 text-teal-700",
                )}
              >
                {MODALITY_LABELS[item.modality]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
