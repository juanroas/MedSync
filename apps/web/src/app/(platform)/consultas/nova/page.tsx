"use client";

import { ErrorBanner, LoadingState, PageHeader, buttonClass, cn, inputClass } from "@/components/ui";
import { formatBrazilDateTimeInput } from "@/lib/format";
import { MODALITY_LABELS } from "@/lib/types";
import type { AvailableDays, AvailableTime, CareSpecialty, ConsultationModality, Doctor, Patient } from "@/lib/types";
import { brazilLocalDateTimeToUtcIso, isFutureBrazilLocalDateTime } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { ArrowLeft, CalendarPlus, CheckCircle2, Clock, MapPin, Paperclip, Video, X } from "lucide-react";
import Link from "next/link";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { ReceptionBookingForm } from "@/components/reception-booking";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

const operationalRoles = ["ClinicAdmin", "Receptionist"];

export default function NewAppointmentPage() {
  const router = useRouter();
  const roles = getSession()?.user.roles ?? [];
  const isPatient = roles.includes("Patient");
  const canOperationalSchedule = roles.some((role) => operationalRoles.includes(role));
  const canUsePage = isPatient || canOperationalSchedule;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [specialties, setSpecialties] = useState<CareSpecialty[]>([]);
  const [form, setForm] = useState<AppointmentForm>({
    doctorId: "",
    patientId: "",
    specialty: "",
    scheduledAt: "",
    durationMinutes: 30,
    notes: "",
    price: "",
    paymentRequired: false,
    modality: "Online",
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
            modality: data[0]?.doctors[0]?.modalities[0] ?? "Online",
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
      setError("Selecione uma especialidade e um médico disponível.");
      setSaving(false);
      return;
    }
    if (!isFutureBrazilLocalDateTime(form.scheduledAt)) {
      setError("Escolha uma data e um horário futuros (horário de Brasília).");
      setSaving(false);
      return;
    }
    if (form.durationMinutes < 10) {
      setError("A duração minima da consulta e de 10 minutos.");
      setSaving(false);
      return;
    }

    // Only the patient submits here; the reception has its own form (ReceptionBookingForm).
    try {
      const appointment = await api.requestAppointment({
        specialty: form.specialty,
        doctorId: form.doctorId,
        scheduledAt: brazilLocalDateTimeToUtcIso(form.scheduledAt),
        // The slot carries the doctor's consultation length; open schedules keep 30 minutes.
        durationMinutes: form.durationMinutes,
        notes: form.notes,
        modality: form.modality,
      });
      if (attachments.length > 0) {
        await Promise.all(
          attachments.map((file) => api.uploadClinicalRecordAttachment(appointment.id, file)),
        );
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
            ? "Escolha a especialidade, o médico e um horário livre."
            : "Para quem liga ou chega no balcão: busque o paciente, escolha o médico, a modalidade e um horário livre."
        }
      />
      {error && !(isPatient && isNoDoctorAvailableError(error)) && <ErrorBanner message={error} />}
      {!canUsePage ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Este perfil não cria agenda. A consulta é solicitada pelo paciente ou agendada pela clínica.
        </div>
      ) : loading ? (
        <LoadingState label="Preparando formulário..." />
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
      ) : doctors.length === 0 ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Cadastre ao menos um médico antes de agendar.
        </div>
      ) : (
        <ReceptionBookingForm doctors={doctors} patients={patients} onBooked={() => router.push("/consultas")} />
      )}
    </>
  );
}

function isNoDoctorAvailableError(message: string) {
  return /n[aã]o h[aá] m[eé]dico dispon[ií]vel|n[aã]o est[aá] dispon[ií]vel neste hor[aá]rio/i.test(message);
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
  modality: ConsultationModality;
};

const BOOKABLE_MODALITIES: ConsultationModality[] = ["Online", "InPerson"];

