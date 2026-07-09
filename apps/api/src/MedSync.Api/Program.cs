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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
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
app.MapMedSyncEndpoints();

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
    await db.Database.MigrateAsync();
    if (app.Environment.IsDevelopment())
    {
        var demoPassword = Environment.GetEnvironmentVariable("SEED_DEMO_PASSWORD");
        if (string.IsNullOrWhiteSpace(demoPassword))
            throw new InvalidOperationException("Configure SEED_DEMO_PASSWORD para criar o seed.");
        await DatabaseSeeder.SeedAsync(
            db,
            scope.ServiceProvider.GetRequiredService<IPasswordService>(),
            demoPassword);
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
