"use client";

import { Card, inputClass } from "@/components/ui";
import { addDaysLabel } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { api } from "@/services/api";
import { CalendarClock } from "lucide-react";
import { useState } from "react";

const OPTIONS = [
  { days: 7, label: "Em 7 dias" },
  { days: 15, label: "Em 15 dias" },
  { days: 30, label: "Em 30 dias" },
  { days: 45, label: "Em 45 dias" },
  { days: 60, label: "Em 60 dias" },
  { days: 90, label: "Em 3 meses" },
  { days: 180, label: "Em 6 meses" },
  { days: 365, label: "Em 1 ano" },
];

// Retorno pedido pelo médico: é conduta, então só o médico e o paciente veem (a API não devolve para os outros perfis).
export function FollowUpCard({
  appointment,
  locked,
  onSaved,
}: {
  appointment: Appointment;
  locked: boolean;
  onSaved: (appointment: Appointment) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const days = appointment.followUpDays ?? null;

  async function save(value: string) {
    setSaving(true);
    setError("");
    try {
      onSaved(await api.saveFollowUp(appointment.id, value ? Number(value) : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o retorno.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-3 grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
        <CalendarClock size={20} />
      </div>
      <h2 className="text-xl font-bold text-ink">Retorno</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        O paciente vê em Minhas consultas até quando deve voltar e marca pelo botão de sempre.
      </p>
      <label className="mt-4 block max-w-xs">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Precisa de retorno?</span>
        <select
          className={inputClass}
          value={days ?? ""}
          disabled={locked || saving || appointment.status === "Cancelled"}
          onChange={(event) => save(event.target.value)}
        >
          <option value="">Não precisa</option>
          {OPTIONS.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
          {days !== null && !OPTIONS.some((option) => option.days === days) && <option value={days}>Em {days} dias</option>}
        </select>
      </label>
      {days !== null && (
        <p className="mt-3 text-sm font-semibold text-teal-700">Retorno até {addDaysLabel(appointment.scheduledAt, days)}.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