function ModalityPicker({
  value,
  options,
  onChange,
  label = "Como quer ser atendido",
  inPersonPendingAddress = false,
}: {
  label?: string;
  inPersonPendingAddress?: boolean;
  value: ConsultationModality;
  options: ConsultationModality[];
  onChange: (modality: ConsultationModality) => void;
}) {
  return (
    <fieldset className="block sm:col-span-2">
      <legend className="mb-2 block text-sm font-bold text-slate-700">{label}</legend>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {BOOKABLE_MODALITIES.map((modality) => {
          const offered = options.includes(modality);
          return (
            <button
              key={modality}
              type="button"
              aria-pressed={value === modality}
              disabled={!offered}
              onClick={() => onChange(modality)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:text-slate-300",
                value === modality ? "bg-teal-50 text-teal-800 ring-1 ring-teal-200" : "text-slate-500 hover:text-ink",
              )}
            >
              {modality === "Online" ? <Video size={15} /> : <MapPin size={15} />}
              {MODALITY_LABELS[modality]}
            </button>
          );
        })}
      </div>
      {inPersonPendingAddress && !options.includes("InPerson") ? (
        <span className="mt-2 block text-xs text-amber-700">
          Atendimento presencial ainda indisponível: a clínica não informou o endereço de atendimento.
        </span>
      ) : (
        options.length === 1 && (
          <span className="mt-2 block text-xs text-slate-400">
            Nesta especialidade só há atendimento {options[0] === "Online" ? "online" : "presencial"}.
          </span>
        )
      )}
    </fieldset>
  );
}

