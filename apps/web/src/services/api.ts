import type {
  Appointment,
  ConsultationRoom,
  Doctor,
  LoginResponse,
  Patient,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "medsync_token";
const USER_KEY = "medsync_user";

type RequestOptions = RequestInit & { authenticated?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.authenticated !== false && typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/login";
    throw new Error("Sua sessão expirou.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Não foi possível concluir a operação.");
  }

  return response.json() as Promise<T>;
}

export function saveSession(session: LoginResponse) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSession() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as LoginResponse["user"] };
  } catch {
    clearSession();
    return null;
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ email, password }),
    }),

  getPatients: () => request<Patient[]>("/patients"),
  createPatient: (patient: Omit<Patient, "id">) =>
    request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(patient),
    }),

  getDoctors: () => request<Doctor[]>("/doctors"),
  createDoctor: (doctor: Omit<Doctor, "id">) =>
    request<Doctor>("/doctors", {
      method: "POST",
      body: JSON.stringify(doctor),
    }),

  getAppointments: () => request<Appointment[]>("/appointments"),
  getAppointment: (id: string) => request<Appointment>(`/appointments/${id}`),
  createAppointment: (appointment: {
    doctorId: string;
    patientId: string;
    scheduledAt: string;
    notes?: string;
  }) =>
    request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(appointment),
    }),

  createRoom: (appointmentId: string) =>
    request<ConsultationRoom>(`/consultations/${appointmentId}/room`, {
      method: "POST",
    }),

  getLiveKitToken: (roomName: string, identity: string) =>
    request<{ token: string; roomName: string }>(
      `/livekit/token?roomName=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`,
    ),
};

