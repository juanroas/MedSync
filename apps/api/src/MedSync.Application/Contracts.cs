using MedSync.Domain;

namespace MedSync.Application;

public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string Token, UserSummary User);
public sealed record UserSummary(Guid Id, string Name, string Email, UserRole Role);

public sealed record CreatePatientRequest(
    string Name,
    string Email,
    string Cpf,
    DateOnly BirthDate,
    string? Phone);

public sealed record PatientResponse(
    Guid Id,
    string Name,
    string Email,
    string Cpf,
    DateOnly BirthDate,
    string? Phone);

public sealed record CreateDoctorRequest(
    string Name,
    string Email,
    string Crm,
    string Specialty,
    string? Phone);

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
    string? Notes);

public sealed record AppointmentResponse(
    Guid Id,
    Guid DoctorId,
    string DoctorName,
    string Specialty,
    Guid PatientId,
    string PatientName,
    DateTime ScheduledAt,
    AppointmentStatus Status,
    string? Notes,
    string? RoomName);

public sealed record RoomResponse(
    Guid Id,
    Guid AppointmentId,
    string RoomName,
    DateTime CreatedAt);

public interface IPasswordService
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}

public interface ITokenService
{
    string CreateJwt(User user);
    string CreateLiveKitToken(string roomName, string identity, string? displayName = null);
}

