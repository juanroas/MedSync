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
import { isAppointmentJoinWindowOpen, isAppointmentRoomJoinable, isAppointmentStaleInProgress } from "@/lib/appointments";
import { formatDateTime, statusClass, statusLabel } from "@/lib/format";
import type { Appointment, BusinessReportCompany, ClinicRole, CompanyPortal, Doctor, FinanceInvoice, Patient } from "@/lib/types";
import { api, getSession } from "@/services/api";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileText,
  HeartPulse,
  ListChecks,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const schedulingRoles = [
  "Receptionist",
  "ClinicAdmin",
  "MedicalDirector",
  "Support",
  "OccupationalHealthAdmin",
];

const joinRoles = ["Doctor", "Patient", "MedicalDirector", "OccupationalHealthAdmin"];
const appointmentLoadRoles = [...schedulingRoles, "Patient", "Doctor", "PlatformAdmin"];
const patientLoadRoles = [...schedulingRoles, "Patient", "Doctor"];
const companyPortalRoles: ClinicRole[] = ["CompanyAdmin"];

export default function DashboardPage() {
  const roles = getSession()?.user.roles ?? [];
  const isPatientHome = roles.includes("Patient") && !roles.some((role) => role !== "Patient");
  const isCompanyPortal = roles.some((role) => companyPortalRoles.includes(role));
  const isCompanyFinanceHome = roles.includes("CompanyFinance");
  const isCompanyAuditorHome = roles.includes("CompanyAuditor");
  const isDoctorHome = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  const isPlatformAdminHome = roles.includes("PlatformAdmin");
  const isPlatformFinanceHome = roles.includes("PlatformFinance");
  const isPlatformAuditorHome = roles.includes("PlatformAuditor") && !roles.includes("PlatformAdmin");
  const isDpoHome = roles.includes("DataProtectionOfficer") && !roles.includes("PlatformAdmin");
  const canSchedule = roles.some((role) => schedulingRoles.includes(role));
  const canJoin = roles.some((role) => joinRoles.includes(role));
  const canLoadAppointments = roles.some((role) => appointmentLoadRoles.includes(role));
  const canLoadPatients = roles.some((role) => patientLoadRoles.includes(role));
  const canLoadDoctors = roles.some((role) => schedulingRoles.includes(role));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [companyPortal, setCompanyPortal] = useState<CompanyPortal | null>(null);
  const [financeInvoices, setFinanceInvoices] = useState<FinanceInvoice[]>([]);
  const [platformFinanceCompanies, setPlatformFinanceCompanies] = useState<BusinessReportCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      canLoadAppointments ? api.getAppointments() : Promise.resolve([]),
      canLoadDoctors ? api.getDoctors() : Promise.resolve([]),
      canLoadPatients ? api.getPatients() : Promise.resolve([]),
      isCompanyPortal || isCompanyFinanceHome || isCompanyAuditorHome ? api.getCompanyPortal() : Promise.resolve(null),
      isCompanyFinanceHome ? api.getFinanceInvoices() : Promise.resolve([]),
      isPlatformFinanceHome ? api.getBusinessReport() : Promise.resolve(null),
    ])
      .then(([appointmentData, doctorData, patientData, portalData, invoiceData, platformReport]) => {
        setAppointments(appointmentData);
        setDoctors(doctorData);
        setPatients(patientData);
        setCompanyPortal(portalData);
        setFinanceInvoices(invoiceData);
        setPlatformFinanceCompanies(platformReport?.companies ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar painel."))
      .finally(() => setLoading(false));
  }, [canLoadAppointments, canLoadDoctors, canLoadPatients, isCompanyAuditorHome, isCompanyFinanceHome, isCompanyPortal, isPlatformFinanceHome]);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((item) => item.status === "Scheduled" || item.status === "InProgress")
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

  if (isCompanyPortal) {
    return (
      <CompanyPortalHome
        portal={companyPortal}
        loading={loading}
        error={error}
      />
    );
  }

  if (isCompanyFinanceHome) {
    return (
      <CompanyFinanceHome
        portal={companyPortal}
        invoices={financeInvoices}
        loading={loading}
        error={error}
      />
    );
  }

  if (isCompanyAuditorHome) {
    return (
      <CompanyAuditorProductHome
        portal={companyPortal}
        loading={loading}
        error={error}
      />
    );
  }

  if (isDoctorHome) {
    return (
      <DoctorHome
        appointments={appointments}
        patients={patients}
        loading={loading}
        error={error}
      />
    );
  }

  if (isPlatformFinanceHome) {
    return (
      <PlatformFinanceHome
        companies={platformFinanceCompanies}
        loading={loading}
        error={error}
      />
    );
  }

  if (isPlatformAuditorHome) {
    return <PlatformAuditorHome error={error} />;
  }

  if (isDpoHome) {
    return <DpoHome error={error} />;
  }

  if (isPlatformAdminHome) {
    return (
      <PlatformOverviewHome
        appointments={appointments}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Visao geral"
        title="Central de operacao"
        description="Acompanhe atendimentos, agenda e acessos permitidos para o seu perfil."
        action={canSchedule ? (
          <Link href="/consultas/nova" className={buttonClass}>
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
            <MetricCard
              label="Consultas"
              value={appointments.length}
              detail="total agendado"
              icon={<CalendarCheck2 size={20} />}
              tone="success"
            />
            <MetricCard
              label="Pacientes"
              value={patients.length}
              detail="cadastros permitidos"
              icon={<Users size={20} />}
              tone="info"
            />
            <MetricCard
              label="Medicos"
              value={doctors.length}
              detail="credenciados"
              icon={<Stethoscope size={20} />}
              tone="neutral"
            />
            <MetricCard
              label="Proximas"
              value={upcoming.length}
              detail="aguardando atendimento"
              icon={<Clock3 size={20} />}
              tone="warning"
            />
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
              <Link
                href="/auditoria"
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-teal-200"
              >
                Ver auditoria <ArrowRight size={15} />
              </Link>
            </aside>
          </section>
        </>
      )}
    </>
  );
}

function PlatformAuditorHome({ error }: { error: string }) {
  return (
    <>
      <PageHeader
        eyebrow="Rastreabilidade"
        title="Auditoria MedSync"
        description="Visao de governanca para eventos, tentativas negadas e evidencias. Este perfil nao opera financeiro nem atendimento."
      />
      {error && <ErrorBanner message={error} />}

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <ListChecks size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Eventos da plataforma</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Acompanhe acessos permitidos, tentativas negadas e acoes sensiveis com minimizacao.
          </p>
          <Link href="/auditoria" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            Abrir auditoria <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <ShieldCheck size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Menor privilegio</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Relatorios financeiros e faturas ficam com perfis financeiros. Auditoria revisa evidencias e finalidade.
          </p>
        </Card>
        <Card className="p-6">
          <span className="grid size-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <LockKeyhole size={21} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-ink">Privacidade</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Registre e acompanhe solicitacoes com referencia minimizada, sem CPF completo ou dado clinico em campo livre.
          </p>
          <Link href="/privacidade" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
            Abrir privacidade <ArrowRight size={15} />
          </Link>
        </Card>
      </section>
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
            Relatorios financeiros, faturas e valores ficam com perfis financeiros. O DPO revisa evidencias e privacidade.
          </p>
        </Card>
      </section>
    </>
  );
}

function CompanyPortalHome({
  portal,
  loading,
  error,
}: {
  portal: CompanyPortal | null;
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="MedSync Business"
        title="Portal Empresa"
        description="Acompanhe contrato, plano, elegibilidade, faturas e uso agregado permitido do CNPJ."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando dados empresariais permitidos..." />
      ) : portal ? (
        <>
          <section className="brand-surface mb-7 rounded-lg border border-teal-100 p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Business OS</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">Gestao empresarial sem invadir o cuidado individual.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Contrato, elegibilidade, faturamento e uso agregado ficam juntos para decisao administrativa, preservando dados clinicos fora do portal empresarial.
                </p>
              </div>
              <span className="w-fit rounded-full bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-600">
                Perfil B2B
              </span>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Beneficiarios"
              value={portal.eligibility.beneficiaryCount}
              detail="cadastros administrativos"
              icon={<Users size={20} />}
              tone="info"
            />
            <MetricCard
              label="Elegiveis"
              value={portal.eligibility.eligibleCount}
              detail="acesso ativo ao plano"
              icon={<UserCheck size={20} />}
              tone="success"
            />
            <MetricCard
              label="Limite mensal"
              value={portal.contract?.monthlyConsultationLimit ?? "-"}
              detail="consultas contratadas"
              icon={<CalendarCheck2 size={20} />}
              tone="neutral"
            />
            <MetricCard
              label="Uso agregado"
              value={portal.usage.hiddenDueToPrivacyThreshold ? "Privado" : portal.usage.totalConsultations ?? 0}
              detail={portal.usage.hiddenDueToPrivacyThreshold ? "grupo minimo pendente" : "consultas no periodo"}
              icon={<BarChart3 size={20} />}
              tone={portal.usage.hiddenDueToPrivacyThreshold ? "warning" : "success"}
            />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <Building2 size={22} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-teal-600">Empresa contratante</p>
                  <h2 className="mt-2 truncate text-xl font-bold text-ink">
                    {portal.company.tradeName ?? portal.company.legalName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">CNPJ {portal.company.taxIdMasked}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <BusinessStatus
                  icon={<CheckCircle2 size={18} />}
                  label="Status"
                  value={portal.company.isActive ? "Ativa" : "Inativa"}
                  tone={portal.company.isActive ? "success" : "warning"}
                />
                <BusinessStatus
                  icon={<FileText size={18} />}
                  label="Contrato"
                  value={portal.contract ? contractStatusLabel[portal.contract.status] : "Nao configurado"}
                  tone={portal.contract?.status === "Active" ? "success" : "warning"}
                />
                <BusinessStatus
                  icon={<CalendarCheck2 size={18} />}
                  label="Inicio"
                  value={portal.contract ? formatDateOnly(portal.contract.startsAt) : "-"}
                  tone="neutral"
                />
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-teal-600">Contrato e plano</p>
              <h2 className="mt-3 text-xl font-bold text-ink">
                {portal.contract?.planName ?? "Plano nao configurado"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Visualizacao administrativa do contrato empresarial. As metricas desta tela nao expoem uso individual.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <InfoTile
                  icon={<FileText size={18} />}
                  label="Plano"
                  value={portal.contract?.planName ?? "-"}
                />
                <InfoTile
                  icon={<CalendarCheck2 size={18} />}
                  label="Vigencia"
                  value={portal.contract?.endsAt ? `Ate ${formatDateOnly(portal.contract.endsAt)}` : "Sem fim definido"}
                />
              </div>
            </Card>
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="overflow-hidden">
              <SectionHeader
                title="Elegibilidade"
                description="Acompanhamento administrativo por CNPJ"
              />
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <InfoTile
                  icon={<Users size={18} />}
                  label="Cadastrados"
                  value={portal.eligibility.beneficiaryCount}
                />
                <InfoTile
                  icon={<UserCheck size={18} />}
                  label="Elegiveis"
                  value={portal.eligibility.eligibleCount}
                />
                <InfoTile
                  icon={<LockKeyhole size={18} />}
                  label="Inativos"
                  value={portal.eligibility.inactiveCount}
                />
              </div>
            </Card>

            <Card className="overflow-hidden">
              <SectionHeader
                title="Faturas"
                description="Status financeiro permitido para o CNPJ"
              />
              <div className="p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Estimativa mensal</p>
                    <p className="mt-2 text-3xl font-bold text-ink">
                      {portal.billing.estimatedMonthlyFee === undefined
                        ? "-"
                        : formatCurrency(portal.billing.estimatedMonthlyFee, portal.billing.currency)}
                    </p>
                  </div>
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <ReceiptText size={20} />
                  </span>
                </div>
                <Badge className="mt-5" tone="warning">{portal.billing.status}</Badge>
                <p className="mt-4 text-sm leading-6 text-slate-500">{portal.billing.note}</p>
              </div>
            </Card>
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="overflow-hidden">
              <SectionHeader
                title="Uso agregado"
                description="Indicadores administrativos sem lista individual sensivel"
              />
              {portal.usage.hiddenDueToPrivacyThreshold ? (
                <div className="p-6">
                  <EmptyState
                    icon={<LockKeyhole size={22} />}
                    title="Uso oculto por privacidade"
                    description={portal.usage.hiddenReason ?? "Aguardando volume minimo para exibir indicadores agregados."}
                  />
                </div>
              ) : (
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <InfoTile
                    icon={<BarChart3 size={18} />}
                    label="Total"
                    value={portal.usage.totalConsultations ?? 0}
                  />
                  <InfoTile
                    icon={<Clock3 size={18} />}
                    label="Agendadas"
                    value={portal.usage.scheduledConsultations ?? 0}
                  />
                  <InfoTile
                    icon={<Video size={18} />}
                    label="Em atendimento"
                    value={portal.usage.inProgressConsultations ?? 0}
                  />
                  <InfoTile
                    icon={<CheckCircle2 size={18} />}
                    label="Concluidas"
                    value={portal.usage.completedConsultations ?? 0}
                  />
                </div>
              )}
            </Card>

            <aside className="subtle-grid overflow-hidden rounded-lg bg-ink p-7 text-white shadow-sm">
              <span className="grid size-12 place-items-center rounded-lg bg-teal-400/15 text-teal-200">
                <ShieldCheck size={21} />
              </span>
              <h2 className="mt-7 text-2xl font-bold text-white">Dados clinicos individuais nao sao exibidos.</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">
                O portal empresarial separa governanca contratual de cuidado assistencial. Tentativas de acesso fora do perfil devem ser tratadas como evento de auditoria.
              </p>
              <div className="mt-6 space-y-3">
                {portal.privacyGuards.map((guard) => (
                  <p key={guard} className="flex gap-2 text-sm text-white/80">
                    <ShieldCheck className="mt-0.5 shrink-0 text-teal-200" size={16} />
                    {guard}
                  </p>
                ))}
              </div>
            </aside>
          </section>
        </>
      ) : (
        <EmptyState
          icon={<Building2 size={22} />}
          title="Portal empresarial indisponivel"
          description="Nao foi encontrado um CNPJ contratante para este usuario no ambiente atual."
        />
      )}
    </>
  );
}

function CompanyFinanceHome({
  portal,
  invoices,
  loading,
  error,
}: {
  portal: CompanyPortal | null;
  invoices: FinanceInvoice[];
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="MedSync Finance"
        title="Financeiro Empresa"
        description="Acompanhe faturas e uso agregado do CNPJ contratante. Este perfil nao acessa consultas individuais."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando financeiro empresarial..." />
      ) : portal ? (
        <>
          <section className="mb-7 rounded-lg border border-sky-100 bg-sky-50 p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-sky-700">Finance Control</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">Fatura, contrato e uso agregado no mesmo lugar.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  O financeiro acompanha valores e consumo permitido sem abrir consultas individuais ou conteudo assistencial.
                </p>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-700">
                Sem dado clinico
              </span>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Fatura estimada"
              value={
                portal.billing.estimatedMonthlyFee === undefined
                  ? "-"
                  : formatCurrency(portal.billing.estimatedMonthlyFee, portal.billing.currency)
              }
              detail={portal.billing.status}
              icon={<ReceiptText size={20} />}
              tone="info"
            />
            <MetricCard
              label="Contrato"
              value={portal.contract ? contractStatusLabel[portal.contract.status] : "Pendente"}
              detail={portal.contract?.planName ?? "plano nao configurado"}
              icon={<FileText size={20} />}
              tone={portal.contract?.status === "Active" ? "success" : "warning"}
            />
            <MetricCard
              label="Uso agregado"
              value={portal.usage.hiddenDueToPrivacyThreshold ? "Privado" : portal.usage.totalConsultations ?? 0}
              detail={portal.usage.hiddenDueToPrivacyThreshold ? "grupo minimo pendente" : "consultas no periodo"}
              icon={<BarChart3 size={20} />}
              tone={portal.usage.hiddenDueToPrivacyThreshold ? "warning" : "success"}
            />
            <MetricCard
              label="Beneficiarios"
              value={portal.eligibility.eligibleCount}
              detail="elegiveis no CNPJ"
              icon={<UserCheck size={20} />}
              tone="neutral"
            />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-teal-600">Historico financeiro</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Faturas do CNPJ</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Competencias financeiras do contrato ativo, sem detalhes clinicos ou lista individual de consultas.
              </p>
              <InvoiceList invoices={invoices} />
            </Card>

            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-amber-600">Limite de acesso</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Sem prontuario, diagnostico ou sala.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                O financeiro empresarial consulta informacoes administrativas, sem abrir conteudo assistencial ou lista sensivel individual.
              </p>
              <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                Exportacao financeira minimizada ainda depende de validacao juridica, DPO e regra de minimo agregado.
              </p>
            </Card>
          </section>
        </>
      ) : (
        <EmptyState
          icon={<ReceiptText size={22} />}
          title="Financeiro indisponivel"
          description="Nao foi encontrado um CNPJ contratante para este usuario no ambiente atual."
        />
      )}
    </>
  );
}

