"use client";

import { AlertBanner, Card, ErrorBanner, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { ROLE_LABELS, type PersonalProfile } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, saveSession } from "@/services/api";
import { CheckCircle2, KeyRound, LockKeyhole, Mail, Phone, ShieldCheck, UserRoundCog } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
    () => profile?.roles.map((role) => ROLE_LABELS[role] ?? role).join(" / ") ?? "",
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

            <MfaCard mfaEnabled={profile.mfaEnabled} onChange={(mfaEnabled) => setProfile({ ...profile, mfaEnabled })} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function MfaCard({ mfaEnabled, onChange }: { mfaEnabled: boolean; onChange: (enabled: boolean) => void }) {
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpAuthUri, setOtpAuthUri] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function startEnroll() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await api.enrollMfa();
      setSecret(result.secret);
      setOtpAuthUri(result.otpAuthUri);
      setEnrolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar verificacao em duas etapas.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEnroll(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.confirmMfa(code);
      setEnrolling(false);
      setCode("");
      setSuccess("Verificacao em duas etapas ativada.");
      onChange(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Codigo invalido.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisable(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.disableMfa(password);
      setDisabling(false);
      setPassword("");
      setSuccess("Verificacao em duas etapas desativada.");
      onChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senha incorreta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
          <KeyRound size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink">Verificacao em duas etapas</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {mfaEnabled
              ? "Ativada. Um codigo do seu aplicativo autenticador e exigido a cada login."
              : "Adicione uma camada extra de seguranca com um aplicativo autenticador (Google Authenticator, Authy)."}
          </p>
        </div>
      </div>

      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      {success && <div className="mt-4"><AlertBanner tone="success" message={success} /></div>}

      {!mfaEnabled && !enrolling && (
        <button className={`${buttonClass} mt-5 w-full`} onClick={startEnroll} disabled={saving}>
          {saving ? "Gerando..." : "Ativar verificacao em duas etapas"}
        </button>
      )}

      {enrolling && (
        <form onSubmit={confirmEnroll} className="mt-5 space-y-4">
          <p className="text-xs leading-5 text-slate-500">
            Adicione esta chave no seu aplicativo autenticador (ou cole o link OTP diretamente):
          </p>
          <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-ink">{secret}</p>
          <a
            href={otpAuthUri}
            className="block break-all text-xs font-semibold text-teal-700 hover:underline"
          >
            {otpAuthUri}
          </a>
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Codigo de confirmacao</span>
            <input
              className={`${inputClass} text-center tracking-[0.3em]`}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </label>
          <div className="flex gap-3">
            <button type="button" className="flex-1 h-11 text-sm font-bold text-slate-500" onClick={() => setEnrolling(false)}>
              Cancelar
            </button>
            <button className={`${buttonClass} flex-1`} disabled={saving || code.length !== 6}>
              {saving ? "Confirmando..." : "Confirmar"}
            </button>
          </div>
        </form>
      )}

      {mfaEnabled && !disabling && (
        <button
          className="mt-5 w-full h-11 rounded-lg border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50"
          onClick={() => setDisabling(true)}
        >
          Desativar
        </button>
      )}

      {disabling && (
        <form onSubmit={confirmDisable} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Confirme sua senha</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <div className="flex gap-3">
            <button type="button" className="flex-1 h-11 text-sm font-bold text-slate-500" onClick={() => setDisabling(false)}>
              Cancelar
            </button>
            <button className="flex-1 h-11 rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700" disabled={saving}>
              {saving ? "Desativando..." : "Confirmar desativacao"}
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
