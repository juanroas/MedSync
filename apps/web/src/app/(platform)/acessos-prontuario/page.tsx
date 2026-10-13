"use client";

import { Dialog } from "@/components/dialog";
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { formatDateTime, formatTime } from "@/lib/format";
import { CLINICAL_ACCESS_REASON_LABELS } from "@/lib/types";
import type { ClinicalAccessGrant, ClinicalAccessPatient, ClinicalAccessReason, ClinicalAccessRecords } from "@/lib/types";
import { digitsOnly, isValidCpf, maskCpf } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { FileLock2, ShieldAlert } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

// Acesso ao prontuário com justificativa (regra C3). Médico ADM MedSync: pede o acesso (30 min, só leitura) e lê.
// DPO: vê todos os acessos e a finalidade declarada, nunca o conteúdo clínico.
export default function ClinicalAccessPage() {
  const roles = getSession()?.user.roles ?? [];
  const isMedicalAdmin = roles.includes("MedicalDirector");
  const isDpo = roles.includes("DataProtectionOfficer");
  if (!isMedicalAdmin && !isDpo)
    return (
      <EmptyState
        icon={<FileLock2 size={22} />}
        title="Tela da equipe médica MedSync"
        description="O acesso ao prontuário com justificativa é do Médico ADM MedSync; o DPO acompanha os registros."
      />
    );
  return <ClinicalAccess canRequest={isMedicalAdmin} />;
}

