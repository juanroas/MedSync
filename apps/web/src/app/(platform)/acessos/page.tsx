"use client";

import { Badge, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, SearchField, buttonClass, inputClass } from "@/components/ui";
import type { ClinicRole, StaffUser } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { KeyRound, Plus, Power, ShieldCheck, UserCog } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
  { value: "Receptionist", label: "Recepcao (cadastra pacientes/beneficiarios)" },
  { value: "MedicalDirector", label: "Diretor medico (cadastra medicos)" },
];

const platformStaffRoleValues: ClinicRole[] = [
  "PlatformFinance",
  "Support",
  "PlatformAuditor",
  "DataProtectionOfficer",
  "OccupationalHealthAdmin",
  "PlatformAdmin",
];

const companyStaffRoleValues: ClinicRole[] = [
  "CompanyAdmin",
  "CompanyFinance",
  "CompanyAuditor",
  "Receptionist",
  "MedicalDirector",
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
  Receptionist: "Recepcao",
  Finance: "Financeiro legado",
  ClinicAdmin: "Admin legado",
  MedicalDirector: "Diretor medico",
  PrivacyAuditor: "Auditor privacidade legado",
};

export default function AccessPage() {
  const [roles, setRoles] = useState<ClinicRole[]>(() => getSession()?.user.roles ?? []);
  const canCreateAccess = roles.some((role) => role === "ClinicAdmin" || role === "PlatformAdmin" || role === "CompanyAdmin");
  const isPlatformAdmin = roles.includes("PlatformAdmin");
  const isCompanyAdmin =
    roles.includes("CompanyAdmin") &&
    !roles.includes("PlatformAdmin");
  const allowedRoleValues = isPlatformAdmin
    ? platformStaffRoleValues
    : isCompanyAdmin
      ? companyStaffRoleValues
      : roles.length > 0
        ? staffRoleOptions.map((option) => option.value)
        : [];
  const availableRoleOptions = isPlatformAdmin
    ? staffRoleOptions.filter((option) => platformStaffRoleValues.includes(option.value))
    : isCompanyAdmin
    ? staffRoleOptions.filter((option) => companyStaffRoleValues.includes(option.value))
    : roles.length > 0
      ? staffRoleOptions
      : [];
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [resettingId, setResettingId] = useState("");
  const [resetResult, setResetResult] = useState<{ name: string; temporaryPassword: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleUsers = useMemo(
    () =>
      users
        .filter((user) => allowedRoleValues.includes(user.role))
        .filter((user) => {
          const matchesSearch = `${user.name} ${user.email} ${roleLabel[user.role] ?? user.role}`
            .toLowerCase()
            .includes(query.toLowerCase());
          const matchesRole = roleFilter === "all" || user.role === roleFilter;
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && user.isActive) ||
            (statusFilter === "inactive" && !user.isActive);
          return matchesSearch && matchesRole && matchesStatus;
        }),
    [allowedRoleValues, query, roleFilter, statusFilter, users],
  );

  useEffect(() => {
    setRoles(getSession()?.user.roles ?? []);
  }, []);

  useEffect(() => {
    api.getStaffUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar acessos."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!availableRoleOptions.some((option) => option.value === form.role)) {
      setForm((current) => ({ ...current, role: availableRoleOptions[0]?.value ?? "CompanyAdmin" }));
    }
  }, [availableRoleOptions, form.role]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.createStaffUser(form);
      setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setShowForm(false);
      setSuccess("Acesso criado. O usuario deve trocar a senha no primeiro acesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar acesso.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccess(user: StaffUser) {
    if (user.isActive && !window.confirm(`Desabilitar o acesso de ${user.name}? A pessoa nao vai conseguir entrar ate ser reabilitada.`))
      return;
    setSavingId(user.id);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateStaffUserActivation(user.id, {
        isActive: !user.isActive,
        reason: !user.isActive ? "Acesso reabilitado pela governanca." : "Acesso desabilitado pela governanca.",
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(updated.isActive ? "Acesso habilitado." : "Acesso desabilitado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar acesso.");
    } finally {
      setSavingId("");
    }
  }

  async function resetPassword(user: StaffUser) {
    if (!window.confirm(`Gerar uma nova senha temporaria para ${user.name}? A senha atual deixara de funcionar.`)) return;
    setResettingId(user.id);
    setError("");
    setSuccess("");
    try {
      const result = await api.resetStaffUserPassword(user.id);
      setResetResult({ name: user.name, temporaryPassword: result.temporaryPassword });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setResettingId("");
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
      {success && (
        <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      )}
      {resetResult && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Nova senha temporaria de {resetResult.name}:</p>
          <p className="mt-1 font-mono text-base tracking-wide">{resetResult.temporaryPassword}</p>
          <p className="mt-2 text-xs leading-5">
            Repasse esta senha com seguranca ao usuario (nunca por canal publico). Ela sera exigida trocar
            no proximo login e nao sera exibida novamente.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex h-11 items-center px-1 text-xs font-bold text-amber-800 underline"
            onClick={() => setResetResult(null)}
          >
            Ocultar
          </button>
        </div>
      )}
      <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-900">
        Perfis administrativos, financeiros e de auditoria nao recebem acesso a prontuario,
        diagnostico, observacao clinica ou conteudo de chamada. Tentativas indevidas devem
        ser tratadas como evento de auditoria.
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_180px]">
        <SearchField
          label="Buscar por nome, e-mail ou perfil"
          placeholder="Buscar por nome, e-mail ou perfil"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={inputClass}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Filtrar por perfil"
        >
          <option value="all">Todos os perfis</option>
          {availableRoleOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
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
              <select
                aria-label="Perfil"
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as ClinicRole })}
              >
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
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          icon={<UserCog size={22} />}
          title={users.length === 0 ? "Nenhum acesso administrativo" : "Nenhum acesso encontrado"}
          description={users.length === 0 ? "Crie o primeiro perfil operacional." : "Ajuste a busca ou os filtros para visualizar outros acessos."}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1.2fr_1.2fr_1fr_.7fr_1.1fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                <span>Nome</span>
                <span>E-mail</span>
                <span>Perfil</span>
                <span>Status</span>
                <span className="text-right">Acao</span>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <article
                    key={`${user.id}-${user.role}`}
                    className="grid grid-cols-[1.2fr_1.2fr_1fr_.7fr_1.1fr] items-center gap-4 px-6 py-5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600">
                        <ShieldCheck size={18} />
                      </span>
                      <span className="truncate font-bold text-ink" title={user.name}>{user.name}</span>
                    </div>
                    <span className="truncate text-slate-500" title={user.email}>{user.email}</span>
                    <span className="truncate text-xs font-bold uppercase tracking-wide text-teal-700" title={roleLabel[user.role] ?? user.role}>
                      {roleLabel[user.role] ?? user.role}
                    </span>
                    <Badge tone={user.isActive ? "success" : "warning"}>{user.isActive ? "Ativo" : "Inativo"}</Badge>
                    <div className="flex flex-wrap justify-end gap-2 text-right">
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => resetPassword(user)}
                        disabled={resettingId === user.id}
                      >
                        <KeyRound size={15} />
                        {resettingId === user.id ? "Gerando..." : "Redefinir senha"}
                      </button>
                      <button
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                          user.isActive
                            ? "border border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 focus:ring-amber-100"
                            : "bg-teal-700 text-white hover:bg-teal-800 focus:ring-teal-100"
                        }`}
                        onClick={() => toggleAccess(user)}
                        disabled={savingId === user.id}
                      >
                        <Power size={15} />
                        {savingId === user.id
                          ? "Atualizando..."
                          : user.isActive ? "Desabilitar" : "Habilitar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
