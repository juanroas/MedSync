import { statusClass, statusLabel } from "@/lib/format";
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

// Doctor side: the room can be started once the join window opens, or re-entered while the video is still live.
export function canStartRoom(appointment: Appointment) {
  if (appointment.roomName || !["Scheduled", "InProgress"].includes(appointment.status)) {
    return false;
  }

  return isAppointmentJoinWindowOpen(appointment);
}

export function canDoctorEnterExistingRoom(appointment: Appointment) {
  return Boolean(appointment.roomName) &&
    ["Scheduled", "InProgress"].includes(appointment.status) &&
    appointment.videoStatus !== "Completed" &&
    appointment.videoStatus !== "Cancelled" &&
    appointment.videoStatus !== "Expired" &&
    isAppointmentJoinWindowOpen(appointment);
}

// Opening /sala/{id} as the doctor starts the room if needed, so one link covers both cases.
export function canDoctorOpenRoom(appointment: Appointment) {
  return canStartRoom(appointment) || canDoctorEnterExistingRoom(appointment);
}

// One wording for how a consultation ended, everywhere (agenda, painel, lista do paciente):
// "Não compareceu" is only what the doctor registered; a room nobody opened is "Não realizada".
export function appointmentStatusLabel(appointment: Appointment) {
  if (isAppointmentMissed(appointment)) return "Não realizada";
  if (isAppointmentStaleInProgress(appointment)) {
    return appointment.doctorJoined && !appointment.patientJoined ? "Paciente não entrou" : "Sala expirada";
  }
  return statusLabel[appointment.status];
}

export function appointmentStatusTone(appointment: Appointment) {
  if (isAppointmentMissed(appointment) || isAppointmentStaleInProgress(appointment)) return "bg-slate-100 text-slate-500";
  return statusClass[appointment.status];
}

// The doctor can close it while the room exists and was not ended (during the call or after the window).
export function canConcludeConsultation(appointment: Appointment) {
  return appointment.status === "InProgress";
}
