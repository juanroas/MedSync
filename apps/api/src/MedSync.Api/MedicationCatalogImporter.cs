using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

// Keeps the medication search base in sync with Anvisa's open data (registered medications, updated daily).
// Search is always local, so prescribing never depends on Anvisa being reachable.
public sealed class MedicationCatalogImporter(
    IServiceScopeFactory scopeFactory,
    IHttpClientFactory httpClientFactory,
    ILogger<MedicationCatalogImporter> logger) : BackgroundService
{
    public const string DefaultSourceUrl = "https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv";
    private static readonly TimeSpan RefreshAfter = TimeSpan.FromDays(7);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.Equals(Environment.GetEnvironmentVariable("MEDICATION_CATALOG_SYNC"), "false", StringComparison.OrdinalIgnoreCase))
            return;

        // Let migrations and the seed finish first.
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncIfStaleAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Medication catalog sync failed; search keeps the previous base.");
            }

            await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
        }
    }

    private async Task SyncIfStaleAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
        var lastSync = await db.MedicationCatalog.AsNoTracking()
            .Where(x => x.Source == MedicationSource.Anvisa)
            .MaxAsync(x => (DateTime?)x.UpdatedAt, cancellationToken);
        if (lastSync is not null && DateTime.UtcNow - lastSync < RefreshAfter)
            return;

        var url = Environment.GetEnvironmentVariable("MEDICATION_CATALOG_URL") ?? DefaultSourceUrl;
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromMinutes(2);
        await using var stream = await client.GetStreamAsync(url, cancellationToken);
        using var reader = new StreamReader(stream, Encoding.Latin1);
        var items = await ParseAsync(reader, cancellationToken);
        if (items.Count == 0)
        {
            logger.LogWarning("Medication catalog download had no valid rows; keeping the previous base.");
            return;
        }

        var now = DateTime.UtcNow;
        var existing = await db.MedicationCatalog
            .Where(x => x.Source == MedicationSource.Anvisa)
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        foreach (var item in items.Values)
        {
            if (existing.Remove(item.Id, out var current))
                current.UpdatedAt = now;
            else
            {
                item.UpdatedAt = now;
                db.MedicationCatalog.Add(item);
            }
        }

        // Registrations that are no longer valid leave the search; prescriptions keep their own copy of the name.
        db.MedicationCatalog.RemoveRange(existing.Values);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Medication catalog synced from Anvisa: {Count} items.", items.Count);
    }

    internal static async Task<Dictionary<Guid, MedicationCatalogItem>> ParseAsync(TextReader reader, CancellationToken cancellationToken)
    {
        var items = new Dictionary<Guid, MedicationCatalogItem>();
        var header = await reader.ReadLineAsync(cancellationToken);
        if (header is null)
            return items;

        var columns = SplitCsvLine(header);
        int Column(string name) => columns.FindIndex(c => c.Equals(name, StringComparison.OrdinalIgnoreCase));
        var typeColumn = Column("TIPO_PRODUTO");
        var nameColumn = Column("NOME_PRODUTO");
        var statusColumn = Column("SITUACAO_REGISTRO");
        var classColumn = Column("CLASSE_TERAPEUTICA");
        var ingredientColumn = Column("PRINCIPIO_ATIVO");
        if (nameColumn < 0 || statusColumn < 0)
            return items;

        while (await reader.ReadLineAsync(cancellationToken) is { } line)
        {
            var fields = SplitCsvLine(line);
            string? Field(int index) => index >= 0 && index < fields.Count && !string.IsNullOrWhiteSpace(fields[index])
                ? fields[index].Trim()
                : null;

            if (!string.Equals(Normalize(Field(statusColumn) ?? ""), "ativo", StringComparison.Ordinal))
                continue;
            if (typeColumn >= 0 && !string.Equals(Field(typeColumn), "MEDICAMENTO", StringComparison.OrdinalIgnoreCase))
                continue;
            var name = Field(nameColumn);
            if (name is null)
                continue;

            var ingredient = Field(ingredientColumn);
            var searchText = BuildSearchText(name, ingredient);
            var id = StableId(searchText);
            if (items.ContainsKey(id))
                continue;
            items[id] = new MedicationCatalogItem
            {
                Id = id,
                Name = Truncate(name, 200)!,
                ActiveIngredient = Truncate(ingredient, 500),
                TherapeuticClass = Truncate(Field(classColumn), 200),
                Source = MedicationSource.Anvisa,
                SearchText = Truncate(searchText, 800)!
            };
        }

        return items;
    }

    public static string BuildSearchText(string name, string? activeIngredient) =>
        Normalize($"{name} {activeIngredient}").Trim();

    public static string Normalize(string value)
    {
        var decomposed = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                builder.Append(character);
        }

        return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static Guid StableId(string searchText) =>
        new(MD5.HashData(Encoding.UTF8.GetBytes("anvisa:" + searchText)));

    private static string? Truncate(string? value, int max) =>
        value is null || value.Length <= max ? value : value[..max];

    private static List<string> SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var character = line[i];
            if (character == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                    inQuotes = !inQuotes;
            }
            else if (character == ';' && !inQuotes)
            {
                fields.Add(current.ToString());
                current.Clear();
            }
            else
                current.Append(character);
        }

        fields.Add(current.ToString());
        return fields;
    }
}
