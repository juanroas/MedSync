import { statusClass, statusLabel } from "@/lib/format";
import type { Appointment } from "@/lib/types";

// The room opens 15 minutes before and closes 30 minutes after the scheduled end (ConsultationRules.cs): the doctor may
// still see a late patient or fit them in another one's place.
const GRACE_AFTER_END_MINUTES = 30;

export function isAppointmentJoinWindowOpen(appointment: Appointment) {
  const scheduledAt = new Date(appointment.scheduledAt).getTime();
  const opensAt = scheduledAt - 15 * 60 * 1000;
  const closesAt = scheduledAt + (appointment.durationMinutes + GRACE_AFTER_END_MINUTES) * 60 * 1000;
  const now = Date.now();

  return now >= opensAt && now <= closesAt;
}

export function isAppointmentJoinWindowClosed(appointment: Appointment) {
  const scheduledAt = new Date(appointment.scheduledAt).getTime();
  const closesAt = scheduledAt + (appointment.durationMinutes + GRACE_AFTER_END_MINUTES) * 60 * 1000;

  return Date.now() > closesAt;
}

export function isAppointmentMissed(appointment: Appointment) {
  return appointment.status === "Scheduled" && isAppointmentJoinWindowClosed(appointment);
}

export function isAppointmentRoomJoinable(appointment: Appointment) {
  return !isInPerson(appointment) &&
    appointment.status === "InProgress" &&
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

export function isInPerson(appointment: Appointment) {
  return appointment.modality === "InPerson";
}

// Doctor side: the room can be started once the join window opens, or re-entered while the video is still live.
// In-person consultations have no video room.
export function canStartRoom(appointment: Appointment) {
  if (isInPerson(appointment) || appointment.roomName || !["Scheduled", "InProgress"].includes(appointment.status)) {
    return false;
  }

  return isAppointmentJoinWindowOpen(appointment);
}

export function canDoctorEnterExistingRoom(appointment: Appointment) {
  return !isInPerson(appointment) &&
    Boolean(appointment.roomName) &&
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
  if (appointment.closedAt) return "Atendimento encerrado";
  if (isInPerson(appointment) && isAppointmentMissed(appointment)) return "Aguardando conclusão";
  if (isAppointmentMissed(appointment)) return "Não realizada";
  if (isAppointmentStaleInProgress(appointment)) {
    return appointment.doctorJoined && !appointment.patientJoined ? "Paciente não entrou" : "Sala expirada";
  }
  return statusLabel[appointment.status];
}

// Why nothing of this consultation can be written (rule D8; the API checks the same in ConsultationRules.WriteBlock).
// The closed case has its own banner.
export function notHeldReason(appointment: Appointment) {
  if (appointment.status === "Cancelled") return "Consulta cancelada: não há atendimento para registrar.";
  if (appointment.status === "NoShow") return "O paciente não compareceu: não há atendimento para registrar.";
  if (!isInPerson(appointment) && isAppointmentMissed(appointment))
    return "Consulta não realizada: a sala não foi aberta no horário, então não há atendimento para registrar.";
  return null;
}

// Agenda of the day: finished is closed, cancelled, no-show or not held; everything else still asks the doctor for
// something, including a concluded consultation that was not closed yet.
export function isAppointmentFinished(appointment: Appointment) {
  return Boolean(appointment.closedAt) || notHeldReason(appointment) !== null;
}

export function isAwaitingClosure(appointment: Appointment) {
  return appointment.status === "Completed" && !appointment.closedAt;
}

export function appointmentStatusTone(appointment: Appointment) {
  if (isAppointmentMissed(appointment) || isAppointmentStaleInProgress(appointment)) return "bg-slate-100 text-slate-500";
  return statusClass[appointment.status];
}

// The doctor can close it while the room exists and was not ended (during the call or after the window).
// In person there is no room: from 15 minutes before the time on, while it is still open.
export function canConcludeConsultation(appointment: Appointment) {
  if (isInPerson(appointment)) {
    return ["Scheduled", "InProgress"].includes(appointment.status) &&
      Date.now() >= new Date(appointment.scheduledAt).getTime() - 15 * 60 * 1000;
  }
  return appointment.status === "InProgress";
}
