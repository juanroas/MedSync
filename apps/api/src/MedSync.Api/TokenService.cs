using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Livekit.Server.Sdk.Dotnet;
using MedSync.Application;
using MedSync.Domain;
using Microsoft.IdentityModel.Tokens;

namespace MedSync.Api;

public sealed class TokenService(IConfiguration configuration) : ITokenService
{
    public string CreateJwt(
        User user,
        Clinic clinic,
        IReadOnlyCollection<ClinicRole> roles)
    {
        var secret = Required("JWT_SECRET", "Jwt:Secret");
        var issuer = Value("JWT_ISSUER", "Jwt:Issuer") ?? "MedSync";
        var audience = Value("JWT_AUDIENCE", "Jwt:Audience") ?? "MedSync.Web";
        var expiresMinutes = configuration.GetValue<int?>("Jwt:ExpiresMinutes") ?? 15;
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.Name),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim("clinic_id", clinic.Id.ToString()),
            new Claim("clinic_name", clinic.Name),
            new Claim("must_change_password", user.MustChangePassword.ToString().ToLowerInvariant())
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role.ToString())));

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateLiveKitToken(string roomName, string identity, string? displayName = null)
    {
        var token = new AccessToken(
                Required("LIVEKIT_API_KEY", "LiveKit:ApiKey"),
                Required("LIVEKIT_API_SECRET", "LiveKit:ApiSecret"))
            .WithIdentity(identity)
            .WithName(displayName ?? identity)
            .WithGrants(new VideoGrants
            {
                RoomJoin = true,
                Room = roomName,
                CanPublish = true,
                CanSubscribe = true,
                CanPublishData = true
            })
            .WithTtl(TimeSpan.FromMinutes(15));

        return token.ToJwt();
    }

    private string Required(string environmentName, string key) =>
        Value(environmentName, key) is { } value && !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"Configure {environmentName}.");

    private string? Value(string environmentName, string key) =>
        Environment.GetEnvironmentVariable(environmentName) ?? configuration[key];
}
