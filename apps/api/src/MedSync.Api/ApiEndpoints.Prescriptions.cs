using System.Security.Claims;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace MedSync.Api;

// Medication search and prescriptions (.agents/rules/medical-documents.md). Only the assigned doctor writes;
// the patient reads what was signed. Nobody else sees prescription content (rule C1).
public static partial class ApiEndpoints
{
    private const int MaxPrescriptionItems = 20;

    private static void MapPrescriptionEndpoints(RouteGroupBuilder protectedApi)
    {
        protectedApi.MapGet("/medications", SearchMedications);
        protectedApi.MapPost("/medications", CreateMedication);
        protectedApi.MapGet("/appointments/{id:guid}/prescriptions", GetAppointmentPrescriptions);
        protectedApi.MapPost("/appointments/{id:guid}/prescriptions", CreatePrescription);
        protectedApi.MapGet("/prescriptions/{id:guid}", GetPrescriptionDocument);
        protectedApi.MapPut("/prescriptions/{id:guid}", UpdatePrescription);
        protectedApi.MapDelete("/prescriptions/{id:guid}", DeletePrescription);
        protectedApi.MapPost("/prescriptions/{id:guid}/sign", SignPrescription);
        protectedApi.MapGet("/prescriptions/{id:guid}/pdf", DownloadPrescriptionPdf);
        protectedApi.MapGet("/patients/{patientId:guid}/medications", GetPatientMedications);
    }

    // The certificate app returns the doctor's browser here after approval; the single-use state proves who started it.
    private static void MapSignatureCallback(IEndpointRouteBuilder app) =>
        app.MapGet("/signature/callback", CompletePrescriptionSignature).AllowAnonymous();

    private sealed record PendingSignature(Guid PrescriptionId, Guid UserId, Guid ClinicId, string Verifier);

