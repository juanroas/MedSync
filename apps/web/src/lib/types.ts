// ADR-0003: os seis perfis.
export type ClinicRole =
  | "Patient"
  | "Doctor"
  | "ClinicAdmin"
  | "Receptionist"
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
  Receptionist: "Recepção",
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
  clinicIsPrivatePractice?: boolean;
  // Every place this account works at; more than one shows the location switch (ADR-0005).
  clinics?: ClinicOption[];
  // The doctor record in the current clinic, to tell "my appointments" apart for a consultório owner.
  doctorId?: string | null;
};

export type ClinicOption = {
  id: string;
  name: string;
  isPrivatePractice: boolean;
};

export type ClinicActivationStatus = "Pending" | "Active" | "Suspended";

// Consultório owner: doctor and admin of their own practice (ADR-0005). Screens show the doctor's day first and keep
// the admin tools (patients, agenda, team) one click away.
export function isPracticeOwner(user?: Pick<User, "roles" | "clinicIsPrivatePractice"> | null) {
  return Boolean(user?.clinicIsPrivatePractice && user.roles.includes("Doctor") && user.roles.includes("ClinicAdmin"));
}

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
  crm?: string | null;
  crmUf?: string | null;
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
  formattedAddress?: string | null;
  technicalDirector?: string | null;
  isPrivatePractice?: boolean;
};

