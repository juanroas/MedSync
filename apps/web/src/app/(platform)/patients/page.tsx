"use client";

import { ErrorBanner, EmptyState, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/lib/types";
import { api } from "@/services/api";
import { Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const initialForm = { name: "", email: "", cpf: "", birthDate: "", phone: "" };

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getPatients()
      .then(setPatients)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar pacientes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      patients.filter((patient) =>
        `${patient.name} ${patient.email} ${patient.cpf}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [patients, query],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.createPatient(form);
      setPatients((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar paciente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Pacientes"
        description="Mantenha os dados essenciais dos pacientes disponíveis para os atendimentos."
        action={
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo paciente
          </button>
        }
      />
      {error && <ErrorBanner message={error} />}
      {showForm && (
        <form onSubmit={submit} className="mb-7 rounded-3xl border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Cadastrar paciente</h2>
            <p className="mt-1 text-xs text-slate-400">Preencha os dados para criar um novo cadastro.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["name", "Nome completo", "text"],
              ["email", "E-mail", "email"],
              ["cpf", "CPF", "text"],
              ["birthDate", "Nascimento", "date"],
              ["phone", "Telefone", "tel"],
            ].map(([key, label, type]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
                <input
                  className={inputClass}
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required={key !== "phone"}
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" className="h-11 px-4 text-sm font-bold text-slate-500" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className={buttonClass} disabled={saving}>
              {saving ? "Salvando..." : "Salvar paciente"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-5 flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
        <Search size={18} className="text-slate-400" />
        <input
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          placeholder="Buscar por nome, e-mail ou CPF"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <LoadingState label="Carregando pacientes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserRound size={22} />}
          title={query ? "Nenhum resultado" : "Nenhum paciente cadastrado"}
          description={query ? "Tente buscar usando outro termo." : "Cadastre o primeiro paciente para começar."}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <article key={patient.id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 font-bold text-teal-700">
                  {patient.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-ink">{patient.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">CPF {patient.cpf}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-500">
                <p className="flex items-center gap-2.5"><Mail size={15} className="text-teal-600" /> {patient.email}</p>
                <p className="flex items-center gap-2.5"><Phone size={15} className="text-teal-600" /> {patient.phone || "Não informado"}</p>
                <p className="text-xs text-slate-400">Nascimento: {formatDate(patient.birthDate)}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

