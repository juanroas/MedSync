"use client";

import { Logo } from "@/components/logo";
import { RealtimeProvider } from "@/lib/realtime";
import { ROLE_LABELS, isPracticeOwner, type ClinicRole, type User } from "@/lib/types";
import { ApiError, api, clearSession, getSession, saveSession } from "@/services/api";
import {
  Building2,
  FileLock2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  UserRoundCog,
  Users,
  UserCog,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: ClinicRole[];
}> = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/perfil", label: "Meus dados", icon: UserRoundCog },
  { href: "/clinicas", label: "Clínicas", icon: Building2, roles: ["MedicalDirector", "Support"] },
  { href: "/consultas", label: "Consultas", icon: CalendarDays, roles: ["Patient", "Doctor", "ClinicAdmin", "Receptionist"] },
  { href: "/patients", label: "Pacientes", icon: Users, roles: ["Doctor", "Patient", "ClinicAdmin", "Receptionist"] },
  { href: "/doctors", label: "Médicos", icon: Stethoscope, roles: ["Doctor", "ClinicAdmin"] },
  { href: "/clinica", label: "Dados da clínica", icon: Building2, roles: ["ClinicAdmin"] },
  { href: "/acessos", label: "Equipe e acessos", icon: UserCog, roles: ["ClinicAdmin", "MedicalDirector"] },
  { href: "/auditoria", label: "Auditoria", icon: ListChecks, roles: ["ClinicAdmin", "DataProtectionOfficer"] },
  { href: "/acessos-prontuario", label: "Acessos ao prontuário", icon: FileLock2, roles: ["MedicalDirector", "DataProtectionOfficer"] },
  { href: "/ajuda", label: "Ajuda", icon: LifeBuoy },
  { href: "/privacidade", label: "Privacidade", icon: ShieldCheck, roles: ["DataProtectionOfficer"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    api.me()
      .then((current) => {
        saveSession(current);
        setUser(current);
        if (current.mustChangePassword) router.replace("/alterar-senha");
        else setReady(true);
      })
      .catch((error) => {
        // Only an expired session logs out. A network blip, or leaving the page before /auth/me answers,
        // keeps the cached session: the API still decides every access.
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          router.replace("/login");
        } else if (getSession()) {
          setReady(true);
        } else {
          router.replace("/login");
        }
      });
  }, [router]);

  // ADR-0005: the session applies to one place at a time. A full reload drops screens and realtime of the old one.
  async function switchClinic(clinicId: string) {
    if (!user || clinicId === user.clinicId) return;
    setSwitching(true);
    try {
      const session = await api.switchClinic(clinicId);
      saveSession(session);
      window.location.assign("/dashboard");
    } catch {
      setSwitching(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    clearSession();
    router.push("/login");
  }

  if (!ready || !user) {
    return <div className="min-h-screen bg-mist" />;
  }

  const isPatientOnly = user.roles.includes("Patient") && !user.roles.some((role) => role !== "Patient");
  const isDoctorOnly = user.roles.includes("Doctor") && !user.roles.some((role) => role !== "Doctor");
  const visibleNavigation = navigation.filter((item) => {
    if ((isPatientOnly || isDoctorOnly) && item.href === "/perfil") {
      return false;
    }
    return !item.roles || item.roles.some((role) => user.roles.includes(role));
  });

  return (
    <div className="min-h-screen bg-mist">
      {menuOpen && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-paper px-5 py-6 shadow-sm transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button className="text-slate-400 lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="mx-2 mt-8 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">MedSync</p>
          <p className="mt-1 text-sm text-teal-900/70">Médicos e clínicas</p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {visibleNavigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            const displayLabel = navigationLabel(href, label, user);
            return (
              <Link
                key={`${href}-${displayLabel}`}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-semibold transition ${
                  active
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                <Icon size={19} />
                {displayLabel}
                {active && <ChevronRight className="ml-auto" size={16} />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-ink"
          >
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/70 bg-paper/90 px-5 backdrop-blur sm:px-8">
          <button
            className="grid size-10 place-items-center rounded-lg bg-white text-slate-600 shadow-sm lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          {(user.clinics?.length ?? 0) > 1 ? (
            <label className="flex min-w-0 flex-col">
              <span className="text-xs text-slate-400">Local de atendimento</span>
              <select
                aria-label="Local de atendimento"
                className="mt-0.5 max-w-[220px] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-bold text-ink sm:max-w-xs"
                value={user.clinicId}
                disabled={switching}
                onChange={(event) => switchClinic(event.target.value)}
              >
                {user.clinics!.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                    {clinic.isPrivatePractice ? " (consultório)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="hidden lg:block">
              <p className="text-xs text-slate-400">{workspaceLabel(user)}</p>
              <p className="mt-0.5 text-sm font-bold text-ink">{user.clinicName}</p>
            </div>
          )}
          <Link
            href={isPatientOnly ? "/patients" : isDoctorOnly ? "/doctors" : "/perfil"}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-teal-50"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-ink group-hover:text-teal-800">{user.name}</p>
              <p className="text-xs text-slate-400 group-hover:text-teal-600">{user.roles.map((role) => ROLE_LABELS[role] ?? role).join(" / ")}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-coral-50 text-sm font-bold text-coral-600 ring-1 ring-coral-100 transition group-hover:bg-teal-600 group-hover:text-white group-hover:ring-teal-600">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
          </Link>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <RealtimeProvider>{children}</RealtimeProvider>
        </main>
      </div>
    </div>
  );
}

function navigationLabel(href: string, label: string, user: User) {
  const roles = user.roles;
  const isPatient = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isDoctor = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");

  if (isPatient && href === "/consultas") return "Minhas consultas";
  if (isPatient && href === "/patients") return "Meu cadastro";
  if (isDoctor && href === "/consultas") return "Agenda";
  if (isDoctor && href === "/patients") return "Pacientes vinculados";
  if (isDoctor && href === "/doctors") return "Meu perfil";
  if (roles.includes("MedicalDirector") && href === "/acessos") return "Equipe MedSync";
  if (user.clinicIsPrivatePractice && href === "/clinica") return "Dados do consultório";
  return label;
}

function workspaceLabel(user: User) {
  const roles: ClinicRole[] = user.roles;
  if (isPracticeOwner(user)) return "Consultório";
  const isPatient = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isDoctor = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  if (isPatient) return "Portal do paciente";
  if (isDoctor) return "Portal médico";
  if (roles.includes("ClinicAdmin")) return "Portal da clínica";
  if (roles.includes("Receptionist")) return "Recepção";
  if (roles.some((role) => ["MedicalDirector", "Support", "DataProtectionOfficer"].includes(role))) {
    return "Central MedSync";
  }
  return "Ambiente MedSync";
}
