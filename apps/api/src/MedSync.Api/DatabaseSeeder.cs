using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class DatabaseSeeder
{
    private static readonly DemoTenant[] DemoTenants =
    [
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000001"),
            ClinicName: "MedSync Medical",
            ClinicSlug: "medsync-medical",
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000001"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000001"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000001"),
            CompanyId: Guid.Parse("50000000-0000-0000-0000-000000000001"),
            BenefitPlanId: Guid.Parse("60000000-0000-0000-0000-000000000001"),
            CompanyEmployeeId: Guid.Parse("70000000-0000-0000-0000-000000000001"),
            CompanyContractId: Guid.Parse("80000000-0000-0000-0000-000000000001"),
            EligibilityId: Guid.Parse("90000000-0000-0000-0000-000000000001"),
            CompanyLegalName: "Empresa Demo MedSync Ltda",
            CompanyTradeName: "Empresa Demo",
            CompanyTaxId: "12345678000190",
            PlanName: "Plano B2B Demo",
            PlanFee: 199.90m,
            PlanLimit: 50,
            EmployeeCode: "BEN-001",
            PatientCpf: "12345678909",
            Accounts:
            [
                new(Guid.Parse("10000000-0000-0000-0000-000000000001"), "Dra. Marina Costa", "medico@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("10000000-0000-0000-0000-000000000002"), "Carlos Oliveira", "paciente@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("10000000-0000-0000-0000-000000000003"), "Admin Plataforma", "admin@medsync.dev", ClinicRole.PlatformAdmin),
                new(Guid.Parse("10000000-0000-0000-0000-000000000004"), "Ana Empresa", "empresa.admin@medsync.dev", ClinicRole.CompanyAdmin),
                new(Guid.Parse("10000000-0000-0000-0000-000000000005"), "Felipe Financeiro Empresa", "empresa.financeiro@medsync.dev", ClinicRole.CompanyFinance),
                new(Guid.Parse("10000000-0000-0000-0000-000000000006"), "Paula Financeiro MedSync", "plataforma.financeiro@medsync.dev", ClinicRole.PlatformFinance),
                new(Guid.Parse("10000000-0000-0000-0000-000000000007"), "Sofia Suporte", "suporte@medsync.dev", ClinicRole.Support),
                new(Guid.Parse("10000000-0000-0000-0000-000000000008"), "Bruno Auditor Empresa", "empresa.auditor@medsync.dev", ClinicRole.CompanyAuditor),
                new(Guid.Parse("10000000-0000-0000-0000-000000000009"), "Clara Auditor MedSync", "plataforma.auditor@medsync.dev", ClinicRole.PlatformAuditor),
                new(Guid.Parse("10000000-0000-0000-0000-000000000010"), "DPO MedSync", "dpo@medsync.dev", ClinicRole.DataProtectionOfficer),
                new(Guid.Parse("10000000-0000-0000-0000-000000000011"), "Dra. Helena Ocupacional", "medico.trabalho@medsync.dev", ClinicRole.OccupationalHealthAdmin)
            ]),
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000002"),
            ClinicName: "Empresa Alfa - Homologacao",
            ClinicSlug: "empresa-alfa-homologacao",
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000002"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000002"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000002"),
            CompanyId: Guid.Parse("50000000-0000-0000-0000-000000000002"),
            BenefitPlanId: Guid.Parse("60000000-0000-0000-0000-000000000002"),
            CompanyEmployeeId: Guid.Parse("70000000-0000-0000-0000-000000000002"),
            CompanyContractId: Guid.Parse("80000000-0000-0000-0000-000000000002"),
            EligibilityId: Guid.Parse("90000000-0000-0000-0000-000000000002"),
            CompanyLegalName: "Empresa Alfa Tecnologia Ltda",
            CompanyTradeName: "Empresa Alfa",
            CompanyTaxId: "22345678000191",
            PlanName: "Plano Alfa Cuidado Digital",
            PlanFee: 349.90m,
            PlanLimit: 120,
            EmployeeCode: "ALFA-001",
            PatientCpf: "98765432100",
            Accounts:
            [
                new(Guid.Parse("11000000-0000-0000-0000-000000000001"), "Dr. Rafael Lima", "medico.empresa2@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("11000000-0000-0000-0000-000000000002"), "Patricia Alfa", "paciente.empresa2@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("11000000-0000-0000-0000-000000000003"), "Aline Admin Alfa", "empresa2.admin@medsync.dev", ClinicRole.CompanyAdmin),
                new(Guid.Parse("11000000-0000-0000-0000-000000000004"), "Fabio Financeiro Alfa", "empresa2.financeiro@medsync.dev", ClinicRole.CompanyFinance),
                new(Guid.Parse("11000000-0000-0000-0000-000000000005"), "Bianca Auditoria Alfa", "empresa2.auditor@medsync.dev", ClinicRole.CompanyAuditor)
            ]),
        new(
            ClinicId: Guid.Parse("01000000-0000-0000-0000-000000000003"),
            ClinicName: "Empresa Beta - Homologacao",
            ClinicSlug: "empresa-beta-homologacao",
            DoctorId: Guid.Parse("20000000-0000-0000-0000-000000000003"),
            PatientId: Guid.Parse("30000000-0000-0000-0000-000000000003"),
            AppointmentId: Guid.Parse("40000000-0000-0000-0000-000000000003"),
            CompanyId: Guid.Parse("50000000-0000-0000-0000-000000000003"),
            BenefitPlanId: Guid.Parse("60000000-0000-0000-0000-000000000003"),
            CompanyEmployeeId: Guid.Parse("70000000-0000-0000-0000-000000000003"),
            CompanyContractId: Guid.Parse("80000000-0000-0000-0000-000000000003"),
            EligibilityId: Guid.Parse("90000000-0000-0000-0000-000000000003"),
            CompanyLegalName: "Empresa Beta Servicos S.A.",
            CompanyTradeName: "Empresa Beta",
            CompanyTaxId: "32345678000192",
            PlanName: "Plano Beta Assistencial",
            PlanFee: 699.90m,
            PlanLimit: 300,
            EmployeeCode: "BETA-001",
            PatientCpf: "29537995593",
            Accounts:
            [
                new(Guid.Parse("12000000-0000-0000-0000-000000000001"), "Dra. Renata Souza", "medico.empresa3@medsync.dev", ClinicRole.Doctor),
                new(Guid.Parse("12000000-0000-0000-0000-000000000002"), "Joao Beta", "paciente.empresa3@medsync.dev", ClinicRole.Patient),
                new(Guid.Parse("12000000-0000-0000-0000-000000000003"), "Marcos Admin Beta", "empresa3.admin@medsync.dev", ClinicRole.CompanyAdmin),
                new(Guid.Parse("12000000-0000-0000-0000-000000000004"), "Luiza Financeiro Beta", "empresa3.financeiro@medsync.dev", ClinicRole.CompanyFinance),
                new(Guid.Parse("12000000-0000-0000-0000-000000000005"), "Caio Auditoria Beta", "empresa3.auditor@medsync.dev", ClinicRole.CompanyAuditor)
            ])
    ];

    public static async Task SeedAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken = default)
    {
        foreach (var tenant in DemoTenants)
        {
            await SeedTenantAsync(db, passwords, demoPassword, tenant, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedTenantAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        DemoTenant tenant,
        CancellationToken cancellationToken)
    {
        var clinic = await EnsureClinicAsync(db, tenant, cancellationToken);
        var users = new Dictionary<ClinicRole, User>();

        foreach (var account in tenant.Accounts)
        {
            var user = await EnsureUserAsync(db, passwords, demoPassword, account, cancellationToken);
            users.TryAdd(account.Role, user);
            await EnsureMembershipAsync(db, clinic.Id, user.Id, account.Role, cancellationToken);
        }

        var doctor = await EnsureDoctorAsync(db, tenant, users[ClinicRole.Doctor], cancellationToken);
        var patient = await EnsurePatientAsync(db, tenant, users[ClinicRole.Patient], cancellationToken);
        await EnsureAppointmentAsync(db, tenant, doctor.Id, patient.Id, cancellationToken);
        await EnsureB2BFoundationAsync(db, tenant, patient.Id, cancellationToken);
    }

    private static async Task<Clinic> EnsureClinicAsync(
        MedSyncDbContext db,
        DemoTenant tenant,
        CancellationToken cancellationToken)
    {
        var clinic = await db.Clinics.SingleOrDefaultAsync(x => x.Id == tenant.ClinicId, cancellationToken);
        if (clinic is null)
        {
            clinic = new Clinic
            {
                Id = tenant.ClinicId,
                Name = tenant.ClinicName,
                Slug = tenant.ClinicSlug
            };
            db.Clinics.Add(clinic);
            return clinic;
        }

        clinic.Name = tenant.ClinicName;
        clinic.Slug = tenant.ClinicSlug;
        clinic.IsActive = true;
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
        DemoTenant tenant,
        User doctorUser,
        CancellationToken cancellationToken)
    {
        var doctor = await db.Doctors.SingleOrDefaultAsync(x => x.Id == tenant.DoctorId, cancellationToken);
        if (doctor is null)
        {
            doctor = new Doctor
            {
                Id = tenant.DoctorId,
                ClinicId = tenant.ClinicId,
                UserId = doctorUser.Id,
                Name = doctorUser.Name,
                Email = doctorUser.Email,
                Crm = $"CRM-SP {tenant.DoctorId.ToString("N")[..6]}",
                CrmUf = "SP",
                Specialty = "Clinica geral",
                Phone = "(11) 99999-0101"
            };
            db.Doctors.Add(doctor);
            return doctor;
        }

        doctor.ClinicId = tenant.ClinicId;
        doctor.UserId = doctorUser.Id;
        doctor.Name = doctorUser.Name;
        doctor.Email = doctorUser.Email;
        doctor.CrmUf = "SP";
        doctor.Specialty = "Clinica geral";
        return doctor;
    }

    private static async Task<Patient> EnsurePatientAsync(
        MedSyncDbContext db,
        DemoTenant tenant,
        User patientUser,
        CancellationToken cancellationToken)
    {
        var patient = await db.Patients.SingleOrDefaultAsync(x => x.Id == tenant.PatientId, cancellationToken);
        if (patient is null)
        {
            patient = new Patient
            {
                Id = tenant.PatientId,
                ClinicId = tenant.ClinicId,
                UserId = patientUser.Id,
                Name = patientUser.Name,
                Email = patientUser.Email,
                Cpf = tenant.PatientCpf,
                BirthDate = new DateOnly(1990, 5, 14),
                Phone = "(11) 99999-0202"
            };
            db.Patients.Add(patient);
            return patient;
        }

        patient.ClinicId = tenant.ClinicId;
        patient.UserId = patientUser.Id;
        patient.Name = patientUser.Name;
        patient.Email = patientUser.Email;
        patient.Cpf = tenant.PatientCpf;
        return patient;
    }

    private static async Task EnsureAppointmentAsync(
        MedSyncDbContext db,
        DemoTenant tenant,
        Guid doctorId,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments.SingleOrDefaultAsync(
            x => x.Id == tenant.AppointmentId,
            cancellationToken);
        if (appointment is null)
        {
            db.Appointments.Add(new Appointment
            {
                Id = tenant.AppointmentId,
                ClinicId = tenant.ClinicId,
                DoctorId = doctorId,
                PatientId = patientId,
                ScheduledAt = DateTime.UtcNow.AddMinutes(10),
                DurationMinutes = 60,
                Notes = "Consulta inicial de demonstracao."
            });
            return;
        }

        appointment.ClinicId = tenant.ClinicId;
        appointment.DoctorId = doctorId;
        appointment.PatientId = patientId;
        appointment.ScheduledAt = DateTime.UtcNow.AddMinutes(10);
        appointment.Status = AppointmentStatus.Scheduled;
    }

    private static async Task EnsureB2BFoundationAsync(
        MedSyncDbContext db,
        DemoTenant tenant,
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var company = await db.Companies.SingleOrDefaultAsync(x => x.Id == tenant.CompanyId, cancellationToken);
        if (company is null)
        {
            company = new Company
            {
                Id = tenant.CompanyId,
                ClinicId = tenant.ClinicId,
                LegalName = tenant.CompanyLegalName,
                TradeName = tenant.CompanyTradeName,
                TaxId = tenant.CompanyTaxId
            };
            db.Companies.Add(company);
        }
        else
        {
            company.ClinicId = tenant.ClinicId;
            company.LegalName = tenant.CompanyLegalName;
            company.TradeName = tenant.CompanyTradeName;
            company.TaxId = tenant.CompanyTaxId;
            company.IsActive = true;
        }

        var plan = await db.BenefitPlans.SingleOrDefaultAsync(x => x.Id == tenant.BenefitPlanId, cancellationToken);
        if (plan is null)
        {
            plan = new BenefitPlan
            {
                Id = tenant.BenefitPlanId,
                ClinicId = tenant.ClinicId,
                Name = tenant.PlanName,
                Description = "Plano de homologacao para consultas digitais.",
                MonthlyFee = tenant.PlanFee,
                MonthlyConsultationLimit = tenant.PlanLimit
            };
            db.BenefitPlans.Add(plan);
        }
        else
        {
            plan.ClinicId = tenant.ClinicId;
            plan.Name = tenant.PlanName;
            plan.MonthlyFee = tenant.PlanFee;
            plan.MonthlyConsultationLimit = tenant.PlanLimit;
            plan.IsActive = true;
        }

        var contract = await db.CompanyContracts.SingleOrDefaultAsync(x => x.Id == tenant.CompanyContractId, cancellationToken);
        if (contract is null)
        {
            db.CompanyContracts.Add(new CompanyContract
            {
                Id = tenant.CompanyContractId,
                ClinicId = tenant.ClinicId,
                CompanyId = tenant.CompanyId,
                BenefitPlanId = tenant.BenefitPlanId,
                Status = CompanyContractStatus.Active,
                StartsAt = DateOnly.FromDateTime(DateTime.UtcNow.Date)
            });
        }
        else
        {
            contract.ClinicId = tenant.ClinicId;
            contract.CompanyId = tenant.CompanyId;
            contract.BenefitPlanId = tenant.BenefitPlanId;
            contract.Status = CompanyContractStatus.Active;
        }

        var employee = await db.CompanyEmployees.SingleOrDefaultAsync(x => x.Id == tenant.CompanyEmployeeId, cancellationToken);
        if (employee is null)
        {
            db.CompanyEmployees.Add(new CompanyEmployee
            {
                Id = tenant.CompanyEmployeeId,
                ClinicId = tenant.ClinicId,
                CompanyId = tenant.CompanyId,
                PatientId = patientId,
                Name = tenant.Accounts.Single(x => x.Role == ClinicRole.Patient).Name,
                Email = tenant.Accounts.Single(x => x.Role == ClinicRole.Patient).Email,
                EmployeeCode = tenant.EmployeeCode
            });
        }
        else
        {
            employee.ClinicId = tenant.ClinicId;
            employee.CompanyId = tenant.CompanyId;
            employee.PatientId = patientId;
            employee.Name = tenant.Accounts.Single(x => x.Role == ClinicRole.Patient).Name;
            employee.Email = tenant.Accounts.Single(x => x.Role == ClinicRole.Patient).Email;
            employee.EmployeeCode = tenant.EmployeeCode;
            employee.IsActive = true;
        }

        var eligibility = await db.EmployeeEligibilities.SingleOrDefaultAsync(x => x.Id == tenant.EligibilityId, cancellationToken);
        if (eligibility is null)
        {
            db.EmployeeEligibilities.Add(new EmployeeEligibility
            {
                Id = tenant.EligibilityId,
                ClinicId = tenant.ClinicId,
                CompanyEmployeeId = tenant.CompanyEmployeeId,
                BenefitPlanId = tenant.BenefitPlanId,
                IsEligible = true,
                EligibleFrom = DateOnly.FromDateTime(DateTime.UtcNow.Date),
                Reason = "Seed de homologacao B2B"
            });
        }
        else
        {
            eligibility.ClinicId = tenant.ClinicId;
            eligibility.CompanyEmployeeId = tenant.CompanyEmployeeId;
            eligibility.BenefitPlanId = tenant.BenefitPlanId;
            eligibility.IsEligible = true;
            eligibility.Reason = "Seed de homologacao B2B";
        }
    }

    private sealed record DemoTenant(
        Guid ClinicId,
        string ClinicName,
        string ClinicSlug,
        Guid DoctorId,
        Guid PatientId,
        Guid AppointmentId,
        Guid CompanyId,
        Guid BenefitPlanId,
        Guid CompanyEmployeeId,
        Guid CompanyContractId,
        Guid EligibilityId,
        string CompanyLegalName,
        string CompanyTradeName,
        string CompanyTaxId,
        string PlanName,
        decimal PlanFee,
        int PlanLimit,
        string EmployeeCode,
        string PatientCpf,
        DemoAccount[] Accounts);

    private sealed record DemoAccount(
        Guid Id,
        string Name,
        string Email,
        ClinicRole Role);
}