function CompanyAuditorProductHome({
  portal,
  loading,
  error,
}: {
  portal: CompanyPortal | null;
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Auditoria empresarial"
        title="Visao operacional autorizada"
        description="Acompanhe contrato, uso agregado e eventos permitidos para fiscalizacao do CNPJ, sem lista individual clinica."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando visao operacional..." />
      ) : (
        <>
          <section className="mb-7 rounded-lg border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700">Trust Layer</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">Auditoria com trilha, limite e finalidade.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  A visao consolida eventos operacionais e acessos permitidos, mantendo prontuario, diagnostico e chamada fora do escopo empresarial.
                </p>
              </div>
              <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                Somente leitura
              </span>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Beneficiarios"
              value={portal?.eligibility.beneficiaryCount ?? "-"}
              detail="quantidade agregada"
              icon={<Users size={20} />}
              tone="info"
            />
            <MetricCard
              label="Elegiveis"
              value={portal?.eligibility.eligibleCount ?? "-"}
              detail="acesso administrativo"
              icon={<UserCheck size={20} />}
              tone="success"
            />
            <MetricCard
              label="Uso agregado"
              value={
                portal?.usage.hiddenDueToPrivacyThreshold
                  ? "Privado"
                  : portal?.usage.totalConsultations ?? "-"
              }
              detail="sem lista individual"
              icon={<BarChart3 size={20} />}
              tone="warning"
            />
            <MetricCard label="Auditoria" value="Ativa" detail="trilha de acesso" icon={<ShieldCheck size={20} />} tone="warning" />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-teal-600">Rastreabilidade do CNPJ</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Fiscalizacao sem exposicao clinica indevida.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                O auditor empresarial acompanha eventos, contrato e indicadores agregados para verificar uso e acesso. Ele nao altera dados operacionais e nao acessa lista clinica individual.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/relatorios" className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-ink hover:border-teal-300 hover:text-teal-700">
                  Relatorios agregados
                </Link>
                <Link href="/auditoria" className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-ink hover:border-teal-300 hover:text-teal-700">
                  Auditoria
                </Link>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-amber-600">Limites de seguranca</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Prontuarios e diagnosticos continuam protegidos.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Acesso global ou cross-CNPJ depende de autorizacao formal, DPO, justificativa de finalidade e trilha de auditoria.
              </p>
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function DoctorHome({
  appointments,
  patients,
  loading,
  error,
}: {
  appointments: Appointment[];
  patients: Patient[];
  loading: boolean;
  error: string;
}) {
  const now = new Date();
  const day = appointments.filter((item) => isSameRange(item.scheduledAt, now, "day")).length;
  const week = appointments.filter((item) => isSameRange(item.scheduledAt, now, "week")).length;
  const month = appointments.filter((item) => isSameRange(item.scheduledAt, now, "month")).length;
  const year = appointments.filter((item) => isSameRange(item.scheduledAt, now, "year")).length;
  const upcoming = appointments
    .filter((item) => item.status === "Scheduled" || item.status === "InProgress")
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="MedSync Medical"
        title="Painel medico"
        description="Acompanhe sua agenda vinculada, pacientes atendidos e indicadores do periodo. Agendamentos sao criados pelo fluxo de elegibilidade/suporte, nao pelo medico."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando sua agenda medica..." />
      ) : (
        <>
          <section className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Medical Desk</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">O dia do medico com foco no atendimento.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Agenda vinculada, indicadores do periodo e entrada em sala ficam separados da gestao empresarial e do financeiro.
                </p>
              </div>
              <span className="w-fit rounded-full bg-coral-50 px-3 py-1.5 text-xs font-bold text-coral-600">
                Sem criacao de agenda
              </span>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Hoje" value={day} detail="consultas vinculadas" icon={<CalendarCheck2 size={20} />} tone="success" />
            <MetricCard label="Semana" value={week} detail="periodo atual" icon={<Clock3 size={20} />} tone="info" />
            <MetricCard label="Mes" value={month} detail="volume assistencial" icon={<BarChart3 size={20} />} tone="neutral" />
            <MetricCard label="Ano" value={year} detail="historico agregado" icon={<FileText size={20} />} tone="warning" />
          </section>
          <section className="mt-7 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <AppointmentsPanel appointments={upcoming} canJoin />
            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-teal-600">Pacientes vinculados</p>
              <h2 className="mt-3 text-xl font-bold text-ink">{patients.length} pacientes</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                O medico visualiza pacientes somente quando existe consulta vinculada ao seu atendimento.
              </p>
              <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                Edicao de perfil medico e disponibilidade por especialidade: TODO de produto/API.
              </div>
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function PlatformFinanceHome({
  companies,
  loading,
  error,
}: {
  companies: BusinessReportCompany[];
  loading: boolean;
  error: string;
}) {
  const totals = companies.reduce(
    (acc, company) => {
      acc.monthlyFee += company.monthlyFee ?? 0;
      acc.paid += company.paidAmount;
      acc.open += Math.max((company.monthlyFee ?? 0) - company.paidAmount, 0);
      acc.beneficiaries += company.beneficiaryCount;
      return acc;
    },
    { monthlyFee: 0, paid: 0, open: 0, beneficiaries: 0 },
  );

  return (
    <>
      <PageHeader
        eyebrow="MedSync Finance"
        title="Financeiro MedSync"
        description="Visao financeira global por CNPJ, incluindo empresas de teste e CNPJ tecnico quando aprovado, sem dados clinicos."
        action={
          <Link href="/relatorios" className={buttonClass}>
            <BarChart3 size={17} /> Abrir relatorios
          </Link>
        }
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando financeiro da plataforma..." />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="CNPJs" value={companies.length} detail="escopo financeiro global" icon={<Building2 size={20} />} tone="info" />
            <MetricCard label="Beneficiarios" value={totals.beneficiaries} detail="vinculos administrativos" icon={<Users size={20} />} tone="success" />
            <MetricCard label="Mensalidade" value={formatCurrency(totals.monthlyFee, "BRL")} detail="contratos ativos/demo" icon={<ReceiptText size={20} />} tone="info" />
            <MetricCard label="Em aberto" value={formatCurrency(totals.open, "BRL")} detail="estimativa operacional" icon={<FileText size={20} />} tone="warning" />
          </section>

          <Card className="mt-7 overflow-hidden">
            {companies.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<ReceiptText size={22} />}
                  title="Nenhum CNPJ financeiro no escopo"
                  description="Os dados financeiros globais aparecerao quando houver contratos cadastrados para a plataforma."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[920px]">
                  <div className="grid grid-cols-[1.3fr_1fr_.8fr_.9fr_.9fr_.8fr] gap-4 bg-slate-50 px-6 py-4 text-xs font-bold uppercase text-slate-400">
                    <span>Empresa</span>
                    <span>Plano</span>
                    <span>Elegiveis</span>
                    <span>Mensalidade</span>
                    <span>Pago</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {companies.map((company) => (
                      <article key={company.companyId} className="grid grid-cols-[1.3fr_1fr_.8fr_.9fr_.9fr_.8fr] items-center gap-4 px-6 py-5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink" title={company.companyName}>{company.companyName}</p>
                          <p className="mt-1 text-xs text-slate-400">{company.taxIdMasked} · {company.tenantName}</p>
                        </div>
                        <span className="truncate font-semibold text-slate-700" title={company.planName ?? "Sem plano"}>{company.planName ?? "Sem plano"}</span>
                        <span className="font-semibold text-ink">{company.eligibleCount}</span>
                        <span className="font-semibold text-ink">{formatCurrency(company.monthlyFee ?? 0, company.currency)}</span>
                        <span className="font-semibold text-ink">{formatCurrency(company.paidAmount, company.currency)}</span>
                        <Badge tone={company.billingStatus === "Pago" ? "success" : company.billingStatus === "Aberta" ? "warning" : "neutral"}>
                          {company.billingStatus}
                        </Badge>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function PlatformOverviewHome({
  appointments,
  loading,
  error,
}: {
  appointments: Appointment[];
  loading: boolean;
  error: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow="MedSync Geral"
        title="Relatorios da plataforma"
        description="Visao geral por CNPJ e ambiente. Este perfil nao cria agenda; ele acompanha operacao, evidencias e relatorios."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando relatorios da plataforma..." />
      ) : (
        <>
          <section className="brand-panel mb-7 rounded-lg p-6 text-white shadow-brand">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-100">Platform Control</p>
            <h2 className="mt-2 text-2xl font-bold">Operacao MedSync por CNPJ e ambiente.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Visao de plataforma para acompanhar operacao, evidencias e evolucao do produto sem operar atendimento individual.
            </p>
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Consultas" value={appointments.length} detail="visao operacional" icon={<CalendarCheck2 size={20} />} tone="success" />
            <MetricCard label="CNPJs" value={1} detail="homologacao seed" icon={<Building2 size={20} />} tone="info" />
            <MetricCard label="CNPJ tecnico" value="TODO" detail="fluxo pessoa fisica" icon={<ShieldCheck size={20} />} tone="warning" />
            <MetricCard label="Exportacao" value="TODO" detail="relatorios aprovados" icon={<FileText size={20} />} tone="neutral" />
          </section>
        </>
      )}
    </>
  );
}

function InvoiceList({ invoices }: { invoices: FinanceInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
        Nenhuma fatura encontrada para o contrato ativo deste ambiente.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {invoices.map((invoice) => (
        <article key={invoice.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Competencia {invoice.period}</p>
              <h3 className="mt-1 font-bold text-ink">{invoice.description}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-500">{invoice.note}</p>
            </div>
            <span className={`w-fit rounded-lg px-3 py-2 text-xs font-bold ${
              invoice.status === "Pago"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}>
              {invoice.status}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoTile
              icon={<ReceiptText size={18} />}
              label="Valor"
              value={formatCurrency(invoice.amount, invoice.currency)}
            />
            <InfoTile
              icon={<CheckCircle2 size={18} />}
              label="Pago"
              value={formatCurrency(invoice.paidAmount, invoice.currency)}
            />
            <InfoTile
              icon={<CalendarCheck2 size={18} />}
              label="Vencimento"
              value={formatDateOnly(invoice.dueDate)}
            />
          </div>
        </article>
      ))}
    </div>
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
    sorted.find((item) => item.status === "Scheduled" && new Date(item.scheduledAt).getTime() >= Date.now()) ??
    sorted.find((item) => item.status === "InProgress" && !isAppointmentStaleInProgress(item)) ??
    sorted.find((item) => item.status === "Scheduled");
  const history = sorted.slice(0, 4);
  const joinAvailable = nextAppointment ? isAppointmentRoomJoinable(nextAppointment) : false;
  const roomBlockedReason = nextAppointment ? careBlockReason(nextAppointment) : null;
  const nextStep = nextAppointment ? patientCareStep(nextAppointment) : null;

  return (
    <>
      <PageHeader
        eyebrow="MedSync Care"
        title="Acesse seu cuidado digital"
        description="Consulte seus atendimentos, termos e entrada na sala em um ambiente privado."
        action={(
          <Link href="/consultas/nova" className={buttonClass}>
            <HeartPulse size={17} /> Solicitar consulta
          </Link>
        )}
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Carregando sua jornada de cuidado..." />
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
            <div className="care-panel rounded-lg p-6 text-white shadow-brand sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-100">Proximo atendimento</p>
                  {nextAppointment ? (
                    <>
                      <h2 className="mt-3 text-3xl font-bold">{nextAppointment.specialty}</h2>
                      <p className="mt-2 text-sm text-white/60">
                        {nextAppointment.doctorName} - {formatDateTime(nextAppointment.scheduledAt)}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-3 text-3xl font-bold">Nenhuma consulta agendada</h2>
                      <p className="mt-2 text-sm text-white/60">
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
                        ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-teal-800 hover:bg-teal-50"
                        : "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/15"}
                    >
                      {nextStep.icon} {nextStep.cta}
                    </Link>
                  ) : (
                    <span
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/15"
                    >
                      {nextStep?.icon ?? <Clock3 size={17} />} {nextStep?.cta ?? "Acompanhar status"}
                    </span>
                  )
                ) : (
                  <Link
                    href="/consultas/nova"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-teal-800 hover:bg-teal-50"
                  >
                    <CalendarCheck2 size={17} /> Solicitar consulta
                  </Link>
                )}
              </div>
              {roomBlockedReason && (
                <div className="mt-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  {roomBlockedReason}
                </div>
              )}
            </div>

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
                    description="Se houver elegibilidade ou cadastro direto aprovado, seus atendimentos aparecem aqui."
                    action={(
                      <Link href="/consultas/nova" className="text-sm font-bold text-teal-600">
                        Solicitar consulta
                      </Link>
                    )}
                  />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {history.map((appointment) => (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
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

            <Card className="p-6">
              <p className="text-xs font-bold uppercase text-teal-600">Privacidade</p>
              <h2 className="mt-3 text-xl font-bold text-ink">Sua jornada e separada da empresa.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Empresas e parceiros veem apenas dados administrativos e agregados permitidos. Seu atendimento clinico fica restrito aos perfis autorizados.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Prontuario nao e exibido para empresa.",
                  "Diagnostico nao aparece em relatorio empresarial.",
                  "Entrada em sala exige vinculo, horario e consentimento.",
                ].map((item) => (
                  <p key={item} className="flex gap-2 text-sm text-slate-600">
                    <ShieldCheck className="mt-0.5 shrink-0 text-teal-600" size={16} />
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
}: {
  appointment: Appointment;
  canJoin: boolean;
}) {
  const step = patientCareStep(appointment);
  const joinReady = canJoin && isAppointmentRoomJoinable(appointment);

  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-sm font-bold text-teal-700">
        {appointment.patientName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{appointment.patientName}</p>
        <p className="mt-1 text-xs text-slate-400">
          {appointment.doctorName} - {appointment.specialty}
        </p>
      </div>
      <div className="sm:text-right">
        <p className="text-sm font-semibold text-ink">
          {formatDateTime(appointment.scheduledAt)}
        </p>
        <Badge className={statusClass[appointment.status]}>
          {statusLabel[appointment.status]}
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

function BusinessStatus({
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

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      <span className="grid size-9 place-items-center rounded-lg bg-white text-teal-700 shadow-sm">
        {icon}
      </span>
      <p className="mt-4 text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function careBlockReason(appointment: Appointment) {
  if (appointment.paymentRequired && appointment.paymentStatus !== "Paid") {
    return "Entrada aguardando confirmacao de pagamento.";
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

const contractStatusLabel = {
  Draft: "Rascunho",
  Active: "Ativo",
  Suspended: "Suspenso",
  Ended: "Encerrado",
  Cancelled: "Cancelado",
};

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

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
