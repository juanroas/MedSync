namespace MedSync.Domain;

public enum ClinicRole
{
    // ADR-0003: six profiles. Stored as text, so removed names only need the ConsolidateRoles data migration.
    Patient,
    Doctor,
    ClinicAdmin,
    MedicalDirector,
    Support,
    DataProtectionOfficer,
    // ADR-0005: front desk of a clinic or consultório — patients and agenda, never clinical content.
    Receptionist
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

// How a consultation happens: by video, at the clinic's address, or either (an availability window only).
public enum ConsultationModality
{
    Online,
    InPerson,
    Both
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
    // Professional registration of platform physicians (Médico ADM MedSync), who have no Doctor record in a clinic.
    public string? ProfessionalCrm { get; set; }
    public string? ProfessionalCrmUf { get; set; }
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
    // ADR-0005: a doctor's own practice (consultório): the owner is both doctor and admin.
    public bool IsPrivatePractice { get; set; }
    public string? LegalName { get; set; }
    public string? TaxId { get; set; }
    public ClinicActivationStatus ActivationStatus { get; set; } = ClinicActivationStatus.Pending;
    public DateTime? ActivatedAt { get; set; }
    public string? PlanName { get; set; }
    public decimal? MonthlyFee { get; set; }
    // Where in-person consultations happen; shown to the patient and printed on documents.
    public string? AddressZipCode { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressComplement { get; set; }
    public string? AddressDistrict { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressState { get; set; }
    public string? Phone { get; set; }
    // Cadastro Nacional de Estabelecimentos de Saúde (7 digits), printed on documents when the clinic has one.
    public string? Cnes { get; set; }
    // Médico responsável técnico da clínica (CFM 2.147/2016).
    public string? TechnicalDirectorName { get; set; }
    public string? TechnicalDirectorCrm { get; set; }
    public string? TechnicalDirectorCrmUf { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<ClinicMembership> Memberships { get; set; } = [];

    public bool HasAddress =>
        !string.IsNullOrWhiteSpace(AddressStreet) &&
        !string.IsNullOrWhiteSpace(AddressCity) &&
        !string.IsNullOrWhiteSpace(AddressState);

    // "Av. Paulista, 1000, sala 32 — Bela Vista, São Paulo/SP · CEP 01310-100"
    public string? FormattedAddress()
    {
        if (!HasAddress)
            return null;
        var street = string.Join(", ", new[] { AddressStreet, AddressNumber, AddressComplement }
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!.Trim()));
        var district = string.IsNullOrWhiteSpace(AddressDistrict) ? "" : $" — {AddressDistrict.Trim()}";
        var zip = string.IsNullOrWhiteSpace(AddressZipCode) ? "" : $" · CEP {AddressZipCode.Trim()}";
        return $"{street}{district}, {AddressCity!.Trim()}/{AddressState!.Trim()}{zip}";
    }
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
    // Agenda rules: length of each bookable slot and how far ahead patients can book.
    public int SlotMinutes { get; set; } = 30;
    public int BookingWindowDays { get; set; } = 90;
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
    // Identification printed on the controlled-drug prescription and used to tell homonyms apart.
    public string? SocialName { get; set; }
    public string? MotherName { get; set; }
    public bool MotherNameUndeclared { get; set; }
    public string? Sex { get; set; }
    public string? AddressZipCode { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressNumber { get; set; }
    public string? AddressComplement { get; set; }
    public string? AddressDistrict { get; set; }
    public string? AddressCity { get; set; }
    public string? AddressState { get; set; }
    public string? ContinuousMedications { get; set; }
    public ICollection<Appointment> Appointments { get; set; } = [];

    public bool HasAddress =>
        !string.IsNullOrWhiteSpace(AddressStreet) &&
        !string.IsNullOrWhiteSpace(AddressCity) &&
        !string.IsNullOrWhiteSpace(AddressState);

    public string? FormattedAddress()
    {
        if (!HasAddress)
            return null;
        var street = string.Join(", ", new[] { AddressStreet, AddressNumber, AddressComplement }
            .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!.Trim()));
        var district = string.IsNullOrWhiteSpace(AddressDistrict) ? "" : $" — {AddressDistrict.Trim()}";
        return $"{street}{district}, {AddressCity!.Trim()}/{AddressState!.Trim()}";
    }
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
    public ConsultationModality Modality { get; set; } = ConsultationModality.Online;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Days the doctor does not see patients (vacation, congress): no slot is offered inside the range.
public sealed class DoctorTimeOff
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; }
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
    // Online (video room) or InPerson; Both is only for availability windows.
    public ConsultationModality Modality { get; set; } = ConsultationModality.Online;
    // In-person: the clinic address when it was booked, so a later address change does not rewrite history.
    public string? Location { get; set; }
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
    // RDC Anvisa 471/2021: two copies, valid 10 days.
    Antimicrobial,
    // Portaria SVS/MS 344/1998 (lists C1, C5 and the like): "Receita de Controle Especial", two copies, valid 30 days.
    ControlledSpecial
}

public enum PrescriptionStatus
{
    Draft,
    Signed,
    Cancelled,
    // In-person consultation: printed without the draft mark and signed by hand; closed for editing.
    IssuedOnPaper
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
    public DateTime? IssuedOnPaperAt { get; set; }
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
    // Route of administration ("oral", "intramuscular"), printed on the controlled-drug model.
    public string? Route { get; set; }
    public bool ContinuousUse { get; set; }
}

// Rule C3: why the Médico ADM MedSync opened a record outside their own care.
public enum ClinicalAccessReason
{
    QualityAudit,
    Incident,
    DataSubjectRequest,
    CourtOrder
}

public sealed class ClinicalAccessGrant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ActorUserId { get; set; }
    public User Actor { get; set; } = null!;
    // Name and CRM as they were when the access was granted (the record must not change if the profile does).
    public required string ActorName { get; set; }
    public required string ActorCrm { get; set; }
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public Guid PatientClinicId { get; set; }
    public ClinicalAccessReason Reason { get; set; }
    public required string Justification { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
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

public enum InvoiceStatus
{
    Open,
    // The clinic says it paid; the MedSync team still has to see the money and confirm.
    PaymentInformed,
    Paid,
    Cancelled
}

public enum InvoicePaymentMethod
{
    Pix,
    BankTransfer,
    Boleto,
    Other
}

// MedSync monthly fee of a clinic or consultório (14/10/2026): the MedSync team charges and confirms by hand; the
// clinic pays by Pix, says it paid, and prints the invoice and the receipt.
public sealed class ClinicInvoice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClinicId { get; set; }
    public Clinic Clinic { get; set; } = null!;
    // Month charged, "yyyy-MM".
    public required string Reference { get; set; }
    public required string Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Open;
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? InformedAt { get; set; }
    public Guid? InformedByUserId { get; set; }
    public string? InformedNote { get; set; }
    public DateOnly? PaidOn { get; set; }
    public InvoicePaymentMethod? PaymentMethod { get; set; }
    public string? PaymentNote { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public Guid? ConfirmedByUserId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }

    // Short code printed on the invoice and used as the Pix identifier (txid), so the payment is found in the statement.
    public string Code => $"MS{Id.ToString("N")[..8].ToUpperInvariant()}";
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
