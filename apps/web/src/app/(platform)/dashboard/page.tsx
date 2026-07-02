"use client";

import { ErrorBanner, LoadingState, PageHeader } from "@/components/ui";
import { formatDateTime, statusClass, statusLabel } from "@/lib/format";
import type { Appointment, Doctor, Patient } from "@/lib/types";
import { api, getSession } from "@/services/api";
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const roles = getSession()?.user.roles ?? [];
  const canSchedule = roles.some((role) =>
    ["Doctor", "Receptionist", "ClinicAdmin", "MedicalDirector"].includes(role),
  );
  const canJoin = roles.some((role) =>
    ["Doctor", "Patient", "MedicalDirector"].includes(role),
  );
  const canLoadPatients = roles.some((role) =>
    ["Doctor", "Patient", "Receptionist", "ClinicAdmin", "MedicalDirector"].includes(role),
  );
  const canLoadDoctors = roles.some((role) =>
    ["Doctor", "Receptionist", "ClinicAdmin", "MedicalDirector"].includes(role),
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.getAppointments(),
      canLoadDoctors ? api.getDoctors() : Promise.resolve([]),
      canLoadPatients ? api.getPatients() : Promise.resolve([]),
    ])
      .then(([appointmentData, doctorData, patientData]) => {
        setAppointments(appointmentData);
        setDoctors(doctorData);
        setPatients(patientData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar painel."))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments
    .filter((item) => item.status === "Scheduled" || item.status === "InProgress")
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Bom ter você por aqui."
        description="Acompanhe a operação da clínica e acesse rapidamente os próximos atendimentos."
        action={canSchedule ? (
          <Link
            href="/consultas/nova"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
          >
            <CalendarCheck2 size={17} /> Nova consulta
          </Link>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Organizando seu painel..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Consultas",
                value: appointments.length,
                detail: "total agendado",
                icon: CalendarCheck2,
                color: "bg-teal-50 text-teal-600",
              },
              {
                label: "Pacientes",
                value: patients.length,
                detail: "cadastrados",
                icon: Users,
                color: "bg-blue-50 text-blue-600",
              },
              {
                label: "Médicos",
                value: doctors.length,
                detail: "na equipe",
                icon: Stethoscope,
                color: "bg-violet-50 text-violet-600",
              },
              {
                label: "Próximas",
                value: upcoming.length,
                detail: "aguardando atendimento",
                icon: Clock3,
                color: "bg-amber-50 text-amber-600",
              },
            ].map(({ label, value, detail, icon: Icon, color }) => (
              <article key={label} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
                  </div>
                  <span className={`grid size-11 place-items-center rounded-2xl ${color}`}>
                    <Icon size={20} />
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-400">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="font-bold text-ink">Próximos atendimentos</h2>
                  <p className="mt-1 text-xs text-slate-400">Sua agenda mais imediata</p>
                </div>
                <Link href="/consultas" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                  Ver agenda <ArrowRight size={14} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {upcoming.length === 0 ? (
                  <p className="px-6 py-12 text-center text-sm text-slate-400">
                    Nenhuma consulta agendada.
                  </p>
                ) : (
                  upcoming.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-sm font-bold text-teal-700">
                        {appointment.patientName
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{appointment.patientName}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {appointment.doctorName} · {appointment.specialty}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-sm font-semibold text-ink">
                          {formatDateTime(appointment.scheduledAt)}
                        </p>
                        <span
                          className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass[appointment.status]}`}
                        >
                          {statusLabel[appointment.status]}
                        </span>
                      </div>
                      {canJoin && (
                        <Link
                          href={`/sala/${appointment.id}`}
                          className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white hover:bg-teal-700"
                          aria-label="Entrar na sala"
                        >
                          <Video size={17} />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <aside className="subtle-grid relative overflow-hidden rounded-3xl bg-ink p-7 text-white">
              <div className="absolute -right-16 -top-16 size-48 rounded-full bg-teal-500/20 blur-2xl" />
              <span className="relative grid size-12 place-items-center rounded-2xl bg-teal-400/15 text-teal-200">
                <Video size={21} />
              </span>
              <h2 className="relative mt-7 text-2xl font-bold tracking-tight">Sala virtual pronta.</h2>
              <p className="relative mt-3 text-sm leading-6 text-white/55">
                Crie uma consulta e entre na chamada com áudio e vídeo direto pelo navegador.
              </p>
              <Link
                href="/consultas"
                className="relative mt-8 inline-flex items-center gap-2 text-sm font-bold text-teal-200"
              >
                Abrir agenda <ArrowRight size={15} />
              </Link>
            </aside>
          </section>
        </>
      )}
    </>
  );
}
