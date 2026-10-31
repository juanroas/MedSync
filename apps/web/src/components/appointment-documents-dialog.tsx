"use client";

import { Dialog } from "@/components/dialog";
import { AlertBanner, LoadingState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { AppointmentDocumentItem } from "@/lib/types";
import { api } from "@/services/api";
import { Download, FileText, FlaskConical, Pill } from "lucide-react";
import { useEffect, useState } from "react";

// "Documentos da consulta" do paciente (28/10/2026): receitas, laudos e a declaração de comparecimento, só depois
// que o médico assina (regra D5: cópia ao paciente). Rascunho nunca aparece aqui; a API nem devolve.
// onClose precisa ser estável (useCallback): o Dialog devolve e retoma o foco quando ele muda.
export function AppointmentDocumentsDialog({
  appointmentId,
  doctorName,
  onClose,
}: {
  appointmentId: string;
  doctorName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<AppointmentDocumentItem[] | null>(null);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  useEffect(() => {
    api
      .getAppointmentDocuments(appointmentId)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar os documentos."));
  }, [appointmentId]);

  async function download(item: AppointmentDocumentItem) {
    setDownloadingId(item.id);
    setError("");
    try {
      await api.downloadAppointmentDocument(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível baixar o documento.");
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <Dialog open title="Documentos da consulta" description={`Assinados por ${doctorName}.`} onClose={onClose}>
      {error && <AlertBanner tone="error" message={error} />}
      {!items && !error ? (
        <LoadingState label="Carregando documentos..." />
      ) : items && items.length === 0 ? (
        <p className="text-sm text-slate-500">O médico ainda não emitiu documentos para esta consulta.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {items?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  {item.type === "Prescription" ? <Pill size={16} /> : <FileText size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{item.title}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(item.issuedAt)}
                    {item.simulated && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-amber-700">
                        <FlaskConical size={11} /> simulação
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => download(item)}
                disabled={downloadingId === item.id}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-teal-700 hover:border-teal-200 hover:bg-teal-50 disabled:text-slate-300"
              >
                <Download size={14} /> {downloadingId === item.id ? "Baixando..." : "Baixar PDF"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
