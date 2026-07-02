"use client";

import { EmptyState, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { ClinicRole, StaffUser } from "@/lib/types";
import { api } from "@/services/api";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  role: "Receptionist" as "Receptionist" | "Finance" | "ClinicAdmin" | "PrivacyAuditor",
  temporaryPassword: "",
};

const roleLabel: Partial<Record<ClinicRole, string>> = {
  Receptionist: "Recepção",
  Finance: "Financeiro",
  ClinicAdmin: "Administrador da clínica",
  PrivacyAuditor: "Auditor de privacidade",
};

export default function AccessPage() {
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
        eyebrow="Segurança"
        title="Equipe e acessos"
        description="Crie contas administrativas com o menor privilégio necessário. A senha informada é temporária e deverá ser alterada no primeiro acesso."
        action={
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo acesso
          </button>
        }
      />
      {error && <ErrorBanner message={error} />}
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
              <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}>
                <option value="Receptionist">Recepção</option>
                <option value="Finance">Financeiro</option>
                <option value="PrivacyAuditor">Auditor de privacidade</option>
                <option value="ClinicAdmin">Administrador da clínica</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-bold text-slate-600">Senha temporária</span>
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
        <EmptyState icon={<UserCog size={22} />} title="Nenhum acesso administrativo" description="Crie o primeiro perfil da equipe." />
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
