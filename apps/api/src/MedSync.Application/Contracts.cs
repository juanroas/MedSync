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
    string? PlanName,
    decimal? MonthlyFee,
    int? MonthlyConsultationLimit);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record LoginResponse(UserSummary User);
public sealed record UserSummary(
    Guid Id,
    string Name,
    string Email,
    Guid ClinicId,
    string ClinicName,
    IReadOnlyCollection<ClinicRole> Roles,
    bool MustChangePassword);

public sealed record PersonalProfileResponse(
    Guid Id,
    string Name,
    string Email,
    Guid ClinicId,
    string ClinicName,
    IReadOnlyCollection<ClinicRole> Roles,
    string? Phone,
    string ProfileType,
    IReadOnlyCollection<string> LockedFields);

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

public sealed record CreateCompanyOnboardingRequest(
    string LegalName,
    string? TradeName,
    string TaxId,
    string PlanName,
    decimal MonthlyFee,
    int MonthlyConsultationLimit,
    string AdminName,
    string AdminEmail,
    string TemporaryPassword);

public sealed record CompanyOnboardingResponse(
    Guid CompanyId,
    Guid TenantId,
    string CompanyName,
    string TaxIdMasked,
    string AdminEmail,
    CompanyContractStatus ContractStatus,
    bool IsActive,
    string OnboardingEmailPreview);

public sealed record CompanyActivationResponse(
    Guid CompanyId,
    Guid TenantId,
    string TenantName,
    string CompanyName,
    string TaxIdMasked,
    string? PlanName,
    CompanyContractStatus? ContractStatus,
    bool IsActive,
    DateTime CreatedAt);

public sealed record UpdateCompanyActivationRequest(
    bool IsActive,
    string? Reason);

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
    string TemporaryPassword);

public sealed record PatientResponse(
    Guid Id,
    string Name,
    string Email,
    string CpfMasked,
    DateOnly BirthDate,
    string? Phone);

public sealed record UpdatePatientRequest(
    string Name,
    string Email,
    DateOnly BirthDate,
    string? Phone);

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
    string? Phone);

public sealed record CareSpecialtyResponse(
    string Specialty,
    int AvailableDoctors,
    IReadOnlyCollection<CareDoctorOptionResponse> Doctors);

public sealed record CareDoctorOptionResponse(
    Guid Id,
    string Name);

public sealed record UpdateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string CrmUf,
    string Specialty,
    string? Phone);

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
    VideoSessionStatus? VideoStatus);

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

public sealed record CompanyPortalResponse(
    CompanyPortalCompanyResponse Company,
    CompanyPortalContractResponse? Contract,
    CompanyPortalEligibilityResponse Eligibility,
    CompanyPortalUsageResponse Usage,
    CompanyPortalBillingResponse Billing,
    IReadOnlyCollection<string> PrivacyGuards);

public sealed record CompanyPortalCompanyResponse(
    Guid Id,
    string LegalName,
    string? TradeName,
    string TaxIdMasked,
    bool IsActive);

public sealed record CompanyPortalContractResponse(
    Guid Id,
    string PlanName,
    CompanyContractStatus Status,
    DateOnly StartsAt,
    DateOnly? EndsAt,
    int MonthlyConsultationLimit);

public sealed record CompanyPortalEligibilityResponse(
    int BeneficiaryCount,
    int EligibleCount,
    int InactiveCount);

public sealed record CompanyPortalUsageResponse(
    int? TotalConsultations,
    int? ScheduledConsultations,
    int? InProgressConsultations,
    int? CompletedConsultations,
    bool HiddenDueToPrivacyThreshold,
    string? HiddenReason);

public sealed record CompanyPortalBillingResponse(
    decimal? EstimatedMonthlyFee,
    string Currency,
    string Status,
    string Note);

public sealed record CompanyBeneficiaryResponse(
    Guid Id,
    string Name,
    string Email,
    string? EmployeeCode,
    bool IsActive,
    string? PlanName,
    bool IsEligible,
    DateOnly? EligibleFrom,
    DateOnly? EligibleUntil,
    string? Reason);

public sealed record UpdateCompanyBeneficiaryEligibilityRequest(
    bool IsEligible,
    DateOnly? EligibleUntil,
    string? Reason);

public sealed record FinanceInvoiceResponse(
    string Id,
    string Period,
    string Description,
    decimal Amount,
    decimal PaidAmount,
    string Currency,
    string Status,
    DateOnly DueDate,
    DateTime IssuedAt,
    string Note);

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

public sealed record BusinessReportResponse(
    string Period,
    bool IsGlobal,
    IReadOnlyCollection<BusinessReportCompanyResponse> Companies,
    IReadOnlyCollection<string> PrivacyGuards);

public sealed record BusinessReportCompanyResponse(
    Guid CompanyId,
    Guid TenantId,
    string TenantName,
    string CompanyName,
    string TaxIdMasked,
    string? PlanName,
    CompanyContractStatus? ContractStatus,
    int BeneficiaryCount,
    int EligibleCount,
    int InactiveCount,
    int? TotalConsultations,
    int? ScheduledConsultations,
    int? InProgressConsultations,
    int? CompletedConsultations,
    bool HiddenDueToPrivacyThreshold,
    string? HiddenReason,
    decimal? MonthlyFee,
    decimal PaidAmount,
    string Currency,
    string BillingStatus);

public sealed record FinancialExportResponse(
    string Period,
    bool IsGlobal,
    DateTime GeneratedAt,
    IReadOnlyCollection<FinancialExportRowResponse> Rows,
    IReadOnlyCollection<string> PrivacyGuards);

public sealed record FinancialExportRowResponse(
    Guid CompanyId,
    Guid TenantId,
    string TenantName,
    string CompanyName,
    string TaxIdMasked,
    string? PlanName,
    CompanyContractStatus? ContractStatus,
    int BeneficiaryCount,
    int EligibleCount,
    decimal MonthlyFee,
    decimal PaidAmount,
    decimal OpenAmount,
    string Currency,
    string BillingStatus);

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
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
