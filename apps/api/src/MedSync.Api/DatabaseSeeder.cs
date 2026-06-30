using MedSync.Application;
using MedSync.Domain;
using MedSync.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Api;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(
        MedSyncDbContext db,
        IPasswordService passwords,
        string demoPassword,
        CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(cancellationToken))
            return;

        var doctorUser = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000001"),
            Name = "Dra. Marina Costa",
            Email = "medico@medsync.dev",
            PasswordHash = passwords.Hash(demoPassword),
            Role = UserRole.Doctor
        };
        var patientUser = new User
        {
            Id = Guid.Parse("10000000-0000-0000-0000-000000000002"),
            Name = "Carlos Oliveira",
            Email = "paciente@medsync.dev",
            PasswordHash = passwords.Hash(demoPassword),
            Role = UserRole.Patient
        };
        var doctor = new Doctor
        {
            Id = Guid.Parse("20000000-0000-0000-0000-000000000001"),
            UserId = doctorUser.Id,
            Name = doctorUser.Name,
            Email = doctorUser.Email,
            Crm = "CRM-SP 123456",
            Specialty = "Clínica geral",
            Phone = "(11) 99999-0101"
        };
        var patient = new Patient
        {
            Id = Guid.Parse("30000000-0000-0000-0000-000000000001"),
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
            DoctorId = doctor.Id,
            PatientId = patient.Id,
            ScheduledAt = DateTime.UtcNow.Date.AddDays(1).AddHours(14),
            Notes = "Consulta inicial de demonstração."
        };

        db.AddRange(doctorUser, patientUser, doctor, patient, appointment);
        await db.SaveChangesAsync(cancellationToken);
    }
}
