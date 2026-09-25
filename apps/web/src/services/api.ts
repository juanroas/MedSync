import type {
  Appointment,
  MedicationSearchItem,
  PatientMedications,
  Prescription,
  PrescriptionDocument,
  SavePrescriptionInput,
  AvailableTime,
  CareSpecialty,
  ClinicalRecord,
  ClinicalRecordAttachment,
  ClinicRole,
  ClinicActivation,
  ClinicActivationStatus,
  ClinicOnboarding,
  ConsultationRoom,
  Doctor,
  DoctorAvailabilitySlot,
  LoginResponse,
  MfaEnrollResponse,
  MfaRequiredResponse,
  Patient,
  PatientClinicalRecord,
  Payment,
  PersonalProfile,
  PrivacyRequest,
  PrivacyRequestStatus,
  PrivacyRequestType,
  StaffUser,
  SupportRequest,
  SupportRequestStatus,
  AuditEvent,
  User,
  WeekDay,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api";
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
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const credentialMessages: Record<string, string> = {
    "/auth/login": "E-mail ou senha inválidos.",
    "/auth/login/mfa": "Código inválido ou expirado.",
  };
  if (response.status === 401 && credentialMessages[path]) {
    throw new ApiError(credentialMessages[path], response.status);
  }

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
    request<LoginResponse | MfaRequiredResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  loginMfa: (pendingToken: string, code: string) =>
    request<LoginResponse>("/auth/login/mfa", {
      method: "POST",
      body: JSON.stringify({ pendingToken, code }),
    }),
  enrollMfa: () => request<MfaEnrollResponse>("/mfa/enroll", { method: "POST" }),
  confirmMfa: (code: string) =>
    request<{ mfaEnabled: boolean }>("/mfa/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  disableMfa: (password: string) =>
    request<{ mfaEnabled: boolean }>("/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  registerClinic: (input: {
    clinicName: string;
    tradeName?: string;
    taxId: string;
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
  resetStaffUserPassword: (id: string) =>
    request<{ userId: string; temporaryPassword: string }>(`/staff-users/${id}/reset-password`, {
      method: "POST",
    }),
  getAuditEvents: () => request<AuditEvent[]>("/audit-events"),
  createClinicOnboarding: (input: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    adminName: string;
    adminEmail: string;
    temporaryPassword: string;
  }) =>
    request<ClinicOnboarding>("/clinics/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getClinicActivations: () => request<ClinicActivation[]>("/clinics/activation"),
  updateClinicActivation: (
    id: string,
    input: { status: ClinicActivationStatus; reason?: string; planName?: string; monthlyFee?: number },
  ) =>
    request<ClinicActivation>(`/clinics/${id}/activation`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
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

  getSupportRequests: () => request<SupportRequest[]>("/support/requests"),
  createSupportRequest: (input: { subject: string; description: string }) =>
    request<SupportRequest>("/support/requests", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateSupportRequestStatus: (
    id: string,
    input: { status: SupportRequestStatus; resolutionNote?: string },
  ) =>
    request<SupportRequest>(`/support/requests/${id}/status`, {
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
    continuousMedications?: string;
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
    continuousMedications?: string;
  }) =>
    request<Patient>(`/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(patient),
    }),

  getDoctors: () => request<Doctor[]>("/doctors"),
  getMyAvailability: () => request<DoctorAvailabilitySlot[]>("/doctors/me/availability"),
  createMyAvailabilitySlot: (slot: { dayOfWeek: WeekDay; startTime: string; endTime: string }) =>
    request<DoctorAvailabilitySlot>("/doctors/me/availability", {
      method: "POST",
      body: JSON.stringify(slot),
    }),
  deleteMyAvailabilitySlot: (id: string) =>
    request<void>(`/doctors/me/availability/${id}`, { method: "DELETE" }),
  getAvailableTimes: (doctorId: string, date: string) =>
    request<AvailableTime[]>(`/doctors/${doctorId}/available-times?date=${date}`),
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
    professionalAddress?: string;
  }) =>
    request<Doctor>(`/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify(doctor),
    }),

  getAppointments: () => request<Appointment[]>("/appointments"),
  getAppointment: (id: string) => request<Appointment>(`/appointments/${id}`),
  getClinicalRecord: (appointmentId: string) =>
    request<ClinicalRecord>(`/appointments/${appointmentId}/clinical-record`),
  saveClinicalRecord: (appointmentId: string, input: { content: string }) =>
    request<ClinicalRecord>(`/appointments/${appointmentId}/clinical-record`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  getClinicalRecordAttachments: (appointmentId: string) =>
    request<ClinicalRecordAttachment[]>(`/appointments/${appointmentId}/clinical-record/attachments`),
  uploadClinicalRecordAttachment: (appointmentId: string, file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    return request<ClinicalRecordAttachment>(`/appointments/${appointmentId}/clinical-record/attachments`, {
      method: "POST",
      body: formData,
    });
  },
  deleteClinicalRecordAttachment: (appointmentId: string, attachmentId: string) =>
    request<void>(`/appointments/${appointmentId}/clinical-record/attachments/${attachmentId}`, {
      method: "DELETE",
    }),
  clinicalRecordAttachmentDownloadUrl: (appointmentId: string, attachmentId: string) =>
    `${API_URL}/appointments/${appointmentId}/clinical-record/attachments/${attachmentId}/download`,
  getPatientClinicalRecords: (patientId: string) =>
    request<PatientClinicalRecord[]>(`/patients/${patientId}/clinical-records`),
  searchMedications: (query: string) =>
    request<MedicationSearchItem[]>(`/medications?q=${encodeURIComponent(query)}`),
  createMedication: (input: { name: string; activeIngredient?: string }) =>
    request<MedicationSearchItem>("/medications", { method: "POST", body: JSON.stringify(input) }),
  getAppointmentPrescriptions: (appointmentId: string) =>
    request<Prescription[]>(`/appointments/${appointmentId}/prescriptions`),
  createPrescription: (appointmentId: string, input: SavePrescriptionInput) =>
    request<Prescription>(`/appointments/${appointmentId}/prescriptions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePrescription: (id: string, input: SavePrescriptionInput) =>
    request<Prescription>(`/prescriptions/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deletePrescription: (id: string) => request<void>(`/prescriptions/${id}`, { method: "DELETE" }),
  getPrescriptionDocument: (id: string) => request<PrescriptionDocument>(`/prescriptions/${id}`),
  signPrescription: (id: string) =>
    request<{ authorizationUrl: string }>(`/prescriptions/${id}/sign`, { method: "POST" }),
  prescriptionPdfUrl: (id: string) => `${API_URL}/prescriptions/${id}/pdf`,
  getPatientMedications: (patientId: string) =>
    request<PatientMedications>(`/patients/${patientId}/medications`),
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
    doctorId?: string;
    scheduledAt: string;
    durationMinutes: number;
    notes?: string;
  }) =>
    request<Appointment>("/appointments/request", {
      method: "POST",
      body: JSON.stringify(appointment),
    }),

  acceptConsent: (appointmentId: string, termVersion = "telemedicina-2026-02") =>
    request<{ accepted: boolean; termVersion: string; term: string }>(
      `/appointments/${appointmentId}/consent`,
      {
        method: "POST",
        body: JSON.stringify({ accepted: true, termVersion }),
      },
    ),
  getConsentTerm: () =>
    request<{ termVersion: string; term: string }>("/consent/term"),
  cancelAppointment: (appointmentId: string, reason?: string) =>
    request<Appointment>(`/appointments/${appointmentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

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
