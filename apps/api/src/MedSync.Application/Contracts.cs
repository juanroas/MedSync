using MedSync.Domain;

namespace MedSync.Application;

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterClinicRequest(
    string ClinicName,
    string Name,
    string Email,
    string Password,
    string? TradeName,
    string? TaxId);
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
    ClinicActivationStatus ClinicActivationStatus);

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
    bool MfaEnabled);

public sealed record UpdatePersonalProfileRequest(
    string Name,
    string Email,
    string? Phone);

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
    DateTime CreatedAt);

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
    string? ContinuousMedications = null);

public sealed record PatientResponse(
    Guid Id,
    string Name,
    string Email,
    string CpfMasked,
    DateOnly BirthDate,
    string? Phone,
    string? ContinuousMedications);

public sealed record UpdatePatientRequest(
    string Name,
    string Email,
    DateOnly BirthDate,
    string? Phone,
    string? ContinuousMedications = null);

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
    string? ProfessionalAddress);

public sealed record CareSpecialtyResponse(
    string Specialty,
    int AvailableDoctors,
    IReadOnlyCollection<CareDoctorOptionResponse> Doctors);

public sealed record CareDoctorOptionResponse(
    Guid Id,
    string Name,
    bool HasAvailability);

public sealed record UpdateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Phone,
    // Null keeps the current value (the clinic admin's form does not send it).
    string? ProfessionalAddress = null);

public sealed record CreateAppointmentRequest(
    Guid DoctorId,
    Guid PatientId,
    DateTime ScheduledAt,
    int DurationMinutes,
    string? Notes,
    decimal? Price,
    bool PaymentRequired);

public sealed record RequestAppointmentRequest(
    string Specialty,
    Guid? DoctorId,
    DateTime ScheduledAt,
    int DurationMinutes,
    string? Notes);

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
    string? PatientContinuousMedications = null);

public sealed record DoctorAvailabilitySlotResponse(
    Guid Id,
    DayOfWeek DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime);

public sealed record CreateDoctorAvailabilitySlotRequest(
    DayOfWeek DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime);

public sealed record AvailableTimeResponse(
    DateTime StartsAt,
    int DurationMinutes);

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
    bool ContinuousUse);

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
    bool ContinuousUse);

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
    IReadOnlyList<PrescriptionItemResponse> Items);

public sealed record SignPrescriptionRequest(int? LifetimeHours);

public sealed record SigningSessionResponse(bool Active, DateTime? ExpiresAt, bool Simulated, string? Provider);

// Everything the printable document needs (CFM 2.314 art. 13), plus what is still missing before it can be signed.
public sealed record PrescriptionDocumentResponse(
    PrescriptionResponse Prescription,
    string DoctorName,
    string DoctorCrm,
    string DoctorCrmUf,
    string DoctorSpecialty,
    string? DoctorProfessionalAddress,
    string ClinicName,
    string PatientName,
    string PatientCpf,
    string? PatientPhone,
    DateTime AppointmentAt,
    IReadOnlyList<string> MissingForSignature,
    bool SignatureAvailable);

public sealed record MedicationInUseResponse(
    string MedicationName,
    string? Dosage,
    string Instructions,
    DateTime LastPrescribedAt,
    string PrescribedBy,
    Guid PrescriptionId);

public sealed record PatientMedicationsResponse(
    IReadOnlyList<MedicationInUseResponse> Items,
    string? LegacyNote);
