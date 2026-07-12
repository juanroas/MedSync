"use client";

import { Logo } from "@/components/logo";
import type { ClinicRole, User } from "@/lib/types";
import { api, clearSession, getSession, saveSession } from "@/services/api";
import {
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  UserRoundCog,
  Users,
  UserCog,
  Video,
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
  {
    href: "/empresas",
    label: "Empresas",
    icon: Building2,
    roles: ["Support", "PlatformAdmin"],
  },
  {
    href: "/elegibilidade",
    label: "Elegibilidade",
    icon: ClipboardCheck,
    roles: ["CompanyAdmin", "Support", "PlatformAdmin"],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    icon: ChartNoAxesColumn,
    roles: [
      "CompanyAdmin",
      "CompanyFinance",
      "PlatformAdmin",
      "PlatformFinance",
    ],
  },
  {
    href: "/consultas",
    label: "Consultas",
    icon: CalendarDays,
    roles: ["Patient", "Doctor", "MedicalDirector", "OccupationalHealthAdmin", "Support"],
  },
  {
    href: "/patients",
    label: "Pacientes",
    icon: Users,
    roles: [
      "Doctor",
      "Patient",
      "Receptionist",
      "ClinicAdmin",
      "MedicalDirector",
      "Support",
      "OccupationalHealthAdmin",
    ],
  },
  {
    href: "/doctors",
    label: "Medicos",
    icon: Stethoscope,
    roles: [
      "Doctor",
      "Receptionist",
      "ClinicAdmin",
      "MedicalDirector",
      "Support",
      "OccupationalHealthAdmin",
    ],
  },
  {
    href: "/acessos",
    label: "Equipe e acessos",
    icon: UserCog,
    roles: ["ClinicAdmin", "CompanyAdmin", "PlatformAdmin"],
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    icon: ListChecks,
    roles: [
      "ClinicAdmin",
      "PrivacyAuditor",
      "CompanyAuditor",
      "PlatformAuditor",
      "DataProtectionOfficer",
    ],
  },
  {
    href: "/privacidade",
    label: "Privacidade",
    icon: ShieldCheck,
    roles: [
      "Patient",
      "Support",
      "PrivacyAuditor",
      "PlatformAuditor",
      "DataProtectionOfficer",
      "PlatformAdmin",
    ],
  },
];

const schedulingRoles: ClinicRole[] = [
  "Receptionist",
  "ClinicAdmin",
  "MedicalDirector",
  "Support",
  "OccupationalHealthAdmin",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null);

  useEffect(() => {
    api.me()
      .then((current) => {
        saveSession(current);
        setUser(current);
        if (current.mustChangePassword) router.replace("/alterar-senha");
        else setReady(true);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  async function logout() {
    await api.logout().catch(() => undefined);
    clearSession();
    router.push("/login");
  }

  if (!ready || !user) {
    return <div className="min-h-screen bg-mist" />;
  }

  const isPlatformAdminProfile = user.roles.includes("PlatformAdmin");
  const visibleNavigation = navigation.filter((item) => {
    const platformAdminAllowed =
      item.href === "/dashboard" ||
      item.href === "/perfil" ||
      item.href === "/empresas" ||
      item.href === "/acessos" ||
      item.href === "/elegibilidade" ||
      item.href === "/privacidade" ||
      item.href === "/relatorios";
    if (isPlatformAdminProfile && !platformAdminAllowed) {
      return false;
    }
    return !item.roles || item.roles.some((role) => user.roles.includes(role));
  });
  const isPatientOnly = user.roles.includes("Patient") && !user.roles.some((role) => role !== "Patient");
  const canSchedule =
    !isPlatformAdminProfile && (isPatientOnly || schedulingRoles.some((role) => user.roles.includes(role)));

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
        className={`brand-panel fixed inset-y-0 left-0 z-40 flex w-72 flex-col px-5 py-6 text-white shadow-2xl shadow-teal-950/20 transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Logo inverse />
          <button className="text-white/60 lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="mx-2 mt-8 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-100">MedSync</p>
          <p className="mt-1 text-sm text-white/70">Cuidado digital B2B</p>
        </div>

        <nav className="mt-6 space-y-1.5">
          {visibleNavigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            const displayLabel = navigationLabel(href, label, user.roles);
            return (
              <Link
                key={`${href}-${displayLabel}`}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-teal-900 shadow-lg shadow-teal-950/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
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
          {canSchedule && (
            <Link
              href="/consultas/nova"
              className="mb-5 flex items-center gap-3 rounded-lg border border-coral-100/20 bg-coral-500/15 p-4 text-sm text-coral-50"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-coral-500/20">
                <Video size={18} />
              </span>
              <span>
                <strong className="block">{isPatientOnly ? "Solicitar consulta" : "Nova consulta"}</strong>
                <small className="text-coral-50/75">{isPatientOnly ? "Por especialidade" : "Agendar atendimento"}</small>
              </span>
            </Link>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
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
          <div className="hidden lg:block">
            <p className="text-xs text-slate-400">{workspaceLabel(user.roles)}</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{user.clinicName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-ink">{user.name}</p>
              <p className="text-xs text-slate-400">{user.roles.join(" / ")}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-coral-50 text-sm font-bold text-coral-600 ring-1 ring-coral-100">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}

function navigationLabel(href: string, label: string, roles: ClinicRole[]) {
  const isPatient = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isDoctor = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  const isCompanyFinance = roles.includes("CompanyFinance");
  const isCompanyAuditor = roles.includes("CompanyAuditor");

  if (isPatient && href === "/consultas") return "Minhas consultas";
  if (isPatient && href === "/patients") return "Meu cadastro";
  if (isDoctor && href === "/consultas") return "Agenda";
  if (isDoctor && href === "/patients") return "Pacientes vinculados";
  if (isDoctor && href === "/doctors") return "Meu perfil";
  if (isCompanyFinance && href === "/dashboard") return "Financeiro";
  if (isCompanyAuditor && href === "/dashboard") return "Visao geral";
  return label;
}

function workspaceLabel(roles: ClinicRole[]) {
  const isPatient = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isDoctor = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  if (isPatient) return "Portal do paciente";
  if (isDoctor) return "Portal medico";
  if (roles.some((role) => ["CompanyAdmin", "CompanyFinance", "CompanyAuditor"].includes(role))) {
    return "Portal da empresa";
  }
  if (roles.includes("DataProtectionOfficer")) return "Privacidade MedSync";
  if (roles.some((role) => ["PlatformAdmin", "PlatformFinance", "PlatformAuditor", "Support"].includes(role))) {
    return "Central MedSync";
  }
  return "Ambiente MedSync";
}
