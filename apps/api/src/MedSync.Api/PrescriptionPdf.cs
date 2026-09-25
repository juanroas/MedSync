using System.Globalization;
using MedSync.Domain;
using PdfSharp.Drawing;
using PdfSharp.Fonts;
using PdfSharp.Pdf;
using PdfSharp.Pdf.Signatures;

namespace MedSync.Api;

// Everything printed on the prescription (CFM 2.314 art. 13, .agents/rules/medical-documents.md D2).
public sealed record PrescriptionPdfData(
    Guid PrescriptionId,
    PrescriptionKind Kind,
    string DoctorName,
    string DoctorCrm,
    string DoctorCrmUf,
    string DoctorSpecialty,
    string DoctorProfessionalAddress,
    string ClinicName,
    string PatientName,
    string PatientCpf,
    string PatientLocation,
    string? Notes,
    DateTime IssuedAtUtc,
    IReadOnlyList<PrescriptionItem> Items,
    bool Simulated = false);

// Builds the prescription PDF on the server and signs it through any IDigitalSigner (PAdES with PDFsharp).
// The signer is the doctor's ICP-Brasil cloud certificate in production (rule D1); tests use a local certificate.
public static class PrescriptionPdf
{
    private const string FontFamily = "DejaVu Sans";
    private const double Margin = 56;
    private static readonly TimeZoneInfo BrazilTime = TimeZoneInfo.CreateCustomTimeZone("BRT", TimeSpan.FromHours(-3), "BRT", "BRT");
    private static readonly object FontLock = new();

    public static PdfDocument Render(PrescriptionPdfData data)
    {
        EnsureFonts();
        var document = new PdfDocument();
        document.Info.Title = "Receita médica";
        document.Info.Author = data.DoctorName;
        document.Info.Creator = "MedSync";

        // Antimicrobial prescriptions go in two copies (RDC Anvisa 471/2021).
        var copies = data.Kind == PrescriptionKind.Antimicrobial
            ? new[] { "1ª via — farmácia", "2ª via — paciente" }
            : new string?[] { null };
        foreach (var copy in copies)
            RenderPage(document.AddPage(), data, copy);
        return document;
    }

    public static async Task<byte[]> SignAsync(PdfDocument document, IDigitalSigner signer, string location)
    {
        DigitalSignatureHandler.ForDocument(document, signer, new DigitalSignatureOptions
        {
            Reason = "Receita médica emitida em modalidade de telemedicina",
            Location = location,
            AppName = "MedSync"
        });
        using var output = new MemoryStream();
        await document.SaveAsync(output, false);
        return output.ToArray();
    }

