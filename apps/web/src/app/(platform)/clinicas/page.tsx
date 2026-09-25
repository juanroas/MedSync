"use client";

import { useConfirm } from "@/components/dialog";
import {
  AlertBanner,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeader,
  SearchField,
  buttonClass,
  inputClass,
  secondaryButtonClass,
} from "@/components/ui";
import type { ClinicActivation, ClinicActivationStatus } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { Building2, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const statusLabel: Record<ClinicActivationStatus, string> = {
  Pending: "Em análise",
  Active: "Ativa",
  Suspended: "Suspensa",
};

const statusTone: Record<ClinicActivationStatus, "warning" | "success" | "error"> = {
  Pending: "warning",
  Active: "success",
  Suspended: "error",
};

const emptyOnboarding = {
  legalName: "",
  tradeName: "",
  taxId: "",
  adminName: "",
  adminEmail: "",
  temporaryPassword: "",
};

export default function ClinicsPage() {
  const roles = getSession()?.user.roles ?? [];
  const canActivate = roles.includes("MedicalDirector");
  const canOnboard = roles.some((role) => ["Support", "MedicalDirector"].includes(role));
  const [confirm, confirmDialog] = useConfirm();

  const [clinics, setClinics] = useState<ClinicActivation[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { planName: string; monthlyFee: string }>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClinicActivationStatus>("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyOnboarding);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.getClinicActivations()
      .then((items) => {
        setClinics(items);
        setDrafts(Object.fromEntries(items.map((item) => [item.clinicId, toDraft(item)])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar clínicas."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      clinics.filter((clinic) => {
        const matchesSearch = `${clinic.clinicName} ${clinic.legalName ?? ""} ${clinic.taxIdMasked ?? ""} ${clinic.planName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesSearch && (statusFilter === "all" || clinic.activationStatus === statusFilter);
      }),
    [clinics, query, statusFilter],
  );

  const pendingCount = clinics.filter((clinic) => clinic.activationStatus === "Pending").length;

  function replace(updated: ClinicActivation) {
    setClinics((items) => items.map((item) => (item.clinicId === updated.clinicId ? updated : item)));
    setDrafts((current) => ({ ...current, [updated.clinicId]: toDraft(updated) }));
  }

  async function changeStatus(clinic: ClinicActivation, status: ClinicActivationStatus) {
    if (status === "Suspended" && !(await confirm({ title: `Suspender ${clinic.clinicName}?`, description: "Os pacientes deixam de conseguir marcar consultas.", confirmLabel: "Suspender", danger: true })))
      return;
    const draft = drafts[clinic.clinicId] ?? toDraft(clinic);
    const monthlyFee = draft.monthlyFee ? Number(draft.monthlyFee.replace(",", ".")) : undefined;
    if (monthlyFee !== undefined && (Number.isNaN(monthlyFee) || monthlyFee <= 0)) {
      setError("Informe um valor mensal válido.");
      return;
    }
    setSavingId(clinic.clinicId);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateClinicActivation(clinic.clinicId, {
        status,
        planName: draft.planName.trim() || undefined,
        monthlyFee,
      });
      replace(updated);
      setSuccess(
        status === clinic.activationStatus
          ? "Plano atualizado."
          : status === "Active"
            ? `${updated.clinicName} ativada. Os pacientes já podem marcar consultas.`
            : `${updated.clinicName} suspensa.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar a clínica.");
    } finally {
      setSavingId("");
    }
  }

  async function createClinic(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await api.createClinicOnboarding({
        ...form,
        tradeName: form.tradeName.trim() || undefined,
        taxId: form.taxId.replace(/\D/g, ""),
      });
      setSuccess(created.onboardingEmailPreview);
      setForm(emptyOnboarding);
      setShowForm(false);
      const items = await api.getClinicActivations();
      setClinics(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.clinicId, toDraft(item)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar a clínica.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação MedSync"
        title="Clínicas"
        description={
          canActivate
            ? `Confira o cadastro e ative as clínicas. ${pendingCount} aguardando análise.`
            : "Cadastre clínicas fechadas pelo comercial. A ativação é feita pelo Médico ADM MedSync."
        }
        action={
          canOnboard && !showForm ? (
            <button type="button" className={buttonClass} onClick={() => setShowForm(true)}>
              <Plus size={17} /> Cadastrar clínica
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} />}
      {confirmDialog}
      {success && <AlertBanner tone="success" message={success} />}

      {showForm && (
        <Card className="mb-6 p-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                <Building2 size={20} />
              </span>
              <div>
                <h2 className="font-bold text-ink">Cadastro assistido</h2>
                <p className="text-sm text-slate-500">
                  Para clínicas fechadas pelo comercial. A própria clínica também pode se cadastrar em &quot;Criar conta&quot;.
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar cadastro"
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-ink"
              onClick={() => setShowForm(false)}
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={createClinic} className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Razão social" value={form.legalName} maxLength={180} onChange={(legalName) => setForm({ ...form, legalName })} />
            <Field label="Nome fantasia" value={form.tradeName} maxLength={160} required={false} onChange={(tradeName) => setForm({ ...form, tradeName })} />
            <Field label="CNPJ" value={form.taxId} maxLength={18} placeholder="00.000.000/0000-00" onChange={(taxId) => setForm({ ...form, taxId: maskCnpj(taxId) })} />
            <Field label="Nome do administrador" value={form.adminName} maxLength={160} onChange={(adminName) => setForm({ ...form, adminName })} />
            <Field label="E-mail do administrador" type="email" value={form.adminEmail} maxLength={180} onChange={(adminEmail) => setForm({ ...form, adminEmail })} />
            <Field label="Senha temporária" type="password" value={form.temporaryPassword} minLength={12} maxLength={128} onChange={(temporaryPassword) => setForm({ ...form, temporaryPassword })} />
            <div className="flex justify-end md:col-span-2">
              <button className={buttonClass} disabled={creating}>
                {creating ? "Cadastrando..." : "Cadastrar clínica"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
        <SearchField
          label="Buscar por nome, razão social, CNPJ ou plano"
          placeholder="Buscar por nome, razão social, CNPJ ou plano"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={inputClass}
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | ClinicActivationStatus)}
        >
          <option value="all">Todos os status</option>
          <option value="Pending">Em análise</option>
          <option value="Active">Ativas</option>
          <option value="Suspended">Suspensas</option>
        </select>
      </div>

      {loading ? (
        <LoadingState label="Carregando clínicas..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title={clinics.length === 0 ? "Nenhuma clínica cadastrada" : "Nenhum resultado"}
          description={clinics.length === 0 ? "As clínicas aparecem aqui assim que se cadastram." : "Ajuste a busca ou o filtro de status."}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((clinic) => {
              const draft = drafts[clinic.clinicId] ?? toDraft(clinic);
              const saving = savingId === clinic.clinicId;
              return (
                <article key={clinic.clinicId} className="grid gap-4 px-6 py-5 text-sm lg:grid-cols-[1.3fr_1.4fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-ink" title={clinic.clinicName}>{clinic.clinicName}</p>
                      <Badge tone={statusTone[clinic.activationStatus]}>{statusLabel[clinic.activationStatus]}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500" title={clinic.legalName}>
                      {clinic.legalName ?? "Razão social não informada"} · CNPJ {clinic.taxIdMasked ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Cadastrada em {formatDate(clinic.createdAt)}
                      {clinic.activatedAt ? ` · ativada em ${formatDate(clinic.activatedAt)}` : ""}
                    </p>
                  </div>

                  {canActivate ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                      <input
                        className={`${inputClass} h-9 text-sm`}
                        aria-label={`Plano de ${clinic.clinicName}`}
                        placeholder="Plano"
                        maxLength={120}
                        value={draft.planName}
                        onChange={(event) => setDrafts((current) => ({ ...current, [clinic.clinicId]: { ...draft, planName: event.target.value } }))}
                      />
                      <input
                        className={`${inputClass} h-9 text-sm`}
                        aria-label={`Valor mensal de ${clinic.clinicName}`}
                        placeholder="Valor mensal (R$)"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={draft.monthlyFee}
                        onChange={(event) => setDrafts((current) => ({ ...current, [clinic.clinicId]: { ...draft, monthlyFee: event.target.value } }))}
                      />
                    </div>
                  ) : (
                    <p className="text-slate-600">
                      {clinic.planName ?? "Plano a definir na ativação"}
                      {clinic.monthlyFee ? ` · ${formatCurrency(clinic.monthlyFee)}` : ""}
                    </p>
                  )}

                  {canActivate && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {clinic.activationStatus === "Active" ? (
                        <>
                          <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => changeStatus(clinic, "Active")}>
                            Salvar plano
                          </button>
                          <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => changeStatus(clinic, "Suspended")}>
                            Suspender
                          </button>
                        </>
                      ) : (
                        <button type="button" className={secondaryButtonClass} disabled={saving} onClick={() => changeStatus(clinic, "Active")}>
                          {saving ? "Ativando..." : "Ativar"}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </Card>
      )}
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
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
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
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function toDraft(clinic: ClinicActivation) {
  return { planName: clinic.planName ?? "", monthlyFee: clinic.monthlyFee?.toFixed(2) ?? "" };
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
