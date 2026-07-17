"use client";

import { Button, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { ClinicalRecordAttachment } from "@/lib/types";
import { api } from "@/services/api";
import { Download, FileText, LoaderCircle, Paperclip, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function ClinicalAttachmentsPanel({
  appointmentId,
  canUpload,
  variant = "light",
}: {
  appointmentId: string;
  canUpload: boolean;
  variant?: "light" | "dark";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<ClinicalRecordAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isDark = variant === "dark";

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await api.getClinicalRecordAttachments(appointmentId);
        if (active) setAttachments(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Nao foi possivel carregar anexos.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");
    if (!file) return;

    if (!isAllowedFile(file)) {
      setError("Envie apenas PDF, JPG ou PNG com ate 10 MB.");
      return;
    }

    setUploading(true);
    try {
      const attachment = await api.uploadClinicalRecordAttachment(appointmentId, file);
      setAttachments((current) => [attachment, ...current]);
      setMessage("Anexo adicionado ao prontuario.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel anexar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-lg border",
        isDark ? "border-white/10 bg-white/5 p-4" : "border-slate-200/80 bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4",
          isDark ? "pb-4" : "border-b border-slate-100 px-6 py-5",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg",
              isDark ? "bg-teal-300/10 text-teal-200" : "bg-teal-50 text-teal-700",
            )}
          >
            <Paperclip size={18} />
          </span>
          <div>
            <h2 className={cn("font-bold", isDark ? "text-white" : "text-ink")}>Anexos clinicos</h2>
            <p className={cn("mt-1 text-xs leading-5", isDark ? "text-white/50" : "text-slate-400")}>
              PDF, JPG ou PNG. Arquivos ficam restritos ao prontuario e geram auditoria.
            </p>
          </div>
        </div>

        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="hidden"
              onChange={upload}
              disabled={uploading}
            />
            {isDark ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-300 px-3 text-xs font-bold text-[#15221f] transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <LoaderCircle className="animate-spin" size={15} /> : <Upload size={15} />}
                Anexar
              </button>
            ) : (
              <Button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                isLoading={uploading}
                className="shrink-0"
              >
                <Upload size={16} /> Anexar
              </Button>
            )}
          </>
        )}
      </div>

      <div className={cn(isDark ? "space-y-3" : "px-6 py-5")}>
        {error && (
          <div
            className={cn(
              "mb-3 rounded-lg border px-3 py-2 text-xs leading-5",
              isDark ? "border-red-300/30 bg-red-300/10 text-red-100" : "border-red-100 bg-red-50 text-red-700",
            )}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            className={cn(
              "mb-3 rounded-lg border px-3 py-2 text-xs leading-5",
              isDark
                ? "border-teal-300/30 bg-teal-300/10 text-teal-100"
                : "border-teal-100 bg-teal-50 text-teal-700",
            )}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-white/50" : "text-slate-500")}>
            <LoaderCircle className="animate-spin" size={16} /> Carregando anexos...
          </div>
        ) : attachments.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border border-dashed px-4 py-8 text-center text-sm",
              isDark ? "border-white/10 text-white/45" : "border-slate-200 text-slate-500",
            )}
          >
            Nenhum anexo registrado neste prontuario.
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <article
                key={attachment.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border p-3",
                  isDark ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg",
                      isDark ? "bg-white/5 text-teal-200" : "bg-white text-teal-700",
                    )}
                  >
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-bold", isDark ? "text-white" : "text-ink")}>
                      {attachment.fileName}
                    </p>
                    <p className={cn("mt-0.5 text-xs", isDark ? "text-white/40" : "text-slate-400")}>
                      {formatFileSize(attachment.sizeBytes)} - {formatDateTime(attachment.createdAt)}
                    </p>
                  </div>
                </div>
                <a
                  href={api.clinicalRecordAttachmentDownloadUrl(appointmentId, attachment.id)}
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border transition",
                    isDark
                      ? "border-white/10 bg-white/5 text-white/70 hover:border-teal-300/30 hover:text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700",
                  )}
                  aria-label={`Baixar ${attachment.fileName}`}
                >
                  <Download size={16} />
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  const hasAllowedExtension =
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png");
  const hasAllowedType =
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png";
  return hasAllowedExtension && hasAllowedType && file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES;
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
