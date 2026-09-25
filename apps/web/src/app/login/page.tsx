"use client";

import { Logo } from "@/components/logo";
import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { api, saveSession } from "@/services/api";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const demoAccounts = [
  { label: "Paciente", email: "paciente@medsync.dev" },
  { label: "Médico", email: "medico@medsync.dev" },
  { label: "ADM da clínica", email: "clinica.admin@medsync.dev" },
  { label: "Médico ADM MedSync", email: "admin@medsync.dev" },
  { label: "Suporte", email: "suporte@medsync.dev" },
  { label: "DPO", email: "dpo@medsync.dev" },
];

// Atalho de demonstracao (seleciona o e-mail e mostra os perfis seed). So deve aparecer em
// ambiente de homologacao/demo, nunca em producao real com dados de paciente.
const demoAccountsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccountsEnabled ? "medico@medsync.dev" : "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfaPendingToken, setMfaPendingToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.login(email, password);
      if ("mfaRequired" in result) {
        setMfaPendingToken(result.pendingToken);
        return;
      }
      saveSession(result);
      router.push(result.user.mustChangePassword ? "/alterar-senha" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await api.loginMfa(mfaPendingToken, mfaCode);
      saveSession(session);
      router.push(session.user.mustChangePassword ? "/alterar-senha" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  if (mfaPendingToken) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <Logo />
          <span className="mt-6 grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <ShieldCheck size={22} />
          </span>
          <h1 className="mt-6 text-h2 font-bold text-ink">Verificação em duas etapas</h1>
          <p className="mt-2 text-caption text-slate-500">
            Digite o código de 6 dígitos do seu aplicativo autenticador.
          </p>
          <form className="mt-6 space-y-5" onSubmit={handleMfaSubmit}>
            {error && <ErrorBanner message={error} />}
            <label className="block">
              <span className="mb-2 block text-label font-semibold text-slate-700">Código</span>
              <input
                className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>
            <button className={`${buttonClass} w-full`} disabled={loading || mfaCode.length !== 6}>
              {loading ? "Verificando..." : "Confirmar"} <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="w-full text-center text-caption font-semibold text-slate-500 hover:text-teal-700"
              onClick={() => {
                setMfaPendingToken("");
                setMfaCode("");
                setError("");
              }}
            >
              Voltar ao login
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Acesso MedSync</p>
          <h1 className="mt-2 text-h1 font-bold uppercase tracking-tight text-ink">Acesse sua conta</h1>
          <p className="mt-2 text-caption text-slate-500">
            Pacientes, médicos e clínicas entram pelo mesmo acesso, e cada perfil vê apenas o que lhe cabe.
          </p>

          <button
            type="button"
            disabled
            title="Login com Google em breve"
            className="mt-7 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400"
          >
            <GoogleGlyph /> Continuar com Google
            <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Em breve
            </span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
          </div>

          {demoAccountsEnabled && (
            <div className="mb-6 grid gap-2 sm:grid-cols-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-caption font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
                  onClick={() => setEmail(account.email)}
                >
                  {account.label}
                </button>
              ))}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && <ErrorBanner message={error} />}
            <label className="block">
              <span className="mb-2 block text-label font-semibold text-slate-700">E-mail</span>
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
              <span className="mb-2 block text-label font-semibold text-slate-700">Senha</span>
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
              <span className="mt-2 block text-caption font-medium text-slate-400">
                Esqueceu a senha? Peça uma nova ao administrador da sua clínica ou ao suporte MedSync.
              </span>
            </label>
            <button className={`${buttonClass} w-full`} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-caption text-slate-500">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-teal-700 hover:underline">
              Criar conta
            </Link>
            . Você já entra e configura tudo enquanto conferimos o cadastro.
          </p>

          {demoAccountsEnabled && (
            <div className="mt-7 rounded-lg border border-teal-100 bg-teal-50/70 p-4 text-caption text-slate-600">
              <strong className="text-teal-900">Acesso de demonstração:</strong>
              <br />
              selecione um perfil acima e use a senha de demonstração fornecida pela equipe MedSync.
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">© 2026 MedSync. Cuidado que aproxima.</p>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16.1 3 9.2 7.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.1 26.7 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.1 40.6 16 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.4-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
