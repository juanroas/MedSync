export type ClinicRole =
  | "Patient"
  | "Doctor"
  | "Receptionist"
  | "Finance"
  | "ClinicAdmin"
  | "MedicalDirector"
  | "PrivacyAuditor";

export type User = {
  id: string;
  name: string;
  email: string;
  clinicId: string;
  clinicName: string;
  roles: ClinicRole[];
  mustChangePassword: boolean;
};

export type LoginResponse = {
  user: User;
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: ClinicRole;
  isActive: boolean;
};

export type AuditEvent = {
  id: string;
  actorUserId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result: string;
  reason?: string;
  createdAt: string;
};

export type Patient = {
  id: string;
  name: string;
  email: string;
  cpfMasked: string;
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
  | "Cancelled"
  | "NoShow";

export type VideoSessionStatus =
  | "Pending"
  | "Ready"
  | "InProgress"
  | "Completed"
  | "Cancelled"
  | "Expired";

export type PaymentStatus =
  | "Pending"
  | "Processing"
  | "Paid"
  | "Failed"
  | "Cancelled"
  | "RefundPending"
  | "Refunded"
  | "Chargeback";

export type Appointment = {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientId: string;
  patientName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  price?: number;
  paymentRequired: boolean;
  paymentStatus?: PaymentStatus;
  consentAccepted: boolean;
  roomName?: string;
  videoStatus?: VideoSessionStatus;
};

export type ConsultationRoom = {
  id: string;
  appointmentId: string;
  roomName: string;
  status: VideoSessionStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
};

export type Payment = {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
};
