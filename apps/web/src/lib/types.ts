export type UserRole = "Doctor" | "Patient" | "Admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  phone?: string;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  crm: string;
  specialty: string;
  phone?: string;
};

export type AppointmentStatus =
  | "Scheduled"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export type Appointment = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
  roomName?: string;
};

export type ConsultationRoom = {
  id: string;
  appointmentId: string;
  roomName: string;
  createdAt: string;
};

