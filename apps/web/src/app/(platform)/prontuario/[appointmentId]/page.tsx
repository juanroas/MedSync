"use client";

import { AlertBanner, Button, Card, ErrorBanner, LoadingState, PageHeader, TextArea } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Appointment, ClinicalRecord, PatientClinicalRecord } from "@/lib/types";
import { ApiError, api, getSession } from "@/services/api";
import { ArrowLeft, ClipboardPlus, Eye, FileClock, Save, ShieldCheck, Stethoscope, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const MAX_RECORD_LENGTH = 12000;

export default function ClinicalRecordPage() {
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
  const roles = getSession()?.user.roles ?? [];
  const canEditClinicalRecord = roles.includes("Doctor");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [record, setRecord] = useState<ClinicalRecord | null>(null);
  const [history, setHistory] = useState<PatientClinicalRecord[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<PatientClinicalRecord | null>(null);

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
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar o prontuario.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    if (!selectedHistory) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedHistory(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedHistory]);

  async function saveRecord(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSavedMessage("");

    if (!content.trim()) {
      setError("O registro clinico nao pode ficar vazio.");
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
      setSavedMessage(`Prontuario salvo. Versao ${updated.version}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o prontuario.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Carregando prontuario..." />;

  if (error && !appointment) {
    return (
      <>
        <PageHeader
          eyebrow="MedSync Medical"
          title="Prontuario"
          description="Registro clinico restrito aos perfis assistenciais autorizados."
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
        title="Prontuario do atendimento"
        description="Registre a evolucao clinica do atendimento e consulte o historico assistencial do paciente."
        action={<BackToSchedule />}
      />

      {error && <ErrorBanner message={error} />}
      {savedMessage && <AlertBanner tone="success" message={savedMessage} />}

      {!canEditClinicalRecord && (
        <AlertBanner
          tone="warning"
          title="Acesso assistencial necessario"
          message="Somente o medico vinculado ao atendimento pode editar prontuario. Perfis assistenciais autorizados consultam historico conforme finalidade."
        />
      )}

      {appointment && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Atendimento</p>
                  <h2 className="mt-2 text-2xl font-bold text-ink">{appointment.patientName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.specialty} com {appointment.doctorName}
                  </p>
                </div>
                <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2 lg:min-w-80">
                  <InfoPill label="Horario" value={formatDateTime(appointment.scheduledAt)} />
                  <InfoPill label="Status" value={appointment.status} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <ClipboardPlus size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-ink">Registro clinico</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Use este campo para evolucao, achados relevantes, orientacao e conduta do atendimento.
                  </p>
                </div>
                {record && (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    Versao {record.version}
                  </span>
                )}
              </div>

              <form onSubmit={saveRecord} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-ink">Evolucao e conduta</span>
                  <TextArea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={MAX_RECORD_LENGTH}
                    disabled={!canEditClinicalRecord || saving}
                    className="min-h-[320px] resize-y leading-6"
                    placeholder="Descreva o atendimento clinico com objetividade. Evite dados fora da finalidade assistencial."
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">
                    {content.length}/{MAX_RECORD_LENGTH} caracteres. Alteracoes geram versao e trilha de auditoria.
                  </p>
                  <Button type="submit" isLoading={saving} disabled={!canEditClinicalRecord || saving}>
                    <Save size={17} /> Salvar prontuario
                  </Button>
                </div>
              </form>
            </Card>
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
                    Prontuario nao aparece para empresa, financeiro, suporte ou auditoria administrativa. Acesso clinico
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
                    <h2 className="font-bold text-ink">Historico do paciente</h2>
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

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700">
                  <Stethoscope size={20} />
                </span>
                <div>
                  <h2 className="font-bold text-ink">Proximas evolucoes</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Templates por especialidade, anexos, prescricao e assinatura digital devem entrar em fase propria
                    com validacao juridica, DPO e diretor tecnico.
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}

      {selectedHistory && (
        <ClinicalHistoryModal record={selectedHistory} onClose={() => setSelectedHistory(null)} />
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
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Historico clinico</p>
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
            aria-label="Fechar historico"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4 text-sm sm:grid-cols-3">
          <InfoPill label="Paciente" value={record.patientName} />
          <InfoPill label="Versao" value={`v${record.version}`} />
          <InfoPill label="Atualizado" value={formatDateTime(record.updatedAt)} />
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{record.content}</p>
        </div>
      </div>
    </div>
  );
}
