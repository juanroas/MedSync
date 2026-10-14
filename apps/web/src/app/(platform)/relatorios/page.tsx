"use client";

import { AlertBanner, Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, SectionHeader, inputClass } from "@/components/ui";
import { formatBrazilDateInput, formatDateTime } from "@/lib/format";
import { REPORT_OUTCOME_LABELS, isPracticeOwner } from "@/lib/types";
import type { AppointmentReport, Doctor, ReportOutcome } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { BarChart3, CalendarCheck2, CalendarX2, Download, FileSpreadsheet, ShieldCheck, UserX, XCircle } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

// Relatórios (14/10/2026). Clínica e consultório: atendimentos do período por médico e situação. Médico: a própria
// produção, com as receitas emitidas. DPO: relatório de acessos de um titular (LGPD). Nunca conteúdo clínico (regra C5).
export default function ReportsPage() {
  const roles = getSession()?.user.roles ?? [];
  if (roles.includes("DataProtectionOfficer")) return <DataAccessReport />;
  if (roles.some((role) => ["ClinicAdmin", "Receptionist", "Doctor"].includes(role))) return <AppointmentReportView />;
  return (
    <EmptyState
      icon={<BarChart3 size={22} />}
      title="Relatórios"
      description="Os relatórios ficam com a clínica, o médico e o DPO."
    />
  );
}

const outcomeTone: Record<ReportOutcome, "success" | "warning" | "error" | "neutral" | "info"> = {
  Completed: "success",
  NoShow: "warning",
  NotHeld: "error",
  Cancelled: "neutral",
  Upcoming: "info",
};