    private static void RenderPage(PdfPage page, PrescriptionPdfData data, string? copy)
    {
        page.Size = PdfSharp.PageSize.A4;
        using var graphics = XGraphics.FromPdfPage(page);
        var width = page.Width.Point - 2 * Margin;
        var title = new XFont(FontFamily, 13, XFontStyleEx.Bold);
        var strong = new XFont(FontFamily, 10.5, XFontStyleEx.Bold);
        var body = new XFont(FontFamily, 10.5, XFontStyleEx.Regular);
        var small = new XFont(FontFamily, 8.5, XFontStyleEx.Regular);
        var ink = XBrushes.Black;
        var muted = new XSolidBrush(XColor.FromArgb(90, 100, 110));
        var y = Margin;
        if (data.Simulated)
            DrawSimulationWatermark(graphics, page);

        y = Write(graphics, data.DoctorName, title, ink, Margin, y, width);
        y = Write(graphics, $"{data.DoctorSpecialty} · {FormatCrm(data.DoctorCrm, data.DoctorCrmUf)}", body, muted, Margin, y, width);
        y = Write(graphics, data.DoctorProfessionalAddress, body, muted, Margin, y, width);
        y = Write(graphics, data.ClinicName, small, muted, Margin, y, width) + 8;
        graphics.DrawLine(XPens.Gray, Margin, y, Margin + width, y);
        y += 18;

        var heading = data.Kind == PrescriptionKind.Antimicrobial ? "RECEITUÁRIO DE ANTIMICROBIANO" : "RECEITA";
        Write(graphics, heading, title, ink, Margin, y, width);
        if (copy is not null)
            graphics.DrawString(copy, small, muted, new XRect(Margin, y, width, 16), XStringFormats.TopRight);
        y += 26;

        y = Write(graphics, $"Paciente: {data.PatientName} · CPF {FormatCpf(data.PatientCpf)}", body, ink, Margin, y, width);
        y = Write(graphics, $"Local informado pelo paciente: {data.PatientLocation}", body, ink, Margin, y, width) + 16;

        var index = 1;
        foreach (var item in data.Items.OrderBy(x => x.Position))
        {
            var line = $"{index++}. {item.MedicationName}" +
                       (item.Dosage is null ? "" : $" {item.Dosage}") +
                       (item.Quantity is null ? "" : $" — {item.Quantity}");
            y = Write(graphics, line, strong, ink, Margin, y, width);
            y = Write(graphics, item.Instructions + (item.ContinuousUse ? " (uso contínuo)" : ""), body, ink, Margin + 16, y, width - 16) + 10;
        }

        if (!string.IsNullOrWhiteSpace(data.Notes))
            y = Write(graphics, $"Orientações: {data.Notes}", body, ink, Margin, y + 6, width) + 6;

        y = Math.Max(y + 24, page.Height.Point - Margin - 90);
        graphics.DrawLine(XPens.Gray, Margin, y, Margin + width, y);
        y += 10;
        var issuedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(data.IssuedAtUtc, DateTimeKind.Utc), BrazilTime);
        y = Write(graphics, "Emitida em modalidade de telemedicina (Res. CFM 2.314/2022).", small, muted, Margin, y, width);
        var dateLine = $"Data e hora: {issuedAt.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture)} (horário de Brasília)";
        if (data.Kind == PrescriptionKind.Antimicrobial)
            dateLine += " · Validade: 10 dias a partir da emissão (RDC Anvisa 471/2021).";
        y = Write(graphics, dateLine, small, muted, Margin, y, width);
        y = Write(graphics, data.Simulated
            ? "SIMULAÇÃO: assinatura de demonstração, SEM VALIDADE JURÍDICA. Não use em farmácia."
            : "Assinada digitalmente com certificado ICP-Brasil. Confira em validar.iti.gov.br.", small, muted, Margin, y, width);
        Write(graphics, $"Documento {data.PrescriptionId}", small, muted, Margin, y, width);
    }

    private static void DrawSimulationWatermark(XGraphics graphics, PdfPage page)
    {
        var state = graphics.Save();
        graphics.TranslateTransform(page.Width.Point / 2, page.Height.Point / 2);
        graphics.RotateTransform(-35);
        var font = new XFont(FontFamily, 34, XFontStyleEx.Bold);
        var brush = new XSolidBrush(XColor.FromArgb(45, 220, 38, 38));
        graphics.DrawString("SIMULAÇÃO — SEM VALIDADE", font, brush, new XPoint(0, 0), XStringFormats.Center);
        graphics.Restore(state);
    }

    // Draws wrapped text and returns the next baseline.
    private static double Write(XGraphics graphics, string text, XFont font, XBrush brush, double x, double y, double width)
    {
        var lineHeight = font.GetHeight() * 1.25;
        foreach (var paragraph in text.Split('\n'))
        {
            var line = "";
            foreach (var word in paragraph.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var candidate = line.Length == 0 ? word : $"{line} {word}";
                if (line.Length > 0 && graphics.MeasureString(candidate, font).Width > width)
                {
                    graphics.DrawString(line, font, brush, new XRect(x, y, width, lineHeight), XStringFormats.TopLeft);
                    y += lineHeight;
                    line = word;
                }
                else
                    line = candidate;
            }

            graphics.DrawString(line, font, brush, new XRect(x, y, width, lineHeight), XStringFormats.TopLeft);
            y += lineHeight;
        }

        return y;
    }

    // CRM is stored in different shapes ("123456", "CRM-SP 123456"); print it once as "CRM 123456/SP".
    public static string FormatCrm(string crm, string uf)
    {
        var number = System.Text.RegularExpressions.Regex.Replace(
            crm, @"^\s*CRM[\s/-]*(?:[A-Za-z]{2}(?=[\s/-]))?[\s/-]*", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
        return $"CRM {number}/{uf.ToUpperInvariant()}";
    }

    private static string FormatCpf(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 11 ? $"{digits[..3]}.{digits[3..6]}.{digits[6..9]}-{digits[9..]}" : value;
    }

    private static void EnsureFonts()
    {
        if (GlobalFontSettings.FontResolver is EmbeddedFontResolver)
            return;
        lock (FontLock)
        {
            if (GlobalFontSettings.FontResolver is not EmbeddedFontResolver)
                GlobalFontSettings.FontResolver = new EmbeddedFontResolver();
        }
    }

    // Fonts ship inside the assembly so the PDF looks the same on Windows and in the Linux container.
    private sealed class EmbeddedFontResolver : IFontResolver
    {
        public FontResolverInfo? ResolveTypeface(string familyName, bool bold, bool italic) =>
            new(bold ? "DejaVuSans-Bold" : "DejaVuSans");

        public byte[]? GetFont(string faceName)
        {
            using var stream = typeof(PrescriptionPdf).Assembly.GetManifestResourceStream($"MedSync.Api.Fonts.{faceName}.ttf");
            if (stream is null)
                return null;
            using var memory = new MemoryStream();
            stream.CopyTo(memory);
            return memory.ToArray();
        }
    }
}