function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

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
  const specialtyDoctors = selectedSpecialty?.doctors ?? [];
  const specialtyModalities = BOOKABLE_MODALITIES.filter((modality) =>
    specialtyDoctors.some((doctor) => doctor.modalities.includes(modality)),
  );
  const availableDoctors = specialtyDoctors.filter((doctor) => doctor.modalities.includes(form.modality));
  const selectedDoctor = availableDoctors.find((doctor) => doctor.id === form.doctorId);
  const doctorHasAvailability = selectedDoctor?.hasAvailability ?? false;
  const otherDoctorsInSpecialty = availableDoctors.filter((doctor) => doctor.id !== form.doctorId);
  const otherSpecialties = specialties.filter((item) => item.specialty !== form.specialty);

  const [slotDate, setSlotDate] = useState("");
  const [availableDays, setAvailableDays] = useState<AvailableDays | null>(null);
  const [daysLoading, setDaysLoading] = useState(false);

  // Only dates with a free slot can be picked; the first one is preselected.
  useEffect(() => {
    if (!doctorHasAvailability || !form.doctorId) {
      setAvailableDays(null);
      return;
    }
    let active = true;
    setDaysLoading(true);
    api
      .getAvailableDays(form.doctorId, form.modality)
      .then((result) => {
        if (!active) return;
        setAvailableDays(result);
        setSlotDate(result.days[0] ?? "");
      })
      .catch(() => {
        if (active) setAvailableDays(null);
      })
      .finally(() => {
        if (active) setDaysLoading(false);
      });
    return () => {
      active = false;
    };
  }, [doctorHasAvailability, form.doctorId, form.modality]);
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
      .getAvailableTimes(form.doctorId, slotDate, form.modality)
      .then((times) => {
        if (active) setAvailableTimes(times);
      })
      .catch((err) => {
        if (active) setSlotsError(err instanceof Error ? err.message : "Erro ao carregar os horários disponíveis.");
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [doctorHasAvailability, form.doctorId, form.modality, slotDate]);

  if (specialties.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
        Nenhuma especialidade está disponível para solicitação neste momento. Fale com o suporte MedSync.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_.7fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
        {isNoDoctorAvailableError(error) && (
          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
            <p className="font-bold">Nenhum médico disponível neste horário.</p>
            <p className="mt-1 text-xs leading-5">
              Tente outro horário{otherDoctorsInSpecialty.length > 0 ? ", escolha outro profissional" : ""}
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
            <span className="mb-2 block text-sm font-bold text-slate-700">Especialidade ou área</span>
            <select
              className={inputClass}
              value={form.specialty}
              onChange={(event) => {
                const nextSpecialty = specialties.find((item) => item.specialty === event.target.value);
                const nextDoctors = nextSpecialty?.doctors ?? [];
                const modality = nextDoctors.some((doctor) => doctor.modalities.includes(form.modality))
                  ? form.modality
                  : (nextDoctors[0]?.modalities[0] ?? "Online");
                onChange({
                  ...form,
                  specialty: event.target.value,
                  modality,
                  doctorId: nextDoctors.find((doctor) => doctor.modalities.includes(modality))?.id ?? "",
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
          <ModalityPicker
            value={form.modality}
            options={specialtyModalities}
            inPersonPendingAddress={specialtyDoctors.some((doctor) => doctor.inPersonPendingAddress)}
            onChange={(modality) =>
              onChange({
                ...form,
                modality,
                doctorId: specialtyDoctors.find((doctor) => doctor.modalities.includes(modality))?.id ?? "",
                scheduledAt: "",
              })
            }
          />
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-slate-700">Médico disponível</span>
            <select
              className={inputClass}
              value={form.doctorId}
              onChange={(event) => onChange({ ...form, doctorId: event.target.value, scheduledAt: "" })}
              required
            >
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-slate-400">
              {availableDoctors.length} {availableDoctors.length === 1 ? "opção" : "opções"} nesta especialidade.
            </span>
          </label>
          {selectedDoctor && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm sm:col-span-2" data-testid="doctor-location">
              <p className="font-bold text-ink">
                {selectedDoctor.name} <span className="font-medium text-slate-500">· {selectedDoctor.crm}</span>
              </p>
              {form.modality === "InPerson" && selectedDoctor.clinicAddress ? (
                <p className="mt-1 text-slate-600">
                  <MapPin size={14} className="mr-1 inline text-sky-700" />
                  <strong>{selectedDoctor.clinicName}</strong> — {selectedDoctor.clinicAddress}{" "}
                  <a
                    href={mapsLink(`${selectedDoctor.clinicName}, ${selectedDoctor.clinicAddress}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="whitespace-nowrap text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    Ver no mapa
                  </a>
                </p>
              ) : (
                <p className="mt-1 text-slate-600">
                  <Video size={14} className="mr-1 inline text-teal-700" />
                  Por vídeo, pelo MedSync. O link da sala aparece em Minhas consultas.
                </p>
              )}
            </div>
          )}
          {doctorHasAvailability ? (
            <div className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Escolha o dia e o horário (Brasília)</span>
              {daysLoading ? (
                <p className="mb-4 text-sm text-slate-400">Carregando dias disponíveis...</p>
              ) : availableDays && availableDays.days.length > 0 ? (
                <div className="mb-4">
                  <AvailabilityCalendar
                    key={form.doctorId}
                    availableDays={availableDays.days}
                    from={availableDays.from}
                    to={availableDays.to}
                    selected={slotDate}
                    onSelect={(day) => {
                      setSlotDate(day);
                      onChange({ ...form, scheduledAt: "" });
                    }}
                  />
                </div>
              ) : (
                <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  {selectedDoctor?.name ?? "Este médico"} não tem horários livres {form.modality === "InPerson" ? "presenciais" : "online"} no período aberto para marcação.
                </p>
              )}
              {slotsError && <p className="mb-3 text-xs font-semibold text-red-600">{slotsError}</p>}
              {slotsLoading ? (
                <p className="text-sm text-slate-400">Carregando horários...</p>
              ) : !slotDate ? null : availableTimes.length === 0 ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  <p>Nenhum horário disponível com {selectedDoctor?.name ?? "este médico"} nesta data. Tente outra data{otherDoctorsInSpecialty.length > 0 ? " ou escolha outro profissional abaixo." : "."}</p>
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
                        onClick={() => onChange({ ...form, scheduledAt: localValue, durationMinutes: time.durationMinutes })}
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
              <span className="mb-2 block text-sm font-bold text-slate-700">Data e horário (Brasília)</span>
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
            <span className="mb-2 block text-sm font-bold text-slate-700">Observação para o atendimento</span>
            <textarea
              className={`${inputClass} h-28 resize-none py-3`}
              maxLength={240}
              placeholder="Descreva brevemente o motivo da consulta..."
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
          "O médico recebe a solicitação na agenda dele.",
          "A consulta aparece em Minhas consultas.",
        ]}
      />
    </form>
  );
}

function AsideSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
        <CheckCircle2 size={20} />
      </span>
      <h2 className="mt-5 text-lg font-bold text-ink">{title}</h2>
      <ol className="mt-4 space-y-4 text-sm text-slate-600">
        {steps.map((text, index) => (
          <li key={text} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-5">{text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
