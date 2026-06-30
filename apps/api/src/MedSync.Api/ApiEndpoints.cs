using System.Security.Claims;
using System.Text.Json;
using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace MedSync.Api;

public static class ApiEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static IEndpointRouteBuilder MapMedSyncEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/auth/login", Login).AllowAnonymous();

        var protectedApi = app.MapGroup(string.Empty).RequireAuthorization();
        protectedApi.MapPost("/patients", CreatePatient);
        protectedApi.MapGet("/patients", GetPatients);
        protectedApi.MapPost("/doctors", CreateDoctor);
        protectedApi.MapGet("/doctors", GetDoctors);
        protectedApi.MapPost("/appointments", CreateAppointment);
        protectedApi.MapGet("/appointments", GetAppointments);
        protectedApi.MapGet("/appointments/{id:guid}", GetAppointment);
        protectedApi.MapPost("/consultations/{appointmentId:guid}/room", CreateRoom);
        protectedApi.MapGet("/livekit/token", GetLiveKitToken);

        return app;
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        MedSyncDbContext db,
        IPasswordService passwords,
        ITokenService tokens,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);
        if (user is null || !passwords.Verify(request.Password, user.PasswordHash))
            return Results.Unauthorized();

        return Results.Ok(new LoginResponse(
            tokens.CreateJwt(user),
            new UserSummary(user.Id, user.Name, user.Email, user.Role)));
    }

    private static async Task<IResult> CreatePatient(
        CreatePatientRequest request,
        MedSyncDbContext db,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Cpf))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["patient"] = ["Nome, e-mail e CPF são obrigatórios."]
            });

        var email = request.Email.Trim().ToLowerInvariant();
        var cpf = request.Cpf.Trim();
        if (await db.Patients.AnyAsync(x => x.Email == email || x.Cpf == cpf, cancellationToken))
            return Results.Conflict(new { message = "Já existe um paciente com este e-mail ou CPF." });

        var patient = new Patient
        {
            Name = request.Name.Trim(),
            Email = email,
            Cpf = cpf,
            BirthDate = request.BirthDate,
            Phone = request.Phone?.Trim()
        };
        db.Patients.Add(patient);
        await db.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync("patients:all", cancellationToken);
        return Results.Created($"/patients/{patient.Id}", ToResponse(patient));
    }

    private static async Task<IResult> GetPatients(
        MedSyncDbContext db,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var cached = await cache.GetStringAsync("patients:all", cancellationToken);
        if (cached is not null)
            return Results.Content(cached, "application/json");

        var patients = await db.Patients.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new PatientResponse(x.Id, x.Name, x.Email, x.Cpf, x.BirthDate, x.Phone))
            .ToListAsync(cancellationToken);
        await cache.SetStringAsync(
            "patients:all",
            JsonSerializer.Serialize(patients, JsonOptions),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) },
            cancellationToken);
        return Results.Ok(patients);
    }

    private static async Task<IResult> CreateDoctor(
        CreateDoctorRequest request,
        MedSyncDbContext db,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Crm) ||
            string.IsNullOrWhiteSpace(request.Specialty))
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["doctor"] = ["Nome, e-mail, CRM e especialidade são obrigatórios."]
            });

        var email = request.Email.Trim().ToLowerInvariant();
        var crm = request.Crm.Trim();
        if (await db.Doctors.AnyAsync(x => x.Email == email || x.Crm == crm, cancellationToken))
            return Results.Conflict(new { message = "Já existe um médico com este e-mail ou CRM." });

        var doctor = new Doctor
        {
            Name = request.Name.Trim(),
            Email = email,
            Crm = crm,
            Specialty = request.Specialty.Trim(),
            Phone = request.Phone?.Trim()
        };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync("doctors:all", cancellationToken);
        return Results.Created($"/doctors/{doctor.Id}", ToResponse(doctor));
    }

    private static async Task<IResult> GetDoctors(
        MedSyncDbContext db,
        IDistributedCache cache,
        CancellationToken cancellationToken)
    {
        var cached = await cache.GetStringAsync("doctors:all", cancellationToken);
        if (cached is not null)
            return Results.Content(cached, "application/json");

        var doctors = await db.Doctors.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new DoctorResponse(
                x.Id, x.Name, x.Email, x.Crm, x.Specialty, x.Phone))
            .ToListAsync(cancellationToken);
        await cache.SetStringAsync(
            "doctors:all",
            JsonSerializer.Serialize(doctors, JsonOptions),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) },
            cancellationToken);
        return Results.Ok(doctors);
    }

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        if (!await db.Doctors.AnyAsync(x => x.Id == request.DoctorId, cancellationToken) ||
            !await db.Patients.AnyAsync(x => x.Id == request.PatientId, cancellationToken))
            return Results.BadRequest(new { message = "Médico ou paciente inválido." });

        var appointment = new Appointment
        {
            DoctorId = request.DoctorId,
            PatientId = request.PatientId,
            ScheduledAt = request.ScheduledAt.ToUniversalTime(),
            Notes = request.Notes?.Trim()
        };
        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        var response = await AppointmentQuery(db)
            .SingleAsync(x => x.Id == appointment.Id, cancellationToken);
        return Results.Created($"/appointments/{appointment.Id}", response);
    }

    private static async Task<IResult> GetAppointments(
        MedSyncDbContext db,
        CancellationToken cancellationToken) =>
        Results.Ok(await AppointmentQuery(db)
            .ToListAsync(cancellationToken));

    private static async Task<IResult> GetAppointment(
        Guid id,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var appointment = await AppointmentQuery(db)
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return appointment is null ? Results.NotFound() : Results.Ok(appointment);
    }

    private static async Task<IResult> CreateRoom(
        Guid appointmentId,
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .Include(x => x.ConsultationRoom)
            .SingleOrDefaultAsync(x => x.Id == appointmentId, cancellationToken);
        if (appointment is null)
            return Results.NotFound(new { message = "Consulta não encontrada." });

        if (appointment.ConsultationRoom is not null)
            return Results.Ok(ToResponse(appointment.ConsultationRoom));

        var room = new ConsultationRoom
        {
            AppointmentId = appointmentId,
            RoomName = $"medsync-{appointmentId:N}"
        };
        db.ConsultationRooms.Add(room);
        appointment.Status = AppointmentStatus.InProgress;
        await db.SaveChangesAsync(cancellationToken);
        return Results.Created($"/consultations/{appointmentId}/room", ToResponse(room));
    }

    private static async Task<IResult> GetLiveKitToken(
        string roomName,
        string identity,
        ClaimsPrincipal principal,
        MedSyncDbContext db,
        ITokenService tokens,
        CancellationToken cancellationToken)
    {
        var authenticatedId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(roomName) || string.IsNullOrWhiteSpace(identity))
            return Results.BadRequest(new { message = "roomName e identity são obrigatórios." });
        if (!string.Equals(identity, authenticatedId, StringComparison.OrdinalIgnoreCase))
            return Results.Forbid();
        if (!await db.ConsultationRooms.AnyAsync(x => x.RoomName == roomName, cancellationToken))
            return Results.NotFound(new { message = "Sala não encontrada." });

        return Results.Ok(new
        {
            token = tokens.CreateLiveKitToken(roomName, identity, principal.Identity?.Name),
            roomName
        });
    }

    private static IQueryable<AppointmentResponse> AppointmentQuery(MedSyncDbContext db) =>
        db.Appointments.AsNoTracking()
        .OrderBy(x => x.ScheduledAt)
        .Select(x => new AppointmentResponse(
            x.Id,
            x.DoctorId,
            x.Doctor.Name,
            x.Doctor.Specialty,
            x.PatientId,
            x.Patient.Name,
            x.ScheduledAt,
            x.Status,
            x.Notes,
            x.ConsultationRoom == null ? null : x.ConsultationRoom.RoomName));

    private static PatientResponse ToResponse(Patient patient) =>
        new(patient.Id, patient.Name, patient.Email, patient.Cpf, patient.BirthDate, patient.Phone);

    private static DoctorResponse ToResponse(Doctor doctor) =>
        new(doctor.Id, doctor.Name, doctor.Email, doctor.Crm, doctor.Specialty, doctor.Phone);

    private static RoomResponse ToResponse(ConsultationRoom room) =>
        new(room.Id, room.AppointmentId, room.RoomName, room.CreatedAt);
}
