"use client";

import { AlertBanner, Card, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { ClinicRole, PersonalProfile } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, saveSession } from "@/services/api";
import { CheckCircle2, LockKeyhole, Mail, Phone, ShieldCheck, UserRoundCog } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const roleLabel: Partial<Record<ClinicRole, string>> = {
  Patient: "Paciente/beneficiario",
  Doctor: "Medico",
  CompanyAdmin: "Empresa admin",
  CompanyFinance: "Financeiro empresa",
  CompanyAuditor: "Auditor empresa",
  PlatformFinance: "Financeiro MedSync",
  Support: "Suporte MedSync",
  PlatformAuditor: "Auditor MedSync",
  DataProtectionOfficer: "DPO/Privacidade",
  PlatformAdmin: "Admin plataforma",
  OccupationalHealthAdmin: "Medico do trabalho",
  ClinicAdmin: "Admin legado",
  MedicalDirector: "Diretor medico",
  Receptionist: "Recepcao",
  Finance: "Financeiro legado",
  PrivacyAuditor: "Auditoria privacidade legado",
};

export default function PersonalProfilePage() {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.getProfile()
      .then((data) => {
        setProfile(data);
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone ?? "",
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar perfil."))
      .finally(() => setLoading(false));
  }, []);

  const roleText = useMemo(
    () => profile?.roles.map((role) => roleLabel[role] ?? role).join(" / ") ?? "",
    [profile?.roles],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (form.name.trim().length < 3 || form.name.trim().length > 160) {
      setError("Informe o nome completo com 3 a 160 caracteres.");
      setSaving(false);
      return;
    }
    if (!isValidOptionalPhone(form.phone)) {
      setError("Informe um telefone valido com DDD.");
      setSaving(false);
      return;
    }

    try {
      const updated = await api.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      setProfile(updated);
      setForm({
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? "",
      });
      saveSession(await api.me());
      setSuccess("Dados pessoais atualizados com auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Meus dados"
        description="Atualize seus dados pessoais permitidos sem alterar permissao, CNPJ, elegibilidade ou informacao clinica."
      />

      {error && <ErrorBanner message={error} />}
      {success && <AlertBanner tone="success" message={success} />}

      {loading ? (
        <LoadingState label="Carregando seus dados..." />
      ) : profile ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                <UserRoundCog size={22} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">Informacoes pessoais</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Esses campos atualizam sua conta. Quando houver cadastro de paciente ou medico vinculado, nome, e-mail e telefone sao sincronizados.
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-700">Nome completo</span>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={160}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">E-mail</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    className={`${inputClass} pl-10`}
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    maxLength={180}
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Telefone</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    className={`${inputClass} pl-10`}
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    maxLength={20}
                  />
                </div>
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">Atualizacao restrita ao proprio usuario e registrada em auditoria.</p>
              <button className={buttonClass} disabled={saving}>
                <CheckCircle2 size={17} />
                {saving ? "Salvando..." : "Salvar meus dados"}
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-coral-50 text-coral-600">
                  <ShieldCheck size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-slate-400">Escopo atual</p>
                  <h2 className="mt-2 text-lg font-bold text-ink">{profile.profileType}</h2>
                  <p className="mt-1 text-sm text-slate-500">{roleText}</p>
                  <p className="mt-3 text-xs leading-5 text-slate-400">{profile.clinicName}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <LockKeyhole size={20} />
                </span>
                <div>
                  <h2 className="font-bold text-ink">Campos protegidos</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Estes dados dependem de processo administrativo, juridico, DPO, diretor tecnico ou suporte autorizado.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.lockedFields.map((field) => (
                  <span key={field} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    {field}
                  </span>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      ) : null}
    </>
  );
}
