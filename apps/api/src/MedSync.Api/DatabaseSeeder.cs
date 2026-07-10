using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class DatabaseSeeder
{
    private static readonly Guid ClinicId =
        Guid.Parse("01000000-0000-0000-0000-000000000001");
    private static readonly Guid DoctorId =
        Guid.Parse("20000000-0000-0000-0000-000000000001");
    private static readonly Guid PatientId =
        Guid.Parse("30000000-0000-0000-0000-000000000001");
    private static readonly Guid AppointmentId =
        Guid.Parse("40000000-0000-0000-0000-000000000001");
    private static readonly Guid CompanyId =
        Guid.Parse("50000000-0000-0000-0000-000000000001");
    private static readonly Guid BenefitPlanId =
        Guid.Parse("60000000-0000-0000-0000-000000000001");
    private static readonly Guid CompanyEmployeeId =
        Guid.Parse("70000000-0000-0000-0000-000000000001");
    private static readonly Guid CompanyContractId =
        Guid.Parse("80000000-0000-0000-0000-000000000001");
    private static readonly Guid EligibilityId =
        Guid.Parse("90000000-0000-0000-0000-000000000001");

    private static readonly DemoAccount[] DemoAccounts =
    [
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000001"),
            "Dra. Marina Costa",
            "medico@medsync.dev",
            ClinicRole.Doctor),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000002"),
            "Carlos Oliveira",
            "paciente@medsync.dev",
            ClinicRole.Patient),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000003"),
            "Admin Plataforma",
            "admin@medsync.dev",
            ClinicRole.PlatformAdmin),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000004"),
            "Ana Empresa",
            "empresa.admin@medsync.dev",
            ClinicRole.CompanyAdmin),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000005"),
            "Felipe Financeiro Empresa",
            "empresa.financeiro@medsync.dev",
            ClinicRole.CompanyFinance),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000006"),
            "Paula Financeiro MedSync",
            "plataforma.financeiro@medsync.dev",
            ClinicRole.PlatformFinance),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000007"),
            "Sofia Suporte",
            "suporte@medsync.dev",
            ClinicRole.Support),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000008"),
            "Bruno Auditor Empresa",
            "empresa.auditor@medsync.dev",
            ClinicRole.CompanyAuditor),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000009"),
            "Clara Auditor MedSync",
            "plataforma.auditor@medsync.dev",
            ClinicRole.PlatformAuditor),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000010"),
            "DPO MedSync",
            "dpo@medsync.dev",
            ClinicRole.DataProtectionOfficer),
        new(
            Guid.Parse("10000000-0000-0000-0000-000000000011"),
            "Dra. Helena Ocupacional",
            "medico.trabalho@medsync.dev",
            ClinicRole.OccupationalHealthAdmin)
    ];

    public static async Task SeedAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken = default)
    {
        var clinic = await EnsureClinicAsync(db, cancellationToken);
        var users = new Dictionary<ClinicRole, User>();

        foreach (var account in DemoAccounts)
        {
            var user = await EnsureUserAsync(db, passwords, demoPassword, account, cancellationToken);
            users[account.Role] = user;
            await EnsureMembershipAsync(db, clinic.Id, user.Id, account.Role, cancellationToken);
        }

        var doctor = await EnsureDoctorAsync(db, clinic.Id, users[ClinicRole.Doctor], cancellationToken);
        var patient = await EnsurePatientAsync(db, clinic.Id, users[ClinicRole.Patient], cancellationToken);
        await EnsureAppointmentAsync(db, clinic.Id, doctor.Id, patient.Id, cancellationToken);
        await EnsureB2BFoundationAsync(db, clinic.Id, patient.Id, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task<Clinic> EnsureClinicAsync(
        MedSyncDbContext db,
        CancellationToken cancellationToken)
    {
        var clinic = await db.Clinics.SingleOrDefaultAsync(x => x.Id == ClinicId, cancellationToken);
        if (clinic is not null)
            return clinic;

        clinic = new Clinic
        {
            Id = ClinicId,
            Name = "MedSync Medical",
            Slug = "medsync-medical"
        };
        db.Clinics.Add(clinic);
        return clinic;
    }

    private static async Task<User> EnsureUserAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        DemoAccount account,
        CancellationToken cancellationToken)
    {
        var email = account.Email.ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(
            x => x.Id == account.Id || x.Email == email,
            cancellationToken);
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
        if (await db.ClinicMemberships.AnyAsync(
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
        Guid clinicId,
        User doctorUser,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors.SingleOrDefaultAsync(x => x.Id == DoctorId, cancellationToken);
        if (doctor is null)
        {
            doctor = new Doctor
            {
                Id = DoctorId,
                ClinicId = clinicId,
                UserId = doctorUser.Id,
                Name = doctorUser.Name,
                Email = doctorUser.Email,
                Crm = "CRM-SP 123456",
                CrmUf = "SP",
                Specialty = "Clinica geral",
                Phone = "(11) 99999-0101"
            };
            db.Doctors.Add(doctor);
            return doctor;
        }

        doctor.UserId = doctorUser.Id;
        doctor.Name = doctorUser.Name;
        doctor.Email = doctorUser.Email;
        doctor.CrmUf = "SP";
        return doctor;
    }

    private static async Task<Patient> EnsurePatientAsync(
        MedSyncDbContext db,
        Guid clinicId,
        User patientUser,
        CancellationToken cancellationToken)
    {
        var patient = await db.Patients.SingleOrDefaultAsync(x => x.Id == PatientId, cancellationToken);
        if (patient is null)
        {
            patient = new Patient
            {
                Id = PatientId,
                ClinicId = clinicId,
                UserId = patientUser.Id,
                Name = patientUser.Name,
                Email = patientUser.Email,
                Cpf = "12345678909",
                BirthDate = new DateOnly(1990, 5, 14),
                Phone = "(11) 99999-0202"
            };
            db.Patients.Add(patient);
            return patient;
        }

        patient.UserId = patientUser.Id;
        patient.Name = patientUser.Name;
        patient.Email = patientUser.Email;
        return patient;
    }

    private static async Task EnsureAppointmentAsync(
        MedSyncDbContext db,
        Guid clinicId,
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.SingleOrDefaultAsync(
            x => x.Id == AppointmentId,
            cancellationToken);
        if (appointment is null)
        {
            db.Appointments.Add(new Appointment
            {
                Id = AppointmentId,
                ClinicId = clinicId,
                DoctorId = doctorId,
                PatientId = patientId,
                ScheduledAt = DateTime.UtcNow.AddMinutes(10),
                DurationMinutes = 60,
                Notes = "Consulta inicial de demonstracao."
            });
            return;
        }

        appointment.DoctorId = doctorId;
        appointment.PatientId = patientId;
        appointment.ScheduledAt = DateTime.UtcNow.AddMinutes(10);
        appointment.Status = AppointmentStatus.Scheduled;
    }

    private static async Task EnsureB2BFoundationAsync(
        MedSyncDbContext db,
        Guid clinicId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var company = await db.Companies.SingleOrDefaultAsync(x => x.Id == CompanyId, cancellationToken);
        if (company is null)
        {
            company = new Company
            {
                Id = CompanyId,
                ClinicId = clinicId,
                LegalName = "Empresa Demo MedSync Ltda",
                TradeName = "Empresa Demo",
                TaxId = "12345678000190"
            };
            db.Companies.Add(company);
        }

        var plan = await db.BenefitPlans.SingleOrDefaultAsync(x => x.Id == BenefitPlanId, cancellationToken);
        if (plan is null)
        {
            plan = new BenefitPlan
            {
                Id = BenefitPlanId,
                ClinicId = clinicId,
                Name = "Plano B2B Demo",
                Description = "Plano de homologacao para consultas digitais.",
                MonthlyFee = 199.90m,
                MonthlyConsultationLimit = 50
            };
            db.BenefitPlans.Add(plan);
        }

        if (!await db.CompanyContracts.AnyAsync(x => x.Id == CompanyContractId, cancellationToken))
        {
            db.CompanyContracts.Add(new CompanyContract
            {
                Id = CompanyContractId,
                ClinicId = clinicId,
                CompanyId = CompanyId,
                BenefitPlanId = BenefitPlanId,
                Status = CompanyContractStatus.Active,
                StartsAt = DateOnly.FromDateTime(DateTime.UtcNow.Date)
            });
        }

        if (!await db.CompanyEmployees.AnyAsync(x => x.Id == CompanyEmployeeId, cancellationToken))
        {
            db.CompanyEmployees.Add(new CompanyEmployee
            {
                Id = CompanyEmployeeId,
                ClinicId = clinicId,
                CompanyId = CompanyId,
                PatientId = patientId,
                Name = "Carlos Oliveira",
                Email = "paciente@medsync.dev",
                EmployeeCode = "BEN-001"
            });
        }

        if (!await db.EmployeeEligibilities.AnyAsync(x => x.Id == EligibilityId, cancellationToken))
        {
            db.EmployeeEligibilities.Add(new EmployeeEligibility
            {
                Id = EligibilityId,
                ClinicId = clinicId,
                CompanyEmployeeId = CompanyEmployeeId,
                BenefitPlanId = BenefitPlanId,
                IsEligible = true,
                EligibleFrom = DateOnly.FromDateTime(DateTime.UtcNow.Date),
                Reason = "Seed de homologacao B2B"
            });
        }
    }

    private sealed record DemoAccount(
        Guid Id,
        string Name,
        string Email,
        ClinicRole Role);
}
