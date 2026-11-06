using MedSync.Api;
using MedSync.Domain;

namespace MedSync.Api.Tests;

// The room stays open 30 minutes after the end, and a consultation that did not happen takes no record.
public class ConsultationRulesTests
{
    private static readonly DateTime Start = new(2026, 11, 6, 22, 0, 0, DateTimeKind.Utc); // 19:00 in Brasília

    private static Appointment Consultation(AppointmentStatus status, ConsultationModality modality = ConsultationModality.Online) =>
        new() { ScheduledAt = Start, DurationMinutes = 30, Status = status, Modality = modality };

    [Theory]
    [InlineData(-16, false)]
    [InlineData(-15, true)]
    [InlineData(60, true)] // 30 minutes after the end of a 30-minute consultation
    [InlineData(61, false)]
    public void Room_opens_15_minutes_before_and_closes_30_after_the_end(int minutes, bool open) =>
        Assert.Equal(open, ConsultationRules.InJoinWindow(Start, 30, Start.AddMinutes(minutes)));

    [Fact]
    public void Online_consultation_never_started_is_locked_after_the_grace()
    {
        var appointment = Consultation(AppointmentStatus.Scheduled);
        Assert.Null(ConsultationRules.WriteBlock(appointment, Start.AddMinutes(60)));
        Assert.Contains("não realizada", ConsultationRules.WriteBlock(appointment, Start.AddMinutes(61)));
    }

    [Fact]
    public void In_person_consultation_waiting_for_conclusion_stays_open()
    {
        var appointment = Consultation(AppointmentStatus.Scheduled, ConsultationModality.InPerson);
        Assert.Null(ConsultationRules.WriteBlock(appointment, Start.AddHours(5)));
    }

    [Theory]
    [InlineData(AppointmentStatus.Cancelled, "cancelada")]
    [InlineData(AppointmentStatus.NoShow, "não compareceu")]
    public void Cancelled_and_no_show_take_no_record(AppointmentStatus status, string reason) =>
        Assert.Contains(reason, ConsultationRules.WriteBlock(Consultation(status), Start));

    [Fact]
    public void Closed_consultation_is_locked_even_when_completed()
    {
        var appointment = Consultation(AppointmentStatus.Completed);
        Assert.Null(ConsultationRules.WriteBlock(appointment, Start.AddDays(3)));
        appointment.ClosedAt = Start.AddHours(1);
        Assert.Contains("encerrado", ConsultationRules.WriteBlock(appointment, Start.AddDays(3)));
    }
}
