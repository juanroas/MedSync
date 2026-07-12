import type {
  Appointment,
  BusinessReport,
  CareSpecialty,
  ClinicRole,
  CompanyActivation,
  CompanyBeneficiary,
  CompanyOnboarding,
  CompanyPortal,
  ConsultationRoom,
  Doctor,
  FinancialExport,
  FinanceInvoice,
  LoginResponse,
  Patient,
  Payment,
  PersonalProfile,
  PrivacyRequest,
  PrivacyRequestStatus,
  PrivacyRequestType,
  StaffUser,
  AuditEvent,
  User,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const USER_KEY = "medsync_user";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearSession();
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new ApiError("Sua sessão expirou.", response.status);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const validationMessage = body?.errors
      ? (Object.values(body.errors).flat()[0] as string | undefined)
      : undefined;
    throw new ApiError(
      body?.message ?? body?.detail ?? validationMessage ?? "Não foi possível concluir a operação.",
      response.status,
      body?.code,
      body ?? undefined,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function saveSession(session: LoginResponse | User) {
  const user = "user" in session ? session.user : session;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
}

export function getSession(): { user: User } | null {
  if (typeof window === "undefined") return null;
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;
  try {
    return { user: JSON.parse(rawUser) as User };
  } catch {
    clearSession();
    return null;
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  registerClinic: (input: {
    clinicName: string;
    tradeName?: string;
    taxId: string;
    planName: string;
    monthlyFee: number;
    monthlyConsultationLimit: number;
    name: string;
    email: string;
    password: string;
  }) =>
    request<LoginResponse>("/auth/register-clinic", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  me: () => request<User>("/auth/me"),
  getProfile: () => request<PersonalProfile>("/profile"),
  updateProfile: (input: { name: string; email: string; phone?: string }) =>
    request<PersonalProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getStaffUsers: () => request<StaffUser[]>("/staff-users"),
  createStaffUser: (input: {
    name: string;
    email: string;
    role: ClinicRole;
    temporaryPassword: string;
  }) =>
    request<StaffUser>("/staff-users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateStaffUserActivation: (id: string, input: { isActive: boolean; reason?: string }) =>
    request<StaffUser>(`/staff-users/${id}/activation`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getAuditEvents: () => request<AuditEvent[]>("/audit-events"),
  createCompanyOnboarding: (input: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    planName: string;
    monthlyFee: number;
    monthlyConsultationLimit: number;
    adminName: string;
    adminEmail: string;
    temporaryPassword: string;
  }) =>
    request<CompanyOnboarding>("/companies/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getCompanyActivations: () => request<CompanyActivation[]>("/companies/activation"),
  updateCompanyActivation: (id: string, input: { isActive: boolean; reason?: string }) =>
    request<CompanyActivation>(`/companies/${id}/activation`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getCompanyPortal: () => request<CompanyPortal>("/company-portal"),
  getCompanyBeneficiaries: () => request<CompanyBeneficiary[]>("/company-beneficiaries"),
  updateCompanyBeneficiaryEligibility: (
    id: string,
    input: { isEligible: boolean; eligibleUntil?: string; reason?: string },
  ) =>
    request<CompanyBeneficiary>(`/company-beneficiaries/${id}/eligibility`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getFinanceInvoices: () => request<FinanceInvoice[]>("/finance/invoices"),
  getFinancialExport: (period?: string) =>
    request<FinancialExport>(`/finance/export${period ? `?period=${encodeURIComponent(period)}` : ""}`),
  getBusinessReport: (period?: string) =>
    request<BusinessReport>(`/reports/business-summary${period ? `?period=${encodeURIComponent(period)}` : ""}`),
  getPrivacyRequests: () => request<PrivacyRequest[]>("/privacy/requests"),
  createPrivacyRequest: (input: {
    requesterName: string;
    requesterEmail: string;
    subjectReference: string;
    type: PrivacyRequestType;
    description: string;
  }) =>
    request<PrivacyRequest>("/privacy/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePrivacyRequestStatus: (
    id: string,
    input: { status: PrivacyRequestStatus; resolutionNote?: string },
  ) =>
    request<PrivacyRequest>(`/privacy/requests/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  getPatients: () => request<Patient[]>("/patients"),
  createPatient: (patient: {
    name: string;
    email: string;
    cpf: string;
    birthDate: string;
    phone?: string;
    temporaryPassword: string;
  }) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(patient),
    }),
  updatePatient: (id: string, patient: {
    name: string;
    email: string;
    birthDate: string;
    phone?: string;
  }) =>
    request<Patient>(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(patient),
    }),

  getDoctors: () => request<Doctor[]>("/doctors"),
  getCareSpecialties: () => request<CareSpecialty[]>("/care/specialties"),
  createDoctor: (doctor: {
    name: string;
    email: string;
    crm: string;
    crmUf: string;
    specialty: string;
    phone?: string;
    temporaryPassword: string;
  }) =>
    request<Doctor>("/doctors", {
      method: "POST",
      body: JSON.stringify(doctor),
    }),
  updateDoctor: (id: string, doctor: {
    name: string;
    email: string;
    crm: string;
    crmUf: string;
    specialty: string;
    phone?: string;
  }) =>
    request<Doctor>(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(doctor),
    }),

  getAppointments: () => request<Appointment[]>("/appointments"),
  getAppointment: (id: string) => request<Appointment>(`/appointments/${id}`),
  createAppointment: (appointment: {
    doctorId: string;
    patientId: string;
    scheduledAt: string;
    durationMinutes: number;
    notes?: string;
    price?: number;
    paymentRequired: boolean;
  }) =>
    request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(appointment),
    }),
  requestAppointment: (appointment: {
    specialty: string;
    scheduledAt: string;
    durationMinutes: number;
    notes?: string;
  }) =>
    request<Appointment>("/appointments/request", {
      method: "POST",
      body: JSON.stringify(appointment),
    }),

  acceptConsent: (appointmentId: string, termVersion = "telemedicina-2026-01") =>
    request<{ accepted: boolean; termVersion: string; term: string }>(
      `/appointments/${appointmentId}/consent`,
      {
        method: "POST",
        body: JSON.stringify({ accepted: true, termVersion }),
      },
    ),
  getConsentTerm: () =>
    request<{ termVersion: string; term: string }>("/consent/term"),

  startConsultation: (appointmentId: string) =>
    request<ConsultationRoom>(`/consultations/${appointmentId}/start`, {
      method: "POST",
    }),
  getRoom: (appointmentId: string) =>
    request<ConsultationRoom>(`/consultations/${appointmentId}/room`),
  getLiveKitToken: (appointmentId: string) =>
    request<{ token: string; roomName: string; encryptionKey: string }>(
      `/consultations/${appointmentId}/token`,
      { method: "POST" },
    ),
  endConsultation: (appointmentId: string) =>
    request<void>(`/consultations/${appointmentId}/end`, { method: "POST" }),

  createCheckout: (appointmentId: string) =>
    request<Payment>(`/appointments/${appointmentId}/payments/checkout`, {
      method: "POST",
    }),
  getPayment: (appointmentId: string) =>
    request<Payment>(`/appointments/${appointmentId}/payments`),
};
