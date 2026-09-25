"use client";

import { useRealtimeRefresh } from "@/lib/realtime";

import { AlertBanner, Badge, Button, Card, ErrorBanner, LoadingState, PageHeader, SelectInput, TextArea, TextInput, cn } from "@/components/ui";
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType, SupportRequest, SupportRequestStatus } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { LifeBuoy, ShieldCheck } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

// Ajuda do paciente (Fase 3): um lugar só para pedir ajuda. "Pedido sobre meus dados" continua indo para a fila
// do encarregado (DPO), separada da do Suporte; a LGPD exige o canal (arts. 18 e 41), não um item de menu próprio.

type Kind = "support" | "privacy";

const privacyTypes: Array<{ value: PrivacyRequestType; label: string }> = [
  { value: "Access", label: "Ver quais dados vocês têm sobre mim" },
  { value: "Correction", label: "Corrigir meus dados" },
  { value: "Deletion", label: "Excluir ou anonimizar meus dados" },
  { value: "Portability", label: "Levar meus dados para outro serviço" },
  { value: "ConsentRevocation", label: "Retirar um consentimento" },
  { value: "Other", label: "Outro pedido sobre meus dados" },
];
const privacyTypeLabel = Object.fromEntries(privacyTypes.map((item) => [item.value, item.label])) as Record<PrivacyRequestType, string>;

const supportStatus: Record<SupportRequestStatus, { label: string; tone: "info" | "warning" | "success" }> = {
  New: { label: "Recebida", tone: "info" },
  InProgress: { label: "Em atendimento", tone: "warning" },
  Resolved: { label: "Resolvida", tone: "success" },
};
const privacyStatus: Record<PrivacyRequestStatus, { label: string; tone: "info" | "warning" | "success" | "error" }> = {
  New: { label: "Recebido", tone: "info" },
  InReview: { label: "Em análise", tone: "warning" },
  WaitingRequester: { label: "Aguardando você", tone: "warning" },
  Resolved: { label: "Respondido", tone: "success" },
  Rejected: { label: "Não atendido", tone: "error" },
};

type Item =
  | { kind: "support"; createdAt: string; request: SupportRequest }
  | { kind: "privacy"; createdAt: string; request: PrivacyRequest };

