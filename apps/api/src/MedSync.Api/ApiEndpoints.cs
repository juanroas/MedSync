using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Net.Mail;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace MedSync.Api;

public static partial class ApiEndpoints
{
    private const string SessionCookie = "medsync_session";

    public static IEndpointRouteBuilder MapMedSyncEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/login", Login).AllowAnonymous().RequireRateLimiting("auth");
        app.MapPost("/auth/login/mfa", LoginMfa).AllowAnonymous().RequireRateLimiting("auth");
        app.MapPost("/auth/register-clinic", RegisterClinic).AllowAnonymous().RequireRateLimiting("auth");
        app.MapPost("/payments/mercadopago/webhook", MercadoPagoWebhook).AllowAnonymous();

        var protectedApi = app.MapGroup(string.Empty).RequireAuthorization();
        protectedApi.MapGet("/auth/me", Me);
        protectedApi.MapPost("/auth/logout", Logout);
        protectedApi.MapPost("/auth/change-password", ChangePassword);
        protectedApi.MapPost("/mfa/enroll", EnrollMfa);
        protectedApi.MapPost("/mfa/confirm", ConfirmMfa);
        protectedApi.MapPost("/mfa/disable", DisableMfa);
        protectedApi.MapGet("/profile", GetPersonalProfile);
        protectedApi.MapPut("/profile", UpdatePersonalProfile);
        protectedApi.MapPost("/staff-users", CreateStaffUser);
        protectedApi.MapGet("/staff-users", GetStaffUsers);
        protectedApi.MapPut("/staff-users/{id:guid}/activation", UpdateStaffUserActivation);
        protectedApi.MapPost("/staff-users/{id:guid}/reset-password", ResetStaffUserPassword);
        protectedApi.MapGet("/audit-events", GetAuditEvents);
        protectedApi.MapPost("/clinics/onboarding", CreateClinicOnboarding);
        protectedApi.MapGet("/clinics/activation", GetClinicActivations);
        protectedApi.MapPut("/clinics/{id:guid}/activation", UpdateClinicActivation);
        protectedApi.MapGet("/privacy/requests", GetPrivacyRequests);
        protectedApi.MapPost("/privacy/requests", CreatePrivacyRequest);
        protectedApi.MapPut("/privacy/requests/{id:guid}/status", UpdatePrivacyRequestStatus);
        protectedApi.MapGet("/support/requests", GetSupportRequests);
        protectedApi.MapPost("/support/requests", CreateSupportRequest);
        protectedApi.MapPut("/support/requests/{id:guid}/status", UpdateSupportRequestStatus);

        protectedApi.MapPost("/patients", CreatePatient);
        protectedApi.MapGet("/patients", GetPatients);
        protectedApi.MapPut("/patients/{id:guid}", UpdatePatient);
        protectedApi.MapPost("/doctors", CreateDoctor);
        protectedApi.MapGet("/doctors", GetDoctors);
        protectedApi.MapPut("/doctors/{id:guid}", UpdateDoctor);
        protectedApi.MapGet("/doctors/me/availability", GetMyAvailability);
        protectedApi.MapPost("/doctors/me/availability", CreateMyAvailabilitySlot);
        protectedApi.MapDelete("/doctors/me/availability/{id:guid}", DeleteMyAvailabilitySlot);
        protectedApi.MapGet("/doctors/{id:guid}/available-times", GetAvailableTimes);
        protectedApi.MapGet("/care/specialties", GetCareSpecialties);
        protectedApi.MapPost("/appointments/request", RequestAppointment);
        protectedApi.MapPost("/appointments", CreateAppointment);
        protectedApi.MapGet("/appointments", GetAppointments);
        protectedApi.MapGet("/appointments/{id:guid}", GetAppointment);
        protectedApi.MapPost("/appointments/{id:guid}/consent", AcceptConsent);
        protectedApi.MapPost("/appointments/{id:guid}/cancel", CancelAppointment);
        protectedApi.MapGet("/consent/term", GetConsentTerm);
        protectedApi.MapGet("/appointments/{id:guid}/clinical-record", GetClinicalRecord);
        protectedApi.MapPut("/appointments/{id:guid}/clinical-record", SaveClinicalRecord);
        protectedApi.MapGet("/appointments/{id:guid}/clinical-record/attachments", GetClinicalRecordAttachments);
        protectedApi.MapPost("/appointments/{id:guid}/clinical-record/attachments", UploadClinicalRecordAttachment)
            .DisableAntiforgery();
        protectedApi.MapGet(
            "/appointments/{id:guid}/clinical-record/attachments/{attachmentId:guid}/download",
            DownloadClinicalRecordAttachment);
        protectedApi.MapDelete(
            "/appointments/{id:guid}/clinical-record/attachments/{attachmentId:guid}",
            DeleteClinicalRecordAttachment);
        protectedApi.MapGet("/patients/{patientId:guid}/clinical-records", GetPatientClinicalRecords);

        protectedApi.MapPost("/consultations/{appointmentId:guid}/start", StartConsultation);
        protectedApi.MapGet("/consultations/{appointmentId:guid}/room", GetRoom);
        protectedApi.MapPost("/consultations/{appointmentId:guid}/token", GetLiveKitToken);
        protectedApi.MapPost("/consultations/{appointmentId:guid}/end", EndConsultation);

        protectedApi.MapPost("/appointments/{appointmentId:guid}/payments/checkout", CreateCheckout);
        protectedApi.MapGet("/appointments/{appointmentId:guid}/payments", GetPayment);

        MapPrescriptionEndpoints(protectedApi);

