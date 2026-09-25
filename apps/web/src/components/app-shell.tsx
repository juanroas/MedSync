"use client";

import { Logo } from "@/components/logo";
import { ROLE_LABELS, type ClinicRole, type User } from "@/lib/types";
import { api, clearSession, getSession, saveSession } from "@/services/api";
import {
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  ClipboardCheck,
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
  {
    href: "/clinicas",
    label: "Clínicas",
    icon: Building2,
    roles: ["Support", "PlatformAdmin"],
  },
  {
    href: "/elegibilidade",
    label: "Elegibilidade",
    icon: ClipboardCheck,
    roles: ["CompanyAdmin", "Support"],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    icon: ChartNoAxesColumn,
    roles: [
      "CompanyAdmin",
      "CompanyFinance",
      "CompanyAuditor",
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
    href: "/ajuda",
    label: "Ajuda",
    icon: LifeBuoy,
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
  const isPatientOnly = user.roles.includes("Patient") && !user.roles.some((role) => role !== "Patient");
  const isDoctorOnly = user.roles.includes("Doctor") && !user.roles.some((role) => role !== "Doctor");
  const visibleNavigation = navigation.filter((item) => {
    if ((isPatientOnly || isDoctorOnly) && item.href === "/perfil") {
      return false;
    }
    const platformAdminAllowed =
      item.href === "/dashboard" ||
      item.href === "/perfil" ||
      item.href === "/clinicas" ||
      item.href === "/acessos" ||
      item.href === "/elegibilidade" ||
      item.href === "/privacidade" ||
      item.href === "/ajuda" ||
      item.href === "/relatorios";
    if (isPlatformAdminProfile && !platformAdminAllowed) {
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
          <p className="mt-1 text-sm text-teal-900/70">Cuidado digital B2B</p>
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
          <div className="hidden lg:block">
            <p className="text-xs text-slate-400">{workspaceLabel(user.roles)}</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{user.clinicName}</p>
          </div>
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
