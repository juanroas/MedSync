using System.Security.Claims;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

// Rule C3 (.agents/rules/clinical-data-access.md): the Médico ADM MedSync opens a record that is not from their own
// care only with a registered reason. The grant lasts 30 minutes, is read-only, and every read is audited; the DPO
// sees every grant and the patient sees who opened their record.
public static partial class ApiEndpoints
{
    private static readonly TimeSpan ClinicalAccessDuration = TimeSpan.FromMinutes(30);

    private static void MapClinicalAccessEndpoints(RouteGroupBuilder protectedApi)
    {
        protectedApi.MapGet("/clinical-access/patients", FindPatientForClinicalAccess);
        protectedApi.MapPost("/clinical-access", CreateClinicalAccess);
        protectedApi.MapGet("/clinical-access/grants", GetClinicalAccessGrants);
        protectedApi.MapGet("/clinical-access/grants/{id:guid}/records", GetClinicalAccessRecords);
        protectedApi.MapGet("/me/clinical-access", GetMyClinicalAccessLog);
    }

    // Lookup by the full CPF only, so the Médico ADM never browses a list of patients.
    private static async Task<IResult> FindPatientForClinicalAccess(
        string? cpf,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsMedicalAdmin)
            return Results.Forbid();
        var digits = DigitsOnly(cpf ?? "");
        if (!IsValidCpf(digits))
            return Validation("cpf", "Informe o CPF completo do paciente.");

        var patients = await db.Patients.AsNoTracking()
            .Where(x => x.Cpf == digits)
            .Select(x => new ClinicalAccessPatientResponse(x.Id, x.Name, x.Cpf, x.Clinic.Name))
            .ToListAsync(cancellationToken);
        audit.Add(actor, "ClinicalAccess.PatientLookup", "Patient", null, patients.Count > 0 ? "Success" : "NotFound");
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(patients.Select(x => x with { CpfMasked = SecurityText.MaskCpf(x.CpfMasked) }));
    }

    private static async Task<IResult> CreateClinicalAccess(
        CreateClinicalAccessRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsMedicalAdmin)
        {
            audit.Add(actor, "ClinicalAccess.Grant", "Patient", request.PatientId, "Denied", "Perfil sem acesso por justificativa.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        if (!Enum.IsDefined(request.Reason))
            return Validation("reason", "Escolha o motivo do acesso.");
        var justification = (request.Justification ?? "").Trim();
        if (justification.Length is < 30 or > 1000)
            return Validation("justification", "Descreva a finalidade com 30 a 1000 caracteres.");
        if (!request.Declaration)
            return Validation("declaration", "Confirme a declaração de finalidade e sigilo.");

        var patient = await db.Patients.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.PatientId, cancellationToken);
        if (patient is null)
            return Results.NotFound();
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Id == actor.UserId, cancellationToken);

        var now = DateTime.UtcNow;
        var grant = new ClinicalAccessGrant
        {
            ActorUserId = actor.UserId,
            ActorName = user.Name,
            PatientId = patient.Id,
            PatientClinicId = patient.ClinicId,
            Reason = request.Reason,
            Justification = justification,
            CreatedAt = now,
            ExpiresAt = now + ClinicalAccessDuration
        };
        db.ClinicalAccessGrants.Add(grant);
        // The audit keeps the reason category; the free text stays in the grant, shown only to the DPO.
        audit.Add(actor, "ClinicalAccess.Grant", "Patient", patient.Id, "Success", $"Motivo: {request.Reason}. Acesso {grant.Id}.");
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/clinical-access/grants/{grant.Id}", await GrantResponseAsync(db, grant.Id, cancellationToken));
    }

    private static async Task<ClinicalAccessGrantResponse> GrantResponseAsync(MedSyncDbContext db, Guid id, CancellationToken cancellationToken) =>
        await GrantQuery(db.ClinicalAccessGrants.AsNoTracking().Where(x => x.Id == id)).SingleAsync(cancellationToken);

    private static IQueryable<ClinicalAccessGrantResponse> GrantQuery(IQueryable<ClinicalAccessGrant> grants)
    {
        var now = DateTime.UtcNow;
        return grants
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ClinicalAccessGrantResponse(
                x.Id,
                x.PatientId,
                x.Patient.Name,
                x.Patient.Clinic.Name,
                x.ActorName,
                x.Reason,
                x.Justification,
                x.CreatedAt,
                x.ExpiresAt,
                x.ExpiresAt > now));
    }

    // Médico ADM: their own grants. DPO: every grant (metadata and the stated purpose, never record content).
    private static async Task<IResult> GetClinicalAccessGrants(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsMedicalAdmin && !actor.IsDpo)
            return Results.Forbid();
        var source = db.ClinicalAccessGrants.AsNoTracking();
        if (!actor.IsDpo)
        {
            var userId = actor.UserId;
            source = source.Where(x => x.ActorUserId == userId);
        }
        var grants = await GrantQuery(source).Take(200).ToListAsync(cancellationToken);
        audit.Add(actor, "ClinicalAccess.List", "ClinicalAccessGrant", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(grants);
    }

    private static async Task<IResult> GetClinicalAccessRecords(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var grant = await db.ClinicalAccessGrants.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (grant is null || !actor.IsMedicalAdmin || grant.ActorUserId != actor.UserId)
        {
            audit.Add(actor, "ClinicalRecord.ReadByGrant", "ClinicalAccessGrant", id, "Denied", "Acesso inexistente ou de outra pessoa.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.NotFound();
        }
        if (grant.ExpiresAt <= DateTime.UtcNow)
        {
            audit.Add(actor, "ClinicalRecord.ReadByGrant", "Patient", grant.PatientId, "Denied", $"Acesso {grant.Id} expirado.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Conflict(new { message = "O acesso de 30 minutos terminou. Registre um novo pedido com justificativa." });
        }

        var records = await db.Appointments.AsNoTracking()
            .Where(x => x.ClinicId == grant.PatientClinicId && x.PatientId == grant.PatientId && x.ClinicalRecord != null)
            .OrderByDescending(x => x.ScheduledAt)
            .Select(x => new PatientClinicalRecordResponse(
                x.ClinicalRecord!.Id,
                x.Id,
                x.PatientId,
                x.Patient.Name,
                x.Doctor.Name,
                x.Doctor.Specialty,
                x.ScheduledAt,
                x.ClinicalRecord.Content,
                x.ClinicalRecord.Version,
                x.ClinicalRecord.CreatedAt,
                x.ClinicalRecord.UpdatedAt))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "ClinicalRecord.ReadByGrant", "Patient", grant.PatientId, "Success", $"Acesso {grant.Id}.");
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new ClinicalAccessRecordsResponse(await GrantResponseAsync(db, grant.Id, cancellationToken), records));
    }

    // Patient: who opened their record through a justified access (CFM 2.314 art. 3º §6; LGPD art. 18).
    private static async Task<IResult> GetMyClinicalAccessLog(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Patient))
            return Results.Forbid();
        var userId = actor.UserId;
        var entries = await db.ClinicalAccessGrants.AsNoTracking()
            .Where(x => x.Patient.UserId == userId && x.PatientClinicId == actor.ClinicId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new PatientClinicalAccessEntry(x.CreatedAt, x.ActorName, "Médico ADM MedSync", x.Reason))
            .ToListAsync(cancellationToken);
        return Results.Ok(entries);
    }
}
