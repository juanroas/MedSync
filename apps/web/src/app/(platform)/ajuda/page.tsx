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
import type { SupportRequest, SupportRequestStatus } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { LifeBuoy, MessageCircleQuestion } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const statusOptions: Array<{ value: SupportRequestStatus; label: string }> = [
  { value: "New", label: "Nova" },
  { value: "InProgress", label: "Em atendimento" },
  { value: "Resolved", label: "Resolvida" },
];

const statusTone: Record<SupportRequestStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  New: "info",
  InProgress: "warning",
  Resolved: "success",
};

const statusLabel = Object.fromEntries(statusOptions.map((item) => [item.value, item.label])) as Record<
  SupportRequestStatus,
  string
>;

export default function HelpPage() {
  const session = getSession();
  const roles = session?.user.roles ?? [];
  const canOperate = roles.some((role) => ["Support", "MedicalDirector"].includes(role));
  // Support answers the queue; opening a request to itself would be a fake action.
  const canCreate = !roles.includes("Support");

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ subject: "", description: "" });

  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get("subject");
    if (prefill) setForm((current) => ({ ...current, subject: prefill }));
  }, []);

  useEffect(() => {
    api.getSupportRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar solicitacoes."))
      .finally(() => setLoading(false));
  }, []);

  const openRequests = useMemo(
    () => requests.filter((request) => request.status !== "Resolved").length,
    [requests],
  );

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await api.createSupportRequest(form);
      setRequests((current) => [created, ...current]);
      setForm({ subject: "", description: "" });
      setSuccess("Solicitacao enviada. O suporte MedSync vai responder por aqui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar a solicitacao.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(request: SupportRequest, status: SupportRequestStatus, resolutionNote?: string) {
    setError("");
    setSuccess("");

    try {
      const updated = await api.updateSupportRequestStatus(request.id, { status, resolutionNote });
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess("Status da solicitacao atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o status.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={canOperate ? "Central de suporte" : "Ajuda"}
        title={canOperate ? "Fila de ajuda" : "Precisa de ajuda?"}
        description={
          canOperate
            ? "Solicitacoes de ajuda abertas por pacientes e equipe. Responda e atualize o status conforme o atendimento avanca."
            : "Descreva o que voce precisa e o suporte MedSync responde por aqui. Para pedidos formais de dados pessoais (LGPD), use a tela de Privacidade."
        }
      />

      {error && <ErrorBanner message={error} />}
      {success && <AlertBanner tone="success" message={success} />}

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
              <LifeBuoy size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">
                {canOperate ? "Solicitacoes abertas" : "Suas solicitacoes abertas"}
              </p>
              <p className="mt-2 text-3xl font-bold text-ink">{openRequests}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-3">
            <MessageCircleQuestion className="mt-1 shrink-0 text-teal-700" size={20} />
            <p className="text-sm leading-6 text-slate-500">
              Use este canal para duvidas de uso, problemas de acesso ou apoio operacional. Nao inclua senha,
              token, CPF completo ou dado clinico nos campos livres.
            </p>
          </div>
        </Card>
      </section>

      <section className={`mt-7 grid gap-7 ${canCreate ? "xl:grid-cols-[420px_1fr]" : ""}`}>
        {canCreate && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink">Nova solicitacao</h2>
            <form className="mt-5 space-y-4" onSubmit={createRequest}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Assunto</span>
                <TextInput
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Ex: Nao consigo entrar na videochamada"
                  maxLength={160}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Descricao</span>
                <TextArea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Descreva o que esta acontecendo..."
                  maxLength={1000}
                  required
                />
              </label>
              <Button type="submit" className="w-full" isLoading={saving}>
                Enviar para o suporte
              </Button>
            </form>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-ink">{canOperate ? "Fila de ajuda" : "Minhas solicitacoes"}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {canOperate
                ? "Atualize o status conforme o atendimento avanca."
                : "Acompanhe aqui as respostas do suporte MedSync."}
            </p>
          </div>

          {loading ? (
            <LoadingState label="Carregando solicitacoes..." />
          ) : requests.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<LifeBuoy size={22} />}
                title="Nenhuma solicitacao registrada"
                description="Suas solicitacoes de ajuda aparecerao aqui."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <SupportRequestItem
                  key={request.id}
                  request={request}
                  canUpdate={canOperate}
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

function SupportRequestItem({
  request,
  canUpdate,
  onUpdate,
}: {
  request: SupportRequest;
  canUpdate: boolean;
  onUpdate: (request: SupportRequest, status: SupportRequestStatus, resolutionNote?: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<SupportRequestStatus>(request.status);
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
          </div>
          <h3 className="mt-3 font-bold text-ink">{request.subject}</h3>
          {canUpdate && (
            <p className="mt-1 text-sm text-slate-500">
              {request.requesterName} · {request.requesterEmail}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleString("pt-BR")}</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{request.description}</p>

      {canUpdate ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-[180px_1fr_auto]">
          <SelectInput value={status} onChange={(event) => setStatus(event.target.value as SupportRequestStatus)}>
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </SelectInput>
          <TextInput
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Resposta ou nota de atendimento"
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
