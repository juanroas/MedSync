"use client";

import { Logo } from "@/components/logo";
import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { api, saveSession } from "@/services/api";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const loginModules = [
  { label: "Care", value: "Paciente acolhido", icon: HeartPulse },
  { label: "Medical", value: "Agenda e sala", icon: Video },
  { label: "Business", value: "Uso agregado", icon: Building2 },
  { label: "Privacy", value: "Acesso minimo", icon: ShieldCheck },
];

const demoAccounts = [
  { label: "Admin MedSync", email: "admin@medsync.dev" },
  { label: "Financeiro MedSync", email: "plataforma.financeiro@medsync.dev" },
  { label: "Empresa admin", email: "empresa.admin@medsync.dev" },
  { label: "Paciente", email: "paciente@medsync.dev" },
  { label: "Medico", email: "medico@medsync.dev" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("medico@medsync.dev");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await api.login(email, password);
      saveSession(session);
      router.push(session.user.mustChangePassword ? "/alterar-senha" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-mail ou senha invalidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f5f8f6] lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col bg-paper/90 px-6 py-7 shadow-2xl shadow-teal-950/5 sm:px-12 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <span className="mb-6 grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <LockKeyhole size={22} />
          </span>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-teal-700">
            Acesso MedSync
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-ink">Acesse sua experiencia MedSync.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Pacientes, medicos, empresas e operacao entram pelo mesmo acesso, mas cada perfil enxerga apenas o escopo permitido.
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
                onClick={() => setEmail(account.email)}
              >
                {account.label}
              </button>
            ))}
          </div>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit}>
            {error && <ErrorBanner message={error} />}
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">E-mail</span>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Senha</span>
              <span className="relative block">
                <input
                  className={`${inputClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-700"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <button className={`${buttonClass} w-full`} disabled={loading}>
              {loading ? "Entrando..." : "Entrar na plataforma"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Nova empresa parceira? O primeiro cadastro e assistido pelo suporte MedSync.
          </p>

          <div className="mt-7 rounded-lg border border-teal-100 bg-teal-50/70 p-4 text-xs leading-5 text-slate-600">
            <strong className="text-teal-900">Acesso de demonstracao:</strong>
            <br />
            selecione um perfil acima e use a senha definida em <code>SEED_DEMO_PASSWORD</code>.
          </div>
        </div>
        <p className="text-xs text-slate-400">© 2026 MedSync. Cuidado que aproxima.</p>
      </section>

      <section className="subtle-grid brand-panel hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-teal-100">
          <span className="size-2 rounded-full bg-coral-400" /> Identidade MedSync
        </span>

        <div className="max-w-xl">
          <h2 className="text-5xl font-bold leading-tight">
            Saude digital com a calma que o paciente espera e a clareza que a empresa precisa.
          </h2>
          <p className="mt-6 max-w-lg text-sm leading-6 text-white/70">
            O MedSync separa cuidado assistencial, gestao empresarial e auditoria em experiencias diferentes, sem misturar dado clinico com painel administrativo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {loginModules.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-4">
              <Icon className="text-coral-200" size={19} />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-teal-100">{label}</p>
              <p className="mt-1 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
