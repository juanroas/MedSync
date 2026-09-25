"use client";

import { Logo } from "@/components/logo";
import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { api, saveSession } from "@/services/api";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clinicName: "",
    tradeName: "",
    taxId: "",
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
      const session = await api.registerClinic({
        ...form,
        taxId: onlyDigits(form.taxId),
      });
      saveSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta da clínica.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-mist px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-label font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <ArrowLeft size={16} /> Voltar ao login
          </Link>
        </div>
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <Building2 size={22} />
          </span>
          <h1 className="mt-6 text-h1 font-bold uppercase tracking-tight text-ink">Cadastrar clínica ou consultório</h1>
          <p className="mt-2 text-caption text-slate-500">
            Esta conta será a administradora do seu consultório ou da sua clínica no MedSync. Você já entra e pode
            configurar a equipe e a agenda na hora — nossa equipe confere o CNPJ e combina o plano com você em paralelo
            para liberar os atendimentos. Se você é médico e já atende por uma clínica que usa o MedSync, não precisa criar outra conta:
            peça ao administrador da clínica para incluir você na equipe.
          </p>
          <div className="mt-8 space-y-5">
            {error && <ErrorBanner message={error} />}
            <Field
              label="Razão social"
              value={form.clinicName}
              maxLength={180}
              onChange={(clinicName) => setForm({ ...form, clinicName })}
            />
            <Field
              label="Nome fantasia"
              value={form.tradeName}
              maxLength={160}
              onChange={(tradeName) => setForm({ ...form, tradeName })}
            />
            <Field
              label="CNPJ"
              value={form.taxId}
              maxLength={18}
              onChange={(taxId) => setForm({ ...form, taxId: maskCnpj(taxId) })}
              placeholder="00.000.000/0000-00"
            />
            <div className="border-t border-slate-100 pt-5">
              <p className="text-label font-semibold text-ink">Seu acesso de administrador</p>
            </div>
            <Field
              label="Seu nome"
              value={form.name}
              maxLength={160}
              onChange={(name) => setForm({ ...form, name })}
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              maxLength={180}
              onChange={(email) => setForm({ ...form, email })}
            />
            <Field
              label="Senha"
              type="password"
              value={form.password}
              minLength={12}
              maxLength={128}
              onChange={(password) => setForm({ ...form, password })}
            />
            <p className="text-caption text-slate-400">
              Use ao menos 12 caracteres, com maiúscula, minúscula, número e símbolo.
            </p>
            <button className={`${buttonClass} w-full`} disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
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
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-label font-semibold text-slate-700">{label}</span>
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
