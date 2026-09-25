"use client";

import { ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { formatBrazilDateInput, formatBrazilDateTimeInput } from "@/lib/format";
import type { AvailableTime, CareSpecialty, Doctor, Patient } from "@/lib/types";
import { brazilLocalDateTimeToUtcIso, isFutureBrazilLocalDateTime } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const operationalRoles = ["ClinicAdmin"];

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
  const [attachments, setAttachments] = useState<File[]>([]);

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
            doctorId: data[0]?.doctors[0]?.id ?? "",
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

    if (isPatient && (!form.specialty || !form.doctorId)) {
      setError("Selecione uma especialidade e um medico disponivel.");
      setSaving(false);
      return;
    }
    if (!isPatient && (!form.doctorId || !form.patientId)) {
      setError("Selecione paciente e medico.");
      setSaving(false);
      return;
    }
    if (!isFutureBrazilLocalDateTime(form.scheduledAt)) {
      setError("Escolha uma data e horario futuros no horario de Brasilia.");
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
        const appointment = await api.requestAppointment({
          specialty: form.specialty,
          doctorId: form.doctorId,
          scheduledAt: brazilLocalDateTimeToUtcIso(form.scheduledAt),
          durationMinutes: 30,
          notes: form.notes,
        });
        if (attachments.length > 0) {
          await Promise.all(
            attachments.map((file) => api.uploadClinicalRecordAttachment(appointment.id, file)),
          );
        }
      } else {
        await api.createAppointment({
          doctorId: form.doctorId,
          patientId: form.patientId,
          scheduledAt: brazilLocalDateTimeToUtcIso(form.scheduledAt),
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
      {error && !(isPatient && isNoDoctorAvailableError(error)) && <ErrorBanner message={error} />}
      {!canUsePage ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Este perfil não cria agenda. A consulta é solicitada pelo paciente ou agendada pela clínica.
        </div>
      ) : loading ? (
        <LoadingState label="Preparando formulario..." />
      ) : isPatient ? (
        <PatientRequestForm
          form={form}
          specialties={specialties}
          saving={saving}
          error={error}
          onChange={setForm}
          onSubmit={submit}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
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

function isNoDoctorAvailableError(message: string) {
  return /n[aã]o h[aá] medico dispon[ií]vel|nao esta disponivel neste horario/i.test(message);
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
  error,
  onChange,
  onSubmit,
  attachments,
  onAttachmentsChange,
}: {
  form: AppointmentForm;
  specialties: CareSpecialty[];
  saving: boolean;
  error: string;
  onChange: (form: AppointmentForm) => void;
  onSubmit: (event: FormEvent) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
}) {
  const selectedSpecialty = useMemo(
    () => specialties.find((item) => item.specialty === form.specialty) ?? specialties[0],
    [form.specialty, specialties],
  );
  const availableDoctors = selectedSpecialty?.doctors ?? [];
  const selectedDoctor = availableDoctors.find((doctor) => doctor.id === form.doctorId);
  const doctorHasAvailability = selectedDoctor?.hasAvailability ?? false;
  const otherDoctorsInSpecialty = availableDoctors.filter((doctor) => doctor.id !== form.doctorId);
  const otherSpecialties = specialties.filter((item) => item.specialty !== form.specialty);

  const [slotDate, setSlotDate] = useState(formatBrazilDateInput());
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  useEffect(() => {
    if (!doctorHasAvailability || !form.doctorId || !slotDate) {
      setAvailableTimes([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    setSlotsError("");
    api
      .getAvailableTimes(form.doctorId, slotDate)
      .then((times) => {
        if (active) setAvailableTimes(times);
      })
      .catch((err) => {
        if (active) setSlotsError(err instanceof Error ? err.message : "Erro ao carregar horarios disponiveis.");
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [doctorHasAvailability, form.doctorId, slotDate]);

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
        {isNoDoctorAvailableError(error) && (
          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-bold">Nenhum medico disponivel neste horario.</p>
            <p className="mt-1 text-xs leading-5">
              Tente outro horario{otherDoctorsInSpecialty.length > 0 ? ", escolha outro profissional" : ""}
              {otherSpecialties.length > 0 ? " ou veja outra especialidade" : ""} abaixo. Se nada funcionar, entre em contato com o suporte MedSync.
            </p>
            {(otherDoctorsInSpecialty.length > 0 || otherSpecialties.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {otherDoctorsInSpecialty.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:border-amber-400"
                    onClick={() => onChange({ ...form, doctorId: doctor.id, scheduledAt: "" })}
                  >
                    {doctor.name}
                  </button>
                ))}
                {otherSpecialties.map((item) => (
                  <button
                    key={item.specialty}
                    type="button"
                    className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:border-amber-400"
                    onClick={() =>
                      onChange({ ...form, specialty: item.specialty, doctorId: item.doctors[0]?.id ?? "", scheduledAt: "" })
                    }
                  >
                    {item.specialty}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Especialidade ou area</span>
            <select
              className={inputClass}
              value={form.specialty}
              onChange={(event) => {
                const nextSpecialty = specialties.find((item) => item.specialty === event.target.value);
                onChange({
                  ...form,
                  specialty: event.target.value,
                  doctorId: nextSpecialty?.doctors[0]?.id ?? "",
                  scheduledAt: "",
                });
              }}
              required
            >
              {specialties.map((item) => (
                <option key={item.specialty} value={item.specialty}>
                  {item.specialty}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Medico disponivel</span>
            <select
              className={inputClass}
              value={form.doctorId}
              onChange={(event) => onChange({ ...form, doctorId: event.target.value, scheduledAt: "" })}
              required
            >
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                  {doctor.hasAvailability ? " (agenda fixa)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-400">
              {availableDoctors.length} opcao{availableDoctors.length === 1 ? "" : "es"} nesta especialidade.
            </span>
          </label>
          {doctorHasAvailability ? (
            <div className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Data e horario de Brasilia</span>
              <p className="mb-3 text-xs text-slate-400">
                Este medico configurou dias e horarios fixos de atendimento. Escolha um horario disponivel abaixo.
              </p>
              <input
                className={`${inputClass} mb-4`}
                type="date"
                value={slotDate}
                onChange={(event) => {
                  setSlotDate(event.target.value);
                  onChange({ ...form, scheduledAt: "" });
                }}
                min={formatBrazilDateInput()}
                required
              />
              {slotsError && <p className="mb-3 text-xs font-semibold text-red-600">{slotsError}</p>}
              {slotsLoading ? (
                <p className="text-sm text-slate-400">Carregando horarios...</p>
              ) : availableTimes.length === 0 ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  <p>Nenhum horario disponivel com {selectedDoctor?.name ?? "este medico"} nesta data. Tente outra data{otherDoctorsInSpecialty.length > 0 ? " ou escolha outro profissional abaixo." : "."}</p>
                  {otherDoctorsInSpecialty.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {otherDoctorsInSpecialty.map((doctor) => (
                        <button
                          key={doctor.id}
                          type="button"
                          className="rounded-full border border-amber-200 bg-white px-3 py-1.5 font-bold text-amber-800 hover:border-amber-400"
                          onClick={() => onChange({ ...form, doctorId: doctor.id, scheduledAt: "" })}
                        >
                          {doctor.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availableTimes.map((time) => {
                    const localValue = formatBrazilDateTimeInput(new Date(time.startsAt));
                    const isSelected = localValue === form.scheduledAt;
                    const label = localValue.slice(11, 16);
                    return (
                      <button
                        key={time.startsAt}
                        type="button"
                        onClick={() => onChange({ ...form, scheduledAt: localValue })}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-bold transition ${
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
                        }`}
                      >
                        <Clock size={13} /> {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Data e horario de Brasilia</span>
              <input
                className={inputClass}
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => onChange({ ...form, scheduledAt: event.target.value })}
                min={formatBrazilDateTimeInput()}
                required
              />
            </label>
          )}
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
          <div className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Anexo (opcional)</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500 hover:border-teal-300 hover:text-teal-600">
              <Paperclip size={16} />
              Anexar exame ou documento
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length > 0) onAttachmentsChange([...attachments, ...files]);
                  event.target.value = "";
                }}
              />
            </label>
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-500"
                      onClick={() => onAttachmentsChange(attachments.filter((_, i) => i !== index))}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          "Você escolhe a especialidade e o horário.",
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
            <span className="mb-2 block text-sm font-bold text-slate-700">Data e horario de Brasilia</span>
            <input
              className={inputClass}
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) => onChange({ ...form, scheduledAt: event.target.value })}
              min={formatBrazilDateTimeInput()}
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