export function PatientHelp() {
  const session = getSession();
  const [kind, setKind] = useState<Kind>("support");
  const [support, setSupport] = useState<SupportRequest[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supportForm, setSupportForm] = useState({ subject: "", description: "" });
  const [privacyForm, setPrivacyForm] = useState({ type: "Access" as PrivacyRequestType, description: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tipo") === "lgpd") setKind("privacy");
    const subject = params.get("subject");
    if (subject) setSupportForm((current) => ({ ...current, subject }));
  }, []);

  const load = useCallback(
    () =>
      Promise.all([api.getSupportRequests(), api.getPrivacyRequests()])
        .then(([supportData, privacyData]) => {
          setSupport(supportData);
          setPrivacy(privacyData);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar suas solicitações."))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  // Answers from Support or the DPO show up without reloading.
  useRealtimeRefresh(["supportRequestChanged", "privacyRequestChanged"], load);

  const items = useMemo<Item[]>(
    () =>
      [
        ...support.map((request): Item => ({ kind: "support", createdAt: request.createdAt, request })),
        ...privacy.map((request): Item => ({ kind: "privacy", createdAt: request.createdAt, request })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [privacy, support],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (kind === "support") {
        const created = await api.createSupportRequest(supportForm);
        setSupport((current) => [created, ...current]);
        setSupportForm({ subject: "", description: "" });
        setSuccess("Pedido enviado. O suporte MedSync responde por aqui.");
      } else {
        const created = await api.createPrivacyRequest({
          requesterName: session?.user.name ?? "",
          requesterEmail: session?.user.email ?? "",
          subjectReference: "Próprio titular autenticado",
          type: privacyForm.type,
          description: privacyForm.description,
        });
        setPrivacy((current) => [created, ...current]);
        setPrivacyForm({ type: "Access", description: "" });
        setSuccess("Pedido registrado. O encarregado de dados responde por aqui em até 15 dias.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Ajuda"
        title="Precisa de ajuda?"
        description="Tire uma dúvida, relate um problema ou faça um pedido sobre os seus dados pessoais."
      />
      {error && <ErrorBanner message={error} />}
      {success && <AlertBanner tone="success" message={success} />}

      <section className="grid gap-7 xl:grid-cols-[440px_1fr]">
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Tipo de pedido">
            {(
              [
                ["support", "Dúvida ou problema"],
                ["privacy", "Pedido sobre meus dados"],
              ] as Array<[Kind, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "h-10 rounded-md text-xs font-bold transition",
                  kind === value ? "bg-white text-teal-800 shadow-sm" : "text-slate-500 hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {kind === "support" ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Assunto</span>
                  <TextInput
                    value={supportForm.subject}
                    onChange={(event) => setSupportForm({ ...supportForm, subject: event.target.value })}
                    placeholder="Ex.: Não consigo entrar na videochamada"
                    maxLength={160}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">O que está acontecendo?</span>
                  <TextArea
                    value={supportForm.description}
                    onChange={(event) => setSupportForm({ ...supportForm, description: event.target.value })}
                    maxLength={1000}
                    required
                  />
                </label>
                <p className="text-xs leading-5 text-slate-500">Não escreva senha, CPF completo ou informação de saúde.</p>
                <Button type="submit" className="w-full" isLoading={saving}>
                  Enviar para o suporte
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-3 rounded-lg border border-teal-100 bg-teal-50 p-4 text-xs leading-5 text-teal-900">
                  <ShieldCheck size={18} className="shrink-0 text-teal-700" />
                  <p>
                    Pedidos sobre seus dados vão para o encarregado de dados (DPO) do MedSync, e não para o suporte. A
                    resposta vem por aqui em até 15 dias (LGPD, art. 19).
                  </p>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">O que você quer?</span>
                  <SelectInput
                    value={privacyForm.type}
                    onChange={(event) => setPrivacyForm({ ...privacyForm, type: event.target.value as PrivacyRequestType })}
                  >
                    {privacyTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </SelectInput>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Detalhes do pedido</span>
                  <TextArea
                    value={privacyForm.description}
                    onChange={(event) => setPrivacyForm({ ...privacyForm, description: event.target.value })}
                    maxLength={1000}
                    placeholder="Explique o pedido sem incluir documentos ou informações de saúde."
                    required
                  />
                </label>
                <Button type="submit" className="w-full" isLoading={saving}>
                  Enviar pedido sobre meus dados
                </Button>
              </>
            )}
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-ink">Minhas solicitações</h2>
            <p className="mt-1 text-xs text-slate-500">Respostas do suporte e do encarregado de dados aparecem aqui.</p>
          </div>
          {loading ? (
            <LoadingState label="Carregando suas solicitações..." />
          ) : items.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              <LifeBuoy size={20} className="mx-auto mb-2 text-slate-300" />
              Você ainda não fez nenhum pedido.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const status = item.kind === "support" ? supportStatus[item.request.status as SupportRequestStatus] : privacyStatus[item.request.status as PrivacyRequestStatus];
                const title = item.kind === "support" ? item.request.subject : privacyTypeLabel[item.request.type];
                return (
                  <li key={`${item.kind}-${item.request.id}`} className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={item.kind === "support" ? "neutral" : "info"}>{item.kind === "support" ? "Ajuda" : "Meus dados"}</Badge>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <h3 className="mt-3 font-bold text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.request.description}</p>
                    {item.request.resolutionNote && (
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        <span className="font-semibold">Resposta: </span>
                        {item.request.resolutionNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
