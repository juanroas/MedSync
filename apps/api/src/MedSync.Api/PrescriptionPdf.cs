using System.Globalization;
using MedSync.Domain;
using MedSync.Application;
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
    string? DoctorRqe,
    string DoctorProfessionalAddress,
    string ClinicName,
    string PatientName,
    string PatientCpf,
    string PatientLocation,
    string? Notes,
    DateTime IssuedAtUtc,
    IReadOnlyList<PrescriptionItem> Items,
    bool Simulated = false,
    SpecialPrescriptionIdentification? Special = null,
    bool InPerson = false,
    // Issued outside the MedSync signature: replaces the "signed with ICP-Brasil" line.
    string? SignatureNote = null);

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

        // Antimicrobial (RDC Anvisa 471/2021) and controlled (Portaria 344/1998) prescriptions: two copies on the
        // "Receita de Controle Especial" model, with blank buyer and supplier boxes the pharmacy fills in.
        if (data.Kind is PrescriptionKind.Antimicrobial or PrescriptionKind.ControlledSpecial)
        {
            foreach (var copy in new[] { "1ª via — Retenção da Farmácia ou Drogaria", "2ª via — Orientação ao Paciente" })
                RenderSpecialPage(document.AddPage(), data, copy);
            return document;
        }

        RenderPage(document.AddPage(), data, null);
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
        y = Write(graphics, $"{data.DoctorSpecialty} · {FormatCrm(data.DoctorCrm, data.DoctorCrmUf)}" +
            (string.IsNullOrWhiteSpace(data.DoctorRqe) ? "" : $" · RQE {data.DoctorRqe}"), body, muted, Margin, y, width);
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
        y = Write(graphics, data.InPerson
            ? $"Consulta presencial: {data.PatientLocation}"
            : $"Local informado pelo paciente: {data.PatientLocation}", body, ink, Margin, y, width) + 16;

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
        y = Write(graphics, data.InPerson
            ? "Emitida em consulta presencial."
            : "Emitida em modalidade de telemedicina (Res. CFM 2.314/2022).", small, muted, Margin, y, width);
        var dateLine = $"Data e hora: {issuedAt.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture)} (horário de Brasília)";
        if (data.Kind == PrescriptionKind.Antimicrobial)
            dateLine += " · Validade: 10 dias a partir da emissão (RDC Anvisa 471/2021).";
        y = Write(graphics, dateLine, small, muted, Margin, y, width);
        y = Write(graphics, data.SignatureNote ?? (data.Simulated
            ? "SIMULAÇÃO: assinatura de demonstração, SEM VALIDADE JURÍDICA. Não use em farmácia."
            : "Assinada digitalmente com certificado ICP-Brasil. Confira em validar.iti.gov.br."), small, muted, Margin, y, width);
        Write(graphics, $"Documento {data.PrescriptionId}", small, muted, Margin, y, width);
    }

    private static void RenderSpecialPage(PdfPage page, PrescriptionPdfData data, string copy)
    {
        page.Size = PdfSharp.PageSize.A4;
        using var graphics = XGraphics.FromPdfPage(page);
        var width = page.Width.Point - 2 * Margin;
        var left = Margin;
        var title = new XFont(FontFamily, 14, XFontStyleEx.Bold);
        var boxTitle = new XFont(FontFamily, 9.5, XFontStyleEx.Bold);
        var strong = new XFont(FontFamily, 10, XFontStyleEx.Bold);
        var body = new XFont(FontFamily, 9.5, XFontStyleEx.Regular);
        var small = new XFont(FontFamily, 7.5, XFontStyleEx.Regular);
        var ink = XBrushes.Black;
        var muted = new XSolidBrush(XColor.FromArgb(90, 100, 110));
        var line = new XPen(XColor.FromArgb(70, 80, 90), 0.8);
        var special = data.Special;
        var y = Margin - 16;
        if (data.Simulated)
            DrawSimulationWatermark(graphics, page);

        // Header: issuing unit and the generator line.
        y = Write(graphics, special?.ClinicName ?? data.ClinicName, title, ink, left, y, width);
        if (!string.IsNullOrWhiteSpace(special?.ClinicLegalName))
            y = Write(graphics, special.ClinicLegalName!, small, muted, left, y, width);
        graphics.DrawString($"Emitido por {data.DoctorName} | MedSync", small, muted, new XRect(left, y, width, 10), XStringFormats.TopRight);
        y += 12;
        graphics.DrawLine(line, left, y, left + width, y);
        y += 8;
        graphics.DrawString("Receita de Controle Especial", title, ink, new XRect(left, y, width, 18), XStringFormats.TopCenter);
        y += 20;
        graphics.DrawString(copy, strong, ink, new XRect(left, y, width, 14), XStringFormats.TopRight);
        y += 20;

        // Issuer box.
        var issuer = new List<string>
        {
            $"Unidade: {special?.ClinicName ?? data.ClinicName}" +
                (string.IsNullOrWhiteSpace(special?.ClinicCnes) ? "" : $"    CNES: {special.ClinicCnes}") +
                (string.IsNullOrWhiteSpace(special?.ClinicTaxId) ? "" : $"    CNPJ: {FormatCnpj(special.ClinicTaxId!)}"),
            $"End.: {special?.ClinicAddress ?? data.DoctorProfessionalAddress}",
            $"Telefone: {special?.ClinicPhone ?? "—"}",
            $"Médico: {data.DoctorName} · {FormatCrm(data.DoctorCrm, data.DoctorCrmUf)}" +
                (string.IsNullOrWhiteSpace(data.DoctorRqe) ? "" : $" · RQE {data.DoctorRqe}"),
        };
        y = DrawBox(graphics, "IDENTIFICAÇÃO DO EMITENTE", issuer, boxTitle, body, line, left, y, width) + 12;

        // Patient.
        y = Write(graphics, "Dados do Paciente", strong, ink, left, y, width);
        var issuedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(data.IssuedAtUtc, DateTimeKind.Utc), BrazilTime);
        var patientLines = new List<string> { $"Nome: {data.PatientName}" };
        if (!string.IsNullOrWhiteSpace(special?.PatientSocialName))
            patientLines.Add($"Nome social: {special.PatientSocialName}");
        patientLines.Add($"CPF: {FormatCpf(data.PatientCpf)}");
        patientLines.Add($"Nome da mãe: {(string.IsNullOrWhiteSpace(special?.PatientMotherName) ? "não declarado" : special.PatientMotherName)}");
        if (special is not null)
        {
            var birth = special.PatientBirthDate;
            var age = issuedAt.Year - birth.Year - (DateOnly.FromDateTime(issuedAt) < birth.AddYears(issuedAt.Year - birth.Year) ? 1 : 0);
            var sex = special.PatientSex switch { "F" => "Feminino", "M" => "Masculino", _ => "não informado" };
            patientLines.Add($"Nascimento: {birth:dd/MM/yyyy} · Idade: {age} anos · Sexo: {sex}");
            patientLines.Add($"Endereço: {special.PatientAddress ?? "—"}");
        }
        foreach (var text in patientLines)
            y = Write(graphics, text, body, ink, left, y, width);
        y += 6;
        graphics.DrawLine(line, left, y, left + width, y);
        y += 8;

        // Prescription.
        foreach (var item in data.Items.OrderBy(x => x.Position))
        {
            var name = item.MedicationName + (item.Dosage is null ? "" : $" {item.Dosage}");
            if (!string.IsNullOrWhiteSpace(item.Route))
                graphics.DrawString($"VIA {item.Route!.ToUpperInvariant()}", strong, ink, new XRect(left, y, width, 14), XStringFormats.TopRight);
            y = Write(graphics, name, strong, ink, left, y, width - 120);
            y = Write(graphics, $"Posologia: {item.Instructions}" + (item.ContinuousUse ? " (uso contínuo)" : ""), body, ink, left, y, width);
            y = Write(graphics, $"Quantidade: {item.Quantity ?? "—"}", body, ink, left, y, width) + 8;
        }
        if (!string.IsNullOrWhiteSpace(data.Notes))
            y = Write(graphics, $"Orientações: {data.Notes}", body, ink, left, y, width) + 6;

        // Signature and date, then the pharmacy boxes at the bottom of the page.
        var boxesTop = page.Height.Point - Margin - 150;
        var signatureY = Math.Max(y + 30, boxesTop - 56);
        graphics.DrawLine(line, left, signatureY, left + 260, signatureY);
        Write(graphics, data.DoctorName.ToUpperInvariant(), small, ink, left, signatureY + 3, 260);
        Write(graphics, FormatCrm(data.DoctorCrm, data.DoctorCrmUf), small, ink, left, signatureY + 13, 260);
        graphics.DrawString($"Data: {issuedAt:dd/MM/yyyy}", strong, ink, new XRect(left, signatureY + 3, width, 14), XStringFormats.TopRight);

        var buyerWidth = width * 0.56;
        DrawBox(graphics, "IDENTIFICAÇÃO DO COMPRADOR",
            ["Nome:", "CPF ou Passaporte (estrangeiro):", "End.:", "Cidade:                                        UF:", "Telefone:"],
            boxTitle, body, line, left, boxesTop, buyerWidth, ruled: true);
        var supplierLeft = left + buyerWidth + 8;
        var supplierWidth = width - buyerWidth - 8;
        var supplierBottom = DrawBox(graphics, "IDENTIFICAÇÃO DO FORNECEDOR", ["", "", "", ""], boxTitle, body, line, supplierLeft, boxesTop, supplierWidth);
        graphics.DrawString("Data: ____/____/______", small, muted, new XRect(supplierLeft + 8, supplierBottom - 52, supplierWidth - 16, 10), XStringFormats.TopRight);
        graphics.DrawLine(line, supplierLeft + 8, supplierBottom - 22, supplierLeft + supplierWidth - 8, supplierBottom - 22);
        graphics.DrawString("Assinatura do farmacêutico", small, muted, new XRect(supplierLeft + 8, supplierBottom - 19, supplierWidth - 16, 10), XStringFormats.TopCenter);

        // Footer.
        var validity = data.Kind == PrescriptionKind.Antimicrobial
            ? "Validade: 10 dias a partir da emissão (RDC Anvisa 471/2021)."
            : "Validade: 30 dias a partir da emissão (Portaria SVS/MS 344/1998).";
        var footerY = page.Height.Point - Margin + 8;
        var modality = data.InPerson ? "Emitida em consulta presencial" : "Emitida em modalidade de telemedicina (Res. CFM 2.314/2022)";
        footerY = Write(graphics, $"{modality} em {issuedAt:dd/MM/yyyy HH:mm} (Brasília). {validity}", small, muted, left, footerY, width);
        Write(graphics, (data.SignatureNote ?? (data.Simulated
            ? "SIMULAÇÃO: assinatura de demonstração, SEM VALIDADE JURÍDICA. Não use em farmácia."
            : "Assinada digitalmente com certificado ICP-Brasil. Confira em validar.iti.gov.br.")) + $" Documento {data.PrescriptionId}", small, muted, left, footerY, width);
    }

    // A titled box with one text line per row; ruled boxes get a line under each row for handwriting.
    private static double DrawBox(
        XGraphics graphics, string heading, IReadOnlyList<string> rows, XFont headingFont, XFont font, XPen pen,
        double x, double y, double width, bool ruled = false)
    {
        var rowHeight = font.GetHeight() * 1.55;
        var headingHeight = headingFont.GetHeight() * 1.6;
        var height = headingHeight + rows.Count * rowHeight + 4;
        graphics.DrawRectangle(pen, x, y, width, height);
        graphics.DrawString(heading, headingFont, XBrushes.Black, new XRect(x, y + 3, width, headingHeight), XStringFormats.TopCenter);
        graphics.DrawLine(pen, x, y + headingHeight, x + width, y + headingHeight);
        var rowY = y + headingHeight + 2;
        foreach (var row in rows)
        {
            graphics.DrawString(row, font, XBrushes.Black, new XRect(x + 6, rowY + 2, width - 12, rowHeight), XStringFormats.TopLeft);
            rowY += rowHeight;
            if (ruled)
                graphics.DrawLine(pen, x, rowY, x + width, rowY);
        }
        return y + height;
    }

    private static string FormatCnpj(string value)
    {
        var d = new string(value.Where(char.IsDigit).ToArray());
        return d.Length == 14 ? $"{d[..2]}.{d[2..5]}.{d[5..8]}/{d[8..12]}-{d[12..]}" : value;
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