        return app;
    }

    // Brasil nao usa horario de verao desde 2019; deslocamento fixo em relacao ao UTC.
    private static readonly TimeSpan BrazilUtcOffset = TimeSpan.FromHours(-3);

    private static readonly ClinicRole[] PlatformStaffRoles =
    [
        ClinicRole.MedicalDirector,
        ClinicRole.Support,
        ClinicRole.DataProtectionOfficer
    ];

    private static readonly ClinicRole[] ClinicStaffRoles = [ClinicRole.ClinicAdmin];

    // Médico ADM manages the MedSync team; a clinic admin manages only clinic admins. Nobody else
    // manages staff — this is what prevents a clinic admin from granting platform roles.
    private static ClinicRole[] ManageableStaffRoles(RequestContext actor) =>
        actor.IsMedicalAdmin
            ? PlatformStaffRoles
            : !actor.IsPlatformStaff && actor.HasAny(ClinicRole.ClinicAdmin)
                ? ClinicStaffRoles
                : [];

    private static async Task<IResult> CreateStaffUser(
        CreateStaffUserRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var manageable = ManageableStaffRoles(actor);
        if (manageable.Length == 0)
            return Results.Forbid();
        if (!manageable.Contains(request.Role))
            return Validation("role", actor.IsMedicalAdmin
                ? "Na equipe MedSync só é possível criar Médico ADM, Suporte ou DPO."
                : "Na clínica só é possível criar outro administrador. Médicos são cadastrados em Médicos.");
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email))
            return Validation("user", "Nome e e-mail são obrigatórios.");
        if (PasswordPolicy.Validate(request.TemporaryPassword) is { } passwordError)
            return Validation("temporaryPassword", passwordError);

        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null)
        {
            user = new User
            {
                Name = request.Name.Trim(),
                Email = email,
                PasswordHash = passwords.Hash(request.TemporaryPassword),
                MustChangePassword = true
            };
            db.Users.Add(user);
        }
        else if (await db.ClinicMemberships.AnyAsync(
                     x => x.ClinicId == actor.ClinicId && x.UserId == user.Id,
                     cancellationToken))
        {
            return Results.Conflict(new { message = "Esta conta já está vinculada ao ambiente MedSync." });
        }

        db.ClinicMemberships.Add(new ClinicMembership
        {
            ClinicId = actor.ClinicId,
            User = user,
            Role = request.Role
        });
        audit.Add(actor, "StaffUser.Create", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            $"/staff-users/{user.Id}",
            new StaffUserResponse(user.Id, user.Name, user.Email, request.Role, user.IsActive));
    }

    private static async Task<IResult> GetStaffUsers(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var allowedRoles = ManageableStaffRoles(actor);
        if (allowedRoles.Length == 0)
            return Results.Forbid();

        var users = await db.ClinicMemberships.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && allowedRoles.Contains(x.Role))
            .OrderBy(x => x.User.Name)
            .Select(x => new StaffUserResponse(
                x.UserId,
                x.User.Name,
                x.User.Email,
                x.Role,
                x.User.IsActive))
            .ToListAsync(cancellationToken);
        return Results.Ok(users);
    }

    private static async Task<IResult> UpdateStaffUserActivation(
        Guid id,
        UpdateStaffUserActivationRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        IDistributedCache cache,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var manageable = ManageableStaffRoles(actor);
        if (manageable.Length == 0)
            return Results.Forbid();

        if (id == actor.UserId && !request.IsActive)
            return Validation("isActive", "Você não pode desabilitar o próprio acesso.");

        var membership = await db.ClinicMemberships
            .Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.ClinicId == actor.ClinicId && x.UserId == id && manageable.Contains(x.Role),
                cancellationToken);

        if (membership is null)
            return Results.NotFound(new { message = "Acesso não encontrado neste escopo." });

        membership.User.IsActive = request.IsActive;
        audit.Add(
            actor,
            request.IsActive ? "StaffUser.Activate" : "StaffUser.Deactivate",
            "User",
            id,
            reason: request.Reason);
        await db.SaveChangesAsync(cancellationToken);

        if (!request.IsActive)
            await RevokeSessionsAsync(cache, configuration, id, cancellationToken);

        return Results.Ok(new StaffUserResponse(
            membership.UserId,
            membership.User.Name,
            membership.User.Email,
            membership.Role,
            membership.User.IsActive));
    }

    private static async Task<IResult> ResetStaffUserPassword(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        IDistributedCache cache,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var manageable = ManageableStaffRoles(actor);
        if (manageable.Length == 0)
            return Results.Forbid();

        var membership = await db.ClinicMemberships
            .Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.ClinicId == actor.ClinicId && x.UserId == id && manageable.Contains(x.Role),
                cancellationToken);

        if (membership is null)
            return Results.NotFound(new { message = "Acesso não encontrado neste escopo." });

        var temporaryPassword = SecurityText.GenerateTemporaryPassword();
        membership.User.PasswordHash = passwords.Hash(temporaryPassword);
        membership.User.MustChangePassword = true;
        audit.Add(actor, "StaffUser.ResetPassword", "User", id);
        await db.SaveChangesAsync(cancellationToken);
        await RevokeSessionsAsync(cache, configuration, id, cancellationToken);

        return Results.Ok(new ResetPasswordResponse(id, temporaryPassword));
    }

    // Marca no cache distribuido que qualquer sessao (JWT) emitida ANTES de agora para este
    // usuario deve ser rejeitada. Usado ao desabilitar acesso ou resetar senha por um admin,
    // para que a sessao antiga nao continue valida ate o token expirar naturalmente.
    private static Task RevokeSessionsAsync(
        IDistributedCache cache,
        IConfiguration configuration,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var expiresMinutes = configuration.GetValue<int?>("Jwt:ExpiresMinutes") ?? 15;
        var revokedBefore = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        return cache.SetStringAsync(
            $"session-revoked:{userId}",
            revokedBefore,
            new DistributedCacheEntryOptions
            {
                // Margem sobre a validade maxima do token, cobrindo o ClockSkew da validacao.
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(expiresMinutes + 5)
            },
            cancellationToken);
    }

    private static async Task<IResult> GetAuditEvents(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var isClinicAdmin = !actor.IsPlatformStaff && actor.HasAny(ClinicRole.ClinicAdmin);
        if (!actor.IsDpo && !isClinicAdmin)
            return Results.Forbid();

        var events = await db.AuditEvents.AsNoTracking()
            .Where(x => actor.IsDpo || x.ClinicId == actor.ClinicId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(x => new AuditEventResponse(
                x.Id,
                x.ActorUserId,
                x.Action,
                x.ResourceType,
                x.ResourceId,
                x.Result,
                x.Reason,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
        return Results.Ok(events);
    }

    private static async Task<IResult> CreateClinicOnboarding(
        CreateClinicOnboardingRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsSupport && !actor.IsMedicalAdmin)
            return Results.Forbid();

        var legalName = request.LegalName.Trim();
        var tradeName = string.IsNullOrWhiteSpace(request.TradeName) ? legalName : request.TradeName.Trim();
        var taxId = DigitsOnly(request.TaxId);
        var adminName = request.AdminName.Trim();
        var adminEmail = request.AdminEmail.Trim().ToLowerInvariant();

        if (legalName.Length is < 3 or > 180)
            return Validation("legalName", "Razão social deve ter entre 3 e 180 caracteres.");
        if (tradeName.Length > 160)
            return Validation("tradeName", "Nome fantasia deve ter até 160 caracteres.");
        if (!IsValidCnpj(taxId))
            return Validation("taxId", "Informe um CNPJ válido.");
        if (adminName.Length is < 3 or > 160)
            return Validation("adminName", "Nome do administrador deve ter entre 3 e 160 caracteres.");
        if (!IsValidEmail(adminEmail))
            return Validation("adminEmail", "Informe um e-mail válido para o administrador.");
        if (PasswordPolicy.Validate(request.TemporaryPassword) is { } passwordError)
            return Validation("temporaryPassword", passwordError);
        if (await db.Clinics.AnyAsync(x => x.TaxId == taxId, cancellationToken))
            return Results.Conflict(new { message = "Já existe uma clínica cadastrada com este CNPJ." });
        if (await db.Users.AnyAsync(x => x.Email == adminEmail, cancellationToken))
            return Results.Conflict(new { message = "Já existe uma conta com este e-mail." });

        var clinic = new Clinic
        {
            Name = tradeName,
            Slug = SecurityText.Slug(tradeName),
            LegalName = legalName,
            TaxId = taxId,
            ActivationStatus = ClinicActivationStatus.Pending
        };
        var admin = new User
        {
            Name = adminName,
            Email = adminEmail,
            PasswordHash = passwords.Hash(request.TemporaryPassword),
            MustChangePassword = true
        };
        var membership = new ClinicMembership
        {
            Clinic = clinic,
            User = admin,
            Role = ClinicRole.ClinicAdmin
        };

        db.AddRange(clinic, admin, membership);
        audit.Add(actor, "Clinic.OnboardingCreate", "Clinic", clinic.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/clinics/{clinic.Id}",
            new ClinicOnboardingResponse(
                clinic.Id,
                tradeName,
                MaskTaxId(taxId),
                adminEmail,
                clinic.ActivationStatus,
                $"Enviar boas-vindas para {adminEmail}: acesso criado, troca de senha obrigatória, clínica aguardando ativação pelo Médico ADM MedSync."));
    }

    private static async Task<IResult> GetClinicActivations(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsSupport && !actor.IsMedicalAdmin)
            return Results.Forbid();

        var clinics = await db.Clinics.AsNoTracking()
            .Where(x => x.TaxId != null)
            .OrderBy(x => x.ActivationStatus == ClinicActivationStatus.Pending ? 0 : 1)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Results.Ok(clinics.Select(ToActivationResponse));
    }

    private static async Task<IResult> UpdateClinicActivation(
        Guid id,
        UpdateClinicActivationRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.IsMedicalAdmin)
        {
            audit.Add(actor, "Clinic.ActivationUpdate", "Clinic", id, "Denied", "Somente o Médico ADM MedSync pode ativar clínicas.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var clinic = await db.Clinics.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (clinic is null)
            return Results.NotFound();

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? request.Status switch
            {
                ClinicActivationStatus.Active => "Clínica ativada pelo Médico ADM MedSync.",
                ClinicActivationStatus.Suspended => "Clínica suspensa pelo Médico ADM MedSync.",
                _ => "Clínica voltou para análise.",
            }
            : request.Reason.Trim();
        if (reason.Length > 240)
            return Validation("reason", "Motivo deve ter até 240 caracteres.");
        var planName = string.IsNullOrWhiteSpace(request.PlanName) ? null : request.PlanName.Trim();
        if (planName is { Length: > 120 })
            return Validation("planName", "Plano deve ter até 120 caracteres.");
        if (request.MonthlyFee is { } monthlyFee && (monthlyFee <= 0 || monthlyFee > 1_000_000))
            return Validation("monthlyFee", "Valor mensal deve ser maior que zero e menor que 1.000.000.");

        if (request.Status == ClinicActivationStatus.Active && clinic.ActivationStatus != ClinicActivationStatus.Active)
            clinic.ActivatedAt = DateTime.UtcNow;
        clinic.ActivationStatus = request.Status;
        if (planName is not null)
            clinic.PlanName = planName;
        if (request.MonthlyFee is { } newMonthlyFee)
            clinic.MonthlyFee = newMonthlyFee;

        audit.Add(actor, "Clinic.ActivationUpdate", "Clinic", clinic.Id, "Success", reason);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(ToActivationResponse(clinic));
    }

    private static ClinicActivationResponse ToActivationResponse(Clinic clinic) =>
        new(
            clinic.Id,
            clinic.Name,
            clinic.LegalName,
            clinic.TaxId is null ? null : MaskTaxId(clinic.TaxId),
            clinic.PlanName,
            clinic.MonthlyFee,
            clinic.ActivationStatus,
            clinic.ActivatedAt,
            clinic.CreatedAt);

    private const string ClinicPendingStaffMessage =
        "A clínica ainda está em ativação. Pacientes e consultas são liberados assim que o Médico ADM MedSync ativar o cadastro.";

    private const string ClinicNotActiveMessage =
        "Sua clínica ainda está em ativação no MedSync. Assim que for liberada, você poderá solicitar consultas.";

    private static Task<bool> IsClinicActiveAsync(MedSyncDbContext db, Guid clinicId, CancellationToken cancellationToken) =>
        db.Clinics.AsNoTracking().AnyAsync(
            x => x.Id == clinicId && x.ActivationStatus == ClinicActivationStatus.Active,
            cancellationToken);

    private static async Task<IResult> GetPrivacyRequests(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var canOperatePrivacy = CanOperatePrivacy(actor);
        if (!canOperatePrivacy && !actor.HasAny(ClinicRole.Patient))
        {
            audit.Add(actor, "PrivacyRequest.List", "PrivacyRequest", null, "Denied", "Perfil sem permissao para solicitacoes de titular.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        // The DPO is platform staff and answers requests from every clinic.
        var query = db.PrivacyRequests.AsNoTracking()
            .Where(x => canOperatePrivacy || x.ClinicId == actor.ClinicId);

        if (!canOperatePrivacy)
        {
            var requesterEmail = await db.Users.AsNoTracking()
                .Where(x => x.Id == actor.UserId)
                .Select(x => x.Email)
                .SingleAsync(cancellationToken);
            query = query.Where(x => x.CreatedByUserId == actor.UserId || x.RequesterEmail == requesterEmail);
        }

        var requests = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new PrivacyRequestResponse(
                x.Id,
                x.RequesterName,
                x.RequesterEmail,
                x.SubjectReference,
                x.Type,
                x.Status,
                x.Description,
                x.ResolutionNote,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "PrivacyRequest.List", "PrivacyRequest", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(requests);
    }

    private static async Task<IResult> CreatePrivacyRequest(
        CreatePrivacyRequestRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!CanOperatePrivacy(actor) && !actor.HasAny(ClinicRole.Patient))
        {
            audit.Add(actor, "PrivacyRequest.Create", "PrivacyRequest", null, "Denied", "Perfil sem permissao para registrar solicitacao de titular.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var requesterName = request.RequesterName.Trim();
        var requesterEmail = request.RequesterEmail.Trim().ToLowerInvariant();
        var subjectReference = request.SubjectReference.Trim();
        var description = request.Description.Trim();

        if (actor.HasAny(ClinicRole.Patient) && !CanOperatePrivacy(actor))
        {
            var user = await db.Users.AsNoTracking()
                .Where(x => x.Id == actor.UserId)
                .Select(x => new { x.Name, x.Email })
                .SingleAsync(cancellationToken);
            requesterName = user.Name;
            requesterEmail = user.Email;
            subjectReference = "Proprio titular autenticado";
        }

        var validation = ValidatePrivacyRequest(requesterName, requesterEmail, subjectReference, description);
        if (validation is not null)
            return validation;

        var privacyRequest = new PrivacyRequest
        {
            ClinicId = actor.ClinicId,
            CreatedByUserId = actor.UserId,
            RequesterName = requesterName,
            RequesterEmail = requesterEmail,
            SubjectReference = subjectReference,
            Type = request.Type,
            Description = description
        };

        db.PrivacyRequests.Add(privacyRequest);
        audit.Add(actor, "PrivacyRequest.Create", "PrivacyRequest", privacyRequest.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/privacy/requests/{privacyRequest.Id}", ToResponse(privacyRequest));
    }

    private static async Task<IResult> UpdatePrivacyRequestStatus(
        Guid id,
        UpdatePrivacyRequestStatusRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!CanUpdatePrivacyRequest(actor))
        {
            audit.Add(actor, "PrivacyRequest.UpdateStatus", "PrivacyRequest", id, "Denied", "Perfil sem permissao para atualizar solicitacao de titular.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var privacyRequest = await db.PrivacyRequests
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (privacyRequest is null)
            return Results.NotFound();

        var note = string.IsNullOrWhiteSpace(request.ResolutionNote)
            ? null
            : request.ResolutionNote.Trim();
        if (note?.Length > 1000)
            return Validation("resolutionNote", "Nota operacional deve ter ate 1000 caracteres.");
        if (note is not null && LooksLikeFullCpf(note))
            return Validation("resolutionNote", "Nao registre CPF completo ou dado sensivel na nota operacional.");

        privacyRequest.Status = request.Status;
        privacyRequest.ResolutionNote = note;
        privacyRequest.UpdatedByUserId = actor.UserId;
        privacyRequest.UpdatedAt = DateTime.UtcNow;

        audit.Add(actor, "PrivacyRequest.UpdateStatus", "PrivacyRequest", privacyRequest.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(privacyRequest));
    }

    private static async Task<IResult> GetSupportRequests(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var canOperateSupport = CanOperateSupport(actor);

        // Support is platform staff and works the queue of every clinic.
        var query = db.SupportRequests.AsNoTracking()
            .Where(x => canOperateSupport || x.ClinicId == actor.ClinicId);

        if (!canOperateSupport)
        {
            query = query.Where(x => x.CreatedByUserId == actor.UserId);
        }

        var requests = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new SupportRequestResponse(
                x.Id,
                x.RequesterName,
                x.RequesterEmail,
                x.Subject,
                x.Status,
                x.Description,
                x.ResolutionNote,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "SupportRequest.List", "SupportRequest", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(requests);
    }

    private static async Task<IResult> CreateSupportRequest(
        CreateSupportRequestRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);

        var subject = request.Subject.Trim();
        var description = request.Description.Trim();

        var validation = ValidateSupportRequest(subject, description);
        if (validation is not null)
            return validation;

        var user = await db.Users.AsNoTracking()
            .Where(x => x.Id == actor.UserId)
            .Select(x => new { x.Name, x.Email })
            .SingleAsync(cancellationToken);

        var supportRequest = new SupportRequest
        {
            ClinicId = actor.ClinicId,
            CreatedByUserId = actor.UserId,
            RequesterName = user.Name,
            RequesterEmail = user.Email,
            Subject = subject,
            Description = description
        };

        db.SupportRequests.Add(supportRequest);
        audit.Add(actor, "SupportRequest.Create", "SupportRequest", supportRequest.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/support/requests/{supportRequest.Id}", ToResponse(supportRequest));
    }

    private static async Task<IResult> UpdateSupportRequestStatus(
        Guid id,
        UpdateSupportRequestStatusRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!CanOperateSupport(actor))
        {
            audit.Add(actor, "SupportRequest.UpdateStatus", "SupportRequest", id, "Denied", "Perfil sem permissao para atualizar solicitacao de ajuda.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var supportRequest = await db.SupportRequests
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (supportRequest is null)
            return Results.NotFound();

        var note = string.IsNullOrWhiteSpace(request.ResolutionNote)
            ? null
            : request.ResolutionNote.Trim();
        if (note?.Length > 1000)
            return Validation("resolutionNote", "Nota de suporte deve ter ate 1000 caracteres.");
        if (note is not null && LooksLikeFullCpf(note))
            return Validation("resolutionNote", "Nao registre CPF completo ou dado sensivel na nota de suporte.");

        supportRequest.Status = request.Status;
        supportRequest.ResolutionNote = note;
        supportRequest.UpdatedByUserId = actor.UserId;
        supportRequest.UpdatedAt = DateTime.UtcNow;

        audit.Add(actor, "SupportRequest.UpdateStatus", "SupportRequest", supportRequest.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(supportRequest));
    }

    private static readonly TimeSpan MfaPendingTtl = TimeSpan.FromMinutes(5);

    private static async Task<IResult> Login(
        LoginRequest request,
        HttpContext http,
        MedSyncDbContext db,
        IPasswordService passwords,
        ITokenService tokens,
        AuditWriter audit,
        IConfiguration configuration,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users
            .Include(x => x.Memberships)
            .ThenInclude(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null || !user.IsActive || !passwords.Verify(request.Password, user.PasswordHash))
        {
            audit.Add(null, "Auth.Login", "User", null, "Denied", "Credenciais inválidas.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Unauthorized();
        }

        if (user.MfaEnabled)
        {
            var pendingToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                .Replace('+', '-').Replace('/', '_').TrimEnd('=');
            await cache.SetStringAsync(
                $"mfa-pending:{pendingToken}",
                user.Id.ToString(),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = MfaPendingTtl },
                cancellationToken);
            audit.Add(null, "Auth.Login.MfaChallenge", "User", user.Id);
            await db.SaveChangesAsync(cancellationToken);
            return Results.Ok(new MfaRequiredResponse(true, pendingToken));
        }

        return await CompleteLoginAsync(user, http, db, tokens, audit, configuration, cancellationToken);
    }

    private static async Task<IResult> LoginMfa(
        MfaLoginRequest request,
        HttpContext http,
        MedSyncDbContext db,
        ITokenService tokens,
        ITotpService totp,
        AuditWriter audit,
        IConfiguration configuration,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"mfa-pending:{request.PendingToken}";
        var userIdRaw = await cache.GetStringAsync(cacheKey, cancellationToken);
        if (userIdRaw is null || !Guid.TryParse(userIdRaw, out var userId))
            return Results.Unauthorized();

        var user = await db.Users
            .Include(x => x.Memberships)
            .ThenInclude(x => x.Clinic)
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null || !user.IsActive || !user.MfaEnabled || user.MfaSecret is null ||
            !totp.Verify(user.MfaSecret, request.Code))
        {
            audit.Add(null, "Auth.Login.MfaDenied", "User", userId, "Denied", "Codigo MFA invalido.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Unauthorized();
        }

        await cache.RemoveAsync(cacheKey, cancellationToken);
        return await CompleteLoginAsync(user, http, db, tokens, audit, configuration, cancellationToken);
    }

    private static async Task<IResult> CompleteLoginAsync(
        User user,
        HttpContext http,
        MedSyncDbContext db,
        ITokenService tokens,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var memberships = user.Memberships
            .Where(x => x.Clinic.IsActive)
            .OrderBy(x => x.CreatedAt)
            .ToList();
        if (memberships.Count == 0)
            return Results.Forbid();

        var clinic = memberships[0].Clinic;
        var roles = memberships
            .Where(x => x.ClinicId == clinic.Id)
            .Select(x => x.Role)
            .Distinct()
            .ToArray();
        SetSessionCookie(http, tokens.CreateJwt(user, clinic, roles), configuration);
        var actor = new RequestContext(user.Id, clinic.Id, roles.ToHashSet(), clinic.IsPlatform);
        audit.Add(actor, "Auth.Login", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new LoginResponse(ToUserSummary(user, clinic, roles)));
    }

    private static async Task<IResult> EnrollMfa(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ITotpService totp,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var user = await db.Users.SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        if (user.MfaEnabled)
            return Results.Conflict(new { message = "MFA ja esta ativado para esta conta." });

        var secret = totp.GenerateSecret();
        await cache.SetStringAsync(
            $"mfa-enroll:{actor.UserId}",
            secret,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10) },
            cancellationToken);

        return Results.Ok(new MfaEnrollResponse(secret, totp.BuildOtpAuthUri(secret, user.Email)));
    }

    private static async Task<IResult> ConfirmMfa(
        MfaConfirmRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ITotpService totp,
        IDistributedCache cache,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var cacheKey = $"mfa-enroll:{actor.UserId}";
        var secret = await cache.GetStringAsync(cacheKey, cancellationToken);
        if (secret is null)
            return Validation("code", "Nenhum cadastro de MFA pendente. Inicie o processo novamente.");
        if (!totp.Verify(secret, request.Code))
            return Validation("code", "Codigo invalido.");

        var user = await db.Users.SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        user.MfaEnabled = true;
        user.MfaSecret = secret;
        await cache.RemoveAsync(cacheKey, cancellationToken);
        audit.Add(actor, "Auth.Mfa.Enabled", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { mfaEnabled = true });
    }

    private static async Task<IResult> DisableMfa(
        MfaDisableRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var user = await db.Users.SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        if (!passwords.Verify(request.Password, user.PasswordHash))
            return Validation("password", "Senha incorreta.");

        user.MfaEnabled = false;
        user.MfaSecret = null;
        audit.Add(actor, "Auth.Mfa.Disabled", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { mfaEnabled = false });
    }

    private static async Task<IResult> RegisterClinic(
        RegisterClinicRequest request,
        HttpContext http,
        MedSyncDbContext db,
        IPasswordService passwords,
        ITokenService tokens,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ClinicName) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email))
            return Validation("registration", "Razão social, nome e e-mail são obrigatórios.");
        if (PasswordPolicy.Validate(request.Password) is { } passwordError)
            return Validation("password", passwordError);

        var taxId = DigitsOnly(request.TaxId ?? string.Empty);
        if (!IsValidCnpj(taxId))
            return Validation("taxId", "Informe um CNPJ válido.");
        var legalName = request.ClinicName.Trim();
        var tradeName = string.IsNullOrWhiteSpace(request.TradeName) ? legalName : request.TradeName.Trim();
        if (legalName.Length > 180)
            return Validation("clinicName", "Razão social deve ter até 180 caracteres.");
        if (tradeName.Length > 160)
            return Validation("tradeName", "Nome fantasia deve ter até 160 caracteres.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email, cancellationToken))
            return Results.Conflict(new { message = "Já existe uma conta com este e-mail." });
        if (await db.Clinics.AnyAsync(x => x.TaxId == taxId, cancellationToken))
            return Results.Conflict(new { message = "Já existe uma clínica cadastrada com este CNPJ." });

        // Self sign-up never activates the clinic: it stays Pending until the Médico ADM MedSync reviews it.
        var clinic = new Clinic
        {
            Name = tradeName,
            Slug = SecurityText.Slug(tradeName),
            LegalName = legalName,
            TaxId = taxId,
            ActivationStatus = ClinicActivationStatus.Pending
        };
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = passwords.Hash(request.Password)
        };
        var membership = new ClinicMembership
        {
            Clinic = clinic,
            User = user,
            Role = ClinicRole.ClinicAdmin
        };
        db.AddRange(clinic, user, membership);
        var roles = new[] { ClinicRole.ClinicAdmin };
        var actor = new RequestContext(user.Id, clinic.Id, roles.ToHashSet());
        audit.Add(actor, "Clinic.Register", "Clinic", clinic.Id);
        await db.SaveChangesAsync(cancellationToken);

        SetSessionCookie(http, tokens.CreateJwt(user, clinic, roles), configuration);
        return Results.Created(
            $"/clinics/{clinic.Id}",
            new LoginResponse(ToUserSummary(user, clinic, roles)));
    }

    private static async Task<IResult> Me(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        var clinic = await db.Clinics.AsNoTracking().SingleAsync(x => x.Id == actor.ClinicId, cancellationToken);
        return Results.Ok(ToUserSummary(user, clinic, actor.Roles.ToArray()));
    }

    private static async Task<IResult> Logout(
        ClaimsPrincipal principal,
        HttpContext http,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        http.Response.Cookies.Delete(SessionCookie);
        audit.Add(actor, "Auth.Logout", "User", actor.UserId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        ClaimsPrincipal principal,
        HttpContext http,
        MedSyncDbContext db,
        IPasswordService passwords,
        ITokenService tokens,
        AuditWriter audit,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        if (PasswordPolicy.Validate(request.NewPassword) is { } passwordError)
            return Validation("newPassword", passwordError);

        var actor = RequestContext.From(principal);
        var user = await db.Users.SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        if (!passwords.Verify(request.CurrentPassword, user.PasswordHash))
            return Validation("currentPassword", "A senha atual está incorreta.");

        user.PasswordHash = passwords.Hash(request.NewPassword);
        user.MustChangePassword = false;
        var clinic = await db.Clinics.SingleAsync(x => x.Id == actor.ClinicId, cancellationToken);
        audit.Add(actor, "Auth.ChangePassword", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        SetSessionCookie(http, tokens.CreateJwt(user, clinic, actor.Roles.ToArray()), configuration);
        return Results.NoContent();
    }

    private static async Task<IResult> GetPersonalProfile(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var user = await db.Users.AsNoTracking().SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        var clinic = await db.Clinics.AsNoTracking().SingleAsync(x => x.Id == actor.ClinicId, cancellationToken);
        var patient = await db.Patients.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId, cancellationToken);
        var doctor = await db.Doctors.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId, cancellationToken);

        audit.Add(actor, "UserProfile.View", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToPersonalProfile(user, clinic, actor.Roles.ToArray(), patient, doctor));
    }

    private static async Task<IResult> UpdatePersonalProfile(
        UpdatePersonalProfileRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var user = await db.Users.SingleAsync(x => x.Id == actor.UserId, cancellationToken);
        var clinic = await db.Clinics.SingleAsync(x => x.Id == actor.ClinicId, cancellationToken);
        var patient = await db.Patients
            .SingleOrDefaultAsync(x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId, cancellationToken);
        var doctor = await db.Doctors
            .SingleOrDefaultAsync(x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId, cancellationToken);

        var name = request.Name.Trim();
        if (name.Length is < 3 or > 160)
            return Validation("name", "Informe o nome completo com 3 a 160 caracteres.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail valido.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone valido com DDD.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Id != user.Id && x.Email == email, cancellationToken))
            return Results.Conflict(new { message = "Ja existe uma conta usando este e-mail." });

        user.Name = name;
        user.Email = email;
        if (patient is not null)
        {
            patient.Name = name;
            patient.Email = email;
            patient.Phone = request.Phone?.Trim();
        }
        if (doctor is not null)
        {
            doctor.Name = name;
            doctor.Email = email;
            doctor.Phone = request.Phone?.Trim();
        }

        audit.Add(actor, "UserProfile.Update", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToPersonalProfile(user, clinic, actor.Roles.ToArray(), patient, doctor));
    }

    private static async Task<IResult> CreatePatient(
        CreatePatientRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ManagePatients))
            return Results.Forbid();
        if (!await IsClinicActiveAsync(db, actor.ClinicId, cancellationToken))
            return Results.Conflict(new { message = ClinicPendingStaffMessage });
        var name = request.Name.Trim();
        if (name.Length < 3)
            return Validation("name", "Informe o nome completo com pelo menos 3 caracteres.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail válido.");
        var cpf = DigitsOnly(request.Cpf);
        if (!IsValidCpf(cpf))
            return Validation("cpf", "Informe um CPF válido.");
        if (request.BirthDate == default)
            return Validation("birthDate", "Informe a data de nascimento.");
        if (request.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            return Validation("birthDate", "A data de nascimento não pode estar no futuro.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone válido com DDD.");
        if (request.ContinuousMedications?.Length > 2000)
            return Validation("continuousMedications", "Medicações de uso contínuo devem ter até 2000 caracteres.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == actor.ClinicId && (x.Email == email || x.Cpf == cpf),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um paciente com este e-mail ou CPF nesta clínica." });

        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null)
        {
            if (PasswordPolicy.Validate(request.TemporaryPassword) is { } passwordError)
                return Validation("temporaryPassword", passwordError);
            user = new User
            {
                Name = request.Name.Trim(),
                Email = email,
                PasswordHash = passwords.Hash(request.TemporaryPassword),
                MustChangePassword = true
            };
            db.Users.Add(user);
        }
        else if (await db.ClinicMemberships.AnyAsync(
                     x => x.ClinicId == actor.ClinicId && x.UserId == user.Id,
                     cancellationToken))
        {
            return Results.Conflict(new { message = "Esta conta já está vinculada ao ambiente MedSync." });
        }

        db.ClinicMemberships.Add(new ClinicMembership
        {
            ClinicId = actor.ClinicId,
            User = user,
            Role = ClinicRole.Patient
        });
        var patient = new Patient
        {
            ClinicId = actor.ClinicId,
            User = user,
            Name = request.Name.Trim(),
            Email = email,
            Cpf = cpf,
            BirthDate = request.BirthDate,
            Phone = request.Phone?.Trim(),
            ContinuousMedications = string.IsNullOrWhiteSpace(request.ContinuousMedications)
                ? null
                : request.ContinuousMedications.Trim()
        };
        db.Patients.Add(patient);

        audit.Add(actor, "Patient.Create", "Patient", patient.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/patients/{patient.Id}", ToResponse(patient));
    }

    private static async Task<IResult> GetPatients(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var query = db.Patients.AsNoTracking().Where(x => x.ClinicId == actor.ClinicId);
        if (actor.HasAny(AccessRules.ViewPatients))
        {
            // Acesso administrativo ou auditoria dentro do ambiente.
        }
        else if (actor.HasAny(ClinicRole.Doctor))
        {
            query = query.Where(x => x.Appointments.Any(a => a.Doctor.UserId == actor.UserId));
        }
        else if (actor.HasAny(ClinicRole.Patient))
        {
            query = query.Where(x => x.UserId == actor.UserId);
        }
        else
        {
            return Results.Forbid();
        }

        var patients = await query.OrderBy(x => x.Name).ToListAsync(cancellationToken);

        // Continuous medications are clinical data: only the patient and the doctors who attend them see it,
        // even when the same user is also clinic admin (.agents/rules/clinical-data-access.md, C1).
        var ownPatientIds = actor.HasAny(ClinicRole.Doctor)
            ? (await db.Appointments.AsNoTracking()
                .Where(a => a.ClinicId == actor.ClinicId && a.Doctor.UserId == actor.UserId)
                .Select(a => a.PatientId)
                .Distinct()
                .ToListAsync(cancellationToken)).ToHashSet()
            : [];
        bool CanSeeMedications(Patient patient) =>
            ownPatientIds.Contains(patient.Id) ||
            (actor.HasAny(ClinicRole.Patient) && patient.UserId == actor.UserId);

        audit.Add(actor, "Patient.List", "Patient", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(patients.Select(x => ToResponse(x, CanSeeMedications(x))));
    }

    private static async Task<IResult> UpdatePatient(
        Guid id,
        UpdatePatientRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var patient = await db.Patients
            .Include(x => x.User)
            .SingleOrDefaultAsync(
                x => x.Id == id && x.ClinicId == actor.ClinicId,
                cancellationToken);
        if (patient is null)
            return Results.NotFound();

        var canUpdateOwn = actor.HasAny(ClinicRole.Patient) && patient.UserId == actor.UserId;
        if (!canUpdateOwn && !actor.HasAny(AccessRules.ManagePatients))
            return Results.Forbid();

        var name = request.Name.Trim();
        if (name.Length < 3)
            return Validation("name", "Informe o nome completo com pelo menos 3 caracteres.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail válido.");
        if (request.BirthDate == default)
            return Validation("birthDate", "Informe a data de nascimento.");
        if (request.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            return Validation("birthDate", "A data de nascimento não pode estar no futuro.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone válido com DDD.");
        if (request.ContinuousMedications?.Length > 2000)
            return Validation("continuousMedications", "Medicações de uso contínuo devem ter até 2000 caracteres.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == actor.ClinicId && x.Id != id && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um paciente com este e-mail nesta clínica." });
        if (await db.Users.AnyAsync(
                x => x.Id != patient.UserId && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "Já existe uma conta usando este e-mail." });

        patient.Name = name;
        patient.Email = email;
        patient.BirthDate = request.BirthDate;
        patient.Phone = request.Phone?.Trim();
        patient.ContinuousMedications = string.IsNullOrWhiteSpace(request.ContinuousMedications)
            ? null
            : request.ContinuousMedications.Trim();
        if (patient.User is not null)
        {
            patient.User.Name = name;
            patient.User.Email = email;
        }

        audit.Add(actor, "Patient.Update", "Patient", patient.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(patient));
    }

    private static async Task<IResult> CreateDoctor(
        CreateDoctorRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ManageDoctors))
            return Results.Forbid();
        var name = request.Name.Trim();
        if (name.Length < 3)
            return Validation("name", "Informe o nome completo do médico.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail válido.");
        if (string.IsNullOrWhiteSpace(request.Crm))
            return Validation("crm", "CRM é obrigatório.");
        var crmUf = request.CrmUf.Trim().ToUpperInvariant();
        if (crmUf.Length != 2 || !crmUf.All(char.IsLetter))
            return Validation("crmUf", "Informe a UF do CRM com duas letras.");
        if (string.IsNullOrWhiteSpace(request.Specialty))
            return Validation("specialty", "Especialidade é obrigatória.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone válido com DDD.");

        var email = request.Email.Trim().ToLowerInvariant();
        var crm = request.Crm.Trim();
        if (await db.Doctors.AnyAsync(
                x => x.ClinicId == actor.ClinicId && (x.Email == email || x.Crm == crm),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um médico com este e-mail ou CRM nesta clínica." });

        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null)
        {
            if (PasswordPolicy.Validate(request.TemporaryPassword) is { } passwordError)
                return Validation("temporaryPassword", passwordError);
            user = new User
            {
                Name = request.Name.Trim(),
                Email = email,
                PasswordHash = passwords.Hash(request.TemporaryPassword),
                MustChangePassword = true
            };
            db.Users.Add(user);
        }
        else if (await db.ClinicMemberships.AnyAsync(
                     x => x.ClinicId == actor.ClinicId && x.UserId == user.Id,
                     cancellationToken))
        {
            return Results.Conflict(new { message = "Esta conta já está vinculada ao ambiente MedSync." });
        }

        db.ClinicMemberships.Add(new ClinicMembership
        {
            ClinicId = actor.ClinicId,
            User = user,
            Role = ClinicRole.Doctor
        });
        var doctor = new Doctor
        {
            ClinicId = actor.ClinicId,
            User = user,
            Name = request.Name.Trim(),
            Email = email,
            Crm = crm,
            CrmUf = crmUf,
            Specialty = request.Specialty.Trim(),
            Phone = request.Phone?.Trim()
        };
        db.Doctors.Add(doctor);
        audit.Add(actor, "Doctor.Create", "Doctor", doctor.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/doctors/{doctor.Id}", ToResponse(doctor));
    }

    private static async Task<IResult> GetDoctors(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ManageAppointments) && !actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var query = db.Doctors.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId);
        if (actor.HasAny(ClinicRole.Doctor) && !actor.HasAny(AccessRules.ManageAppointments))
            query = query.Where(x => x.UserId == actor.UserId);

        var doctors = await query
            .OrderBy(x => x.Name)
            .Select(x => new DoctorResponse(
                x.Id, x.Name, x.Email, x.Crm, x.CrmUf, x.Specialty, x.Phone, x.ProfessionalAddress))
            .ToListAsync(cancellationToken);
        return Results.Ok(doctors);
    }

    private static async Task<IResult> UpdateDoctor(
        Guid id,
        UpdateDoctorRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var doctor = await db.Doctors
            .Include(x => x.User)
            .SingleOrDefaultAsync(
                x => x.Id == id && x.ClinicId == actor.ClinicId,
                cancellationToken);
        if (doctor is null)
            return Results.NotFound();

        var canUpdateOwn = actor.HasAny(ClinicRole.Doctor) && doctor.UserId == actor.UserId;
        var canManage = actor.HasAny(AccessRules.ManageDoctors);
        if (!canUpdateOwn && !canManage)
            return Results.Forbid();

        // Matriz de campos permitidos: autoatendimento do medico altera apenas
        // nome/e-mail/telefone. CRM, UF do CRM e especialidade sao dados de
        // credenciamento e só podem mudar por quem tem ManageDoctors.
        if (canUpdateOwn && !canManage)
            request = request with { Crm = doctor.Crm, CrmUf = doctor.CrmUf, Specialty = doctor.Specialty };

        var name = request.Name.Trim();
        if (name.Length < 3)
            return Validation("name", "Informe o nome completo do médico.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail válido.");
        if (string.IsNullOrWhiteSpace(request.Crm))
            return Validation("crm", "CRM é obrigatório.");
        var crmUf = request.CrmUf.Trim().ToUpperInvariant();
        if (crmUf.Length != 2 || !crmUf.All(char.IsLetter))
            return Validation("crmUf", "Informe a UF do CRM com duas letras.");
        if (string.IsNullOrWhiteSpace(request.Specialty))
            return Validation("specialty", "Especialidade é obrigatória.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone válido com DDD.");
        if (request.ProfessionalAddress?.Trim().Length > 300)
            return Validation("professionalAddress", "O endereço profissional pode ter até 300 caracteres.");

        var email = request.Email.Trim().ToLowerInvariant();
        var crm = request.Crm.Trim();
        if (await db.Doctors.AnyAsync(
                x => x.ClinicId == actor.ClinicId && x.Id != id && (x.Email == email || x.Crm == crm),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um médico com este e-mail ou CRM nesta clínica." });
        if (await db.Users.AnyAsync(
                x => x.Id != doctor.UserId && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "Já existe uma conta usando este e-mail." });

        doctor.Name = name;
        doctor.Email = email;
        doctor.Crm = crm;
        doctor.CrmUf = crmUf;
        doctor.Specialty = request.Specialty.Trim();
        doctor.Phone = request.Phone?.Trim();
        if (request.ProfessionalAddress is not null)
            doctor.ProfessionalAddress = string.IsNullOrWhiteSpace(request.ProfessionalAddress)
                ? null
                : request.ProfessionalAddress.Trim();
        if (doctor.User is not null)
        {
            doctor.User.Name = name;
            doctor.User.Email = email;
        }

        audit.Add(actor, canUpdateOwn && !canManage ? "Doctor.UpdateSelf" : "Doctor.Update", "Doctor", doctor.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(doctor));
    }

    private static async Task<Doctor?> FindOwnDoctorAsync(
        MedSyncDbContext db,
        RequestContext actor,
        CancellationToken cancellationToken) =>
        await db.Doctors.SingleOrDefaultAsync(
            x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId,
            cancellationToken);

    private static async Task<IResult> GetMyAvailability(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var doctor = await FindOwnDoctorAsync(db, actor, cancellationToken);
        if (doctor is null)
            return Results.NotFound(new { message = "Perfil medico nao encontrado para este ambiente." });

        var slots = await db.DoctorAvailabilitySlots.AsNoTracking()
            .Where(x => x.DoctorId == doctor.Id)
            .OrderBy(x => x.DayOfWeek).ThenBy(x => x.StartTime)
            .Select(x => new DoctorAvailabilitySlotResponse(x.Id, x.DayOfWeek, x.StartTime, x.EndTime))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "DoctorAvailability.List", "DoctorAvailabilitySlot", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(slots);
    }

    private static async Task<IResult> CreateMyAvailabilitySlot(
        CreateDoctorAvailabilitySlotRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var doctor = await FindOwnDoctorAsync(db, actor, cancellationToken);
        if (doctor is null)
            return Results.NotFound(new { message = "Perfil medico nao encontrado para este ambiente." });

        if (request.StartTime >= request.EndTime)
            return Validation("startTime", "O horario inicial precisa ser antes do horario final.");
        if (request.EndTime.ToTimeSpan().Subtract(request.StartTime.ToTimeSpan()) < TimeSpan.FromMinutes(30))
            return Validation("endTime", "A janela de disponibilidade precisa ter pelo menos 30 minutos.");

        var overlaps = await db.DoctorAvailabilitySlots.AnyAsync(
            x => x.DoctorId == doctor.Id &&
                 x.DayOfWeek == request.DayOfWeek &&
                 x.StartTime < request.EndTime &&
                 x.EndTime > request.StartTime,
            cancellationToken);
        if (overlaps)
            return Results.Conflict(new { message = "Ja existe uma janela de disponibilidade que se sobrepoe a este horario." });

        var slot = new DoctorAvailabilitySlot
        {
            ClinicId = actor.ClinicId,
            DoctorId = doctor.Id,
            DayOfWeek = request.DayOfWeek,
            StartTime = request.StartTime,
            EndTime = request.EndTime
        };
        db.DoctorAvailabilitySlots.Add(slot);
        audit.Add(actor, "DoctorAvailability.Create", "DoctorAvailabilitySlot", slot.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            "/doctors/me/availability",
            new DoctorAvailabilitySlotResponse(slot.Id, slot.DayOfWeek, slot.StartTime, slot.EndTime));
    }

    private static async Task<IResult> DeleteMyAvailabilitySlot(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();

        var doctor = await FindOwnDoctorAsync(db, actor, cancellationToken);
        if (doctor is null)
            return Results.NotFound();

        var slot = await db.DoctorAvailabilitySlots.SingleOrDefaultAsync(
            x => x.Id == id && x.DoctorId == doctor.Id, cancellationToken);
        if (slot is null)
            return Results.NotFound();

        db.DoctorAvailabilitySlots.Remove(slot);
        audit.Add(actor, "DoctorAvailability.Delete", "DoctorAvailabilitySlot", slot.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> GetAvailableTimes(
        Guid id,
        DateOnly date,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Patient) && !actor.HasAny(AccessRules.ManageAppointments))
            return Results.Forbid();

        var doctor = await db.Doctors.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == actor.ClinicId, cancellationToken);
        if (doctor is null)
            return Results.NotFound();

        if (date == default)
            return Validation("date", "Informe a data desejada.");

        var dayOfWeek = date.DayOfWeek;
        var windows = await db.DoctorAvailabilitySlots.AsNoTracking()
            .Where(x => x.DoctorId == doctor.Id && x.DayOfWeek == dayOfWeek)
            .ToListAsync(cancellationToken);

        var busy = await db.Appointments.AsNoTracking()
            .Where(x =>
                x.DoctorId == doctor.Id &&
                x.Status != AppointmentStatus.Cancelled &&
                x.Status != AppointmentStatus.Completed)
            .Select(x => new { x.ScheduledAt, x.DurationMinutes })
            .ToListAsync(cancellationToken);

        const int slotMinutes = 30;
        var available = new List<AvailableTimeResponse>();
        var now = DateTime.UtcNow;
        foreach (var window in windows)
        {
            var cursor = window.StartTime;
            while (cursor.AddMinutes(slotMinutes) <= window.EndTime)
            {
                var startsAtLocal = date.ToDateTime(cursor);
                var startsAtUtc = DateTime.SpecifyKind(startsAtLocal - BrazilUtcOffset, DateTimeKind.Utc);
                var endsAtUtc = startsAtUtc.AddMinutes(slotMinutes);

                var conflicts = startsAtUtc <= now || busy.Any(a =>
                    a.ScheduledAt < endsAtUtc && a.ScheduledAt.AddMinutes(a.DurationMinutes) > startsAtUtc);

                if (!conflicts)
                    available.Add(new AvailableTimeResponse(startsAtUtc, slotMinutes));

                cursor = cursor.AddMinutes(slotMinutes);
            }
        }

        audit.Add(actor, "DoctorAvailability.AvailableTimes", "Doctor", doctor.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(available.OrderBy(x => x.StartsAt));
    }

    private static async Task<IResult> GetCareSpecialties(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Patient))
            return Results.Forbid();

        if (!await IsClinicActiveAsync(db, actor.ClinicId, cancellationToken))
        {
            audit.Add(actor, "CareSpecialty.List", "Doctor", null, "Denied", "Clínica ainda não ativada.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Conflict(new { message = ClinicNotActiveMessage });
        }

        var doctorsWithAvailability = await db.Doctors.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Specialty,
                HasAvailability = db.DoctorAvailabilitySlots.Any(s => s.DoctorId == x.Id),
            })
            .ToListAsync(cancellationToken);

        var specialties = doctorsWithAvailability
            .GroupBy(x => x.Specialty)
            .OrderBy(x => x.Key)
            .Select(group => new CareSpecialtyResponse(
                group.Key,
                group.Count(),
                group.OrderBy(doctor => doctor.Name)
                    .Select(doctor => new CareDoctorOptionResponse(doctor.Id, doctor.Name, doctor.HasAvailability))
                    .ToList()))
            .ToList();

        audit.Add(actor, "CareSpecialty.List", "Doctor", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(specialties);
    }

    private static async Task<IResult> RequestAppointment(
        RequestAppointmentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Patient))
            return Results.Forbid();

        var specialty = request.Specialty.Trim();
        if (specialty.Length < 3)
            return Validation("specialty", "Selecione uma especialidade disponivel.");
        if (request.ScheduledAt == default)
            return Validation("scheduledAt", "Data e hora sao obrigatorias.");
        if (request.DurationMinutes is < 10 or > 120)
            return Validation("durationMinutes", "A duracao deve estar entre 10 e 120 minutos.");
        if (request.Notes?.Length > 240)
            return Validation("notes", "Observacao deve ter ate 240 caracteres.");

        var scheduledAt = request.ScheduledAt.ToUniversalTime();
        if (scheduledAt <= DateTime.UtcNow)
            return Validation("scheduledAt", "Nao e permitido solicitar consulta no passado.");

        var patient = await db.Patients.SingleOrDefaultAsync(
            x => x.ClinicId == actor.ClinicId && x.UserId == actor.UserId,
            cancellationToken);
        if (patient is null)
            return Results.NotFound(new { message = "Paciente nao encontrado para este ambiente." });

        if (!await IsClinicActiveAsync(db, actor.ClinicId, cancellationToken))
        {
            audit.Add(actor, "Appointment.Request", "Appointment", null, "Denied", "Clínica ainda não ativada.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Conflict(new { message = ClinicNotActiveMessage });
        }

        var scheduledEndsAt = scheduledAt.AddMinutes(request.DurationMinutes);
        var brazilLocal = scheduledAt + BrazilUtcOffset;
        var brazilDayOfWeek = brazilLocal.DayOfWeek;
        var brazilStartTime = TimeOnly.FromDateTime(brazilLocal);
        var brazilEndTime = TimeOnly.FromDateTime((brazilLocal + (scheduledEndsAt - scheduledAt)));
        var specialtyKey = specialty.ToLowerInvariant();
        var doctorQuery = db.Doctors
            .Where(x =>
                x.Specialty.ToLower() == specialtyKey &&
                x.ClinicId == actor.ClinicId &&
                !db.Appointments.Any(a =>
                    a.DoctorId == x.Id &&
                    a.Status != AppointmentStatus.Cancelled &&
                    a.Status != AppointmentStatus.Completed &&
                    a.ScheduledAt < scheduledEndsAt &&
                    a.ScheduledAt.AddMinutes(a.DurationMinutes) > scheduledAt) &&
                // Se o medico configurou disponibilidade, o horario precisa estar dentro dela.
                // Medicos sem disponibilidade configurada mantem o comportamento anterior (sem restricao).
                (!db.DoctorAvailabilitySlots.Any(s => s.DoctorId == x.Id) ||
                 db.DoctorAvailabilitySlots.Any(s =>
                     s.DoctorId == x.Id &&
                     s.DayOfWeek == brazilDayOfWeek &&
                     s.StartTime <= brazilStartTime &&
                     s.EndTime >= brazilEndTime)));

        if (request.DoctorId is { } doctorId)
            doctorQuery = doctorQuery.Where(x => x.Id == doctorId);

        var doctor = await doctorQuery
            .OrderBy(x => x.Name)
            .FirstOrDefaultAsync(cancellationToken);

        if (doctor is null)
        {
            var message = request.DoctorId is { }
                ? "O medico selecionado nao esta disponivel neste horario. Escolha outro horario dentro da disponibilidade dele."
                : "Nao ha medico disponivel para esta especialidade no horario escolhido.";
            return Results.Conflict(new { message });
        }

        var appointment = new Appointment
        {
            ClinicId = actor.ClinicId,
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            ScheduledAt = scheduledAt,
            DurationMinutes = request.DurationMinutes,
            Notes = string.IsNullOrWhiteSpace(request.Notes)
                ? $"Solicitacao do paciente por especialidade: {specialty}."
                : request.Notes.Trim(),
            PaymentRequired = false
        };
        db.Appointments.Add(appointment);
        audit.Add(actor, "Appointment.Request", "Appointment", appointment.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/appointments/{appointment.Id}",
            await AppointmentQuery(db, actor, appointment.Id).SingleAsync(cancellationToken));
    }

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ManageAppointments))
            return Results.Forbid();
        if (!await IsClinicActiveAsync(db, actor.ClinicId, cancellationToken))
            return Results.Conflict(new { message = ClinicPendingStaffMessage });
        if (request.DoctorId == Guid.Empty || request.PatientId == Guid.Empty)
            return Validation("appointment", "Paciente e médico são obrigatórios.");
        if (request.ScheduledAt == default)
            return Validation("scheduledAt", "Data e hora são obrigatórias.");
        if (request.DurationMinutes is < 10 or > 240)
            return Validation("durationMinutes", "A duração deve estar entre 10 e 240 minutos.");
        if (request.Price is < 0)
            return Validation("price", "O valor não pode ser negativo.");
        var scheduledAt = request.ScheduledAt.ToUniversalTime();
        if (scheduledAt <= DateTime.UtcNow)
            return Validation("scheduledAt", "Não é permitido agendar consulta no passado.");

        var doctor = await db.Doctors.SingleOrDefaultAsync(
            x => x.Id == request.DoctorId && x.ClinicId == actor.ClinicId,
            cancellationToken);
        var patientExists = await db.Patients.AnyAsync(
            x => x.Id == request.PatientId && x.ClinicId == actor.ClinicId,
            cancellationToken);
        if (doctor is null || !patientExists)
            return Results.BadRequest(new { message = "Médico ou paciente inválido." });
        var scheduledEndsAt = scheduledAt.AddMinutes(request.DurationMinutes);
        var hasConflict = await db.Appointments.AnyAsync(
            x => x.ClinicId == actor.ClinicId &&
                 x.DoctorId == request.DoctorId &&
                 x.Status != AppointmentStatus.Cancelled &&
                 x.Status != AppointmentStatus.Completed &&
                 x.ScheduledAt < scheduledEndsAt &&
                 x.ScheduledAt.AddMinutes(x.DurationMinutes) > scheduledAt,
            cancellationToken);
        if (hasConflict)
            return Results.Conflict(new { message = "Já existe uma consulta para este médico no horário selecionado." });

        var appointment = new Appointment
        {
            ClinicId = actor.ClinicId,
            DoctorId = request.DoctorId,
            PatientId = request.PatientId,
            ScheduledAt = scheduledAt,
            DurationMinutes = request.DurationMinutes,
            Notes = request.Notes?.Trim(),
            Price = request.Price,
            PaymentRequired = request.PaymentRequired
        };
        db.Appointments.Add(appointment);
        audit.Add(actor, "Appointment.Create", "Appointment", appointment.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            $"/appointments/{appointment.Id}",
            await AppointmentQuery(db, actor, appointment.Id).SingleAsync(cancellationToken));
    }

    private static async Task<IResult> GetAppointments(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ViewAllAppointments) &&
            !actor.HasAny(ClinicRole.Doctor, ClinicRole.Patient))
        {
            audit.Add(actor, "Appointment.List", "Appointment", null, "Denied", "Perfil sem permissao para lista individual de consultas.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }
        var query = AppointmentQuery(db, actor);
        var appointments = await query.ToListAsync(cancellationToken);
        audit.Add(actor, "Appointment.List", "Appointment", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(appointments);
    }

    private static async Task<IResult> GetAppointment(
        Guid id,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await AppointmentQuery(db, actor, id).SingleOrDefaultAsync(cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        audit.Add(actor, "Appointment.Read", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(appointment);
    }

    private static async Task<IResult> AcceptConsent(
        Guid id,
        ConsentRequest request,
        ClaimsPrincipal principal,
        HttpContext http,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!request.Accepted || request.TermVersion != SecurityText.ConsentTermVersion)
            return Validation("consent", "É necessário aceitar a versão vigente do termo.");
        var appointment = await db.Appointments
            .Include(x => x.Patient)
            .SingleOrDefaultAsync(
                x => x.Id == id && x.ClinicId == actor.ClinicId,
                cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (appointment.Patient.UserId != actor.UserId)
            return Results.Forbid();

        if (!await db.ConsentRecords.AnyAsync(
                x => x.AppointmentId == id &&
                     x.PatientId == appointment.PatientId &&
                     x.TermVersion == request.TermVersion,
                cancellationToken))
        {
            db.ConsentRecords.Add(new ConsentRecord
            {
                ClinicId = appointment.ClinicId,
                AppointmentId = id,
                PatientId = appointment.PatientId,
                UserId = actor.UserId,
                TermVersion = request.TermVersion,
                TermHash = SecurityText.ConsentTermHash(),
                IpAddress = http.Connection.RemoteIpAddress?.ToString(),
                UserAgent = http.Request.Headers.UserAgent.ToString()
            });
        }
        audit.Add(actor, "Consent.Accept", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new
        {
            accepted = true,
            termVersion = SecurityText.ConsentTermVersion,
            term = SecurityText.ConsentTerm
        });
    }

    private static IResult GetConsentTerm() =>
        Results.Ok(new
        {
            termVersion = SecurityText.ConsentTermVersion,
            term = SecurityText.ConsentTerm
        });

    private static async Task<IResult> CancelAppointment(
        Guid id,
        CancelAppointmentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await db.Appointments
            .Include(x => x.Doctor)
            .Include(x => x.Patient)
            .Include(x => x.ConsultationRoom)
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == actor.ClinicId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();

        var isOwnerPatient = actor.HasAny(ClinicRole.Patient) && appointment.Patient.UserId == actor.UserId;
        var isOwnerDoctor = actor.HasAny(ClinicRole.Doctor) && appointment.Doctor.UserId == actor.UserId;
        var isStaff = actor.HasAny(AccessRules.ManageAppointments);
        if (!isOwnerPatient && !isOwnerDoctor && !isStaff)
        {
            audit.Add(actor, "Appointment.Cancel", "Appointment", id, "Denied", "Sem permissao sobre esta consulta.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        if (appointment.Status is AppointmentStatus.Completed or AppointmentStatus.Cancelled or AppointmentStatus.NoShow)
            return Validation("status", "Esta consulta ja foi encerrada e nao pode mais ser cancelada.");

        if (appointment.ConsultationRoom is { Status: VideoSessionStatus.InProgress })
            return Validation("status", "Nao e possivel cancelar uma consulta em andamento. Encerre a chamada primeiro.");

        appointment.Status = AppointmentStatus.Cancelled;
        if (appointment.ConsultationRoom is { Status: VideoSessionStatus.Pending or VideoSessionStatus.Ready } room)
            room.Status = VideoSessionStatus.Cancelled;

        audit.Add(actor, "Appointment.Cancel", "Appointment", id, reason: request.Reason);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(await AppointmentQuery(db, actor, id).SingleAsync(cancellationToken));
    }

    private static async Task<IResult> GetClinicalRecord(
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
            return Results.Forbid();

        var record = await db.ClinicalRecords.AsNoTracking()
            .SingleOrDefaultAsync(x => x.AppointmentId == id, cancellationToken);
        audit.Add(actor, "ClinicalRecord.Read", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return record is null
            ? Results.NotFound()
            : Results.Ok(ToResponse(record));
    }

    private static async Task<IResult> SaveClinicalRecord(
        Guid id,
        ClinicalRecordRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            return Validation("content", "O registro clinico nao pode ficar vazio.");
        if (request.Content.Length > 12000)
            return Validation("content", "O registro clinico deve ter no maximo 12000 caracteres.");
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, id, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsAssignedDoctor(actor, appointment))
            return Results.Forbid();

        var record = await db.ClinicalRecords
            .SingleOrDefaultAsync(x => x.AppointmentId == id, cancellationToken);
        if (record is null)
        {
            record = new ClinicalRecord
            {
                ClinicId = appointment.ClinicId,
                AppointmentId = id,
                CreatedByUserId = actor.UserId,
                Content = request.Content.Trim()
            };
            db.ClinicalRecords.Add(record);
        }
        else
        {
            record.Content = request.Content.Trim();
            record.Version++;
            record.UpdatedAt = DateTime.UtcNow;
        }
        db.ClinicalRecordRevisions.Add(new ClinicalRecordRevision
        {
            ClinicId = appointment.ClinicId,
            ClinicalRecord = record,
            CreatedByUserId = actor.UserId,
            Content = record.Content,
            Version = record.Version
        });
        audit.Add(actor, "ClinicalRecord.Save", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(record));
    }

    private static async Task<IResult> GetPatientClinicalRecords(
        Guid patientId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var patientExists = await db.Patients.AsNoTracking()
            .AnyAsync(x => x.Id == patientId && x.ClinicId == actor.ClinicId, cancellationToken);
        if (!patientExists)
            return Results.NotFound();

        if (!await CanViewPatientClinicalHistory(db, actor, patientId, cancellationToken))
        {
            audit.Add(
                actor,
                "ClinicalRecord.History",
                "Patient",
                patientId,
                "Denied",
                "Perfil sem permissao assistencial para historico de prontuario.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var records = await db.Appointments.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId &&
                        x.PatientId == patientId &&
                        x.ClinicalRecord != null)
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

        audit.Add(actor, "ClinicalRecord.History", "Patient", patientId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(records);
    }

    private static async Task<IResult> GetClinicalRecordAttachments(
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
            return Results.Forbid();

        var query = db.ClinicalRecordAttachments.AsNoTracking()
            .Where(x => x.AppointmentId == id && x.ClinicId == appointment.ClinicId && !x.IsDeleted);
        if (IsPatient(actor, appointment))
            query = query.Where(x => x.ReleasedToPatient);

        var attachments = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => ToResponse(x, actor, appointment))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "ClinicalRecordAttachment.List", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(attachments);
    }

    private static async Task<IResult> UploadClinicalRecordAttachment(
        Guid id,
        IFormFile file,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ClinicalAttachmentStorage storage,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, id, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsAssignedDoctor(actor, appointment) && !IsPatient(actor, appointment))
            return Results.Forbid();

        StoredClinicalAttachment stored;
        try
        {
            stored = await storage.SaveAsync(appointment.ClinicId, id, file, cancellationToken);
        }
        catch (ClinicalAttachmentValidationException ex)
        {
            return Validation("file", ex.Message);
        }

        var record = await db.ClinicalRecords
            .SingleOrDefaultAsync(x => x.AppointmentId == id, cancellationToken);
        var attachment = new ClinicalRecordAttachment
        {
            Id = stored.Id,
            ClinicId = appointment.ClinicId,
            AppointmentId = id,
            ClinicalRecordId = record?.Id,
            UploadedByUserId = actor.UserId,
            FileName = stored.FileName,
            StorageKey = stored.StorageKey,
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            Sha256 = stored.Sha256,
            ReleasedToPatient = IsPatient(actor, appointment)
        };

        db.ClinicalRecordAttachments.Add(attachment);
        audit.Add(actor, "ClinicalRecordAttachment.Upload", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created(
            $"/appointments/{id}/clinical-record/attachments/{attachment.Id}",
            ToResponse(attachment, actor, appointment));
    }

    private static async Task<IResult> DownloadClinicalRecordAttachment(
        Guid id,
        Guid attachmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ClinicalAttachmentStorage storage,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, id, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!CanViewClinical(actor, appointment))
            return Results.Forbid();

        var attachment = await db.ClinicalRecordAttachments.AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == attachmentId &&
                     x.AppointmentId == id &&
                     x.ClinicId == appointment.ClinicId &&
                     !x.IsDeleted,
                cancellationToken);
        if (attachment is null)
            return Results.NotFound();
        if (IsPatient(actor, appointment) && !attachment.ReleasedToPatient)
            return Results.Forbid();

        var path = storage.GetAbsolutePath(attachment.StorageKey);
        if (!File.Exists(path))
            return Results.NotFound();

        audit.Add(actor, "ClinicalRecordAttachment.Download", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.File(
            path,
            attachment.ContentType,
            attachment.FileName,
            enableRangeProcessing: false);
    }

    private static async Task<IResult> DeleteClinicalRecordAttachment(
        Guid id,
        Guid attachmentId,
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
            return Results.Forbid();

        var attachment = await db.ClinicalRecordAttachments
            .SingleOrDefaultAsync(
                x => x.Id == attachmentId &&
                     x.AppointmentId == id &&
                     x.ClinicId == appointment.ClinicId &&
                     !x.IsDeleted,
                cancellationToken);
        if (attachment is null)
            return Results.NotFound();
        if (!CanDeleteClinicalAttachment(actor, appointment, attachment))
            return Results.Forbid();

        attachment.IsDeleted = true;
        attachment.DeletedAt = DateTime.UtcNow;
        attachment.DeletedByUserId = actor.UserId;

        audit.Add(actor, "ClinicalRecordAttachment.Delete", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> StartConsultation(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsAssignedDoctor(actor, appointment))
            return Results.Forbid();
        if (!InJoinWindow(appointment))
            return Results.Conflict(new { message = "A consulta está fora da janela permitida." });
        if (appointment.Status == AppointmentStatus.Cancelled)
            return Results.Conflict(new { message = "A consulta foi cancelada." });
        if (appointment.PaymentRequired &&
            !appointment.Payments.Any(x => x.Status == PaymentStatus.Paid))
            return Results.Conflict(new { message = "A consulta possui pagamento pendente." });

        var room = appointment.ConsultationRoom;
        if (room is null)
        {
            room = new ConsultationRoom
            {
                ClinicId = appointment.ClinicId,
                AppointmentId = appointmentId,
                RoomName = $"medsync-{Guid.NewGuid():N}",
                Status = VideoSessionStatus.Ready,
                StartedAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow
            };
            db.ConsultationRooms.Add(room);
        }
        else
        {
            room.Status = VideoSessionStatus.Ready;
            room.StartedAt ??= DateTime.UtcNow;
            room.LastActivityAt = DateTime.UtcNow;
        }
        appointment.Status = AppointmentStatus.InProgress;
        audit.Add(actor, "Consultation.Start", "Appointment", appointmentId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(room));
    }

    private static async Task<IResult> GetRoom(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!CanJoinVideo(actor, appointment))
            return Results.Forbid();
        if (appointment.ConsultationRoom is not null &&
            (!InJoinWindow(appointment) ||
             appointment.ConsultationRoom.Status is VideoSessionStatus.Completed
                 or VideoSessionStatus.Cancelled
                 or VideoSessionStatus.Expired))
            return Results.Conflict(new { message = "A sala nao esta disponivel." });
        return appointment.ConsultationRoom is null
            ? Results.NotFound(new { message = "Aguarde o médico iniciar a consulta." })
            : Results.Ok(ToResponse(appointment.ConsultationRoom));
    }

    private static async Task<IResult> GetLiveKitToken(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ITokenService tokens,
        IConfiguration configuration,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment?.ConsultationRoom is null)
            return Results.NotFound(new { message = "Sala não iniciada." });
        if (!CanJoinVideo(actor, appointment))
            return Results.Forbid();
        if (!InJoinWindow(appointment) ||
            appointment.ConsultationRoom.Status is VideoSessionStatus.Completed
                or VideoSessionStatus.Cancelled
                or VideoSessionStatus.Expired)
            return Results.Conflict(new { message = "A sala não está disponível." });
        if (IsPatient(actor, appointment) &&
            !appointment.ConsentRecords.Any(x => x.TermVersion == SecurityText.ConsentTermVersion))
            return Results.Conflict(new
            {
                code = "consent_required",
                message = "Aceite o termo de telemedicina antes de entrar.",
                termVersion = SecurityText.ConsentTermVersion,
                term = SecurityText.ConsentTerm
            });

        string liveKitToken;
        string encryptionKey;
        try
        {
            liveKitToken = tokens.CreateLiveKitToken(
                appointment.ConsultationRoom.RoomName,
                actor.UserId.ToString(),
                principal.Identity?.Name);
            encryptionKey = SecurityText.VideoEncryptionKey(
                appointment.ConsultationRoom.RoomName,
                configuration);
        }
        catch (InvalidOperationException ex) when (IsVideoProviderConfigurationError(ex))
        {
            audit.Add(
                actor,
                "Video.TokenIssued",
                "Appointment",
                appointmentId,
                "Denied",
                "Video provider is not configured.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Json(
                new
                {
                    code = "video_provider_not_configured",
                    message = "Videochamada nao configurada neste ambiente. Configure LIVEKIT_API_KEY, LIVEKIT_API_SECRET e VIDEO_E2EE_SECRET na API."
                },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        appointment.ConsultationRoom.Status = VideoSessionStatus.InProgress;
        appointment.ConsultationRoom.LastActivityAt = DateTime.UtcNow;
        audit.Add(actor, "Video.TokenIssued", "Appointment", appointmentId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new
        {
            token = liveKitToken,
            roomName = appointment.ConsultationRoom.RoomName,
            encryptionKey
        });
    }

    private static bool IsVideoProviderConfigurationError(InvalidOperationException exception) =>
        exception.Message.Contains("LIVEKIT_", StringComparison.OrdinalIgnoreCase) ||
        exception.Message.Contains("LiveKit", StringComparison.OrdinalIgnoreCase) ||
        exception.Message.Contains("VIDEO_E2EE_SECRET", StringComparison.OrdinalIgnoreCase);

    private static async Task<IResult> EndConsultation(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        LiveKitRoomManager liveKit,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment?.ConsultationRoom is null)
            return Results.NotFound();
        if (!IsAssignedDoctor(actor, appointment))
            return Results.Forbid();
        var deleteResult = await liveKit.DeleteAsync(appointment.ConsultationRoom.RoomName);
        if (deleteResult == LiveKitDeleteRoomResult.Failed && InJoinWindow(appointment))
            return Results.Problem(
                "Não foi possível desconectar os participantes. Tente encerrar novamente.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        appointment.Status = AppointmentStatus.Completed;
        appointment.ConsultationRoom.Status = VideoSessionStatus.Completed;
        appointment.ConsultationRoom.EndedAt = DateTime.UtcNow;
        audit.Add(
            actor,
            "Consultation.End",
            "Appointment",
            appointmentId,
            deleteResult == LiveKitDeleteRoomResult.Deleted ? "Success" : "Warning",
            deleteResult == LiveKitDeleteRoomResult.Deleted ? null : $"LiveKit delete result: {deleteResult}.");
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> CreateCheckout(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPaymentProvider provider,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsPatient(actor, appointment) && !actor.HasAny(ClinicRole.ClinicAdmin))
            return Results.Forbid();
        if (!provider.IsConfigured)
            return Results.Problem(
                "O provedor de pagamento ainda não está configurado.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        if (appointment.Price is null or <= 0)
            return Validation("price", "A consulta não possui valor configurado.");

        var existing = await db.Payments
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(
                x => x.AppointmentId == appointmentId &&
                     x.Status != PaymentStatus.Cancelled &&
                     x.Status != PaymentStatus.Failed,
                cancellationToken);
        if (existing?.Status == PaymentStatus.Paid)
            return Results.Ok(ToResponse(existing));

        var payment = existing ?? new Payment
        {
            ClinicId = appointment.ClinicId,
            AppointmentId = appointmentId,
            Provider = "MercadoPago",
            Amount = appointment.Price.Value
        };
        if (existing is null)
            db.Payments.Add(payment);

        var checkout = await provider.CreateCheckoutAsync(
            payment.Id,
            payment.Amount,
            appointment.Patient.Email,
            cancellationToken);
        payment.ProviderPreferenceId = checkout.PreferenceId;
        payment.CheckoutUrl = checkout.CheckoutUrl;
        payment.UpdatedAt = DateTime.UtcNow;
        audit.Add(actor, "Payment.CheckoutCreated", "Payment", payment.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(payment));
    }

    private static async Task<IResult> GetPayment(
        Guid appointmentId,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        var appointment = await LoadAppointment(db, actor, appointmentId, cancellationToken);
        if (appointment is null)
            return Results.NotFound();
        if (!IsPatient(actor, appointment) &&
            !IsAssignedDoctor(actor, appointment) &&
            !actor.HasAny(ClinicRole.ClinicAdmin))
            return Results.Forbid();
        var payment = appointment.Payments.OrderByDescending(x => x.CreatedAt).FirstOrDefault();
        return payment is null ? Results.NotFound() : Results.Ok(ToResponse(payment));
    }

    private static async Task<IResult> MercadoPagoWebhook(
        HttpContext http,
        MedSyncDbContext db,
        IPaymentProvider provider,
        CancellationToken cancellationToken)
    {
        var signature = http.Request.Headers["x-signature"].ToString();
        var requestId = http.Request.Headers["x-request-id"].ToString();
        var dataId = http.Request.Query["data.id"].ToString();
        if (string.IsNullOrWhiteSpace(dataId))
            dataId = http.Request.Query["id"].ToString();
        if (!provider.ValidateWebhook(signature, requestId, dataId))
            return Results.Unauthorized();

        var providerPayment = await provider.GetPaymentAsync(dataId, cancellationToken);
        if (!Guid.TryParse(providerPayment.ExternalReference, out var paymentId))
            return Results.Ok();
        var payment = await db.Payments.SingleOrDefaultAsync(x => x.Id == paymentId, cancellationToken);
        if (payment is null)
            return Results.Ok();
        payment.ProviderPaymentId = providerPayment.ProviderPaymentId;
        payment.Status = providerPayment.Status;
        payment.UpdatedAt = DateTime.UtcNow;
        db.AuditEvents.Add(new AuditEvent
        {
            ClinicId = payment.ClinicId,
            Action = "Payment.Webhook",
            ResourceType = "Payment",
            ResourceId = payment.Id.ToString(),
            Result = "Success"
        });
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok();
    }

    private static IQueryable<AppointmentResponse> AppointmentQuery(
        MedSyncDbContext db,
        RequestContext actor,
        Guid? appointmentId = null)
    {
        var query = db.Appointments.AsNoTracking();
        if (appointmentId.HasValue)
            query = query.Where(x => x.Id == appointmentId.Value);

        if (actor.HasAny(AccessRules.ViewAllAppointments))
        {
            query = query.Where(x => x.ClinicId == actor.ClinicId);
            // Escopo integral do ambiente; campos sensíveis ainda são filtrados abaixo.
        }
        else if (actor.HasAny(ClinicRole.Doctor))
        {
            query = query.Where(x => x.Doctor.UserId == actor.UserId);
        }
        else if (actor.HasAny(ClinicRole.Patient))
        {
            query = query.Where(x => x.ClinicId == actor.ClinicId && x.Patient.UserId == actor.UserId);
        }
        else
        {
            query = query.Where(_ => false);
        }

        // Notes and medications are clinical: only the assigned doctor sees them, per appointment.
        var isDoctor = actor.HasAny(ClinicRole.Doctor);
        var actorUserId = actor.UserId;
        var now = DateTime.UtcNow;
        return query.OrderByDescending(x => x.ScheduledAt)
            .Select(x => new AppointmentResponse(
                x.Id,
                x.DoctorId,
                x.Doctor.Name,
                x.Doctor.Specialty,
                x.PatientId,
                x.Patient.Name,
                x.ScheduledAt,
                x.DurationMinutes,
                x.Status,
                isDoctor && x.Doctor.UserId == actorUserId ? x.Notes : null,
                x.Price,
                x.PaymentRequired,
                x.Payments.OrderByDescending(p => p.CreatedAt)
                    .Select(p => (PaymentStatus?)p.Status)
                    .FirstOrDefault(),
                x.ConsentRecords.Any(c => c.TermVersion == SecurityText.ConsentTermVersion),
                x.ConsultationRoom == null ||
                    x.ConsultationRoom.Status == VideoSessionStatus.Completed ||
                    x.ConsultationRoom.Status == VideoSessionStatus.Cancelled ||
                    x.ConsultationRoom.Status == VideoSessionStatus.Expired ||
                    now < x.ScheduledAt.AddMinutes(-15) ||
                    now > x.ScheduledAt.AddMinutes(x.DurationMinutes + 15)
                    ? null
                    : x.ConsultationRoom.RoomName,
                x.ConsultationRoom == null ? null : x.ConsultationRoom.Status,
                isDoctor && x.Doctor.UserId == actorUserId ? x.Patient.ContinuousMedications : null));
    }


    private static Task<Appointment?> LoadAppointment(
        MedSyncDbContext db,
        RequestContext actor,
        Guid id,
        CancellationToken cancellationToken)
    {
        var query = db.Appointments
            .Include(x => x.Doctor)
            .Include(x => x.Patient)
            .Include(x => x.ConsultationRoom)
            .Include(x => x.ConsentRecords)
            .Include(x => x.Payments)
            .Where(x => x.Id == id);

        if (actor.HasAny(AccessRules.ViewAllAppointments))
            query = query.Where(x => x.ClinicId == actor.ClinicId);
        else if (actor.HasAny(ClinicRole.Doctor))
            query = query.Where(x => x.Doctor.UserId == actor.UserId);
        else if (actor.HasAny(ClinicRole.Patient))
            query = query.Where(x => x.ClinicId == actor.ClinicId && x.Patient.UserId == actor.UserId);
        else
            query = query.Where(_ => false);

        return query.SingleOrDefaultAsync(cancellationToken);
    }

    private static bool CanAccessAppointment(RequestContext actor, Appointment appointment) =>
        actor.HasAny(AccessRules.ViewAllAppointments) ||
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    // Médico ADM access to other doctors' records needs the justification flow (ADR-0003, rule C3); until it exists, none.
    private static bool CanViewClinical(RequestContext actor, Appointment appointment) =>
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static Task<bool> CanViewPatientClinicalHistory(
        MedSyncDbContext db,
        RequestContext actor,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        if (actor.HasAny(ClinicRole.Doctor))
        {
            return db.Appointments.AsNoTracking()
                .AnyAsync(
                    x => x.ClinicId == actor.ClinicId &&
                         x.PatientId == patientId &&
                         x.Doctor.UserId == actor.UserId,
                    cancellationToken);
        }

        return Task.FromResult(false);
    }

    private static bool CanJoinVideo(RequestContext actor, Appointment appointment) =>
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool IsAssignedDoctor(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Doctor) && appointment.Doctor.UserId == actor.UserId;

    private static bool IsPatient(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Patient) && appointment.Patient.UserId == actor.UserId;

    private static bool CanDeleteClinicalAttachment(
        RequestContext actor,
        Appointment appointment,
        ClinicalRecordAttachment attachment) =>
        IsAssignedDoctor(actor, appointment) ||
        (IsPatient(actor, appointment) &&
         attachment.UploadedByUserId == actor.UserId &&
         attachment.ReleasedToPatient);

    private static bool CanOperatePrivacy(RequestContext actor) => actor.IsDpo;

    private static bool CanUpdatePrivacyRequest(RequestContext actor) => actor.IsDpo;

    private static bool CanOperateSupport(RequestContext actor) => actor.IsSupport || actor.IsMedicalAdmin;

    private static IResult? ValidatePrivacyRequest(
        string requesterName,
        string requesterEmail,
        string subjectReference,
        string description)
    {
        if (requesterName.Length < 3)
            return Validation("requesterName", "Informe o nome do solicitante.");
        if (!IsValidEmail(requesterEmail))
            return Validation("requesterEmail", "Informe um e-mail valido.");
        if (subjectReference.Length < 3)
            return Validation("subjectReference", "Informe uma referencia minimizada do titular.");
        if (subjectReference.Length > 160)
            return Validation("subjectReference", "Referencia deve ter ate 160 caracteres.");
        if (LooksLikeFullCpf(subjectReference))
            return Validation("subjectReference", "Nao registre CPF completo; use e-mail, protocolo ou referencia mascarada.");
        if (description.Length < 10)
            return Validation("description", "Descreva a solicitacao com pelo menos 10 caracteres.");
        if (description.Length > 1000)
            return Validation("description", "Descricao deve ter ate 1000 caracteres.");
        if (LooksLikeFullCpf(description))
            return Validation("description", "Nao registre CPF completo ou dado clinico na descricao.");
        return null;
    }

    private static IResult? ValidateSupportRequest(string subject, string description)
    {
        if (subject.Length < 3)
            return Validation("subject", "Informe um assunto para a solicitacao.");
        if (subject.Length > 160)
            return Validation("subject", "Assunto deve ter ate 160 caracteres.");
        if (description.Length < 10)
            return Validation("description", "Descreva o que voce precisa com pelo menos 10 caracteres.");
        if (description.Length > 1000)
            return Validation("description", "Descricao deve ter ate 1000 caracteres.");
        if (LooksLikeFullCpf(description))
            return Validation("description", "Nao registre CPF completo ou dado sensivel na descricao.");
        return null;
    }

    private static bool LooksLikeFullCpf(string value)
    {
        var digits = DigitsOnly(value);
        return digits.Length == 11 && IsValidCpf(digits);
    }

    private static bool InJoinWindow(Appointment appointment)
    {
        var now = DateTime.UtcNow;
        var opens = appointment.ScheduledAt.AddMinutes(-15);
        var closes = appointment.ScheduledAt
            .AddMinutes(appointment.DurationMinutes)
            .AddMinutes(15);
        return now >= opens && now <= closes;
    }

    private static void SetSessionCookie(
        HttpContext http,
        string jwt,
        IConfiguration configuration)
    {
        var sameSite = Enum.TryParse<SameSiteMode>(
            Environment.GetEnvironmentVariable("AUTH_COOKIE_SAMESITE")
                ?? configuration["Auth:CookieSameSite"]
                ?? "Lax",
            true,
            out var parsed)
            ? parsed
            : SameSiteMode.Lax;
        var host = http.Request.Host.Host;
        var isLocalRequest = host.Contains("localhost", StringComparison.OrdinalIgnoreCase) ||
            (IPAddress.TryParse(host, out var address) && IPAddress.IsLoopback(address));
        var secure = !isLocalRequest;
        http.Response.Cookies.Append(SessionCookie, jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure || sameSite == SameSiteMode.None,
            SameSite = sameSite,
            Path = "/",
            MaxAge = TimeSpan.FromMinutes(
                configuration.GetValue<int?>("Jwt:ExpiresMinutes") ?? 15),
            IsEssential = true
        });
    }

    private static UserSummary ToUserSummary(
        User user,
        Clinic clinic,
        IReadOnlyCollection<ClinicRole> roles) =>
        new(user.Id, user.Name, user.Email, clinic.Id, clinic.Name, roles, user.MustChangePassword, clinic.ActivationStatus);

    private static PersonalProfileResponse ToPersonalProfile(
        User user,
        Clinic clinic,
        IReadOnlyCollection<ClinicRole> roles,
        Patient? patient,
        Doctor? doctor)
    {
        var lockedFields = new List<string>
        {
            "Papel/permissao",
            "Clínica",
            "Dados clinicos"
        };
        if (patient is not null)
            lockedFields.Add("CPF");
        if (doctor is not null)
        {
            lockedFields.Add("CRM");
            lockedFields.Add("Especialidade");
        }

        var profileType = doctor is not null
            ? "Profissional de saude"
            : patient is not null
                ? "Paciente"
                : "Perfil administrativo";

        return new PersonalProfileResponse(
            user.Id,
            user.Name,
            user.Email,
            clinic.Id,
            clinic.Name,
            roles,
            patient?.Phone ?? doctor?.Phone,
            profileType,
            lockedFields,
            user.MfaEnabled);
    }

    private static PatientResponse ToResponse(Patient patient, bool includeContinuousMedications = true) =>
        new(
            patient.Id,
            patient.Name,
            patient.Email,
            SecurityText.MaskCpf(patient.Cpf),
            patient.BirthDate,
            patient.Phone,
            includeContinuousMedications ? patient.ContinuousMedications : null);

    private static DoctorResponse ToResponse(Doctor doctor) =>
        new(doctor.Id, doctor.Name, doctor.Email, doctor.Crm, doctor.CrmUf, doctor.Specialty, doctor.Phone, doctor.ProfessionalAddress);

    private static RoomResponse ToResponse(ConsultationRoom room) =>
        new(
            room.Id,
            room.AppointmentId,
            room.RoomName,
            room.Status,
            room.CreatedAt,
            room.StartedAt,
            room.EndedAt);

    private static ClinicalRecordResponse ToResponse(ClinicalRecord record) =>
        new(
            record.Id,
            record.AppointmentId,
            record.Content,
            record.Version,
            record.CreatedAt,
            record.UpdatedAt);

    private static ClinicalRecordAttachmentResponse ToResponse(
        ClinicalRecordAttachment attachment,
        RequestContext actor,
        Appointment appointment) =>
        new(
            attachment.Id,
            attachment.AppointmentId,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes,
            attachment.ReleasedToPatient,
            attachment.CreatedAt,
            CanDeleteClinicalAttachment(actor, appointment, attachment));

    private static PaymentResponse ToResponse(Payment payment) =>
        new(
            payment.Id,
            payment.AppointmentId,
            payment.Amount,
            payment.Currency,
            payment.Status,
            payment.CheckoutUrl);

    private static PrivacyRequestResponse ToResponse(PrivacyRequest request) =>
        new(
            request.Id,
            request.RequesterName,
            request.RequesterEmail,
            request.SubjectReference,
            request.Type,
            request.Status,
            request.Description,
            request.ResolutionNote,
            request.CreatedAt,
            request.UpdatedAt);

    private static SupportRequestResponse ToResponse(SupportRequest request) =>
        new(
            request.Id,
            request.RequesterName,
            request.RequesterEmail,
            request.Subject,
            request.Status,
            request.Description,
            request.ResolutionNote,
            request.CreatedAt,
            request.UpdatedAt);

    private static IResult Validation(string key, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [key] = [message] });

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;
        try
        {
            var parsed = new MailAddress(email.Trim());
            return parsed.Address.Equals(email.Trim(), StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static bool IsValidOptionalPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return true;
        var digits = DigitsOnly(phone);
        return digits.Length is >= 10 and <= 13;
    }

    private static string DigitsOnly(string value) =>
        new(value.Where(char.IsDigit).ToArray());

    private static string MaskTaxId(string taxId)
    {
        var digits = DigitsOnly(taxId);
        return digits.Length == 14 ? $"**.{digits[2..5]}.{digits[5..8]}/****-{digits[12..14]}" : "***";
    }

    private static bool IsValidCpf(string cpf)
    {
        if (cpf.Length != 11 || cpf.Distinct().Count() == 1)
            return false;

        var firstSum = cpf.Take(9)
            .Select((digit, index) => (digit - '0') * (10 - index))
            .Sum();
        var firstDigit = firstSum % 11 < 2 ? 0 : 11 - firstSum % 11;
        if (firstDigit != cpf[9] - '0')
            return false;

        var secondSum = cpf.Take(10)
            .Select((digit, index) => (digit - '0') * (11 - index))
            .Sum();
        var secondDigit = secondSum % 11 < 2 ? 0 : 11 - secondSum % 11;
        return secondDigit == cpf[10] - '0';
    }

    private static bool IsValidCnpj(string cnpj)
    {
        if (cnpj.Length != 14 || cnpj.Distinct().Count() == 1)
            return false;

        int CheckDigit(string value, int[] weights)
        {
            var sum = value
                .Take(weights.Length)
                .Select((digit, index) => (digit - '0') * weights[index])
                .Sum();
            var remainder = sum % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        }

        var firstWeights = new[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        var secondWeights = new[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        return CheckDigit(cnpj, firstWeights) == cnpj[12] - '0' &&
            CheckDigit(cnpj, secondWeights) == cnpj[13] - '0';
    }
}
