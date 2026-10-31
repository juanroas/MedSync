using System.Security.Cryptography.Pkcs;
using System.Text;
using System.Text.RegularExpressions;
using MedSync.Api;
using MedSync.Domain;
using PdfSharp.Pdf.Signatures;

namespace MedSync.Api.Tests;

// Laudo and attendance declaration on the standard layout (28/10/2026): signed like the prescription, long text
// continues on the next page, and the declaration speaks in the doctor's voice with the attendance times.
public class MedicalDocumentPdfTests
{
    private static readonly DateTime Start = new(2026, 10, 29, 18, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Signed_report_carries_a_cms_that_verifies_over_the_byte_range()
    {
        using var certificate = PrescriptionPdfTests.CreateTestCertificate();
        var document = MedicalDocumentPdf.Render(SampleData(MedicalDocumentKind.Report, "Paciente em acompanhamento."));

        var pdf = await PrescriptionPdf.SignAsync(
            document, new PdfSharpDefaultSigner(certificate, PdfMessageDigestType.SHA256), "São Paulo/SP", "Documento médico");

        if (Environment.GetEnvironmentVariable("MEDSYNC_DOCUMENT_SAMPLE") is { Length: > 0 } samplePath)
            await File.WriteAllBytesAsync(samplePath, pdf);

        var (signedContent, cms) = PrescriptionPdfTests.ReadSignature(pdf);
        var signedCms = new SignedCms(new ContentInfo(signedContent), detached: true);
        signedCms.Decode(cms);
        signedCms.CheckSignature(verifySignatureOnly: true);
        Assert.Equal(certificate.Thumbprint, signedCms.SignerInfos[0].Certificate!.Thumbprint);
    }

    [Fact]
    public async Task Long_report_continues_on_the_next_page()
    {
        var body = string.Join("\n", Enumerable.Range(1, 120).Select(i => $"Linha {i} do relatório médico com texto suficiente para ocupar a largura da página."));
        var document = MedicalDocumentPdf.Render(SampleData(MedicalDocumentKind.Report, body));
        using var output = new MemoryStream();
        await document.SaveAsync(output, false);
        Assert.True(Regex.Matches(Encoding.Latin1.GetString(output.ToArray()), @"/Type\s*/Page\b").Count > 1);
    }

    [Fact]
    public void Declaration_text_has_the_attendance_times_in_brazil_time()
    {
        var text = MedicalDocumentPdf.DeclarationText(SampleData(MedicalDocumentKind.AttendanceDeclaration, ""));
        Assert.StartsWith("Declaro, para os devidos fins, que Ana Paciente, CPF 123.456.789-09", text);
        Assert.Contains("no dia 29/10/2026, das 15:00 às 15:40 (horário de Brasília)", text);
        Assert.Contains("em consulta presencial em Clínica Demo", text);
    }

    private static MedicalDocumentPdfData SampleData(MedicalDocumentKind kind, string body) =>
        new(
            Guid.NewGuid(),
            kind,
            kind == MedicalDocumentKind.AttendanceDeclaration ? MedicalDocumentPdf.DeclarationTitle : "Laudo médico",
            body,
            "Dra. Marina Costa",
            "CRM-SP 200000",
            "SP",
            "Clínica geral",
            null,
            "Avenida Paulista, 1000, sala 32 — Bela Vista, São Paulo/SP · CEP 01310-100",
            "Clínica Demo",
            "Clínica Demo MedSync Ltda",
            "12345678000190",
            "Avenida Paulista, 1000, sala 32 — Bela Vista, São Paulo/SP · CEP 01310-100",
            "(11) 3000-0000",
            "São Paulo",
            "Ana Paciente",
            null,
            "12345678909",
            new DateOnly(1990, 5, 14),
            InPerson: true,
            PatientLocation: null,
            AttendanceStartedAtUtc: Start,
            AttendanceEndedAtUtc: Start.AddMinutes(40),
            IssuedAtUtc: Start.AddHours(1),
            Simulated: false,
            Draft: false);
}
