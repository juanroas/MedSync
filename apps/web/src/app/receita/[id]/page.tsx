"use client";

import { AlertBanner, Button, ErrorBanner, LoadingState, secondaryButtonClass } from "@/components/ui";
import { formatCrm, formatDateTime, formatTime } from "@/lib/format";
import type { PrescriptionDocument, SigningSession } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { ArrowLeft, Download, FlaskConical, MessageCircle, PenLine, Printer } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Documento da receita para conferir e imprimir (CFM 2.314 art. 13; .agents/rules/medical-documents.md).
// Sem assinatura ICP-Brasil ele sai com a marca "sem validade" (regra D4).
export default function PrescriptionDocumentPage() {
  const params = useParams<{ id: string }>();
  const signatureResult = useSearchParams().get("assinatura");
  const isDoctor = getSession()?.user.roles.includes("Doctor") ?? false;
  const [document, setDocument] = useState<PrescriptionDocument | null>(null);
  const [error, setError] = useState("");
  const [signError, setSignError] = useState("");
  const [signing, setSigning] = useState(false);
  const [session, setSession] = useState<SigningSession | null>(null);
  const [lifetimeHours, setLifetimeHours] = useState(8);

  useEffect(() => {
    api
      .getPrescriptionDocument(params.id)
      .then(setDocument)
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível abrir a receita."));
    if (isDoctor) api.getSigningSession().then(setSession).catch(() => setSession(null));
  }, [params.id, isDoctor]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <ErrorBanner message={error} />
      </main>
    );
  }
  if (!document) return <LoadingState label="Abrindo receita..." />;

  const { prescription } = document;
  const signed = prescription.status === "Signed";
  const signBlocked = document.missingForSignature.length > 0 || !document.signatureAvailable;

  const sessionActive = session?.active ?? false;
  const simulator = session?.simulated ?? false;

  // With an approval still running the API signs at once; otherwise the doctor goes to the certificate app
  // (or the simulator) and the API callback brings them back here.
  async function sign() {
    setSigning(true);
    setSignError("");
    try {
      const result = await api.signPrescription(prescription.id, lifetimeHours);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      setDocument(await api.getPrescriptionDocument(prescription.id));
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Não foi possível iniciar a assinatura.");
    }
    setSigning(false);
  }

  async function endSession() {
    await api.endSigningSession().catch(() => undefined);
    setSession(await api.getSigningSession().catch(() => null));
  }
  const copies = prescription.kind === "Antimicrobial" ? ["1ª via — farmácia", "2ª via — paciente"] : [null];

  return (
    <main className="min-h-screen bg-mist py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[820px] px-5 print:hidden">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/prontuario/${prescription.appointmentId}#receita`}
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-700"
          >
            <ArrowLeft size={16} /> Voltar ao prontuário
          </Link>
          <div className="flex flex-wrap gap-2">
            {signed ? (
              <>
                {isDoctor && (
                  <a
                    href={whatsAppLink(document)}
                    target="_blank"
                    rel="noreferrer"
                    className={secondaryButtonClass}
                  >
                    <MessageCircle size={17} /> Enviar pelo WhatsApp
                  </a>
                )}
                <a href={api.prescriptionPdfUrl(prescription.id)} className={buttonLinkClass}>
                  <Download size={17} /> Baixar PDF assinado
                </a>
              </>
            ) : (
              <>
                <button type="button" className={secondaryButtonClass} onClick={() => window.print()}>
                  <Printer size={17} /> Imprimir rascunho
                </button>
                {isDoctor && !sessionActive && !signBlocked && (
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
                {isDoctor && (
                  <Button type="button" onClick={sign} isLoading={signing} disabled={signBlocked || signing}>
                    <PenLine size={17} /> {sessionActive ? "Assinar" : "Assinar com certificado digital"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {isDoctor && simulator && (
          <AlertBanner
            tone="warning"
            title="Modo simulador de assinatura"
            message="A integração com o certificado em nuvem (Valid/VIDaaS) ainda não está pronta. As assinaturas deste ambiente são simuladas e os documentos saem com a marca “SIMULAÇÃO — SEM VALIDADE”."
          />
        )}
        {isDoctor && sessionActive && session?.expiresAt && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <span>
              Assinatura liberada até <strong>{formatTime(session.expiresAt)}</strong>: cada receita é assinada com um clique.
            </span>
            <button type="button" onClick={endSession} className="text-xs font-bold text-teal-700 underline">
              Encerrar liberação
            </button>
          </div>
        )}
        {signatureResult === "ok" && !prescription.signatureSimulated && (
          <AlertBanner tone="success" message="Receita assinada com certificado ICP-Brasil. O paciente já pode baixar o PDF." />
        )}
        {signed && prescription.signatureSimulated && (
          <AlertBanner
            tone="warning"
            title="Assinatura simulada — sem validade"
            message="Esta receita foi assinada pelo simulador de demonstração. Não use em farmácia."
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
            title="Rascunho — ainda sem validade"
            message={[
              document.missingForSignature.length > 0 && `Para assinar: ${document.missingForSignature.join("; ")}.`,
              !document.signatureAvailable && "A assinatura digital ICP-Brasil (VIDaaS) ainda não está ativa no MedSync.",
              document.missingForSignature.length === 0 && document.signatureAvailable &&
                "Confira o documento e assine com o seu certificado em nuvem.",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}
      </div>

      {copies.map((copy) => (
        <article
          key={copy ?? "unica"}
          className="relative mx-auto mb-8 max-w-[820px] overflow-hidden bg-white px-12 py-12 shadow-soft print:mb-0 print:max-w-none print:break-after-page print:shadow-none"
        >
          {(!signed || prescription.signatureSimulated) && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 grid place-items-center [print-color-adjust:exact]"
            >
              <span className="-rotate-[30deg] whitespace-nowrap text-5xl font-black uppercase tracking-widest text-red-500/15">
                {signed ? "Simulação — sem validade" : "Sem validade — rascunho"}
              </span>
            </div>
          )}

          <header className="border-b border-slate-300 pb-5">
            <p className="text-xl font-bold text-ink">{document.doctorName}</p>
            <p className="text-sm text-slate-600">
              {document.doctorSpecialty} · {formatCrm(document.doctorCrm, document.doctorCrmUf)}
              {document.doctorRqe ? ` · RQE ${document.doctorRqe}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {document.doctorProfessionalAddress ?? "Endereço profissional não cadastrado"}
            </p>
            <p className="text-xs text-slate-400">{document.clinicName}</p>
          </header>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <h1 className="text-lg font-bold uppercase tracking-wide text-ink">
              {prescription.kind === "Antimicrobial" ? "Receituário de antimicrobiano" : "Receita"}
            </h1>
            {copy && <span className="text-xs font-bold uppercase text-slate-500">{copy}</span>}
          </div>

          <section className="mt-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Paciente:</span> {document.patientName} · CPF {formatCpf(document.patientCpf)}
            </p>
            <p>
              <span className="font-semibold">Local informado pelo paciente:</span>{" "}
              {prescription.patientLocation ?? "não informado"}
            </p>
          </section>

          <ol className="mt-7 space-y-5">
            {prescription.items.map((item, index) => (
              <li key={item.id} className="text-sm text-ink">
                <p className="font-semibold">
                  {index + 1}. {item.medicationName}
                  {item.dosage ? ` ${item.dosage}` : ""}
                  {item.quantity ? ` — ${item.quantity}` : ""}
                </p>
                <p className="mt-1 pl-5 text-slate-700">
                  {item.instructions}
                  {item.continuousUse ? " (uso contínuo)" : ""}
                </p>
              </li>
            ))}
          </ol>

          {prescription.notes && (
            <p className="mt-7 text-sm text-slate-700">
              <span className="font-semibold">Orientações:</span> {prescription.notes}
            </p>
          )}

          <footer className="mt-12 border-t border-slate-300 pt-5 text-xs leading-5 text-slate-600">
            <p>Emitida em modalidade de telemedicina (Res. CFM 2.314/2022).</p>
            <p>
              Data e hora: {formatDateTime(prescription.signedAt ?? prescription.updatedAt)}
              {prescription.kind === "Antimicrobial" && " · Validade: 10 dias a partir da emissão (RDC Anvisa 471/2021)."}
            </p>
            <p className="mt-3 font-semibold text-ink">
              {signed && prescription.signatureSimulated ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <FlaskConical size={13} /> Assinatura SIMULADA em {formatDateTime(prescription.signedAt!)} — sem validade jurídica.
                </span>
              ) : signed ? (
                `Assinado digitalmente com certificado ICP-Brasil em ${formatDateTime(prescription.signedAt!)}.`
              ) : (
                "Assinatura digital: pendente."
              )}
            </p>
          </footer>
        </article>
      ))}
    </main>
  );
}

const buttonLinkClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100";

// Opens the doctor's own WhatsApp with a ready message; only a login-protected link travels (rule D5).
function whatsAppLink(document: PrescriptionDocument) {
  const digits = (document.patientPhone ?? "").replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : "";
  const firstName = document.patientName.split(" ")[0];
  const link = `${window.location.origin}/receita/${document.prescription.id}`;
  const text = `Olá, ${firstName}. Sua receita da consulta com ${document.doctorName} está no MedSync: ${link}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : value;
}
