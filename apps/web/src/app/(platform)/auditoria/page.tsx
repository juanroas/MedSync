"use client";

import { Badge, Card, EmptyState, ErrorBanner, LoadingState, MetricCard, PageHeader, SelectInput, TextInput } from "@/components/ui";
import type { AuditEvent } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { CheckCircle2, Filter, ListChecks, LockKeyhole, Search, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const resultLabels: Record<string, string> = {
  Success: "Permitido",
  Denied: "Negado",
};

export default function AuditPage() {
  const roles = getSession()?.user.roles ?? [];
  const isCompanyAuditor = roles.includes("CompanyAuditor");
  const isGlobalAuditor = roles.some((role) =>
    ["PlatformAuditor", "DataProtectionOfficer", "PrivacyAuditor"].includes(role),
  );
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [query, setQuery] = useState("");

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
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesResult =
        resultFilter === "all" ||
        (resultFilter === "denied" && event.result.toLowerCase() !== "success") ||
        (resultFilter === "success" && event.result.toLowerCase() === "success");

      const searchable = [
        event.action,
        event.resourceType,
        event.resourceId ?? "",
        event.result,
        event.reason ?? "",
      ].join(" ").toLowerCase();

      return matchesResult && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [events, query, resultFilter]);
  const reviewEvents = deniedEvents.slice(0, 3);

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
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
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

                <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={18} />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Eventos que exigem revisao</p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">
                        Tentativas negadas devem ser avaliadas sem expor prontuario, diagnostico, CPF completo, token ou conteudo da chamada.
                      </p>
                    </div>
                  </div>
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
              <>
                <div className="grid gap-4 border-b border-slate-100 p-6 lg:grid-cols-[1fr_220px]">
                  <label className="relative block">
                    <span className="sr-only">Buscar eventos</span>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <TextInput
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar por acao, recurso, resultado ou motivo"
                      className="pl-10"
                    />
                  </label>
                  <label className="relative block">
                    <span className="sr-only">Filtrar por resultado</span>
                    <Filter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <SelectInput
                      value={resultFilter}
                      onChange={(event) => setResultFilter(event.target.value)}
                      className="pl-10"
                    >
                      <option value="all">Todos os resultados</option>
                      <option value="denied">Somente negados</option>
                      <option value="success">Somente permitidos</option>
                    </SelectInput>
                  </label>
                </div>

                {reviewEvents.length > 0 && (
                  <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-5">
                    <p className="text-xs font-bold uppercase text-slate-400">Ultimas tentativas negadas</p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {reviewEvents.map((event) => (
                        <article key={event.id} className="rounded-lg border border-red-100 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-ink">{event.action}</p>
                            <Badge tone="error">Negado</Badge>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">{event.resourceType}</p>
                          {event.reason && <p className="mt-3 text-xs leading-5 text-red-700">{event.reason}</p>}
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {filteredEvents.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={<Search size={22} />}
                      title="Nenhum evento encontrado"
                      description="Ajuste os filtros para consultar outros eventos da trilha."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[920px]">
                      <div className="grid grid-cols-[1.05fr_1fr_1fr_.75fr_1.2fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                        <span>Data</span>
                        <span>Acao</span>
                        <span>Recurso</span>
                        <span>Resultado</span>
                        <span>Motivo</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {filteredEvents.map((event) => (
                          <article key={event.id} className="grid grid-cols-[1.05fr_1fr_1fr_.75fr_1.2fr] gap-4 px-6 py-4 text-sm">
                            <span className="text-slate-500">{new Date(event.createdAt).toLocaleString("pt-BR")}</span>
                            <span className="font-semibold text-ink">{event.action}</span>
                            <span className="text-slate-500">
                              {event.resourceType}{event.resourceId ? ` - ${event.resourceId.slice(0, 8)}` : ""}
                            </span>
                            <span>
                              <Badge tone={event.result === "Success" ? "success" : "error"}>
                                {resultLabels[event.result] ?? event.result}
                              </Badge>
                            </span>
                            <span className={event.reason ? "text-slate-600" : "text-slate-400"}>
                              {event.reason ?? "Sem observacao adicional"}
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}
