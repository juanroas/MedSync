using System.Text;
using MedSync.Api;
using MedSync.Application;
using MedSync.Domain;
using Xunit;

namespace MedSync.Api.Tests;

// Monthly fee charged by hand: the Pix "copia e cola", the amount in words of the receipt and the three PDFs.
public class BillingTests
{
    [Fact]
    public void Crc16_matches_the_ccitt_false_check_value()
    {
        // CRC-16/CCITT-FALSE of "123456789" is 0x29B1 (the value the Pix standard uses).
        Assert.Equal(0x29B1, PixPayload.Crc16("123456789"));
    }

    [Fact]
    public void Pix_payload_has_key_amount_identifier_and_valid_crc()
    {
        var payload = PixPayload.Build("financeiro@medsync.dev", "MedSync Tecnologia em Saúde", "São Paulo", 199.9m, "MS5BD57FF1");
        Assert.StartsWith("000201", payload);
        Assert.Contains("0014br.gov.bcb.pix0122financeiro@medsync.dev", payload);
        Assert.Contains("5406199.90", payload);
        Assert.Contains("5303986", payload);
        Assert.Contains("5925MEDSYNC TECNOLOGIA EM SA", payload);
        Assert.Contains("6009SAO PAULO", payload);
        Assert.Contains("62140510MS5BD57FF1", payload);
        var body = payload[..^4];
        Assert.EndsWith("6304", body);
        Assert.Equal(PixPayload.Crc16(body).ToString("X4"), payload[^4..]);
    }

    [Theory]
    [InlineData("199.90", "cento e noventa e nove reais e noventa centavos")]
    [InlineData("1", "um real")]
    [InlineData("0.01", "um centavo")]
    [InlineData("100", "cem reais")]
    [InlineData("21", "vinte e um reais")]
    [InlineData("1000", "mil reais")]
    [InlineData("1100", "mil e cem reais")]
    [InlineData("1250.50", "mil duzentos e cinquenta reais e cinquenta centavos")]
    [InlineData("2000000", "dois milhões de reais")]
    public void Amount_in_words(string amount, string expected)
    {
        Assert.Equal(expected, AmountInWords.Reais(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)));
    }

    [Fact]
    public void Billing_pdfs_render()
    {
        var clinic = new Clinic { Name = "Clínica Demo", Slug = "demo", LegalName = "Clínica Demo Ltda", TaxId = "12345678000190" };
        var open = Invoice(InvoiceStatus.Open, "00020126...6304ABCD");
        var paid = Invoice(InvoiceStatus.Paid, null) with { PaidOn = new DateOnly(2026, 10, 12), PaymentMethod = InvoicePaymentMethod.Pix };
        var pdfs = new[]
        {
            BillingPdf.Invoice(open, clinic, "MedSync", DateTime.UtcNow),
            BillingPdf.Invoice(open with { PixCode = null, PixKey = null }, clinic, "MedSync", DateTime.UtcNow),
            BillingPdf.Receipt(paid, clinic, "MedSync", DateTime.UtcNow),
            BillingPdf.Report([open, paid], "2026-01", "2026-10", "Suporte MedSync", DateTime.UtcNow),
        };
        foreach (var pdf in pdfs)
            Assert.Equal("%PDF", Encoding.ASCII.GetString(pdf[..4]));
    }

    private static ClinicInvoiceResponse Invoice(InvoiceStatus status, string? pixCode) => new(
        Guid.NewGuid(), "MS5BD57FF1", Guid.NewGuid(), "Clínica Demo", false, "2026-10", "Mensalidade MedSync — outubro/2026",
        199.9m, new DateOnly(2026, 10, 20), status, false, DateTime.UtcNow, null, null, null, null, null, null, null,
        pixCode, pixCode is null ? null : "financeiro@medsync.dev", pixCode is null ? null : "MedSync");
}
