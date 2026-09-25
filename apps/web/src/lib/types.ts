// ADR-0003: os seis perfis.
export type ClinicRole =
  | "Patient"
  | "Doctor"
  | "ClinicAdmin"
  | "MedicalDirector"
  | "Support"
  | "DataProtectionOfficer";

export const ROLE_LABELS: Record<ClinicRole, string> = {
  Patient: "Paciente",
  Doctor: "Médico",
  ClinicAdmin: "ADM da clínica",
  MedicalDirector: "Médico ADM MedSync",
  Support: "Suporte MedSync",
  DataProtectionOfficer: "DPO MedSync",
};

export type User = {
  id: string;
  name: string;
  email: string;
  clinicId: string;
  clinicName: string;
  roles: ClinicRole[];
  mustChangePassword: boolean;
  clinicActivationStatus: ClinicActivationStatus;
};

export type ClinicActivationStatus = "Pending" | "Active" | "Suspended";

export type LoginResponse = {
  user: User;
};

export type MfaRequiredResponse = {
  mfaRequired: true;
  pendingToken: string;
};

export type MfaEnrollResponse = {
  secret: string;
  otpAuthUri: string;
};

export type PersonalProfile = {
  id: string;
  name: string;
  email: string;
  clinicId: string;
  clinicName: string;
  roles: ClinicRole[];
  phone?: string;
  profileType: string;
  lockedFields: string[];
  mfaEnabled: boolean;
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: ClinicRole;
  isActive: boolean;
};

export type ClinicOnboarding = {
  clinicId: string;
  clinicName: string;
  taxIdMasked: string;
  adminEmail: string;
  activationStatus: ClinicActivationStatus;
  onboardingEmailPreview: string;
};

export type ClinicActivation = {
  clinicId: string;
  clinicName: string;
  legalName?: string;
  taxIdMasked?: string;
  planName?: string;
  monthlyFee?: number;
  activationStatus: ClinicActivationStatus;
  activatedAt?: string;
  createdAt: string;
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
  continuousMedications?: string;
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  crm: string;
  crmUf: string;
  specialty: string;
  phone?: string;
  professionalAddress?: string | null;
};

export type WeekDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export const WEEKDAY_ORDER: WeekDay[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  Sunday: "Domingo",
  Monday: "Segunda-feira",
  Tuesday: "Terca-feira",
  Wednesday: "Quarta-feira",
  Thursday: "Quinta-feira",
  Friday: "Sexta-feira",
  Saturday: "Sabado",
};

export type DoctorAvailabilitySlot = {
  id: string;
  dayOfWeek: WeekDay;
  startTime: string;
  endTime: string;
};

export type AvailableTime = {
  startsAt: string;
  durationMinutes: number;
};

export type CareSpecialty = {
  specialty: string;
  availableDoctors: number;
  doctors: Array<{
    id: string;
    name: string;
    hasAvailability: boolean;
  }>;
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
  patientContinuousMedications?: string;
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

export type ClinicalRecord = {
  id: string;
  appointmentId: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalRecordAttachment = {
  id: string;
  appointmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  releasedToPatient: boolean;
  createdAt: string;
  canDelete: boolean;
};

export type PatientClinicalRecord = ClinicalRecord & {
  patientId: string;
  patientName: string;
  doctorName: string;
  specialty: string;
  scheduledAt: string;
};

export type Payment = {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
};

export type PrivacyRequestType =
  | "Access"
  | "Correction"
  | "Deletion"
  | "Portability"
  | "ConsentRevocation"
  | "Other";

export type PrivacyRequestStatus =
  | "New"
  | "InReview"
  | "WaitingRequester"
  | "Resolved"
  | "Rejected";

export type PrivacyRequest = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  subjectReference: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  description: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportRequestStatus = "New" | "InProgress" | "Resolved";

export type SupportRequest = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  status: SupportRequestStatus;
  description: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};


export type MedicationSearchItem = {
  id: string;
  name: string;
  activeIngredient?: string | null;
  therapeuticClass?: string | null;
  source: "Anvisa" | "Custom";
};

export type PrescriptionKind = "Simple" | "Antimicrobial";
export type PrescriptionStatus = "Draft" | "Signed" | "Cancelled";

export type PrescriptionItemInput = {
  catalogItemId?: string | null;
  medicationName: string;
  dosage?: string | null;
  instructions: string;
  quantity?: string | null;
  continuousUse: boolean;
};

export type PrescriptionItem = PrescriptionItemInput & { id: string };

export type Prescription = {
  id: string;
  appointmentId: string;
  kind: PrescriptionKind;
  status: PrescriptionStatus;
  patientLocation?: string | null;
  notes?: string | null;
  renewedFromId?: string | null;
  createdAt: string;
  updatedAt: string;
  signedAt?: string | null;
  signatureSimulated: boolean;
  items: PrescriptionItem[];
};

export type SavePrescriptionInput = {
  kind: PrescriptionKind;
  patientLocation?: string | null;
  notes?: string | null;
  renewedFromId?: string | null;
  items: PrescriptionItemInput[];
};

export type PrescriptionDocument = {
  prescription: Prescription;
  doctorName: string;
  doctorCrm: string;
  doctorCrmUf: string;
  doctorSpecialty: string;
  doctorProfessionalAddress?: string | null;
  clinicName: string;
  patientName: string;
  patientCpf: string;
  patientPhone?: string | null;
  appointmentAt: string;
  missingForSignature: string[];
  signatureAvailable: boolean;
};

export type MedicationInUse = {
  medicationName: string;
  dosage?: string | null;
  instructions: string;
  lastPrescribedAt: string;
  prescribedBy: string;
  prescriptionId: string;
};

export type PatientMedications = {
  items: MedicationInUse[];
  legacyNote?: string | null;
};

export type SigningSession = {
  active: boolean;
  expiresAt?: string | null;
  simulated: boolean;
  provider?: string | null;
};
