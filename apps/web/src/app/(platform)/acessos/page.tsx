"use client";

import { EmptyState, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { ClinicRole, StaffUser } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const staffRoleOptions: Array<{ value: ClinicRole; label: string }> = [
  { value: "CompanyAdmin", label: "Empresa/parceiro admin" },
  { value: "CompanyFinance", label: "Financeiro empresa" },
  { value: "PlatformFinance", label: "Financeiro MedSync" },
  { value: "Support", label: "Suporte MedSync" },
  { value: "CompanyAuditor", label: "Auditor empresa" },
  { value: "PlatformAuditor", label: "Auditor MedSync" },
  { value: "DataProtectionOfficer", label: "DPO/Privacidade" },
  { value: "OccupationalHealthAdmin", label: "ADM Medico do Trabalho" },
  { value: "PlatformAdmin", label: "Admin plataforma" },
];

const initialForm = {
  name: "",
  email: "",
  role: "CompanyAdmin" as ClinicRole,
  temporaryPassword: "",
};

const roleLabel: Partial<Record<ClinicRole, string>> = {
  Patient: "Paciente/beneficiario",
  Doctor: "Medico independente",
  CompanyAdmin: "Empresa/parceiro admin",
  CompanyFinance: "Financeiro empresa",
  PlatformFinance: "Financeiro MedSync",
  Support: "Suporte MedSync",
  CompanyAuditor: "Auditor empresa",
  PlatformAuditor: "Auditor MedSync",
  DataProtectionOfficer: "DPO/Privacidade",
  OccupationalHealthAdmin: "ADM Medico do Trabalho",
  PlatformAdmin: "Admin plataforma",
  Receptionist: "Recepcao legado",
  Finance: "Financeiro legado",
  ClinicAdmin: "Admin legado",
  MedicalDirector: "Diretor medico legado",
  PrivacyAuditor: "Auditor privacidade legado",
};

export default function AccessPage() {
  const roles = getSession()?.user.roles ?? [];
  const canCreateAccess = roles.some((role) => role === "ClinicAdmin" || role === "PlatformAdmin" || role === "CompanyAdmin");
  const isCompanyAdminOnly =
    roles.includes("CompanyAdmin") &&
    !roles.some((role) => role === "ClinicAdmin" || role === "PlatformAdmin");
  const availableRoleOptions = isCompanyAdminOnly
    ? staffRoleOptions.filter((option) =>
        ["CompanyAdmin", "CompanyFinance", "CompanyAuditor"].includes(option.value),
      )
    : staffRoleOptions;
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getStaffUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar acessos."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.createStaffUser(form);
      setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar acesso.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Governanca de acesso"
        title="Equipe e acessos"
        description="Gerencie perfis administrativos do ambiente de teste com menor privilegio e separacao B2B."
        action={canCreateAccess ? (
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo acesso
          </button>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-900">
        Perfis administrativos, financeiros e de auditoria nao recebem acesso a prontuario,
        diagnostico, observacao clinica ou conteudo de chamada. Tentativas indevidas devem
        ser tratadas como evento de auditoria.
      </div>
      {showForm && (
        <form onSubmit={submit} className="mb-7 rounded-3xl border border-teal-100 bg-white p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Nome</span>
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">E-mail</span>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Perfil</span>
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ClinicRole })}>
                {availableRoleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Senha temporaria</span>
              <input className={inputClass} type="password" minLength={12} value={form.temporaryPassword} onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })} required />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className={buttonClass} disabled={saving}>
              {saving ? "Criando..." : "Criar acesso"}
            </button>
          </div>
        </form>
      )}
      {loading ? (
        <LoadingState label="Carregando acessos..." />
      ) : users.length === 0 ? (
        <EmptyState icon={<UserCog size={22} />} title="Nenhum acesso administrativo" description="Crie o primeiro perfil operacional." />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article key={`${user.id}-${user.role}`} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <span className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-600"><ShieldCheck size={20} /></span>
              <h2 className="mt-4 font-bold text-ink">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-teal-600">{roleLabel[user.role] ?? user.role}</p>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
