using Livekit.Server.Sdk.Dotnet;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public sealed class LiveKitRoomManager(
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    ILogger<LiveKitRoomManager> logger)
{
    public async Task<bool> DeleteAsync(string roomName)
    {
        var url = Environment.GetEnvironmentVariable("LIVEKIT_URL")
            ?? configuration["LiveKit:Url"];
        var key = Environment.GetEnvironmentVariable("LIVEKIT_API_KEY")
            ?? configuration["LiveKit:ApiKey"];
        var secret = Environment.GetEnvironmentVariable("LIVEKIT_API_SECRET")
            ?? configuration["LiveKit:ApiSecret"];
        if (string.IsNullOrWhiteSpace(url) ||
            string.IsNullOrWhiteSpace(key) ||
            string.IsNullOrWhiteSpace(secret))
        {
            logger.LogError("LiveKit não configurado; a sala {RoomName} não foi removida.", roomName);
            return false;
        }

        var serviceUrl = url
            .Replace("wss://", "https://", StringComparison.OrdinalIgnoreCase)
            .Replace("ws://", "http://", StringComparison.OrdinalIgnoreCase);
        try
        {
            var client = new RoomServiceClient(
                serviceUrl,
                key,
                secret,
                httpClientFactory.CreateClient(nameof(LiveKitRoomManager)));
            await client.DeleteRoom(new DeleteRoomRequest { Room = roomName });
            return true;
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Não foi possível remover a sala LiveKit {RoomName}; a operação será tentada novamente.",
                roomName);
            return false;
        }
    }
}

public sealed class VideoSessionCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<VideoSessionCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ExpireRooms(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Falha ao executar a expiração de salas.");
            }
        }
    }

    private async Task ExpireRooms(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MedSyncDbContext>();
        var rooms = await db.ConsultationRooms
            .Include(x => x.Appointment)
            .Where(x =>
                (x.Status == VideoSessionStatus.Ready ||
                 x.Status == VideoSessionStatus.InProgress) &&
                DateTime.UtcNow >
                x.Appointment.ScheduledAt.AddMinutes(x.Appointment.DurationMinutes + 15))
            .Take(50)
            .ToListAsync(cancellationToken);
        if (rooms.Count == 0)
            return;

        var liveKit = scope.ServiceProvider.GetRequiredService<LiveKitRoomManager>();
        foreach (var room in rooms)
        {
            if (!await liveKit.DeleteAsync(room.RoomName))
                continue;
            room.Status = VideoSessionStatus.Expired;
            room.EndedAt = DateTime.UtcNow;
            db.AuditEvents.Add(new AuditEvent
            {
                ClinicId = room.Appointment.ClinicId,
                Action = "Video.Expired",
                ResourceType = "Appointment",
                ResourceId = room.AppointmentId.ToString(),
                Result = "Success"
            });
        }
        await db.SaveChangesAsync(cancellationToken);
    }
}
