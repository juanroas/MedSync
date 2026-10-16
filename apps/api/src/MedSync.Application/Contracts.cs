using MedSync.Domain;

namespace MedSync.Application;

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterClinicRequest(
    string ClinicName,
    string Name,
    string Email,
    string Password,
    string? TradeName,
    string? TaxId,
    AddressInput? Address = null,
    string? Phone = null,
    string? TechnicalDirectorName = null,
    string? TechnicalDirectorCrm = null,
    string? TechnicalDirectorCrmUf = null);

// Brazilian address as typed in the forms; ZipCode with or without the dash, State as the two-letter UF.
public sealed record AddressInput(
    string ZipCode,
    string Street,
    string Number,
    string? Complement,
    string District,
    string City,
    string State);

public sealed record AddressResponse(
    string? ZipCode,
    string? Street,
    string? Number,
    string? Complement,
    string? District,
    string? City,
    string? State);

public sealed record ClinicProfileResponse(
    Guid Id,
    string Name,
    string? LegalName,
    string? TaxIdMasked,
    string? Phone,
    AddressResponse Address,
    string? FormattedAddress,
    string? TechnicalDirectorName,
    string? TechnicalDirectorCrm,
    string? TechnicalDirectorCrmUf,
    ClinicActivationStatus ActivationStatus,
    string? Cnes = null);

public sealed record UpdateClinicProfileRequest(
    string Name,
    string? Phone,
    AddressInput Address,
    string? TechnicalDirectorName,
    string? TechnicalDirectorCrm,
    string? TechnicalDirectorCrmUf,
    string? Cnes = null);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record LoginResponse(UserSummary User);
public sealed record MfaRequiredResponse(bool MfaRequired, string PendingToken);
public sealed record MfaLoginRequest(string PendingToken, string Code);
public sealed record MfaEnrollResponse(string Secret, string OtpAuthUri);
public sealed record MfaConfirmRequest(string Code);
public sealed record MfaDisableRequest(string Password);
public sealed record UserSummary(
    Guid Id,
    string Name,
    string Email,
    Guid ClinicId,
    string ClinicName,
    IReadOnlyCollection<ClinicRole> Roles,
    bool MustChangePassword,
    ClinicActivationStatus ClinicActivationStatus,
    bool ClinicIsPrivatePractice = false,
    // Every place this account works at; more than one shows the location switch (ADR-0005).
    IReadOnlyList<ClinicOptionResponse>? Clinics = null,
    // The doctor record of this account in the current clinic, so screens tell "my appointments" apart when the
    // same person also runs the place (consultório owner).
    Guid? DoctorId = null);

public sealed record ClinicOptionResponse(Guid Id, string Name, bool IsPrivatePractice);

public sealed record SwitchClinicRequest(Guid ClinicId);

// "Sou médico": the doctor registers their own practice and becomes its doctor and admin (ADR-0005).
public sealed record RegisterPracticeRequest(
    string Name,
    string Email,
    string Password,
    string? Phone,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Rqe,
    string LegalName,
    string? TradeName,
    string TaxId,
    AddressInput Address,
    string? Cnes = null);

public sealed record PersonalProfileResponse(
    Guid Id,
    string Name,
    string Email,
    Guid ClinicId,
    string ClinicName,
    IReadOnlyCollection<ClinicRole> Roles,
    string? Phone,
    string ProfileType,
    IReadOnlyCollection<string> LockedFields,
    bool MfaEnabled,
    // Médico ADM MedSync only: own CRM, required to open records with justification.
    string? Crm = null,
    string? CrmUf = null);

public sealed record UpdatePersonalProfileRequest(
    string Name,
    string Email,
    string? Phone,
    string? Crm = null,
    string? CrmUf = null);

public sealed record CreateStaffUserRequest(
    string Name,
    string Email,
    ClinicRole Role,
    string TemporaryPassword);

public sealed record StaffUserResponse(
    Guid Id,
    string Name,
    string Email,
    ClinicRole Role,
    bool IsActive);

public sealed record UpdateStaffUserActivationRequest(
    bool IsActive,
    string? Reason);

public sealed record ResetPasswordResponse(
    Guid UserId,
    string TemporaryPassword);

public sealed record CancelAppointmentRequest(string? Reason);

