using System.Globalization;
using MedSync.Application;
using MedSync.Domain;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace MedSync.Api;

public sealed record DataAccessEntry(DateTime AtUtc, string Actor, string Profile, string Action, string Result, string Place);

// PDFs of the reports. Same fonts and helpers as the prescription; none of them prints clinical content (rule C5).
public static class ReportPdf
{
    private const string FontFamily = "DejaVu Sans";
    private const double Margin = 48;
    private static readonly TimeSpan BrazilOffset = TimeSpan.FromHours(-3);

    public static byte[] Appointments(AppointmentReportResponse report, string generatedBy)
    {
        var canvas = new Canvas(
            "Relatório de atendimentos",
            $"{report.ClinicName} · gerado por {generatedBy} em {Local(report.GeneratedAt):dd/MM/yyyy HH:mm} (horário de Brasília) · sem dados clínicos");
        canvas.Title(report.Scope == "own" ? "MINHA PRODUÇÃO" : "RELATÓRIO DE ATENDIMENTOS");
        canvas.Line(report.ClinicName, canvas.Strong);
        var filters = new List<string> { $"Período: {report.From:dd/MM/yyyy} a {report.To:dd/MM/yyyy}" };
        if (report.DoctorFilter is not null)
            filters.Add($"Médico: {report.DoctorFilter}");
        if (report.ModalityFilter is not null)
            filters.Add($"Modalidade: {(report.ModalityFilter == ConsultationModality.InPerson ? "Presencial" : "Online")}");
        canvas.Line(string.Join(" · ", filters), canvas.Body, canvas.Muted);
        canvas.Gap(10);

        var t = report.Totals;
        canvas.Section("Resumo");
        canvas.Table(
            ["Marcadas", "Realizadas", "Paciente faltou", "Não realizadas", "Canceladas", "A realizar", "Online", "Presencial"],
            [1, 1, 1.2, 1.2, 1, 1, 0.9, 1],
            [[t.Total.ToString(), t.Completed.ToString(), t.NoShow.ToString(), t.NotHeld.ToString(), t.Cancelled.ToString(), t.Upcoming.ToString(), t.Online.ToString(), t.InPerson.ToString()]]);
        canvas.Line("Online e presencial contam as consultas não canceladas. \"Não realizada\": o horário passou e a consulta não foi concluída.", canvas.Small, canvas.Muted);
        canvas.Gap(8);

        if (report.Scope == "clinic" && report.ByDoctor.Count > 0)
        {
            canvas.Section("Por médico");
            canvas.Table(
                ["Médico", "Marcadas", "Realizadas", "Faltou", "Não realiz.", "Canceladas"],
                [2.6, 1, 1, 0.9, 1, 1],
                report.ByDoctor.Select(x => new[]
                {
                    x.DoctorName, x.Totals.Total.ToString(), x.Totals.Completed.ToString(), x.Totals.NoShow.ToString(),
                    x.Totals.NotHeld.ToString(), x.Totals.Cancelled.ToString()
                }).ToList());
            canvas.Gap(8);
        }

        if (report.Prescriptions is { } rx)
        {
            canvas.Section("Receitas emitidas por mim");
            canvas.Table(
                ["Total", "Assinadas no MedSync", "Fora do MedSync / papel", "Rascunhos", "Simples", "Antimicrobiano", "Controle especial"],
                [0.7, 1.3, 1.5, 1.1, 0.9, 1.45, 1.2],
                [[rx.Total.ToString(), rx.Signed.ToString(), rx.OutsideMedSync.ToString(), rx.Drafts.ToString(), rx.Simple.ToString(), rx.Antimicrobial.ToString(), rx.ControlledSpecial.ToString()]]);
            canvas.Gap(8);
        }

        canvas.Section("Consultas do período");
        if (report.Items.Count == 0)
            canvas.Line("Nenhuma consulta no período.", canvas.Body, canvas.Muted);
        else if (report.Scope == "own")
            // The doctor's own report: the doctor column would repeat the same name on every line.
            canvas.Table(
                ["Data", "Hora", "Paciente", "Modalidade", "Situação"],
                [0.95, 0.6, 3.4, 1, 1.2],
                report.Items.Select(x =>
                {
                    var local = Local(x.ScheduledAt);
                    return new[]
                    {
                        local.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                        local.ToString("HH:mm", CultureInfo.InvariantCulture),
                        x.PatientName,
                        x.Modality == ConsultationModality.InPerson ? "Presencial" : "Online",
                        ApiEndpoints.ReportOutcomeLabel(x.Outcome)
                    };
                }).ToList());
        else
            canvas.Table(
                ["Data", "Hora", "Paciente", "Médico", "Modalidade", "Situação"],
                [0.95, 0.6, 2.2, 2.2, 1, 1.2],
                report.Items.Select(x =>
                {
                    var local = Local(x.ScheduledAt);
                    return new[]
                    {
                        local.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                        local.ToString("HH:mm", CultureInfo.InvariantCulture),
                        x.PatientName,
                        x.DoctorName,
                        x.Modality == ConsultationModality.InPerson ? "Presencial" : "Online",
                        ApiEndpoints.ReportOutcomeLabel(x.Outcome)
                    };
                }).ToList());
        if (report.ItemsTruncated)
            canvas.Line($"Lista limitada às primeiras {report.Items.Count} consultas; reduza o período para ver todas.", canvas.Small, canvas.Muted);
        return canvas.Finish();
    }

