"use client";

import { Card, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader } from "@/components/ui";
import type { AuditEvent } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { CheckCircle2, ListChecks, LockKeyhole, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AuditPage() {
  const roles = getSession()?.user.roles ?? [];
  const isCompanyAuditor = roles.includes("CompanyAuditor");
  const isGlobalAuditor = roles.some((role) =>
    ["PlatformAuditor", "DataProtectionOfficer", "PrivacyAuditor"].includes(role),
  );
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAuditEvents()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar auditoria."))
      .finally(() => setLoading(false));
  }, []);

  const deniedEvents = useMemo(
    () => events.filter((event) => event.result.toLowerCase() !== "success"),
    [events],
  );
  const clinicalEvents = useMemo(
    () => events.filter((event) => /patient|appointment|consultation|room/i.test(event.resourceType)),
    [events],
  );

  return (
    <>
      <PageHeader
        eyebrow={isCompanyAuditor ? "Auditoria do CNPJ" : "Rastreabilidade"}
        title={isCompanyAuditor ? "Auditoria operacional" : "Auditoria da plataforma"}
        description={
          isCompanyAuditor
            ? "Eventos administrativos, acessos e tentativas negadas do escopo empresarial. Sem prontuario, diagnostico ou conteudo de chamada."
            : "Trilha de eventos para seguranca, suporte e privacidade. Acesso global exige finalidade, minimizacao e revisao formal."
        }
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando trilha de auditoria..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Eventos" value={events.length} detail="ultimos registros" icon={<ListChecks size={20} />} tone="info" />
            <MetricCard label="Sucesso" value={events.length - deniedEvents.length} detail="acoes permitidas" icon={<CheckCircle2 size={20} />} tone="success" />
            <MetricCard label="Negados" value={deniedEvents.length} detail="revisao recomendada" icon={<XCircle size={20} />} tone={deniedEvents.length ? "warning" : "neutral"} />
            <MetricCard label="Dados sensiveis" value={clinicalEvents.length} detail="eventos com escopo assistencial" icon={<LockKeyhole size={20} />} tone="warning" />
          </section>

          <Card className="mt-7 overflow-hidden">
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {isGlobalAuditor ? "Escopo global com minimizacao" : "Escopo administrativo autorizado"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Auditoria nao concede permissao para alterar operacao nem para expor conteudo clinico fora da finalidade aprovada.
                  </p>
                </div>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ListChecks size={22} />}
                  title="Nenhum evento registrado"
                  description="Os eventos aparecem conforme o ambiente for utilizado."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.1fr_1fr_1fr_.7fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                    <span>Data</span>
                    <span>Acao</span>
                    <span>Recurso</span>
                    <span>Resultado</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {events.map((event) => (
                      <article key={event.id} className="grid grid-cols-[1.1fr_1fr_1fr_.7fr] gap-4 px-6 py-4 text-sm">
                        <span className="text-slate-500">{new Date(event.createdAt).toLocaleString("pt-BR")}</span>
                        <span className="font-semibold text-ink">{event.action}</span>
                        <span className="text-slate-500">
                          {event.resourceType}{event.resourceId ? ` - ${event.resourceId.slice(0, 8)}` : ""}
                        </span>
                        <span className={event.result === "Success" ? "font-bold text-teal-600" : "font-bold text-red-600"}>
                          {event.result}
                        </span>
                      </article>
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