    private static async Task<IResult> SearchMedications(
        string? q,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var terms = MedicationCatalogImporter.Normalize(q ?? "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (terms.Length == 0 || terms.Sum(x => x.Length) < 2)
            return Results.Ok(Array.Empty<MedicationSearchResponse>());

        var query = db.MedicationCatalog.AsNoTracking()
            .Where(x => x.ClinicId == null || x.ClinicId == actor.ClinicId);
        foreach (var term in terms.Take(4))
            query = query.Where(x => x.SearchText.Contains(term));

        var first = terms[0];
        var results = await query
            .OrderBy(x => x.SearchText.StartsWith(first) ? 0 : 1)
            .ThenBy(x => x.Source == MedicationSource.Custom ? 0 : 1)
            .ThenBy(x => x.Name.Length)
            .ThenBy(x => x.Name)
            .Take(20)
            .Select(x => new MedicationSearchResponse(x.Id, x.Name, x.ActiveIngredient, x.TherapeuticClass, x.Source))
            .ToListAsync(cancellationToken);
        return Results.Ok(results);
    }

    private static async Task<IResult> CreateMedication(
        CreateMedicationRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var name = request.Name?.Trim() ?? "";
        var ingredient = string.IsNullOrWhiteSpace(request.ActiveIngredient) ? null : request.ActiveIngredient.Trim();
        if (name.Length is < 2 or > 200)
            return Validation("name", "Informe o nome do medicamento (2 a 200 caracteres).");
        if (ingredient?.Length > 500)
            return Validation("activeIngredient", "O princípio ativo pode ter até 500 caracteres.");

        var searchText = MedicationCatalogImporter.BuildSearchText(name, ingredient);
        var existing = await db.MedicationCatalog.AsNoTracking()
            .Where(x => x.SearchText == searchText && (x.ClinicId == null || x.ClinicId == actor.ClinicId))
            .Select(x => new MedicationSearchResponse(x.Id, x.Name, x.ActiveIngredient, x.TherapeuticClass, x.Source))
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
            return Results.Ok(existing);

        var item = new MedicationCatalogItem
        {
            Name = name,
            ActiveIngredient = ingredient,
            Source = MedicationSource.Custom,
            ClinicId = actor.ClinicId,
            CreatedByUserId = actor.UserId,
            SearchText = searchText
        };
        db.MedicationCatalog.Add(item);
        audit.Add(actor, "Medication.CreateCustom", "MedicationCatalogItem", item.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/medications/{item.Id}",
            new MedicationSearchResponse(item.Id, item.Name, item.ActiveIngredient, item.TherapeuticClass, item.Source));
    }

    private static async Task<IResult> GetAppointmentPrescriptions(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, id, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!CanViewClinical(actor, appointment))
        {
            audit.Add(actor, "Prescription.List", "Appointment", id, "Denied", "Perfil sem acesso a receitas.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var doctorView = IsAssignedDoctor(actor, appointment);
        var prescriptions = await db.Prescriptions.AsNoTracking()
            .Include(x => x.Items)
            .Where(x => x.AppointmentId == id && x.Status != PrescriptionStatus.Cancelled)
            .Where(x => doctorView || x.Status == PrescriptionStatus.Signed)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
        return Results.Ok(prescriptions.Select(ToResponse));
    }

    private static async Task<IResult> CreatePrescription(
        Guid id,
        SavePrescriptionRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, id, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsAssignedDoctor(actor, appointment))
        {
            audit.Add(actor, "Prescription.Create", "Appointment", id, "Denied", "Só o médico da consulta emite receita.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        if (appointment.Status == AppointmentStatus.Cancelled)
            return Validation("appointment", "Consulta cancelada não recebe receita.");
        if (ValidatePrescription(request) is { } invalid)
            return invalid;

        if (request.RenewedFromId is { } renewedFromId)
        {
            var sourceAllowed = await db.Prescriptions.AsNoTracking()
                .AnyAsync(x => x.Id == renewedFromId && x.ClinicId == actor.ClinicId && x.PatientId == appointment.PatientId,
                    cancellationToken);
            if (!sourceAllowed)
                return Validation("renewedFromId", "Receita de origem não encontrada para este paciente.");
        }

        var prescription = new Prescription
        {
            ClinicId = appointment.ClinicId,
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            CreatedByUserId = actor.UserId,
            RenewedFromId = request.RenewedFromId
        };
        ApplyPrescription(prescription, request);
        db.Prescriptions.Add(prescription);
        audit.Add(actor, request.RenewedFromId is null ? "Prescription.Create" : "Prescription.Renew", "Prescription", prescription.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/prescriptions/{prescription.Id}", ToResponse(prescription));
    }

    private static async Task<IResult> UpdatePrescription(
        Guid id,
        SavePrescriptionRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var prescription = await LoadDoctorPrescription(db, actor, id, cancellationToken);
        if (prescription is null)
            return Results.NotFound();
        if (prescription.Status != PrescriptionStatus.Draft)
            return Results.Conflict(new { message = "Receita assinada não pode ser alterada. Crie uma nova receita." });
        if (ValidatePrescription(request) is { } invalid)
            return invalid;

        db.PrescriptionItems.RemoveRange(prescription.Items);
        prescription.Items.Clear();
        ApplyPrescription(prescription, request);
        prescription.UpdatedAt = DateTime.UtcNow;
        audit.Add(actor, "Prescription.Update", "Prescription", prescription.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(prescription));
    }

    private static async Task<IResult> DeletePrescription(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var prescription = await LoadDoctorPrescription(db, actor, id, cancellationToken);
        if (prescription is null)
            return Results.NotFound();
        if (prescription.Status != PrescriptionStatus.Draft)
            return Results.Conflict(new { message = "Receita assinada não pode ser excluída." });

        db.Prescriptions.Remove(prescription);
        audit.Add(actor, "Prescription.DeleteDraft", "Prescription", prescription.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetPrescriptionDocument(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var prescription = await db.Prescriptions.AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .Include(x => x.Appointment).ThenInclude(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Id == id && x.Status != PrescriptionStatus.Cancelled, cancellationToken);
        if (prescription is null)
            return Results.NotFound();

        var appointment = prescription.Appointment;
        var allowed = IsAssignedDoctor(actor, appointment) ||
                      (IsPatient(actor, appointment) && prescription.Status == PrescriptionStatus.Signed);
        if (!allowed)
        {
            audit.Add(actor, "Prescription.View", "Prescription", id, "Denied", "Perfil sem acesso a esta receita.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.NotFound();
        }

        audit.Add(actor, "Prescription.View", "Prescription", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new PrescriptionDocumentResponse(
            ToResponse(prescription),
            appointment.Doctor.Name,
            appointment.Doctor.Crm,
            appointment.Doctor.CrmUf,
            appointment.Doctor.Specialty,
            appointment.Doctor.ProfessionalAddress,
            appointment.Clinic.Name,
            appointment.Patient.Name,
            appointment.Patient.Cpf,
            IsAssignedDoctor(actor, appointment) ? appointment.Patient.Phone : null,
            appointment.ScheduledAt,
            MissingForSignature(prescription, appointment.Doctor),
            IsSignatureConfigured()));
    }

    private static async Task<IResult> SignPrescription(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IntegraIcpSignatureProvider signatureProvider,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var prescription = await LoadDoctorPrescription(db, actor, id, cancellationToken);
        if (prescription is null)
            return Results.NotFound();
        if (prescription.Status != PrescriptionStatus.Draft)
            return Results.Conflict(new { message = "Esta receita já foi assinada." });

        var doctor = await db.Doctors.AsNoTracking().SingleAsync(x => x.Id == prescription.DoctorId, cancellationToken);
        var missing = MissingForSignature(prescription, doctor);
        if (missing.Count > 0)
            return Validation("prescription", $"Antes de assinar: {string.Join("; ", missing)}.");

        // D1: the signature is the doctor's own ICP-Brasil cloud certificate (IntegraICP). Without a channel, nothing signs.
        if (!IsSignatureConfigured())
        {
            audit.Add(actor, "Prescription.Sign", "Prescription", id, "Denied", "Assinatura digital ainda não configurada.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Conflict(new
            {
                message = "A assinatura digital ICP-Brasil (certificado em nuvem VIDaaS) ainda não está ativa no MedSync. " +
                          "Você pode imprimir o rascunho para conferência, mas ele não tem validade."
            });
        }

        var (verifier, challenge) = IntegraIcpSignatureProvider.CreatePkcePair();
        var state = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        await cache.SetStringAsync(
            $"signature:{state}",
            JsonSerializer.Serialize(new PendingSignature(prescription.Id, actor.UserId, actor.ClinicId, verifier)),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) },
            cancellationToken);
        audit.Add(actor, "Prescription.SignStart", "Prescription", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { authorizationUrl = signatureProvider.BuildAuthorizationUrl(challenge, state) });
    }

    private static async Task<IResult> CompletePrescriptionSignature(
        string? state,
        string? credentialId,
        MedSyncDbContext db,
        AuditWriter audit,
        IntegraIcpSignatureProvider signatureProvider,
        ClinicalAttachmentStorage storage,
        IDistributedCache cache,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var frontend = (Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0].TrimEnd('/');
        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(credentialId))
            return Results.Redirect($"{frontend}/consultas?assinatura=invalida");

        // Single use: read and drop the pending signature before doing anything else.
        var key = $"signature:{state}";
        var pendingJson = await cache.GetStringAsync(key, cancellationToken);
        await cache.RemoveAsync(key, cancellationToken);
        if (pendingJson is null)
            return Results.Redirect($"{frontend}/consultas?assinatura=expirada");

        var pending = JsonSerializer.Deserialize<PendingSignature>(pendingJson)!;
        var actor = new RequestContext(pending.UserId, pending.ClinicId, new HashSet<ClinicRole> { ClinicRole.Doctor });
        var prescription = await db.Prescriptions
            .Include(x => x.Items)
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .Include(x => x.Appointment).ThenInclude(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Id == pending.PrescriptionId, cancellationToken);
        var documentUrl = $"{frontend}/receita/{pending.PrescriptionId}";
        if (prescription is null ||
            prescription.Status != PrescriptionStatus.Draft ||
            prescription.Appointment.Doctor.UserId != pending.UserId)
            return Results.Redirect($"{documentUrl}?assinatura=invalida");

        try
        {
            var appointment = prescription.Appointment;
            var signedAt = DateTime.UtcNow;
            var document = PrescriptionPdf.Render(new PrescriptionPdfData(
                prescription.Id,
                prescription.Kind,
                appointment.Doctor.Name,
                appointment.Doctor.Crm,
                appointment.Doctor.CrmUf,
                appointment.Doctor.Specialty,
                appointment.Doctor.ProfessionalAddress!,
                appointment.Clinic.Name,
                appointment.Patient.Name,
                appointment.Patient.Cpf,
                prescription.PatientLocation!,
                prescription.Notes,
                signedAt,
                prescription.Items.ToList()));
            var signer = new RemoteDigitalSigner(signatureProvider.CreateSigner(credentialId, pending.Verifier), cancellationToken);
            var pdf = await PrescriptionPdf.SignAsync(document, signer, prescription.PatientLocation!);
            var (storageKey, sha256) = await storage.SaveGeneratedAsync(
                prescription.ClinicId, "prescriptions", $"{prescription.Id:N}.pdf", pdf, cancellationToken);

            prescription.Status = PrescriptionStatus.Signed;
            prescription.SignedAt = signedAt;
            prescription.SignedDocumentKey = storageKey;
            prescription.SignedDocumentSha256 = sha256;
            prescription.UpdatedAt = signedAt;
            audit.Add(actor, "Prescription.Sign", "Prescription", prescription.Id);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Redirect($"{documentUrl}?assinatura=ok");
        }
        catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException)
        {
            loggerFactory.CreateLogger("PrescriptionSignature").LogWarning(exception, "Prescription signature failed.");
            audit.Add(actor, "Prescription.Sign", "Prescription", prescription.Id, "Failed", "Falha no provedor de assinatura.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Redirect($"{documentUrl}?assinatura=falhou");
        }
    }

    private static async Task<IResult> DownloadPrescriptionPdf(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        ClinicalAttachmentStorage storage,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var prescription = await db.Prescriptions.AsNoTracking()
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .SingleOrDefaultAsync(x => x.Id == id && x.Status == PrescriptionStatus.Signed, cancellationToken);
        if (prescription?.SignedDocumentKey is null ||
            !(IsAssignedDoctor(actor, prescription.Appointment) || IsPatient(actor, prescription.Appointment)))
            return Results.NotFound();

        var path = storage.GetAbsolutePath(prescription.SignedDocumentKey);
        if (!File.Exists(path))
            return Results.NotFound();
        audit.Add(actor, "Prescription.DownloadPdf", "Prescription", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.File(path, "application/pdf", $"receita-{prescription.SignedAt:yyyyMMdd}.pdf");
    }

    private static async Task<IResult> GetPatientMedications(
        Guid patientId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var patient = await db.Patients.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == patientId && x.ClinicId == actor.ClinicId, cancellationToken);
        if (patient is null)
            return Results.NotFound();

        var isSelf = actor.HasAny(ClinicRole.Patient) && patient.UserId == actor.UserId;
        if (!isSelf && !await CanViewPatientClinicalHistory(db, actor, patientId, cancellationToken))
        {
            audit.Add(actor, "Prescription.MedicationsInUse", "Patient", patientId, "Denied", "Perfil sem acesso às medicações do paciente.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        // Continuous-use items from the patient's prescriptions, newest first, one line per medication.
        // The patient only sees signed prescriptions; the doctor also sees drafts.
        var rows = await db.PrescriptionItems.AsNoTracking()
            .Where(x => x.ContinuousUse &&
                        x.Prescription.ClinicId == actor.ClinicId &&
                        x.Prescription.PatientId == patientId &&
                        (x.Prescription.Status == PrescriptionStatus.Signed ||
                         (!isSelf && x.Prescription.Status == PrescriptionStatus.Draft)))
            .OrderByDescending(x => x.Prescription.CreatedAt)
            .Select(x => new
            {
                x.MedicationName,
                x.Dosage,
                x.Instructions,
                x.Prescription.CreatedAt,
                DoctorName = x.Prescription.Appointment.Doctor.Name,
                x.PrescriptionId
            })
            .Take(200)
            .ToListAsync(cancellationToken);

        var items = rows
            .GroupBy(x => MedicationCatalogImporter.Normalize(x.MedicationName))
            .Select(group => group.First())
            .Select(x => new MedicationInUseResponse(x.MedicationName, x.Dosage, x.Instructions, x.CreatedAt, x.DoctorName, x.PrescriptionId))
            .ToList();

        audit.Add(actor, "Prescription.MedicationsInUse", "Patient", patientId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new PatientMedicationsResponse(items, patient.ContinuousMedications));
    }

    private static Task<Prescription?> LoadDoctorPrescription(
        MedSyncDbContext db,
        RequestContext actor,
        Guid id,
        CancellationToken cancellationToken)
    {
        if (!actor.HasAny(ClinicRole.Doctor))
            return Task.FromResult<Prescription?>(null);

        return db.Prescriptions
            .Include(x => x.Items)
            .SingleOrDefaultAsync(
                x => x.Id == id &&
                     x.Status != PrescriptionStatus.Cancelled &&
                     x.Appointment.Doctor.UserId == actor.UserId,
                cancellationToken);
    }

    private static IResult? ValidatePrescription(SavePrescriptionRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
            return Validation("items", "Inclua pelo menos um medicamento.");
        if (request.Items.Count > MaxPrescriptionItems)
            return Validation("items", $"Uma receita pode ter até {MaxPrescriptionItems} itens.");
        if (request.PatientLocation?.Length > 200)
            return Validation("patientLocation", "O local informado pode ter até 200 caracteres.");
        if (request.Notes?.Length > 1000)
            return Validation("notes", "As orientações podem ter até 1000 caracteres.");

        foreach (var item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.MedicationName) || item.MedicationName.Trim().Length > 200)
                return Validation("items", "Cada item precisa do nome do medicamento (até 200 caracteres).");
            if (string.IsNullOrWhiteSpace(item.Instructions) || item.Instructions.Trim().Length > 500)
                return Validation("items", $"Informe como usar {item.MedicationName.Trim()} (até 500 caracteres).");
            if (item.Dosage?.Length > 120 || item.Quantity?.Length > 120)
                return Validation("items", "Dose e quantidade podem ter até 120 caracteres.");
        }

        return null;
    }

    private static void ApplyPrescription(Prescription prescription, SavePrescriptionRequest request)
    {
        prescription.Kind = request.Kind;
        prescription.PatientLocation = string.IsNullOrWhiteSpace(request.PatientLocation) ? null : request.PatientLocation.Trim();
        prescription.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        var position = 0;
        foreach (var item in request.Items)
        {
            prescription.Items.Add(new PrescriptionItem
            {
                Position = position++,
                CatalogItemId = item.CatalogItemId,
                MedicationName = item.MedicationName.Trim(),
                Dosage = string.IsNullOrWhiteSpace(item.Dosage) ? null : item.Dosage.Trim(),
                Instructions = item.Instructions.Trim(),
                Quantity = string.IsNullOrWhiteSpace(item.Quantity) ? null : item.Quantity.Trim(),
                ContinuousUse = item.ContinuousUse
            });
        }
    }

    // CFM 2.314 art. 13 (rule D2): what the document still lacks before it can be signed.
    private static List<string> MissingForSignature(Prescription prescription, Doctor doctor)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(doctor.Crm) || string.IsNullOrWhiteSpace(doctor.CrmUf))
            missing.Add("cadastre seu CRM e UF em Meu perfil");
        if (string.IsNullOrWhiteSpace(doctor.ProfessionalAddress))
            missing.Add("cadastre seu endereço profissional em Meu perfil");
        if (string.IsNullOrWhiteSpace(prescription.PatientLocation))
            missing.Add("informe onde o paciente está durante a consulta");
        return missing;
    }

    private static bool IsSignatureConfigured() => IntegraIcpSignatureProvider.IsConfigured;

    private static PrescriptionResponse ToResponse(Prescription prescription) =>
        new(
            prescription.Id,
            prescription.AppointmentId,
            prescription.Kind,
            prescription.Status,
            prescription.PatientLocation,
            prescription.Notes,
            prescription.RenewedFromId,
            prescription.CreatedAt,
            prescription.UpdatedAt,
            prescription.SignedAt,
            prescription.Items
                .OrderBy(x => x.Position)
                .Select(x => new PrescriptionItemResponse(x.Id, x.CatalogItemId, x.MedicationName, x.Dosage, x.Instructions, x.Quantity, x.ContinuousUse))
                .ToList());
}
