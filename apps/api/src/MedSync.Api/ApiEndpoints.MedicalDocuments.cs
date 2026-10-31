using System.Security.Claims;
using System.Text.Json;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace MedSync.Api;

// Laudos and the attendance declaration (28/10/2026, .agents/rules/medical-documents.md). Only the assigned doctor
// writes and signs; the patient sees a document only after it is signed. A laudo is clinical content (rule C1): the
// front desk never reads it. The signed attendance declaration is not clinical, so the front desk downloads it too.
public static partial class ApiEndpoints
{
    private const int MaxReportBodyLength = 8000;

    private static void MapMedicalDocumentEndpoints(RouteGroupBuilder protectedApi)
    {
        protectedApi.MapGet("/appointments/{id:guid}/medical-documents", GetAppointmentMedicalDocuments);
        protectedApi.MapPost("/appointments/{id:guid}/medical-documents", CreateMedicalDocument);
        protectedApi.MapGet("/appointments/{id:guid}/documents", GetAppointmentDocuments);
        protectedApi.MapGet("/medical-documents/{id:guid}", GetMedicalDocumentPage);
        protectedApi.MapPut("/medical-documents/{id:guid}", UpdateMedicalDocument);
        protectedApi.MapDelete("/medical-documents/{id:guid}", DeleteMedicalDocument);
        protectedApi.MapPost("/medical-documents/{id:guid}/sign", SignMedicalDocument);
        protectedApi.MapGet("/medical-documents/{id:guid}/pdf", DownloadMedicalDocumentPdf);
    }

