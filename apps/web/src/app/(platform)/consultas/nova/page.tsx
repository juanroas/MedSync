"use client";

import { ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { Doctor, Patient } from "@/lib/types";
import { api } from "@/services/api";
import { ArrowLeft, CalendarPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function NewAppointmentPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState({
    doctorId: "",
    patientId: "",
    scheduledAt: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createAppointment({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      router.push("/consultas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar consulta.");
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
        title="Agendar consulta"
        description="Escolha o médico, o paciente e o melhor horário. A sala será preparada no momento do acesso."
      />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <LoadingState label="Preparando formulário..." />
      ) : doctors.length === 0 || patients.length === 0 ? (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-800">
          Cadastre ao menos um médico e um paciente antes de criar uma consulta.
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.2fr_.7fr]">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Paciente</span>
                <select
                  className={inputClass}
                  value={form.patientId}
                  onChange={(event) => setForm({ ...form, patientId: event.target.value })}
                  required
                >
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Médico</span>
                <select
                  className={inputClass}
                  value={form.doctorId}
                  onChange={(event) => setForm({ ...form, doctorId: event.target.value })}
                  required
                >
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} · {doctor.specialty}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">Data e horário</span>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
                  required
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">Observações</span>
                <textarea
                  className={`${inputClass} h-28 resize-none py-3`}
                  placeholder="Motivo da consulta ou informação breve..."
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
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

          <aside className="h-fit rounded-3xl bg-ink p-7 text-white">
            <span className="grid size-12 place-items-center rounded-2xl bg-teal-400/15 text-teal-200">
              <CheckCircle2 size={22} />
            </span>
            <h2 className="mt-6 text-xl font-bold">O que acontece depois?</h2>
            <ol className="mt-5 space-y-5 text-sm text-white/55">
              {[
                "A consulta aparece na agenda.",
                "Ao entrar, a API cria a sala segura.",
                "Cada participante recebe um token temporário.",
              ].map((text, index) => (
                <li key={text} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-teal-200">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-5">{text}</span>
                </li>
              ))}
            </ol>
          </aside>
        </form>
      )}
    </>
  );
}

