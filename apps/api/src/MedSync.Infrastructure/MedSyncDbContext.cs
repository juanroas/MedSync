using MedSync.Domain;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Infrastructure;

public sealed class MedSyncDbContext(DbContextOptions<MedSyncDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<ConsultationRoom> ConsultationRooms => Set<ConsultationRoom>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("medsync");

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(30);
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Crm).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Crm).HasMaxLength(40);
            entity.Property(x => x.Specialty).HasMaxLength(120);
            entity.HasOne(x => x.User).WithOne().HasForeignKey<Doctor>(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Cpf).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Cpf).HasMaxLength(14);
            entity.HasOne(x => x.User).WithOne().HasForeignKey<Patient>(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(x => x.Doctor).WithMany(x => x.Appointments)
                .HasForeignKey(x => x.DoctorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Patient).WithMany(x => x.Appointments)
                .HasForeignKey(x => x.PatientId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ConsultationRoom>(entity =>
        {
            entity.HasIndex(x => x.RoomName).IsUnique();
            entity.HasIndex(x => x.AppointmentId).IsUnique();
            entity.Property(x => x.RoomName).HasMaxLength(180);
            entity.HasOne(x => x.Appointment).WithOne(x => x.ConsultationRoom)
                .HasForeignKey<ConsultationRoom>(x => x.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

