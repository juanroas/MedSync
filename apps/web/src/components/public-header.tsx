import { Logo } from "@/components/logo";
import Link from "next/link";

// Sign-up is intentionally reached only via /login (see .agents/rules/ui-actions-and-flow.md).
export function PublicHeader({ current }: { current: "home" | "sobre" }) {
  const secondary = current === "home" ? { href: "/sobre", label: "Sobre" } : { href: "/", label: "Início" };

  return (
    <header className="relative z-10 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href={secondary.href}
            className="inline-flex h-11 items-center rounded-lg px-3 text-label font-semibold text-slate-600 hover:bg-slate-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {secondary.label}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-lg bg-teal-700 px-5 text-label font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Entrar
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function PublicFooter({ current }: { current: "home" | "sobre" }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-caption text-slate-500 sm:flex-row sm:px-8">
        <p>© 2026 MedSync. Cuidado que aproxima.</p>
        <div className="flex gap-6">
          {current === "home" ? (
            <Link href="/sobre" className="hover:text-teal-700">Sobre</Link>
          ) : (
            <Link href="/" className="hover:text-teal-700">Início</Link>
          )}
          <Link href="/login" className="hover:text-teal-700">Entrar</Link>
        </div>
      </div>
    </footer>
  );
}
