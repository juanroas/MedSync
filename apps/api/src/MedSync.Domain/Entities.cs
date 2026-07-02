namespace MedSync.Domain;

public enum ClinicRole
{
    Patient,
    Doctor,
    Receptionist,
    Finance,
    ClinicAdmin,
    MedicalDirector,
    PrivacyAuditor
}

public enum AppointmentStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled,
    NoShow
}

public enum VideoSessionStatus
{
    Pending,
    Ready,
    InProgress,
    Completed,
    Cancelled,
    Expired
}

public enum PaymentStatus
{
    Pending,
    Processing,
    Paid,
    Failed,
    Cancelled,
    RefundPending,
    Refunded,
    Chargeback
}

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ClinicMembership> Memberships { get; set; } = [];
}

public sealed class Clinic
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ClinicMembership> Memberships { get; set; } = [];
}

public sealed class ClinicMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public ClinicRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Doctor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Crm { get; set; }
    public required string Specialty { get; set; }
    public string? Phone { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = [];
}

public sealed class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Cpf { get; set; }
    public DateOnly BirthDate { get; set; }
    public string? Phone { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = [];
}

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; } = 60;
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public string? Notes { get; set; }
    public decimal? Price { get; set; }
    public bool PaymentRequired { get; set; }
    public ConsultationRoom? ConsultationRoom { get; set; }
    public ClinicalRecord? ClinicalRecord { get; set; }
    public ICollection<ConsentRecord> ConsentRecords { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ConsultationRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public required string RoomName { get; set; }
    public VideoSessionStatus Status { get; set; } = VideoSessionStatus.Pending;
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ConsentRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid PatientId { get; set; }
    public Guid UserId { get; set; }
    public required string TermVersion { get; set; }
    public required string TermHash { get; set; }
    public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public sealed class ClinicalRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public required string Content { get; set; }
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ClinicalRecordRevision> Revisions { get; set; } = [];
}

public sealed class ClinicalRecordRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid ClinicalRecordId { get; set; }
    public ClinicalRecord ClinicalRecord { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public required string Content { get; set; }
    public int Version { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public required string Provider { get; set; }
    public string? ProviderPreferenceId { get; set; }
    public string? ProviderPaymentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BRL";
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public string? CheckoutUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ClinicId { get; set; }
    public Guid? ActorUserId { get; set; }
    public required string Action { get; set; }
    public required string ResourceType { get; set; }
    public string? ResourceId { get; set; }
    public required string Result { get; set; }
    public string? Reason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
