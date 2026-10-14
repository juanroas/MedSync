using System.Text;
using MedSync.Api;
using MedSync.Application;
using MedSync.Domain;
using Xunit;

namespace MedSync.Api.Tests;

// Reports never carry clinical content (rule C5); these cover the outcome reading, the CSV and the three PDFs.
public class ReportTests
{
    private static readonly DateTime Scheduled = new(2026, 10, 14, 13, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(AppointmentStatus.Completed, 0, "Completed")]
    [InlineData(AppointmentStatus.NoShow, 0, "NoShow")]
    [InlineData(AppointmentStatus.Cancelled, 0, "Cancelled")]
    // 30 min consultation + 15 min of tolerance: still upcoming 44 min later, not held at 46.
    [InlineData(AppointmentStatus.Scheduled, 44, "Upcoming")]
    [InlineData(AppointmentStatus.Scheduled, 46, "NotHeld")]
    [InlineData(AppointmentStatus.InProgress, 46, "NotHeld")]
    public void Outcome_follows_the_agenda_reading(AppointmentStatus status, int minutesAfter, string expected)
    {
        Assert.Equal(expected, ApiEndpoints.ReportOutcome(status, Scheduled, 30, Scheduled.AddMinutes(minutesAfter)));
    }

    [Theory]
    [InlineData("=HYPERLINK(\"x\")", "\"'=HYPERLINK(\"\"x\"\")\"")]
    [InlineData("+5511", "\"'+5511\"")]
    [InlineData("@SUM", "\"'@SUM\"")]
    [InlineData("Maria \"Mãe\"", "\"Maria \"\"Mãe\"\"\"")]
    public void Csv_cells_never_run_as_formulas(string value, string expected)
    {
        Assert.Equal(expected, ApiEndpoints.CsvCell(value));
    }

    [Fact]
    public void Csv_has_bom_header_and_brazil_time()
    {
        var bytes = ApiEndpoints.AppointmentReportCsv(Report());
        Assert.Equal(Encoding.UTF8.GetPreamble(), bytes[..3]);
        var text = Encoding.UTF8.GetString(bytes[3..]);
        Assert.StartsWith("Data;Horário;Paciente;Médico;Modalidade;Situação", text);
        Assert.Contains("14/10/2026;10:00;\"Ana Paciente\";\"Dra. Marina\";Presencial;Realizada", text);
    }

    [Fact]
    public void Pdfs_render()
    {
        var appointments = ReportPdf.Appointments(Report(), "Ana Clínica");
        var access = ReportPdf.DataAccess(
            "Ana Paciente",
            "12345678909",
            [new DataAccessEntry(Scheduled, "Dra. Marina", "Médico", "Leu o prontuário da consulta", "Permitido", "Clínica Demo")],
            "o próprio titular",
            Scheduled);
        var declaration = ReportPdf.AttendanceDeclaration(new AttendanceDeclarationData(
            Guid.NewGuid(), "Clínica Demo", "Clínica Demo Ltda", "12345678000190", "Av. Paulista, 1000 — São Paulo/SP", null, "São Paulo",
            "Ana Paciente", null, "12345678909", "Dra. Marina", "CRM 123456/SP", true, Scheduled, Scheduled.AddMinutes(30), Scheduled));
        foreach (var pdf in new[] { appointments, access, declaration })
            Assert.Equal("%PDF", Encoding.ASCII.GetString(pdf[..4]));
    }

    [Fact]
    public void Long_report_breaks_into_pages()
    {
        var items = Enumerable.Range(0, 200)
            .Select(i => new AppointmentReportItem(Guid.NewGuid(), Scheduled.AddHours(i), 30, $"Paciente {i}", Guid.Empty, "Dra. Marina", ConsultationModality.Online, "Completed"))
            .ToList();
        var pdf = ReportPdf.Appointments(Report() with { Items = items }, "Ana Clínica");
        using var document = PdfSharp.Pdf.IO.PdfReader.Open(new MemoryStream(pdf), PdfSharp.Pdf.IO.PdfDocumentOpenMode.Import);
        Assert.True(document.PageCount > 1, $"esperava mais de uma página, veio {document.PageCount}");
    }

    private static AppointmentReportResponse Report()
    {
        var item = new AppointmentReportItem(Guid.NewGuid(), Scheduled, 30, "Ana Paciente", Guid.Empty, "Dra. Marina", ConsultationModality.InPerson, "Completed");
        var totals = new AppointmentReportTotals(1, 1, 0, 0, 0, 0, 0, 1);
        return new AppointmentReportResponse(
            "Clínica Demo",
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 31),
            "clinic",
            null,
            null,
            totals,
            [new AppointmentReportDoctorRow(Guid.Empty, "Dra. Marina", totals)],
            [item],
            false,
            new PrescriptionReportTotals(3, 1, 1, 1, 1, 1, 1),
            Scheduled);
    }
}
