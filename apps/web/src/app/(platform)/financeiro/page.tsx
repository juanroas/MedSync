"use client";

import { Dialog } from "@/components/dialog";
import { AlertBanner, Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, SectionHeader, inputClass } from "@/components/ui";
import { formatBrazilDateInput, formatDate, formatDateTime } from "@/lib/format";
import { INVOICE_METHOD_LABELS, invoiceStatusLabel, isPracticeOwner } from "@/lib/types";
import type { ClinicActivation, ClinicInvoice, InvoicePaymentMethod } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { AlertTriangle, CheckCircle2, Clock3, Copy, Download, FileText, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

// Financeiro (14/10/2026): mensalidade do MedSync cobrada à mão. A equipe MedSync (Suporte, Médico ADM) lança a
// cobrança e confirma o recebimento; a clínica paga por Pix, avisa que pagou e imprime a fatura e o recibo.
export default function BillingPage() {
  const roles = getSession()?.user.roles ?? [];
  if (roles.includes("Support") || roles.includes("MedicalDirector")) return <TeamBilling />;
  if (roles.includes("ClinicAdmin")) return <ClinicBilling />;
  return (
    <EmptyState icon={<Wallet size={22} />} title="Financeiro" description="O financeiro fica com o administrador da clínica e a equipe MedSync." />
  );
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// "2026-10" → "Outubro de 2026".
function referenceLabel(reference: string) {
  const [year, month] = reference.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function statusTone(invoice: ClinicInvoice): "success" | "warning" | "error" | "neutral" | "info" {
  if (invoice.status === "Paid") return "success";
  if (invoice.status === "PaymentInformed") return "warning";
  if (invoice.status === "Cancelled") return "neutral";
  return invoice.overdue ? "error" : "info";
}

function useInvoices(filters: { status?: string; clinicId?: string } = {}) {
  const [invoices, setInvoices] = useState<ClinicInvoice[] | null>(null);
  const [error, setError] = useState("");
  const { status, clinicId } = filters;
  const load = useCallback(
    () =>
      api
        .getInvoices({ status, clinicId })
        .then((items) => {
          setInvoices(items);
          setError("");
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar o financeiro.")),
    [status, clinicId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { invoices, error, setError, load, setInvoices };
}

// ——— Equipe MedSync ———

function TeamBilling() {
  const [statusFilter, setStatusFilter] = useState("");
  const [clinicFilter, setClinicFilter] = useState("");
  const { invoices, error, setError, load } = useInvoices({ status: statusFilter, clinicId: clinicFilter });
  const [clinics, setClinics] = useState<ClinicActivation[]>([]);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<ClinicInvoice | null>(null);
  const [cancelling, setCancelling] = useState<ClinicInvoice | null>(null);
  const [notice, setNotice] = useState("");
  const [downloading, setDownloading] = useState("");

  useEffect(() => {
    api.getClinicActivations().then(setClinics).catch(() => setClinics([]));
  }, []);

  const totals = useMemo(() => {
    const items = invoices ?? [];
    const month = formatBrazilDateInput().slice(0, 7);
    const sum = (list: ClinicInvoice[]) => list.reduce((total, item) => total + item.amount, 0);
    const informed = items.filter((item) => item.status === "PaymentInformed");
    const open = items.filter((item) => item.status === "Open");
    const overdue = open.filter((item) => item.overdue);
    const paidThisMonth = items.filter((item) => item.status === "Paid" && item.paidOn?.startsWith(month));
    return { informed, open, overdue, paidThisMonth, sum };
  }, [invoices]);

  async function download(key: string, action: () => Promise<void>) {
    setDownloading(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setDownloading("");
    }
  }

  const year = formatBrazilDateInput().slice(0, 4);
  const thisMonth = formatBrazilDateInput().slice(0, 7);

  return (
    <>
      <PageHeader
        eyebrow="Operação MedSync"
        title="Financeiro"
        description="Mensalidades das clínicas: lance a cobrança, confira o pagamento informado e confirme quando o valor entrar na conta."
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
            <Button
              type="button"
              variant="secondary"
              isLoading={downloading === "report"}
              onClick={() => download("report", () => api.downloadBillingReport(`${year}-01`, thisMonth))}
            >
              <Download size={17} /> Baixar relatório (PDF)
            </Button>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus size={17} /> Lançar cobrança
            </Button>
          </div>
        }
      />
      {error && <ErrorBanner message={error} />}
      {notice && <AlertBanner tone="success" message={notice} />}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo financeiro">
        <MetricCard
          label="Pagamento informado"
          value={totals.informed.length}
          detail={`${money.format(totals.sum(totals.informed))} para conferir no extrato`}
          icon={<Clock3 size={20} />}
          tone="warning"
        />
        <MetricCard label="Em aberto" value={money.format(totals.sum(totals.open))} detail={`${totals.open.length} cobrança(s)`} icon={<Wallet size={20} />} tone="info" />
        <MetricCard label="Em atraso" value={money.format(totals.sum(totals.overdue))} detail={`${totals.overdue.length} cobrança(s) vencida(s)`} icon={<AlertTriangle size={20} />} tone="error" />
        <MetricCard label="Recebido no mês" value={money.format(totals.sum(totals.paidThisMonth))} detail={`${totals.paidThisMonth.length} pagamento(s) confirmado(s)`} icon={<CheckCircle2 size={20} />} tone="success" />
      </section>

      <Card className="mt-7 overflow-hidden">
        <SectionHeader title="Cobranças" description="O relatório em PDF traz o ano até o mês atual, com o resumo por clínica." />
        <div className="grid gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-2 lg:max-w-2xl">
          <select aria-label="Filtrar por situação" className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todas as situações</option>
            <option value="PaymentInformed">Pagamento informado</option>
            <option value="Open">Em aberto</option>
            <option value="Paid">Pagas</option>
            <option value="Cancelled">Canceladas</option>
          </select>
          <select aria-label="Filtrar por clínica" className={inputClass} value={clinicFilter} onChange={(event) => setClinicFilter(event.target.value)}>
            <option value="">Todas as clínicas</option>
            {clinics.map((clinic) => (
              <option key={clinic.clinicId} value={clinic.clinicId}>
                {clinic.clinicName}
              </option>
            ))}
          </select>
        </div>
        {invoices === null ? (
          <LoadingState label="Carregando cobranças..." />
        ) : invoices.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma cobrança. Use &quot;Lançar cobrança&quot; no topo da página.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-bold">Fatura</th>
                  <th className="px-3 py-3 font-bold">Clínica</th>
                  <th className="px-3 py-3 font-bold">Referência</th>
                  <th className="px-3 py-3 font-bold">Vencimento</th>
                  <th className="px-3 py-3 text-right font-bold">Valor</th>
                  <th className="px-3 py-3 font-bold">Situação</th>
                  <th className="px-6 py-3 text-right font-bold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-top">
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-ink">{invoice.code}</td>
                    <td className="px-3 py-4">
                      <p className="whitespace-nowrap font-semibold text-ink">{invoice.clinicName}</p>
                      {invoice.clinicIsPrivatePractice && <p className="text-xs text-slate-400">Consultório</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">{referenceLabel(invoice.reference)}</td>
                    <td className="whitespace-nowrap px-3 py-4">{formatDate(invoice.dueDate)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-right font-semibold">{money.format(invoice.amount)}</td>
                    <td className="px-3 py-4">
                      <Badge tone={statusTone(invoice)}>{invoiceStatusLabel(invoice)}</Badge>
                      {invoice.status === "PaymentInformed" && invoice.informedAt && (
                        <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                          Avisado em {formatDateTime(invoice.informedAt)}
                          {invoice.informedNote ? ` · "${invoice.informedNote}"` : ""}
                        </p>
                      )}
                      {invoice.status === "Paid" && invoice.paidOn && (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(invoice.paidOn)} · {invoice.paymentMethod ? INVOICE_METHOD_LABELS[invoice.paymentMethod] : ""}
                        </p>
                      )}
                      {invoice.status === "Cancelled" && invoice.cancelReason && (
                        <p className="mt-1 max-w-[220px] text-xs text-slate-500">{invoice.cancelReason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {(invoice.status === "Open" || invoice.status === "PaymentInformed") && (
                          <Button type="button" variant="secondary" className="h-9 px-3 text-xs" onClick={() => setConfirming(invoice)}>
                            <CheckCircle2 size={14} /> Confirmar pagamento
                          </Button>
                        )}
                        {invoice.status !== "Cancelled" && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3 text-xs"
                            isLoading={downloading === invoice.id}
                            onClick={() => download(invoice.id, () => api.downloadInvoicePdf(invoice))}
                          >
                            <FileText size={14} /> {invoice.status === "Paid" ? "Recibo" : "Fatura"}
                          </Button>
                        )}
                        {(invoice.status === "Open" || invoice.status === "PaymentInformed") && (
                          <Button type="button" variant="ghost" className="h-9 px-3 text-xs text-slate-400 hover:text-red-600" onClick={() => setCancelling(invoice)}>
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateInvoiceDialog
        open={creating}
        clinics={clinics}
        onClose={() => setCreating(false)}
        onCreated={(invoice) => {
          setCreating(false);
          setNotice(`Cobrança ${invoice.code} lançada para ${invoice.clinicName}.`);
          void load();
        }}
      />
      <ConfirmPaymentDialog
        invoice={confirming}
        onClose={() => setConfirming(null)}
        onDone={(invoice) => {
          setConfirming(null);
          setNotice(`Pagamento de ${invoice.clinicName} confirmado. O recibo já está disponível para a clínica.`);
          void load();
        }}
      />
      <CancelInvoiceDialog
        invoice={cancelling}
        onClose={() => setCancelling(null)}
        onDone={(invoice) => {
          setCancelling(null);
          setNotice(`Cobrança ${invoice.code} cancelada.`);
          void load();
        }}
      />
    </>
  );
}

function CreateInvoiceDialog({
  open,
  clinics,
  onClose,
  onCreated,
}: {
  open: boolean;
  clinics: ClinicActivation[];
  onClose: () => void;
  onCreated: (invoice: ClinicInvoice) => void;
}) {
  const today = formatBrazilDateInput();
  const [form, setForm] = useState({ clinicId: "", reference: today.slice(0, 7), amount: "", dueDate: today, description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function pickClinic(clinicId: string) {
    const clinic = clinics.find((item) => item.clinicId === clinicId);
    setForm({ ...form, clinicId, amount: clinic?.monthlyFee ? String(clinic.monthlyFee) : "" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await api.createInvoice({
        clinicId: form.clinicId,
        reference: form.reference,
        amount: form.amount ? Number(form.amount.replace(",", ".")) : undefined,
        dueDate: form.dueDate,
        description: form.description || undefined,
      });
      setForm({ ...form, clinicId: "", amount: "", description: "" });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível lançar a cobrança.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} title="Lançar cobrança" description="A clínica vê a cobrança em Financeiro, com o Pix para pagar." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Clínica</span>
          <select className={inputClass} value={form.clinicId} onChange={(event) => pickClinic(event.target.value)} required>
            <option value="">Escolha a clínica</option>
            {clinics.map((clinic) => (
              <option key={clinic.clinicId} value={clinic.clinicId}>
                {clinic.clinicName}
                {clinic.isPrivatePractice ? " (consultório)" : ""}
                {clinic.planName ? ` — ${clinic.planName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Mês de referência</span>
            <input className={inputClass} type="month" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Vencimento</span>
            <input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Valor (R$)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            placeholder="Valor do plano da clínica"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Descrição (opcional)</span>
          <input
            className={inputClass}
            maxLength={200}
            placeholder="Mensalidade MedSync — plano — mês/ano"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" isLoading={saving}>
            Lançar cobrança
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ConfirmPaymentDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: ClinicInvoice | null;
  onClose: () => void;
  onDone: (invoice: ClinicInvoice) => void;
}) {
  const [form, setForm] = useState<{ paidOn: string; method: InvoicePaymentMethod; note: string }>({
    paidOn: formatBrazilDateInput(),
    method: "Pix",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setError("");
    setSaving(true);
    try {
      onDone(await api.confirmInvoicePayment(invoice.id, { ...form, note: form.note || undefined }));
      setForm({ paidOn: formatBrazilDateInput(), method: "Pix", note: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={invoice !== null}
      title="Confirmar pagamento"
      description={
        invoice ? `${invoice.clinicName} · ${invoice.code} · ${money.format(invoice.amount)}. Confirme só depois de ver o valor no extrato.` : undefined
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Data do pagamento</span>
            <input className={inputClass} type="date" max={formatBrazilDateInput()} value={form.paidOn} onChange={(event) => setForm({ ...form, paidOn: event.target.value })} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Forma</span>
            <select className={inputClass} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as InvoicePaymentMethod })}>
              {(Object.keys(INVOICE_METHOD_LABELS) as InvoicePaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {INVOICE_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Observação (opcional)</span>
          <input className={inputClass} maxLength={300} placeholder="Ex.: identificado no extrato pelo código" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" isLoading={saving}>
            Confirmar recebimento
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CancelInvoiceDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: ClinicInvoice | null;
  onClose: () => void;
  onDone: (invoice: ClinicInvoice) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setError("");
    setSaving(true);
    try {
      onDone(await api.cancelInvoice(invoice.id, reason));
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={invoice !== null}
      title="Cancelar cobrança?"
      description={invoice ? `${invoice.clinicName} · ${invoice.code}. A clínica deixa de ver o Pix desta cobrança.` : undefined}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Motivo</span>
          <input className={inputClass} minLength={5} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} required />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" variant="danger" isLoading={saving}>
            Cancelar cobrança
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ——— Clínica ———

function ClinicBilling() {
  const owner = isPracticeOwner(getSession()?.user);
  const { invoices, error, setError, setInvoices } = useInvoices();
  const [informing, setInforming] = useState<ClinicInvoice | null>(null);
  const [copied, setCopied] = useState("");
  const [downloading, setDownloading] = useState("");
  const payable = (invoices ?? []).filter((item) => item.status === "Open" || item.status === "PaymentInformed");

  async function copy(invoice: ClinicInvoice) {
    if (!invoice.pixCode) return;
    try {
      await navigator.clipboard.writeText(invoice.pixCode);
      setCopied(invoice.id);
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  async function download(invoice: ClinicInvoice) {
    setDownloading(invoice.id);
    setError("");
    try {
      await api.downloadInvoicePdf(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o arquivo.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={owner ? "Consultório" : "Portal da clínica"}
        title="Financeiro"
        description="Mensalidades do MedSync. Pague por Pix, avise que pagou e imprima a fatura ou o recibo."
      />
      {error && <ErrorBanner message={error} />}
      {invoices === null ? (
        <LoadingState label="Carregando o financeiro..." />
      ) : invoices.length === 0 ? (
        <EmptyState icon={<Wallet size={22} />} title="Nenhuma cobrança" description="As mensalidades do MedSync aparecem aqui quando forem lançadas." />
      ) : (
        <>
          {payable.length > 0 && (
            <section className="grid gap-5 xl:grid-cols-2" aria-label="Cobranças a pagar">
              {payable.map((invoice) => (
                <Card key={invoice.id} as="article" className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fatura {invoice.code}</p>
                      <h2 className="mt-1 text-lg font-bold text-ink">{invoice.description}</h2>
                      <p className="mt-1 text-sm text-slate-500">Vence em {formatDate(invoice.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-ink">{money.format(invoice.amount)}</p>
                      <Badge tone={statusTone(invoice)}>{invoiceStatusLabel(invoice)}</Badge>
                    </div>
                  </div>

                  {invoice.status === "PaymentInformed" ? (
                    <p className="mt-5 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Você avisou o pagamento em {invoice.informedAt ? formatDateTime(invoice.informedAt) : "—"}. A equipe MedSync
                      confirma assim que o valor entrar na conta; o recibo aparece aqui.
                    </p>
                  ) : invoice.pixCode ? (
                    <div className="mt-5">
                      <label className="block">
                        <span className="mb-2 block text-xs font-bold text-slate-600">Pix copia e cola</span>
                        <textarea
                          readOnly
                          className={`${inputClass} h-24 resize-none py-2 font-mono text-xs`}
                          value={invoice.pixCode}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">
                        Chave Pix: {invoice.pixKey} · Recebedor: {invoice.pixReceiver}. O código {invoice.code} vai como identificação.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      A chave Pix do MedSync ainda não foi configurada.{" "}
                      <Link href={`/ajuda?subject=${encodeURIComponent(`Pagamento da fatura ${invoice.code}`)}`} className="font-bold text-teal-700 underline">
                        Fale com o suporte
                      </Link>{" "}
                      para receber os dados de pagamento.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {invoice.status === "Open" && invoice.pixCode && (
                      <Button type="button" variant="secondary" onClick={() => copy(invoice)}>
                        <Copy size={16} /> {copied === invoice.id ? "Código copiado" : "Copiar código Pix"}
                      </Button>
                    )}
                    <Button type="button" variant="secondary" isLoading={downloading === invoice.id} onClick={() => download(invoice)}>
                      <Download size={16} /> Baixar fatura (PDF)
                    </Button>
                    {invoice.status === "Open" && (
                      <Button type="button" variant="secondary" onClick={() => setInforming(invoice)}>
                        <CheckCircle2 size={16} /> Já paguei
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </section>
          )}

          <Card className="mt-7 overflow-hidden">
            <SectionHeader title="Histórico" description="Todas as mensalidades; o recibo fica disponível depois da confirmação do pagamento." />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-bold">Referência</th>
                    <th className="px-3 py-3 font-bold">Fatura</th>
                    <th className="px-3 py-3 font-bold">Vencimento</th>
                    <th className="px-3 py-3 text-right font-bold">Valor</th>
                    <th className="px-3 py-3 font-bold">Situação</th>
                    <th className="px-6 py-3 text-right font-bold">Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-6 py-3">{referenceLabel(invoice.reference)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{invoice.code}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(invoice.dueDate)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{money.format(invoice.amount)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={statusTone(invoice)}>{invoiceStatusLabel(invoice)}</Badge>
                        {invoice.status === "Paid" && invoice.paidOn && <span className="ml-2 text-xs text-slate-500">em {formatDate(invoice.paidOn)}</span>}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {invoice.status === "Paid" ? (
                          <Button type="button" variant="ghost" className="h-9 px-3 text-xs" isLoading={downloading === invoice.id} onClick={() => download(invoice)}>
                            <FileText size={14} /> Recibo (PDF)
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <InformPaymentDialog
        invoice={informing}
        onClose={() => setInforming(null)}
        onDone={(updated) => {
          setInforming(null);
          setInvoices((items) => (items ?? []).map((item) => (item.id === updated.id ? updated : item)));
        }}
      />
    </>
  );
}

function InformPaymentDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: ClinicInvoice | null;
  onClose: () => void;
  onDone: (invoice: ClinicInvoice) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!invoice) return;
    setError("");
    setSaving(true);
    try {
      onDone(await api.informInvoicePayment(invoice.id, note || undefined));
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível avisar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={invoice !== null}
      title="Avisar que pagou?"
      description={invoice ? `${invoice.description} · ${money.format(invoice.amount)}. A equipe MedSync confere no extrato e confirma.` : undefined}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <label className="block">
          <span className="mb-2 block text-xs font-bold text-slate-600">Observação (opcional)</span>
          <input className={inputClass} maxLength={300} placeholder="Ex.: pago pelo banco X às 14h" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" isLoading={saving}>
            Avisar o MedSync
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
