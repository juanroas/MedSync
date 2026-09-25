using System.Text;
using MedSync.Api;
using MedSync.Domain;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace MedSync.Api.Tests;

public class SigningSessionTests
{
    private static SigningSessionStore NewStore(out IDistributedCache cache)
    {
        cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        return new SigningSessionStore(cache, new EphemeralDataProtectionProvider());
    }

    [Fact]
    public async Task Session_is_stored_encrypted_and_read_back()
    {
        var store = NewStore(out var cache);
        var userId = Guid.NewGuid();
        var session = new SigningSession("integraicp", "cred-123", "verifier-secret", DateTime.UtcNow.AddHours(8), false);

        await store.SaveAsync(userId, session, CancellationToken.None);

        var raw = await cache.GetStringAsync($"signing-session:{userId:N}");
        Assert.NotNull(raw);
        Assert.DoesNotContain("cred-123", raw);
        Assert.DoesNotContain("verifier-secret", raw);
        Assert.Equal(session, await store.GetAsync(userId, CancellationToken.None));
    }

    [Fact]
    public async Task Expired_or_removed_session_is_not_returned()
    {
        var store = NewStore(out _);
        var userId = Guid.NewGuid();
        await store.SaveAsync(userId, new SigningSession("simulator", "c", "v", DateTime.UtcNow.AddHours(1), true), CancellationToken.None);
        await store.RemoveAsync(userId, CancellationToken.None);
        Assert.Null(await store.GetAsync(userId, CancellationToken.None));
    }

    [Fact]
    public async Task Simulator_signs_and_marks_the_pdf_as_having_no_validity()
    {
        var provider = new SimulatedSignatureProvider();
        var session = new SigningSession(provider.Name, "sim", "v", DateTime.UtcNow.AddHours(1), true);
        var document = PrescriptionPdf.Render(new PrescriptionPdfData(
            Guid.NewGuid(), PrescriptionKind.Simple, "Dra. Teste", "1", "SP", "Clínica geral", "Rua A, 1", "Clínica",
            "Paciente", "12345678909", "São Paulo/SP", null, DateTime.UtcNow,
            [new PrescriptionItem { MedicationName = "DIPIRONA", Instructions = "1 comprimido se dor" }],
            Simulated: true));

        var pdf = await PrescriptionPdf.SignAsync(document, provider.CreatePdfSigner(session, CancellationToken.None), "Teste");

        var text = Encoding.Latin1.GetString(pdf);
        Assert.Contains("/ByteRange", text);
        Assert.StartsWith("%PDF", text);
        Assert.True(provider.Simulated);
    }
}
