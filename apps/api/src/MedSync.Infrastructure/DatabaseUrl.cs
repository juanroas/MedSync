using Npgsql;

namespace MedSync.Infrastructure;

public static class DatabaseUrl
{
    public static string Resolve(string? databaseUrl, string? connectionString)
    {
        if (!string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        if (string.IsNullOrWhiteSpace(databaseUrl))
            throw new InvalidOperationException(
                "Configure DATABASE_URL ou ConnectionStrings__DefaultConnection.");

        if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
            return databaseUrl;

        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? string.Empty),
            Password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? string.Empty),
            SslMode = uri.Query.Contains("sslmode=require", StringComparison.OrdinalIgnoreCase)
                ? SslMode.Require
                : SslMode.Prefer
        };

        return builder.ConnectionString;
    }
}

