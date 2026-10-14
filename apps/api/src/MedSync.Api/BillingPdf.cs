using System.Globalization;
using MedSync.Application;
using MedSync.Domain;

namespace MedSync.Api;

// Invoice (with the Pix data), receipt and financial report of the MedSync monthly fee (14/10/2026).
public static class BillingPdf
{
    private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");
    private static readonly TimeSpan BrazilOffset = TimeSpan.FromHours(-3);

    public static byte[] Invoice(ClinicInvoiceResponse invoice, Clinic clinic, string receiver, DateTime generatedAtUtc)
    {
        var canvas = new ReportPdf.Canvas($"Fatura {invoice.Code}", $"MedSync · fatura {invoice.Code} · gerada em {Local(generatedAtUtc):dd/MM/yyyy HH:mm} (horário de Brasília)");
        canvas.Title($"FATURA {invoice.Code}");
        canvas.Line($"Recebedor: {receiver}", canvas.Strong);
        canvas.Gap(8);
        Customer(canvas, clinic);
        canvas.Section("Cobrança");
        canvas.Table(
            ["Descrição", "Referência", "Vencimento", "Valor"],
            [3, 1.3, 1.1, 1.1],
            [[invoice.Description, ApiEndpoints.ReferenceName(invoice.Reference), invoice.DueDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture), Money(invoice.Amount)]]);
        if (invoice.Status == InvoiceStatus.PaymentInformed && invoice.InformedAt is { } informedAt)
            canvas.Line($"Pagamento informado pela clínica em {Local(informedAt):dd/MM/yyyy HH:mm}: aguardando a confirmação do MedSync.", canvas.Body, canvas.Muted);
        else if (invoice.Overdue)
            canvas.Line("Cobrança em atraso.", canvas.Strong);
        canvas.Gap(10);

