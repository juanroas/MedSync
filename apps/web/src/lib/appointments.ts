import type { Appointment } from "@/lib/types";

export function isAppointmentJoinWindowOpen(appointment: Appointment) {
  const scheduledAt = new Date(appointment.scheduledAt).getTime();
  const opensAt = scheduledAt - 15 * 60 * 1000;
  const closesAt = scheduledAt + (appointment.durationMinutes + 15) * 60 * 1000;
  const now = Date.now();

  return now >= opensAt && now <= closesAt;
}

export function isAppointmentJoinWindowClosed(appointment: Appointment) {
  const scheduledAt = new Date(appointment.scheduledAt).getTime();
  const closesAt = scheduledAt + (appointment.durationMinutes + 15) * 60 * 1000;

  return Date.now() > closesAt;
}

export function isAppointmentMissed(appointment: Appointment) {
  return appointment.status === "Scheduled" && isAppointmentJoinWindowClosed(appointment);
}

export function isAppointmentRoomJoinable(appointment: Appointment) {
  return appointment.status === "InProgress" &&
    appointment.videoStatus !== "Completed" &&
    appointment.videoStatus !== "Cancelled" &&
    appointment.videoStatus !== "Expired" &&
    appointment.consentAccepted &&
    Boolean(appointment.roomName) &&
    isAppointmentJoinWindowOpen(appointment);
}

export function isAppointmentStaleInProgress(appointment: Appointment) {
  return appointment.status === "InProgress" && isAppointmentJoinWindowClosed(appointment);
}
