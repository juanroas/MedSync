"use client";

import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionHeader,
  buttonClass,
} from "@/components/ui";
import {
  appointmentStatusLabel,
  appointmentStatusTone,
  canDoctorOpenRoom,
  isAppointmentJoinWindowOpen,
  isAppointmentMissed,
  isAppointmentRoomJoinable,
  isAppointmentStaleInProgress,
} from "@/lib/appointments";
import { formatDateTime, formatTime, statusClass, statusLabel } from "@/lib/format";
import type {
  Appointment,
  ClinicActivation,
  Doctor,
  Patient,
  SupportRequest,
} from "@/lib/types";
import { api, getSession } from "@/services/api";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const schedulingRoles = ["ClinicAdmin"];

const joinRoles = ["Doctor", "Patient"];
const appointmentLoadRoles = [...schedulingRoles, "Patient", "Doctor"];
const patientLoadRoles = [...schedulingRoles, "Patient", "Doctor"];

function ClinicPendingBanner() {
  return (
    <section className="mb-7 flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
          <ShieldCheck size={20} />
        </span>
        <div>
          <p className="font-bold text-amber-900">Cadastro recebido — você já pode configurar a clínica.</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Cadastre a equipe e a agenda enquanto o Médico ADM MedSync confere o CNPJ. Pacientes e consultas são
            liberados assim que a clínica for ativada. Fale com o suporte para acelerar.
          </p>
        </div>
      </div>
      <Link
        href={`/ajuda?subject=${encodeURIComponent("Finalizar ativação da clínica")}`}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-bold text-white hover:bg-amber-700"
      >
        Falar com o suporte
      </Link>
    </section>
  );
}

export default function DashboardPage() {
  const session = getSession();
  const roles = session?.user.roles ?? [];
  const clinicPending =
    roles.includes("ClinicAdmin") && (session?.user.clinicActivationStatus ?? "Active") !== "Active";
  const isPatientHome = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isDoctorHome = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  const isMedicalAdminHome = roles.includes("MedicalDirector");
  const isSupportHome = roles.includes("Support") && !isMedicalAdminHome;
  const isDpoHome = roles.includes("DataProtectionOfficer") && !isMedicalAdminHome;
  const canSchedule = roles.some((role) => schedulingRoles.includes(role));
  const canJoin = roles.some((role) => joinRoles.includes(role));
  const canViewAudit = roles.some((role) => ["ClinicAdmin", "DataProtectionOfficer"].includes(role));
  const canLoadAppointments = roles.some((role) => appointmentLoadRoles.includes(role));
  const canLoadPatients = roles.some((role) => patientLoadRoles.includes(role));
  const canLoadDoctors = roles.some((role) => schedulingRoles.includes(role));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      canLoadAppointments ? api.getAppointments() : Promise.resolve([]),
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
  }, [canLoadAppointments, canLoadDoctors, canLoadPatients]);

  const upcoming = useMemo(
    () =>
      appointments
        .filter(
          (item) =>
            (item.status === "Scheduled" && !isAppointmentMissed(item)) ||
            (item.status === "InProgress" && !isAppointmentStaleInProgress(item)),
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 4),
    [appointments],
  );

  if (isPatientHome) {
    return (
      <PatientCareHome
        appointments={appointments}
        loading={loading}
        error={error}
        patient={patients[0]}
      />
    );
  }

  if (isDoctorHome) {
    return (
      <DoctorHome
        appointments={appointments}
        loading={loading}
        error={error}
      />
    );
  }

  if (isDpoHome) {
    return <DpoHome error={error} />;
  }

  if (isMedicalAdminHome) {
    return <MedicalAdminHome />;
  }

  if (isSupportHome) {
    return <SupportHome />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Visao geral"
        title="Central de operacao"
        description="Acompanhe atendimentos, agenda e acessos permitidos para o seu perfil."
        action={canSchedule && !clinicPending ? (
          <Link href="/consultas/nova" className={buttonClass}>
            <CalendarCheck2 size={17} /> Nova consulta
          </Link>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {clinicPending && <ClinicPendingBanner />}
      {loading ? (
        <LoadingState label="Organizando seu painel..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Consultas" value={appointments.length} detail="total agendado" icon={<CalendarCheck2 size={20} />} tone="success" />
            <MetricCard label="Pacientes" value={patients.length} detail="cadastros permitidos" icon={<Users size={20} />} tone="info" />
            <MetricCard label="Medicos" value={doctors.length} detail="credenciados" icon={<Stethoscope size={20} />} tone="neutral" />
            <MetricCard label="Proximas" value={upcoming.length} detail="aguardando atendimento" icon={<Clock3 size={20} />} tone="warning" />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_.75fr]">
            <AppointmentsPanel appointments={upcoming} canJoin={canJoin} />

            <aside className="subtle-grid overflow-hidden rounded-lg bg-ink p-7 text-white">
              <span className="grid size-12 place-items-center rounded-lg bg-teal-400/15 text-teal-200">
                <ShieldCheck size={21} />
              </span>
              <h2 className="mt-7 text-2xl font-bold">Privacidade por perfil.</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Dados clinicos permanecem restritos aos perfis autorizados.
              </p>
              {canViewAudit && (
                <Link
                  href="/auditoria"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-teal-200"
                >
                  Ver auditoria <ArrowRight size={15} />
                </Link>
              )}
            </aside>
          </section>
        </>
      )}
    </>
  );
}

