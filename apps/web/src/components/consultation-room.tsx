"use client";

import "@livekit/components-styles";

import { ErrorBanner, LoadingState, buttonClass } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { ApiError, api, getSession } from "@/services/api";
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { ExternalE2EEKeyProvider, type E2EEOptions, type RoomOptions } from "livekit-client";
import {
  ArrowLeft,
  CalendarClock,
  CreditCard,
  FileText,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ConsentTerm = { termVersion: string; term: string };

export function ConsultationRoom({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [token, setToken] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [encryption, setEncryption] = useState<E2EEOptions>();
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [term, setTerm] = useState<ConsentTerm | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const session = getSession();
  const isDoctor =
    session?.user.roles.includes("Doctor") ||
    session?.user.roles.includes("MedicalDirector");
  const isPatient = session?.user.roles.includes("Patient");

  useEffect(() => {
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.replace("/login");
          return;
        }

        const details = await api.getAppointment(appointmentId);
        if (!active) return;
        setAppointment(details);

        if (currentSession.user.roles.includes("Patient") && !details.consentAccepted) {
          const consentTerm = await api.getConsentTerm();
          if (active) setTerm(consentTerm);
          return;
        }

        const canStart =
          currentSession.user.roles.includes("Doctor") ||
          currentSession.user.roles.includes("MedicalDirector");
        let room;
        if (canStart) {
          room = await api.startConsultation(appointmentId);
        } else {
          try {
            room = await api.getRoom(appointmentId);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
              if (active) {
                setWaiting(true);
                retry = setTimeout(connect, 5000);
              }
              return;
            }
            throw err;
          }
        }

        const access = await api.getLiveKitToken(appointmentId);
        if (active) {
          setWaiting(false);
          setAppointment({ ...details, roomName: room.roomName, videoStatus: room.status });
          setEncryptionKey(access.encryptionKey);
          setToken(access.token);
        }
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
      }
    }

    connect();
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
    };
  }, [appointmentId, attempt, router]);

  useEffect(() => {
    if (!encryptionKey) return;

    let active = true;
    const keyProvider = new ExternalE2EEKeyProvider();
    const worker = new Worker(
      new URL("livekit-client/e2ee-worker", import.meta.url),
      { type: "module" },
    );

    keyProvider
      .setKey(encryptionKey)
      .then(() => {
        if (active) setEncryption({ keyProvider, worker });
      })
      .catch(() => {
        if (active) setError("Este navegador não conseguiu preparar a criptografia da chamada.");
      });

    return () => {
      active = false;
      worker.terminate();
      setEncryption(undefined);
    };
  }, [encryptionKey]);

  const roomOptions = useMemo<RoomOptions | undefined>(
    () => (encryption ? { encryption } : undefined),
    [encryption],
  );

  async function acceptConsent() {
    if (!term) return;
    setAccepting(true);
    setError("");
    try {
      await api.acceptConsent(appointmentId, term.termVersion);
      setTerm(null);
      setAppointment((current) => current ? { ...current, consentAccepted: true } : current);
      setAttempt((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o consentimento.");
    } finally {
      setAccepting(false);
    }
  }

  async function openCheckout() {
    setPaying(true);
    setError("");
    try {
      const payment = await api.createCheckout(appointmentId);
      if (!payment.checkoutUrl) throw new Error("O provedor não retornou o link de pagamento.");
      window.location.href = payment.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar o pagamento.");
      setPaying(false);
    }
  }

  async function leave() {
    if (isDoctor) {
      await api.endConsultation(appointmentId).catch(() => undefined);
    }
    router.push("/consultas");
  }

  if (error) {
    return (
      <main className="min-h-screen bg-mist p-6">
        <div className="mx-auto max-w-xl pt-20">
          <ErrorBanner message={error} />
          <button className="text-sm font-bold text-teal-600" onClick={() => router.push("/consultas")}>
            Voltar para a agenda
          </button>
        </div>
      </main>
    );
  }

  if (
    appointment &&
    isPatient &&
    appointment.paymentRequired &&
    appointment.paymentStatus !== "Paid"
  ) {
    return (
      <GateCard
        icon={<CreditCard size={24} />}
        title="Pagamento pendente"
        description="A clínica exige a confirmação do pagamento antes da videochamada."
      >
        <button className={`${buttonClass} w-full`} onClick={openCheckout} disabled={paying}>
          {paying ? "Abrindo checkout..." : "Pagar em ambiente seguro"}
        </button>
      </GateCard>
    );
  }

  if (appointment && isPatient && term) {
    return (
      <GateCard
        icon={<ShieldCheck size={24} />}
        title="Consentimento para telemedicina"
        description={term.term}
      >
        <button className={`${buttonClass} w-full`} onClick={acceptConsent} disabled={accepting}>
          {accepting ? "Registrando..." : "Li e autorizo o atendimento remoto"}
        </button>
      </GateCard>
    );
  }

  if (waiting && appointment) {
    return (
      <GateCard
        icon={<Stethoscope size={24} />}
        title="Aguardando o médico"
        description={`Sua consulta está marcada para ${formatDateTime(appointment.scheduledAt)}. A conexão de vídeo começará quando o médico iniciar o atendimento.`}
      >
        <button className="text-sm font-bold text-teal-600" onClick={() => router.push("/consultas")}>
          Voltar para a agenda
        </button>
      </GateCard>
    );
  }

  if (!appointment || !token || !roomOptions) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink text-white">
        <LoadingState label="Preparando sua sala segura..." />
      </main>
    );
  }

  if (!serverUrl) {
    return (
      <main className="min-h-screen bg-mist p-6">
        <div className="mx-auto max-w-xl pt-20">
          <ErrorBanner message="Configure NEXT_PUBLIC_LIVEKIT_URL para iniciar a videochamada." />
        </div>
      </main>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      options={roomOptions}
      onEncryptionError={() =>
        setError("A criptografia ponta a ponta da chamada foi interrompida.")
      }
      onDisconnected={() => router.push("/consultas")}
      data-lk-theme="default"
      className="medsync-room min-h-[100dvh] bg-[#0e1716] lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden"
    >
      <div className="grid min-h-[100dvh] lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden lg:h-full">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#111d1b] px-5 text-white">
            <button
              className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
              onClick={leave}
            >
              <ArrowLeft size={17} /> {isDoctor ? "Encerrar consulta" : "Sair da sala"}
            </button>
            <span className="flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1.5 text-xs text-teal-200">
              <span className="size-1.5 rounded-full bg-teal-300" /> Criptografia ponta a ponta
            </span>
          </header>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <VideoConference />
            <RoomAudioRenderer />
          </div>
        </section>

        <aside className="border-l border-white/10 bg-[#15221f] p-6 text-white lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Consulta</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Dados do atendimento</h1>
          <div className="mt-7 space-y-5">
            <Detail icon={<UserRound size={18} />} label="Paciente" value={appointment.patientName} />
            <Detail
              icon={<Stethoscope size={18} />}
              label="Médico"
              value={`${appointment.doctorName} · ${appointment.specialty}`}
            />
            <Detail
              icon={<CalendarClock size={18} />}
              label="Horário"
              value={formatDateTime(appointment.scheduledAt)}
            />
            {appointment.notes && (
              <Detail icon={<FileText size={18} />} label="Observações" value={appointment.notes} />
            )}
          </div>
          <div className="mt-8 rounded-2xl border border-teal-300/10 bg-teal-300/5 p-4">
            <ShieldCheck size={19} className="text-teal-300" />
            <p className="mt-3 text-xs leading-5 text-white/45">
              O acesso usa um token temporário vinculado à consulta e ao usuário autenticado.
              Áudio, vídeo e mensagens são criptografados ponta a ponta. A chamada não é gravada
              pelo MedSync.
            </p>
          </div>
        </aside>
      </div>
    </LiveKitRoom>
  );
}

function GateCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-mist p-6">
      <section className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
        <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          {icon}
        </span>
        <h1 className="mt-6 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-teal-300">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-white/35">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-5 text-white/85">{value}</p>
      </div>
    </div>
  );
}
