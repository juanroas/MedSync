using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MedSync.Application;
using MedSync.Domain;

namespace MedSync.Api;

public sealed class MercadoPagoPaymentProvider(
    HttpClient http,
    IConfiguration configuration) : IPaymentProvider
{
    private readonly string? _accessToken =
        Environment.GetEnvironmentVariable("MERCADOPAGO_ACCESS_TOKEN")
        ?? configuration["MercadoPago:AccessToken"];
    private readonly string? _webhookSecret =
        Environment.GetEnvironmentVariable("MERCADOPAGO_WEBHOOK_SECRET")
        ?? configuration["MercadoPago:WebhookSecret"];
    private readonly string _frontendUrl =
        (Environment.GetEnvironmentVariable("PUBLIC_APP_URL")
        ?? configuration["PublicAppUrl"]
        ?? "http://localhost:3000").TrimEnd('/');
    private readonly string _apiUrl =
        (Environment.GetEnvironmentVariable("PUBLIC_API_URL")
        ?? configuration["PublicApiUrl"]
        ?? "http://localhost:8080").TrimEnd('/');

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_accessToken);

    public async Task<HostedCheckoutResult> CreateCheckoutAsync(
        Guid paymentId,
        decimal amount,
        string payerEmail,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.mercadopago.com/checkout/preferences");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        request.Headers.Add("X-Idempotency-Key", paymentId.ToString());
        request.Content = JsonContent.Create(new
        {
            items = new[]
            {
                new
                {
                    id = paymentId.ToString(),
                    title = "Consulta médica",
                    quantity = 1,
                    currency_id = "BRL",
                    unit_price = amount
                }
            },
            payer = new { email = payerEmail },
            external_reference = paymentId.ToString(),
            notification_url = $"{_apiUrl}/payments/mercadopago/webhook",
            back_urls = new
            {
                success = $"{_frontendUrl}/consultas?pagamento=sucesso",
                pending = $"{_frontendUrl}/consultas?pagamento=pendente",
                failure = $"{_frontendUrl}/consultas?pagamento=falha"
            },
            auto_return = "approved"
        });

        using var response = await http.SendAsync(request, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException(
                $"O provedor de pagamento rejeitou a cobrança ({(int)response.StatusCode}).");

        using var json = JsonDocument.Parse(body);
        return new HostedCheckoutResult(
            json.RootElement.GetProperty("id").GetString()
                ?? throw new InvalidOperationException("Preferência sem identificador."),
            json.RootElement.GetProperty("init_point").GetString()
                ?? throw new InvalidOperationException("Preferência sem URL de checkout."));
    }

    public async Task<ProviderPaymentResult> GetPaymentAsync(
        string providerPaymentId,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"https://api.mercadopago.com/v1/payments/{Uri.EscapeDataString(providerPaymentId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _accessToken);
        using var response = await http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync(cancellationToken));
        var root = json.RootElement;
        return new ProviderPaymentResult(
            root.GetProperty("id").ToString(),
            root.GetProperty("external_reference").GetString() ?? string.Empty,
            MapStatus(root.GetProperty("status").GetString()));
    }

    public bool ValidateWebhook(string signature, string requestId, string dataId)
    {
        if (string.IsNullOrWhiteSpace(_webhookSecret) ||
            string.IsNullOrWhiteSpace(signature) ||
            string.IsNullOrWhiteSpace(requestId) ||
            string.IsNullOrWhiteSpace(dataId))
            return false;

        var parts = signature.Split(',')
            .Select(x => x.Split('=', 2))
            .Where(x => x.Length == 2)
            .ToDictionary(x => x[0].Trim(), x => x[1].Trim(), StringComparer.OrdinalIgnoreCase);
        if (!parts.TryGetValue("ts", out var timestamp) ||
            !parts.TryGetValue("v1", out var received))
            return false;

        var manifest = $"id:{dataId};request-id:{requestId};ts:{timestamp};";
        var expected = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(_webhookSecret),
            Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(received.ToLowerInvariant()));
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
            throw new InvalidOperationException(
                "Configure MERCADOPAGO_ACCESS_TOKEN para habilitar pagamentos.");
    }

    private static PaymentStatus MapStatus(string? status) => status switch
    {
        "approved" => PaymentStatus.Paid,
        "in_process" or "pending" or "authorized" => PaymentStatus.Processing,
        "refunded" => PaymentStatus.Refunded,
        "charged_back" => PaymentStatus.Chargeback,
        "cancelled" => PaymentStatus.Cancelled,
        _ => PaymentStatus.Failed
    };
}
