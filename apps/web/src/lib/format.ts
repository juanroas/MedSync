import type { AppointmentStatus } from "@/lib/types";

export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBrazilDateTimeInput(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}

export const statusLabel: Record<AppointmentStatus, string> = {
  Scheduled: "Agendada",
  InProgress: "Em andamento",
  Completed: "Concluída",
  Cancelled: "Cancelada",
  NoShow: "Não compareceu",
};

export const statusClass: Record<AppointmentStatus, string> = {
  Scheduled: "bg-blue-50 text-blue-700",
  InProgress: "bg-amber-50 text-amber-700",
  Completed: "bg-teal-50 text-teal-700",
  Cancelled: "bg-red-50 text-red-700",
  NoShow: "bg-amber-50 text-amber-700",
};
