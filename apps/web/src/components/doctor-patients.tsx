"use client";

import { Badge, Card, ErrorBanner, LoadingState, PageHeader, SearchField, cn } from "@/components/ui";
import { isAppointmentMissed } from "@/lib/appointments";
import { formatDate, formatDateTime, statusClass, statusLabel } from "@/lib/format";
import type { Appointment, Patient } from "@/lib/types";
import { api } from "@/services/api";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Pacientes do médico (Fase 2): só quem tem consulta com ele (regra C1). Tela de leitura; o caminho para o
// contexto clínico é o prontuário da próxima ou da última consulta.

type Filter = "all" | "upcoming";

type Row = {
  patient: Patient;
  total: number;
  next?: Appointment;
  last?: Appointment;
};

export function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    Promise.all([api.getPatients(), api.getAppointments()])
      .then(([patientData, appointmentData]) => {
        setPatients(patientData);
        setAppointments(appointmentData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar pacientes."))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const now = Date.now();
    return patients
      .map((patient) => {
        const own = appointments
          .filter((appointment) => appointment.patientId === patient.id && appointment.status !== "Cancelled")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        const upcoming = own.filter(
          (appointment) =>
            (appointment.status === "Scheduled" && !isAppointmentMissed(appointment)) || appointment.status === "InProgress",
        );
        const past = own.filter((appointment) => new Date(appointment.scheduledAt).getTime() <= now && !upcoming.includes(appointment));
        return { patient, total: own.length, next: upcoming[0], last: past[past.length - 1] };
      })
      .sort((a, b) => {
        // Who is coming next first; then who was seen most recently.
        if (a.next && b.next) return a.next.scheduledAt.localeCompare(b.next.scheduledAt);
        if (a.next || b.next) return a.next ? -1 : 1;
        return (b.last?.scheduledAt ?? "").localeCompare(a.last?.scheduledAt ?? "");
      });
  }, [appointments, patients]);

  const visible = rows.filter(
    (row) =>
      (filter === "all" || row.next) &&
      `${row.patient.name} ${row.patient.cpfMasked}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const upcomingCount = rows.filter((row) => row.next).length;

  return (
    <>
      <PageHeader
        eyebrow="Portal médico"
        title="Pacientes vinculados"
        description="Só aparecem os pacientes que têm consulta com você. Abra o prontuário para ver histórico, medicações em uso e receitas."
      />
      {error && <ErrorBanner message={error} />}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SearchField
            label="Buscar paciente por nome ou CPF"
            placeholder="Buscar paciente por nome ou CPF"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Filtrar pacientes">
          {(
            [
              ["all", `Todos (${rows.length})`],
              ["upcoming", `Com consulta marcada (${upcomingCount})`],
            ] as Array<[Filter, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "h-9 rounded-md px-4 text-xs font-bold transition",
                filter === value ? "bg-teal-50 text-teal-800 ring-1 ring-teal-100" : "text-slate-500 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Carregando pacientes..." />
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          {rows.length === 0
            ? "Você ainda não tem pacientes. Eles aparecem aqui quando uma consulta é marcada com você."
            : "Nenhum paciente encontrado com esse filtro."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_.5fr_auto] gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 lg:grid">
            <span>Paciente</span>
            <span>Próxima consulta</span>
            <span>Última consulta</span>
            <span>Consultas</span>
            <span className="w-36" />
          </div>
          <ul className="divide-y divide-slate-100">
            {visible.map(({ patient, total, next, last }) => {
              const recordFor = next ?? last;
              return (
                <li key={patient.id} className="grid gap-3 px-6 py-4 lg:grid-cols-[1.4fr_1fr_1fr_.5fr_auto] lg:items-center lg:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{patient.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      CPF {patient.cpfMasked} · nasc. {formatDate(patient.birthDate)}
                    </p>
                  </div>
                  <AppointmentCell label="Próxima" appointment={next} empty="Nenhuma marcada" />
                  <AppointmentCell label="Última" appointment={last} empty="Primeira consulta" />
                  <p className="text-sm text-slate-600">
                    <span className="lg:hidden">Consultas: </span>
                    {total}
                  </p>
                  {recordFor ? (
                    <Link
                      href={`/prontuario/${recordFor.id}`}
                      className="inline-flex h-10 w-36 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 hover:bg-teal-100"
                    >
                      <FileText size={15} /> Abrir prontuário
                    </Link>
                  ) : (
                    <span className="w-36" />
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

function AppointmentCell({ label, appointment, empty }: { label: string; appointment?: Appointment; empty: string }) {
  return (
    <div className="text-sm">
      <span className="text-xs text-slate-400 lg:hidden">{label}: </span>
      {appointment ? (
        <>
          <span className="text-slate-700">{formatDateTime(appointment.scheduledAt)}</span>
          <Badge className={cn("ml-2", statusClass[appointment.status])}>{statusLabel[appointment.status]}</Badge>
        </>
      ) : (
        <span className="text-slate-400">{empty}</span>
      )}
    </div>
  );
}
