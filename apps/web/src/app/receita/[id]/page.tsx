"use client";

import { RealtimeProvider, useRealtimeRefresh } from "@/lib/realtime";

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
  return (
    <RealtimeProvider>
      <PrescriptionDocument />
    </RealtimeProvider>
  );
}

function PrescriptionDocument() {
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
  // Signed elsewhere (another tab, the doctor while the patient waits): show it without reloading.
  useRealtimeRefresh(
    ["prescriptionChanged"],
    () => api.getPrescriptionDocument(params.id).then(setDocument).catch(() => undefined),
    params.id,
  );

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
  const special = prescription.kind === "Antimicrobial" || prescription.kind === "ControlledSpecial";
  const copies = special
    ? ["1ª via — Retenção da Farmácia ou Drogaria", "2ª via — Orientação ao Paciente"]
    : [null];
  const watermark = !signed || prescription.signatureSimulated ? (signed ? "Simulação — sem validade" : "Sem validade — rascunho") : null;

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

      {special &&
        copies.map((copy) => (
          <SpecialCopy key={copy} document={document} copy={copy!} signed={signed} watermark={watermark} />
        ))}

      {!special && copies.map((copy) => (
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

// "Receita de Controle Especial" (Portaria 344/1998; RDC 471/2021 for antimicrobials), same layout as the signed PDF.
function SpecialCopy({
  document,
  copy,
  signed,
  watermark,
}: {
  document: PrescriptionDocument;
  copy: string;
  signed: boolean;
  watermark: string | null;
}) {
  const { prescription, special } = document;
  const issuedAt = prescription.signedAt ?? prescription.updatedAt;
  const birth = special?.patientBirthDate;
  const age = birth ? ageOn(birth, issuedAt) : null;
  const sex = special?.patientSex === "F" ? "Feminino" : special?.patientSex === "M" ? "Masculino" : "não informado";
  const validity =
    prescription.kind === "Antimicrobial"
      ? "Validade: 10 dias a partir da emissão (RDC Anvisa 471/2021)."
      : "Validade: 30 dias a partir da emissão (Portaria SVS/MS 344/1998).";
  const box = "border border-slate-500";
  const boxTitle = "border-b border-slate-500 py-1 text-center text-xs font-bold uppercase tracking-wide";
  const row = "border-b border-slate-300 px-2 py-1 last:border-b-0";

  return (
    <article
      className="relative mx-auto mb-8 max-w-[820px] overflow-hidden bg-white px-10 py-10 text-[13px] text-ink shadow-soft print:mb-0 print:max-w-none print:break-after-page print:shadow-none"
      data-testid="special-copy"
    >
      {watermark && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center [print-color-adjust:exact]">
          <span className="-rotate-[30deg] whitespace-nowrap text-5xl font-black uppercase tracking-widest text-red-500/15">{watermark}</span>
        </div>
      )}
      <header className="flex items-end justify-between border-b border-slate-400 pb-2">
        <div>
          <p className="text-lg font-bold">{special?.clinicName ?? document.clinicName}</p>
          {special?.clinicLegalName && <p className="text-[11px] text-slate-500">{special.clinicLegalName}</p>}
        </div>
        <p className="text-[10px] text-slate-500">Emitido por {document.doctorName} | MedSync</p>
      </header>
      <h1 className="mt-3 text-center text-xl font-bold">Receita de Controle Especial</h1>
      <p className="text-right text-xs font-bold">{copy}</p>

      <section className={`mt-3 ${box}`}>
        <p className={boxTitle}>Identificação do emitente</p>
        <p className={row}>
          <b>Unidade:</b> {special?.clinicName ?? document.clinicName}
          {special?.clinicTaxId && <span className="ml-6"><b>CNPJ:</b> {formatCnpj(special.clinicTaxId)}</span>}
        </p>
        <p className={row}><b>End.:</b> {special?.clinicAddress ?? "endereço da clínica não cadastrado"}</p>
        <p className={row}><b>Telefone:</b> {special?.clinicPhone ?? "—"}</p>
        <p className={row}>
          <b>Médico:</b> {document.doctorName} · {formatCrm(document.doctorCrm, document.doctorCrmUf)}
          {document.doctorRqe ? ` · RQE ${document.doctorRqe}` : ""}
        </p>
      </section>

      <section className="mt-4 space-y-0.5">
        <p className="font-bold italic underline">Dados do Paciente</p>
        <p><b>Nome:</b> {document.patientName}</p>
        {special?.patientSocialName && <p><b>Nome social:</b> {special.patientSocialName}</p>}
        <p><b>CPF:</b> {formatCpf(document.patientCpf)}</p>
        <p><b>Nome da mãe:</b> {special?.patientMotherName ?? "não declarado"}</p>
        {birth && (
          <p>
            <b>Nascimento:</b> {birth.split("-").reverse().join("/")} · <b>Idade:</b> {age} anos · <b>Sexo:</b> {sex}
          </p>
        )}
        <p><b>Endereço:</b> {special?.patientAddress ?? "endereço do paciente não cadastrado"}</p>
      </section>

      <ol className="mt-4 min-h-40 space-y-3 border-t border-slate-400 pt-3">
        {prescription.items.map((item) => (
          <li key={item.id}>
            <p className="flex justify-between gap-4 font-bold">
              <span>
                {item.medicationName}
                {item.dosage ? ` ${item.dosage}` : ""}
              </span>
              {item.route && <span>VIA {item.route.toUpperCase()}</span>}
            </p>
            <p><b>Posologia:</b> {item.instructions}{item.continuousUse ? " (uso contínuo)" : ""}</p>
            <p><b>Quantidade:</b> {item.quantity ?? "—"}</p>
          </li>
        ))}
        {prescription.notes && (
          <li><b>Orientações:</b> {prescription.notes}</li>
        )}
      </ol>

      <div className="mt-8 flex items-end justify-between">
        <div className="w-72 border-t border-slate-500 pt-1 text-[11px]">
          <p className="uppercase">{document.doctorName}</p>
          <p>{formatCrm(document.doctorCrm, document.doctorCrmUf)}</p>
        </div>
        <p className="font-bold">Data: {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(issuedAt))}</p>
      </div>

      <div className="mt-5 grid grid-cols-[1.3fr_1fr] gap-3">
        <section className={box}>
          <p className={boxTitle}>Identificação do comprador</p>
          {["Nome:", "CPF ou Passaporte (estrangeiro):", "End.:", "Cidade:                    UF:", "Telefone:"].map((label) => (
            <p key={label} className={`${row} whitespace-pre`}>{label}</p>
          ))}
        </section>
        <section className={`${box} flex flex-col`}>
          <p className={boxTitle}>Identificação do fornecedor</p>
          <p className="mt-auto px-2 text-right text-[11px] text-slate-500">Data: ____/____/______</p>
          <p className="mx-2 mb-2 mt-6 border-t border-slate-500 pt-1 text-center text-[11px] text-slate-500">Assinatura do farmacêutico</p>
        </section>
      </div>

      <footer className="mt-4 text-[10px] leading-4 text-slate-500">
        <p>
          Emitida em modalidade de telemedicina (Res. CFM 2.314/2022) em {formatDateTime(issuedAt)} (Brasília). {validity}
        </p>
        <p>
          {signed && prescription.signatureSimulated
            ? "SIMULAÇÃO: assinatura de demonstração, SEM VALIDADE JURÍDICA. Não use em farmácia."
            : signed
              ? "Assinada digitalmente com certificado ICP-Brasil. Confira em validar.iti.gov.br."
              : "Assinatura digital: pendente."}{" "}
          Documento {prescription.id}
        </p>
      </footer>
    </article>
  );
}

function ageOn(birthDate: string, at: string) {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  const when = new Date(at);
  let age = when.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    when.getUTCMonth() < birth.getUTCMonth() ||
    (when.getUTCMonth() === birth.getUTCMonth() && when.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function formatCnpj(value: string) {
  const d = value.replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : value;
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