function DpoHome({ error }: { error: string }) {
  return (
    <>
      <PageHeader
        eyebrow="Privacidade"
        title="DPO MedSync"
        description="Fila de privacidade, direitos do titular e evidencias de auditoria. Este perfil nao opera financeiro nem atendimento."
      />
      {error && <ErrorBanner message={error} />}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <LockKeyhole size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Direitos do titular</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registre, acompanhe e conclua solicitacoes com referencia minimizada e trilha operacional.
          </p>
          <Link href="/privacidade" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            Abrir privacidade <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <ListChecks size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Auditoria de acesso</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Consulte eventos e tentativas negadas para investigar finalidade, evidencias e possiveis incidentes.
          </p>
          <Link href="/auditoria" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            Abrir auditoria <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <ShieldCheck size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Minimizacao</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            O DPO vê só metadados: quem acessou, quando e o resultado. Prontuário, diagnóstico e conteúdo de chamada ficam fora.
          </p>
        </Card>
      </section>
    </>
  );
}

function DoctorHome({
  appointments,
  loading,
  error,
}: {
  appointments: Appointment[];
  loading: boolean;
  error: string;
}) {
  const now = new Date();
  const byTime = (a: Appointment, b: Appointment) =>
    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  const isOpen = (item: Appointment) =>
    (item.status === "Scheduled" && !isAppointmentMissed(item)) ||
    (item.status === "InProgress" && !isAppointmentStaleInProgress(item));
  const today = appointments
    .filter((item) => item.status !== "Cancelled" && isSameRange(item.scheduledAt, now, "day"))
    .sort(byTime);
  const toAttendToday = today.filter(isOpen).length;
  const completedToday = today.filter((item) => item.status === "Completed").length;
  const week = appointments.filter(
    (item) => item.status !== "Cancelled" && isSameRange(item.scheduledAt, now, "week"),
  ).length;
  const next = appointments.filter(isOpen).sort(byTime)[0];

  return (
    <>
      <PageHeader
        eyebrow="Portal médico"
        title="Painel"
        description="Suas consultas de hoje e a próxima a atender. Os agendamentos são criados pela clínica ou solicitados pelo paciente."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando sua agenda..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Hoje" value={today.length} detail="consultas no dia" icon={<CalendarCheck2 size={20} />} tone="success" />
            <MetricCard label="A atender" value={toAttendToday} detail="ainda hoje" icon={<Clock3 size={20} />} tone="warning" />
            <MetricCard label="Concluídas" value={completedToday} detail="hoje" icon={<CheckCircle2 size={20} />} tone="info" />
            <MetricCard label="Semana" value={week} detail="consultas na semana" icon={<CalendarDays size={20} />} tone="neutral" />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
            <NextConsultationCard appointment={next} />
            <Card className="overflow-hidden">
              <SectionHeader
                title="Agenda de hoje"
                description="Em ordem de horário"
                action={(
                  <Link href="/consultas" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                    Ver agenda <ArrowRight size={14} />
                  </Link>
                )}
              />
              {today.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-slate-400">Nenhuma consulta hoje.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {today.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                      <span className="w-14 shrink-0 text-sm font-bold text-ink">{formatTime(item.scheduledAt)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{item.patientName}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.specialty}</p>
                      </div>
                      <Badge className={appointmentStatusClass(item)}>{appointmentStatusText(item)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function NextConsultationCard({ appointment }: { appointment?: Appointment }) {
  if (!appointment) {
    return (
      <Card className="p-6">
        <p className="text-xs font-bold uppercase text-teal-600">Próxima consulta</p>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Nenhuma consulta agendada. Seus horários disponíveis ficam em Agenda.
        </p>
      </Card>
    );
  }

  const roomOpen = canDoctorOpenRoom(appointment);
  return (
    <Card className="p-6">
      <p className="text-xs font-bold uppercase text-teal-600">Próxima consulta</p>
      <h2 className="mt-3 text-2xl font-bold text-ink">{appointment.patientName}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {appointment.specialty} · {formatDateTime(appointment.scheduledAt)}
      </p>
      <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
        <ShieldCheck className={appointment.consentAccepted ? "text-teal-600" : "text-amber-600"} size={15} />
        {appointment.consentAccepted
          ? "Paciente aceitou o termo de telemedicina."
          : "O paciente ainda precisa aceitar o termo de telemedicina."}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        {roomOpen ? (
          <Link href={`/sala/${appointment.id}`} className={buttonClass}>
            <Video size={17} /> Entrar na sala
          </Link>
        ) : (
          <p className="text-sm text-slate-500">A sala abre 15 minutos antes do horário.</p>
        )}
        <Link href={`/prontuario/${appointment.id}`} className="text-sm font-bold text-teal-700 hover:text-teal-800">
          Ver prontuário
        </Link>
      </div>
    </Card>
  );
}

function MedicalAdminHome() {
  const [clinics, setClinics] = useState<ClinicActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getClinicActivations()
      .then(setClinics)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar clínicas."))
      .finally(() => setLoading(false));
  }, []);

  const pending = clinics.filter((clinic) => clinic.activationStatus === "Pending");
  const active = clinics.filter((clinic) => clinic.activationStatus === "Active").length;
  const suspended = clinics.filter((clinic) => clinic.activationStatus === "Suspended").length;

  return (
    <>
      <PageHeader
        eyebrow="Médico ADM MedSync"
        title="Painel"
        description="Responsável técnico da plataforma: confira e ative as clínicas cadastradas."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando clínicas..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Aguardando análise" value={pending.length} detail="clínicas cadastradas" icon={<Clock3 size={20} />} tone="warning" />
            <MetricCard label="Ativas" value={active} detail="atendendo pacientes" icon={<CheckCircle2 size={20} />} tone="success" />
            <MetricCard label="Suspensas" value={suspended} detail="sem novas consultas" icon={<ShieldCheck size={20} />} tone="neutral" />
          </section>
          <Card className="mt-7 overflow-hidden">
            <SectionHeader
              title="Clínicas aguardando análise"
              description="Confira CNPJ e responsável técnico antes de ativar"
              action={(
                <Link href="/clinicas" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                  Ver todas <ArrowRight size={14} />
                </Link>
              )}
            />
            {pending.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Building2 size={22} />} title="Nenhuma clínica aguardando" description="Novos cadastros aparecem aqui." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending.slice(0, 5).map((clinic) => (
                  <div key={clinic.clinicId} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{clinic.clinicName}</p>
                      <p className="mt-1 text-xs text-slate-500">CNPJ {clinic.taxIdMasked ?? "—"}</p>
                    </div>
                    <Badge tone="warning">Em análise</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function SupportHome() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSupportRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar a fila de ajuda."))
      .finally(() => setLoading(false));
  }, []);

  const open = requests.filter((request) => request.status !== "Resolved");
  const newCount = requests.filter((request) => request.status === "New").length;
  const inProgress = requests.filter((request) => request.status === "InProgress").length;

  return (
    <>
      <PageHeader eyebrow="Suporte MedSync" title="Painel" description="Pedidos de ajuda de todas as clínicas." />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando a fila de ajuda..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Novos" value={newCount} detail="aguardando primeira resposta" icon={<Clock3 size={20} />} tone="warning" />
            <MetricCard label="Em atendimento" value={inProgress} detail="com o suporte" icon={<ListChecks size={20} />} tone="info" />
          </section>
          <Card className="mt-7 overflow-hidden">
            <SectionHeader
              title="Pedidos em aberto"
              description="Os mais recentes primeiro"
              action={(
                <Link href="/ajuda" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                  Ver todos <ArrowRight size={14} />
                </Link>
              )}
            />
            {open.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<CheckCircle2 size={22} />} title="Fila em dia" description="Nenhum pedido de ajuda em aberto." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {open.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{request.subject}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{request.requesterName} · {formatDateTime(request.createdAt)}</p>
                    </div>
                    <Badge tone={request.status === "New" ? "warning" : "info"}>{request.status === "New" ? "Novo" : "Em atendimento"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function PatientCareHome({
  appointments,
  loading,
  error,
  patient,
}: {
  appointments: Appointment[];
  loading: boolean;
  error: string;
  patient?: Patient;
}) {
  const sorted = useMemo(
    () =>
      appointments
        .slice()
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointments],
  );
  const nextAppointment = sorted.find((item) => isAppointmentRoomJoinable(item)) ??
    sorted.find((item) => item.status === "Scheduled" && isAppointmentJoinWindowOpen(item)) ??
    sorted.find((item) => item.status === "Scheduled" && !isAppointmentMissed(item) && new Date(item.scheduledAt).getTime() >= Date.now()) ??
    sorted.find((item) => item.status === "InProgress" && !isAppointmentStaleInProgress(item)) ??
    sorted.find((item) => item.status === "Scheduled" && !isAppointmentMissed(item));
  const history = sorted.slice(-4).reverse();
  const joinAvailable = nextAppointment ? isAppointmentRoomJoinable(nextAppointment) : false;
  const roomBlockedReason = nextAppointment ? careBlockReason(nextAppointment) : null;
  const nextStep = nextAppointment ? patientCareStep(nextAppointment) : null;
  const inProgressCount = appointments.filter((item) => item.status === "InProgress").length;
  const scheduledCount = appointments.filter(
    (item) => item.status === "Scheduled" && !isAppointmentMissed(item),
  ).length;
  const completedCount = appointments.filter((item) => item.status === "Completed").length;

  return (
    <>
      <PageHeader
        eyebrow="MedSync Care"
        title="Acesse seu cuidado digital"
        description="Consulte seus atendimentos, termos e entrada na sala em um ambiente privado."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando sua jornada de cuidado..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Em andamento" value={inProgressCount} icon={<Video size={20} />} tone="warning" />
            <MetricCard label="Agendadas" value={scheduledCount} icon={<CalendarCheck2 size={20} />} tone="info" />
            <MetricCard label="Concluidas" value={completedCount} icon={<CheckCircle2 size={20} />} tone="success" />
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
            <Card className="p-6 sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Proximo atendimento</p>
                  {nextAppointment ? (
                    <>
                      <h2 className="mt-3 text-3xl font-bold text-ink">{nextAppointment.specialty}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {nextAppointment.doctorName} - {formatDateTime(nextAppointment.scheduledAt)}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-3 text-3xl font-bold text-ink">Nenhuma consulta agendada</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Quando um atendimento for autorizado, ele aparece aqui.
                      </p>
                    </>
                  )}
                </div>
                {nextAppointment ? (
                  nextStep?.href ? (
                    <Link
                      href={nextStep.href}
                      className={nextStep.primary
                        ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
                        : "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 text-sm font-bold text-slate-700 hover:bg-slate-200"}
                    >
                      {nextStep.icon} {nextStep.cta}
                    </Link>
                  ) : (
                    <span
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 text-sm font-bold text-slate-700"
                    >
                      {nextStep?.icon ?? <Clock3 size={17} />} {nextStep?.cta ?? "Acompanhar status"}
                    </span>
                  )
                ) : (
                  <Link
                    href="/consultas/nova"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white hover:bg-teal-700"
                  >
                    <CalendarCheck2 size={17} /> Solicitar consulta
                  </Link>
                )}
              </div>
              {roomBlockedReason && (
                <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {roomBlockedReason}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-coral-50 text-coral-600">
                  <UserRound size={22} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-slate-400">Seu cadastro</p>
                  <h2 className="mt-2 truncate text-xl font-bold text-ink">
                    {patient?.name ?? "Paciente MedSync"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    CPF {patient?.cpfMasked ?? "***"}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <CareStatus
                  icon={<CheckCircle2 size={18} />}
                  label="Cadastro"
                  value={patient ? "Ativo" : "Em verificacao"}
                  tone={patient ? "success" : "warning"}
                />
                <CareStatus
                  icon={<FileText size={18} />}
                  label="Termo"
                  value={!nextAppointment ? "Pendente quando houver consulta" : nextAppointment.consentAccepted ? "Aceito" : "Pendente"}
                  tone={!nextAppointment ? "neutral" : nextAppointment.consentAccepted ? "success" : "warning"}
                />
                <CareStatus
                  icon={<Video size={18} />}
                  label="Sala"
                  value={joinAvailable ? "Liberada" : nextStep?.status ?? "Aguardando autorizacao"}
                  tone={joinAvailable ? "success" : "warning"}
                />
              </div>
            </Card>
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="overflow-hidden">
              <SectionHeader
                title="Minhas consultas"
                description="Atendimentos vinculados ao seu cadastro"
                action={(
                  <Link href="/consultas" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                    Ver todas <ArrowRight size={14} />
                  </Link>
                )}
              />
              {history.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<CalendarCheck2 size={22} />}
                    title="Voce ainda nao tem consultas"
                    description="Seus atendimentos aparecem aqui. Use o botão acima para solicitar uma consulta."
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      perspective="patient"
                      canJoin={
                        appointment.status === "InProgress" &&
                        appointment.consentAccepted &&
                        Boolean(appointment.roomName)
                      }
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <p className="text-xs font-bold uppercase text-teal-600">Privacidade</p>
              <h2 className="mt-2 text-base font-bold text-ink">Seus dados clínicos são só seus.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Só você e o médico que te atendeu veem prontuário e diagnóstico.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "A administração da clínica vê agenda e cadastro, nunca o prontuário.",
                  "Entrada em sala exige vinculo, horario e consentimento.",
                ].map((item) => (
                  <p key={item} className="flex gap-2 text-xs text-slate-600">
                    <ShieldCheck className="mt-0.5 shrink-0 text-teal-600" size={14} />
                    {item}
                  </p>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function AppointmentsPanel({
  appointments,
  canJoin,
}: {
  appointments: Appointment[];
  canJoin: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        title="Proximos atendimentos"
        description="Agenda mais imediata"
        action={(
          <Link href="/consultas" className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
            Ver agenda <ArrowRight size={14} />
          </Link>
        )}
      />
      <div className="divide-y divide-slate-100">
        {appointments.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400">
            Nenhuma consulta agendada.
          </p>
        ) : (
          appointments.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} canJoin={canJoin} />
          ))
        )}
      </div>
    </Card>
  );
}

function AppointmentRow({
  appointment,
  canJoin,
  perspective = "doctor",
}: {
  appointment: Appointment;
  canJoin: boolean;
  perspective?: "doctor" | "patient";
}) {
  const step = patientCareStep(appointment);
  const joinReady = canJoin && isAppointmentRoomJoinable(appointment);
  const primaryName = perspective === "patient" ? appointment.doctorName : appointment.patientName;
  const secondaryLine = perspective === "patient"
    ? appointment.specialty
    : `${appointment.doctorName} - ${appointment.specialty}`;

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
        {primaryName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{primaryName}</p>
        <p className="mt-1 text-xs text-slate-400">{secondaryLine}</p>
      </div>
      <div className="sm:text-right">
        <p className="text-sm font-semibold text-ink">
          {formatDateTime(appointment.scheduledAt)}
        </p>
        <Badge className={appointmentStatusClass(appointment)}>
          {appointmentStatusText(appointment)}
        </Badge>
      </div>
      {joinReady ? (
        <Link
          href={`/sala/${appointment.id}`}
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink text-white hover:bg-teal-700"
          aria-label="Entrar na sala"
        >
          <Video size={17} />
        </Link>
      ) : canJoin && step.href ? (
        <Link
          href={step.href}
          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${step.badgeClass}`}
        >
          {step.cta}
        </Link>
      ) : canJoin ? (
        <span className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${step.badgeClass}`}>
          {step.status}
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}


function CareStatus({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClass = {
    neutral: "bg-slate-50 text-slate-600",
    success: "bg-teal-50 text-teal-700",
    warning: "bg-amber-50 text-amber-700",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3">
      <span className="flex min-w-0 items-center gap-3 text-sm font-semibold text-slate-600">
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>{icon}</span>
        {label}
      </span>
      <span className="text-right text-xs font-bold text-ink">{value}</span>
    </div>
  );
}

function careBlockReason(appointment: Appointment) {
  if (appointment.paymentRequired && appointment.paymentStatus !== "Paid") {
    return "Entrada aguardando confirmacao de pagamento.";
  }
  if (isAppointmentMissed(appointment)) {
    return "Horario de entrada encerrado. Solicite um novo atendimento se necessario.";
  }
  if (isAppointmentStaleInProgress(appointment)) {
    return "Horario de entrada encerrado. O atendimento precisa ser encerrado pelo medico responsavel.";
  }
  if (!appointment.consentAccepted) {
    return "Termo de telemedicina pendente antes da entrada na sala.";
  }
  if (appointment.status !== "InProgress") {
    return "Sala de espera disponivel quando o atendimento for iniciado.";
  }
  if (!appointment.roomName) {
    return "Sala ainda nao criada pelo medico responsavel.";
  }
  return null;
}

function patientCareStep(appointment: Appointment) {
  if (appointment.paymentRequired && appointment.paymentStatus !== "Paid") {
    return {
      cta: "Resolver pagamento",
      status: "Pagamento pendente",
      href: `/sala/${appointment.id}`,
      primary: false,
      icon: <Clock3 size={17} />,
      badgeClass: "bg-amber-50 text-amber-700",
    };
  }

  if (isAppointmentMissed(appointment)) {
    return {
      cta: "Não realizada",
      status: "Não realizada",
      primary: false,
      icon: <CalendarCheck2 size={17} />,
      badgeClass: "bg-amber-50 text-amber-700",
    };
  }

  if (!appointment.consentAccepted && ["Scheduled", "InProgress"].includes(appointment.status) && !isAppointmentStaleInProgress(appointment)) {
    return {
      cta: "Aceitar termo",
      status: "Termo pendente",
      href: `/sala/${appointment.id}`,
      primary: false,
      icon: <FileText size={17} />,
      badgeClass: "bg-teal-50 text-teal-700",
    };
  }

  if (isAppointmentRoomJoinable(appointment)) {
    return {
      cta: "Entrar na sala",
      status: "Sala liberada",
      href: `/sala/${appointment.id}`,
      primary: true,
      icon: <Video size={17} />,
      badgeClass: "bg-teal-50 text-teal-700",
    };
  }

  if (appointment.status === "InProgress") {
    if (isAppointmentStaleInProgress(appointment)) {
      return {
        cta: "Horario encerrado",
        status: "Horario encerrado",
        primary: false,
        icon: <Clock3 size={17} />,
        badgeClass: "bg-slate-50 text-slate-500",
      };
    }

    return {
      cta: "Aguardando medico",
      status: "Aguardando medico",
      primary: false,
      icon: <Clock3 size={17} />,
      badgeClass: "bg-amber-50 text-amber-700",
    };
  }

  if (appointment.status === "Scheduled") {
    return {
      cta: "Aguardar horario",
      status: "Aguardando horario",
      primary: false,
      icon: <Clock3 size={17} />,
      badgeClass: "bg-slate-50 text-slate-500",
    };
  }

  if (appointment.status === "Completed") {
    return {
      cta: "Concluida",
      status: "Concluida",
      primary: false,
      icon: <CheckCircle2 size={17} />,
      badgeClass: "bg-teal-50 text-teal-700",
    };
  }

  return {
    cta: statusLabel[appointment.status],
    status: statusLabel[appointment.status],
    primary: false,
    icon: <Clock3 size={17} />,
    badgeClass: "bg-slate-50 text-slate-500",
  };
}

const appointmentStatusText = appointmentStatusLabel;
const appointmentStatusClass = appointmentStatusTone;

function isSameRange(value: string, reference: Date, range: "day" | "week" | "month" | "year") {
  const date = new Date(value);
  if (range === "year") return date.getFullYear() === reference.getFullYear();
  if (range === "month") {
    return date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth();
  }
  if (range === "day") {
    return date.getFullYear() === reference.getFullYear() &&
      date.getMonth() === reference.getMonth() &&
      date.getDate() === reference.getDate();
  }
  const weekStart = new Date(reference);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(reference.getDate() - reference.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}