function ClinicalAccess({ canRequest }: { canRequest: boolean }) {
  const [grants, setGrants] = useState<ClinicalAccessGrant[] | null>(null);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [open, setOpen] = useState<ClinicalAccessRecords | null>(null);

  const load = useCallback(async () => setGrants(await api.getClinicalAccessGrants()), []);
  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar os acessos."));
  }, [load]);

  async function openRecords(grantId: string) {
    setError("");
    try {
      setOpen(await api.getClinicalAccessRecords(grantId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível abrir o prontuário.");
      await load().catch(() => undefined);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={canRequest ? "Médico ADM MedSync" : "DPO MedSync"}
        title="Acessos ao prontuário"
        description={
          canRequest
            ? "Todo acesso a prontuário fora do seu atendimento pede motivo e justificativa, dura 30 minutos e fica registrado."
            : "Acessos do Médico ADM MedSync com o motivo e a finalidade declarada. O conteúdo clínico não aparece aqui."
        }
        action={
          canRequest ? (
            <button type="button" className={buttonClass} onClick={() => setRequesting(true)}>
              <ShieldAlert size={17} /> Solicitar acesso
            </button>
          ) : undefined
        }
      />
      {error && <ErrorBanner message={error} />}

      {open && <RecordsView data={open} onClose={() => setOpen(null)} />}

      {grants === null ? (
        <LoadingState label="Carregando acessos..." />
      ) : grants.length === 0 ? (
        <EmptyState icon={<FileLock2 size={22} />} title="Nenhum acesso registrado" description="Os acessos com justificativa aparecem aqui." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {grants.map((grant) => (
              <li key={grant.id} className="flex flex-col gap-2 px-6 py-4 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold text-ink">
                    {grant.patientName} <span className="font-medium text-slate-500">· {grant.clinicName}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(grant.createdAt)} · {CLINICAL_ACCESS_REASON_LABELS[grant.reason]}
                    {!canRequest && ` · por ${grant.actorName}${grant.actorCrm ? ` (${grant.actorCrm})` : ""}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{grant.justification}</p>
                </div>
                <Badge tone={grant.active ? "success" : "neutral"}>
                  {grant.active ? `Ativo até ${formatTime(grant.expiresAt)}` : "Encerrado"}
                </Badge>
                {canRequest && grant.active && (
                  <button
                    type="button"
                    onClick={() => openRecords(grant.id)}
                    className="h-10 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 hover:bg-teal-100"
                  >
                    Abrir prontuário
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canRequest && (
        <RequestDialog
          open={requesting}
          onClose={() => setRequesting(false)}
          onGranted={async (grant) => {
            setRequesting(false);
            await load();
            await openRecords(grant.id);
          }}
        />
      )}
    </>
  );
}

function RequestDialog({
  open,
  onClose,
  onGranted,
}: {
  open: boolean;
  onClose: () => void;
  onGranted: (grant: ClinicalAccessGrant) => void;
}) {
  const [cpf, setCpf] = useState("");
  const [found, setFound] = useState<ClinicalAccessPatient[] | null>(null);
  const [patient, setPatient] = useState<ClinicalAccessPatient | null>(null);
  const [reason, setReason] = useState<ClinicalAccessReason>("QualityAudit");
  const [justification, setJustification] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    setError("");
    setPatient(null);
    if (!isValidCpf(cpf)) return setError("Informe o CPF completo do paciente.");
    try {
      const result = await api.findPatientForClinicalAccess(digitsOnly(cpf));
      setFound(result);
      if (result.length === 1) setPatient(result[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível buscar.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!patient) return setError("Busque e selecione o paciente.");
    if (justification.trim().length < 30) return setError("Descreva a finalidade com pelo menos 30 caracteres.");
    if (!declaration) return setError("Confirme a declaração de finalidade e sigilo.");
    setBusy(true);
    try {
      const grant = await api.createClinicalAccess({ patientId: patient.patientId, reason, justification, declaration });
      setCpf("");
      setFound(null);
      setPatient(null);
      setJustification("");
      setDeclaration(false);
      onGranted(grant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Justificar acesso ao prontuário" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-600">CPF do paciente</span>
          <div className="flex gap-2">
            <input
              className={inputClass}
              aria-label="CPF do paciente"
              value={cpf}
              inputMode="numeric"
              maxLength={14}
              onChange={(event) => setCpf(maskCpf(event.target.value))}
            />
            <button type="button" onClick={search} className="h-11 shrink-0 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Buscar
            </button>
          </div>
          {found?.length === 0 && <p className="mt-2 text-xs text-slate-500">Nenhum paciente com este CPF.</p>}
          {found && found.length > 1 && (
            <ul className="mt-2 space-y-1">
              {found.map((item) => (
                <li key={item.patientId}>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="radio" name="patient" checked={patient?.patientId === item.patientId} onChange={() => setPatient(item)} />
                    {item.name} · {item.clinicName}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {patient && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs" data-testid="access-patient">
              <b>{patient.name}</b> · CPF {patient.cpfMasked} · {patient.clinicName}
            </p>
          )}
        </div>
        <fieldset>
          <legend className="mb-1.5 block text-xs font-bold text-slate-600">Motivo</legend>
          {(Object.keys(CLINICAL_ACCESS_REASON_LABELS) as ClinicalAccessReason[]).map((key) => (
            <label key={key} className="flex items-center gap-2 py-1">
              <input type="radio" name="reason" checked={reason === key} onChange={() => setReason(key)} />
              {CLINICAL_ACCESS_REASON_LABELS[key]}
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Descreva a finalidade</span>
          <textarea
            className={`${inputClass} h-24 resize-none py-2.5`}
            value={justification}
            maxLength={1000}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="Ex.: revisão da conduta após reclamação registrada na Ajuda, protocolo..."
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Mínimo de 30 caracteres. Não escreva dados clínicos aqui: o DPO lê este texto. Fica gravado com seu nome.
          </span>
        </label>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          O acesso dura <b>30 minutos</b>, é somente leitura e aparece para o DPO e no histórico de acessos do paciente.
        </p>
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={declaration} onChange={(event) => setDeclaration(event.target.checked)} />
          Declaro que o acesso tem a finalidade acima e respeita o sigilo médico.
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 px-4 text-sm font-bold text-slate-500 hover:text-ink">
            Cancelar
          </button>
          <Button type="submit" isLoading={busy}>
            Abrir prontuário por 30 min
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RecordsView({ data, onClose }: { data: ClinicalAccessRecords; onClose: () => void }) {
  return (
    <Card className="mb-6 overflow-hidden border-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3 text-sm text-amber-900">
        <span>
          Prontuário de <b>{data.grant.patientName}</b> · somente leitura · acesso até <b>{formatTime(data.grant.expiresAt)}</b>
        </span>
        <button type="button" onClick={onClose} className="text-xs font-bold underline">
          Fechar
        </button>
      </div>
      {data.records.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">Nenhum registro de prontuário para este paciente.</p>
      ) : (
        <ul className="divide-y divide-slate-100" data-testid="access-records">
          {data.records.map((record) => (
            <li key={record.id} className="px-6 py-4 text-sm">
              <p className="text-xs font-bold text-slate-500">
                {formatDateTime(record.scheduledAt)} · {record.doctorName} · {record.specialty} · versão {record.version}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-ink">{record.content}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
