using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;

namespace MedSync.Api;

// Cloud-certificate signing through IntegraICP (Valid): one API over VIDaaS, BirdID, SafeID, SerproID, RemoteID.
// Flow from Valid's public FAQ (docs/07-security/ASSINATURA_DIGITAL_ICP.md). The full API reference is only
// published to channel holders, so every field name used here is marked CONFIRMAR and lives in this class only.
public sealed class IntegraIcpSignatureProvider(IHttpClientFactory httpClientFactory)
{
    private static string? BaseUrl => Environment.GetEnvironmentVariable("INTEGRAICP_BASE_URL")?.TrimEnd('/');
    private static string? ChannelId => Environment.GetEnvironmentVariable("INTEGRAICP_CHANNEL_ID");
    private static string? CallbackUrl => Environment.GetEnvironmentVariable("INTEGRAICP_CALLBACK_URL");

    public static bool IsConfigured =>
        !string.IsNullOrWhiteSpace(BaseUrl) &&
        !string.IsNullOrWhiteSpace(ChannelId) &&
        !string.IsNullOrWhiteSpace(CallbackUrl);

    public static (string Verifier, string Challenge) CreatePkcePair()
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(32));
        var challenge = Base64Url(SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(verifier)));
        return (verifier, challenge);
    }

    // Step 1: where the doctor's browser goes to approve the signature in the certificate app.
    // CONFIRMAR: parameter names (channelId, secret_data, callback_uri, autostart) and whether state is echoed back.
    public string BuildAuthorizationUrl(string challenge, string state)
    {
        var callback = $"{CallbackUrl}?state={Uri.EscapeDataString(state)}";
        return $"{BaseUrl}/authentications?channelId={Uri.EscapeDataString(ChannelId!)}" +
               $"&secret_data={Uri.EscapeDataString(challenge)}" +
               $"&callback_uri={Uri.EscapeDataString(callback)}" +
               "&autostart=true";
    }

    // Steps 4–5: exchange the credential for a signer bound to the doctor's certificate session.
    public ICmsDigestSigner CreateSigner(string credentialId, string verifier) =>
        new CredentialSigner(httpClientFactory.CreateClient(nameof(IntegraIcpSignatureProvider)), credentialId, verifier);

    private sealed class CredentialSigner(HttpClient http, string credentialId, string verifier) : ICmsDigestSigner
    {
        public string CertificateName { get; private set; } = "Certificado em nuvem ICP-Brasil";

        public async Task<byte[]> SignDigestAsync(byte[] sha256Digest, CancellationToken cancellationToken)
        {
            // CONFIRMAR: credential lookup (GET /credentials/{id}?secret_data=verifier) and what it returns.
            using var credential = await http.GetAsync(
                $"{BaseUrl}/credentials/{Uri.EscapeDataString(credentialId)}?secret_data={Uri.EscapeDataString(verifier)}",
                cancellationToken);
            await EnsureSuccessAsync(credential, "credencial", cancellationToken);

            // CONFIRMAR: body of POST /signatures (contentDigest = SHA-256 Base64, format CMS) and the response field.
            using var response = await http.PostAsJsonAsync(
                $"{BaseUrl}/signatures",
                new
                {
                    channelId = ChannelId,
                    credentialId,
                    secret_data = verifier,
                    format = "CMS",
                    contents = new[] { new { contentDigest = Convert.ToBase64String(sha256Digest) } }
                },
                cancellationToken);
            await EnsureSuccessAsync(response, "assinatura", cancellationToken);

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var signature = FindSignature(json.RootElement)
                ?? throw new InvalidOperationException("Resposta do IntegraICP sem a assinatura esperada (confirmar o contrato).");
            return Convert.FromBase64String(signature);
        }

        // CONFIRMAR: exact response shape; accepts {"signature": "..."} or {"signatures":[{"signature": "..."}]}.
        private static string? FindSignature(JsonElement root)
        {
            if (root.TryGetProperty("signature", out var single) && single.ValueKind == JsonValueKind.String)
                return single.GetString();
            if (root.TryGetProperty("signatures", out var list) && list.ValueKind == JsonValueKind.Array &&
                list.GetArrayLength() > 0 && list[0].TryGetProperty("signature", out var first))
                return first.GetString();
            return null;
        }

        private static async Task EnsureSuccessAsync(HttpResponseMessage response, string step, CancellationToken cancellationToken)
        {
            if (response.IsSuccessStatusCode)
                return;
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(
                $"IntegraICP recusou a {step} ({(int)response.StatusCode}): {body[..Math.Min(body.Length, 300)]}");
        }
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
