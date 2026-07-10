"use client";

import {
  AlertBanner,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeader,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/ui";
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const requestTypes: Array<{ value: PrivacyRequestType; label: string }> = [
  { value: "Access", label: "Acesso aos dados" },
  { value: "Correction", label: "Correcao cadastral" },
  { value: "Deletion", label: "Exclusao/anonimizacao aplicavel" },
  { value: "Portability", label: "Portabilidade" },
  { value: "ConsentRevocation", label: "Revogacao de consentimento" },
  { value: "Other", label: "Outro direito do titular" },
];

const statusOptions: Array<{ value: PrivacyRequestStatus; label: string }> = [
  { value: "New", label: "Nova" },
  { value: "InReview", label: "Em analise" },
  { value: "WaitingRequester", label: "Aguardando solicitante" },
  { value: "Resolved", label: "Resolvida" },
  { value: "Rejected", label: "Rejeitada" },
];

const statusTone: Record<PrivacyRequestStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  New: "info",
  InReview: "warning",
  WaitingRequester: "warning",
  Resolved: "success",
  Rejected: "error",
};

const typeLabel = Object.fromEntries(requestTypes.map((item) => [item.value, item.label])) as Record<PrivacyRequestType, string>;
const statusLabel = Object.fromEntries(statusOptions.map((item) => [item.value, item.label])) as Record<PrivacyRequestStatus, string>;

export default function PrivacyPage() {
  const session = getSession();
  const roles = session?.user.roles ?? [];
  const isPatientOnly = roles.includes("Patient") && roles.every((role) => role === "Patient");
  const canUpdate = roles.some((role) =>
    ["PrivacyAuditor", "PlatformAuditor", "DataProtectionOfficer", "PlatformAdmin"].includes(role),
  );

  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    requesterName: session?.user.name ?? "",
    requesterEmail: session?.user.email ?? "",
    subjectReference: isPatientOnly ? "Proprio titular autenticado" : "",
    type: "Access" as PrivacyRequestType,
    description: "",
  });

  useEffect(() => {
    api.getPrivacyRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar solicitacoes."))
      .finally(() => setLoading(false));
  }, []);

  const openRequests = useMemo(
    () => requests.filter((request) => !["Resolved", "Rejected"].includes(request.status)).length,
    [requests],
  );

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await api.createPrivacyRequest(form);
      setRequests((current) => [created, ...current]);
      setForm((current) => ({ ...current, description: "" }));
      setSuccess("Solicitacao registrada com trilha de auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar a solicitacao.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(request: PrivacyRequest, status: PrivacyRequestStatus, resolutionNote?: string) {
    setError("");
    setSuccess("");

    try {
      const updated = await api.updatePrivacyRequestStatus(request.id, { status, resolutionNote });
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Status de privacidade atualizado com auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o status.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isPatientOnly ? "Meus direitos" : "Privacidade e DPO"}
        title={isPatientOnly ? "Solicitacoes de privacidade" : "Direitos do titular"}
        description={
          isPatientOnly
            ? "Registre solicitacoes de acesso, correcao ou outros direitos. O atendimento formal depende de validacao operacional e juridica."
            : "Fila operacional para registrar, acompanhar e auditar solicitacoes de titulares com minimizacao de dados."
        }
      />

      {error && <ErrorBanner message={error} />}
      {success && <AlertBanner tone="success" message={success} />}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">Solicitacoes abertas</p>
              <p className="mt-2 text-3xl font-bold text-ink">{openRequests}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 shrink-0 text-teal-700" size={20} />
            <p className="text-sm leading-6 text-slate-500">
              Use este fluxo para protocolo e acompanhamento. Nao registre CPF completo, senha, token,
              diagnostico, prontuario, observacao clinica ou conteudo de chamada nos campos livres.
            </p>
          </div>
        </Card>
      </section>

      <section className="mt-7 grid gap-7 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink">Nova solicitacao</h2>
          <form className="mt-5 space-y-4" onSubmit={createRequest}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Solicitante</span>
              <TextInput
                value={form.requesterName}
                onChange={(event) => setForm((current) => ({ ...current, requesterName: event.target.value }))}
                disabled={isPatientOnly}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">E-mail de contato</span>
              <TextInput
                type="email"
                value={form.requesterEmail}
                onChange={(event) => setForm((current) => ({ ...current, requesterEmail: event.target.value }))}
                disabled={isPatientOnly}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Referencia minimizada</span>
              <TextInput
                value={form.subjectReference}
                onChange={(event) => setForm((current) => ({ ...current, subjectReference: event.target.value }))}
                placeholder="E-mail, protocolo ou referencia mascarada"
                disabled={isPatientOnly}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Tipo</span>
              <SelectInput
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PrivacyRequestType }))}
              >
                {requestTypes.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </SelectInput>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">Descricao</span>
              <TextArea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descreva o pedido sem incluir dado clinico ou documento completo."
                required
              />
            </label>
            <Button type="submit" className="w-full" isLoading={saving}>
              Registrar solicitacao
            </Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-ink">Fila de privacidade</h2>
            <p className="mt-1 text-xs text-slate-400">
              Acompanhamento operacional. Decisoes finais dependem de validacao juridica/DPO quando aplicavel.
            </p>
          </div>

          {loading ? (
            <LoadingState label="Carregando solicitacoes..." />
          ) : requests.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileText size={22} />}
                title="Nenhuma solicitacao registrada"
                description="As solicitacoes de privacidade aparecerao aqui conforme forem abertas."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <PrivacyRequestItem
                  key={request.id}
                  request={request}
                  canUpdate={canUpdate}
                  onUpdate={updateStatus}
                />
              ))}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}

function PrivacyRequestItem({
  request,
  canUpdate,
  onUpdate,
}: {
  request: PrivacyRequest;
  canUpdate: boolean;
  onUpdate: (request: PrivacyRequest, status: PrivacyRequestStatus, resolutionNote?: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<PrivacyRequestStatus>(request.status);
  const [note, setNote] = useState(request.resolutionNote ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(request.status);
    setNote(request.resolutionNote ?? "");
  }, [request]);

  async function submitUpdate() {
    setSaving(true);
    try {
      await onUpdate(request, status, note);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[request.status]}>{statusLabel[request.status]}</Badge>
            <Badge tone="neutral">{typeLabel[request.type]}</Badge>
          </div>
          <h3 className="mt-3 font-bold text-ink">{request.requesterName}</h3>
          <p className="mt-1 text-sm text-slate-500">{request.requesterEmail}</p>
          <p className="mt-2 text-xs text-slate-400">Referencia: {request.subjectReference}</p>
        </div>
        <p className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleString("pt-BR")}</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{request.description}</p>

      {canUpdate ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as PrivacyRequestStatus)}>
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </SelectInput>
          <TextInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Nota operacional minimizada"
          />
          <Button type="button" variant="secondary" onClick={submitUpdate} isLoading={saving}>
            Atualizar
          </Button>
        </div>
      ) : request.resolutionNote ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{request.resolutionNote}</p>
      ) : null}
    </article>
  );
}
