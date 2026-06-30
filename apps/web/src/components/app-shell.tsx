"use client";

import { Logo } from "@/components/logo";
import { clearSession, getSession } from "@/services/api";
import {
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/consultas", label: "Consultas", icon: CalendarDays },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/doctors", label: "Médicos", icon: Stethoscope },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUserName(session.user.name);
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.push("/login");
  }

  if (!ready) {
    return <div className="min-h-screen bg-mist" />;
  }

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
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-ink px-5 py-6 text-white transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Logo inverse />
          <button className="text-white/60 lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="mt-10 space-y-1.5">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                  active
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-950/30"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {label}
                {active && <ChevronRight className="ml-auto" size={16} />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link
            href="/consultas/nova"
            className="mb-5 flex items-center gap-3 rounded-2xl border border-teal-300/15 bg-teal-300/10 p-4 text-sm text-teal-100"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-teal-300/15">
              <Video size={18} />
            </span>
            <span>
              <strong className="block">Nova consulta</strong>
              <small className="text-teal-100/55">Agendar atendimento</small>
            </span>
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/70 bg-mist/90 px-5 backdrop-blur sm:px-8">
          <button
            className="grid size-10 place-items-center rounded-xl bg-white text-slate-600 shadow-sm lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <p className="text-xs text-slate-400">Sua central de cuidado</p>
            <p className="mt-0.5 text-sm font-bold text-ink">MedSync Clinic</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-ink">{userName}</p>
              <p className="text-xs text-slate-400">Profissional de saúde</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-teal-100 text-sm font-bold text-teal-700">
              {userName
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

