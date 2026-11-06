using MedSync.Domain;

namespace MedSync.Api;

// When a consultation can be attended and written (06/11/2026). The room opens 15 minutes before and stays open until
// 30 minutes after the scheduled end: the doctor may still see a late patient or fit them in another one's place.
// A consultation that did not happen takes no clinical record (rule D8).
public static class ConsultationRules
{
    public const int OpensMinutesBefore = 15;
    public const int GraceMinutesAfterEnd = 30;

    public static DateTime ClosesAt(DateTime scheduledAt, int durationMinutes) =>
        scheduledAt.AddMinutes(durationMinutes + GraceMinutesAfterEnd);

    public static bool InJoinWindow(DateTime scheduledAt, int durationMinutes, DateTime nowUtc) =>
        nowUtc >= scheduledAt.AddMinutes(-OpensMinutesBefore) && nowUtc <= ClosesAt(scheduledAt, durationMinutes);

    // Why nothing of this consultation can be written now, or null when it can.
    public static string? WriteBlock(Appointment appointment, DateTime nowUtc)
    {
        if (appointment.ClosedAt is not null)
            return "Este atendimento foi encerrado: nada dele pode ser alterado.";
        return appointment.Status switch
        {
            AppointmentStatus.Cancelled => "Consulta cancelada: não há atendimento para registrar.",
            AppointmentStatus.NoShow => "O paciente não compareceu: não há atendimento para registrar.",
            AppointmentStatus.Scheduled when appointment.Modality != ConsultationModality.InPerson &&
                                             nowUtc > ClosesAt(appointment.ScheduledAt, appointment.DurationMinutes)
                => "Consulta não realizada: a sala não foi aberta no horário, então não há atendimento para registrar.",
            _ => null
        };
    }
}