function monthRange(offset = 0) {
  const [year, month] = formatBrazilDateInput().split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const last = new Date(Date.UTC(year, month + offset, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function AppointmentReportView() {
  const user = getSession()?.user;
  const roles = user?.roles ?? [];
  const seesClinic = roles.includes("ClinicAdmin") || roles.includes("Receptionist");
  const owner = isPracticeOwner(user);
  const [filters, setFilters] = useState(() => ({ ...monthRange(), doctorId: "", modality: "" }));
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [report, setReport] = useState<AppointmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "csv" | "">("");

  useEffect(() => {
    if (seesClinic) api.getDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, [seesClinic]);

  useEffect(() => {
    if (!filters.from || !filters.to) return;
    let active = true;
    setLoading(true);
    setError("");
    api
      .getAppointmentReport(filters)
      .then((data) => active && setReport(data))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Não foi possível montar o relatório."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters]);

  async function downloadFile(format: "pdf" | "csv") {
    setDownloading(format);
    setError("");
    try {
      await api.downloadAppointmentReport(filters, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setDownloading("");
    }
  }

  const presets = useMemo(() => [{ label: "Este mês", ...monthRange() }, { label: "Mês passado", ...monthRange(-1) }], []);
  const totals = report?.totals;

  return (
    <>
      <PageHeader
        eyebrow={owner ? "Consultório" : seesClinic ? "Gestão da clínica" : "Portal médico"}
        title="Relatórios"
        description={
          seesClinic
            ? "Atendimentos do período por médico e situação, em PDF ou planilha. Não mostra conteúdo clínico."
            : "Sua produção no período: consultas atendidas e receitas emitidas."
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => downloadFile("csv")} isLoading={downloading === "csv"} disabled={!report}>
              <FileSpreadsheet size={17} /> Baixar planilha (CSV)
            </Button>
            <Button type="button" onClick={() => downloadFile("pdf")} isLoading={downloading === "pdf"} disabled={!report}>
              <Download size={17} /> Baixar PDF
            </Button>
          </div>
        }
      />
      {error && <ErrorBanner message={error} />}

      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_1fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">De</span>
            <input className={inputClass} type="date" value={filters.from} max={filters.to} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Até</span>
            <input className={inputClass} type="date" value={filters.to} min={filters.from} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
          {seesClinic ? (
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Médico</span>
              <select className={inputClass} value={filters.doctorId} onChange={(event) => setFilters({ ...filters, doctorId: event.target.value })}>
                <option value="">Todos os médicos</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="hidden md:block" />
          )}
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Modalidade</span>
            <select className={inputClass} value={filters.modality} onChange={(event) => setFilters({ ...filters, modality: event.target.value })}>
              <option value="">Online e presencial</option>
              <option value="Online">Online</option>
              <option value="InPerson">Presencial</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = preset.from === filters.from && preset.to === filters.to;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters({ ...filters, from: preset.from, to: preset.to })}
                className={`h-8 rounded-md px-3 text-xs font-bold transition ${
                  selected ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:bg-slate-50 hover:text-ink"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </Card>

      {loading && !report ? (
        <LoadingState label="Montando o relatório..." />
      ) : report && totals ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do período">
            <MetricCard label="Realizadas" value={totals.completed} detail={`de ${totals.total} marcadas no período`} icon={<CalendarCheck2 size={20} />} tone="success" />
            <MetricCard label="Paciente faltou" value={totals.noShow} detail="registrado pelo médico" icon={<UserX size={20} />} tone="warning" />
            <MetricCard label="Não realizadas" value={totals.notHeld} detail="o horário passou sem concluir" icon={<CalendarX2 size={20} />} tone="error" />
            <MetricCard label="Canceladas" value={totals.cancelled} detail={`${totals.online} online · ${totals.inPerson} presenciais (não canceladas)`} icon={<XCircle size={20} />} tone="neutral" />
          </section>

          {(report.scope === "clinic" && report.byDoctor.length > 0) || report.prescriptions ? (
            <section
              className={`mt-7 grid gap-6 ${
                report.scope === "clinic" && report.byDoctor.length > 0 && report.prescriptions ? "xl:grid-cols-2" : ""
              }`}
            >
              {report.scope === "clinic" && report.byDoctor.length > 0 && (
                <Card className="overflow-hidden">
                  <SectionHeader title="Por médico" description="Consultas marcadas no período" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-6 py-3 font-bold">Médico</th>
                          <th className="px-3 py-3 text-right font-bold">Marcadas</th>
                          <th className="px-3 py-3 text-right font-bold">Realizadas</th>
                          <th className="px-3 py-3 text-right font-bold">Faltou</th>
                          <th className="px-3 py-3 text-right font-bold">Não realiz.</th>
                          <th className="px-6 py-3 text-right font-bold">Canceladas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.byDoctor.map((row) => (
                          <tr key={row.doctorId}>
                            <td className="whitespace-nowrap px-6 py-3 font-semibold text-ink">{row.doctorName}</td>
                            <td className="px-3 py-3 text-right">{row.totals.total}</td>
                            <td className="px-3 py-3 text-right">{row.totals.completed}</td>
                            <td className="px-3 py-3 text-right">{row.totals.noShow}</td>
                            <td className="px-3 py-3 text-right">{row.totals.notHeld}</td>
                            <td className="px-6 py-3 text-right">{row.totals.cancelled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              {report.prescriptions && (
                <Card className="overflow-hidden">
                  <SectionHeader title="Receitas emitidas por mim" description="Pela data de emissão; rascunhos pela data de criação" />
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-5 text-sm sm:grid-cols-4">
                    {[
                      ["Total", report.prescriptions.total],
                      ["Assinadas no MedSync", report.prescriptions.signed],
                      ["Fora do MedSync / papel", report.prescriptions.outsideMedSync],
                      ["Rascunhos", report.prescriptions.drafts],
                      ["Simples", report.prescriptions.simple],
                      ["Antimicrobiano", report.prescriptions.antimicrobial],
                      ["Controle especial", report.prescriptions.controlledSpecial],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="text-lg font-bold text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}
            </section>
          ) : null}

          <Card className="mt-7 overflow-hidden">
            <SectionHeader
              title="Consultas do período"
              description={`${report.items.length} consulta${report.items.length === 1 ? "" : "s"}${report.itemsTruncated ? " (lista limitada; reduza o período)" : ""}`}
            />
            {report.items.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma consulta no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-bold">Data e hora</th>
                      <th className="px-3 py-3 font-bold">Paciente</th>
                      {report.scope === "clinic" && <th className="px-3 py-3 font-bold">Médico</th>}
                      <th className="px-3 py-3 font-bold">Modalidade</th>
                      <th className="px-6 py-3 font-bold">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.items.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-3">{formatDateTime(item.scheduledAt)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-ink">{item.patientName}</td>
                        {report.scope === "clinic" && <td className="whitespace-nowrap px-3 py-3">{item.doctorName}</td>}
                        <td className="whitespace-nowrap px-3 py-3">{item.modality === "InPerson" ? "Presencial" : "Online"}</td>
                        <td className="px-6 py-3">
                          <Badge tone={outcomeTone[item.outcome]}>{REPORT_OUTCOME_LABELS[item.outcome]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </>
  );
}

// LGPD art. 18 e 19: o DPO gera, pelo CPF completo, a lista de quem acessou os dados do titular.
function DataAccessReport() {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setDone(false);
    setLoading(true);
    try {
      await api.downloadDataAccessReport(cpf.replace(/\D/g, ""));
      setDone(true);
      setCpf("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Privacidade"
        title="Relatórios"
        description="Relatório de acessos aos dados de um titular (LGPD art. 18 e 19), para responder pedidos que chegam por outros canais."
      />
      {error && <ErrorBanner message={error} />}
      {done && <AlertBanner tone="success" message="Relatório gerado. Envie ao titular pelo canal do pedido." />}
      <Card className="max-w-2xl p-6">
        <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
          <ShieldCheck size={21} />
        </span>
        <h2 className="mt-5 text-lg font-bold text-ink">Quem acessou os dados do titular</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Lista quem consultou, criou ou alterou dados do titular em todas as clínicas, quando e com qual resultado. Não mostra
          o conteúdo do prontuário. A geração fica registrada na auditoria.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-2 block text-xs font-bold text-slate-600">CPF completo do titular</span>
            <input
              className={inputClass}
              inputMode="numeric"
              autoComplete="off"
              value={cpf}
              maxLength={14}
              placeholder="000.000.000-00"
              onChange={(event) => setCpf(maskCpf(event.target.value))}
              required
            />
          </label>
          <Button type="submit" isLoading={loading} disabled={cpf.replace(/\D/g, "").length !== 11}>
            <Download size={17} /> Baixar relatório (PDF)
          </Button>
        </form>
      </Card>
    </>
  );
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
