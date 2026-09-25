"use client";

import { AlertBanner, Button, Card, ErrorBanner, LoadingState, PageHeader, cn, inputClass } from "@/components/ui";
import { formatCrm } from "@/lib/format";
import type { Doctor } from "@/lib/types";
import { api, getSession, saveSession } from "@/services/api";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

// Meu perfil do médico (Fase 2). Mostra se os dados que saem impressos na receita estão completos
// (CFM 2.314 art. 13; RQE pela CFM 2.299) e edita o que é do próprio médico. CRM, UF e especialidade são
// credenciamento: só a administração altera.

type Form = { name: string; email: string; phone: string; professionalAddress: string; rqe: string };

export function DoctorProfile() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<Form>({ name: "", email: "", phone: "", professionalAddress: "", rqe: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const email = getSession()?.user.email.toLowerCase();
    api
      .getDoctors()
      .then((doctors) => {
        const own = doctors.find((item) => item.email.toLowerCase() === email) ?? doctors[0];
        if (!own) return;
        setDoctor(own);
        setForm({
          name: own.name,
          email: own.email,
          phone: own.phone ?? "",
          professionalAddress: own.professionalAddress ?? "",
          rqe: own.rqe ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar seu perfil."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!doctor) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api.updateDoctor(doctor.id, {
        ...form,
        crm: doctor.crm,
        crmUf: doctor.crmUf,
        specialty: doctor.specialty,
      });
      setDoctor(updated);
      saveSession(await api.me());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Carregando seu perfil..." />;

  const checklist = doctor
    ? [
        { done: Boolean(doctor.name.trim()), label: "Nome completo" },
        { done: Boolean(doctor.crm && doctor.crmUf), label: formatCrm(doctor.crm, doctor.crmUf) },
        { done: Boolean(doctor.professionalAddress?.trim()), label: "Endereço profissional" },
      ]
    : [];
  const ready = checklist.every((item) => item.done);

  return (
    <>
      <PageHeader
        eyebrow="Portal médico"
        title="Meu perfil"
        description="Seus dados profissionais. Nome, CRM, RQE e endereço saem impressos nas receitas."
      />
      {error && <ErrorBanner message={error} />}
      {saved && <AlertBanner tone="success" message="Perfil salvo." />}

      {!doctor ? (
        <Card className="p-8 text-sm text-slate-500">Seu cadastro de médico não foi encontrado. Fale com a administração da clínica.</Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
          <form onSubmit={submit}>
            <Card className="p-6">
              <h2 className="font-bold text-ink">Dados que você pode alterar</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Nome completo">
                  <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Field>
                <Field label="E-mail">
                  <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Telefone">
                  <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="RQE (se tiver especialidade registrada)">
                  <input className={inputClass} value={form.rqe} onChange={(e) => setForm({ ...form, rqe: e.target.value })} maxLength={20} placeholder="Ex.: 12345" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Endereço profissional">
                    <input
                      className={inputClass}
                      value={form.professionalAddress}
                      onChange={(e) => setForm({ ...form, professionalAddress: e.target.value })}
                      maxLength={300}
                      placeholder="Rua, número, cidade/UF"
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit" isLoading={saving}>
                  Salvar
                </Button>
              </div>
            </Card>
          </form>

          <aside className="space-y-6">
            <Card className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Pronto para receitas</p>
              <p className={cn("mt-2 text-sm font-bold", ready ? "text-teal-800" : "text-amber-800")}>
                {ready ? "Seus dados estão completos." : "Falta completar para emitir receitas."}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-slate-700">
                    {item.done ? <CheckCircle2 size={16} className="text-teal-600" /> : <Circle size={16} className="text-amber-500" />}
                    {item.label}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-slate-500">
                  <Circle size={16} className="text-slate-300" /> Certificado digital: integração em preparação
                </li>
              </ul>
            </Card>
            <Card className="p-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Credenciamento</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">CRM</dt>
                  <dd className="font-semibold text-ink">{formatCrm(doctor.crm, doctor.crmUf)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Especialidade</dt>
                  <dd className="font-semibold text-ink">{doctor.specialty}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Para corrigir CRM ou especialidade, peça à administração da clínica pela{" "}
                <Link href="/ajuda" className="font-bold text-teal-700 underline">
                  Ajuda
                </Link>
                .
              </p>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
