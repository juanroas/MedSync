"use client";

import "@livekit/components-styles";

import { ErrorBanner, LoadingState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { api, getSession } from "@/services/api";
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from "@livekit/components-react";
import { ArrowLeft, CalendarClock, FileText, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ConsultationRoom({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    let active = true;

    async function connect() {
      try {
        const session = getSession();
        if (!session) {
          router.replace("/login");
          return;
        }
        const details = await api.getAppointment(appointmentId);
        const room = await api.createRoom(appointmentId);
        const access = await api.getLiveKitToken(room.roomName, session.user.id);
        if (active) {
          setAppointment({ ...details, roomName: room.roomName });
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
    };
  }, [appointmentId, router]);

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

  if (!appointment || !token) {
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
      onDisconnected={() => router.push("/consultas")}
      data-lk-theme="default"
      className="min-h-screen bg-[#0e1716]"
    >
      <div className="grid min-h-screen lg:grid-cols-[1fr_340px]">
        <section className="flex min-h-[70vh] min-w-0 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#111d1b] px-5 text-white">
            <button
              className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
              onClick={() => router.push("/consultas")}
            >
              <ArrowLeft size={17} /> Sair da sala
            </button>
            <span className="flex items-center gap-2 rounded-full bg-teal-400/10 px-3 py-1.5 text-xs text-teal-200">
              <span className="size-1.5 rounded-full bg-teal-300" /> Sala protegida
            </span>
          </header>
          <div className="min-h-0 flex-1">
            <VideoConference />
            <RoomAudioRenderer />
          </div>
        </section>

        <aside className="border-l border-white/10 bg-[#15221f] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Consulta</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Dados do atendimento</h1>
          <div className="mt-7 space-y-5">
            <Detail
              icon={<UserRound size={18} />}
              label="Paciente"
              value={appointment.patientName}
            />
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
            <Detail
              icon={<FileText size={18} />}
              label="Observações"
              value={appointment.notes || "Nenhuma observação registrada."}
            />
          </div>
          <div className="mt-8 rounded-2xl border border-teal-300/10 bg-teal-300/5 p-4">
            <ShieldCheck size={19} className="text-teal-300" />
            <p className="mt-3 text-xs leading-5 text-white/45">
              O acesso à sala usa um token temporário emitido pela API. Nunca compartilhe o link
              da consulta.
            </p>
          </div>
        </aside>
      </div>
    </LiveKitRoom>
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

