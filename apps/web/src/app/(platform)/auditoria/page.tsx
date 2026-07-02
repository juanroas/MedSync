"use client";

import { EmptyState, ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import type { AuditEvent } from "@/lib/types";
import { api } from "@/services/api";
import { ListChecks } from "lucide-react";
import { useEffect, useState } from "react";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAuditEvents()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar auditoria."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Rastreabilidade"
        title="Auditoria"
        description="Últimos 200 eventos de segurança e acesso registrados para esta clínica."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando trilha de auditoria..." />
      ) : events.length === 0 ? (
        <EmptyState icon={<ListChecks size={22} />} title="Nenhum evento registrado" description="Os eventos aparecerão conforme o sistema for utilizado." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.1fr_1fr_1fr_.7fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400 md:grid">
            <span>Data</span><span>Ação</span><span>Recurso</span><span>Resultado</span>
          </div>
          <div className="divide-y divide-slate-100">
            {events.map((event) => (
              <article key={event.id} className="grid gap-2 px-6 py-4 text-sm md:grid-cols-[1.1fr_1fr_1fr_.7fr] md:gap-4">
                <span className="text-slate-500">{new Date(event.createdAt).toLocaleString("pt-BR")}</span>
                <span className="font-semibold text-ink">{event.action}</span>
                <span className="text-slate-500">{event.resourceType}{event.resourceId ? ` · ${event.resourceId.slice(0, 8)}` : ""}</span>
                <span className={event.result === "Success" ? "text-teal-600" : "text-red-600"}>{event.result}</span>
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
