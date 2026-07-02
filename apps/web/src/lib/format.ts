import type { AppointmentStatus } from "@/lib/types";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