    public static byte[] DataAccess(string patientName, string patientCpf, IReadOnlyList<DataAccessEntry> entries, string requestedBy, DateTime generatedAtUtc)
    {
        var canvas = new Canvas(
            "Relatório de acessos aos dados pessoais",
            $"Gerado em {Local(generatedAtUtc):dd/MM/yyyy HH:mm} (horário de Brasília) a pedido de {requestedBy} · MedSync");
        canvas.Title("RELATÓRIO DE ACESSOS AOS DADOS PESSOAIS");
        canvas.Line($"Titular: {patientName} · CPF {MaskCpf(patientCpf)}", canvas.Strong);
        canvas.Line(
            "Lei Geral de Proteção de Dados (Lei 13.709/2018, art. 18 e 19): lista quem consultou, criou ou alterou dados " +
            "deste titular no MedSync, quando e com qual resultado. Não mostra o conteúdo do prontuário.",
            canvas.Body,
            canvas.Muted);
        if (requestedBy == "o próprio titular")
            canvas.Line("As ações feitas pelo próprio titular não aparecem.", canvas.Small, canvas.Muted);
        canvas.Gap(10);

        if (entries.Count == 0)
            canvas.Line("Nenhum acesso registrado por outras pessoas.", canvas.Body, canvas.Muted);
        else
            canvas.Table(
                ["Data e hora", "Quem", "Perfil", "O que fez", "Resultado", "Local"],
                [1.45, 1.6, 1.3, 2.5, 1.05, 1.3],
                entries.Select(x => new[]
                {
                    Local(x.AtUtc).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
                    x.Actor,
                    x.Profile,
                    x.Action,
                    x.Result,
                    x.Place
                }).ToList());
        canvas.Gap(10);
        canvas.Line(
            "Dúvidas ou pedidos sobre os seus dados: Ajuda → \"Pedido sobre meus dados\" no MedSync, que vai para o DPO.",
            canvas.Small,
            canvas.Muted);
        return canvas.Finish();
    }