public sealed record CreateClinicOnboardingRequest(
    string LegalName,
    string? TradeName,
    string TaxId,
    string AdminName,
    string AdminEmail,
    string TemporaryPassword);

public sealed record ClinicOnboardingResponse(
    Guid ClinicId,
    string ClinicName,
    string TaxIdMasked,
    string AdminEmail,
    ClinicActivationStatus ActivationStatus,
    string OnboardingEmailPreview);

public sealed record ClinicActivationResponse(
    Guid ClinicId,
    string ClinicName,
    string? LegalName,
    string? TaxIdMasked,
    string? PlanName,
    decimal? MonthlyFee,
    ClinicActivationStatus ActivationStatus,
    DateTime? ActivatedAt,
    DateTime CreatedAt,
    string? FormattedAddress = null,
    string? TechnicalDirector = null,
    bool IsPrivatePractice = false);

public sealed record UpdateClinicActivationRequest(
    ClinicActivationStatus Status,
    string? Reason,
    string? PlanName,
    decimal? MonthlyFee);

public sealed record AuditEventResponse(
    Guid Id,
    Guid? ActorUserId,
    string Action,
    string ResourceType,
    string? ResourceId,
    string Result,
    string? Reason,
    DateTime CreatedAt);

public sealed record CreatePatientRequest(
    string Name,
    string Email,
    string Cpf,
    DateOnly BirthDate,
    string? Phone,
    string TemporaryPassword,
    string? ContinuousMedications = null,
    string? SocialName = null,
    string? MotherName = null,
    bool MotherNameUndeclared = false,
    string? Sex = null,
    AddressInput? Address = null);

public sealed record PatientResponse(
    Guid Id,
    string Name,
    string Email,
    string CpfMasked,
    DateOnly BirthDate,
    string? Phone,
    string? ContinuousMedications,
    string? SocialName = null,
    string? MotherName = null,
    bool MotherNameUndeclared = false,
    string? Sex = null,
    AddressResponse? Address = null);

// Identification fields left null keep their value; an empty string clears SocialName or Sex.
public sealed record UpdatePatientRequest(
    string Name,
    string Email,
    DateOnly BirthDate,
    string? Phone,
    string? ContinuousMedications = null,
    string? SocialName = null,
    string? MotherName = null,
    bool? MotherNameUndeclared = null,
    string? Sex = null,
    AddressInput? Address = null);

public sealed record CreateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Phone,
    string TemporaryPassword);

public sealed record DoctorResponse(
    Guid Id,
    string Name,
    string Email,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Phone,
    string? ProfessionalAddress,
    string? Rqe);

public sealed record CareSpecialtyResponse(
    string Specialty,
    int AvailableDoctors,
    IReadOnlyCollection<CareDoctorOptionResponse> Doctors);

public sealed record CareDoctorOptionResponse(
    Guid Id,
    string Name,
    bool HasAvailability,
    string Crm,
    // What the doctor's windows offer; an open schedule offers online, and in person when the clinic has an address.
    IReadOnlyList<ConsultationModality> Modalities,
    string ClinicName,
    string? ClinicAddress,
    // The doctor set in-person hours, but the clinic has no address yet, so patients cannot book them.
    bool InPersonPendingAddress = false);

// What any member of a clinic may know about it: where in-person consultations happen.
public sealed record ClinicSummaryResponse(
    Guid Id,
    string Name,
    string? Phone,
    string? FormattedAddress,
    bool HasAddress);

public sealed record UpdateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Phone,
    // Null keeps the current value (the clinic admin's form does not send them).
    string? ProfessionalAddress = null,
    string? Rqe = null);

public sealed record CreateAppointmentRequest(
    Guid DoctorId,
    Guid PatientId,
    DateTime ScheduledAt,
    int DurationMinutes,
    string? Notes,
    decimal? Price,
    bool PaymentRequired,
    ConsultationModality Modality = ConsultationModality.Online);

public sealed record RequestAppointmentRequest(
    string Specialty,
    Guid? DoctorId,
    DateTime ScheduledAt,
    int DurationMinutes,
    string? Notes,
    ConsultationModality Modality = ConsultationModality.Online);

