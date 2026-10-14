"use client";

import { AddressFields, emptyAddress, isAddressComplete } from "@/components/address-fields";
import { Logo } from "@/components/logo";
import { ErrorBanner, buttonClass, inputClass } from "@/components/ui";
import { BRAZILIAN_STATES } from "@/lib/types";
import type { Address } from "@/lib/types";
import { api, saveSession } from "@/services/api";
import { ArrowLeft, Building2, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

type Kind = "clinic" | "practice";

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-[100dvh] bg-mist" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [kind, setKind] = useState<Kind>(searchParams.get("tipo") === "consultorio" ? "practice" : "clinic");
  const [form, setForm] = useState({
    clinicName: "",
    tradeName: "",
    taxId: "",
    name: "",
    email: "",
    password: "",
    phone: "",
    technicalDirectorName: "",
    technicalDirectorCrm: "",
    technicalDirectorCrmUf: "",
  });
  // Consultório: the doctor's own registration, printed on prescriptions and used as technical director.
  const [doctor, setDoctor] = useState({ crm: "", crmUf: "", specialty: "", rqe: "" });
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const practice = kind === "practice";
  const place = practice ? "do consultório" : "da clínica";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!isAddressComplete(address)) {
      setError(
        `Preencha o endereço completo ${practice ? "do consultório" : "da clínica"} (CEP, logradouro, número, bairro, cidade e UF).`,
      );
      return;
    }
    if (practice && !doctor.crmUf) {
      setError("Escolha a UF do seu CRM.");
      return;
    }
    setLoading(true);
    try {
      const session = practice
        ? await api.registerPractice({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone || undefined,
            crm: doctor.crm,
            crmUf: doctor.crmUf,
            specialty: doctor.specialty,
            rqe: doctor.rqe || undefined,
            legalName: form.clinicName,
            tradeName: form.tradeName || undefined,
            taxId: onlyDigits(form.taxId),
            address,
          })
        : await api.registerClinic({
            ...form,
            taxId: onlyDigits(form.taxId),
            address,
            phone: form.phone || undefined,
            technicalDirectorName: form.technicalDirectorName || undefined,
            technicalDirectorCrm: form.technicalDirectorCrm || undefined,
            technicalDirectorCrmUf: form.technicalDirectorCrmUf || undefined,
          });
      saveSession(session);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : `Não foi possível criar a conta ${place}.`);
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
            {practice ? <Stethoscope size={22} /> : <Building2 size={22} />}
          </span>
          <h1 className="mt-6 text-h1 font-bold uppercase tracking-tight text-ink">Cadastrar clínica ou consultório</h1>
          <fieldset className="mt-6">
            <legend className="mb-2 block text-label font-semibold text-slate-700">Quem está cadastrando</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <KindOption
                checked={!practice}
                onSelect={() => setKind("clinic")}
                title="Clínica"
                description="Administrador cadastra os médicos e a recepção."
              />
              <KindOption
                checked={practice}
                onSelect={() => setKind("practice")}
                title="Consultório (sou médico)"
                description="Você atende e administra o próprio consultório."
              />
            </div>
          </fieldset>
          <p className="mt-5 text-caption text-slate-500">
            {practice
              ? "Você será o médico e o administrador do consultório: cadastra pacientes, agenda e atende. Se tiver recepcionista, inclua depois em Equipe e acessos. Nossa equipe confere o CNPJ e combina o plano com você em paralelo para liberar os atendimentos."
              : "Esta conta será a administradora da sua clínica no MedSync. Você já entra e pode configurar a equipe e a agenda na hora — nossa equipe confere o CNPJ e combina o plano com você em paralelo para liberar os atendimentos. Se você é médico e já atende por uma clínica que usa o MedSync, não precisa criar outra conta: peça ao administrador da clínica para incluir você na equipe."}
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
            <label className="block">
              <span className="mb-2 block text-label font-semibold text-slate-700">
                {practice ? "Telefone do consultório (opcional)" : "Telefone da clínica (opcional)"}
              </span>
              <input className={inputClass} type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <div className="border-t border-slate-100 pt-5">
              <p className="text-label font-semibold text-ink">Endereço de atendimento</p>
              <p className="mt-1 text-caption text-slate-400">Aparece para o paciente que escolhe consulta presencial e sai nas receitas.</p>
            </div>
            <AddressFields value={address} onChange={setAddress} />
            {practice ? (
              <>
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-label font-semibold text-ink">Seus dados de médico</p>
                  <p className="mt-1 text-caption text-slate-400">
                    Saem nas receitas e fazem de você o responsável técnico do consultório.
                  </p>
                </div>
                <Field label="Seu nome" value={form.name} maxLength={160} onChange={(name) => setForm({ ...form, name })} />
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">CRM</span>
                    <input className={inputClass} inputMode="numeric" value={doctor.crm} maxLength={10} required onChange={(event) => setDoctor({ ...doctor, crm: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">UF do CRM</span>
                    <select className={inputClass} value={doctor.crmUf} required onChange={(event) => setDoctor({ ...doctor, crmUf: event.target.value })}>
                      <option value="">—</option>
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                  <Field label="Especialidade" value={doctor.specialty} maxLength={80} onChange={(specialty) => setDoctor({ ...doctor, specialty })} />
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">RQE (opcional)</span>
                    <input className={inputClass} value={doctor.rqe} maxLength={20} onChange={(event) => setDoctor({ ...doctor, rqe: event.target.value })} />
                  </label>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-label font-semibold text-ink">Seu acesso</p>
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-label font-semibold text-ink">Responsável técnico (opcional agora)</p>
                  <p className="mt-1 text-caption text-slate-400">Médico responsável pela clínica no CRM. Pode ser informado depois em Dados da clínica.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">Nome do médico</span>
                    <input className={inputClass} value={form.technicalDirectorName} maxLength={160} onChange={(event) => setForm({ ...form, technicalDirectorName: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">CRM</span>
                    <input className={inputClass} inputMode="numeric" value={form.technicalDirectorCrm} maxLength={10} onChange={(event) => setForm({ ...form, technicalDirectorCrm: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-label font-semibold text-slate-700">UF do CRM</span>
                    <select className={inputClass} value={form.technicalDirectorCrmUf} onChange={(event) => setForm({ ...form, technicalDirectorCrmUf: event.target.value })}>
                      <option value="">—</option>
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-label font-semibold text-ink">Seu acesso de administrador</p>
                </div>
                <Field label="Seu nome" value={form.name} maxLength={160} onChange={(name) => setForm({ ...form, name })} />
              </>
            )}
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

function KindOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
        checked ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-slate-200 hover:border-teal-200"
      }`}
    >
      <input type="radio" name="kind" className="mt-1 accent-teal-600" checked={checked} onChange={onSelect} />
      <span>
        <span className="block text-label font-bold text-ink">{title}</span>
        <span className="mt-1 block text-caption text-slate-500">{description}</span>
      </span>
    </label>
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
