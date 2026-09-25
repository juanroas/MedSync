using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using MedSync.Infrastructure.Migrations;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class DatabaseSeeder
{
    private static readonly Guid PlatformClinicId = Guid.Parse(ConsolidateRoles.PlatformClinicId);

    private static readonly DemoAccount[] PlatformAccounts =
    [
        new(Guid.Parse("10000000-0000-0000-0000-000000000003"), "Dr. Admin MedSync", "admin@medsync.dev", ClinicRole.MedicalDirector),
        new(Guid.Parse("10000000-0000-0000-0000-000000000007"), "Sofia Suporte", "suporte@medsync.dev", ClinicRole.Support),
        new(Guid.Parse("10000000-0000-0000-0000-000000000010"), "DPO MedSync", "dpo@medsync.dev", ClinicRole.DataProtectionOfficer)
    ];

    private static readonly DemoClinic[] DemoClinics =
    [
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000001"),
            Name: "Clínica Demo",
            Slug: "clinica-demo",
            LegalName: "Clínica Demo MedSync Ltda",
            TaxId: "12345678000190",
            PlanName: "Plano Demo",
            MonthlyFee: 199.90m,
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000001"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000001"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000001"),
            PatientCpf: "12345678909",
            HasExtraPatients: true,
            Accounts:
            [
                new(Guid.Parse("10000000-0000-0000-0000-000000000001"), "Dra. Marina Costa", "medico@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("10000000-0000-0000-0000-000000000002"), "Carlos Oliveira", "paciente@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("10000000-0000-0000-0000-000000000012"), "Ana Clínica", "clinica.admin@medsync.dev", ClinicRole.ClinicAdmin)
            ]),
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000002"),
            Name: "Clínica Alfa",
            Slug: "clinica-alfa",
            LegalName: "Clínica Alfa Saúde Ltda",
            TaxId: "22345678000191",
            PlanName: "Plano Alfa",
            MonthlyFee: 349.90m,
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000002"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000002"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000002"),
            PatientCpf: "98765432100",
            HasExtraPatients: false,
            Accounts:
            [
                new(Guid.Parse("11000000-0000-0000-0000-000000000001"), "Dr. Rafael Lima", "medico.empresa2@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("11000000-0000-0000-0000-000000000002"), "Patricia Alfa", "paciente.empresa2@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("11000000-0000-0000-0000-000000000006"), "Aline Clínica Alfa", "clinica2.admin@medsync.dev", ClinicRole.ClinicAdmin)
            ]),
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000003"),
            Name: "Clínica Beta",
            Slug: "clinica-beta",
            LegalName: "Clínica Beta Serviços Médicos S.A.",
            TaxId: "32345678000192",
            PlanName: "Plano Beta",
            MonthlyFee: 699.90m,
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000003"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000003"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000003"),
            PatientCpf: "29537995593",
            HasExtraPatients: false,
            Accounts:
            [
                new(Guid.Parse("12000000-0000-0000-0000-000000000001"), "Dra. Renata Souza", "medico.empresa3@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("12000000-0000-0000-0000-000000000002"), "Joao Beta", "paciente.empresa3@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("12000000-0000-0000-0000-000000000006"), "Marcos Clínica Beta", "clinica3.admin@medsync.dev", ClinicRole.ClinicAdmin)
            ])
    ];

    private static readonly ExtraPatient[] ExtraPatients =
    [
        new(Guid.Parse("13000000-0000-0000-0000-000000000001"), Guid.Parse("33000000-0000-0000-0000-000000000001"), "Carla MedSync", "paciente2@medsync.dev", "52998224725"),
        new(Guid.Parse("13000000-0000-0000-0000-000000000002"), Guid.Parse("33000000-0000-0000-0000-000000000002"), "Roberto MedSync", "paciente3@medsync.dev", "11144477735"),
        new(Guid.Parse("13000000-0000-0000-0000-000000000003"), Guid.Parse("33000000-0000-0000-0000-000000000003"), "Daniel Demo", "paciente.demo@medsync.dev", "93541134780"),
        new(Guid.Parse("13000000-0000-0000-0000-000000000004"), Guid.Parse("33000000-0000-0000-0000-000000000004"), "Mariana Demo", "paciente.demo2@medsync.dev", "85351346893")
    ];

    public static async Task SeedAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken = default)
    {
        await SeedPlatformAsync(db, passwords, demoPassword, cancellationToken);
        foreach (var clinic in DemoClinics)
            await SeedClinicAsync(db, passwords, demoPassword, clinic, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedPlatformAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken)
    {
        var platform = await db.Clinics.SingleOrDefaultAsync(x => x.Id == PlatformClinicId, cancellationToken);
        if (platform is null)
        {
            platform = new Clinic { Id = PlatformClinicId, Name = "MedSync Operação", Slug = "medsync-operacao" };
            db.Clinics.Add(platform);
        }

        platform.IsPlatform = true;
        platform.IsActive = true;
        platform.ActivationStatus = ClinicActivationStatus.Active;
        platform.ActivatedAt ??= DateTime.UtcNow;

        foreach (var account in PlatformAccounts)
        {
            var user = await EnsureUserAsync(db, passwords, demoPassword, account, cancellationToken);
            await EnsureMembershipAsync(db, PlatformClinicId, user.Id, account.Role, cancellationToken);
        }
    }

    private static async Task SeedClinicAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        DemoClinic demo,
        CancellationToken cancellationToken)
    {
        var clinic = await db.Clinics.SingleOrDefaultAsync(x => x.Id == demo.ClinicId, cancellationToken);
        if (clinic is null)
        {
            clinic = new Clinic { Id = demo.ClinicId, Name = demo.Name, Slug = demo.Slug };
            db.Clinics.Add(clinic);
        }

        clinic.Name = demo.Name;
        clinic.Slug = demo.Slug;
        clinic.IsActive = true;
        clinic.IsPlatform = false;
        clinic.LegalName = demo.LegalName;
        clinic.TaxId = demo.TaxId;
        clinic.ActivationStatus = ClinicActivationStatus.Active;
        clinic.ActivatedAt ??= DateTime.UtcNow;
        clinic.PlanName = demo.PlanName;
        clinic.MonthlyFee = demo.MonthlyFee;

        var users = new Dictionary<ClinicRole, User>();
        foreach (var account in demo.Accounts)
        {
            var user = await EnsureUserAsync(db, passwords, demoPassword, account, cancellationToken);
            users.TryAdd(account.Role, user);
            await EnsureMembershipAsync(db, demo.ClinicId, user.Id, account.Role, cancellationToken);
        }

        var doctor = await EnsureDoctorAsync(db, demo, users[ClinicRole.Doctor], cancellationToken);
        var patient = await EnsurePatientAsync(
            db, demo.ClinicId, demo.PatientId, users[ClinicRole.Patient], demo.PatientCpf, new DateOnly(1990, 5, 14), "(11) 99999-0202", cancellationToken);
        await EnsureAppointmentAsync(db, demo, doctor.Id, patient.Id, cancellationToken);

        if (!demo.HasExtraPatients)
            return;

        foreach (var extra in ExtraPatients)
        {
            var user = await EnsureUserAsync(
                db, passwords, demoPassword, new DemoAccount(extra.UserId, extra.Name, extra.Email, ClinicRole.Patient), cancellationToken);
            await EnsureMembershipAsync(db, demo.ClinicId, user.Id, ClinicRole.Patient, cancellationToken);
            await EnsurePatientAsync(
                db, demo.ClinicId, extra.PatientId, user, extra.Cpf, new DateOnly(1988, 8, 8), "(11) 99999-0303", cancellationToken);
        }
    }

    private static async Task<User> EnsureUserAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        DemoAccount account,
        CancellationToken cancellationToken)
    {
        var email = account.Email.ToLowerInvariant();
        var user = db.Users.Local.FirstOrDefault(x => x.Id == account.Id || x.Email == email)
            ?? await db.Users.SingleOrDefaultAsync(x => x.Id == account.Id || x.Email == email, cancellationToken);
        if (user is not null)
        {
            user.Name = account.Name;
            user.Email = email;
            user.IsActive = true;
            return user;
        }

        user = new User
        {
            Id = account.Id,
            Name = account.Name,
            Email = email,
            PasswordHash = passwords.Hash(demoPassword)
        };
        db.Users.Add(user);
        return user;
    }

    private static async Task EnsureMembershipAsync(
        MedSyncDbContext db,
        Guid clinicId,
        Guid userId,
        ClinicRole role,
        CancellationToken cancellationToken)
    {
        if (db.ClinicMemberships.Local.Any(x => x.ClinicId == clinicId && x.UserId == userId && x.Role == role) ||
            await db.ClinicMemberships.AnyAsync(
                x => x.ClinicId == clinicId && x.UserId == userId && x.Role == role,
                cancellationToken))
            return;

        db.ClinicMemberships.Add(new ClinicMembership
        {
            ClinicId = clinicId,
            UserId = userId,
            Role = role
        });
    }

    private static async Task<Doctor> EnsureDoctorAsync(
        MedSyncDbContext db,
        DemoClinic demo,
        User doctorUser,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors.SingleOrDefaultAsync(x => x.Id == demo.DoctorId, cancellationToken);
        if (doctor is null)
        {
            doctor = new Doctor
            {
                Id = demo.DoctorId,
                ClinicId = demo.ClinicId,
                UserId = doctorUser.Id,
                Name = doctorUser.Name,
                Email = doctorUser.Email,
                Crm = $"CRM-SP {demo.DoctorId.ToString("N")[..6]}",
                CrmUf = "SP",
                Specialty = "Clinica geral",
                Phone = "(11) 99999-0101"
            };
            db.Doctors.Add(doctor);
            return doctor;
        }

        doctor.ClinicId = demo.ClinicId;
        doctor.UserId = doctorUser.Id;
        doctor.Name = doctorUser.Name;
        doctor.Email = doctorUser.Email;
        doctor.CrmUf = "SP";
        doctor.Specialty = "Clinica geral";
        return doctor;
    }

    private static async Task<Patient> EnsurePatientAsync(
        MedSyncDbContext db,
        Guid clinicId,
        Guid patientId,
        User patientUser,
        string cpf,
        DateOnly birthDate,
        string phone,
        CancellationToken cancellationToken)
    {
        var patient = await db.Patients.SingleOrDefaultAsync(x => x.Id == patientId, cancellationToken);
        if (patient is null)
        {
            patient = new Patient
            {
                Id = patientId,
                ClinicId = clinicId,
                UserId = patientUser.Id,
                Name = patientUser.Name,
                Email = patientUser.Email,
                Cpf = cpf,
                BirthDate = birthDate,
                Phone = phone
            };
            db.Patients.Add(patient);
            return patient;
        }

        patient.ClinicId = clinicId;
        patient.UserId = patientUser.Id;
        patient.Name = patientUser.Name;
        patient.Email = patientUser.Email;
        patient.Cpf = cpf;
        return patient;
    }

    private static async Task EnsureAppointmentAsync(
        MedSyncDbContext db,
        DemoClinic demo,
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.SingleOrDefaultAsync(
            x => x.Id == demo.AppointmentId,
            cancellationToken);
        if (appointment is null)
        {
            db.Appointments.Add(new Appointment
            {
                Id = demo.AppointmentId,
                ClinicId = demo.ClinicId,
                DoctorId = doctorId,
                PatientId = patientId,
                ScheduledAt = NextDemoAppointmentUtc(),
                DurationMinutes = 60,
                Notes = "Consulta inicial de demonstracao."
            });
            return;
        }

        appointment.ClinicId = demo.ClinicId;
        appointment.DoctorId = doctorId;
        appointment.PatientId = patientId;
        appointment.ScheduledAt = NextDemoAppointmentUtc();
        appointment.Status = AppointmentStatus.Scheduled;
    }

    private static DateTime NextDemoAppointmentUtc()
    {
        var timeZone = BrazilTimeZone();
        var brazilNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        var brazilScheduledAt = DateTime.SpecifyKind(brazilNow.AddMinutes(10), DateTimeKind.Unspecified);

        return TimeZoneInfo.ConvertTimeToUtc(brazilScheduledAt, timeZone);
    }

    private static TimeZoneInfo BrazilTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
    }

    private sealed record DemoClinic(
        Guid ClinicId,
        string Name,
        string Slug,
        string LegalName,
        string TaxId,
        string PlanName,
        decimal MonthlyFee,
        Guid DoctorId,
        Guid PatientId,
        Guid AppointmentId,
        string PatientCpf,
        bool HasExtraPatients,
        DemoAccount[] Accounts);

    private sealed record DemoAccount(
        Guid Id,
        string Name,
        string Email,
        ClinicRole Role);

    private sealed record ExtraPatient(
        Guid UserId,
        Guid PatientId,
        string Name,
        string Email,
        string Cpf);
}