public sealed record AppointmentResponse(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    string Specialty,
    Guid PatientId,
    string PatientName,
    DateTime ScheduledAt,
    int DurationMinutes,
    AppointmentStatus Status,
    string? Notes,
    decimal? Price,
    bool PaymentRequired,
    PaymentStatus? PaymentStatus,
    bool ConsentAccepted,
    string? RoomName,
    VideoSessionStatus? VideoStatus,
    string? PatientContinuousMedications = null,
    bool DoctorJoined = false,
    bool PatientJoined = false,
    ConsultationModality Modality = ConsultationModality.Online,
    string? Location = null);

public sealed record DoctorAvailabilitySlotResponse(
    Guid Id,
    DayOfWeek DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    ConsultationModality Modality);

public sealed record CreateDoctorAvailabilitySlotRequest(
    DayOfWeek DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    ConsultationModality Modality = ConsultationModality.Online);

public sealed record DoctorTimeOffResponse(
    Guid Id,
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason);

public sealed record CreateDoctorTimeOffRequest(
    DateOnly StartDate,
    DateOnly EndDate,
    string? Reason);

public sealed record DoctorScheduleResponse(
    int SlotMinutes,
    int BookingWindowDays,
    IReadOnlyList<DoctorAvailabilitySlotResponse> Windows,
    IReadOnlyList<DoctorTimeOffResponse> TimeOff);

public sealed record UpdateDoctorScheduleSettingsRequest(
    int SlotMinutes,
    int BookingWindowDays);

public sealed record AvailableTimeResponse(
    DateTime StartsAt,
    int DurationMinutes,
    ConsultationModality Modality);

public sealed record RoomResponse(
    Guid Id,
    Guid AppointmentId,
    string RoomName,
    VideoSessionStatus Status,
    DateTime CreatedAt,
    DateTime? StartedAt,
    DateTime? EndedAt);

