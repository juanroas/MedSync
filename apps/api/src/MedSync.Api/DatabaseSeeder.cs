using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class DatabaseSeeder
{
    private static readonly Guid ClinicId =
        Guid.Parse("01000000-0000-0000-0000-000000000001");
    private static readonly Guid DoctorUserId =
        Guid.Parse("10000000-0000-0000-0000-000000000001");
    private static readonly Guid PatientUserId =
        Guid.Parse("10000000-0000-0000-0000-000000000002");
    private static readonly Guid AdminUserId =
        Guid.Parse("10000000-0000-0000-0000-000000000003");

    public static async Task SeedAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(cancellationToken))
            return;

        var clinic = new Clinic
        {
            Id = ClinicId,
            Name = "MedSync Clinic",
            Slug = "medsync-clinic"
        };
        var doctorUser = new User
        {
            Id = DoctorUserId,
            Name = "Dra. Marina Costa",
            Email = "medico@medsync.dev",
            PasswordHash = passwords.Hash(demoPassword)
        };
        var patientUser = new User
        {
            Id = PatientUserId,
            Name = "Carlos Oliveira",
            Email = "paciente@medsync.dev",
            PasswordHash = passwords.Hash(demoPassword)
        };
        var adminUser = new User
        {
            Id = AdminUserId,
            Name = "Administrador MedSync",
            Email = "admin@medsync.dev",
            PasswordHash = passwords.Hash(demoPassword)
        };
        var doctor = new Doctor
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
            ClinicId = clinic.Id,
            UserId = doctorUser.Id,
            Name = doctorUser.Name,
            Email = doctorUser.Email,
            Crm = "CRM-SP 123456",
            CrmUf = "SP",
            Specialty = "Clínica geral",
            Phone = "(11) 99999-0101"
        };
        var patient = new Patient
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
            ClinicId = clinic.Id,
            UserId = patientUser.Id,
            Name = patientUser.Name,
            Email = patientUser.Email,
            Cpf = "123.456.789-00",
            BirthDate = new DateOnly(1990, 5, 14),
            Phone = "(11) 99999-0202"
        };
        var appointment = new Appointment
        {
            Id = Guid.Parse("40000000-0000-0000-0000-000000000001"),
            ClinicId = clinic.Id,
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            ScheduledAt = DateTime.UtcNow.AddMinutes(10),
            DurationMinutes = 60,
            Notes = "Consulta inicial de demonstração."
        };

        db.AddRange(
            clinic,
            doctorUser,
            patientUser,
            adminUser,
            new ClinicMembership
            {
                ClinicId = clinic.Id,
                UserId = doctorUser.Id,
                Role = ClinicRole.Doctor
            },
            new ClinicMembership
            {
                ClinicId = clinic.Id,
                UserId = patientUser.Id,
                Role = ClinicRole.Patient
            },
            new ClinicMembership
            {
                ClinicId = clinic.Id,
                UserId = adminUser.Id,
                Role = ClinicRole.ClinicAdmin
            },
            doctor,
            patient,
            appointment);
        await db.SaveChangesAsync(cancellationToken);
    }
}
