using System.Security.Cryptography;
using PdfSharp.Pdf.Signatures;

namespace MedSync.Api;

// A signature service that only ever sees a SHA-256 digest and answers with a detached CMS
// (IntegraICP `POST /signatures` in CMS format). The document never leaves MedSync.
public interface ICmsDigestSigner
{
    string CertificateName { get; }
    Task<byte[]> SignDigestAsync(byte[] sha256Digest, CancellationToken cancellationToken);
}

// Bridges PDFsharp to a remote signer. The size is fixed on purpose: PDFsharp's default way of measuring
// (signing an empty stream) would cost the doctor an extra authorization on the cloud certificate.
public sealed class RemoteDigitalSigner(ICmsDigestSigner signer, CancellationToken cancellationToken, int reservedBytes = 32 * 1024)
    : IDigitalSigner
{
    public string CertificateName => signer.CertificateName;

    public Task<int> GetSignatureSizeAsync() => Task.FromResult(reservedBytes);

    public async Task<byte[]> GetSignatureAsync(Stream stream)
    {
        stream.Position = 0;
        var digest = await SHA256.HashDataAsync(stream, cancellationToken);
        var cms = await signer.SignDigestAsync(digest, cancellationToken);
        if (cms.Length > reservedBytes)
            throw new InvalidOperationException($"Assinatura de {cms.Length} bytes não cabe no espaço reservado ({reservedBytes}).");
        return cms;
    }
}
