using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MedSync.Domain;
using MedSync.Infrastructure;

namespace MedSync.Api;

public sealed record RequestContext(
    Guid UserId,
    Guid ClinicId,
    IReadOnlySet<ClinicRole> Roles)
{
    public bool HasAny(params ClinicRole[] roles) => roles.Any(Roles.Contains);

    public static RequestContext From(ClaimsPrincipal principal)
    {
        var userId = Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("Usuário não identificado."));
        var clinicId = Guid.Parse(principal.FindFirstValue("clinic_id")
            ?? throw new UnauthorizedAccessException("Clínica não identificada."));
        var roles = principal.FindAll(ClaimTypes.Role)
            .Select(x => Enum.Parse<ClinicRole>(x.Value))
            .ToHashSet();
        return new RequestContext(userId, clinicId, roles);
    }
}

public static class AccessRules
{
    public static readonly ClinicRole[] ManagePatients =
        [ClinicRole.Receptionist, ClinicRole.ClinicAdmin, ClinicRole.MedicalDirector];

    public static readonly ClinicRole[] ManageDoctors =
        [ClinicRole.ClinicAdmin, ClinicRole.MedicalDirector];

    public static readonly ClinicRole[] ManageAppointments =
        [ClinicRole.Receptionist, ClinicRole.ClinicAdmin, ClinicRole.MedicalDirector];

    public static readonly ClinicRole[] ViewAllAppointments =
        [ClinicRole.Receptionist, ClinicRole.Finance, ClinicRole.ClinicAdmin, ClinicRole.MedicalDirector];
}

public static class PasswordPolicy
{
    public static string? Validate(string password)
    {
        if (password.Length < 12)
            return "A senha deve ter pelo menos 12 caracteres.";
        if (!password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit) ||
            !password.Any(ch => !char.IsLetterOrDigit(ch)))
            return "A senha deve conter letra maiúscula, minúscula, número e símbolo.";
        return null;
    }
}

public static class SecurityText
{
    public const string ConsentTermVersion = "telemedicina-2026-01";
    public const string ConsentTerm =
        "Autorizo o atendimento por telemedicina e a transmissão segura de áudio, vídeo e dados " +
        "necessários à consulta. Fui informado sobre as limitações do atendimento remoto, o uso de " +
        "fornecedores tecnológicos e meu direito de recusar esta modalidade e solicitar atendimento presencial.";

    public static string ConsentTermHash()
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(ConsentTerm));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string VideoEncryptionKey(string roomName, IConfiguration configuration)
    {
        var secret = configuration["VIDEO_E2EE_SECRET"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            throw new InvalidOperationException(
                "VIDEO_E2EE_SECRET deve ser configurado com pelo menos 32 caracteres.");

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(roomName)));
    }

    public static string MaskCpf(string cpf)
    {
        var digits = new string(cpf.Where(char.IsDigit).ToArray());
        return digits.Length == 11 ? $"***.{digits[3..6]}.{digits[6..9]}-**" : "***";
    }

    public static string Slug(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var letters = normalized
            .Where(ch => char.GetUnicodeCategory(ch) !=
                System.Globalization.UnicodeCategory.NonSpacingMark)
            .Select(ch => char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : '-')
            .ToArray();
        var slug = string.Join('-', new string(letters)
            .Split('-', StringSplitOptions.RemoveEmptyEntries));
        return $"{slug}-{RandomNumberGenerator.GetHexString(4).ToLowerInvariant()}";
    }
}

public sealed class AuditWriter(MedSyncDbContext db, IHttpContextAccessor accessor)
{
    public void Add(
        RequestContext? actor,
        string action,
        string resourceType,
        object? resourceId,
        string result = "Success",
        string? reason = null)
    {
        var http = accessor.HttpContext;
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = actor?.ClinicId,
            ActorUserId = actor?.UserId,
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId?.ToString(),
            Result = result,
            Reason = reason,
            IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = http?.Request.Headers.UserAgent.ToString()
        });
    }
}
