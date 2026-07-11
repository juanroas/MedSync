using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
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
builder.Services.AddScoped<AuditWriter>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient<IPaymentProvider, MercadoPagoPaymentProvider>();
builder.Services.AddHttpClient(nameof(LiveKitRoomManager));
builder.Services.AddScoped<LiveKitRoomManager>();
builder.Services.AddHostedService<VideoSessionCleanupService>();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var authRateLimitPerMinute = int.TryParse(
    Environment.GetEnvironmentVariable("AUTH_RATE_LIMIT_PER_MINUTE"),
    out var configuredAuthRateLimit)
    ? configuredAuthRateLimit
    : 10;
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authRateLimitPerMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

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
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue("medsync_session", out var token))
                    context.Token = token;
                return Task.CompletedTask;
            }
        };
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
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.Use(async (context, next) =>
{
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Permissions-Policy"] =
        "camera=(self), microphone=(self), geolocation=()";
    await next();
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true &&
        string.Equals(
            context.User.FindFirst("must_change_password")?.Value,
            "true",
            StringComparison.OrdinalIgnoreCase) &&
        !context.Request.Path.StartsWithSegments("/auth/change-password") &&
        !context.Request.Path.StartsWithSegments("/auth/me") &&
        !context.Request.Path.StartsWithSegments("/auth/logout"))
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new
        {
            code = "password_change_required",
            message = "Troque a senha temporária antes de continuar."
        });
        return;
    }
    await next();
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "MedSync.Api",
    timestamp = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapPost("/ops/presentation-seed", async (
    HttpContext http,
    IServiceScopeFactory scopeFactory,
    IPasswordService passwords,
    IWebHostEnvironment environment,
    CancellationToken cancellationToken) =>
{
    var seedMode = ResolveDemoSeedMode(environment);
    if (!seedMode.Enabled)
        return Results.Problem(
            "Seed demo nao esta habilitado para este ambiente.",
            statusCode: StatusCodes.Status403Forbidden);

    var configuredKey = Environment.GetEnvironmentVariable("PRESENTATION_SEED_KEY");
    if (string.IsNullOrWhiteSpace(configuredKey))
        return Results.NotFound();

    var providedKey = http.Request.Headers["x-medsync-seed-key"].ToString();
    if (!FixedTimeEquals(configuredKey, providedKey))
        return Results.NotFound();

    var demoPassword = Environment.GetEnvironmentVariable("SEED_DEMO_PASSWORD");
    if (ValidateDemoPassword(environment, demoPassword) is { } passwordError)
        return Results.Problem(passwordError, statusCode: StatusCodes.Status400BadRequest);

    await using var scope = scopeFactory.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
    await db.Database.MigrateAsync(cancellationToken);
    await DatabaseSeeder.SeedAsync(db, passwords, demoPassword!, cancellationToken);

    var users = await db.Users.CountAsync(cancellationToken);
    var companies = await db.Companies.CountAsync(cancellationToken);
    var beneficiaries = await db.CompanyEmployees.CountAsync(cancellationToken);

    app.Logger.LogInformation(
        "Presentation seed executed manually. Environment: {Environment}; Mode: {Mode}; Users: {Users}; Companies: {Companies}; Beneficiaries: {Beneficiaries}",
        environment.EnvironmentName,
        seedMode.Mode,
        users,
        companies,
        beneficiaries);

    return Results.Ok(new
    {
        status = "seeded",
        environment = environment.EnvironmentName,
        mode = seedMode.Mode,
        users,
        companies,
        beneficiaries
    });
}).AllowAnonymous().RequireRateLimiting("auth");
app.MapMedSyncEndpoints();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
    await db.Database.MigrateAsync();
    var seedMode = ResolveDemoSeedMode(app.Environment);
    if (seedMode.Enabled)
    {
        var demoPassword = Environment.GetEnvironmentVariable("SEED_DEMO_PASSWORD");
        if (ValidateDemoPassword(app.Environment, demoPassword) is { } passwordError)
            throw new InvalidOperationException(passwordError);

        app.Logger.LogInformation(
            "Running demo seed. Environment: {Environment}; Mode: {Mode}",
            app.Environment.EnvironmentName,
            seedMode.Mode);
        await DatabaseSeeder.SeedAsync(
            db,
            scope.ServiceProvider.GetRequiredService<IPasswordService>(),
            demoPassword!);
        app.Logger.LogInformation("Demo seed completed.");
    }
    else
    {
        app.Logger.LogInformation(
            "Demo seed skipped. Environment: {Environment}; Reason: {Reason}",
            app.Environment.EnvironmentName,
            seedMode.Reason);
    }
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

static SeedMode ResolveDemoSeedMode(IWebHostEnvironment environment)
{
    var homologationSeedEnabled = string.Equals(
        Environment.GetEnvironmentVariable("ENABLE_HOMOLOGATION_SEED"),
        "true",
        StringComparison.OrdinalIgnoreCase);
    var presentationSeedInProduction =
        environment.IsProduction() &&
        homologationSeedEnabled &&
        string.Equals(
            Environment.GetEnvironmentVariable("ALLOW_PRESENTATION_SEED_IN_PRODUCTION"),
            "true",
            StringComparison.OrdinalIgnoreCase) &&
        string.Equals(
            Environment.GetEnvironmentVariable("PRESENTATION_SEED_ACK"),
            "DEMO_ONLY_NO_REAL_PATIENTS",
            StringComparison.Ordinal);

    if (environment.IsDevelopment())
        return new SeedMode(true, "Development", "Ambiente Development.");
    if (environment.IsEnvironment("Homologation"))
        return new SeedMode(true, "Homologation", "Ambiente Homologation.");
    if (homologationSeedEnabled)
        return new SeedMode(
            true,
            environment.IsProduction() ? "PresentationProduction" : "NonProductionFlag",
            environment.IsProduction()
                ? "Seed demo habilitado em ambiente unico publicado."
                : "Seed habilitado em ambiente nao-producao.");
    if (presentationSeedInProduction)
        return new SeedMode(true, "PresentationProduction", "Seed demo habilitado explicitamente em ambiente unico.");

    return new SeedMode(false, "Disabled", "Variaveis de seed demo ausentes ou ambiente nao autorizado.");
}

static string? ValidateDemoPassword(IWebHostEnvironment environment, string? demoPassword)
{
    if (string.IsNullOrWhiteSpace(demoPassword))
        return "Configure SEED_DEMO_PASSWORD para criar o seed.";
    if (environment.IsProduction() &&
        string.Equals(demoPassword, "MedSyncLocal123!", StringComparison.Ordinal))
        return "Nao use a senha local padrao em ambiente publico. Configure uma SEED_DEMO_PASSWORD forte.";
    return null;
}

static bool FixedTimeEquals(string expected, string actual)
{
    if (string.IsNullOrEmpty(actual))
        return false;

    var expectedBytes = Encoding.UTF8.GetBytes(expected);
    var actualBytes = Encoding.UTF8.GetBytes(actual);
    return expectedBytes.Length == actualBytes.Length &&
        System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
}

internal sealed record SeedMode(bool Enabled, string Mode, string Reason);
