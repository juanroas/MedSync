export type ClinicRole =
  | "Patient"
  | "Doctor"
  | "Receptionist"
  | "Finance"
  | "ClinicAdmin"
  | "MedicalDirector"
  | "PrivacyAuditor"
  | "CompanyAdmin"
  | "CompanyFinance"
  | "PlatformFinance"
  | "Support"
  | "CompanyAuditor"
  | "PlatformAuditor"
  | "DataProtectionOfficer"
  | "PlatformAdmin"
  | "OccupationalHealthAdmin";

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
};

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: ClinicRole;
  isActive: boolean;
};

export type CompanyOnboarding = {
  companyId: string;
  tenantId: string;
  companyName: string;
  taxIdMasked: string;
  adminEmail: string;
  contractStatus: CompanyContractStatus;
  isActive: boolean;
  onboardingEmailPreview: string;
};

export type CompanyActivation = {
  companyId: string;
  tenantId: string;
  tenantName: string;
  companyName: string;
  taxIdMasked: string;
  planName?: string;
  contractStatus?: CompanyContractStatus;
  isActive: boolean;
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
};

export type Doctor = {
  id: string;
  name: string;
  email: string;
  crm: string;
  crmUf: string;
  specialty: string;
  phone?: string;
};

export type CareSpecialty = {
  specialty: string;
  availableDoctors: number;
  doctors: Array<{
    id: string;
    name: string;
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

export type CompanyContractStatus =
  | "Draft"
  | "Active"
  | "Suspended"
  | "Ended"
  | "Cancelled";

export type CompanyPortal = {
  company: {
    id: string;
    legalName: string;
    tradeName?: string;
    taxIdMasked: string;
    isActive: boolean;
  };
  contract?: {
    id: string;
    planName: string;
    status: CompanyContractStatus;
    startsAt: string;
    endsAt?: string;
    monthlyConsultationLimit: number;
  };
  eligibility: {
    beneficiaryCount: number;
    eligibleCount: number;
    inactiveCount: number;
  };
  usage: {
    totalConsultations?: number;
    scheduledConsultations?: number;
    inProgressConsultations?: number;
    completedConsultations?: number;
    hiddenDueToPrivacyThreshold: boolean;
    hiddenReason?: string;
  };
  billing: {
    estimatedMonthlyFee?: number;
    currency: string;
    status: string;
    note: string;
  };
  privacyGuards: string[];
};

export type CompanyBeneficiary = {
  id: string;
  name: string;
  email: string;
  employeeCode?: string;
  isActive: boolean;
  planName?: string;
  isEligible: boolean;
  eligibleFrom?: string;
  eligibleUntil?: string;
  reason?: string;
};

export type FinanceInvoice = {
  id: string;
  period: string;
  description: string;
  amount: number;
  paidAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  issuedAt: string;
  note: string;
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

export type BusinessReport = {
  period: string;
  isGlobal: boolean;
  companies: BusinessReportCompany[];
  privacyGuards: string[];
};

export type BusinessReportCompany = {
  companyId: string;
  tenantId: string;
  tenantName: string;
  companyName: string;
  taxIdMasked: string;
  planName?: string;
  contractStatus?: CompanyContractStatus;
  beneficiaryCount: number;
  eligibleCount: number;
  inactiveCount: number;
  totalConsultations?: number;
  scheduledConsultations?: number;
  inProgressConsultations?: number;
  completedConsultations?: number;
  hiddenDueToPrivacyThreshold: boolean;
  hiddenReason?: string;
  monthlyFee?: number;
  paidAmount: number;
  currency: string;
  billingStatus: string;
};

export type FinancialExport = {
  period: string;
  isGlobal: boolean;
  generatedAt: string;
  rows: FinancialExportRow[];
  privacyGuards: string[];
};

export type FinancialExportRow = {
  companyId: string;
  tenantId: string;
  tenantName: string;
  companyName: string;
  taxIdMasked: string;
  planName?: string;
  contractStatus?: CompanyContractStatus;
  beneficiaryCount: number;
  eligibleCount: number;
  monthlyFee: number;
  paidAmount: number;
  openAmount: number;
  currency: string;
  billingStatus: string;
};
