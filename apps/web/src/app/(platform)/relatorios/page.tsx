"use client";

import {
  AlertBanner,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  MetricCard,
  PageHeader,
  TextInput,
} from "@/components/ui";
import type { BusinessReportCompany } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { Building2, ChartNoAxesColumn, Download, EyeOff, FileBarChart, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ReportsPage() {
  const roles = getSession()?.user.roles ?? [];
  const isGlobalProfile = roles.some((role) =>
    ["PlatformAdmin", "PlatformFinance", "PlatformAuditor", "DataProtectionOfficer"].includes(role),
  );
  const [period, setPeriod] = useState(currentPeriod());
  const [appliedPeriod, setAppliedPeriod] = useState(currentPeriod());
  const [companies, setCompanies] = useState<BusinessReportCompany[]>([]);
  const [privacyGuards, setPrivacyGuards] = useState<string[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.getBusinessReport(appliedPeriod)
      .then((report) => {
        setCompanies(report.companies);
        setPrivacyGuards([...report.privacyGuards]);
        setIsGlobal(report.isGlobal);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar relatorios."))
      .finally(() => setLoading(false));
  }, [appliedPeriod]);

  const totals = useMemo(() => {
    return companies.reduce(
      (acc, company) => {
        acc.beneficiaries += company.beneficiaryCount;
        acc.eligible += company.eligibleCount;
        acc.monthlyFee += company.monthlyFee ?? 0;
        acc.paid += company.paidAmount;
        if (!company.hiddenDueToPrivacyThreshold) {
          acc.consultations += company.totalConsultations ?? 0;
        }
        return acc;
      },
      { beneficiaries: 0, eligible: 0, consultations: 0, monthlyFee: 0, paid: 0 },
    );
  }, [companies]);

  async function exportFinancialCsv() {
    setExporting(true);
    setError("");
    try {
      const result = await api.getFinancialExport(appliedPeriod);
      const csv = toCsv([
        [
          "periodo",
          "tenant",
          "empresa",
          "cnpj_mascarado",
          "plano",
          "status_contrato",
          "beneficiarios",
          "elegiveis",
          "mensalidade",
          "pago",
          "em_aberto",
          "moeda",
          "status_financeiro",
        ],
        ...result.rows.map((row) => [
          result.period,
          row.tenantName,
          row.companyName,
          row.taxIdMasked,
          row.planName ?? "",
          row.contractStatus ?? "",
          row.beneficiaryCount,
          row.eligibleCount,
          row.monthlyFee,
          row.paidAmount,
          row.openAmount,
          row.currency,
          row.billingStatus,
        ]),
      ]);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medsync-financeiro-${result.period}${result.isGlobal ? "-global" : ""}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar financeiro.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isGlobalProfile ? "Visao MedSync" : "Portal Empresa"}
        title={isGlobal ? "Relatorios por CNPJ" : "Relatorios da empresa"}
        description={
          isGlobal
            ? "Comparativo administrativo entre empresas contratantes, com minimizacao e sem dados clinicos individuais."
            : "Indicadores administrativos e financeiros do CNPJ contratante, sem prontuario, diagnostico ou conteudo de chamada."
        }
        action={
          <form
            className="flex flex-wrap items-end justify-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setAppliedPeriod(period);
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Periodo</span>
              <TextInput
                type="month"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="w-40"
              />
            </label>
            <button className="h-11 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white hover:bg-teal-800">
              Aplicar
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-teal-200 hover:text-teal-700"
              onClick={exportFinancialCsv}
              disabled={exporting}
            >
              <Download size={16} /> {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
          </form>
        }
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <LoadingState label="Carregando relatorios agregados..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="CNPJs" value={companies.length} detail="escopo autorizado" icon={<Building2 size={20} />} tone="info" />
            <MetricCard label="Beneficiarios" value={totals.beneficiaries} detail="vinculos administrativos" icon={<ShieldCheck size={20} />} tone="success" />
            <MetricCard label="Elegiveis" value={totals.eligible} detail="aptos no periodo" icon={<ChartNoAxesColumn size={20} />} tone="success" />
            <MetricCard label="Consultas" value={totals.consultations} detail="quando grupo minimo permite" icon={<FileBarChart size={20} />} tone="warning" />
            <MetricCard label="Mensalidade" value={currency.format(totals.monthlyFee)} detail="contratos ativos/demo" icon={<WalletCards size={20} />} tone="info" />
          </section>

          <AlertBanner
            tone="info"
            title="Relatorio minimizado"
            message={privacyGuards.join(" ")}
          />

          <Card className="mt-6 overflow-hidden">
            {companies.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<FileBarChart size={22} />}
                  title="Nenhum CNPJ no escopo"
                  description="Os relatorios aparecerao quando houver empresa contratante ativa para o perfil."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-[1.3fr_1fr_.8fr_.8fr_.8fr_.9fr_.9fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                    <span>Empresa</span>
                    <span>Plano</span>
                    <span>Beneficiarios</span>
                    <span>Elegiveis</span>
                    <span>Consultas</span>
                    <span>Mensalidade</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {companies.map((company) => (
                      <CompanyReportRow key={company.companyId} company={company} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function CompanyReportRow({ company }: { company: BusinessReportCompany }) {
  return (
    <article className="grid grid-cols-[1.3fr_1fr_.8fr_.8fr_.8fr_.9fr_.9fr] gap-4 px-6 py-5 text-sm">
      <div>
        <p className="font-bold text-ink">{company.companyName}</p>
        <p className="mt-1 text-xs text-slate-400">{company.taxIdMasked} · {company.tenantName}</p>
      </div>
      <div>
        <p className="font-semibold text-slate-700">{company.planName ?? "Sem plano"}</p>
        <p className="mt-1 text-xs text-slate-400">{company.contractStatus ?? "Sem contrato"}</p>
      </div>
      <span className="font-semibold text-ink">{company.beneficiaryCount}</span>
      <span className="font-semibold text-ink">{company.eligibleCount}</span>
      <span>
        {company.hiddenDueToPrivacyThreshold ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700">
            <EyeOff size={15} /> Grupo minimo
          </span>
        ) : (
          <span className="font-semibold text-ink">{company.totalConsultations ?? 0}</span>
        )}
        {company.hiddenReason && <p className="mt-1 text-xs leading-5 text-slate-400">{company.hiddenReason}</p>}
      </span>
      <span className="font-semibold text-ink">{company.monthlyFee ? currency.format(company.monthlyFee) : "-"}</span>
      <span>
        <Badge tone={company.billingStatus === "Pago" ? "success" : company.billingStatus === "Aberta" ? "warning" : "neutral"}>
          {company.billingStatus}
        </Badge>
      </span>
    </article>
  );
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
