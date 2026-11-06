"use client";

import { useRealtimeRefresh } from "@/lib/realtime";

import { useConfirm } from "@/components/dialog";
import { AlertBanner, Badge, Button, Card, TextArea, TextInput, secondaryButtonClass } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { AppointmentMedicalDocuments, AppointmentStatus, MedicalDocument } from "@/lib/types";
import { api } from "@/services/api";
import { CalendarCheck, FilePen, FileText, FlaskConical, MessageCircle, Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

// Laudos, solicitações de exames e declaração de comparecimento (.agents/rules/medical-documents.md). Só o médico da
// consulta vê este painel. O paciente só recebe o documento depois de assinado; rascunho nunca sai daqui.

const titleSuggestions = ["Laudo médico", "Relatório médico", "Orientações ao paciente", "Encaminhamento"];
const EXAM_REQUEST_TITLE = "Solicitação de exames";
const commonExams = [
  "Hemograma completo",
  "Glicemia de jejum",
  "Hemoglobina glicada",
  "Colesterol total e frações",
  "Triglicerídeos",
  "Creatinina",
  "Ureia",
  "TGO",
  "TGP",
  "TSH",
  "T4 livre",
  "Urina tipo 1",
];

type Form =
  | { kind: "Report" | "ExamRequest"; id?: string; title: string; body: string; patientLocation: string }
  | { kind: "AttendanceDeclaration"; id?: string; date: string; start: string; end: string };

const brazilDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const brazilTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// WhatsApp (06/11/2026): a wa.me link with a short message and the document page, which asks for login. Never the PDF
// and never the title, which may tell what the consultation was about (rules D5 and C5).
function openWhatsApp(phone: string | null | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits.length >= 12 ? digits : "";
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

// Brazil has had no daylight saving time since 2019: the time typed by the doctor is always UTC-3.
function toUtc(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

export function MedicalDocumentsPanel({
  appointmentId,
  status,
  scheduledAt,
  inPerson = false,
  mode = "reports",
  locked = false,
  patientName = "",
  doctorName = "",
  forGuardian = false,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  scheduledAt: string;
  inPerson?: boolean;
  // Each prontuário tab shows its own kinds: laudos and declaration, or exam requests.
  mode?: "reports" | "exams";
  // Closed consultation: everything stays visible, nothing changes.
  locked?: boolean;
  patientName?: string;
  doctorName?: string;
  // A minor: the message goes to the legal guardian, who owns the account.
  forGuardian?: boolean;
}) {
  const [data, setData] = useState<AppointmentMedicalDocuments | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(async () => {
    setData(await api.getAppointmentMedicalDocuments(appointmentId));
  }, [appointmentId]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar os documentos."));
  }, [load]);
  // Signed in another tab (the document page): the list catches up.
  useRealtimeRefresh(["appointmentChanged"], () => load().catch(() => undefined), appointmentId);

  const exams = mode === "exams";
  const documents = (data?.documents ?? []).filter((document) => (document.kind === "ExamRequest") === exams);
  const declaration = documents.find((document) => document.kind === "AttendanceDeclaration");
  const cancelled = status === "Cancelled";
  const completed = status === "Completed";
  const readOnly = cancelled || locked;

  function startReport() {
    setMessage("");
    setForm({
      kind: exams ? "ExamRequest" : "Report",
      title: exams ? EXAM_REQUEST_TITLE : "Laudo médico",
      body: "",
      patientLocation: data?.suggestedPatientLocation ?? "",
    });
  }

  function startDeclaration() {
    setMessage("");
    const start = new Date(data?.suggestedStartedAt ?? scheduledAt);
    const end = new Date(data?.suggestedEndedAt ?? scheduledAt);
    setForm({ kind: "AttendanceDeclaration", date: brazilDate.format(start), start: brazilTime.format(start), end: brazilTime.format(end) });
  }

  function edit(document: MedicalDocument) {
    setMessage("");
    if (document.kind !== "AttendanceDeclaration") {
      setForm({ kind: document.kind, id: document.id, title: document.title, body: document.body, patientLocation: document.patientLocation ?? "" });
      return;
    }
    const start = new Date(document.attendanceStartedAt ?? scheduledAt);
    const end = new Date(document.attendanceEndedAt ?? scheduledAt);
    setForm({ kind: "AttendanceDeclaration", id: document.id, date: brazilDate.format(start), start: brazilTime.format(start), end: brazilTime.format(end) });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    const input =
      form.kind === "AttendanceDeclaration"
        ? { kind: form.kind, attendanceStartedAt: toUtc(form.date, form.start), attendanceEndedAt: toUtc(form.date, form.end) }
        : { kind: form.kind, title: form.title, body: form.body, patientLocation: form.patientLocation };
    try {
      if (form.id) await api.updateMedicalDocument(form.id, input);
      else await api.createMedicalDocument(appointmentId, input);
      setForm(null);
      setMessage("Rascunho salvo. Abra em “Ver e assinar”: o paciente só recebe depois da assinatura.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o documento.");
    } finally {
      setSaving(false);
    }
  }

  function sendByWhatsApp(document: MedicalDocument) {
    const link = `${window.location.origin}/documento/${document.id}`;
    const firstName = patientName.split(" ")[0];
    const greeting = forGuardian
      ? `Olá! ${doctorName} enviou um documento da consulta de ${firstName} no MedSync.`
      : `Olá, ${firstName}! ${doctorName} enviou um documento da sua consulta no MedSync.`;
    openWhatsApp(data?.patientPhone, `${greeting} Para ver e baixar, entre com a sua conta: ${link}`);
  }

  async function remove(document: MedicalDocument) {
    if (!(await confirm({ title: "Excluir este rascunho?", description: document.title, confirmLabel: "Excluir rascunho", danger: true }))) return;
    setError("");
    try {
      await api.deleteMedicalDocument(document.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o rascunho.");
    }
  }

  return (
    <Card className="scroll-mt-24 p-6">
      {!exams && <span id="documentos" />}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
            {exams ? <FlaskConical size={20} /> : <FileText size={20} />}
          </div>
          <h2 className="text-xl font-bold text-ink">{exams ? "Solicitação de exames" : "Laudos e declarações"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {exams
              ? "Liste os exames, um por linha. Sai no modelo padrão, com a sua assinatura. O paciente só vê depois que você assina."
              : "Laudo em branco no modelo padrão (título, paciente, texto livre), quantos precisar, e a declaração de comparecimento com entrada e saída. O paciente só vê depois que você assina."}
          </p>
        </div>
        {!form && !readOnly && (
          <button type="button" className={`${secondaryButtonClass} shrink-0`} onClick={startReport}>
            <Plus size={16} /> {exams ? "Nova solicitação" : "Novo laudo"}
          </button>
        )}
      </div>

      {error && <AlertBanner tone="error" message={error} />}
      {message && <AlertBanner tone="success" message={message} />}
      {confirmDialog}

      {cancelled && <p className="mb-4 text-xs font-semibold text-slate-500">Consulta cancelada: não é possível emitir documentos.</p>}

      {!exams && !form && !readOnly && !declaration && (
        completed ? (
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-amber-900">
              <span className="font-bold">Consulta concluída.</span> Emita e assine a declaração de comparecimento com o
              horário de entrada e de saída do paciente.
            </p>
            <button type="button" className={`${secondaryButtonClass} shrink-0`} onClick={startDeclaration}>
              <CalendarCheck size={16} /> Declaração de comparecimento
            </button>
          </div>
        ) : (
          <p className="mb-5 text-xs leading-5 text-slate-500">
            A declaração de comparecimento fica disponível aqui quando a consulta for concluída.
          </p>
        )
      )}

      {form ? (
        <form onSubmit={save} className="space-y-4">
          {form.kind !== "AttendanceDeclaration" ? (
            <>
              {form.kind === "Report" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Título (sai centralizado e em negrito)</span>
                  <TextInput
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    list="medical-document-titles"
                    maxLength={120}
                    required
                  />
                  <datalist id="medical-document-titles">
                    {titleSuggestions.map((title) => (
                      <option key={title} value={title} />
                    ))}
                  </datalist>
                </label>
              )}
              {!inPerson && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Local onde o paciente está (telemedicina)</span>
                  <TextInput
                    value={form.patientLocation}
                    onChange={(event) => setForm({ ...form, patientLocation: event.target.value })}
                    maxLength={200}
                    placeholder="Cidade/UF ou endereço informado pelo paciente"
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">{exams ? "Exames (um por linha)" : "Texto"}</span>
                <TextArea
                  value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })}
                  maxLength={8000}
                  spellCheck
                  lang="pt-BR"
                  className="min-h-[220px] resize-y leading-6"
                  placeholder={
                    exams
                      ? "Um exame por linha. Se precisar, termine com a indicação clínica."
                      : "Escreva o laudo, relatório ou orientação. O documento já traz o cabeçalho do local, o paciente, a data e o seu bloco de assinatura."
                  }
                  required
                />
                <span className="mt-1 block text-[11px] text-slate-400">{form.body.length}/8000 caracteres</span>
              </label>
              {exams && (
                <div className="flex flex-wrap gap-1.5" aria-label="Exames frequentes">
                  {commonExams.map((exam) => (
                    <button
                      key={exam}
                      type="button"
                      onClick={() => setForm({ ...form, body: form.body.trim() ? `${form.body.trimEnd()}\n${exam}` : exam })}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                    >
                      + {exam}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Dia</span>
                <TextInput type="date" value={form.date} disabled />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Entrada</span>
                <TextInput type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Saída</span>
                <TextInput type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} required />
              </label>
              <p className="text-[11px] leading-4 text-slate-400 sm:col-span-3">
                Sugestão a partir da sala ({inPerson ? "horário marcado" : "entrada do paciente e encerramento"}). Horário de Brasília.
              </p>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setForm(null)}>
              Cancelar
            </button>
            <Button type="submit" isLoading={saving}>
              Salvar rascunho
            </Button>
          </div>
        </form>
      ) : documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {exams ? "Nenhuma solicitação de exames neste atendimento." : "Nenhum laudo ou declaração neste atendimento."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={document.status === "Draft" ? "warning" : "success"}>
                    {document.status === "Signed" ? (document.signatureSimulated ? "Assinado (simulação)" : "Assinado") : "Rascunho"}
                  </Badge>
                  <span className="text-xs text-slate-400">{formatDateTime(document.signedAt ?? document.updatedAt)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{document.title}</p>
                {document.kind === "AttendanceDeclaration" && document.attendanceStartedAt && document.attendanceEndedAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Entrada {brazilTime.format(new Date(document.attendanceStartedAt))} · saída {brazilTime.format(new Date(document.attendanceEndedAt))}
                  </p>
                )}
                {document.status === "Draft" && (
                  <p className="mt-1 text-xs text-slate-500">O paciente ainda não vê este documento.</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/documento/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-teal-700 hover:border-teal-200 hover:bg-teal-50"
                >
                  <FilePen size={14} /> {document.status === "Draft" ? "Ver e assinar" : "Ver documento"}
                </a>
                {document.status === "Signed" && (
                  <button
                    type="button"
                    onClick={() => sendByWhatsApp(document)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <MessageCircle size={14} /> Enviar por WhatsApp
                  </button>
                )}
                {document.status === "Draft" && !locked && (
                  <>
                    <button
                      type="button"
                      onClick={() => edit(document)}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(document)}
                      aria-label="Excluir rascunho"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
