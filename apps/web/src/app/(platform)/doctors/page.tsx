"use client";

import { ErrorBanner, EmptyState, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import type { Doctor } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { BadgeCheck, Mail, Plus, Search, Stethoscope } from "lucide-react";
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

export default function DoctorsPage() {
  const canManage = getSession()?.user.roles.some((role) =>
    role === "ClinicAdmin" || role === "MedicalDirector",
  ) ?? false;
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getDoctors()
      .then(setDoctors)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar médicos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      doctors.filter((doctor) =>
        `${doctor.name} ${doctor.crm} ${doctor.specialty}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [doctors, query],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (form.name.trim().length < 3) {
      setError("Informe o nome completo do médico.");
      setSaving(false);
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(form.crmUf.trim())) {
      setError("Informe a UF do CRM com duas letras.");
      setSaving(false);
      return;
    }
    if (!isValidOptionalPhone(form.phone)) {
      setError("Informe um telefone válido com DDD.");
      setSaving(false);
      return;
    }
    try {
      const created = await api.createDoctor({ ...form, crmUf: form.crmUf.toUpperCase() });
      setDoctors((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar médico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Médicos"
        description="Gerencie os profissionais disponíveis para os atendimentos da clínica."
        action={canManage ? (
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo médico
          </button>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {showForm && (
        <form onSubmit={submit} className="mb-7 rounded-3xl border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Cadastrar médico</h2>
            <p className="mt-1 text-xs text-slate-400">Adicione um profissional à equipe clínica.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["name", "Nome completo", "text"],
              ["email", "E-mail", "email"],
              ["crm", "CRM", "text"],
              ["crmUf", "UF do CRM", "text"],
              ["specialty", "Especialidade", "text"],
              ["phone", "Telefone", "tel"],
              ["temporaryPassword", "Senha temporária", "password"],
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
              {saving ? "Salvando..." : "Salvar médico"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-5 flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
        <Search size={18} className="text-slate-400" />
        <input
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder="Buscar por nome, CRM ou especialidade"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="Carregando equipe..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={22} />}
          title={query ? "Nenhum resultado" : "Nenhum médico cadastrado"}
          description={query ? "Tente buscar usando outro termo." : "Cadastre o primeiro médico da equipe."}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor) => (
            <article key={doctor.id} className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-teal-50" />
              <div className="relative flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-600 font-bold text-white">
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
              <div className="relative mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-500">
                <p className="flex items-center gap-2.5"><BadgeCheck size={15} className="text-teal-600" /> {doctor.crm} / {doctor.crmUf}</p>
                <p className="flex items-center gap-2.5 truncate"><Mail size={15} className="shrink-0 text-teal-600" /> {doctor.email}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
