using System.Text;
using System.Text.Json.Serialization;
using MedSync.Api;
using MedSync.Application;
using MedSync.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var connectionString = DatabaseUrl.Resolve(
    Environment.GetEnvironmentVariable("DATABASE_URL"),
    builder.Configuration.GetConnectionString("DefaultConnection"));
builder.Services.AddDbContext<MedSyncDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
        npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "medsync")));

var redisUrl = Environment.GetEnvironmentVariable("REDIS_URL");
if (string.IsNullOrWhiteSpace(redisUrl))
{
    builder.Services.AddDistributedMemoryCache();
}
else
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.ConfigurationOptions = RedisConfiguration(redisUrl);
        options.InstanceName = "medsync:";
    });
}

builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Configure JWT_SECRET.");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["Jwt:Issuer"]
    ?? "MedSync";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["Jwt:Audience"]
    ?? "MedSync.Web";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

var frontendUrls = (Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(frontendUrls)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "MedSync.Api",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();
app.MapMedSyncEndpoints();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
    await db.Database.MigrateAsync();
    var demoPassword = Environment.GetEnvironmentVariable("SEED_DEMO_PASSWORD");
    if (string.IsNullOrWhiteSpace(demoPassword))
        throw new InvalidOperationException("Configure SEED_DEMO_PASSWORD para criar o seed.");
    await DatabaseSeeder.SeedAsync(
        db,
        scope.ServiceProvider.GetRequiredService<IPasswordService>(),
        demoPassword);
}

await app.RunAsync();

static ConfigurationOptions RedisConfiguration(string value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
        (uri.Scheme != "redis" && uri.Scheme != "rediss"))
        return ConfigurationOptions.Parse(value);

    var options = new ConfigurationOptions
    {
        EndPoints = { { uri.Host, uri.IsDefaultPort ? 6379 : uri.Port } },
        Ssl = uri.Scheme == "rediss",
        AbortOnConnectFail = false
    };
    if (!string.IsNullOrEmpty(uri.UserInfo))
    {
        var credentials = uri.UserInfo.Split(':', 2);
        if (credentials.Length == 2)
        {
            options.User = Uri.UnescapeDataString(credentials[0]);
            options.Password = Uri.UnescapeDataString(credentials[1]);
        }
        else
        {
            options.Password = Uri.UnescapeDataString(credentials[0]);
        }
    }
    return options;
}
