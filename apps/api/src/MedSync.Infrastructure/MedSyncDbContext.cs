using MedSync.Domain;
using Microsoft.EntityFrameworkCore;

namespace MedSync.Infrastructure;

public sealed class MedSyncDbContext(DbContextOptions<MedSyncDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Clinic> Clinics => Set<Clinic>();
    public DbSet<ClinicMembership> ClinicMemberships => Set<ClinicMembership>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<ConsultationRoom> ConsultationRooms => Set<ConsultationRoom>();
    public DbSet<ConsentRecord> ConsentRecords => Set<ConsentRecord>();
    public DbSet<ClinicalRecord> ClinicalRecords => Set<ClinicalRecord>();
    public DbSet<ClinicalRecordRevision> ClinicalRecordRevisions => Set<ClinicalRecordRevision>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("medsync");

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Name).HasMaxLength(160);
        });

        modelBuilder.Entity<Clinic>(entity =>
        {
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Slug).HasMaxLength(80);
        });

        modelBuilder.Entity<ClinicMembership>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.UserId, x.Role }).IsUnique();
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(40);
            entity.HasOne(x => x.Clinic).WithMany(x => x.Memberships)
                .HasForeignKey(x => x.ClinicId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany(x => x.Memberships)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Doctor>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.Email }).IsUnique();
            entity.HasIndex(x => new { x.ClinicId, x.Crm }).IsUnique();
            entity.HasIndex(x => new { x.ClinicId, x.UserId }).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Crm).HasMaxLength(40);
            entity.Property(x => x.Specialty).HasMaxLength(120);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.Email }).IsUnique();
            entity.HasIndex(x => new { x.ClinicId, x.Cpf }).IsUnique();
            entity.HasIndex(x => new { x.ClinicId, x.UserId }).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(160);
            entity.Property(x => x.Email).HasMaxLength(180);
            entity.Property(x => x.Cpf).HasMaxLength(14);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.ScheduledAt });
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            entity.Property(x => x.Price).HasPrecision(12, 2);
            entity.HasOne(x => x.Clinic).WithMany().HasForeignKey(x => x.ClinicId)
                .OnDelete(DeleteBehavior.Restrict);
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
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            entity.HasOne(x => x.Appointment).WithOne(x => x.ConsultationRoom)
                .HasForeignKey<ConsultationRoom>(x => x.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ConsentRecord>(entity =>
        {
            entity.HasIndex(x => new { x.AppointmentId, x.PatientId, x.TermVersion }).IsUnique();
            entity.Property(x => x.TermVersion).HasMaxLength(40);
            entity.Property(x => x.TermHash).HasMaxLength(128);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.Property(x => x.UserAgent).HasMaxLength(512);
            entity.HasOne(x => x.Appointment).WithMany(x => x.ConsentRecords)
                .HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ClinicalRecord>(entity =>
        {
            entity.HasIndex(x => x.AppointmentId).IsUnique();
            entity.HasOne(x => x.Appointment).WithOne(x => x.ClinicalRecord)
                .HasForeignKey<ClinicalRecord>(x => x.AppointmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClinicalRecordRevision>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicalRecordId, x.Version }).IsUnique();
            entity.HasOne(x => x.ClinicalRecord).WithMany(x => x.Revisions)
                .HasForeignKey(x => x.ClinicalRecordId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasIndex(x => x.ProviderPaymentId);
            entity.HasIndex(x => x.AppointmentId);
            entity.Property(x => x.Provider).HasMaxLength(40);
            entity.Property(x => x.ProviderPreferenceId).HasMaxLength(120);
            entity.Property(x => x.ProviderPaymentId).HasMaxLength(120);
            entity.Property(x => x.Currency).HasMaxLength(3);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            entity.Property(x => x.Amount).HasPrecision(12, 2);
            entity.Property(x => x.CheckoutUrl).HasMaxLength(1000);
            entity.HasOne(x => x.Appointment).WithMany(x => x.Payments)
                .HasForeignKey(x => x.AppointmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditEvent>(entity =>
        {
            entity.HasIndex(x => new { x.ClinicId, x.CreatedAt });
            entity.Property(x => x.Action).HasMaxLength(120);
            entity.Property(x => x.ResourceType).HasMaxLength(80);
            entity.Property(x => x.ResourceId).HasMaxLength(100);
            entity.Property(x => x.Result).HasMaxLength(30);
            entity.Property(x => x.Reason).HasMaxLength(500);
            entity.Property(x => x.IpAddress).HasMaxLength(64);
            entity.Property(x => x.UserAgent).HasMaxLength(512);
        });
    }
}
