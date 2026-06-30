namespace MedSync.Domain;

public enum UserRole
{
    Doctor,
    Patient,
    Admin
}

public enum AppointmentStatus
{
    Scheduled,
    InProgress,
    Completed,
    Cancelled
}

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Doctor
{
    public Guid Id { get; set; } = Guid.NewGuid();
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
    public Guid DoctorId { get; set; }
    public Doctor Doctor { get; set; } = null!;
    public Guid PatientId { get; set; }
    public Patient Patient { get; set; } = null!;
    public DateTime ScheduledAt { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public string? Notes { get; set; }
    public ConsultationRoom? ConsultationRoom { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ConsultationRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public required string RoomName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