public sealed record ConsentRequest(bool Accepted, string TermVersion);
public sealed record ClinicalRecordRequest(string Content);
public sealed record ClinicalRecordResponse(
    Guid Id,
    Guid AppointmentId,
    string Content,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record ClinicalRecordAttachmentResponse(
    Guid Id,
    Guid AppointmentId,
    string FileName,
    string ContentType,
    long SizeBytes,
    bool ReleasedToPatient,
    DateTime CreatedAt,
    bool CanDelete);

public sealed record ClinicalAccessPatientResponse(
    Guid PatientId,
    string Name,
    string CpfMasked,
    string ClinicName);

public sealed record CreateClinicalAccessRequest(
    Guid PatientId,
    ClinicalAccessReason Reason,
    string Justification,
    bool Declaration);

public sealed record ClinicalAccessGrantResponse(
    Guid Id,
    Guid PatientId,
    string PatientName,
    string ClinicName,
    string ActorName,
    ClinicalAccessReason Reason,
    string Justification,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    bool Active,
    string? ActorCrm = null);

public sealed record ClinicalAccessRecordsResponse(
    ClinicalAccessGrantResponse Grant,
    IReadOnlyList<PatientClinicalRecordResponse> Records);

public sealed record PatientClinicalAccessEntry(
    DateTime At,
    string ActorName,
    string ActorRole,
    ClinicalAccessReason Reason,
    string? ActorCrm = null);

public sealed record PatientClinicalRecordResponse(
    Guid Id,
    Guid AppointmentId,
    Guid PatientId,
    string PatientName,
    string DoctorName,
    string Specialty,
    DateTime ScheduledAt,
    string Content,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PaymentResponse(
    Guid Id,
    Guid AppointmentId,
    decimal Amount,
    string Currency,
    PaymentStatus Status,
    string? CheckoutUrl);

public sealed record PrivacyRequestResponse(
    Guid Id,
    string RequesterName,
    string RequesterEmail,
    string SubjectReference,
    PrivacyRequestType Type,
    PrivacyRequestStatus Status,
    string Description,
    string? ResolutionNote,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreatePrivacyRequestRequest(
    string RequesterName,
    string RequesterEmail,
    string SubjectReference,
    PrivacyRequestType Type,
    string Description);

public sealed record UpdatePrivacyRequestStatusRequest(
    PrivacyRequestStatus Status,
    string? ResolutionNote);

public sealed record SupportRequestResponse(
    Guid Id,
    string RequesterName,
    string RequesterEmail,
    string Subject,
    SupportRequestStatus Status,
    string Description,
    string? ResolutionNote,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateSupportRequestRequest(
    string Subject,
    string Description);

public sealed record UpdateSupportRequestStatusRequest(
    SupportRequestStatus Status,
    string? ResolutionNote);

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public interface ITotpService
{
    string GenerateSecret();
    string BuildOtpAuthUri(string secret, string accountEmail, string issuer = "MedSync");
    bool Verify(string secret, string code);
}

public interface ITokenService
{
    string CreateJwt(
        User user,
        Clinic clinic,
        IReadOnlyCollection<ClinicRole> roles);

    string CreateLiveKitToken(string roomName, string identity, string? displayName = null);
}

public sealed record HostedCheckoutResult(string PreferenceId, string CheckoutUrl);
public sealed record ProviderPaymentResult(
    string ProviderPaymentId,
    string ExternalReference,
    PaymentStatus Status);

public interface IPaymentProvider
{
    bool IsConfigured { get; }
    Task<HostedCheckoutResult> CreateCheckoutAsync(
        Guid paymentId,
        decimal amount,
        string payerEmail,
        CancellationToken cancellationToken);
    Task<ProviderPaymentResult> GetPaymentAsync(
        string providerPaymentId,
        CancellationToken cancellationToken);
    bool ValidateWebhook(string signature, string requestId, string dataId);
}

public sealed record MedicationSearchResponse(
    Guid Id,
    string Name,
    string? ActiveIngredient,
    string? TherapeuticClass,
    MedicationSource Source);

public sealed record CreateMedicationRequest(string Name, string? ActiveIngredient);

public sealed record PrescriptionItemRequest(
    Guid? CatalogItemId,
    string MedicationName,
    string? Dosage,
    string Instructions,
    string? Quantity,
    bool ContinuousUse,
    string? Route = null);

public sealed record SavePrescriptionRequest(
    PrescriptionKind Kind,
    string? PatientLocation,
    string? Notes,
    Guid? RenewedFromId,
    IReadOnlyList<PrescriptionItemRequest> Items);

public sealed record PrescriptionItemResponse(
    Guid Id,
    Guid? CatalogItemId,
    string MedicationName,
    string? Dosage,
    string Instructions,
    string? Quantity,
    bool ContinuousUse,
    string? Route = null);

public sealed record PrescriptionResponse(
    Guid Id,
    Guid AppointmentId,
    PrescriptionKind Kind,
    PrescriptionStatus Status,
    string? PatientLocation,
    string? Notes,
    Guid? RenewedFromId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime? SignedAt,
    bool SignatureSimulated,
    IReadOnlyList<PrescriptionItemResponse> Items,
    DateTime? IssuedOnPaperAt = null);

public sealed record SignPrescriptionRequest(int? LifetimeHours);

public sealed record SigningSessionResponse(bool Active, DateTime? ExpiresAt, bool Simulated, string? Provider);

// Everything the printable document needs (CFM 2.314 art. 13), plus what is still missing before it can be signed.
public sealed record PrescriptionDocumentResponse(
    PrescriptionResponse Prescription,
    string DoctorName,
    string DoctorCrm,
    string DoctorCrmUf,
    string DoctorSpecialty,
    string? DoctorRqe,
    string? DoctorProfessionalAddress,
    string ClinicName,
    string PatientName,
    string PatientCpf,
    string? PatientPhone,
    DateTime AppointmentAt,
    IReadOnlyList<string> MissingForSignature,
    bool SignatureAvailable,
    // Identification printed on the controlled-drug / antimicrobial model (two copies).
    SpecialPrescriptionIdentification? Special = null,
    ConsultationModality AppointmentModality = ConsultationModality.Online,
    // In-person only: print and sign by hand (rule D6). MissingForPaper lists what must be filled first.
    bool PaperAvailable = false,
    IReadOnlyList<string>? MissingForPaper = null,
    string? ClinicAddress = null);

public sealed record SpecialPrescriptionIdentification(
    string ClinicName,
    string? ClinicLegalName,
    string? ClinicTaxId,
    string? ClinicAddress,
    string? ClinicPhone,
    string? PatientSocialName,
    string? PatientMotherName,
    DateOnly PatientBirthDate,
    string? PatientSex,
    string? PatientAddress,
    string? ClinicCnes = null);

public sealed record MedicationInUseResponse(
    string MedicationName,
    string? Dosage,
    string Instructions,
    DateTime LastPrescribedAt,
    string PrescribedBy,
    Guid PrescriptionId);

// Earlier prescriptions of one patient, for the doctor who attends that patient (in the call and in the record).
public sealed record PatientPrescriptionLine(
    string MedicationName,
    string? Dosage,
    string Instructions,
    string? Quantity,
    bool ContinuousUse);

public sealed record PatientPrescriptionHistoryItem(
    Guid Id,
    Guid AppointmentId,
    DateTime IssuedAt,
    string DoctorName,
    PrescriptionKind Kind,
    PrescriptionStatus Status,
    bool Simulated,
    IReadOnlyList<PatientPrescriptionLine> Items);

public sealed record PatientMedicationsResponse(
    IReadOnlyList<MedicationInUseResponse> Items,
    string? LegacyNote);

public sealed record AvailableDaysResponse(
    bool Restricted,
    DateOnly From,
    DateOnly To,
    IReadOnlyList<DateOnly> Days);

// How the doctor closes the consultation: it happened, or the patient never joined the call.
public sealed record EndConsultationRequest(string? Outcome);

// Reports (rule C5: no clinical content). Outcomes: Completed, NoShow, NotHeld (time passed, never concluded),
// Cancelled, Upcoming.
public sealed record AppointmentReportTotals(
    int Total,
    int Completed,
    int NoShow,
    int NotHeld,
    int Cancelled,
    int Upcoming,
    int Online,
    int InPerson);

public sealed record AppointmentReportDoctorRow(Guid DoctorId, string DoctorName, AppointmentReportTotals Totals);

public sealed record AppointmentReportItem(
    Guid Id,
    DateTime ScheduledAt,
    int DurationMinutes,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    ConsultationModality Modality,
    string Outcome);

// Only in the doctor's own report: prescriptions the doctor issued in the period, by kind and by how they left.
public sealed record PrescriptionReportTotals(
    int Total,
    int Signed,
    int OutsideMedSync,
    int Drafts,
    int Simple,
    int Antimicrobial,
    int ControlledSpecial);

public sealed record AppointmentReportResponse(
    string ClinicName,
    DateOnly From,
    DateOnly To,
    // "clinic" (ADM, Recepção, dono do consultório) or "own" (médico).
    string Scope,
    string? DoctorFilter,
    ConsultationModality? ModalityFilter,
    AppointmentReportTotals Totals,
    IReadOnlyList<AppointmentReportDoctorRow> ByDoctor,
    IReadOnlyList<AppointmentReportItem> Items,
    bool ItemsTruncated,
    PrescriptionReportTotals? Prescriptions,
    DateTime GeneratedAt);

public sealed record DataAccessReportRequest(string? Cpf);

// MedSync monthly fee charged by hand (14/10/2026). Pix fields only while the invoice can still be paid.
public sealed record ClinicInvoiceResponse(
    Guid Id,
    string Code,
    Guid ClinicId,
    string ClinicName,
    bool ClinicIsPrivatePractice,
    string Reference,
    string Description,
    decimal Amount,
    DateOnly DueDate,
    InvoiceStatus Status,
    bool Overdue,
    DateTime CreatedAt,
    DateTime? InformedAt,
    string? InformedNote,
    DateOnly? PaidOn,
    InvoicePaymentMethod? PaymentMethod,
    string? PaymentNote,
    DateTime? CancelledAt,
    string? CancelReason,
    string? PixCode,
    string? PixKey,
    string? PixReceiver);

public sealed record CreateClinicInvoiceRequest(
    Guid ClinicId,
    string Reference,
    decimal? Amount,
    DateOnly DueDate,
    string? Description);

public sealed record InformInvoicePaymentRequest(string? Note);

public sealed record ConfirmInvoicePaymentRequest(DateOnly PaidOn, InvoicePaymentMethod Method, string? Note);

public sealed record CancelInvoiceRequest(string Reason);
