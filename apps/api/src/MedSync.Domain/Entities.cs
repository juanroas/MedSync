namespace MedSync.Domain;

public enum ClinicRole
{
    // ADR-0003: six profiles. Stored as text, so removed names only need the ConsolidateRoles data migration.
    Patient,
    Doctor,
    ClinicAdmin,
    MedicalDirector,
    Support,
    DataProtectionOfficer
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

public enum PrivacyRequestType
{
    Access,
    Correction,
    Deletion,
    Portability,
    ConsentRevocation,
    Other
}

public enum PrivacyRequestStatus
{
    New,
    InReview,
    WaitingRequester,
    Resolved,
    Rejected
}

public enum SupportRequestStatus
{
    New,
    InProgress,
    Resolved
}

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ClinicMembership> Memberships { get; set; } = [];
}

public enum ClinicActivationStatus
{
    Pending,
    Active,
    Suspended
}

public sealed class Clinic
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPlatform { get; set; }
    public string? LegalName { get; set; }
    public string? TaxId { get; set; }
    public ClinicActivationStatus ActivationStatus { get; set; } = ClinicActivationStatus.Pending;
    public DateTime? ActivatedAt { get; set; }
    public string? PlanName { get; set; }
    public decimal? MonthlyFee { get; set; }
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
    public required string CrmUf { get; set; }
    public required string Specialty { get; set; }
    public string? Phone { get; set; }
    // CFM 2.314 art. 13: professional address printed on documents issued at a distance.
    public string? ProfessionalAddress { get; set; }
    // CFM 2.299/2021: specialist registration number (RQE), printed on documents when the doctor has one.
    public string? Rqe { get; set; }
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
    public string? ContinuousMedications { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = [];
}

public sealed class DoctorAvailabilitySlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
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
    // First time each side received a call token: tells "patient did not show up" apart from "never happened".
    public DateTime? DoctorJoinedAt { get; set; }
    public DateTime? PatientJoinedAt { get; set; }
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
    public ICollection<ClinicalRecordAttachment> Attachments { get; set; } = [];
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

public sealed class ClinicalRecordAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid? ClinicalRecordId { get; set; }
    public ClinicalRecord? ClinicalRecord { get; set; }
    public Guid UploadedByUserId { get; set; }
    public required string FileName { get; set; }
    public required string StorageKey { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public bool ReleasedToPatient { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public Guid? DeletedByUserId { get; set; }
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

// Medication search base: Anvisa open data (registered medications) plus items a clinic adds by hand.
public sealed class MedicationCatalogItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public string? ActiveIngredient { get; set; }
    public string? TherapeuticClass { get; set; }
    public MedicationSource Source { get; set; }
    // Null for Anvisa items; set for items a clinic added (visible only inside that clinic).
    public Guid? ClinicId { get; set; }
    public Guid? CreatedByUserId { get; set; }
    // Lowercase, accent-free "name active ingredient" used for search.
    public required string SearchText { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum MedicationSource
{
    Anvisa,
    Custom
}

public enum PrescriptionKind
{
    Simple,
    Antimicrobial
}

public enum PrescriptionStatus
{
    Draft,
    Signed,
    Cancelled
}

public sealed class Prescription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public PrescriptionKind Kind { get; set; } = PrescriptionKind.Simple;
    public PrescriptionStatus Status { get; set; } = PrescriptionStatus.Draft;
    // CFM 2.314 art. 13: location the patient informed during the teleconsultation.
    public string? PatientLocation { get; set; }
    public string? Notes { get; set; }
    public Guid? RenewedFromId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SignedAt { get; set; }
    public string? SignedDocumentKey { get; set; }
    public string? SignedDocumentSha256 { get; set; }
    // Signed by the demonstration simulator: no legal validity, watermarked everywhere.
    public bool SignatureSimulated { get; set; }
    public ICollection<PrescriptionItem> Items { get; set; } = [];
}

public sealed class PrescriptionItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PrescriptionId { get; set; }
    public Prescription Prescription { get; set; } = null!;
    public int Position { get; set; }
    public Guid? CatalogItemId { get; set; }
    public required string MedicationName { get; set; }
    public string? Dosage { get; set; }
    public required string Instructions { get; set; }
    public string? Quantity { get; set; }
    public bool ContinuousUse { get; set; }
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

public sealed class PrivacyRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public required string RequesterName { get; set; }
    public required string RequesterEmail { get; set; }
    public required string SubjectReference { get; set; }
    public PrivacyRequestType Type { get; set; }
    public PrivacyRequestStatus Status { get; set; } = PrivacyRequestStatus.New;
    public required string Description { get; set; }
    public string? ResolutionNote { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupportRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    public Guid CreatedByUserId { get; set; }
    public required string RequesterName { get; set; }
    public required string RequesterEmail { get; set; }
    public required string Subject { get; set; }
    public required string Description { get; set; }
    public SupportRequestStatus Status { get; set; } = SupportRequestStatus.New;
    public string? ResolutionNote { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
