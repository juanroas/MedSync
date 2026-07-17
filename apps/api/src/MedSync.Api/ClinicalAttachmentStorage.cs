using System.Security.Cryptography;

namespace MedSync.Api;

public sealed class ClinicalAttachmentStorage(IWebHostEnvironment environment)
{
    public const long MaxFileSizeBytes = 10 * 1024 * 1024;

    private static readonly IReadOnlyDictionary<string, string[]> AllowedContentTypes =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = ["application/pdf"],
            [".jpg"] = ["image/jpeg", "image/jpg"],
            [".jpeg"] = ["image/jpeg", "image/jpg"],
            [".png"] = ["image/png"]
        };

    private readonly string rootPath =
        Environment.GetEnvironmentVariable("MEDSYNC_ATTACHMENT_STORAGE_PATH")
        ?? Path.Combine(environment.ContentRootPath, "App_Data", "clinical-attachments");

    public async Task<StoredClinicalAttachment> SaveAsync(
        Guid clinicId,
        Guid appointmentId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length <= 0)
            throw new ClinicalAttachmentValidationException("Selecione um arquivo valido.");
        if (file.Length > MaxFileSizeBytes)
            throw new ClinicalAttachmentValidationException("O arquivo deve ter no maximo 10 MB.");

        var fileName = SanitizeFileName(file.FileName);
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (!AllowedContentTypes.TryGetValue(extension, out var contentTypes) ||
            !contentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            throw new ClinicalAttachmentValidationException("Envie apenas PDF, JPG ou PNG.");

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, cancellationToken);
        if (memory.Length > MaxFileSizeBytes)
            throw new ClinicalAttachmentValidationException("O arquivo deve ter no maximo 10 MB.");

        var bytes = memory.ToArray();
        if (!HasExpectedSignature(extension, bytes))
            throw new ClinicalAttachmentValidationException("O conteudo do arquivo nao corresponde ao tipo informado.");

        var attachmentId = Guid.NewGuid();
        var relativePath = Path.Combine(
            clinicId.ToString("N"),
            appointmentId.ToString("N"),
            $"{attachmentId:N}{extension}");
        var absolutePath = GetAbsolutePath(relativePath);

        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
        await File.WriteAllBytesAsync(absolutePath, bytes, cancellationToken);

        var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        return new StoredClinicalAttachment(
            attachmentId,
            fileName,
            relativePath,
            NormalizeContentType(extension),
            bytes.LongLength,
            hash);
    }

    public string GetAbsolutePath(string storageKey)
    {
        var fullPath = Path.GetFullPath(Path.Combine(rootPath, storageKey));
        var fullRoot = Path.GetFullPath(rootPath);
        if (!fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Caminho de anexo invalido.");
        return fullPath;
    }

    private static string SanitizeFileName(string value)
    {
        var fileName = Path.GetFileName(value).Trim();
        foreach (var invalid in Path.GetInvalidFileNameChars())
            fileName = fileName.Replace(invalid, '-');

        if (string.IsNullOrWhiteSpace(fileName))
            throw new ClinicalAttachmentValidationException("Nome do arquivo invalido.");
        return fileName.Length > 180 ? fileName[^180..] : fileName;
    }

    private static string NormalizeContentType(string extension) =>
        extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase)
            ? "application/pdf"
            : extension.Equals(".png", StringComparison.OrdinalIgnoreCase)
                ? "image/png"
                : "image/jpeg";

    private static bool HasExpectedSignature(string extension, byte[] bytes)
    {
        if (extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            return bytes.Length >= 4 &&
                   bytes[0] == 0x25 &&
                   bytes[1] == 0x50 &&
                   bytes[2] == 0x44 &&
                   bytes[3] == 0x46;

        if (extension is ".jpg" or ".jpeg")
            return bytes.Length >= 3 &&
                   bytes[0] == 0xFF &&
                   bytes[1] == 0xD8 &&
                   bytes[2] == 0xFF;

        if (extension.Equals(".png", StringComparison.OrdinalIgnoreCase))
            return bytes.Length >= 8 &&
                   bytes[0] == 0x89 &&
                   bytes[1] == 0x50 &&
                   bytes[2] == 0x4E &&
                   bytes[3] == 0x47 &&
                   bytes[4] == 0x0D &&
                   bytes[5] == 0x0A &&
                   bytes[6] == 0x1A &&
                   bytes[7] == 0x0A;

        return false;
    }
}

public sealed record StoredClinicalAttachment(
    Guid Id,
    string FileName,
    string StorageKey,
    string ContentType,
    long SizeBytes,
    string Sha256);

public sealed class ClinicalAttachmentValidationException(string message) : Exception(message);
