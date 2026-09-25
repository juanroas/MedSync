"use client";

import { cn } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

// Calendário sempre aberto: só os dias com horário livre do médico podem ser escolhidos.
// Datas em "yyyy-mm-dd" (horário de Brasília); cada chave vira Date ao meio-dia UTC só para calcular.

const WEEK_HEADER = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function keyToDate(key: string) {
  return new Date(`${key}T12:00:00Z`);
}
function monthKey(key: string) {
  return key.slice(0, 7);
}
function shiftMonth(month: string, delta: number) {
  const date = keyToDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(keyToDate(`${month}-01`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function AvailabilityCalendar({
  availableDays,
  from,
  to,
  selected,
  onSelect,
}: {
  availableDays: string[];
  from: string;
  to: string;
  selected: string;
  onSelect: (day: string) => void;
}) {
  const open = useMemo(() => new Set(availableDays), [availableDays]);
  const [month, setMonth] = useState(monthKey(selected || availableDays[0] || from));

  const cells = useMemo(() => {
    const first = keyToDate(`${month}-01`);
    const leading = (first.getUTCDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`),
    ];
  }, [month]);

  const canGoBack = month > monthKey(from);
  const canGoForward = month < monthKey(to);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={!canGoBack}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 disabled:text-slate-200"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold text-ink">{monthLabel(month)}</p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={!canGoForward}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-50 disabled:text-slate-200"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Dias disponíveis em ${monthLabel(month)}`}>
        {WEEK_HEADER.map((day) => (
          <span key={day} className="pb-1 text-[11px] font-bold uppercase text-slate-400">
            {day}
          </span>
        ))}
        {cells.map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              disabled={!open.has(day)}
              onClick={() => onSelect(day)}
              aria-pressed={day === selected}
              aria-label={`${Number(day.slice(8))}${open.has(day) ? ", com horários" : ", sem horários"}`}
              className={cn(
                "h-10 rounded-lg text-sm font-semibold transition",
                day === selected
                  ? "bg-teal-600 text-white"
                  : open.has(day)
                    ? "bg-teal-50 text-teal-800 hover:bg-teal-100"
                    : "cursor-not-allowed text-slate-300",
              )}
            >
              {Number(day.slice(8))}
            </button>
          ),
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="inline-block size-3 rounded bg-teal-50 ring-1 ring-teal-100" /> dias com horário livre
      </p>
    </div>
  );
}
