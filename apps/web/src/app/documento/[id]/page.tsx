"use client";

import { RealtimeProvider, useRealtimeRefresh } from "@/lib/realtime";

import { AlertBanner, Button, ErrorBanner, LoadingState, secondaryButtonClass } from "@/components/ui";
import { formatCrm, formatDateTime, formatTime } from "@/lib/format";
import type { MedicalDocumentPage, SigningSession } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { ArrowLeft, Download, FlaskConical, PenLine } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Laudo ou declaração de comparecimento no modelo padrão (28/10/2026; .agents/rules/medical-documents.md).
// Rascunho só o médico vê, com a marca "sem validade" (regra D4); o paciente só abre o documento assinado.
export default function MedicalDocumentRoute() {
  return (
    <RealtimeProvider>
      <MedicalDocumentView />
    </RealtimeProvider>
  );
}

const brazilTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const brazilDay = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const longDate = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" });

function MedicalDocumentView() {
  const params = useParams<{ id: string }>();
  const signatureResult = useSearchParams().get("assinatura");
  const isDoctor = getSession()?.user.roles.includes("Doctor") ?? false;
  const [page, setPage] = useState<MedicalDocumentPage | null>(null);
  const [error, setError] = useState("");
  const [signError, setSignError] = useState("");
  const [signing, setSigning] = useState(false);
  const [session, setSession] = useState<SigningSession | null>(null);
  const [lifetimeHours, setLifetimeHours] = useState(8);

  useEffect(() => {
    api
      .getMedicalDocumentPage(params.id)
      .then(setPage)
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível abrir o documento."));
    if (isDoctor) api.getSigningSession().then(setSession).catch(() => setSession(null));
  }, [params.id, isDoctor]);
  useRealtimeRefresh(
    ["appointmentChanged"],
    () => api.getMedicalDocumentPage(params.id).then(setPage).catch(() => undefined),
    page?.document.appointmentId,
  );

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <ErrorBanner message={error} />
      </main>
    );
  }
  if (!page) return <LoadingState label="Abrindo documento..." />;

  const { document } = page;
  const signed = document.status === "Signed";
  const inPerson = page.appointmentModality === "InPerson";
  const declaration = document.kind === "AttendanceDeclaration";
  const signBlocked = page.missingForSignature.length > 0 || !page.signatureAvailable;
  const sessionActive = session?.active ?? false;
  const issuedAt = document.signedAt ?? document.updatedAt;
  const person = page.patientSocialName ? `${page.patientSocialName} (nome civil: ${page.patientName})` : page.patientName;
  const crm = `${formatCrm(page.doctorCrm, page.doctorCrmUf)}${page.doctorRqe ? ` · RQE ${page.doctorRqe}` : ""}`;
  const mark = !signed ? "Rascunho — sem validade" : document.signatureSimulated ? "Simulação — sem validade" : null;

  // With an approval still running the API signs at once; otherwise the doctor goes to the certificate app
  // (or the simulator) and the API callback brings them back here.
  async function sign() {
    setSigning(true);
    setSignError("");
    try {
      const result = await api.signMedicalDocument(document.id, lifetimeHours);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setPage(await api.getMedicalDocumentPage(document.id));
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Não foi possível iniciar a assinatura.");
    }
    setSigning(false);
  }

  async function endSession() {
    await api.endSigningSession().catch(() => undefined);
    setSession(await api.getSigningSession().catch(() => null));
  }

  return (
    <main className="min-h-screen bg-mist py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[820px] px-5 print:hidden">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={isDoctor ? `/prontuario/${document.appointmentId}#documentos` : "/consultas"}
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-700"
          >
            <ArrowLeft size={16} /> {isDoctor ? "Voltar ao prontuário" : "Voltar para minhas consultas"}
          </Link>
          <div className="flex flex-wrap gap-2">
            {signed ? (
              <a href={api.medicalDocumentPdfUrl(document.id)} className={buttonLinkClass}>
                <Download size={17} /> Baixar PDF assinado
              </a>
            ) : (
              isDoctor && (
                <>
                  <a href={api.medicalDocumentPdfUrl(document.id)} className={secondaryButtonClass}>
                    <Download size={17} /> Baixar rascunho (PDF)
                  </a>
                  {!sessionActive && !signBlocked && (
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      Liberar por
                      <select
                        value={lifetimeHours}
                        onChange={(event) => setLifetimeHours(Number(event.target.value))}
                        className="h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm text-ink"
                        aria-label="Liberar assinatura por"
                      >
                        {[1, 4, 8, 12, 24].map((hours) => (
                          <option key={hours} value={hours}>
                            {hours} {hours === 1 ? "hora" : "horas"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <Button type="button" onClick={sign} isLoading={signing} disabled={signBlocked || signing}>
                    <PenLine size={17} /> {sessionActive ? "Assinar" : "Assinar com certificado digital"}
                  </Button>
                </>
              )
            )}
          </div>
        </div>
        {isDoctor && session?.simulated && (
          <AlertBanner
            tone="warning"
            title="Modo simulador de assinatura"
            message="A integração com o certificado em nuvem (Valid/VIDaaS) ainda não está pronta. As assinaturas deste ambiente são simuladas e os documentos saem com a marca “SIMULAÇÃO — SEM VALIDADE”."
          />
        )}
        {isDoctor && sessionActive && session?.expiresAt && !signed && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <span>
              Assinatura liberada até <strong>{formatTime(session.expiresAt)}</strong>: cada documento é assinado com um clique.
            </span>
            <button type="button" onClick={endSession} className="text-xs font-bold text-teal-700 underline">
              Encerrar liberação
            </button>
          </div>
        )}
        {signatureResult === "ok" && signed && !document.signatureSimulated && (
          <AlertBanner tone="success" message="Documento assinado com certificado ICP-Brasil. O paciente já pode baixar em Minhas consultas." />
        )}
        {signed && document.signatureSimulated && (
          <AlertBanner
            tone="warning"
            title="Assinatura simulada — sem validade"
            message="Este documento foi assinado pelo simulador de demonstração. O paciente vê em Minhas consultas → Documentos."
          />
        )}
        {signatureResult && signatureResult !== "ok" && !signed && (
          <AlertBanner
            tone="error"
            message={
              signatureResult === "falhou"
                ? "O provedor do certificado recusou a assinatura. Tente de novo; se persistir, fale com o suporte."
                : signatureResult === "recusada"
                  ? "Assinatura recusada no app do certificado. Nada foi assinado."
                  : "A autorização expirou ou não é válida. Clique em assinar de novo."
            }
          />
        )}
        {signError && <AlertBanner tone="error" message={signError} />}
        {!signed && (
          <AlertBanner
            tone="warning"
            title="Rascunho — o paciente ainda não vê"
            message={[
              page.missingForSignature.length > 0 && `Para assinar: ${page.missingForSignature.join("; ")}.`,
              !page.signatureAvailable && "A assinatura digital ICP-Brasil (VIDaaS) ainda não está ativa no MedSync.",
              !signBlocked && "Confira o documento e assine com o seu certificado em nuvem. Depois de assinado ele não muda mais.",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}
      </div>

      <article className="relative mx-auto mb-8 min-h-[1000px] max-w-[820px] overflow-hidden bg-white px-12 py-12 shadow-soft print:mb-0 print:max-w-none print:shadow-none">
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center [print-color-adjust:exact]">
          <span className="-rotate-[35deg] whitespace-nowrap text-6xl font-black text-teal-700/10">{page.clinicName}</span>
        </div>
        {mark && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[58%] grid place-items-center [print-color-adjust:exact]">
            <span className="-rotate-[35deg] whitespace-nowrap text-4xl font-black uppercase tracking-widest text-red-500/20">{mark}</span>
          </div>
        )}

        <header className="relative border-b border-slate-300 pb-4">
          <p className="text-lg font-bold text-ink">{page.clinicName}</p>
          <p className="text-[11px] text-slate-500">
            {[page.clinicLegalName && page.clinicLegalName !== page.clinicName ? page.clinicLegalName : null, page.clinicTaxId ? `CNPJ ${formatCnpj(page.clinicTaxId)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-[11px] text-slate-500">
            {[page.clinicAddress, page.clinicPhone ? `Telefone ${page.clinicPhone}` : null].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-sm text-ink">
            {page.doctorName} · {page.doctorSpecialty} · {crm}
          </p>
        </header>

        <h1 className="relative mt-8 text-center text-xl font-bold uppercase tracking-wide text-ink">{document.title}</h1>

        <section className="relative mt-6 space-y-1 border-b border-slate-200 pb-4 text-sm text-ink">
          <p><b>Paciente:</b> {person}</p>
          <p><b>CPF:</b> {formatCpf(page.patientCpf)} · Nascimento: {page.patientBirthDate.split("-").reverse().join("/")}</p>
          <p>
            <b>Atendimento:</b>{" "}
            {inPerson
              ? `presencial — ${page.clinicAddress ?? page.clinicName}`
              : `por telemedicina${document.patientLocation ? ` — local informado pelo paciente: ${document.patientLocation}` : ""}`}
          </p>
        </section>

        <section className="relative mt-5 whitespace-pre-wrap text-[15px] leading-7 text-ink">
          {declaration ? (
            <>
              <p>
                Declaro, para os devidos fins, que {person}, CPF {formatCpf(page.patientCpf)}, esteve{" "}
                {inPerson ? `em consulta presencial em ${page.clinicName}` : "em consulta por telemedicina (atendimento a distância)"} no dia{" "}
                {brazilDay.format(new Date(document.attendanceStartedAt ?? issuedAt))}, das{" "}
                {brazilTime.format(new Date(document.attendanceStartedAt ?? issuedAt))} às{" "}
                {brazilTime.format(new Date(document.attendanceEndedAt ?? issuedAt))} (horário de Brasília), sob os meus cuidados.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Esta declaração comprova apenas o comparecimento à consulta. Não informa diagnóstico nem afastamento do
                trabalho, que dependem de atestado médico.
              </p>
            </>
          ) : (
            document.body
          )}
        </section>

        <p className="relative mt-8 text-[15px] text-ink">
          {page.clinicCity ? `${page.clinicCity}, ` : ""}
          {longDate.format(new Date(issuedAt))}.
        </p>

        <div className="relative mx-auto mt-14 w-80 border-t border-slate-400 pt-1 text-center">
          <p className="text-sm font-bold text-ink">{page.doctorName}</p>
          <p className="text-sm text-ink">
            {page.doctorSpecialty} · {crm}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            {!signed ? (
              "Rascunho: ainda não assinado pelo médico, sem validade."
            ) : document.signatureSimulated ? (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <FlaskConical size={12} /> SIMULAÇÃO: assinatura de demonstração, sem validade jurídica.
              </span>
            ) : (
              `Assinado digitalmente com certificado ICP-Brasil em ${formatDateTime(issuedAt)}.`
            )}
          </p>
        </div>

        <footer className="relative mt-16 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
          {inPerson ? "Emitido em atendimento presencial" : "Emitido em modalidade de telemedicina (Res. CFM 2.314/2022)"} · Documento {document.id}
        </footer>
      </article>
    </main>
  );
}

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : value;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : value;
}

const buttonLinkClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100";
