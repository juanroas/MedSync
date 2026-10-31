using System.Globalization;
using MedSync.Domain;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace MedSync.Api;

// Everything printed on a laudo or attendance declaration (CFM 2.314 art. 13, .agents/rules/medical-documents.md D2).
public sealed record MedicalDocumentPdfData(
    Guid DocumentId,
    MedicalDocumentKind Kind,
    string Title,
    string Body,
    string DoctorName,
    string DoctorCrm,
    string DoctorCrmUf,
    string DoctorSpecialty,
    string? DoctorRqe,
    string DoctorProfessionalAddress,
    string ClinicName,
    string? ClinicLegalName,
    string? ClinicTaxId,
    string? ClinicAddress,
    string? ClinicPhone,
    string? ClinicCity,
    string PatientName,
    string? PatientSocialName,
    string PatientCpf,
    DateOnly PatientBirthDate,
    bool InPerson,
    string? PatientLocation,
    DateTime? AttendanceStartedAtUtc,
    DateTime? AttendanceEndedAtUtc,
    DateTime IssuedAtUtc,
    bool Simulated,
    bool Draft,
    string? PatientGuardian = null);

// Standard layout of the doctor's documents (28/10/2026): the place of care's header, the title centered in bold,
// the patient, the text, place and date, the doctor's signature block. The name of the place of care is the
// watermark of every page; drafts and simulated signatures carry a red "sem validade" mark (rule D4).
public static class MedicalDocumentPdf
{
    private const string FontFamily = "DejaVu Sans";
    private const double Margin = 56;
    private static readonly TimeSpan BrazilOffset = TimeSpan.FromHours(-3);
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

    // Stored as written; the PDF and the page print every title in capitals.
    public const string DeclarationTitle = "Declaração de comparecimento";

    public static PdfDocument Render(MedicalDocumentPdfData data)
    {
        PrescriptionPdf.EnsureFonts();
        var document = new PdfDocument();
        document.Info.Title = data.Title;
        document.Info.Author = data.DoctorName;
        document.Info.Creator = "MedSync";
        var writer = new PageWriter(document, data);

        writer.Header();
        writer.Gap(26);
        writer.Centered(data.Title.ToUpper(PtBr), writer.TitleFont);
        writer.Gap(20);

        // Decreto 8.727/2016: the social name comes first, followed by the civil name.
        writer.Labeled("Paciente", data.PatientSocialName is null ? data.PatientName : $"{data.PatientSocialName} (nome civil: {data.PatientName})");
        writer.Labeled("CPF", $"{FormatCpf(data.PatientCpf)} · Nascimento: {data.PatientBirthDate:dd/MM/yyyy}");
        if (data.PatientGuardian is not null)
            writer.Labeled("Responsável", data.PatientGuardian);
        writer.Labeled("Atendimento", data.InPerson
            ? $"presencial — {data.ClinicAddress ?? data.ClinicName}"
            : "por telemedicina" + (string.IsNullOrWhiteSpace(data.PatientLocation) ? "" : $" — local informado pelo paciente: {data.PatientLocation}"));
        writer.Rule();
        writer.Gap(10);

        if (data.Kind == MedicalDocumentKind.AttendanceDeclaration)
        {
            writer.Paragraph(DeclarationText(data), writer.Reading);
            writer.Gap(12);
            writer.Paragraph(
                "Esta declaração comprova apenas o comparecimento à consulta. Não informa diagnóstico nem afastamento do " +
                "trabalho, que dependem de atestado médico.",
                writer.Body, writer.Muted);
        }
        else
        {
            writer.Paragraph(data.Body, writer.Reading);
        }

        var issued = Local(data.IssuedAtUtc);
        var city = string.IsNullOrWhiteSpace(data.ClinicCity) ? "" : $"{data.ClinicCity}, ";
        writer.Gap(30);
        writer.Paragraph($"{city}{issued.ToString("d 'de' MMMM 'de' yyyy", PtBr)}.", writer.Reading);
        writer.SignatureBlock();
        return document;
    }

    // In the doctor's voice: the doctor signs it, not the platform.
    public static string DeclarationText(MedicalDocumentPdfData data)
    {
        var start = Local(data.AttendanceStartedAtUtc ?? data.IssuedAtUtc);
        var end = Local(data.AttendanceEndedAtUtc ?? data.IssuedAtUtc);
        var person = data.PatientSocialName is null ? data.PatientName : $"{data.PatientSocialName} (nome civil: {data.PatientName})";
        var how = data.InPerson ? $"em consulta presencial em {data.ClinicName}" : "em consulta por telemedicina (atendimento a distância)";
        var identity = data.PatientGuardian is null
            ? $"{person}, CPF {FormatCpf(data.PatientCpf)}"
            : $"{person}, nascido(a) em {data.PatientBirthDate:dd/MM/yyyy}, acompanhado(a) de {data.PatientGuardian}";
        return $"Declaro, para os devidos fins, que {identity}, esteve {how} " +
               $"no dia {start:dd/MM/yyyy}, das {start:HH:mm} às {end:HH:mm} (horário de Brasília), sob os meus cuidados.";
    }

