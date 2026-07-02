using System.Security.Claims;
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

        protectedApi.MapPost("/patients", CreatePatient);
        protectedApi.MapGet("/patients", GetPatients);
        protectedApi.MapPost("/doctors", CreateDoctor);
        protectedApi.MapGet("/doctors", GetDoctors);
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
        ClinicRole.PrivacyAuditor
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
        if (!actor.HasAny(ClinicRole.ClinicAdmin))
            return Results.Forbid();
        if (!StaffRoles.Contains(request.Role))
            return Validation("role", "Selecione um perfil administrativo permitido.");
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
            return Results.Conflict(new { message = "Esta conta já está vinculada à clínica." });
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
        if (!actor.HasAny(ClinicRole.ClinicAdmin, ClinicRole.PrivacyAuditor))
            return Results.Forbid();

        var users = await db.ClinicMemberships.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId && StaffRoles.Contains(x.Role))
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
        if (!actor.HasAny(ClinicRole.PrivacyAuditor, ClinicRole.ClinicAdmin))
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
        if (string.IsNullOrWhiteSpace(request.ClinicName) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email))
            return Validation("registration", "Clínica, nome e e-mail são obrigatórios.");
        if (PasswordPolicy.Validate(request.Password) is { } passwordError)
            return Validation("password", passwordError);

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
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Cpf))
            return Validation("patient", "Nome, e-mail e CPF são obrigatórios.");

        var email = request.Email.Trim().ToLowerInvariant();
        var cpf = request.Cpf.Trim();
        if (await db.Patients.AnyAsync(
                x => x.ClinicId == actor.ClinicId && (x.Email == email || x.Cpf == cpf),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um paciente com este e-mail ou CPF na clínica." });

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
            return Results.Conflict(new { message = "Esta conta já está vinculada à clínica." });
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
        if (actor.HasAny(AccessRules.ManagePatients))
        {
            // Acesso administrativo dentro da clínica.
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
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Crm) ||
            string.IsNullOrWhiteSpace(request.Specialty))
            return Validation("doctor", "Nome, e-mail, CRM e especialidade são obrigatórios.");

        var email = request.Email.Trim().ToLowerInvariant();
        var crm = request.Crm.Trim();
        if (await db.Doctors.AnyAsync(
                x => x.ClinicId == actor.ClinicId && (x.Email == email || x.Crm == crm),
                cancellationToken))
            return Results.Conflict(new { message = "Já existe um médico com este e-mail ou CRM na clínica." });

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
            return Results.Conflict(new { message = "Esta conta já está vinculada à clínica." });
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
        var doctors = await db.Doctors.AsNoTracking()
            .Where(x => x.ClinicId == actor.ClinicId)
            .OrderBy(x => x.Name)
            .Select(x => new DoctorResponse(
                x.Id, x.Name, x.Email, x.Crm, x.Specialty, x.Phone))
            .ToListAsync(cancellationToken);
        return Results.Ok(doctors);
    }

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        AuditWriter audit,
        CancellationToken cancellationToken)
    {
        var actor = RequestContext.From(principal);
        if (!actor.HasAny(AccessRules.ManageAppointments) && !actor.HasAny(ClinicRole.Doctor))
            return Results.Forbid();
        if (request.DurationMinutes is < 15 or > 240)
            return Validation("durationMinutes", "A duração deve estar entre 15 e 240 minutos.");
        if (request.Price is < 0)
            return Validation("price", "O valor não pode ser negativo.");

        var doctor = await db.Doctors.SingleOrDefaultAsync(
            x => x.Id == request.DoctorId && x.ClinicId == actor.ClinicId,
            cancellationToken);
        var patientExists = await db.Patients.AnyAsync(
            x => x.Id == request.PatientId && x.ClinicId == actor.ClinicId,
            cancellationToken);
        if (doctor is null || !patientExists)
            return Results.BadRequest(new { message = "Médico ou paciente inválido." });
        if (actor.HasAny(ClinicRole.Doctor) &&
            !actor.HasAny(AccessRules.ManageAppointments) &&
            doctor.UserId != actor.UserId)
            return Results.Forbid();

        var appointment = new Appointment
        {
            ClinicId = actor.ClinicId,
            DoctorId = request.DoctorId,
            PatientId = request.PatientId,
            ScheduledAt = request.ScheduledAt.ToUniversalTime(),
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
        var query = AppointmentQuery(db, actor);
        if (query is null)
            return Results.Forbid();
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
        if (!IsAssignedDoctor(actor, appointment) && !actor.HasAny(ClinicRole.MedicalDirector))
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
        if (!IsAssignedDoctor(actor, appointment) && !actor.HasAny(ClinicRole.MedicalDirector))
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
        if (!IsAssignedDoctor(actor, appointment) && !actor.HasAny(ClinicRole.MedicalDirector))
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
            !actor.HasAny(ClinicRole.Finance, ClinicRole.ClinicAdmin))
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
            !actor.HasAny(ClinicRole.Finance, ClinicRole.ClinicAdmin, ClinicRole.MedicalDirector))
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
            // Escopo integral da clínica; campos sensíveis ainda são filtrados abaixo.
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

        var canSeeNotes = actor.HasAny(ClinicRole.Doctor, ClinicRole.MedicalDirector);
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
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool CanJoinVideo(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.MedicalDirector) ||
        IsAssignedDoctor(actor, appointment) ||
        IsPatient(actor, appointment);

    private static bool IsAssignedDoctor(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Doctor) && appointment.Doctor.UserId == actor.UserId;

    private static bool IsPatient(RequestContext actor, Appointment appointment) =>
        actor.HasAny(ClinicRole.Patient) && appointment.Patient.UserId == actor.UserId;

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
        var secure = !http.Request.Host.Host.Contains("localhost", StringComparison.OrdinalIgnoreCase);
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
        new(doctor.Id, doctor.Name, doctor.Email, doctor.Crm, doctor.Specialty, doctor.Phone);

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

    private static IResult Validation(string key, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [key] = [message] });
}
