"use client";

import { DoctorProfile } from "@/components/doctor-profile";
import { Card, EmptyState, ErrorBanner, LoadingState, PageHeader, SearchField, buttonClass, inputClass } from "@/components/ui";
import type { Doctor } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { BadgeCheck, Mail, Plus, Stethoscope } from "lucide-react";
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
  const roles = getSession()?.user.roles ?? [];
  const isDoctorOnly = roles.length > 0 && roles.every((role) => role === "Doctor");
  return isDoctorOnly ? <DoctorProfile /> : <DoctorsDirectory />;
}

function DoctorsDirectory() {
  const session = getSession();
  const roles = session?.user.roles ?? [];
  const canManage = roles.some((role) => role === "ClinicAdmin" || role === "MedicalDirector");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .getDoctors()
      .then(setDoctors)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar medicos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return doctors.filter((doctor) =>
      `${doctor.name} ${doctor.crm} ${doctor.specialty}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [doctors, query]);

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

  return (
    <>
      <PageHeader
        eyebrow="Rede assistencial"
        title="Médicos"
        description="Médicos que atendem na clínica, por especialidade."
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

      {(
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
          title={query ? "Nenhum resultado" : "Nenhum medico cadastrado"}
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
