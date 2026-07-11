using System.Net;
using System.Security.Claims;
using System.Net.Mail;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class ApiEndpoints
{
    private const string SessionCookie = "medsync_session";

    public static IEndpointRouteBuilder MapMedSyncEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/login", Login).AllowAnonymous().RequireRateLimiting("auth");
        app.MapPost("/auth/register-clinic", RegisterClinic).AllowAnonymous().RequireRateLimiting("auth");
        app.MapPost("/payments/mercadopago/webhook", MercadoPagoWebhook).AllowAnonymous();

        var protectedApi = app.MapGroup(string.Empty).RequireAuthorization();
        protectedApi.MapGet("/auth/me", Me);
        protectedApi.MapPost("/auth/logout", Logout);
        protectedApi.MapPost("/auth/change-password", ChangePassword);
        protectedApi.MapPost("/staff-users", CreateStaffUser);
        protectedApi.MapGet("/staff-users", GetStaffUsers);
        protectedApi.MapGet("/audit-events", GetAuditEvents);
        protectedApi.MapPost("/companies/onboarding", CreateCompanyOnboarding);
        protectedApi.MapGet("/companies/activation", GetCompanyActivations);
        protectedApi.MapPut("/companies/{id:guid}/activation", UpdateCompanyActivation);
        protectedApi.MapGet("/company-portal", GetCompanyPortal);
        protectedApi.MapGet("/company-beneficiaries", GetCompanyBeneficiaries);
        protectedApi.MapPut("/company-beneficiaries/{id:guid}/eligibility", UpdateCompanyBeneficiaryEligibility);
        protectedApi.MapGet("/finance/invoices", GetFinanceInvoices);
        protectedApi.MapGet("/finance/export", GetFinancialExport);
        protectedApi.MapGet("/privacy/requests", GetPrivacyRequests);
        protectedApi.MapPost("/privacy/requests", CreatePrivacyRequest);
        protectedApi.MapPut("/privacy/requests/{id:guid}/status", UpdatePrivacyRequestStatus);
        protectedApi.MapGet("/reports/business-summary", GetBusinessReport);

        protectedApi.MapPost("/patients", CreatePatient);
        protectedApi.MapGet("/patients", GetPatients);
        protectedApi.MapPut("/patients/{id:guid}", UpdatePatient);
        protectedApi.MapPost("/doctors", CreateDoctor);
        protectedApi.MapGet("/doctors", GetDoctors);
        protectedApi.MapPut("/doctors/{id:guid}", UpdateDoctor);
        protectedApi.MapPost("/appointments", CreateAppointment);
        protectedApi.MapGet("/appointments", GetAppointments);
        protectedApi.MapGet("/appointments/{id:guid}", GetAppointment);
        protectedApi.MapPost("/appointments/{id:guid}/consent", AcceptConsent);
        protectedApi.MapGet("/consent/term", GetConsentTerm);
        protectedApi.MapGet("/appointments/{id:guid}/clinical-record", GetClinicalRecord);
        protectedApi.MapPut("/appointments/{id:guid}/clinical-record", SaveClinicalRecord);

        protectedApi.MapPost("/consultations/{appointmentId:guid}/start", StartConsultation);
        protectedApi.MapGet("/consultations/{appointmentId:guid}/room", GetRoom);
        protectedApi.MapPost("/consultations/{appointmentId:guid}/token", GetLiveKitToken);
        protectedApi.MapPost("/consultations/{appointmentId:guid}/end", EndConsultation);

        protectedApi.MapPost("/appointments/{appointmentId:guid}/payments/checkout", CreateCheckout);
        protectedApi.MapGet("/appointments/{appointmentId:guid}/payments", GetPayment);

        return app;
    }

    private static readonly ClinicRole[] StaffRoles =
    [
        ClinicRole.Receptionist,
        ClinicRole.Finance,
        ClinicRole.ClinicAdmin,
        ClinicRole.PrivacyAuditor,
        ClinicRole.CompanyAdmin,
        ClinicRole.CompanyFinance,
        ClinicRole.PlatformFinance,
        ClinicRole.Support,
        ClinicRole.CompanyAuditor,
        ClinicRole.PlatformAuditor,
        ClinicRole.DataProtectionOfficer,
        ClinicRole.PlatformAdmin,
        ClinicRole.OccupationalHealthAdmin
    ];

    private static readonly ClinicRole[] PlatformStaffRoles =
    [
        ClinicRole.PlatformFinance,
        ClinicRole.Support,
        ClinicRole.PlatformAuditor,
        ClinicRole.DataProtectionOfficer,
        ClinicRole.PlatformAdmin,
        ClinicRole.OccupationalHealthAdmin
    ];

    private static readonly ClinicRole[] CompanyStaffRoles =
    [
        ClinicRole.CompanyAdmin,
        ClinicRole.CompanyFinance,
        ClinicRole.CompanyAuditor
    ];

    private static async Task<IResult> CreateStaffUser(
        CreateStaffUserRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.ClinicAdmin, ClinicRole.PlatformAdmin, ClinicRole.CompanyAdmin))
            return Results.Forbid();
        if (!StaffRoles.Contains(request.Role))
            return Validation("role", "Selecione um perfil administrativo permitido.");
        if (actor.HasAny(ClinicRole.PlatformAdmin) &&
            !PlatformStaffRoles.Contains(request.Role))
            return Validation("role", "Admin MedSync pode criar apenas perfis operacionais MedSync.");
        if (actor.HasAny(ClinicRole.CompanyAdmin) &&
            !actor.HasAny(ClinicRole.PlatformAdmin) &&
            !CompanyStaffRoles.Contains(request.Role))
            return Validation("role", "Empresa admin pode criar apenas perfis da propria empresa.");
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
        if (!actor.HasAny(
                ClinicRole.ClinicAdmin,
                ClinicRole.CompanyAdmin,
                ClinicRole.PrivacyAuditor,
                ClinicRole.PlatformAdmin,
                ClinicRole.CompanyAuditor,
                ClinicRole.PlatformAuditor,
                ClinicRole.DataProtectionOfficer))
            return Results.Forbid();

        var allowedRoles = actor.HasAny(ClinicRole.PlatformAdmin)
            ? PlatformStaffRoles
            : actor.HasAny(ClinicRole.CompanyAdmin)
                ? CompanyStaffRoles
                : StaffRoles;

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

    private static async Task<IResult> GetAuditEvents(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.PrivacyAuditor,
                ClinicRole.ClinicAdmin,
                ClinicRole.CompanyAuditor,
                ClinicRole.PlatformAuditor,
                ClinicRole.DataProtectionOfficer,
                ClinicRole.PlatformAdmin))
            return Results.Forbid();

        var events = await db.AuditEvents.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId)
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

    private static async Task<IResult> CreateCompanyOnboarding(
        CreateCompanyOnboardingRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        IPasswordService passwords,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.Support, ClinicRole.PlatformAdmin))
            return Results.Forbid();

        var legalName = request.LegalName.Trim();
        var tradeName = string.IsNullOrWhiteSpace(request.TradeName) ? legalName : request.TradeName.Trim();
        var taxId = DigitsOnly(request.TaxId);
        var planName = request.PlanName.Trim();
        var adminName = request.AdminName.Trim();
        var adminEmail = request.AdminEmail.Trim().ToLowerInvariant();

        if (legalName.Length is < 3 or > 180)
            return Validation("legalName", "Razao social deve ter entre 3 e 180 caracteres.");
        if (tradeName.Length > 180)
            return Validation("tradeName", "Nome fantasia deve ter ate 180 caracteres.");
        if (!IsValidCnpj(taxId))
            return Validation("taxId", "Informe um CNPJ valido.");
        if (planName.Length is < 3 or > 120)
            return Validation("planName", "Plano deve ter entre 3 e 120 caracteres.");
        if (request.MonthlyFee <= 0 || request.MonthlyFee > 1_000_000)
            return Validation("monthlyFee", "Valor mensal deve ser maior que zero e menor que 1.000.000.");
        if (request.MonthlyConsultationLimit is < 1 or > 100_000)
            return Validation("monthlyConsultationLimit", "Limite mensal deve estar entre 1 e 100.000 consultas.");
        if (adminName.Length is < 3 or > 160)
            return Validation("adminName", "Nome do admin deve ter entre 3 e 160 caracteres.");
        if (!IsValidEmail(adminEmail))
            return Validation("adminEmail", "Informe um e-mail valido para o admin.");
        if (PasswordPolicy.Validate(request.TemporaryPassword) is { } passwordError)
            return Validation("temporaryPassword", passwordError);
        if (await db.Companies.AnyAsync(x => x.TaxId == taxId, cancellationToken))
            return Results.Conflict(new { message = "Ja existe uma empresa com este CNPJ." });
        if (await db.Users.AnyAsync(x => x.Email == adminEmail, cancellationToken))
            return Results.Conflict(new { message = "Ja existe uma conta com este e-mail." });

        var tenant = new Clinic
        {
            Name = tradeName,
            Slug = SecurityText.Slug(tradeName)
        };
        var company = new Company
        {
            Clinic = tenant,
            LegalName = legalName,
            TradeName = tradeName,
            TaxId = taxId,
            IsActive = false
        };
        var plan = new BenefitPlan
        {
            Clinic = tenant,
            Name = planName,
            Description = "Plano criado no onboarding assistido MedSync.",
            MonthlyFee = request.MonthlyFee,
            MonthlyConsultationLimit = request.MonthlyConsultationLimit
        };
        var contract = new CompanyContract
        {
            ClinicId = tenant.Id,
            Company = company,
            BenefitPlan = plan,
            Status = CompanyContractStatus.Draft,
            StartsAt = DateOnly.FromDateTime(DateTime.UtcNow.Date)
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
            Clinic = tenant,
            User = admin,
            Role = ClinicRole.CompanyAdmin
        };

        db.AddRange(tenant, company, plan, contract, admin, membership);
        audit.Add(actor, "Company.OnboardingCreate", "Company", company.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created(
            $"/companies/{company.Id}",
            new CompanyOnboardingResponse(
                company.Id,
                tenant.Id,
                tradeName,
                MaskTaxId(taxId),
                adminEmail,
                contract.Status,
                company.IsActive,
                $"Enviar boas-vindas para {adminEmail}: acesso criado, troca de senha obrigatoria, CNPJ aguardando habilitacao pelo ADM MedSync."));
    }

    private static async Task<IResult> GetCompanyActivations(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.PlatformAdmin))
            return Results.Forbid();

        var companies = await db.Companies.AsNoTracking()
            .Include(x => x.Clinic)
            .Include(x => x.Contracts)
            .ThenInclude(x => x.BenefitPlan)
            .OrderBy(x => x.TradeName ?? x.LegalName)
            .ToListAsync(cancellationToken);

        return Results.Ok(companies.Select(x => new CompanyActivationResponse(
            x.Id,
            x.ClinicId,
            x.Clinic.Name,
            x.TradeName ?? x.LegalName,
            MaskTaxId(x.TaxId),
            x.Contracts
                .OrderByDescending(c => c.StartsAt)
                .Select(c => c.BenefitPlan.Name)
                .FirstOrDefault(),
            x.Contracts
                .OrderByDescending(c => c.StartsAt)
                .Select(c => (CompanyContractStatus?)c.Status)
                .FirstOrDefault(),
            x.IsActive,
            x.CreatedAt)));
    }

    private static async Task<IResult> UpdateCompanyActivation(
        Guid id,
        UpdateCompanyActivationRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(ClinicRole.PlatformAdmin))
        {
            audit.Add(actor, "Company.ActivationUpdate", "Company", id, "Denied", "Somente ADM MedSync pode habilitar CNPJ.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var company = await db.Companies
            .Include(x => x.Clinic)
            .Include(x => x.Contracts)
            .ThenInclude(x => x.BenefitPlan)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (company is null)
            return Results.NotFound();

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? request.IsActive ? "CNPJ habilitado pelo ADM MedSync." : "CNPJ desabilitado pelo ADM MedSync."
            : request.Reason.Trim();
        if (reason.Length > 240)
            return Validation("reason", "Motivo deve ter ate 240 caracteres.");

        company.IsActive = request.IsActive;
        var latestContract = company.Contracts.OrderByDescending(x => x.StartsAt).FirstOrDefault();
        if (latestContract is not null)
            latestContract.Status = request.IsActive ? CompanyContractStatus.Active : CompanyContractStatus.Suspended;

        audit.Add(actor, "Company.ActivationUpdate", "Company", company.Id, "Success", reason);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new CompanyActivationResponse(
            company.Id,
            company.ClinicId,
            company.Clinic.Name,
            company.TradeName ?? company.LegalName,
            MaskTaxId(company.TaxId),
            latestContract?.BenefitPlan.Name,
            latestContract?.Status,
            company.IsActive,
            company.CreatedAt));
    }

    private static async Task<IResult> GetCompanyPortal(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.CompanyAdmin,
                ClinicRole.CompanyFinance,
                ClinicRole.CompanyAuditor,
                ClinicRole.PlatformAdmin,
                ClinicRole.PlatformFinance))
            return Results.Forbid();

        var company = await db.Companies.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.IsActive)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (company is null)
            return Results.NotFound(new { message = "Empresa contratante nao encontrada para este ambiente." });

        var contract = await db.CompanyContracts.AsNoTracking()
            .Include(x => x.BenefitPlan)
            .Where(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id)
            .OrderByDescending(x => x.StartsAt)
            .FirstOrDefaultAsync(cancellationToken);

        var beneficiaryCount = await db.CompanyEmployees.AsNoTracking()
            .CountAsync(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id, cancellationToken);
        var eligibleCount = await db.CompanyEmployees.AsNoTracking()
            .CountAsync(
                x => x.ClinicId == actor.ClinicId &&
                     x.CompanyId == company.Id &&
                     x.IsActive &&
                     x.EligibilityRecords.Any(e => e.IsEligible),
                cancellationToken);
        var inactiveCount = await db.CompanyEmployees.AsNoTracking()
            .CountAsync(
                x => x.ClinicId == actor.ClinicId &&
                     x.CompanyId == company.Id &&
                     !x.IsActive,
                cancellationToken);

        const int minimumAggregationGroup = 5;
        var hideUsage = eligibleCount < minimumAggregationGroup;
        int? totalConsultations = null;
        int? scheduledConsultations = null;
        int? inProgressConsultations = null;
        int? completedConsultations = null;

        if (!hideUsage)
        {
            var linkedPatientIds = db.CompanyEmployees.AsNoTracking()
                .Where(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id && x.PatientId != null)
                .Select(x => x.PatientId!.Value);
            var appointments = db.Appointments.AsNoTracking()
                .Where(x => x.ClinicId == actor.ClinicId && linkedPatientIds.Contains(x.PatientId));

            totalConsultations = await appointments.CountAsync(cancellationToken);
            scheduledConsultations = await appointments
                .CountAsync(x => x.Status == AppointmentStatus.Scheduled, cancellationToken);
            inProgressConsultations = await appointments
                .CountAsync(x => x.Status == AppointmentStatus.InProgress, cancellationToken);
            completedConsultations = await appointments
                .CountAsync(x => x.Status == AppointmentStatus.Completed, cancellationToken);
        }

        audit.Add(actor, "CompanyPortal.View", "Company", company.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new CompanyPortalResponse(
            new CompanyPortalCompanyResponse(
                company.Id,
                company.LegalName,
                company.TradeName,
                MaskTaxId(company.TaxId),
                company.IsActive),
            contract is null
                ? null
                : new CompanyPortalContractResponse(
                    contract.Id,
                    contract.BenefitPlan.Name,
                    contract.Status,
                    contract.StartsAt,
                    contract.EndsAt,
                    contract.BenefitPlan.MonthlyConsultationLimit),
            new CompanyPortalEligibilityResponse(
                beneficiaryCount,
                eligibleCount,
                inactiveCount),
            new CompanyPortalUsageResponse(
                totalConsultations,
                scheduledConsultations,
                inProgressConsultations,
                completedConsultations,
                hideUsage,
                hideUsage
                    ? $"Uso agregado oculto ate existir grupo minimo de {minimumAggregationGroup} elegiveis."
                    : null),
            new CompanyPortalBillingResponse(
                contract?.BenefitPlan.MonthlyFee,
                "BRL",
                contract is null ? "Sem contrato ativo" : "Contrato em homologacao",
                "Emissao de faturas ainda depende da especificacao financeira aprovada."),
            [
                "Empresas acessam apenas dados administrativos e agregados.",
                "Uso clinico individual nao e exposto no portal empresarial.",
                "Relatorios dependem de grupo minimo para reduzir risco de reidentificacao."
            ]));
    }

    private static async Task<IResult> GetCompanyBeneficiaries(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.CompanyAdmin,
                ClinicRole.Support,
                ClinicRole.PlatformAdmin))
        {
            audit.Add(actor, "CompanyEligibility.List", "Company", null, "Denied", "Perfil sem permissao para lista individual de elegibilidade.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var company = await db.Companies.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.IsActive)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (company is null)
            return Results.NotFound(new { message = "Empresa contratante nao encontrada para este ambiente." });

        var beneficiaries = await db.CompanyEmployees.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id)
            .OrderBy(x => x.Name)
            .Select(x => new CompanyBeneficiaryResponse(
                x.Id,
                x.Name,
                x.Email,
                x.EmployeeCode,
                x.IsActive,
                x.EligibilityRecords
                    .OrderByDescending(e => e.EligibleFrom)
                    .Select(e => e.BenefitPlan.Name)
                    .FirstOrDefault(),
                x.EligibilityRecords
                    .OrderByDescending(e => e.EligibleFrom)
                    .Select(e => e.IsEligible)
                    .FirstOrDefault(),
                x.EligibilityRecords
                    .OrderByDescending(e => e.EligibleFrom)
                    .Select(e => (DateOnly?)e.EligibleFrom)
                    .FirstOrDefault(),
                x.EligibilityRecords
                    .OrderByDescending(e => e.EligibleFrom)
                    .Select(e => e.EligibleUntil)
                    .FirstOrDefault(),
                x.EligibilityRecords
                    .OrderByDescending(e => e.EligibleFrom)
                    .Select(e => e.Reason)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        audit.Add(actor, "CompanyEligibility.List", "Company", company.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(beneficiaries);
    }

    private static async Task<IResult> UpdateCompanyBeneficiaryEligibility(
        Guid id,
        UpdateCompanyBeneficiaryEligibilityRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.CompanyAdmin,
                ClinicRole.Support,
                ClinicRole.PlatformAdmin))
        {
            audit.Add(actor, "CompanyEligibility.Update", "CompanyEmployee", id, "Denied", "Perfil sem permissao para atualizar elegibilidade.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var beneficiary = await db.CompanyEmployees
            .Include(x => x.EligibilityRecords)
            .ThenInclude(x => x.BenefitPlan)
            .SingleOrDefaultAsync(
                x => x.Id == id && x.ClinicId == actor.ClinicId,
                cancellationToken);
        if (beneficiary is null)
            return Results.NotFound();

        var activeContract = await db.CompanyContracts.AsNoTracking()
            .Include(x => x.BenefitPlan)
            .Where(x =>
                x.ClinicId == actor.ClinicId &&
                x.CompanyId == beneficiary.CompanyId &&
                x.Status == CompanyContractStatus.Active)
            .OrderByDescending(x => x.StartsAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (activeContract is null)
            return Results.Conflict(new { message = "Nao existe contrato ativo para alterar elegibilidade." });

        if (request.EligibleUntil is not null &&
            request.EligibleUntil < DateOnly.FromDateTime(DateTime.UtcNow.Date))
            return Validation("eligibleUntil", "A data final de elegibilidade nao pode estar no passado.");

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? request.IsEligible ? "Elegibilidade atualizada." : "Beneficiario inativado administrativamente."
            : request.Reason.Trim();
        if (reason.Length > 240)
            return Validation("reason", "Motivo administrativo deve ter ate 240 caracteres.");

        var latest = beneficiary.EligibilityRecords
            .OrderByDescending(x => x.EligibleFrom)
            .FirstOrDefault();
        if (latest is null || latest.BenefitPlanId != activeContract.BenefitPlanId)
        {
            latest = new EmployeeEligibility
            {
                ClinicId = actor.ClinicId,
                CompanyEmployeeId = beneficiary.Id,
                BenefitPlanId = activeContract.BenefitPlanId,
                EligibleFrom = DateOnly.FromDateTime(DateTime.UtcNow.Date)
            };
            db.EmployeeEligibilities.Add(latest);
        }

        beneficiary.IsActive = request.IsEligible;
        latest.IsEligible = request.IsEligible;
        latest.EligibleUntil = request.EligibleUntil;
        latest.Reason = reason;

        audit.Add(actor, "CompanyEligibility.Update", "CompanyEmployee", beneficiary.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new CompanyBeneficiaryResponse(
            beneficiary.Id,
            beneficiary.Name,
            beneficiary.Email,
            beneficiary.EmployeeCode,
            beneficiary.IsActive,
            latest.BenefitPlan?.Name ?? activeContract.BenefitPlan.Name,
            latest.IsEligible,
            latest.EligibleFrom,
            latest.EligibleUntil,
            latest.Reason));
    }

    private static async Task<IResult> GetFinanceInvoices(
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.CompanyAdmin,
                ClinicRole.CompanyFinance,
                ClinicRole.PlatformAdmin,
                ClinicRole.PlatformFinance))
        {
            audit.Add(actor, "FinanceInvoice.List", "Company", null, "Denied", "Perfil sem permissao financeira.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        var company = await db.Companies.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.IsActive)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (company is null)
            return Results.NotFound(new { message = "Empresa contratante nao encontrada para este ambiente." });

        var contract = await db.CompanyContracts.AsNoTracking()
            .Include(x => x.BenefitPlan)
            .Where(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id)
            .OrderByDescending(x => x.StartsAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (contract is null)
            return Results.Ok(Array.Empty<FinanceInvoiceResponse>());

        var now = DateTime.UtcNow;
        var periodStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextPeriodStart = periodStart.AddMonths(1);
        var period = $"{periodStart:yyyy-MM}";

        var linkedPatientIds = db.CompanyEmployees.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && x.CompanyId == company.Id && x.PatientId != null)
            .Select(x => x.PatientId!.Value);

        var paidAmount = await db.Payments.AsNoTracking()
            .Where(x =>
                x.ClinicId == actor.ClinicId &&
                x.CreatedAt >= periodStart &&
                x.CreatedAt < nextPeriodStart &&
                x.Status == PaymentStatus.Paid &&
                linkedPatientIds.Contains(x.Appointment.PatientId))
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var amount = contract.BenefitPlan.MonthlyFee;
        var status = paidAmount >= amount ? "Pago" : "Aberta";
        var dueDate = DateOnly.FromDateTime(periodStart.AddDays(9));

        audit.Add(actor, "FinanceInvoice.List", "Company", company.Id);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new[]
        {
            new FinanceInvoiceResponse(
                $"{company.Id:N}-{period}",
                period,
                $"Mensalidade {contract.BenefitPlan.Name}",
                amount,
                paidAmount,
                "BRL",
                status,
                dueDate,
                periodStart,
            "Fatura de homologacao baseada no contrato ativo e pagamentos confirmados. Sem dado clinico individual.")
        });
    }

    private static async Task<IResult> GetFinancialExport(
        string? period,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(
                ClinicRole.CompanyAdmin,
                ClinicRole.CompanyFinance,
                ClinicRole.PlatformAdmin,
                ClinicRole.PlatformFinance))
        {
            audit.Add(actor, "FinanceExport.Generate", "Company", null, "Denied", "Perfil sem permissao para exportacao financeira.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        if (!TryResolvePeriod(period, out var periodStart))
            return Validation("period", "Periodo deve usar o formato yyyy-MM.");

        var nextPeriodStart = periodStart.AddMonths(1);
        var periodLabel = $"{periodStart:yyyy-MM}";
        var isGlobal = actor.HasAny(ClinicRole.PlatformAdmin, ClinicRole.PlatformFinance);
        var companiesQuery = db.Companies.AsNoTracking()
            .Include(x => x.Clinic)
            .Where(x => x.IsActive);
        if (!isGlobal)
            companiesQuery = companiesQuery.Where(x => x.ClinicId == actor.ClinicId);

        var companies = await companiesQuery
            .OrderBy(x => x.TradeName ?? x.LegalName)
            .ToListAsync(cancellationToken);

        var rows = new List<FinancialExportRowResponse>();
        foreach (var company in companies)
        {
            var contract = await db.CompanyContracts.AsNoTracking()
                .Include(x => x.BenefitPlan)
                .Where(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id)
                .OrderByDescending(x => x.StartsAt)
                .FirstOrDefaultAsync(cancellationToken);
            var beneficiaryCount = await db.CompanyEmployees.AsNoTracking()
                .CountAsync(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id, cancellationToken);
            var eligibleCount = await db.CompanyEmployees.AsNoTracking()
                .CountAsync(
                    x => x.ClinicId == company.ClinicId &&
                         x.CompanyId == company.Id &&
                         x.IsActive &&
                         x.EligibilityRecords.Any(e => e.IsEligible),
                    cancellationToken);
            var linkedPatientIds = db.CompanyEmployees.AsNoTracking()
                .Where(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id && x.PatientId != null)
                .Select(x => x.PatientId!.Value);
            var paidAmount = await db.Payments.AsNoTracking()
                .Where(x =>
                    x.ClinicId == company.ClinicId &&
                    x.CreatedAt >= periodStart &&
                    x.CreatedAt < nextPeriodStart &&
                    x.Status == PaymentStatus.Paid &&
                    linkedPatientIds.Contains(x.Appointment.PatientId))
                .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var monthlyFee = contract?.BenefitPlan.MonthlyFee ?? 0m;
            var openAmount = Math.Max(0m, monthlyFee - paidAmount);
            var billingStatus = contract is null
                ? "Sem contrato"
                : openAmount <= 0 ? "Pago" : "Aberta";

            rows.Add(new FinancialExportRowResponse(
                company.Id,
                company.ClinicId,
                company.Clinic.Name,
                company.TradeName ?? company.LegalName,
                MaskTaxId(company.TaxId),
                contract?.BenefitPlan.Name,
                contract?.Status,
                beneficiaryCount,
                eligibleCount,
                monthlyFee,
                paidAmount,
                openAmount,
                "BRL",
                billingStatus));
        }

        audit.Add(actor, "FinanceExport.Generate", isGlobal ? "Platform" : "Company", isGlobal ? null : rows.FirstOrDefault()?.CompanyId);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new FinancialExportResponse(
            periodLabel,
            isGlobal,
            DateTime.UtcNow,
            rows,
            [
                "Exportacao financeira minimizada por CNPJ.",
                "Nao inclui CPF, prontuario, diagnostico, observacao clinica, conteudo de chamada ou lista individual sensivel.",
                "Empresa contratante exporta apenas o proprio CNPJ; MedSync exporta visao global conforme perfil autorizado."
            ]));
    }

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

        var query = db.PrivacyRequests.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId);

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
            .SingleOrDefaultAsync(x => x.Id == id && x.ClinicId == actor.ClinicId, cancellationToken);
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

    private static async Task<IResult> GetBusinessReport(
        string? period,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!CanViewBusinessReports(actor))
        {
            audit.Add(actor, "BusinessReport.View", "Company", null, "Denied", "Perfil sem permissao para relatorios B2B.");
            await db.SaveChangesAsync(cancellationToken);
            return Results.Forbid();
        }

        if (!TryResolvePeriod(period, out var periodStart))
            return Validation("period", "Periodo deve usar o formato yyyy-MM.");

        var nextPeriodStart = periodStart.AddMonths(1);
        var periodLabel = $"{periodStart:yyyy-MM}";
        var isGlobal = CanViewGlobalBusinessReports(actor);
        var minimumAggregationGroup = 3;

        var companiesQuery = db.Companies.AsNoTracking()
            .Include(x => x.Clinic)
            .Where(x => x.IsActive);
        if (!isGlobal)
            companiesQuery = companiesQuery.Where(x => x.ClinicId == actor.ClinicId);

        var companies = await companiesQuery
            .OrderBy(x => x.TradeName ?? x.LegalName)
            .ToListAsync(cancellationToken);

        var reportItems = new List<BusinessReportCompanyResponse>();
        foreach (var company in companies)
        {
            var contract = await db.CompanyContracts.AsNoTracking()
                .Include(x => x.BenefitPlan)
                .Where(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id)
                .OrderByDescending(x => x.StartsAt)
                .FirstOrDefaultAsync(cancellationToken);

            var beneficiaryCount = await db.CompanyEmployees.AsNoTracking()
                .CountAsync(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id, cancellationToken);
            var eligibleCount = await db.CompanyEmployees.AsNoTracking()
                .CountAsync(
                    x => x.ClinicId == company.ClinicId &&
                         x.CompanyId == company.Id &&
                         x.IsActive &&
                         x.EligibilityRecords.Any(e => e.IsEligible),
                    cancellationToken);
            var inactiveCount = await db.CompanyEmployees.AsNoTracking()
                .CountAsync(
                    x => x.ClinicId == company.ClinicId &&
                         x.CompanyId == company.Id &&
                         !x.IsActive,
                    cancellationToken);

            var linkedPatientIds = db.CompanyEmployees.AsNoTracking()
                .Where(x => x.ClinicId == company.ClinicId && x.CompanyId == company.Id && x.PatientId != null)
                .Select(x => x.PatientId!.Value);

            var usageQuery = db.Appointments.AsNoTracking()
                .Where(x =>
                    x.ClinicId == company.ClinicId &&
                    x.ScheduledAt >= periodStart &&
                    x.ScheduledAt < nextPeriodStart &&
                    linkedPatientIds.Contains(x.PatientId));

            var hideUsage = eligibleCount < minimumAggregationGroup;
            int? totalConsultations = null;
            int? scheduledConsultations = null;
            int? inProgressConsultations = null;
            int? completedConsultations = null;
            if (!hideUsage)
            {
                totalConsultations = await usageQuery.CountAsync(cancellationToken);
                scheduledConsultations = await usageQuery.CountAsync(x => x.Status == AppointmentStatus.Scheduled, cancellationToken);
                inProgressConsultations = await usageQuery.CountAsync(x => x.Status == AppointmentStatus.InProgress, cancellationToken);
                completedConsultations = await usageQuery.CountAsync(x => x.Status == AppointmentStatus.Completed, cancellationToken);
            }

            var paidAmount = await db.Payments.AsNoTracking()
                .Where(x =>
                    x.ClinicId == company.ClinicId &&
                    x.CreatedAt >= periodStart &&
                    x.CreatedAt < nextPeriodStart &&
                    x.Status == PaymentStatus.Paid &&
                    linkedPatientIds.Contains(x.Appointment.PatientId))
                .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var monthlyFee = contract?.BenefitPlan.MonthlyFee;
            var billingStatus = monthlyFee is null
                ? "Sem contrato"
                : paidAmount >= monthlyFee ? "Pago" : "Aberta";

            reportItems.Add(new BusinessReportCompanyResponse(
                company.Id,
                company.ClinicId,
                company.Clinic.Name,
                company.TradeName ?? company.LegalName,
                MaskTaxId(company.TaxId),
                contract?.BenefitPlan.Name,
                contract?.Status,
                beneficiaryCount,
                eligibleCount,
                inactiveCount,
                totalConsultations,
                scheduledConsultations,
                inProgressConsultations,
                completedConsultations,
                hideUsage,
                hideUsage ? $"Uso agregado oculto ate existir grupo minimo de {minimumAggregationGroup} elegiveis." : null,
                monthlyFee,
                paidAmount,
                "BRL",
                billingStatus));
        }

        audit.Add(actor, "BusinessReport.View", isGlobal ? "Company.Global" : "Company", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new BusinessReportResponse(
            periodLabel,
            isGlobal,
            reportItems,
            [
                "Relatorio B2B exibe apenas dados administrativos e agregados.",
                "Uso assistencial pode ser ocultado quando nao ha grupo minimo.",
                "Prontuario, diagnostico, observacao clinica e conteudo de chamada nao sao retornados."
            ]));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        HttpContext http,
        MedSyncDbContext db,
        IPasswordService passwords,
        ITokenService tokens,
        AuditWriter audit,
        IConfiguration configuration,
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
        var actor = new RequestContext(user.Id, clinic.Id, roles.ToHashSet());
        audit.Add(actor, "Auth.Login", "User", user.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new LoginResponse(ToUserSummary(user, clinic, roles)));
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
        return Results.Problem(
            "Cadastro empresarial direto foi desabilitado. O primeiro cadastro deve ser realizado pelo suporte MedSync.",
            statusCode: StatusCodes.Status403Forbidden);

#pragma warning disable CS0162
        if (string.IsNullOrWhiteSpace(request.ClinicName) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email))
            return Validation("registration", "Empresa, nome e e-mail são obrigatórios.");
        if (PasswordPolicy.Validate(request.Password) is { } passwordError)
            return Validation("password", passwordError);

        var taxId = DigitsOnly(request.TaxId ?? string.Empty);
        if (!IsValidCnpj(taxId))
            return Validation("taxId", "Informe um CNPJ valido para a empresa contratante.");
        var monthlyFee = request.MonthlyFee ?? 0m;
        if (monthlyFee <= 0)
            return Validation("monthlyFee", "Informe um valor mensal maior que zero.");
        var monthlyConsultationLimit = request.MonthlyConsultationLimit ?? 0;
        if (monthlyConsultationLimit <= 0)
            return Validation("monthlyConsultationLimit", "Informe um limite mensal de consultas maior que zero.");
        var planName = string.IsNullOrWhiteSpace(request.PlanName)
            ? "Plano empresarial inicial"
            : request.PlanName.Trim();
        if (planName.Length < 3)
            return Validation("planName", "Informe o nome do plano contratado.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email, cancellationToken))
            return Results.Conflict(new { message = "Já existe uma conta com este e-mail." });

        var clinic = new Clinic
        {
            Name = request.ClinicName.Trim(),
            Slug = SecurityText.Slug(request.ClinicName)
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
            Role = ClinicRole.CompanyAdmin
        };
        var company = new Company
        {
            Clinic = clinic,
            LegalName = request.ClinicName.Trim(),
            TradeName = string.IsNullOrWhiteSpace(request.TradeName) ? request.ClinicName.Trim() : request.TradeName.Trim(),
            TaxId = taxId
        };
        var plan = new BenefitPlan
        {
            Clinic = clinic,
            Name = planName,
            Description = "Plano empresarial criado no cadastro de homologacao.",
            MonthlyFee = monthlyFee,
            MonthlyConsultationLimit = monthlyConsultationLimit
        };
        var contract = new CompanyContract
        {
            ClinicId = clinic.Id,
            Company = company,
            BenefitPlan = plan,
            Status = CompanyContractStatus.Active,
            StartsAt = DateOnly.FromDateTime(DateTime.UtcNow.Date)
        };
        db.AddRange(clinic, user, membership, company, plan, contract);
        var roles = new[] { ClinicRole.CompanyAdmin };
        var actor = new RequestContext(user.Id, clinic.Id, roles.ToHashSet());
        audit.Add(actor, "Company.Register", "Company", company.Id);
        await db.SaveChangesAsync(cancellationToken);

        SetSessionCookie(http, tokens.CreateJwt(user, clinic, roles), configuration);
        return Results.Created(
            $"/companies/{company.Id}",
            new LoginResponse(ToUserSummary(user, clinic, roles)));
#pragma warning restore CS0162
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

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == actor.ClinicId && (x.Email == email || x.Cpf == cpf),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um paciente com este e-mail ou CPF na empresa." });

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
            Phone = request.Phone?.Trim()
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
        audit.Add(actor, "Patient.List", "Patient", null);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(patients.Select(ToResponse));
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
            return Validation("email", "Informe um e-mail vÃ¡lido.");
        if (request.BirthDate == default)
            return Validation("birthDate", "Informe a data de nascimento.");
        if (request.BirthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            return Validation("birthDate", "A data de nascimento nÃ£o pode estar no futuro.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone vÃ¡lido com DDD.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == actor.ClinicId && x.Id != id && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "JÃ¡ existe um paciente com este e-mail na empresa." });
        if (await db.Users.AnyAsync(
                x => x.Id != patient.UserId && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "JÃ¡ existe uma conta usando este e-mail." });

        patient.Name = name;
        patient.Email = email;
        patient.BirthDate = request.BirthDate;
        patient.Phone = request.Phone?.Trim();
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
            return Results.Conflict(new { message = "Já existe um médico com este e-mail ou CRM na empresa." });

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
                x.Id, x.Name, x.Email, x.Crm, x.CrmUf, x.Specialty, x.Phone))
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
        if (!canUpdateOwn && !actor.HasAny(AccessRules.ManageDoctors))
            return Results.Forbid();

        var name = request.Name.Trim();
        if (name.Length < 3)
            return Validation("name", "Informe o nome completo do mÃ©dico.");
        if (!IsValidEmail(request.Email))
            return Validation("email", "Informe um e-mail vÃ¡lido.");
        if (string.IsNullOrWhiteSpace(request.Crm))
            return Validation("crm", "CRM Ã© obrigatÃ³rio.");
        var crmUf = request.CrmUf.Trim().ToUpperInvariant();
        if (crmUf.Length != 2 || !crmUf.All(char.IsLetter))
            return Validation("crmUf", "Informe a UF do CRM com duas letras.");
        if (string.IsNullOrWhiteSpace(request.Specialty))
            return Validation("specialty", "Especialidade Ã© obrigatÃ³ria.");
        if (!IsValidOptionalPhone(request.Phone))
            return Validation("phone", "Informe um telefone vÃ¡lido com DDD.");

        var email = request.Email.Trim().ToLowerInvariant();
        var crm = request.Crm.Trim();
        if (await db.Doctors.AnyAsync(
                x => x.ClinicId == actor.ClinicId && x.Id != id && (x.Email == email || x.Crm == crm),
                cancellationToken))
            return Results.Conflict(new { message = "JÃ¡ existe um mÃ©dico com este e-mail ou CRM na empresa." });
        if (await db.Users.AnyAsync(
                x => x.Id != doctor.UserId && x.Email == email,
                cancellationToken))
            return Results.Conflict(new { message = "JÃ¡ existe uma conta usando este e-mail." });

        doctor.Name = name;
        doctor.Email = email;
        doctor.Crm = crm;
        doctor.CrmUf = crmUf;
        doctor.Specialty = request.Specialty.Trim();
        doctor.Phone = request.Phone?.Trim();
        if (doctor.User is not null)
        {
            doctor.User.Name = name;
            doctor.User.Email = email;
        }

        audit.Add(actor, "Doctor.Update", "Doctor", doctor.Id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(doctor));
    }

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (actor.HasAny(ClinicRole.Doctor, ClinicRole.PlatformAdmin))
            return Results.Forbid();
        if (!actor.HasAny(AccessRules.ManageAppointments))
            return Results.Forbid();
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
                ClinicId = actor.ClinicId,
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
            return Validation("content", "O registro clínico não pode ficar vazio.");
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
                ClinicId = actor.ClinicId,
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
            ClinicId = actor.ClinicId,
            ClinicalRecord = record,
            CreatedByUserId = actor.UserId,
            Content = record.Content,
            Version = record.Version
        });
        audit.Add(actor, "ClinicalRecord.Save", "Appointment", id);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(ToResponse(record));
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
                ClinicId = actor.ClinicId,
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

        appointment.ConsultationRoom.Status = VideoSessionStatus.InProgress;
        appointment.ConsultationRoom.LastActivityAt = DateTime.UtcNow;
        audit.Add(actor, "Video.TokenIssued", "Appointment", appointmentId);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new
        {
            token = tokens.CreateLiveKitToken(
                appointment.ConsultationRoom.RoomName,
                actor.UserId.ToString(),
                principal.Identity?.Name),
            roomName = appointment.ConsultationRoom.RoomName,
            encryptionKey = SecurityText.VideoEncryptionKey(
                appointment.ConsultationRoom.RoomName,
                configuration)
        });
    }

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
        if (!await liveKit.DeleteAsync(appointment.ConsultationRoom.RoomName))
            return Results.Problem(
                "Não foi possível desconectar os participantes. Tente encerrar novamente.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        appointment.Status = AppointmentStatus.Completed;
        appointment.ConsultationRoom.Status = VideoSessionStatus.Completed;
        appointment.ConsultationRoom.EndedAt = DateTime.UtcNow;
        audit.Add(actor, "Consultation.End", "Appointment", appointmentId);
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
        if (!IsPatient(actor, appointment) &&
            !actor.HasAny(
                ClinicRole.Finance,
                ClinicRole.ClinicAdmin,
                ClinicRole.CompanyFinance,
                ClinicRole.PlatformFinance,
                ClinicRole.PlatformAdmin))
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
            ClinicId = actor.ClinicId,
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
            !actor.HasAny(
                ClinicRole.Finance,
                ClinicRole.ClinicAdmin,
                ClinicRole.MedicalDirector,
                ClinicRole.CompanyFinance,
                ClinicRole.PlatformFinance,
                ClinicRole.PlatformAdmin))
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
        var query = db.Appointments.AsNoTracking().Where(x => x.ClinicId == actor.ClinicId);
        if (appointmentId.HasValue)
            query = query.Where(x => x.Id == appointmentId.Value);

        if (actor.HasAny(AccessRules.ViewAllAppointments))
        {
            // Escopo integral do ambiente; campos sensíveis ainda são filtrados abaixo.
        }
        else if (actor.HasAny(ClinicRole.Doctor))
        {
            query = query.Where(x => x.Doctor.UserId == actor.UserId);
        }
        else if (actor.HasAny(ClinicRole.Patient))
        {
            query = query.Where(x => x.Patient.UserId == actor.UserId);
        }
        else
        {
            query = query.Where(_ => false);
        }

        var canSeeNotes = actor.HasAny(
            ClinicRole.Doctor,
            ClinicRole.MedicalDirector,
            ClinicRole.OccupationalHealthAdmin);
        return query.OrderBy(x => x.ScheduledAt)
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
                canSeeNotes ? x.Notes : null,
                x.Price,
                x.PaymentRequired,
                x.Payments.OrderByDescending(p => p.CreatedAt)
                    .Select(p => (PaymentStatus?)p.Status)
                    .FirstOrDefault(),
                x.ConsentRecords.Any(c => c.TermVersion == SecurityText.ConsentTermVersion),
                x.ConsultationRoom == null ? null : x.ConsultationRoom.RoomName,
                x.ConsultationRoom == null ? null : x.ConsultationRoom.Status));
    }

    private static Task<Appointment?> LoadAppointment(
        MedSyncDbContext db,
        RequestContext actor,
        Guid id,
        CancellationToken cancellationToken) =>
        db.Appointments
            .Include(x => x.Doctor)
            .Include(x => x.Patient)
            .Include(x => x.ConsultationRoom)
            .Include(x => x.ConsentRecords)
            .Include(x => x.Payments)
            .SingleOrDefaultAsync(
                x => x.Id == id && x.ClinicId == actor.ClinicId,
                cancellationToken);

    private static bool CanAccessAppointment(RequestContext actor, Appointment appointment) =>
        actor.HasAny(AccessRules.ViewAllAppointments) ||
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool CanViewClinical(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.MedicalDirector) ||
        actor.HasAny(ClinicRole.OccupationalHealthAdmin) ||
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool CanJoinVideo(RequestContext actor, Appointment appointment) =>
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool IsAssignedDoctor(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Doctor) && appointment.Doctor.UserId == actor.UserId;

    private static bool IsPatient(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Patient) && appointment.Patient.UserId == actor.UserId;

    private static bool CanOperatePrivacy(RequestContext actor) =>
        actor.HasAny(
            ClinicRole.Support,
            ClinicRole.PrivacyAuditor,
            ClinicRole.PlatformAuditor,
            ClinicRole.DataProtectionOfficer,
            ClinicRole.PlatformAdmin);

    private static bool CanUpdatePrivacyRequest(RequestContext actor) =>
        actor.HasAny(
            ClinicRole.PrivacyAuditor,
            ClinicRole.PlatformAuditor,
            ClinicRole.DataProtectionOfficer,
            ClinicRole.PlatformAdmin);

    private static bool CanViewBusinessReports(RequestContext actor) =>
        actor.HasAny(
            ClinicRole.CompanyAdmin,
            ClinicRole.CompanyFinance,
            ClinicRole.CompanyAuditor,
            ClinicRole.PlatformAdmin,
            ClinicRole.PlatformFinance,
            ClinicRole.PlatformAuditor,
            ClinicRole.DataProtectionOfficer);

    private static bool CanViewGlobalBusinessReports(RequestContext actor) =>
        actor.HasAny(
            ClinicRole.PlatformAdmin,
            ClinicRole.PlatformFinance,
            ClinicRole.PlatformAuditor,
            ClinicRole.DataProtectionOfficer);

    private static bool TryResolvePeriod(string? value, out DateTime periodStart)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            var now = DateTime.UtcNow;
            periodStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            return true;
        }

        var parts = value.Split('-', StringSplitOptions.TrimEntries);
        if (parts.Length == 2 &&
            int.TryParse(parts[0], out var year) &&
            int.TryParse(parts[1], out var month) &&
            year is >= 2020 and <= 2100 &&
            month is >= 1 and <= 12)
        {
            periodStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            return true;
        }

        periodStart = default;
        return false;
    }

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
        new(user.Id, user.Name, user.Email, clinic.Id, clinic.Name, roles, user.MustChangePassword);

    private static PatientResponse ToResponse(Patient patient) =>
        new(
            patient.Id,
            patient.Name,
            patient.Email,
            SecurityText.MaskCpf(patient.Cpf),
            patient.BirthDate,
            patient.Phone);

    private static DoctorResponse ToResponse(Doctor doctor) =>
        new(doctor.Id, doctor.Name, doctor.Email, doctor.Crm, doctor.CrmUf, doctor.Specialty, doctor.Phone);

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
