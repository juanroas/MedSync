using MedSync.Domain;

namespace MedSync.Application;

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterClinicRequest(string ClinicName, string Name, string Email, string Password);
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

public sealed record CreateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string Specialty,
    string? Phone,
    string TemporaryPassword);

public sealed record DoctorResponse(
    Guid Id,
    string Name,
    string Email,
    string Crm,
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

public sealed record PaymentResponse(
    Guid Id,
    Guid AppointmentId,
    decimal Amount,
    string Currency,
    PaymentStatus Status,
    string? CheckoutUrl);

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
