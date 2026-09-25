"use client";

import { Card, EmptyState, ErrorBanner, LoadingState, PageHeader, SearchField, buttonClass, inputClass } from "@/components/ui";
import type { Doctor } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, getSession, saveSession } from "@/services/api";
import { BadgeCheck, Mail, Plus, Stethoscope } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  crm: "",
  crmUf: "",
  specialty: "",
  phone: "",
  temporaryPassword: "",
};

const initialEditForm = {
  name: "",
  email: "",
  crm: "",
  crmUf: "",
  specialty: "",
  phone: "",
  professionalAddress: "",
};

export default function DoctorsPage() {
  const session = getSession();
  const roles = session?.user.roles ?? [];
  const isDoctorProfile = roles.includes("Doctor") && !roles.some((role) => role !== "Doctor");
  const canManage = roles.some((role) => role === "ClinicAdmin" || role === "MedicalDirector");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .getDoctors()
      .then(setDoctors)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar medicos."))
      .finally(() => setLoading(false));
  }, []);

  const ownDoctor = isDoctorProfile
    ? doctors.find((doctor) => doctor.email.toLowerCase() === session?.user.email.toLowerCase())
    : undefined;

  useEffect(() => {
    if (!ownDoctor) return;
    setEditForm({
      name: ownDoctor.name,
      email: ownDoctor.email,
      crm: ownDoctor.crm,
      crmUf: ownDoctor.crmUf,
      specialty: ownDoctor.specialty,
      phone: ownDoctor.phone ?? "",
      professionalAddress: ownDoctor.professionalAddress ?? "",
    });
  }, [ownDoctor]);

  const filtered = useMemo(() => {
    const source = isDoctorProfile
      ? doctors.filter((doctor) => doctor.email.toLowerCase() === session?.user.email.toLowerCase())
      : doctors;

    return source.filter((doctor) =>
      `${doctor.name} ${doctor.crm} ${doctor.specialty}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [doctors, isDoctorProfile, query, session?.user.email]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (form.name.trim().length < 3) {
      setError("Informe o nome completo do medico.");
      setSaving(false);
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.crmUf.trim())) {
      setError("Informe a UF do CRM com duas letras.");
      setSaving(false);
      return;
    }
    if (!isValidOptionalPhone(form.phone)) {
      setError("Informe um telefone valido com DDD.");
      setSaving(false);
      return;
    }
    try {
      const created = await api.createDoctor({ ...form, crmUf: form.crmUf.toUpperCase() });
      setDoctors((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar medico.");
    } finally {
      setSaving(false);
    }
  }

  async function submitUpdate(event: FormEvent) {
    event.preventDefault();
    if (!ownDoctor) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    if (editForm.name.trim().length < 3) {
      setError("Informe o nome completo do medico.");
      setUpdating(false);
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(editForm.crmUf.trim())) {
      setError("Informe a UF do CRM com duas letras.");
      setUpdating(false);
      return;
    }
    if (!editForm.crm.trim()) {
      setError("CRM e obrigatorio.");
      setUpdating(false);
      return;
    }
    if (!editForm.specialty.trim()) {
      setError("Especialidade e obrigatoria.");
      setUpdating(false);
      return;
    }
    if (!isValidOptionalPhone(editForm.phone)) {
      setError("Informe um telefone valido com DDD.");
      setUpdating(false);
      return;
    }
    try {
      const updated = await api.updateDoctor(ownDoctor.id, {
        ...editForm,
        crmUf: editForm.crmUf.toUpperCase(),
      });
      setDoctors((items) => items.map((doctor) => doctor.id === updated.id ? updated : doctor));
      saveSession(await api.me());
      setSuccess("Perfil medico atualizado com auditoria.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar perfil medico.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isDoctorProfile ? "MedSync Medical" : "Rede assistencial"}
        title={isDoctorProfile ? "Meu perfil" : "Medicos"}
        description={
          isDoctorProfile
            ? "Consulte seus dados profissionais usados na agenda e nos atendimentos vinculados."
            : "Consulte a rede medica disponivel para atendimentos autorizados por especialidade."
        }
        action={canManage ? (
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo medico
          </button>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      )}
      {isDoctorProfile && ownDoctor && (
        <form onSubmit={submitUpdate} className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Dados profissionais permitidos</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Esta atualização não altera prontuário nem registro clínico.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Nome completo</span>
              <input
                className={inputClass}
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">E-mail</span>
              <input
                className={inputClass}
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                required
              />
            </label>
            <div className="block">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">CRM</span>
                <input
                  className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-400`}
                  value={editForm.crm}
                  disabled
                  aria-readonly="true"
                />
              </label>
              <span className="mt-1 block text-[11px] text-slate-400">Somente administracao pode alterar.</span>
            </div>
            <div className="block">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">UF do CRM</span>
                <input
                  className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-400`}
                  value={editForm.crmUf}
                  disabled
                  aria-readonly="true"
                />
              </label>
              <span className="mt-1 block text-[11px] text-slate-400">Somente administracao pode alterar.</span>
            </div>
            <div className="block">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">Especialidade</span>
                <input
                  className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-400`}
                  value={editForm.specialty}
                  disabled
                  aria-readonly="true"
                />
              </label>
              <span className="mt-1 block text-[11px] text-slate-400">Somente administracao pode alterar.</span>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Telefone</span>
              <input
                className={inputClass}
                type="tel"
                value={editForm.phone}
                onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
              />
            </label>
            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-2 block text-xs font-bold text-slate-600">Endereço profissional</span>
              <input
                className={inputClass}
                value={editForm.professionalAddress}
                onChange={(event) => setEditForm({ ...editForm, professionalAddress: event.target.value })}
                maxLength={300}
                placeholder="Rua, número, cidade/UF — sai impresso nas receitas (CFM 2.314 art. 13)"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              CRM, UF e especialidade sao dados de credenciamento e so mudam com a administracao. Atualizacoes geram trilha de auditoria.
            </p>
            <button className={buttonClass} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar perfil medico"}
            </button>
          </div>
        </form>
      )}

      {isDoctorProfile && ownDoctor && (
        <div className="mb-7 rounded-lg border border-teal-100 bg-teal-50/60 p-5 text-sm text-teal-900">
          Os dias e horarios em que voce atende agora ficam em{" "}
          <Link href="/consultas" className="font-bold underline hover:text-teal-700">
            Agenda
          </Link>
          , junto com suas consultas vinculadas.
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Cadastrar medico</h2>
            <p className="mt-1 text-xs text-slate-400">Adicione um profissional a rede assistencial.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["name", "Nome completo", "text"],
              ["email", "E-mail", "email"],
              ["crm", "CRM", "text"],
              ["crmUf", "UF do CRM", "text"],
              ["specialty", "Especialidade", "text"],
              ["phone", "Telefone", "tel"],
              ["temporaryPassword", "Senha temporaria", "password"],
            ].map(([key, label, type]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
                <input
                  className={inputClass}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      [key]: key === "crmUf" ? event.target.value.toUpperCase().slice(0, 2) : event.target.value,
                    })
                  }
                  required={key !== "phone"}
                  minLength={key === "temporaryPassword" ? 12 : undefined}
                  maxLength={key === "crmUf" ? 2 : undefined}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="h-11 px-4 text-sm font-bold text-slate-500" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className={buttonClass} disabled={saving}>
              {saving ? "Salvando..." : "Salvar medico"}
            </button>
          </div>
        </form>
      )}

      {!isDoctorProfile && (
        <SearchField
          label="Buscar por nome, CRM ou especialidade"
          wrapperClassName="mb-5 max-w-md"
          placeholder="Buscar por nome, CRM ou especialidade"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {loading ? (
        <LoadingState label="Carregando medicos..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={22} />}
          title={query ? "Nenhum resultado" : isDoctorProfile ? "Perfil medico nao encontrado" : "Nenhum medico cadastrado"}
          description={query ? "Tente buscar usando outro termo." : "Os dados aparecem quando houver cadastro permitido no ambiente."}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <Card key={doctor.id} className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-teal-600 font-bold text-white">
                  {doctor.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-ink">{doctor.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-teal-600">{doctor.specialty}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-500">
                <p className="flex items-center gap-2.5"><BadgeCheck size={15} className="text-teal-600" /> {doctor.crm} / {doctor.crmUf}</p>
                <p className="flex items-center gap-2.5 truncate"><Mail size={15} className="shrink-0 text-teal-600" /> {doctor.email}</p>
              </div>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}