    private static DateTime Local(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(BrazilOffset);

    private static string MaskCpf(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 11 ? $"***.{digits[3..6]}.{digits[6..9]}-**" : "***";
    }

    // A4 pages with a running footer; tables break across pages and repeat their header.
    internal sealed class Canvas
    {
        private readonly PdfDocument document = new();
        private readonly string footer;
        private PdfPage page = null!;
        private XGraphics graphics = null!;
        private double y;

        public readonly XFont TitleFont = new(FontFamily, 14, XFontStyleEx.Bold);
        public readonly XFont SectionFont = new(FontFamily, 10.5, XFontStyleEx.Bold);
        public readonly XFont Strong = new(FontFamily, 10, XFontStyleEx.Bold);
        public readonly XFont Body = new(FontFamily, 10, XFontStyleEx.Regular);
        public readonly XFont Cell = new(FontFamily, 8, XFontStyleEx.Regular);
        public readonly XFont CellStrong = new(FontFamily, 8, XFontStyleEx.Bold);
        public readonly XFont Small = new(FontFamily, 7.5, XFontStyleEx.Regular);
        public readonly XBrush Ink = XBrushes.Black;
        public readonly XBrush Muted = new XSolidBrush(XColor.FromArgb(90, 100, 110));
        private readonly XBrush headerFill = new XSolidBrush(XColor.FromArgb(236, 246, 244));
        private readonly XPen gridPen = new(XColor.FromArgb(210, 216, 222), 0.5);

        private double Width => page.Width.Point - 2 * Margin;
        private double Bottom => page.Height.Point - Margin - 18;

        // The font resolver has to be in place before the font fields above are created.
        static Canvas() => PrescriptionPdf.EnsureFonts();

        public Canvas(string title, string footer)
        {
            this.footer = footer;
            document.Info.Title = title;
            document.Info.Creator = "MedSync";
            NewPage();
        }

        private void NewPage()
        {
            if (page is not null)
            {
                DrawFooter();
                graphics.Dispose();
            }
            page = document.AddPage();
            page.Size = PdfSharp.PageSize.A4;
            graphics = XGraphics.FromPdfPage(page);
            y = Margin;
        }

        private void DrawFooter()
        {
            var lineY = page.Height.Point - Margin + 2;
            graphics.DrawLine(gridPen, Margin, lineY, Margin + Width, lineY);
            graphics.DrawString(footer, Small, Muted, new XRect(Margin, lineY + 4, Width - 60, 12), XStringFormats.TopLeft);
            graphics.DrawString($"Página {document.PageCount}", Small, Muted, new XRect(Margin, lineY + 4, Width, 12), XStringFormats.TopRight);
        }

        private void Ensure(double height)
        {
            if (y + height > Bottom)
                NewPage();
        }

        public void Title(string text)
        {
            Ensure(24);
            graphics.DrawString(text, TitleFont, Ink, new XRect(Margin, y, Width, 20), XStringFormats.TopLeft);
            y += 24;
        }

        public void Section(string text)
        {
            Ensure(40);
            graphics.DrawString(text, SectionFont, Ink, new XRect(Margin, y, Width, 16), XStringFormats.TopLeft);
            y += 18;
        }

        public void Line(string text, XFont font, XBrush? brush = null)
        {
            Ensure(font.GetHeight() * 1.3);
            y = PrescriptionPdf.Write(graphics, text, font, brush ?? Ink, Margin, y, Width);
        }

        public void Paragraph(string text, XBrush? brush = null)
        {
            var font = new XFont(FontFamily, 11.5, XFontStyleEx.Regular);
            Ensure(font.GetHeight() * 4);
            y = PrescriptionPdf.Write(graphics, text, font, brush ?? Ink, Margin, y, Width);
        }

        public void Gap(double points) => y += points;

        // Long text without spaces (the Pix code) breaks by character.
        public void Code(string text)
        {
            var line = "";
            foreach (var character in text)
            {
                if (graphics.MeasureString(line + character, Cell).Width > Width)
                {
                    Line(line, Cell);
                    line = "";
                }
                line += character;
            }
            if (line.Length > 0)
                Line(line, Cell);
        }

        public void Rule()
        {
            y += 6;
            graphics.DrawLine(XPens.Gray, Margin, y, Margin + Width, y);
            y += 6;
        }

        public void Signature(string name, string caption)
        {
            Ensure(40);
            var lineWidth = 260;
            var x = Margin + (Width - lineWidth) / 2;
            graphics.DrawLine(XPens.Gray, x, y, x + lineWidth, y);
            y += 4;
            graphics.DrawString(name, Body, Ink, new XRect(Margin, y, Width, 14), XStringFormats.TopCenter);
            y += 14;
            graphics.DrawString(caption, Small, Muted, new XRect(Margin, y, Width, 12), XStringFormats.TopCenter);
            y += 14;
        }

        // Cells wrap instead of cutting text (a date with its time, a long action); a row grows to its tallest cell
        // and moves to the next page whole, repeating the header there.
        public void Table(IReadOnlyList<string> headers, IReadOnlyList<double> weights, IReadOnlyList<string[]> rows)
        {
            var total = weights.Sum();
            var widths = weights.Select(w => Width * w / total).ToArray();
            void Header()
            {
                var height = RowHeight(headers, widths, CellStrong);
                Ensure(height * 2);
                graphics.DrawRectangle(headerFill, Margin, y, Width, height);
                DrawRow(headers, widths, CellStrong, height);
            }

            Header();
            foreach (var row in rows)
            {
                var height = RowHeight(row, widths, Cell);
                if (y + height > Bottom)
                {
                    NewPage();
                    Header();
                }
                DrawRow(row, widths, Cell, height);
            }
            y += 4;
        }

        private const double CellPadding = 3;
        private const int MaxCellLines = 3;

        private double LineHeight(XFont font) => font.GetHeight() * 1.2;

        private double RowHeight(IReadOnlyList<string> cells, double[] widths, XFont font) =>
            widths.Select((width, i) => Wrap(i < cells.Count ? cells[i] : "", font, width - 2 * CellPadding).Count).Max()
            * LineHeight(font) + 2 * CellPadding;

        private void DrawRow(IReadOnlyList<string> cells, double[] widths, XFont font, double height)
        {
            var x = Margin;
            for (var i = 0; i < widths.Length; i++)
            {
                var lineY = y + CellPadding;
                foreach (var line in Wrap(i < cells.Count ? cells[i] : "", font, widths[i] - 2 * CellPadding))
                {
                    graphics.DrawString(line, font, Ink, new XRect(x + CellPadding, lineY, widths[i] - 2 * CellPadding, LineHeight(font)), XStringFormats.TopLeft);
                    lineY += LineHeight(font);
                }
                x += widths[i];
            }
            graphics.DrawLine(gridPen, Margin, y + height, Margin + Width, y + height);
            y += height;
        }

        private List<string> Wrap(string text, XFont font, double width)
        {
            var lines = new List<string>();
            var line = "";
            foreach (var word in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var candidate = line.Length == 0 ? word : $"{line} {word}";
                if (line.Length > 0 && graphics.MeasureString(candidate, font).Width > width)
                {
                    lines.Add(line);
                    line = word;
                }
                else
                    line = candidate;
            }
            lines.Add(line);
            for (var i = 0; i < lines.Count; i++)
                lines[i] = Fit(lines[i], font, width);
            if (lines.Count > MaxCellLines)
                lines = [.. lines.Take(MaxCellLines - 1), Fit(string.Join(' ', lines.Skip(MaxCellLines - 1)), font, width)];
            return lines;
        }

        private string Fit(string text, XFont font, double width)
        {
            if (graphics.MeasureString(text, font).Width <= width)
                return text;
            var cut = text;
            while (cut.Length > 1 && graphics.MeasureString(cut + "…", font).Width > width)
                cut = cut[..^1];
            return cut + "…";
        }

        public byte[] Finish()
        {
            DrawFooter();
            graphics.Dispose();
            using var output = new MemoryStream();
            document.Save(output, false);
            return output.ToArray();
        }
    }
}