        canvas.Section("Pague com Pix");
        if (invoice.PixCode is null)
            canvas.Line("A chave Pix do MedSync ainda não foi configurada. Fale com o suporte MedSync para receber os dados de pagamento.", canvas.Body);
        else
        {
            canvas.Line($"Chave Pix: {invoice.PixKey} · Recebedor: {invoice.PixReceiver} · Valor: {Money(invoice.Amount)}", canvas.Body);
            canvas.Gap(4);
            canvas.Line("Pix copia e cola (cole no aplicativo do banco):", canvas.Strong);
            canvas.Code(invoice.PixCode);
            canvas.Gap(4);
            canvas.Line(
                $"O código {invoice.Code} vai como identificação do pagamento. Depois de pagar, use \"Já paguei\" em Financeiro no MedSync; " +
                "a equipe MedSync confirma assim que o valor entrar na conta e o recibo fica disponível.",
                canvas.Small,
                canvas.Muted);
        }
        return canvas.Finish();
    }

    public static byte[] Receipt(ClinicInvoiceResponse invoice, Clinic clinic, string receiver, DateTime generatedAtUtc)
    {
        var canvas = new ReportPdf.Canvas($"Recibo {invoice.Code}", $"MedSync · recibo {invoice.Code} · emitido em {Local(generatedAtUtc):dd/MM/yyyy HH:mm} (horário de Brasília)");
        canvas.Title($"RECIBO {invoice.Code}");
        canvas.Line($"Valor: {Money(invoice.Amount)}", canvas.Strong);
        canvas.Gap(20);
        var payer = clinic.LegalName ?? clinic.Name;
        var taxId = string.IsNullOrWhiteSpace(clinic.TaxId) ? "" : $", CNPJ {FormatCnpj(clinic.TaxId!)}";
        var paidOn = invoice.PaidOn?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) ?? "—";
        canvas.Paragraph(
            $"Recebemos de {payer}{taxId}, a importância de {Money(invoice.Amount)} ({AmountInWords.Reais(invoice.Amount)}), " +
            $"referente a {invoice.Description} (referência {ApiEndpoints.ReferenceName(invoice.Reference)}), " +
            $"paga em {paidOn} por {MethodLabel(invoice.PaymentMethod)}.");
        if (!string.IsNullOrWhiteSpace(invoice.PaymentNote))
        {
            canvas.Gap(8);
            canvas.Line($"Observação: {invoice.PaymentNote}", canvas.Body, canvas.Muted);
        }
        canvas.Gap(36);
        canvas.Line($"Emitido em {Local(generatedAtUtc).ToString("d 'de' MMMM 'de' yyyy", PtBr)}.", canvas.Body);
        canvas.Gap(56);
        canvas.Signature(receiver, "MedSync");
        return canvas.Finish();
    }

    public static byte[] Report(IReadOnlyList<ClinicInvoiceResponse> invoices, string from, string to, string generatedBy, DateTime generatedAtUtc)
    {
        var canvas = new ReportPdf.Canvas(
            "Relatório financeiro",
            $"MedSync · gerado por {generatedBy} em {Local(generatedAtUtc):dd/MM/yyyy HH:mm} (horário de Brasília)");
        canvas.Title("RELATÓRIO FINANCEIRO");
        canvas.Line($"Mensalidades MedSync · referência {ApiEndpoints.ReferenceName(from)} a {ApiEndpoints.ReferenceName(to)}", canvas.Body, canvas.Muted);
        canvas.Gap(10);

        var active = invoices.Where(x => x.Status != InvoiceStatus.Cancelled).ToList();
        canvas.Section("Resumo");
        canvas.Table(
            ["Lançado", "Recebido", "Pagamento informado", "Em aberto", "Em atraso", "Canceladas"],
            [1, 1, 1.3, 1, 1, 0.9],
            [[
                Money(active.Sum(x => x.Amount)),
                Money(active.Where(x => x.Status == InvoiceStatus.Paid).Sum(x => x.Amount)),
                Money(active.Where(x => x.Status == InvoiceStatus.PaymentInformed).Sum(x => x.Amount)),
                Money(active.Where(x => x.Status == InvoiceStatus.Open).Sum(x => x.Amount)),
                Money(active.Where(x => x.Overdue).Sum(x => x.Amount)),
                invoices.Count(x => x.Status == InvoiceStatus.Cancelled).ToString()
            ]]);
        canvas.Line("Lançado não conta as canceladas. Em atraso é parte do em aberto.", canvas.Small, canvas.Muted);
        canvas.Gap(8);

        if (active.Count > 0)
        {
            canvas.Section("Por clínica");
            canvas.Table(
                ["Clínica", "Lançado", "Recebido", "A receber"],
                [2.6, 1, 1, 1],
                active.GroupBy(x => x.ClinicName)
                    .OrderBy(x => x.Key)
                    .Select(x => new[]
                    {
                        x.Key,
                        Money(x.Sum(i => i.Amount)),
                        Money(x.Where(i => i.Status == InvoiceStatus.Paid).Sum(i => i.Amount)),
                        Money(x.Where(i => i.Status != InvoiceStatus.Paid).Sum(i => i.Amount))
                    })
                    .ToList());
            canvas.Gap(8);
        }

        canvas.Section("Cobranças");
        if (invoices.Count == 0)
            canvas.Line("Nenhuma cobrança no período.", canvas.Body, canvas.Muted);
        else
            canvas.Table(
                ["Fatura", "Clínica", "Referência", "Vencimento", "Valor", "Situação", "Pago em"],
                [1.1, 2, 1.2, 1, 1, 1.3, 0.95],
                invoices.Select(x => new[]
                {
                    x.Code,
                    x.ClinicName,
                    ApiEndpoints.ReferenceName(x.Reference),
                    x.DueDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                    Money(x.Amount),
                    StatusLabel(x),
                    x.PaidOn?.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) ?? "—"
                }).ToList());
        return canvas.Finish();
    }

    private static void Customer(ReportPdf.Canvas canvas, Clinic clinic)
    {
        canvas.Section("Cliente");
        canvas.Line(clinic.LegalName ?? clinic.Name, canvas.Strong);
        var details = new List<string>();
        if (!string.IsNullOrWhiteSpace(clinic.LegalName) && clinic.LegalName != clinic.Name)
            details.Add(clinic.Name);
        if (!string.IsNullOrWhiteSpace(clinic.TaxId))
            details.Add($"CNPJ {FormatCnpj(clinic.TaxId!)}");
        if (details.Count > 0)
            canvas.Line(string.Join(" · ", details), canvas.Body, canvas.Muted);
        if (clinic.FormattedAddress() is { } address)
            canvas.Line(address, canvas.Body, canvas.Muted);
        canvas.Gap(8);
    }

    internal static string StatusLabel(ClinicInvoiceResponse invoice) => invoice.Status switch
    {
        InvoiceStatus.Paid => "Paga",
        InvoiceStatus.PaymentInformed => "Pagamento informado",
        InvoiceStatus.Cancelled => "Cancelada",
        _ => invoice.Overdue ? "Em atraso" : "Em aberto"
    };

    internal static string MethodLabel(InvoicePaymentMethod? method) => method switch
    {
        InvoicePaymentMethod.Pix => "Pix",
        InvoicePaymentMethod.BankTransfer => "transferência bancária",
        InvoicePaymentMethod.Boleto => "boleto",
        InvoicePaymentMethod.Other => "outro meio",
        _ => "—"
    };

    private static string Money(decimal value) => value.ToString("C", PtBr);

    private static DateTime Local(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(BrazilOffset);

    private static string FormatCnpj(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 14 ? $"{digits[..2]}.{digits[2..5]}.{digits[5..8]}/{digits[8..12]}-{digits[12..]}" : value;
    }
}
