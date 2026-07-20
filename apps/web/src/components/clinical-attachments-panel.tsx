"use client";

import { Button, cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { ClinicalRecordAttachment } from "@/lib/types";
import { api } from "@/services/api";
import { Download, FileText, LoaderCircle, Paperclip, Trash2, Upload, X } from "lucide-react";
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
  const [deletingId, setDeletingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ClinicalRecordAttachment | null>(null);
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

  async function deleteAttachment() {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);
    setError("");
    setMessage("");
    try {
      await api.deleteClinicalRecordAttachment(appointmentId, pendingDelete.id);
      setAttachments((current) => current.filter((item) => item.id !== pendingDelete.id));
      setMessage("Anexo excluido do prontuario.");
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir o anexo.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
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
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={api.clinicalRecordAttachmentDownloadUrl(appointmentId, attachment.id)}
                      className={cn(
                        "grid size-9 place-items-center rounded-lg border transition",
                        isDark
                          ? "border-white/10 bg-white/5 text-white/70 hover:border-teal-300/30 hover:text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700",
                      )}
                      aria-label={`Baixar ${attachment.fileName}`}
                    >
                      <Download size={16} />
                    </a>
                    {attachment.canDelete && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(attachment)}
                        disabled={deletingId === attachment.id}
                        className={cn(
                          "grid size-9 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60",
                          isDark
                            ? "border-red-300/20 bg-red-300/10 text-red-100 hover:border-red-200/40 hover:bg-red-300/15"
                            : "border-red-100 bg-white text-red-600 hover:bg-red-50",
                        )}
                        aria-label={`Excluir ${attachment.fileName}`}
                      >
                        {deletingId === attachment.id ? (
                          <LoaderCircle className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {pendingDelete && (
        <ConfirmDeleteDialog
          attachment={pendingDelete}
          isDeleting={deletingId === pendingDelete.id}
          isDark={isDark}
          onCancel={() => setPendingDelete(null)}
          onConfirm={deleteAttachment}
        />
      )}
    </>
  );
}

function ConfirmDeleteDialog({
  attachment,
  isDeleting,
  isDark,
  onCancel,
  onConfirm,
}: {
  attachment: ClinicalRecordAttachment;
  isDeleting: boolean;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-attachment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
      onClick={isDeleting ? undefined : onCancel}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-lg border p-6 shadow-2xl",
          isDark ? "border-white/10 bg-[#15221f] text-white" : "border-slate-200 bg-white text-ink",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-[0.08em]", isDark ? "text-red-100" : "text-red-600")}>
              Confirmar exclusao
            </p>
            <h2 id="delete-attachment-title" className="mt-2 text-xl font-bold">
              Excluir anexo?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60",
              isDark ? "border-white/10 text-white/60 hover:bg-white/5" : "border-slate-200 text-slate-500 hover:bg-slate-50",
            )}
            aria-label="Fechar confirmacao"
          >
            <X size={17} />
          </button>
        </div>

        <p className={cn("mt-4 text-sm leading-6", isDark ? "text-white/65" : "text-slate-600")}>
          O arquivo <strong>{attachment.fileName}</strong> sera removido da lista do prontuario.
          A acao gera trilha de auditoria.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-lg border px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
              isDark ? "border-white/10 text-white/70 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-50",
            )}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && <LoaderCircle className="animate-spin" size={17} />}
            Excluir anexo
          </button>
        </div>
      </div>
    </div>
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
