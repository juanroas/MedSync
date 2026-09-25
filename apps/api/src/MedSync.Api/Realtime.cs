using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace MedSync.Api;

// Real-time notifications (ADR-0004). The channel only says "something changed" ({ type, id }); screens reload
// through the normal API, where authorization lives. No clinical data travels here.
public static class Realtime
{
    public const string Scheme = "Realtime";
    public const string Audience = "MedSync.Realtime";
    public const string HubPath = "/hubs/events";
    public static readonly TimeSpan TicketLifetime = TimeSpan.FromMinutes(2);

    public static string UserGroup(Guid userId) => $"user:{userId:N}";
    public static string ClinicAdminsGroup(Guid clinicId) => $"clinic-admins:{clinicId:N}";
    public const string ClinicsGroup = "clinics";
    public const string SupportQueueGroup = "support-queue";
    public const string PrivacyQueueGroup = "privacy-queue";

    // Short-lived ticket with the caller's identity, valid only for opening the hub connection.
    public static string CreateTicket(ClaimsPrincipal principal, string secret, string issuer)
    {
        var keep = new[] { JwtRegisteredClaimNames.Sub, ClaimTypes.NameIdentifier, "clinic_id", "platform", ClaimTypes.Role };
        var claims = principal.Claims.Where(claim => keep.Contains(claim.Type)).ToList();
        var token = new JwtSecurityToken(
            issuer,
            Audience,
            claims,
            expires: DateTime.UtcNow.Add(TicketLifetime),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Server push only: clients never call hub methods and cannot choose their groups.
[Authorize(AuthenticationSchemes = Realtime.Scheme)]
public sealed class MedSyncHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var actor = RequestContext.From(Context.User!);
        var groups = new List<string> { Realtime.UserGroup(actor.UserId) };
        if (actor.HasAny(ClinicRole.ClinicAdmin))
            groups.Add(Realtime.ClinicAdminsGroup(actor.ClinicId));
        if (actor.IsMedicalAdmin || actor.IsSupport)
        {
            groups.Add(Realtime.ClinicsGroup);
            groups.Add(Realtime.SupportQueueGroup);
        }
        if (actor.IsDpo)
            groups.Add(Realtime.PrivacyQueueGroup);

        foreach (var group in groups)
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        await base.OnConnectedAsync();
    }
}

// Called after a status change is saved. Never fails the request: a missed push is covered by the screens'
// refresh-on-focus and fallback polling.
public sealed class RealtimeNotifier(IHubContext<MedSyncHub> hub, MedSyncDbContext db, ILogger<RealtimeNotifier> logger)
{
    public async Task AppointmentChangedAsync(Guid appointmentId, CancellationToken cancellationToken = default)
    {
        var target = await db.Appointments.AsNoTracking()
            .Where(x => x.Id == appointmentId)
            .Select(x => new { x.ClinicId, DoctorUserId = x.Doctor.UserId, PatientUserId = x.Patient.UserId })
            .SingleOrDefaultAsync(cancellationToken);
        if (target is null)
            return;
        var groups = new List<string> { Realtime.ClinicAdminsGroup(target.ClinicId) };
        if (target.DoctorUserId is { } doctor)
            groups.Add(Realtime.UserGroup(doctor));
        if (target.PatientUserId is { } patient)
            groups.Add(Realtime.UserGroup(patient));
        await SendAsync(groups, "appointmentChanged", appointmentId);
    }

    // Prescriptions are clinical: only the assigned doctor and the patient hear about them.
    public async Task PrescriptionChangedAsync(Guid prescriptionId, CancellationToken cancellationToken = default)
    {
        var target = await db.Prescriptions.AsNoTracking()
            .Where(x => x.Id == prescriptionId)
            .Select(x => new { DoctorUserId = x.Appointment.Doctor.UserId, PatientUserId = x.Appointment.Patient.UserId })
            .SingleOrDefaultAsync(cancellationToken);
        if (target is null)
            return;
        var groups = new List<string>();
        if (target.DoctorUserId is { } doctor)
            groups.Add(Realtime.UserGroup(doctor));
        if (target.PatientUserId is { } patient)
            groups.Add(Realtime.UserGroup(patient));
        await SendAsync(groups, "prescriptionChanged", prescriptionId);
    }

    public Task SupportRequestChangedAsync(Guid requestId, Guid? requesterUserId) =>
        SendAsync(
            requesterUserId is { } user ? [Realtime.SupportQueueGroup, Realtime.UserGroup(user)] : [Realtime.SupportQueueGroup],
            "supportRequestChanged",
            requestId);

    public Task PrivacyRequestChangedAsync(Guid requestId, Guid? requesterUserId) =>
        SendAsync(
            requesterUserId is { } user ? [Realtime.PrivacyQueueGroup, Realtime.UserGroup(user)] : [Realtime.PrivacyQueueGroup],
            "privacyRequestChanged",
            requestId);

    public Task ClinicChangedAsync(Guid clinicId) =>
        SendAsync([Realtime.ClinicsGroup, Realtime.ClinicAdminsGroup(clinicId)], "clinicChanged", clinicId);

    private async Task SendAsync(IReadOnlyList<string> groups, string type, Guid id)
    {
        if (groups.Count == 0)
            return;
        try
        {
            await hub.Clients.Groups(groups).SendAsync("event", new { type, id });
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Realtime push {Type} failed; screens will catch up on refresh.", type);
        }
    }
}
