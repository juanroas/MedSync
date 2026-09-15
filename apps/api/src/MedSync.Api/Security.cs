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
    [
        ClinicRole.Receptionist,
        ClinicRole.ClinicAdmin,
        ClinicRole.MedicalDirector,
        ClinicRole.Support,
        ClinicRole.PlatformAdmin
    ];

    public static readonly ClinicRole[] ViewPatients =
    [
        ClinicRole.Receptionist,
        ClinicRole.ClinicAdmin,
        ClinicRole.MedicalDirector,
        ClinicRole.Support,
        ClinicRole.PlatformAdmin,
        ClinicRole.CompanyAuditor,
        ClinicRole.PlatformAuditor,
        ClinicRole.OccupationalHealthAdmin
    ];

    public static readonly ClinicRole[] ManageDoctors =
    [
        ClinicRole.ClinicAdmin,
        ClinicRole.MedicalDirector,
        ClinicRole.PlatformAdmin
    ];

    public static readonly ClinicRole[] ManageAppointments =
    [
        ClinicRole.Receptionist,
        ClinicRole.ClinicAdmin,
        ClinicRole.MedicalDirector,
        ClinicRole.Support,
        ClinicRole.OccupationalHealthAdmin
    ];

    public static readonly ClinicRole[] ViewAllAppointments =
    [
        ClinicRole.Receptionist,
        ClinicRole.Finance,
        ClinicRole.ClinicAdmin,
        ClinicRole.MedicalDirector,
        ClinicRole.Support,
        ClinicRole.PlatformAdmin,
        ClinicRole.OccupationalHealthAdmin
    ];
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
    // ATENÇÃO: texto de consentimento informado para telemedicina. Alinhado ao conteúdo mínimo da
    // Resolução CFM nº 2.314/2022 (identificação do profissional, limitações do atendimento remoto,
    // caráter voluntário, direito de recusa/interrupção e tratamento de dados conforme a LGPD), mas
    // ainda PRECISA de validação formal por jurídico/compliance antes de uso em produção real.
    public const string ConsentTermVersion = "telemedicina-2026-02";
    public const string ConsentTerm =
        "Fui informado de que esta consulta será realizada por telemedicina, com transmissão seguindo por " +
        "áudio, vídeo e dados necessários ao atendimento, prestada por profissional devidamente identificado " +
        "e habilitado. Entendo as limitações do atendimento remoto em relação ao presencial, incluindo a " +
        "impossibilidade de exame físico direto, e sei que o profissional pode encerrar a consulta e " +
        "encaminhar-me ao atendimento presencial caso julgue necessário. Minha participação é voluntária: " +
        "posso recusar esta modalidade a qualquer momento e solicitar atendimento presencial, sem prejuízo " +
        "ao meu cuidado. Fui informado sobre os fornecedores tecnológicos envolvidos, sobre a forma de " +
        "tratamento dos meus dados pessoais e de saúde conforme a Lei Geral de Proteção de Dados (LGPD) e " +
        "sobre meus direitos como titular desses dados, incluindo acesso, correção e exclusão nos termos da lei.";

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

    /// <summary>
    /// Gera uma senha temporária aleatória que já satisfaz <see cref="PasswordPolicy"/>,
    /// para uso em fluxos administrativos de redefinição de senha (o usuário é obrigado
    /// a trocá-la no próximo login via <c>MustChangePassword</c>).
    /// </summary>
    public static string GenerateTemporaryPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string symbols = "!@#$%*?";
        const string all = upper + lower + digits + symbols;

        Span<char> buffer = stackalloc char[16];
        buffer[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        buffer[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        buffer[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        buffer[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];
        for (var i = 4; i < buffer.Length; i++)
            buffer[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

        // Embaralha para que as categorias fixas não fiquem sempre nas mesmas posições.
        for (var i = buffer.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (buffer[i], buffer[j]) = (buffer[j], buffer[i]);
        }

        return new string(buffer);
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
