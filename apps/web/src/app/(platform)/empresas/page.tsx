"use client";

import { ErrorBanner, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { api } from "@/services/api";
import { Building2, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

const initialForm = {
  legalName: "",
  tradeName: "",
  taxId: "",
  planName: "Plano empresarial inicial",
  monthlyFee: "499.90",
  monthlyConsultationLimit: "100",
  adminName: "",
  adminEmail: "",
  temporaryPassword: "",
};

export default function CompaniesPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const created = await api.createCompanyOnboarding({
        ...form,
        taxId: onlyDigits(form.taxId),
        monthlyFee: Number(form.monthlyFee),
        monthlyConsultationLimit: Number(form.monthlyConsultationLimit),
      });
      setSuccess(created.onboardingEmailPreview);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar empresa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Onboarding MedSync"
        title="Empresas"
        description="Cadastre a empresa contratante e a primeira conta ADM. O CNPJ nasce aguardando habilitacao pelo ADM MedSync."
      />

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-800">
          <span className="mb-2 flex items-center gap-2">
            <MailCheck size={18} /> E-mail operacional a enviar
          </span>
          {success}
        </div>
      )}

      <section className="mb-6 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-teal-700" size={18} />
          <p>
            Suporte cadastra empresa e conta ADM inicial. A habilitacao do CNPJ fica restrita ao ADM MedSync na aba Elegibilidade.
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <Building2 size={20} />
          </span>
          <div>
            <h2 className="font-bold text-ink">Cadastro assistido</h2>
            <p className="text-sm text-slate-500">Dados administrativos e contratuais iniciais.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Razao social"
            value={form.legalName}
            maxLength={180}
            onChange={(legalName) => setForm({ ...form, legalName })}
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
            placeholder="00.000.000/0000-00"
            onChange={(taxId) => setForm({ ...form, taxId: maskCnpj(taxId) })}
          />
          <Field
            label="Plano contratado"
            value={form.planName}
            maxLength={120}
            onChange={(planName) => setForm({ ...form, planName })}
          />
          <Field
            label="Valor mensal"
            type="number"
            min={1}
            max={1000000}
            step="0.01"
            value={form.monthlyFee}
            onChange={(monthlyFee) => setForm({ ...form, monthlyFee: limitNumber(monthlyFee, 10) })}
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
          <Field
            label="Nome do ADM da empresa"
            value={form.adminName}
            maxLength={160}
            onChange={(adminName) => setForm({ ...form, adminName })}
          />
          <Field
            label="E-mail do ADM"
            type="email"
            value={form.adminEmail}
            maxLength={180}
            onChange={(adminEmail) => setForm({ ...form, adminEmail })}
          />
          <Field
            label="Senha temporaria"
            type="password"
            value={form.temporaryPassword}
            minLength={12}
            maxLength={128}
            onChange={(temporaryPassword) => setForm({ ...form, temporaryPassword })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button className={buttonClass} disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar empresa"}
          </button>
        </div>
      </form>
    </>
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
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
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
