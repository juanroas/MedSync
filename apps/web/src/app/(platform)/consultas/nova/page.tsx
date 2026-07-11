"use client";

import { ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { CareSpecialty, Doctor, Patient } from "@/lib/types";
import { isFutureLocalDateTime } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { ArrowLeft, CalendarPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const operationalRoles = ["Receptionist", "ClinicAdmin", "MedicalDirector", "Support", "OccupationalHealthAdmin"];

export default function NewAppointmentPage() {
  const router = useRouter();
  const roles = getSession()?.user.roles ?? [];
  const isPatient = roles.includes("Patient");
  const canOperationalSchedule = roles.some((role) => operationalRoles.includes(role));
  const canUsePage = isPatient || canOperationalSchedule;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialties, setSpecialties] = useState<CareSpecialty[]>([]);
  const [form, setForm] = useState({
    doctorId: "",
    patientId: "",
    specialty: "",
    scheduledAt: "",
    durationMinutes: 30,
    notes: "",
    price: "",
    paymentRequired: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canUsePage) {
      setLoading(false);
      return;
    }

    if (isPatient) {
      api.getCareSpecialties()
        .then((data) => {
          setSpecialties(data);
          setForm((current) => ({
            ...current,
            specialty: data[0]?.specialty ?? "",
          }));
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar especialidades."))
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([api.getDoctors(), api.getPatients()])
      .then(([doctorData, patientData]) => {
        setDoctors(doctorData);
        setPatients(patientData);
        setForm((current) => ({
          ...current,
          doctorId: doctorData[0]?.id ?? "",
          patientId: patientData[0]?.id ?? "",
        }));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar cadastros."))
      .finally(() => setLoading(false));
  }, [canUsePage, isPatient]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (isPatient && !form.specialty) {
      setError("Selecione uma especialidade disponivel.");
      setSaving(false);
      return;
    }
    if (!isPatient && (!form.doctorId || !form.patientId)) {
      setError("Selecione paciente e medico.");
      setSaving(false);
      return;
    }
    if (!isFutureLocalDateTime(form.scheduledAt)) {
      setError("Escolha uma data e horario futuros.");
      setSaving(false);
      return;
    }
    if (form.durationMinutes < 10) {
      setError("A duracao minima da consulta e de 10 minutos.");
      setSaving(false);
      return;
    }

    try {
      if (isPatient) {
        await api.requestAppointment({
          specialty: form.specialty,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: form.durationMinutes,
          notes: form.notes,
        });
      } else {
        await api.createAppointment({
          doctorId: form.doctorId,
          patientId: form.patientId,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: form.durationMinutes,
          notes: form.notes,
          price: form.price ? Number(form.price) : undefined,
          paymentRequired: form.paymentRequired,
        });
      }
      router.push("/consultas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar consulta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/consultas" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600">
        <ArrowLeft size={16} /> Voltar para consultas
      </Link>
      <PageHeader
        eyebrow="Novo atendimento"
        title={isPatient ? "Solicitar consulta" : "Agendar consulta"}
        description={
          isPatient
            ? "Escolha a area de cuidado e um horario. O MedSync vincula uma opcao disponivel para o atendimento."
            : "Escolha o medico, o paciente e o melhor horario. A sala sera preparada no momento do acesso."
        }
      />
      {error && <ErrorBanner message={error} />}
      {!canUsePage ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Este perfil nao cria agenda. No modelo B2B, o atendimento deve nascer da elegibilidade, suporte ou fluxo autorizado por especialidade.
        </div>
      ) : loading ? (
        <LoadingState label="Preparando formulario..." />
      ) : isPatient ? (
        <PatientRequestForm
          form={form}
          specialties={specialties}
          saving={saving}
          onChange={setForm}
          onSubmit={submit}
        />
      ) : doctors.length === 0 || patients.length === 0 ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Cadastre ao menos um medico e um paciente antes de criar uma consulta.
        </div>
      ) : (
        <OperationalScheduleForm
          form={form}
          doctors={doctors}
          patients={patients}
          saving={saving}
          onChange={setForm}
          onSubmit={submit}
        />
      )}
    </>
  );
}

type AppointmentForm = {
  doctorId: string;
  patientId: string;
  specialty: string;
  scheduledAt: string;
  durationMinutes: number;
  notes: string;
  price: string;
  paymentRequired: boolean;
};

function PatientRequestForm({
  form,
  specialties,
  saving,
  onChange,
  onSubmit,
}: {
  form: AppointmentForm;
  specialties: CareSpecialty[];
  saving: boolean;
  onChange: (form: AppointmentForm) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  if (specialties.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
        Nenhuma especialidade esta disponivel para solicitacao neste momento. Entre em contato com o suporte MedSync.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_.7fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Especialidade ou area</span>
            <select
              className={inputClass}
              value={form.specialty}
              onChange={(event) => onChange({ ...form, specialty: event.target.value })}
              required
            >
              {specialties.map((item) => (
                <option key={item.specialty} value={item.specialty}>
                  {item.specialty} - {item.availableDoctors} opcao{item.availableDoctors === 1 ? "" : "es"}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Data e horario</span>
            <input
              className={inputClass}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => onChange({ ...form, scheduledAt: event.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Duracao</span>
            <select
              className={inputClass}
              value={form.durationMinutes}
              onChange={(event) => onChange({ ...form, durationMinutes: Number(event.target.value) })}
            >
              {[15, 30, 45, 60].map((minutes) => (
                <option key={minutes} value={minutes}>{minutes} minutos</option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Observacao para o atendimento</span>
            <textarea
              className={`${inputClass} h-28 resize-none py-3`}
              maxLength={240}
              placeholder="Descreva brevemente o motivo da solicitacao..."
              value={form.notes}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
            />
          </label>
        </div>
        <div className="mt-7 flex justify-end">
          <button className={buttonClass} disabled={saving}>
            <CalendarPlus size={17} />
            {saving ? "Solicitando..." : "Solicitar consulta"}
          </button>
        </div>
      </section>

      <AsideSteps
        title="Como funciona"
        steps={[
          "A solicitacao usa sua elegibilidade ativa.",
          "O MedSync vincula uma opcao disponivel na especialidade.",
          "A consulta aparece em Minhas consultas.",
        ]}
      />
    </form>
  );
}

function OperationalScheduleForm({
  form,
  doctors,
  patients,
  saving,
  onChange,
  onSubmit,
}: {
  form: AppointmentForm;
  doctors: Doctor[];
  patients: Patient[];
  saving: boolean;
  onChange: (form: AppointmentForm) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_.7fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Paciente</span>
            <select
              className={inputClass}
              value={form.patientId}
              onChange={(event) => onChange({ ...form, patientId: event.target.value })}
              required
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Medico</span>
            <select
              className={inputClass}
              value={form.doctorId}
              onChange={(event) => onChange({ ...form, doctorId: event.target.value })}
              required
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialty}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Data e horario</span>
            <input
              className={inputClass}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => onChange({ ...form, scheduledAt: event.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Duracao</span>
            <select
              className={inputClass}
              value={form.durationMinutes}
              onChange={(event) => onChange({ ...form, durationMinutes: Number(event.target.value) })}
            >
              {[10, 15, 30, 45, 60, 90, 120].map((minutes) => (
                <option key={minutes} value={minutes}>{minutes} minutos</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">Valor (R$)</span>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => onChange({ ...form, price: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.paymentRequired}
              onChange={(event) => onChange({ ...form, paymentRequired: event.target.checked })}
            />
            <span className="text-sm font-bold text-slate-700">
              Exigir pagamento antes da videochamada
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Observacoes</span>
            <textarea
              className={`${inputClass} h-28 resize-none py-3`}
              placeholder="Motivo da consulta ou informacao breve..."
              value={form.notes}
              onChange={(event) => onChange({ ...form, notes: event.target.value })}
            />
          </label>
        </div>
        <div className="mt-7 flex justify-end">
          <button className={buttonClass} disabled={saving}>
            <CalendarPlus size={17} />
            {saving ? "Agendando..." : "Confirmar agendamento"}
          </button>
        </div>
      </section>

      <AsideSteps
        title="O que acontece depois?"
        steps={[
          "A consulta aparece na agenda.",
          "Ao entrar, a API cria a sala segura.",
          "Cada participante recebe um token temporario.",
        ]}
      />
    </form>
  );
}

function AsideSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <aside className="h-fit rounded-3xl bg-ink p-7 text-white">
      <span className="grid size-12 place-items-center rounded-2xl bg-teal-400/15 text-teal-200">
        <CheckCircle2 size={22} />
      </span>
      <h2 className="mt-6 text-xl font-bold">{title}</h2>
      <ol className="mt-5 space-y-5 text-sm text-white/55">
        {steps.map((text, index) => (
          <li key={text} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-teal-200">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-5">{text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
