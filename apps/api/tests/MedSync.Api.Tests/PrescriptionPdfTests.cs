using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.RegularExpressions;
using MedSync.Api;
using MedSync.Domain;
using PdfSharp.Pdf.Signatures;

namespace MedSync.Api.Tests;

public class PrescriptionPdfTests
{
    [Fact]
    public async Task Signed_pdf_carries_a_cms_that_verifies_over_the_byte_range()
    {
        using var certificate = CreateTestCertificate();
        var document = PrescriptionPdf.Render(SampleData(PrescriptionKind.Simple));

        var pdf = await PrescriptionPdf.SignAsync(
            document,
            new PdfSharpDefaultSigner(certificate, PdfMessageDigestType.SHA256),
            "São Paulo/SP");

        if (Environment.GetEnvironmentVariable("MEDSYNC_PDF_SAMPLE") is { Length: > 0 } samplePath)
            await File.WriteAllBytesAsync(samplePath, pdf);

        var (signedContent, cms) = ReadSignature(pdf);
        var signedCms = new SignedCms(new ContentInfo(signedContent), detached: true);
        signedCms.Decode(cms);
        signedCms.CheckSignature(verifySignatureOnly: true);
        Assert.Equal(certificate.Thumbprint, signedCms.SignerInfos[0].Certificate!.Thumbprint);
    }

    [Fact]
    public async Task Remote_signer_receives_the_sha256_of_exactly_the_signed_bytes()
    {
        var remote = new RecordingDigestSigner();
        var document = PrescriptionPdf.Render(SampleData(PrescriptionKind.Antimicrobial));

        var pdf = await PrescriptionPdf.SignAsync(document, new RemoteDigitalSigner(remote, CancellationToken.None), "Remoto");

        var (signedContent, cms) = ReadSignature(pdf);
        Assert.Equal(SHA256.HashData(signedContent), remote.LastDigest);
        Assert.Equal(RecordingDigestSigner.Marker, cms[..RecordingDigestSigner.Marker.Length]);
        Assert.Equal(2, Regex.Matches(Encoding.Latin1.GetString(pdf), @"/Type\s*/Page\b").Count);
    }

    [Fact]
    public async Task Remote_signer_rejects_a_signature_bigger_than_the_reserved_space()
    {
        var signer = new RemoteDigitalSigner(new RecordingDigestSigner(size: 64), CancellationToken.None, reservedBytes: 32);
        await Assert.ThrowsAsync<InvalidOperationException>(() => signer.GetSignatureAsync(new MemoryStream([1, 2, 3])));
    }

    [Theory]
    [InlineData("CRM-SP 200000", "sp", "CRM 200000/SP")]
    [InlineData("123456", "RJ", "CRM 123456/RJ")]
    [InlineData("CRM 5555", "MG", "CRM 5555/MG")]
    [InlineData("crm/rj 777", "RJ", "CRM 777/RJ")]
    public void Crm_prints_once_whatever_way_it_was_stored(string crm, string uf, string expected) =>
        Assert.Equal(expected, PrescriptionPdf.FormatCrm(crm, uf));

    private static PrescriptionPdfData SampleData(PrescriptionKind kind) =>
        new(
            Guid.NewGuid(),
            kind,
            "Dra. Marina Costa",
            "200000",
            "SP",
            "Clínica geral",
            "Av. Paulista, 1000 — São Paulo/SP",
            "Clínica Demo",
            "Carlos Oliveira",
            "12345678909",
            "São Paulo/SP",
            "Tomar após as refeições.",
            DateTime.UtcNow,
            [
                new PrescriptionItem
                {
                    Position = 0,
                    MedicationName = "LOSARTANA POTÁSSICA",
                    Dosage = "50 mg",
                    Instructions = "1 comprimido pela manhã",
                    Quantity = "30 comprimidos",
                    ContinuousUse = true
                }
            ]);

    private static X509Certificate2 CreateTestCertificate()
    {
        using var key = RSA.Create(2048);
        var request = new CertificateRequest("CN=MedSync TESTE sem validade", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        using var certificate = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1));
        return X509CertificateLoader.LoadPkcs12(certificate.Export(X509ContentType.Pkcs12), null);
    }

    // Reads /ByteRange and /Contents the way a validator does.
    private static (byte[] SignedContent, byte[] Cms) ReadSignature(byte[] pdf)
    {
        var text = Encoding.Latin1.GetString(pdf);
        var range = Regex.Match(text, @"/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]");
        Assert.True(range.Success, "PDF sem /ByteRange");
        var values = Enumerable.Range(1, 4).Select(i => int.Parse(range.Groups[i].Value)).ToArray();
        var signed = pdf[values[0]..(values[0] + values[1])].Concat(pdf[values[2]..(values[2] + values[3])]).ToArray();

        var hex = text[(values[0] + values[1] + 1)..(values[2] - 1)];
        var bytes = Convert.FromHexString(hex);
        return (signed, bytes[..DerLength(bytes)]);
    }

    // /Contents is zero-padded; keep only the DER SEQUENCE.
    private static int DerLength(byte[] der)
    {
        if (der[1] < 0x80)
            return 2 + der[1];
        var lengthBytes = der[1] & 0x7F;
        var length = 0;
        for (var i = 0; i < lengthBytes; i++)
            length = (length << 8) | der[2 + i];
        return 2 + lengthBytes + length;
    }

    private sealed class RecordingDigestSigner(int size = 600) : ICmsDigestSigner
    {
        public static readonly byte[] Marker = [0x30, 0x82, 0x02, 0x54];
        public byte[]? LastDigest { get; private set; }
        public string CertificateName => "Teste";

        public Task<byte[]> SignDigestAsync(byte[] sha256Digest, CancellationToken cancellationToken)
        {
            LastDigest = sha256Digest;
            var cms = new byte[size];
            Marker.CopyTo(cms, 0);
            return Task.FromResult(cms);
        }
    }
}