    private static DateTime Local(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(BrazilOffset);

    private static string FormatCpf(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 11 ? $"{digits[..3]}.{digits[3..6]}.{digits[6..9]}-{digits[9..]}" : value;
    }

    private static string FormatCnpj(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 14 ? $"{digits[..2]}.{digits[2..5]}.{digits[5..8]}/{digits[8..12]}-{digits[12..]}" : value;
    }

    // A4 pages that break inside long text; every page gets the watermark and the footer.
    private sealed class PageWriter
    {
        private readonly PdfDocument document;
        private readonly MedicalDocumentPdfData data;
        private PdfPage page = null!;
        private XGraphics graphics = null!;
        private double y;

        public readonly XFont TitleFont = new(FontFamily, 15, XFontStyleEx.Bold);
        public readonly XFont ClinicFont = new(FontFamily, 13, XFontStyleEx.Bold);
        public readonly XFont Strong = new(FontFamily, 10.5, XFontStyleEx.Bold);
        public readonly XFont Body = new(FontFamily, 10, XFontStyleEx.Regular);
        public readonly XFont Reading = new(FontFamily, 11.5, XFontStyleEx.Regular);
        public readonly XFont Small = new(FontFamily, 7.5, XFontStyleEx.Regular);
        public readonly XBrush Ink = XBrushes.Black;
        public readonly XBrush Muted = new XSolidBrush(XColor.FromArgb(90, 100, 110));
        private readonly XPen rulePen = new(XColor.FromArgb(150, 160, 170), 0.6);

        private double Width => page.Width.Point - 2 * Margin;
        private double Bottom => page.Height.Point - Margin - 30;

        public PageWriter(PdfDocument document, MedicalDocumentPdfData data)
        {
            this.document = document;
            this.data = data;
            NewPage();
        }

        private void NewPage()
        {
            if (page is not null)
            {
                Footer();
                graphics.Dispose();
            }
            page = document.AddPage();
            page.Size = PdfSharp.PageSize.A4;
            graphics = XGraphics.FromPdfPage(page);
            Watermarks();
            y = Margin;
            if (document.PageCount > 1)
            {
                graphics.DrawString($"{data.Title} — {data.PatientName} (continuação)", Small, Muted, new XRect(Margin, y, Width, 12), XStringFormats.TopLeft);
                y += 22;
            }
        }

        // The place of care across the page, faint enough to read through; the red mark sits lower so both stay legible.
        private void Watermarks()
        {
            var state = graphics.Save();
            graphics.TranslateTransform(page.Width.Point / 2, page.Height.Point / 2);
            graphics.RotateTransform(-35);
            var size = 46.0;
            var font = new XFont(FontFamily, size, XFontStyleEx.Bold);
            var maxWidth = page.Height.Point * 0.8;
            while (size > 18 && graphics.MeasureString(data.ClinicName, font).Width > maxWidth)
                font = new XFont(FontFamily, size -= 2, XFontStyleEx.Bold);
            graphics.DrawString(data.ClinicName, font, new XSolidBrush(XColor.FromArgb(22, 15, 118, 110)), new XPoint(0, 0), XStringFormats.Center);
            if (data.Draft || data.Simulated)
            {
                var mark = data.Draft ? "RASCUNHO — SEM VALIDADE" : "SIMULAÇÃO — SEM VALIDADE";
                graphics.DrawString(mark, new XFont(FontFamily, 30, XFontStyleEx.Bold), new XSolidBrush(XColor.FromArgb(45, 220, 38, 38)),
                    new XPoint(0, 90), XStringFormats.Center);
            }
            graphics.Restore(state);
        }

        private void Footer()
        {
            var lineY = page.Height.Point - Margin + 2;
            graphics.DrawLine(rulePen, Margin, lineY, Margin + Width, lineY);
            var modality = data.InPerson ? "Emitido em atendimento presencial" : "Emitido em modalidade de telemedicina (Res. CFM 2.314/2022)";
            graphics.DrawString($"{modality} · Documento {data.DocumentId}", Small, Muted, new XRect(Margin, lineY + 4, Width - 50, 12), XStringFormats.TopLeft);
            graphics.DrawString($"Página {document.PageCount}", Small, Muted, new XRect(Margin, lineY + 4, Width, 12), XStringFormats.TopRight);
        }

        public void Header()
        {
            y = PrescriptionPdf.Write(graphics, data.ClinicName, ClinicFont, Ink, Margin, y, Width);
            var company = new List<string>();
            if (!string.IsNullOrWhiteSpace(data.ClinicLegalName) && data.ClinicLegalName != data.ClinicName)
                company.Add(data.ClinicLegalName!);
            if (!string.IsNullOrWhiteSpace(data.ClinicTaxId))
                company.Add($"CNPJ {FormatCnpj(data.ClinicTaxId!)}");
            if (company.Count > 0)
                y = PrescriptionPdf.Write(graphics, string.Join(" · ", company), Small, Muted, Margin, y, Width);
            var contact = new List<string>();
            if (!string.IsNullOrWhiteSpace(data.ClinicAddress))
                contact.Add(data.ClinicAddress!);
            if (!string.IsNullOrWhiteSpace(data.ClinicPhone))
                contact.Add($"Telefone {data.ClinicPhone}");
            if (contact.Count > 0)
                y = PrescriptionPdf.Write(graphics, string.Join(" · ", contact), Small, Muted, Margin, y, Width);
            y += 4;
            y = PrescriptionPdf.Write(graphics, $"{data.DoctorName} · {data.DoctorSpecialty} · {Crm()}", Body, Ink, Margin, y, Width);
            if (data.DoctorProfessionalAddress != data.ClinicAddress && !string.IsNullOrWhiteSpace(data.DoctorProfessionalAddress))
                y = PrescriptionPdf.Write(graphics, $"Endereço profissional: {data.DoctorProfessionalAddress}", Small, Muted, Margin, y, Width);
            Rule();
        }

        private string Crm() =>
            PrescriptionPdf.FormatCrm(data.DoctorCrm, data.DoctorCrmUf) + (string.IsNullOrWhiteSpace(data.DoctorRqe) ? "" : $" · RQE {data.DoctorRqe}");

        public void Gap(double points) => y += points;

        public void Rule()
        {
            y += 6;
            graphics.DrawLine(rulePen, Margin, y, Margin + Width, y);
            y += 6;
        }

        public void Centered(string text, XFont font)
        {
            Ensure(font.GetHeight() * 1.5);
            graphics.DrawString(text, font, Ink, new XRect(Margin, y, Width, font.GetHeight() * 1.4), XStringFormats.TopCenter);
            y += font.GetHeight() * 1.4;
        }

        public void Labeled(string label, string value)
        {
            Ensure(Body.GetHeight() * 1.4);
            var labelText = $"{label}: ";
            var labelWidth = graphics.MeasureString(labelText, Strong).Width;
            graphics.DrawString(labelText, Strong, Ink, new XRect(Margin, y, labelWidth, 14), XStringFormats.TopLeft);
            y = PrescriptionPdf.Write(graphics, value, Body, Ink, Margin + labelWidth, y, Width - labelWidth) + 2;
        }

        // Wraps line by line so a long laudo continues on the next page instead of running off the bottom.
        public void Paragraph(string text, XFont font, XBrush? brush = null)
        {
            var lineHeight = font.GetHeight() * 1.35;
            foreach (var paragraph in text.Replace("\r\n", "\n").Split('\n'))
            {
                if (paragraph.Trim().Length == 0)
                {
                    y += lineHeight * 0.6;
                    continue;
                }
                foreach (var line in Wrap(paragraph, font))
                {
                    Ensure(lineHeight);
                    graphics.DrawString(line, font, brush ?? Ink, new XRect(Margin, y, Width, lineHeight), XStringFormats.TopLeft);
                    y += lineHeight;
                }
            }
        }

        public void SignatureBlock()
        {
            Ensure(110);
            y += 46;
            const double lineWidth = 280;
            var x = Margin + (Width - lineWidth) / 2;
            graphics.DrawLine(rulePen, x, y, x + lineWidth, y);
            y += 4;
            graphics.DrawString(data.DoctorName, Strong, Ink, new XRect(Margin, y, Width, 14), XStringFormats.TopCenter);
            y += 15;
            graphics.DrawString($"{data.DoctorSpecialty} · {Crm()}", Body, Ink, new XRect(Margin, y, Width, 14), XStringFormats.TopCenter);
            y += 18;
            var signedAt = Local(data.IssuedAtUtc).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture);
            var note = data.Draft
                ? "Rascunho: ainda não assinado pelo médico, sem validade."
                : data.Simulated
                    ? "SIMULAÇÃO: assinatura de demonstração, SEM VALIDADE JURÍDICA."
                    : $"Assinado digitalmente com certificado ICP-Brasil em {signedAt} (horário de Brasília). Confira em validar.iti.gov.br.";
            graphics.DrawString(note, Small, Muted, new XRect(Margin, y, Width, 12), XStringFormats.TopCenter);
            y += 14;
            Footer();
            graphics.Dispose();
        }

        private void Ensure(double height)
        {
            if (y + height > Bottom)
                NewPage();
        }

        private List<string> Wrap(string text, XFont font)
        {
            var lines = new List<string>();
            var line = "";
            foreach (var word in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var candidate = line.Length == 0 ? word : $"{line} {word}";
                if (line.Length > 0 && graphics.MeasureString(candidate, font).Width > Width)
                {
                    lines.Add(line);
                    line = word;
                }
                else
                    line = candidate;
            }
            if (line.Length > 0)
                lines.Add(line);
            return lines;
        }
    }
}
