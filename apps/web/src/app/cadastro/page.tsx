"use client";

import { Logo } from "@/components/logo";
import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { api, saveSession } from "@/services/api";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterClinicPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clinicName: "",
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await api.registerClinic(form);
      saveSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a clínica.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-mist px-6 py-8">
      <div className="mx-auto max-w-xl">
        <Logo />
        <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500">
          <ArrowLeft size={16} /> Voltar ao login
        </Link>
        <form onSubmit={submit} className="mt-6 rounded-3xl bg-white p-8 shadow-soft">
          <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <Building2 size={22} />
          </span>
          <h1 className="mt-6 text-3xl font-bold text-ink">Cadastrar clínica</h1>
          <p className="mt-2 text-sm text-slate-500">
            Esta conta será criada como administradora da clínica.
          </p>
          <div className="mt-8 space-y-5">
            {error && <ErrorBanner message={error} />}
            <Field
              label="Nome da clínica"
              value={form.clinicName}
              onChange={(clinicName) => setForm({ ...form, clinicName })}
            />
            <Field
              label="Seu nome"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
            />
            <Field
              label="Senha"
              type="password"
              value={form.password}
              minLength={12}
              onChange={(password) => setForm({ ...form, password })}
            />
            <p className="text-xs leading-5 text-slate-400">
              Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.
            </p>
            <button className={`${buttonClass} w-full`} disabled={loading}>
              {loading ? "Criando..." : "Criar clínica"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        required
      />
    </label>
  );
}