export type ClinicSummary = {
  id: string;
  name: string;
  phone?: string | null;
  formattedAddress?: string | null;
  hasAddress: boolean;
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

export type Address = {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export type AddressResponse = { [K in keyof Address]?: string | null };

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export type Patient = {
  id: string;
  name: string;
  email: string;
  cpfMasked: string;
  birthDate: string;
  phone?: string;
  continuousMedications?: string;
  socialName?: string | null;
  motherName?: string | null;
  motherNameUndeclared?: boolean;
  sex?: "F" | "M" | null;
  address?: AddressResponse | null;
};

export type ClinicProfile = {
  id: string;
  name: string;
  legalName?: string | null;
  taxIdMasked?: string | null;
  phone?: string | null;
  address: AddressResponse;
  formattedAddress?: string | null;
  technicalDirectorName?: string | null;
  technicalDirectorCrm?: string | null;
  technicalDirectorCrmUf?: string | null;
  activationStatus: ClinicActivationStatus;
  cnes?: string | null;
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
  rqe?: string | null;
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

export type ConsultationModality = "Online" | "InPerson" | "Both";

export const MODALITY_LABELS: Record<ConsultationModality, string> = {
  Online: "Online",
  InPerson: "Presencial",
  Both: "Online ou presencial",
};

export type DoctorAvailabilitySlot = {
  id: string;
  dayOfWeek: WeekDay;
  startTime: string;
  endTime: string;
  modality: ConsultationModality;
};

export type DoctorTimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export type DoctorSchedule = {
  slotMinutes: number;
  bookingWindowDays: number;
  windows: DoctorAvailabilitySlot[];
  timeOff: DoctorTimeOff[];
};

export type AvailableTime = {
  startsAt: string;
  durationMinutes: number;
  modality: ConsultationModality;
};

export type CareSpecialty = {
  specialty: string;
  availableDoctors: number;
  doctors: Array<{
    id: string;
    name: string;
    hasAvailability: boolean;
    crm: string;
    modalities: ConsultationModality[];
    clinicName: string;
    clinicAddress?: string | null;
    inPersonPendingAddress?: boolean;
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
  doctorJoined?: boolean;
  patientJoined?: boolean;
  modality: ConsultationModality;
  location?: string | null;
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

export type ClinicalAccessReason = "QualityAudit" | "Incident" | "DataSubjectRequest" | "CourtOrder";

export const CLINICAL_ACCESS_REASON_LABELS: Record<ClinicalAccessReason, string> = {
  QualityAudit: "Auditoria de qualidade ou de conduta",
  Incident: "Incidente ou reclamação",
  DataSubjectRequest: "Pedido do próprio paciente (titular dos dados)",
  CourtOrder: "Requisição judicial ou de autoridade",
};

export type ClinicalAccessPatient = { patientId: string; name: string; cpfMasked: string; clinicName: string };

export type ClinicalAccessGrant = {
  id: string;
  patientId: string;
  patientName: string;
  clinicName: string;
  actorName: string;
  reason: ClinicalAccessReason;
  justification: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  actorCrm?: string | null;
};

export type ClinicalAccessRecords = { grant: ClinicalAccessGrant; records: PatientClinicalRecord[] };

export type PatientClinicalAccessEntry = {
  at: string;
  actorName: string;
  actorRole: string;
  reason: ClinicalAccessReason;
  actorCrm?: string | null;
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

export type PrescriptionKind = "Simple" | "Antimicrobial" | "ControlledSpecial";
export type PrescriptionStatus = "Draft" | "Signed" | "Cancelled" | "IssuedOnPaper";

export type PrescriptionItemInput = {
  catalogItemId?: string | null;
  medicationName: string;
  dosage?: string | null;
  instructions: string;
  quantity?: string | null;
  route?: string | null;
  continuousUse: boolean;
};

export type PrescriptionItem = PrescriptionItemInput & { id: string };

export type SpecialPrescriptionIdentification = {
  clinicName: string;
  clinicLegalName?: string | null;
  clinicTaxId?: string | null;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
  patientSocialName?: string | null;
  patientMotherName?: string | null;
  patientBirthDate: string;
  patientSex?: "F" | "M" | null;
  patientAddress?: string | null;
  clinicCnes?: string | null;
};

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
  issuedOnPaperAt?: string | null;
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
  doctorRqe?: string | null;
  doctorProfessionalAddress?: string | null;
  clinicName: string;
  patientName: string;
  patientCpf: string;
  patientPhone?: string | null;
  appointmentAt: string;
  missingForSignature: string[];
  signatureAvailable: boolean;
  special?: SpecialPrescriptionIdentification | null;
  appointmentModality: ConsultationModality;
  paperAvailable: boolean;
  missingForPaper?: string[] | null;
  clinicAddress?: string | null;
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

export type AvailableDays = {
  restricted: boolean;
  from: string;
  to: string;
  days: string[];
};

// Reports (rule C5: no clinical content). Outcome reads like the agenda.
export type ReportOutcome = "Completed" | "NoShow" | "NotHeld" | "Cancelled" | "Upcoming";

export type AppointmentReportTotals = {
  total: number;
  completed: number;
  noShow: number;
  notHeld: number;
  cancelled: number;
  upcoming: number;
  online: number;
  inPerson: number;
};

export type AppointmentReport = {
  clinicName: string;
  from: string;
  to: string;
  scope: "clinic" | "own";
  doctorFilter?: string | null;
  modalityFilter?: ConsultationModality | null;
  totals: AppointmentReportTotals;
  byDoctor: Array<{ doctorId: string; doctorName: string; totals: AppointmentReportTotals }>;
  items: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    patientName: string;
    doctorId: string;
    doctorName: string;
    modality: ConsultationModality;
    outcome: ReportOutcome;
  }>;
  itemsTruncated: boolean;
  prescriptions?: {
    total: number;
    signed: number;
    outsideMedSync: number;
    drafts: number;
    simple: number;
    antimicrobial: number;
    controlledSpecial: number;
  } | null;
  generatedAt: string;
};

export const REPORT_OUTCOME_LABELS: Record<ReportOutcome, string> = {
  Completed: "Realizada",
  NoShow: "Paciente faltou",
  NotHeld: "Não realizada",
  Cancelled: "Cancelada",
  Upcoming: "A realizar",
};

// MedSync monthly fee charged by hand (14/10/2026).
export type InvoiceStatus = "Open" | "PaymentInformed" | "Paid" | "Cancelled";
export type InvoicePaymentMethod = "Pix" | "BankTransfer" | "Boleto" | "Other";

export type ClinicInvoice = {
  id: string;
  code: string;
  clinicId: string;
  clinicName: string;
  clinicIsPrivatePractice: boolean;
  reference: string;
  description: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  overdue: boolean;
  createdAt: string;
  informedAt?: string | null;
  informedNote?: string | null;
  paidOn?: string | null;
  paymentMethod?: InvoicePaymentMethod | null;
  paymentNote?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  pixCode?: string | null;
  pixKey?: string | null;
  pixReceiver?: string | null;
};

export const INVOICE_METHOD_LABELS: Record<InvoicePaymentMethod, string> = {
  Pix: "Pix",
  BankTransfer: "Transferência bancária",
  Boleto: "Boleto",
  Other: "Outro",
};

export function invoiceStatusLabel(invoice: Pick<ClinicInvoice, "status" | "overdue">) {
  if (invoice.status === "Paid") return "Paga";
  if (invoice.status === "PaymentInformed") return "Pagamento informado";
  if (invoice.status === "Cancelled") return "Cancelada";
  return invoice.overdue ? "Em atraso" : "Em aberto";
}

// Earlier prescriptions of one patient, for the doctor who attends that patient (call and record).
export type PatientPrescriptionHistory = {
  id: string;
  appointmentId: string;
  issuedAt: string;
  doctorName: string;
  kind: PrescriptionKind;
  status: PrescriptionStatus;
  simulated: boolean;
  items: Array<{ medicationName: string; dosage?: string | null; instructions: string; quantity?: string | null; continuousUse: boolean }>;
};
