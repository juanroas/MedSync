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
    planName: "Plano empresarial inicial",
    monthlyFee: "499.90",
    monthlyConsultationLimit: "100",
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
        monthlyFee: Number(form.monthlyFee),
        monthlyConsultationLimit: Number(form.monthlyConsultationLimit),
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
        <Logo />
        <Link
          href="/login"
          className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-label font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          <ArrowLeft size={16} /> Voltar ao login
        </Link>
        <form onSubmit={submit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <Building2 size={22} />
          </span>
          <h1 className="mt-6 text-h1 font-bold text-ink">Cadastrar clínica</h1>
          <p className="mt-2 text-caption text-slate-500">
            Esta conta será criada como administradora de uma clínica no MedSync. Você já entra e pode configurar
            equipe, plano e agenda na hora — nossa equipe valida o CNPJ em paralelo para liberar atendimentos
            reais. Se você representa uma empresa parceira que já tem clínica contratante, peça ao suporte
            MedSync para incluir seu CNPJ como beneficiário — não é necessário criar uma nova clínica.
          </p>
          <div className="mt-8 space-y-5">
            {error && <ErrorBanner message={error} />}
            <Field
              label="Razao social"
              value={form.clinicName}
              maxLength={180}
              onChange={(clinicName) => setForm({ ...form, clinicName })}
            />
            <Field
              label="Nome fantasia"
              value={form.tradeName}
              maxLength={180}
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
              <p className="text-label font-semibold text-ink">Plano interno da clinica no MedSync</p>
              <p className="mt-1 text-caption text-slate-400">
                Configura o limite e o valor de uso da clinica dentro da plataforma. Pode ser ajustado depois
                com a equipe MedSync — nao e uma cobrança que acontece automaticamente no cadastro.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Plano contratado"
                value={form.planName}
                maxLength={120}
                onChange={(planName) => setForm({ ...form, planName })}
              />
              <Field
                label="Limite mensal de consultas"
                type="number"
                min={1}
                max={100000}
                value={form.monthlyConsultationLimit}
                onChange={(monthlyConsultationLimit) =>
                  setForm({ ...form, monthlyConsultationLimit: limitNumber(monthlyConsultationLimit, 6) })
                }
              />
            </div>
            <Field
              label="Valor mensal"
              type="number"
              min={1}
              max={1000000}
              step="0.01"
              value={form.monthlyFee}
              onChange={(monthlyFee) => setForm({ ...form, monthlyFee: limitNumber(monthlyFee, 10) })}
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
  maxLength,
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: string;
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
        min={min}
        max={max}
        step={step}
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

function limitNumber(value: string, maxLength: number) {
  return value.replace(/[^\d.]/g, "").slice(0, maxLength);
}
