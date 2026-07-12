"use client";

import { Badge, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { CompanyActivation, CompanyBeneficiary } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { CheckCircle2, ClipboardCheck, Search, ShieldCheck, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type EligibilityForm = {
  isEligible: boolean;
  eligibleUntil: string;
  reason: string;
};

function toForm(beneficiary: CompanyBeneficiary): EligibilityForm {
  return {
    isEligible: beneficiary.isEligible,
    eligibleUntil: beneficiary.eligibleUntil ?? "",
    reason: beneficiary.reason ?? "",
  };
}

export default function EligibilityPage() {
  const roles = getSession()?.user.roles ?? [];
  const isPlatformAdmin = roles.includes("PlatformAdmin");
  const canManageBeneficiaries = roles.some((role) => ["CompanyAdmin", "Support"].includes(role));
  const [companies, setCompanies] = useState<CompanyActivation[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<CompanyBeneficiary[]>([]);
  const [forms, setForms] = useState<Record<string, EligibilityForm>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      isPlatformAdmin ? api.getCompanyActivations() : Promise.resolve([]),
      canManageBeneficiaries ? api.getCompanyBeneficiaries() : Promise.resolve([]),
    ])
      .then(([companyItems, beneficiaryItems]) => {
        setCompanies(companyItems);
        setBeneficiaries(beneficiaryItems);
        setForms(Object.fromEntries(beneficiaryItems.map((item) => [item.id, toForm(item)])));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar elegibilidade."))
      .finally(() => setLoading(false));
  }, [canManageBeneficiaries, isPlatformAdmin]);

  const filtered = useMemo(
    () =>
      beneficiaries.filter((item) =>
        `${item.name} ${item.email} ${item.employeeCode ?? ""} ${item.planName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [beneficiaries, query],
  );

  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) => {
        const matchesSearch = `${company.companyName} ${company.tenantName} ${company.taxIdMasked} ${company.planName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && company.isActive) ||
          (statusFilter === "inactive" && !company.isActive);
        return matchesSearch && matchesStatus;
      }),
    [companies, query, statusFilter],
  );

  async function submit(event: FormEvent, beneficiary: CompanyBeneficiary) {
    event.preventDefault();
    const form = forms[beneficiary.id];
    if (!form) return;
    setSavingId(beneficiary.id);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateCompanyBeneficiaryEligibility(beneficiary.id, {
        isEligible: form.isEligible,
        eligibleUntil: form.eligibleUntil || undefined,
        reason: form.reason || undefined,
      });
      setBeneficiaries((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setForms((current) => ({ ...current, [updated.id]: toForm(updated) }));
      setSuccess("Elegibilidade administrativa atualizada com auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar elegibilidade.");
    } finally {
      setSavingId("");
    }
  }

  function updateForm(id: string, patch: Partial<EligibilityForm>) {
    setForms((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { isEligible: true, eligibleUntil: "", reason: "" }), ...patch },
    }));
  }

  async function toggleCompany(company: CompanyActivation) {
    setSavingId(company.companyId);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateCompanyActivation(company.companyId, {
        isActive: !company.isActive,
        reason: !company.isActive ? "CNPJ habilitado pelo ADM MedSync." : "CNPJ desabilitado pelo ADM MedSync.",
      });
      setCompanies((items) => items.map((item) => (item.companyId === updated.companyId ? updated : item)));
      setSuccess(updated.isActive ? "CNPJ habilitado para uso." : "CNPJ desabilitado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar CNPJ.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="MedSync Business"
        title="Elegibilidade"
        description="Gerencie quem esta administrativamente apto a usar o beneficio contratado, sem expor informacao clinica individual."
      />

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      )}

      <div className="mb-6 rounded-lg border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-teal-700" size={18} />
          <p>
            Esta tela trata apenas elegibilidade administrativa do CNPJ. Diagnostico,
            prontuario, observacao clinica, especialidade sensivel e conteudo de chamada
            nao aparecem para a empresa.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px]">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4">
          <Search size={18} className="text-slate-400" />
          <input
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder={isPlatformAdmin ? "Buscar por empresa, CNPJ, tenant ou plano" : "Buscar por nome, e-mail, matricula ou plano"}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {isPlatformAdmin && (
          <select
            className={inputClass}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="active">Habilitadas</option>
            <option value="inactive">Aguardando habilitacao</option>
          </select>
        )}
      </div>

      {loading ? (
        <LoadingState label="Carregando elegibilidade..." />
      ) : isPlatformAdmin ? (
        filteredCompanies.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={22} />}
            title="Nenhum CNPJ encontrado"
            description="Ajuste a busca ou o filtro de status para visualizar empresas cadastradas."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[1060px]">
                <div className="grid grid-cols-[1.35fr_1fr_.9fr_1fr_.8fr_.9fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                  <span>Empresa</span>
                  <span>CNPJ</span>
                  <span>Tenant</span>
                  <span>Plano</span>
                  <span>Status</span>
                  <span className="text-right">Acao</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredCompanies.map((company) => (
                    <article
                      key={company.companyId}
                      className="grid grid-cols-[1.35fr_1fr_.9fr_1fr_.8fr_.9fr] items-center gap-4 px-6 py-5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink" title={company.companyName}>
                          {company.companyName}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Criada em {formatDate(company.createdAt)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-700">{company.taxIdMasked}</span>
                      <span className="truncate text-slate-500" title={company.tenantName}>
                        {company.tenantName}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-700" title={company.planName ?? "Sem plano"}>
                          {company.planName ?? "Sem plano"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{company.contractStatus ?? "Sem contrato"}</p>
                      </div>
                      <Badge tone={company.isActive ? "success" : "warning"}>
                        {company.isActive ? "Habilitada" : "Pendente"}
                      </Badge>
                      <div className="text-right">
                        <button
                          className={company.isActive ? `${buttonClass} bg-slate-700 hover:bg-slate-800` : buttonClass}
                          onClick={() => toggleCompany(company)}
                          disabled={savingId === company.companyId}
                        >
                          {savingId === company.companyId
                            ? "Atualizando..."
                            : company.isActive ? "Desabilitar" : "Habilitar"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck size={22} />}
          title={query ? "Nenhum resultado" : "Nenhum beneficiario"}
          description={
            query
              ? "Tente buscar usando outro termo."
              : "Beneficiarios elegiveis aparecem aqui quando vinculados ao CNPJ."
          }
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filtered.map((beneficiary) => {
            const form = forms[beneficiary.id] ?? toForm(beneficiary);
            return (
              <article key={beneficiary.id} className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {beneficiary.isEligible ? (
                        <CheckCircle2 className="shrink-0 text-emerald-600" size={18} />
                      ) : (
                        <XCircle className="shrink-0 text-rose-600" size={18} />
                      )}
                      <h2 className="truncate font-bold text-ink">{beneficiary.name}</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{beneficiary.email}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      Matricula {beneficiary.employeeCode ?? "nao informada"} - {beneficiary.planName ?? "sem plano ativo"}
                    </p>
                  </div>
                  <span className={`rounded-lg px-3 py-2 text-xs font-bold ${
                    beneficiary.isEligible
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}>
                    {beneficiary.isEligible ? "Elegivel" : "Inelegivel"}
                  </span>
                </div>

                <form onSubmit={(event) => submit(event, beneficiary)} className="mt-6 border-t border-slate-100 pt-5">
                  <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-slate-600">Status</span>
                      <select
                        className={inputClass}
                        value={form.isEligible ? "true" : "false"}
                        onChange={(event) =>
                          updateForm(beneficiary.id, { isEligible: event.target.value === "true" })
                        }
                      >
                        <option value="true">Elegivel</option>
                        <option value="false">Inelegivel</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-slate-600">Valido ate</span>
                      <input
                        className={inputClass}
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={form.eligibleUntil}
                        onChange={(event) =>
                          updateForm(beneficiary.id, { eligibleUntil: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-bold text-slate-600">Motivo administrativo</span>
                    <textarea
                      className={`${inputClass} min-h-24 py-3`}
                      maxLength={240}
                      value={form.reason}
                      onChange={(event) =>
                        updateForm(beneficiary.id, { reason: event.target.value })
                      }
                      placeholder="Ex.: vinculo ativo no contrato de homologacao"
                    />
                  </label>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-400">
                      Alteracoes de elegibilidade geram evento de auditoria.
                    </p>
                    <button className={buttonClass} disabled={savingId === beneficiary.id}>
                      {savingId === beneficiary.id ? "Salvando..." : "Salvar elegibilidade"}
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}