    private static async Task<IResult> GetAppointmentMedicalDocuments(
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
            audit.Add(actor, "MedicalDocument.List", "Appointment", id, "Denied", "Perfil sem acesso aos documentos médicos.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var doctorView = IsAssignedDoctor(actor, appointment);
        var documents = await db.MedicalDocuments.AsNoTracking()
            .Where(x => x.AppointmentId == id && (doctorView || x.Status == MedicalDocumentStatus.Signed))
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        DateTime? suggestedStart = null, suggestedEnd = null;
        string? suggestedLocation = null;
        if (doctorView)
        {
            (suggestedStart, suggestedEnd) = AttendanceTimes(appointment);
            suggestedLocation = documents.Select(x => x.PatientLocation).LastOrDefault(x => x is not null) ??
                await db.Prescriptions.AsNoTracking()
                    .Where(x => x.AppointmentId == id && x.PatientLocation != null)
                    .OrderByDescending(x => x.CreatedAt)
                    .Select(x => x.PatientLocation)
                    .FirstOrDefaultAsync(cancellationToken);
        }

        audit.Add(actor, "MedicalDocument.List", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new AppointmentMedicalDocumentsResponse(
            documents.Select(ToResponse).ToList(), suggestedStart, suggestedEnd, suggestedLocation));
    }

    // "Documentos da consulta": the signed prescriptions and documents, for the patient (and the doctor) to download.
    private static async Task<IResult> GetAppointmentDocuments(
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
            audit.Add(actor, "Appointment.Documents", "Appointment", id, "Denied", "Perfil sem acesso aos documentos da consulta.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var prescriptions = await db.Prescriptions.AsNoTracking()
            .Where(x => x.AppointmentId == id && x.Status == PrescriptionStatus.Signed)
            .Select(x => new { x.Id, x.Kind, x.SignedAt, x.SignatureSimulated })
            .ToListAsync(cancellationToken);
        var documents = await db.MedicalDocuments.AsNoTracking()
            .Where(x => x.AppointmentId == id && x.Status == MedicalDocumentStatus.Signed)
            .Select(x => new { x.Id, x.Kind, x.Title, x.SignedAt, x.SignatureSimulated })
            .ToListAsync(cancellationToken);

        var items = prescriptions
            .Select(x => new AppointmentDocumentItem(
                "Prescription",
                x.Id,
                x.Kind switch
                {
                    PrescriptionKind.Antimicrobial => "Receita de antimicrobiano",
                    PrescriptionKind.ControlledSpecial => "Receita de controle especial",
                    _ => "Receita"
                },
                x.SignedAt ?? DateTime.UtcNow,
                x.SignatureSimulated,
                $"prescriptions/{x.Id}/pdf",
                "receita.pdf"))
            .Concat(documents.Select(x => new AppointmentDocumentItem(
                "MedicalDocument",
                x.Id,
                x.Title,
                x.SignedAt ?? DateTime.UtcNow,
                x.SignatureSimulated,
                $"medical-documents/{x.Id}/pdf",
                x.Kind == MedicalDocumentKind.AttendanceDeclaration ? "declaracao-de-comparecimento.pdf" : "documento-medico.pdf")))
            .OrderBy(x => x.IssuedAt)
            .ToList();

        audit.Add(actor, "Appointment.Documents", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(items);
    }

    private static async Task<IResult> CreateMedicalDocument(
        Guid id,
        SaveMedicalDocumentRequest request,
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
            audit.Add(actor, "MedicalDocument.Create", "Appointment", id, "Denied", "Só o médico da consulta emite documentos.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var document = new MedicalDocument
        {
            ClinicId = appointment.ClinicId,
            AppointmentId = appointment.Id,
            PatientId = appointment.PatientId,
            DoctorId = appointment.DoctorId,
            CreatedByUserId = actor.UserId,
            Kind = request.Kind,
            Title = ""
        };
        if (await ValidateMedicalDocument(db, appointment, request, null, cancellationToken) is { } invalid)
            return invalid;

        ApplyMedicalDocument(document, request);
        db.MedicalDocuments.Add(document);
        audit.Add(actor, "MedicalDocument.Create", "MedicalDocument", document.Id, "Success", document.Kind.ToString());
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/medical-documents/{document.Id}", ToResponse(document));
    }

    private static async Task<IResult> UpdateMedicalDocument(
        Guid id,
        SaveMedicalDocumentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var document = await LoadMedicalDocument(db, actor.ClinicId, id, cancellationToken, tracking: true);
        if (document is null || !IsAssignedDoctor(actor, document.Appointment))
            return Results.NotFound();
        if (document.Status != MedicalDocumentStatus.Draft)
            return Results.Conflict(new { message = "Documento assinado não pode ser alterado. Crie um novo documento." });
        if (request.Kind != document.Kind)
            return Validation("kind", "O tipo do documento não muda depois de criado.");
        if (await ValidateMedicalDocument(db, document.Appointment, request, document.Id, cancellationToken) is { } invalid)
            return invalid;

        ApplyMedicalDocument(document, request);
        document.UpdatedAt = DateTime.UtcNow;
        audit.Add(actor, "MedicalDocument.Update", "MedicalDocument", document.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(document));
    }

    private static async Task<IResult> DeleteMedicalDocument(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var document = await LoadMedicalDocument(db, actor.ClinicId, id, cancellationToken, tracking: true);
        if (document is null || !IsAssignedDoctor(actor, document.Appointment))
            return Results.NotFound();
        if (document.Status != MedicalDocumentStatus.Draft)
            return Results.Conflict(new { message = "Documento assinado não pode ser excluído." });

        db.MedicalDocuments.Remove(document);
        audit.Add(actor, "MedicalDocument.DeleteDraft", "MedicalDocument", document.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetMedicalDocumentPage(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        SignatureProviderAccessor providers,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var document = await LoadMedicalDocument(db, actor.ClinicId, id, cancellationToken);
        if (document is null)
            return Results.NotFound();
        var appointment = document.Appointment;
        var allowed = IsAssignedDoctor(actor, appointment) ||
                      (IsPatient(actor, appointment) && document.Status == MedicalDocumentStatus.Signed);
        if (!allowed)
        {
            audit.Add(actor, "MedicalDocument.View", "MedicalDocument", id, "Denied", "Perfil sem acesso a este documento.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.NotFound();
        }

        audit.Add(actor, "MedicalDocument.View", "MedicalDocument", id);
        await db.SaveChangesAsync(cancellationToken);
        var clinic = appointment.Clinic;
        var patient = appointment.Patient;
        return Results.Ok(new MedicalDocumentPageResponse(
            ToResponse(document),
            appointment.Doctor.Name,
            appointment.Doctor.Crm,
            appointment.Doctor.CrmUf,
            appointment.Doctor.Specialty,
            appointment.Doctor.Rqe,
            DoctorAddress(appointment),
            clinic.Name,
            clinic.LegalName,
            clinic.TaxId,
            clinic.FormattedAddress(),
            clinic.Phone,
            clinic.AddressCity,
            patient.Name,
            string.IsNullOrWhiteSpace(patient.SocialName) ? null : patient.SocialName,
            patient.Cpf,
            patient.BirthDate,
            appointment.Modality,
            MissingForSignature(document),
            providers.Current is not null));
    }

    private static async Task<IResult> DownloadMedicalDocumentPdf(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        ClinicalAttachmentStorage storage,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var document = await LoadMedicalDocument(db, actor.ClinicId, id, cancellationToken);
        if (document is null)
            return Results.NotFound();
        var appointment = document.Appointment;
        var signed = document.Status == MedicalDocumentStatus.Signed;
        var doctor = IsAssignedDoctor(actor, appointment);
        // The front desk only downloads the signed declaration, never a laudo.
        var frontDesk = !actor.IsPlatformStaff &&
                        actor.HasAny(AccessRules.ManageAppointments) &&
                        document.Kind == MedicalDocumentKind.AttendanceDeclaration;
        if (!(doctor || (signed && (IsPatient(actor, appointment) || frontDesk))))
        {
            audit.Add(actor, "MedicalDocument.DownloadPdf", "MedicalDocument", id, "Denied", "Perfil sem acesso a este documento.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.NotFound();
        }

        var fileName = MedicalDocumentFileName(document);
        if (!signed)
        {
            // Draft preview for the doctor: rendered on the fly with the "rascunho, sem validade" mark.
            var preview = MedicalDocumentPdf.Render(MedicalDocumentData(document, DateTime.UtcNow, simulated: false, draft: true));
            using var output = new MemoryStream();
            await preview.SaveAsync(output, false);
            audit.Add(actor, "MedicalDocument.DownloadPdf", "MedicalDocument", id, "Success", "Rascunho.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.File(output.ToArray(), "application/pdf", fileName.Replace(".pdf", "-rascunho.pdf"));
        }

        var path = document.SignedDocumentKey is null ? null : storage.GetAbsolutePath(document.SignedDocumentKey);
        if (path is null || !File.Exists(path))
            return Results.NotFound();
        audit.Add(actor, "MedicalDocument.DownloadPdf", "MedicalDocument", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.File(path, "application/pdf", fileName);
    }

    private static async Task<IResult> SignMedicalDocument(
        Guid id,
        SignPrescriptionRequest? request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        SignatureProviderAccessor providers,
        SigningSessionStore sessions,
        ClinicalAttachmentStorage storage,
        IDistributedCache cache,
        ILoggerFactory loggerFactory,
        RealtimeNotifier realtime,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var document = await LoadMedicalDocument(db, actor.ClinicId, id, cancellationToken, tracking: true);
        if (document is null || document.Appointment.Doctor.UserId != actor.UserId || !actor.HasAny(ClinicRole.Doctor))
            return Results.NotFound();
        if (document.Status != MedicalDocumentStatus.Draft)
            return Results.Conflict(new { message = "Este documento já foi assinado." });

        var missing = MissingForSignature(document);
        if (missing.Count > 0)
            return Validation("document", $"Antes de assinar: {string.Join("; ", missing)}.");

        // D1: the doctor's own ICP-Brasil cloud certificate. Without a provider, nothing signs.
        var provider = providers.Current;
        if (provider is null)
        {
            audit.Add(actor, "MedicalDocument.Sign", "MedicalDocument", id, "Denied", "Assinatura digital ainda não configurada.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Conflict(new
            {
                message = "A assinatura digital ICP-Brasil (certificado em nuvem VIDaaS) ainda não está ativa no MedSync. " +
                          "O paciente só recebe o documento depois de assinado."
            });
        }

        // The same approval signs prescriptions and documents: one click while it lasts.
        var session = await sessions.GetAsync(actor.UserId, cancellationToken);
        if (session is not null && session.Provider == provider.Name)
        {
            try
            {
                await SignMedicalDocumentWithSessionAsync(realtime, db, audit, storage, provider, session, document, actor, cancellationToken);
                return Results.Ok(new { signed = true, simulated = session.Simulated });
            }
            catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException)
            {
                loggerFactory.CreateLogger("MedicalDocumentSignature").LogWarning(exception, "Signing session rejected; asking the doctor again.");
                await sessions.RemoveAsync(actor.UserId, cancellationToken);
            }
        }

        var lifetime = TimeSpan.FromHours(Math.Clamp(request?.LifetimeHours ?? 8, 1, 24));
        var (verifier, challenge) = IntegraIcpSignatureProvider.CreatePkcePair();
        var state = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        await cache.SetStringAsync(
            $"signature:{state}",
            JsonSerializer.Serialize(new PendingSignature(document.Id, actor.UserId, actor.ClinicId, verifier, lifetime.TotalHours, SignatureTarget.MedicalDocument)),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) },
            cancellationToken);
        audit.Add(actor, "MedicalDocument.SignStart", "MedicalDocument", id, "Success", provider.Simulated ? "Simulador de assinatura." : null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { authorizationUrl = provider.BuildAuthorizationUrl(challenge, state, lifetime) });
    }

    // Called by the signature callback once the doctor approved in the certificate app.
    private static async Task<IResult> CompleteMedicalDocumentSignature(
        PendingSignature pending,
        string? credentialId,
        string? error,
        ICloudSignatureProvider provider,
        MedSyncDbContext db,
        AuditWriter audit,
        SigningSessionStore sessions,
        ClinicalAttachmentStorage storage,
        ILoggerFactory loggerFactory,
        RealtimeNotifier realtime,
        string frontend,
        CancellationToken cancellationToken)
    {
        var actor = new RequestContext(pending.UserId, pending.ClinicId, new HashSet<ClinicRole> { ClinicRole.Doctor });
        var documentUrl = $"{frontend}/documento/{pending.TargetId}";
        if (!string.IsNullOrWhiteSpace(error) || string.IsNullOrWhiteSpace(credentialId))
        {
            audit.Add(actor, "MedicalDocument.Sign", "MedicalDocument", pending.TargetId, "Denied", "Médico recusou no app do certificado.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Redirect($"{documentUrl}?assinatura=recusada");
        }

        var document = await LoadMedicalDocument(db, pending.ClinicId, pending.TargetId, cancellationToken, tracking: true);
        if (document is null ||
            document.Status != MedicalDocumentStatus.Draft ||
            document.Appointment.Doctor.UserId != pending.UserId)
            return Results.Redirect($"{documentUrl}?assinatura=invalida");

        var session = new SigningSession(
            provider.Name, credentialId, pending.Verifier, DateTime.UtcNow.AddHours(pending.LifetimeHours), provider.Simulated);
        try
        {
            await SignMedicalDocumentWithSessionAsync(realtime, db, audit, storage, provider, session, document, actor, cancellationToken);
            await sessions.SaveAsync(pending.UserId, session, cancellationToken);
            return Results.Redirect($"{documentUrl}?assinatura=ok");
        }
        catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException)
        {
            loggerFactory.CreateLogger("MedicalDocumentSignature").LogWarning(exception, "Medical document signature failed.");
            audit.Add(actor, "MedicalDocument.Sign", "MedicalDocument", document.Id, "Failed", "Falha no provedor de assinatura.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Redirect($"{documentUrl}?assinatura=falhou");
        }
    }

    private static async Task SignMedicalDocumentWithSessionAsync(
        RealtimeNotifier realtime,
        MedSyncDbContext db,
        AuditWriter audit,
        ClinicalAttachmentStorage storage,
        ICloudSignatureProvider provider,
        SigningSession session,
        MedicalDocument document,
        RequestContext actor,
        CancellationToken cancellationToken)
    {
        var signedAt = DateTime.UtcNow;
        var (storageKey, sha256) = await RenderAndSignMedicalDocumentAsync(
            storage, document, signedAt, provider.CreatePdfSigner(session, cancellationToken), session.Simulated);
        document.Status = MedicalDocumentStatus.Signed;
        document.SignedAt = signedAt;
        document.SignedDocumentKey = storageKey;
        document.SignedDocumentSha256 = sha256;
        document.SignatureSimulated = session.Simulated;
        document.UpdatedAt = signedAt;
        audit.Add(actor, "MedicalDocument.Sign", "MedicalDocument", document.Id, "Success",
            session.Simulated ? "Simulador de assinatura (sem validade)." : null);
        await db.SaveChangesAsync(cancellationToken);
        // The patient's "Documentos da consulta" and the front desk's declaration button refresh on their own.
        await realtime.AppointmentChangedAsync(document.AppointmentId, cancellationToken);
    }

    // Shared with the demonstration seed, which signs its sample documents with the simulator.
    internal static async Task<(string StorageKey, string Sha256)> RenderAndSignMedicalDocumentAsync(
        ClinicalAttachmentStorage storage,
        MedicalDocument document,
        DateTime signedAt,
        PdfSharp.Pdf.Signatures.IDigitalSigner signer,
        bool simulated)
    {
        var appointment = document.Appointment;
        var inPerson = appointment.Modality == ConsultationModality.InPerson;
        var location = inPerson
            ? appointment.Clinic.FormattedAddress() ?? appointment.Clinic.Name
            : document.PatientLocation ?? "Telemedicina";
        var pdfDocument = MedicalDocumentPdf.Render(MedicalDocumentData(document, signedAt, simulated, draft: false));
        var reason = (document.Kind == MedicalDocumentKind.AttendanceDeclaration ? "Declaração de comparecimento" : "Documento médico") +
                     (inPerson ? " emitido em atendimento presencial" : " emitido em modalidade de telemedicina");
        var pdf = await PrescriptionPdf.SignAsync(pdfDocument, signer, location, reason);
        return await storage.SaveGeneratedAsync(document.ClinicId, "documents", $"{document.Id:N}.pdf", pdf, CancellationToken.None);
    }

    private static MedicalDocumentPdfData MedicalDocumentData(MedicalDocument document, DateTime issuedAt, bool simulated, bool draft)
    {
        var appointment = document.Appointment;
        var clinic = appointment.Clinic;
        var patient = appointment.Patient;
        var doctor = appointment.Doctor;
        return new MedicalDocumentPdfData(
            document.Id,
            document.Kind,
            document.Title,
            document.Body,
            doctor.Name,
            doctor.Crm,
            doctor.CrmUf,
            doctor.Specialty,
            doctor.Rqe,
            DoctorAddress(appointment),
            clinic.Name,
            clinic.LegalName,
            clinic.TaxId,
            clinic.FormattedAddress(),
            clinic.Phone,
            clinic.AddressCity,
            patient.Name,
            string.IsNullOrWhiteSpace(patient.SocialName) ? null : patient.SocialName,
            patient.Cpf,
            patient.BirthDate,
            appointment.Modality == ConsultationModality.InPerson,
            document.PatientLocation,
            document.AttendanceStartedAt,
            document.AttendanceEndedAt,
            issuedAt,
            simulated,
            draft);
    }

    // Online: from when the patient entered the room until the doctor closed it; in person: the booked time.
    private static (DateTime Start, DateTime End) AttendanceTimes(Appointment appointment)
    {
        var room = appointment.ConsultationRoom;
        var start = room?.PatientJoinedAt ?? room?.StartedAt ?? appointment.ScheduledAt;
        var end = room?.EndedAt ?? appointment.ScheduledAt.AddMinutes(appointment.DurationMinutes);
        return end > start ? (start, end) : (start, start.AddMinutes(appointment.DurationMinutes));
    }

    private static async Task<IResult?> ValidateMedicalDocument(
        MedSyncDbContext db,
        Appointment appointment,
        SaveMedicalDocumentRequest request,
        Guid? documentId,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Kind))
            return Validation("kind", "Escolha o tipo de documento.");
        if (appointment.Status == AppointmentStatus.Cancelled)
            return Validation("appointment", "Consulta cancelada não recebe documentos.");
        if (request.PatientLocation?.Length > 200)
            return Validation("patientLocation", "O local informado pode ter até 200 caracteres.");

        if (request.Kind == MedicalDocumentKind.Report)
        {
            var title = request.Title?.Trim() ?? "";
            if (title.Length is < 3 or > 120)
                return Validation("title", "Informe o título do documento (3 a 120 caracteres).");
            var body = request.Body?.Trim() ?? "";
            if (body.Length == 0)
                return Validation("body", "Escreva o texto do documento.");
            if (body.Length > MaxReportBodyLength)
                return Validation("body", $"O texto pode ter até {MaxReportBodyLength} caracteres.");
            return null;
        }

        if (appointment.Status != AppointmentStatus.Completed)
            return Validation("appointment", "A declaração de comparecimento sai depois que a consulta é concluída.");
        if (request.AttendanceStartedAt is not { } start || request.AttendanceEndedAt is not { } end)
            return Validation("attendance", "Informe o horário de entrada e de saída.");
        start = start.ToUniversalTime();
        end = end.ToUniversalTime();
        if (end <= start)
            return Validation("attendance", "O horário de saída precisa ser depois do de entrada.");
        if (end - start > TimeSpan.FromHours(12))
            return Validation("attendance", "Entrada e saída podem ter no máximo 12 horas de diferença.");
        if (end > DateTime.UtcNow.AddMinutes(5))
            return Validation("attendance", "O horário de saída não pode estar no futuro.");
        if (start < appointment.ScheduledAt.AddHours(-12))
            return Validation("attendance", "O horário de entrada precisa ser no dia da consulta.");
        var another = await db.MedicalDocuments.AsNoTracking().AnyAsync(
            x => x.AppointmentId == appointment.Id &&
                 x.Kind == MedicalDocumentKind.AttendanceDeclaration &&
                 x.Id != documentId,
            cancellationToken);
        if (another)
            return Validation("kind", "Esta consulta já tem uma declaração de comparecimento.");
        return null;
    }

    private static void ApplyMedicalDocument(MedicalDocument document, SaveMedicalDocumentRequest request)
    {
        document.PatientLocation = string.IsNullOrWhiteSpace(request.PatientLocation) ? null : request.PatientLocation.Trim();
        if (document.Kind == MedicalDocumentKind.AttendanceDeclaration)
        {
            document.Title = MedicalDocumentPdf.DeclarationTitle;
            document.Body = "";
            document.AttendanceStartedAt = request.AttendanceStartedAt!.Value.ToUniversalTime();
            document.AttendanceEndedAt = request.AttendanceEndedAt!.Value.ToUniversalTime();
            return;
        }

        document.Title = request.Title!.Trim();
        document.Body = request.Body!.Trim();
    }

    // CFM 2.314 art. 13 (rule D2): what the document still lacks before it can be signed.
    private static List<string> MissingForSignature(MedicalDocument document)
    {
        var appointment = document.Appointment;
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(appointment.Doctor.Crm) || string.IsNullOrWhiteSpace(appointment.Doctor.CrmUf))
            missing.Add("cadastre seu CRM e UF em Meu perfil");
        if (string.IsNullOrWhiteSpace(appointment.Doctor.ProfessionalAddress) && !appointment.Clinic.HasAddress)
            missing.Add("cadastre seu endereço profissional em Meu perfil");
        if (document.Kind == MedicalDocumentKind.Report &&
            appointment.Modality != ConsultationModality.InPerson &&
            string.IsNullOrWhiteSpace(document.PatientLocation))
            missing.Add("informe o local onde o paciente está (telemedicina)");
        return missing;
    }

    // Generic names: the title may carry clinical content, and file names must not (rule C5).
    private static string MedicalDocumentFileName(MedicalDocument document)
    {
        var date = (document.SignedAt ?? document.UpdatedAt).Add(BrazilOffset);
        return document.Kind == MedicalDocumentKind.AttendanceDeclaration
            ? $"declaracao-de-comparecimento-{date:yyyy-MM-dd}.pdf"
            : $"documento-medico-{date:yyyy-MM-dd}.pdf";
    }

    // Scoped to the place chosen in "Local de atendimento", like the rest of the agenda.
    private static Task<MedicalDocument?> LoadMedicalDocument(
        MedSyncDbContext db,
        Guid clinicId,
        Guid id,
        CancellationToken cancellationToken,
        bool tracking = false)
    {
        var query = db.MedicalDocuments
            .Include(x => x.Appointment).ThenInclude(x => x.Doctor)
            .Include(x => x.Appointment).ThenInclude(x => x.Patient)
            .Include(x => x.Appointment).ThenInclude(x => x.Clinic)
            .Include(x => x.Appointment).ThenInclude(x => x.ConsultationRoom)
            .Where(x => x.Id == id && x.ClinicId == clinicId);
        return (tracking ? query : query.AsNoTracking()).SingleOrDefaultAsync(cancellationToken);
    }

    private static MedicalDocumentResponse ToResponse(MedicalDocument document) =>
        new(
            document.Id,
            document.AppointmentId,
            document.Kind,
            document.Status,
            document.Title,
            document.Body,
            document.PatientLocation,
            document.AttendanceStartedAt,
            document.AttendanceEndedAt,
            document.CreatedAt,
            document.UpdatedAt,
            document.SignedAt,
            document.SignatureSimulated);
}
