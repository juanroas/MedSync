"use client";

import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { Logo } from "@/components/logo";
import { api, saveSession } from "@/services/api";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[.9fr_1.1fr]">
      <section className="flex flex-col px-6 py-7 sm:px-12 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <LockKeyhole size={22} />
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-ink">Bem-vindo de volta.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Entre para acessar sua agenda e iniciar seus atendimentos.
          </p>

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600"
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

          <div className="mt-7 rounded-2xl bg-mist p-4 text-xs leading-5 text-slate-500">
            <strong className="text-slate-700">Acesso de demonstração:</strong>
            <br />
            medico@medsync.dev · senha definida em <code>SEED_DEMO_PASSWORD</code>
          </div>
        </div>
        <p className="text-xs text-slate-400">© 2026 MedSync. Cuidado que aproxima.</p>
      </section>

      <section className="subtle-grid relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 size-96 rounded-full bg-teal-500/20 blur-3xl" />
        <span className="relative inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-teal-100">
          <span className="size-2 rounded-full bg-teal-300" /> Ambiente seguro
        </span>
        <div className="relative max-w-xl">
          <blockquote className="text-4xl font-semibold leading-tight tracking-tight">
            “Mais tempo para cuidar. Menos tempo lidando com ferramentas complicadas.”
          </blockquote>
          <p className="mt-6 text-sm text-white/50">Uma experiência desenhada para a rotina clínica.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          {["Vídeo HD", "Agenda integrada", "Acesso simples"].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
