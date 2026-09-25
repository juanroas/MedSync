using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Distributed;
using PdfSharp.Pdf.Signatures;

namespace MedSync.Api;

// A doctor's approval in the certificate app, valid for a while. It holds no password, PIN or key: only the
// provider's temporary credential, which works through our channel and expires on its own.
public sealed record SigningSession(
    string Provider,
    string CredentialId,
    string Verifier,
    DateTime ExpiresAtUtc,
    bool Simulated);

public interface ICloudSignatureProvider
{
    string Name { get; }
    bool Simulated { get; }
    string BuildAuthorizationUrl(string challenge, string state, TimeSpan lifetime);
    IDigitalSigner CreatePdfSigner(SigningSession session, CancellationToken cancellationToken);
}

// SIGNATURE_PROVIDER picks the provider: "integraicp" (real, needs the Valid channel) or "simulator"
// (demonstration only, every document marked as having no legal validity). Unset = signing unavailable.
public sealed class SignatureProviderAccessor(IServiceProvider services)
{
    public ICloudSignatureProvider? Current { get; } =
        (Environment.GetEnvironmentVariable("SIGNATURE_PROVIDER") ?? (IntegraIcpSignatureProvider.IsConfigured ? "integraicp" : ""))
            .Trim().ToLowerInvariant() switch
        {
            "integraicp" when IntegraIcpSignatureProvider.IsConfigured => services.GetRequiredService<IntegraIcpSignatureProvider>(),
            "simulator" => services.GetRequiredService<SimulatedSignatureProvider>(),
            _ => null
        };
}

// Stand-in for the certificate app until the Valid integration exists. Approval happens on a MedSync page that
// says it is a simulator; the PDF is signed with a throwaway self-signed certificate and watermarked.
public sealed class SimulatedSignatureProvider : ICloudSignatureProvider
{
    private readonly Lazy<X509Certificate2> certificate = new(CreateCertificate);

    public string Name => "simulator";
    public bool Simulated => true;

    public string BuildAuthorizationUrl(string challenge, string state, TimeSpan lifetime)
    {
        var frontend = (Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0].TrimEnd('/');
        return $"{frontend}/assinatura/simulador?state={Uri.EscapeDataString(state)}&horas={(int)lifetime.TotalHours}";
    }

    public IDigitalSigner CreatePdfSigner(SigningSession session, CancellationToken cancellationToken) =>
        new PdfSharpDefaultSigner(certificate.Value, PdfMessageDigestType.SHA256);

    private static X509Certificate2 CreateCertificate()
    {
        using var key = RSA.Create(2048);
        var request = new CertificateRequest(
            "CN=SIMULADOR MedSync - SEM VALIDADE JURIDICA, O=MedSync", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var created = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddYears(1));
        return X509CertificateLoader.LoadPkcs12(created.Export(X509ContentType.Pkcs12), null);
    }
}

// Keeps each doctor's signing session on the server only: encrypted, with the provider's expiry, never sent to
// the browser, removed on logout or when the doctor ends it.
public sealed class SigningSessionStore(IDistributedCache cache, IDataProtectionProvider dataProtection)
{
    private readonly IDataProtector protector = dataProtection.CreateProtector("MedSync.SigningSession.v1");

    private static string Key(Guid userId) => $"signing-session:{userId:N}";

    public async Task<SigningSession?> GetAsync(Guid userId, CancellationToken cancellationToken)
    {
        var stored = await cache.GetStringAsync(Key(userId), cancellationToken);
        if (stored is null)
            return null;
        try
        {
            var session = JsonSerializer.Deserialize<SigningSession>(protector.Unprotect(stored));
            return session is not null && session.ExpiresAtUtc > DateTime.UtcNow ? session : null;
        }
        catch (CryptographicException)
        {
            // Key ring rotated (e.g. new container): the doctor simply approves again.
            await RemoveAsync(userId, cancellationToken);
            return null;
        }
    }

    public Task SaveAsync(Guid userId, SigningSession session, CancellationToken cancellationToken) =>
        cache.SetStringAsync(
            Key(userId),
            protector.Protect(JsonSerializer.Serialize(session)),
            new DistributedCacheEntryOptions { AbsoluteExpiration = session.ExpiresAtUtc },
            cancellationToken);

    public Task RemoveAsync(Guid userId, CancellationToken cancellationToken) =>
        cache.RemoveAsync(Key(userId), cancellationToken);
}
