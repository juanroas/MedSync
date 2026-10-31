"use client";

import { AlertBanner, Button, Card, ErrorBanner, LoadingState, PageHeader, TextArea, cn, secondaryButtonClass } from "@/components/ui";
import { ClinicalAttachmentsPanel } from "@/components/clinical-attachments-panel";
import { useConfirm } from "@/components/dialog";
import { EndConsultationDialog } from "@/components/end-consultation-dialog";
import { FollowUpCard } from "@/components/follow-up-card";
import { MedicalDocumentsPanel } from "@/components/medical-documents-panel";
import { PrescriptionPanel } from "@/components/prescription-panel";
import { PrescriptionHistory } from "@/components/prescription-history";
import { holdSession, onIdleLogout } from "@/components/session-keeper";
import { appointmentStatusLabel, canConcludeConsultation } from "@/lib/appointments";
import { formatDateTime } from "@/lib/format";
import type { Appointment, ClinicalRecord, PatientClinicalRecord } from "@/lib/types";
import { ApiError, api, getSession } from "@/services/api";
import { ArrowLeft, CheckCircle2, ClipboardPlus, Eye, FileClock, Lock, Mic, MicOff, Pill, Save, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const MAX_RECORD_LENGTH = 12000;

const TABS = [
  { id: "registro", label: "Registro clínico" },
  { id: "receita", label: "Receitas" },
  { id: "exames", label: "Exames e retorno" },
  { id: "documentos", label: "Laudos e declaração" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export default function ClinicalRecordPage() {
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
  const router = useRouter();
  const roles = getSession()?.user.roles ?? [];
  const isDoctor = roles.includes("Doctor");
  const canUploadClinicalAttachment = isDoctor || roles.includes("Patient");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [history, setHistory] = useState<PatientClinicalRecord[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<PatientClinicalRecord | null>(null);
  const [dictationChecked, setDictationChecked] = useState(false);
  const [dictationSupported, setDictationSupported] = useState(false);
  const [dictationActive, setDictationActive] = useState(false);
  const [dictationStatus, setDictationStatus] = useState("");
  const [tab, setTab] = useState<Tab>("registro");
  const [concluding, setConcluding] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirm, confirmDialog] = useConfirm();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Rule D8: after "Encerrar atendimento" nothing here changes, the API refuses it too.
  const closed = Boolean(appointment?.closedAt);
  const canEditClinicalRecord = isDoctor && !closed;

  const currentHistory = useMemo(
    () => history.filter((item) => item.appointmentId !== appointmentId),
    [appointmentId, history],
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const appointmentResult = await api.getAppointment(appointmentId);
        const [recordResult, historyResult] = await Promise.all([
          api.getClinicalRecord(appointmentId).catch((err) => {
            if (err instanceof ApiError && err.status === 404) return null;
            throw err;
          }),
          api.getPatientClinicalRecords(appointmentResult.patientId),
        ]);

        if (!isMounted) return;
        setAppointment(appointmentResult);
        setRecord(recordResult);
        setContent(recordResult?.content ?? "");
        setHistory(historyResult);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Não foi possível carregar o prontuário.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  // A link can open a tab directly (#documentos, #receita, #exames).
  useEffect(() => {
    function openTabFromHash() {
      const hash = window.location.hash.slice(1);
      const found = TABS.find((item) => item.id === hash);
      if (found) setTab(found.id);
    }

    openTabFromHash();
    window.addEventListener("hashchange", openTabFromHash);
    return () => window.removeEventListener("hashchange", openTabFromHash);
  }, []);

  // Dictating is using the system without touching it.
  useEffect(() => {
    if (dictationActive) return holdSession();
  }, [dictationActive]);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    setDictationSupported(Boolean(SpeechRecognition));
    setDictationChecked(true);

    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedHistory) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedHistory(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedHistory]);

  // What the doctor typed is saved before leaving: on "Concluir", on "Encerrar" and before an idle logout.
  async function saveDraft() {
    if (!canEditClinicalRecord || !content.trim() || content === (record?.content ?? "")) return;
    const updated = await api.saveClinicalRecord(appointmentId, { content });
    setRecord(updated);
    setContent(updated.content);
  }

  const saveDraftRef = useRef(saveDraft);
  saveDraftRef.current = saveDraft;
  useEffect(() => onIdleLogout(() => saveDraftRef.current()), []);

  async function openConclude() {
    setError("");
    try {
      await saveDraft();
      setConcluding(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o prontuário.");
    }
  }

  async function closeAttendance() {
    setError("");
    setClosing(true);
    try {
      await saveDraft();
      const ok = await confirm({
        title: "Encerrar atendimento?",
        description: `Depois de encerrar, nada desta consulta pode ser alterado: prontuário, receitas, exames, laudos, declaração e anexos.${
          appointment?.attendanceDeclarationId ? "" : " A declaração de comparecimento ainda não foi assinada e não poderá mais ser emitida."
        }`,
        confirmLabel: "Encerrar atendimento",
        danger: true,
      });
      if (!ok) return;
      await api.closeAppointment(appointmentId);
      router.push("/consultas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível encerrar o atendimento.");
    } finally {
      setClosing(false);
    }
  }

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSavedMessage("");

    if (!content.trim()) {
      setError("O registro clínico não pode ficar vazio.");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.saveClinicalRecord(appointmentId, { content });
      setRecord(updated);
      setContent(updated.content);
      if (appointment) {
        setHistory(await api.getPatientClinicalRecords(appointment.patientId));
      }
      setSavedMessage(`Prontuário salvo. Versão ${updated.version}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o prontuário.");
    } finally {
      setSaving(false);
    }
  }

  function startDictation() {
    if (!canEditClinicalRecord || dictationActive) return;

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setDictationStatus("Ditado indisponível neste navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setDictationActive(true);
      setDictationStatus("Ouvindo... fale o texto do registro clínico.");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalTranscript += ` ${transcript}`;
        else interimTranscript += ` ${transcript}`;
      }

      if (finalTranscript.trim()) {
        const normalized = normalizeDictationText(finalTranscript);
        setContent((current) => appendDictationText(current, normalized));
      }

      setDictationStatus(
        interimTranscript.trim()
          ? `Captando: ${interimTranscript.trim()}`
          : "Ouvindo... clique em parar quando terminar.",
      );
    };

    recognition.onerror = (event) => {
      setDictationActive(false);
      setDictationStatus(getDictationErrorMessage(event.error));
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setDictationActive(false);
      setDictationStatus("Ditado pausado. Revise o texto antes de salvar.");
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setDictationActive(false);
      setDictationStatus("Não foi possível iniciar o ditado neste navegador.");
    }
  }

  function stopDictation() {
    recognitionRef.current?.stop();
  }

  if (loading) return <LoadingState label="Carregando prontuário..." />;

  if (error && !appointment) {
    return (
      <>
        <PageHeader
          eyebrow="MedSync Medical"
          title="Prontuário"
          description="Registro clínico restrito aos perfis assistenciais autorizados."
          action={<BackToSchedule />}
        />
        <ErrorBanner message={error} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="MedSync Medical"
        title="Prontuário do atendimento"
        description="Registre a evolução clínica do atendimento e consulte o histórico assistencial do paciente."
        action={<BackToSchedule />}
      />

      {error && <ErrorBanner message={error} />}
      {savedMessage && <AlertBanner tone="success" message={savedMessage} />}
      {confirmDialog}

      {closed && appointment?.closedAt && (
        <AlertBanner
          tone="info"
          title="Atendimento encerrado"
          message={`Encerrado em ${formatDateTime(appointment.closedAt)}. Este prontuário é somente leitura: nada desta consulta pode ser alterado.`}
        />
      )}

      {!isDoctor && (
        <AlertBanner
          tone="warning"
          title="Acesso assistencial necessário"
          message="Somente o médico vinculado ao atendimento pode editar prontuário. Perfis assistenciais autorizados consultam histórico conforme finalidade."
        />
      )}

      {appointment && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <div className="min-w-0 space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Atendimento</p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">{appointment.patientName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.specialty} com {appointment.doctorName}
                  </p>
                  {appointment.patientGuardian && (
                    <p className="mt-1 text-sm font-semibold text-slate-600">Responsável legal: {appointment.patientGuardian}</p>
                  )}
                </div>
                <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2 lg:min-w-80">
                  <InfoPill label="Horário" value={formatDateTime(appointment.scheduledAt)} />
                  <InfoPill label="Situação" value={appointmentStatusLabel(appointment)} />
                </div>
              </div>
              {isDoctor && canConcludeConsultation(appointment) && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-500">Terminou de atender? Conclua a consulta e volte para a agenda.</p>
                  <button type="button" className={cn(secondaryButtonClass, "shrink-0")} onClick={openConclude}>
                    <CheckCircle2 size={16} /> Concluir consulta
                  </button>
                </div>
              )}
              {canEditClinicalRecord && appointment.status === "Completed" && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-500">
                    Consulta concluída. Quando terminar os documentos, encerre o atendimento: depois disso nada pode ser alterado.
                  </p>
                  <button type="button" className={cn(secondaryButtonClass, "shrink-0")} onClick={closeAttendance} disabled={closing}>
                    <Lock size={16} /> {closing ? "Encerrando..." : "Encerrar atendimento"}
                  </button>
                </div>
              )}
              {appointment.patientContinuousMedications && !isDoctor && (
                <div className="mt-5 flex gap-3 rounded-lg border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-800">
                  <Pill size={17} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Medicações de uso contínuo</p>
                    <p className="mt-1 leading-6">{appointment.patientContinuousMedications}</p>
                  </div>
                </div>
              )}
            </Card>

            {isDoctor && (
              <div role="tablist" aria-label="Seções do atendimento" className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "h-10 shrink-0 rounded-md px-4 text-sm font-bold transition",
                      tab === item.id ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Hidden, not unmounted: a half-written draft survives a change of tab. */}
            <Card className={cn("p-6", tab !== "registro" && "hidden")}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <ClipboardPlus size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-ink">Registro clínico</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Use este campo para evolução, achados relevantes, orientação e conduta do atendimento.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {record && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      Versão {record.version}
                    </span>
                  )}
                  {canEditClinicalRecord && (
                    <button
                      type="button"
                      onClick={dictationActive ? stopDictation : startDictation}
                      disabled={saving || (dictationChecked && !dictationSupported)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-xs font-bold text-teal-700 hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {dictationActive ? <MicOff size={15} /> : <Mic size={15} />}
                      {dictationActive ? "Parar ditado" : "Iniciar ditado"}
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={saveRecord} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink">Evolução e conduta</span>
                  <TextArea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={MAX_RECORD_LENGTH}
                    disabled={!canEditClinicalRecord || saving}
                    spellCheck
                    lang="pt-BR"
                    className="min-h-[320px] resize-y leading-6"
                    placeholder="Descreva o atendimento clínico com objetividade. Evite dados fora da finalidade assistencial."
                  />
                </label>
                {canEditClinicalRecord && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                    {dictationChecked && !dictationSupported
                      ? "Ditado indisponível neste navegador. O corretor ortografico do sistema continua ativo no campo de texto."
                      : dictationStatus || "Ditado usa o microfone do navegador e insere texto como rascunho. Revise antes de salvar."}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">
                    {content.length}/{MAX_RECORD_LENGTH} caracteres. Alterações geram versão e trilha de auditoria.
                  </p>
                  {!closed && (
                    <Button type="submit" isLoading={saving} disabled={!canEditClinicalRecord || saving}>
                      <Save size={17} /> Salvar prontuário
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            {isDoctor && (
              <>
                <div hidden={tab !== "receita"}>
                  <PrescriptionPanel
                    appointmentId={appointmentId}
                    patientId={appointment.patientId}
                    canIssue={appointment.status !== "Cancelled" && !closed}
                    inPerson={appointment.modality === "InPerson"}
                    locked={closed}
                  />
                </div>

                <div hidden={tab !== "exames"} className="space-y-6">
                  <MedicalDocumentsPanel
                    mode="exams"
                    appointmentId={appointmentId}
                    status={appointment.status}
                    scheduledAt={appointment.scheduledAt}
                    inPerson={appointment.modality === "InPerson"}
                    locked={closed}
                  />
                  <FollowUpCard appointment={appointment} locked={closed} onSaved={setAppointment} />
                </div>

                <div hidden={tab !== "documentos"}>
                  <MedicalDocumentsPanel
                    appointmentId={appointmentId}
                    status={appointment.status}
                    scheduledAt={appointment.scheduledAt}
                    inPerson={appointment.modality === "InPerson"}
                    locked={closed}
                  />
                </div>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <h2 className="font-bold text-ink">Escopo protegido</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Prontuário não aparece para a administração da clínica, suporte ou auditoria. Acesso clínico
                    exige finalidade assistencial e gera evento de auditoria.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <FileClock size={18} className="text-teal-700" />
                  <div>
                    <h2 className="font-bold text-ink">Histórico do paciente</h2>
                    <p className="mt-1 text-xs text-slate-400">Registros anteriores vinculados a este paciente.</p>
                  </div>
                </div>
              </div>

              {currentHistory.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  Nenhum registro anterior encontrado para este paciente.
                </div>
              ) : (
                <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                  {currentHistory.map((item) => (
                    <article key={item.id} className="px-6 py-5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-ink">{formatDateTime(item.scheduledAt)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {item.doctorName} - {item.specialty}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          v{item.version}
                        </span>
                      </div>
                      <p className="max-h-36 overflow-hidden whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {item.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedHistory(item)}
                        className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-teal-700 hover:border-teal-200 hover:bg-teal-50"
                      >
                        <Eye size={14} /> Ver completo
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </Card>

            {isDoctor && (
              <Card>
                <PrescriptionHistory patientId={appointment.patientId} currentAppointmentId={appointmentId} />
              </Card>
            )}

            <ClinicalAttachmentsPanel appointmentId={appointmentId} canUpload={canUploadClinicalAttachment} locked={closed} />
          </aside>
        </div>
      )}

      {selectedHistory && (
        <ClinicalHistoryModal record={selectedHistory} onClose={() => setSelectedHistory(null)} />
      )}

      {isDoctor && (
        <EndConsultationDialog
          appointmentId={appointmentId}
          open={concluding}
          onClose={() => setConcluding(false)}
          onEnded={() => router.push("/consultas")}
        />
      )}
    </>
  );
}

function BackToSchedule() {
  return (
    <Link
      href="/consultas"
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-ink shadow-sm hover:border-teal-200 hover:bg-teal-50/40"
    >
      <ArrowLeft size={17} /> Voltar para agenda
    </Link>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function normalizeDictationText(value: string) {
  const text = value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

  if (!text) return "";

  const withFirstUpper = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(withFirstUpper) ? withFirstUpper : `${withFirstUpper}.`;
}

function appendDictationText(current: string, addition: string) {
  if (!addition) return current;

  const spacer = current.trim()
    ? current.endsWith("\n") || current.endsWith(" ") ? "" : "\n"
    : "";

  return `${current}${spacer}${addition}`.slice(0, MAX_RECORD_LENGTH);
}

function getDictationErrorMessage(error?: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Permissão do microfone negada. Libere o microfone no navegador para usar o ditado.";
  }

  if (error === "no-speech") {
    return "Nenhuma fala detectada. Tente iniciar o ditado novamente.";
  }

  if (error === "network") {
    return "O ditado depende do servico de reconhecimento do navegador e falhou por conexão.";
  }

  return "Não foi possível continuar o ditado. Revise o texto e tente novamente.";
}

function ClinicalHistoryModal({
  record,
  onClose,
}: {
  record: PatientClinicalRecord;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-history-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Histórico clínico</p>
            <h2 id="clinical-history-title" className="mt-1 text-xl font-bold text-ink">
              Registro anterior do paciente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(record.scheduledAt)} - {record.doctorName} - {record.specialty}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
            aria-label="Fechar histórico"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 text-sm sm:grid-cols-3">
          <InfoPill label="Paciente" value={record.patientName} />
          <InfoPill label="Versão" value={`v${record.version}`} />
          <InfoPill label="Atualizado" value={formatDateTime(record.updatedAt)} />
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{record.content}</p>
        </div>
      </div>
    </div>
  );
}
