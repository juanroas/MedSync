namespace MedSync.Api;

public static class DotEnv
{
    public static void Load()
    {
        var path = FindFile(Directory.GetCurrentDirectory())
            ?? FindFile(AppContext.BaseDirectory);
        if (path is null)
            return;

        foreach (var rawLine in File.ReadLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;
            if (line.StartsWith("export ", StringComparison.Ordinal))
                line = line[7..].TrimStart();

            var separator = line.IndexOf('=');
            if (separator <= 0)
                continue;

            var key = line[..separator].Trim();
            var value = line[(separator + 1)..].Trim();
            if ((value.StartsWith('"') && value.EndsWith('"')) ||
                (value.StartsWith('\'') && value.EndsWith('\'')))
                value = value[1..^1];

            // Variáveis reais do ambiente (como as do Railway) sempre vencem.
            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }

    private static string? FindFile(string startDirectory)
    {
        var directory = new DirectoryInfo(startDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, ".env");
            if (File.Exists(candidate))
                return candidate;
            directory = directory.Parent;
        }
        return null;
    }
}

