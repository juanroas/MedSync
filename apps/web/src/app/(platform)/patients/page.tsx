"use client";

import { ErrorBanner, EmptyState, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/lib/types";
import { isValidCpf, isValidOptionalPhone, maskCpf } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  cpf: "",
  birthDate: "",
  phone: "",
  temporaryPassword: "",
};

export default function PatientsPage() {
  const roles = getSession()?.user.roles ?? [];
  const isDoctor = roles.includes("Doctor");
  const isPatient = roles.includes("Patient");
  const canManage = roles.some((role) =>
    role === "Receptionist" ||
    role === "ClinicAdmin" ||
    role === "MedicalDirector" ||
    role === "Support",
  );
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
        `${patient.name} ${patient.email} ${patient.cpfMasked}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [patients, query],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (form.name.trim().length < 3) {
      setError("Informe o nome completo com pelo menos 3 caracteres.");
      setSaving(false);
      return;
    }
    if (!isValidCpf(form.cpf)) {
      setError("Informe um CPF valido.");
      setSaving(false);
      return;
    }
    if (form.birthDate && new Date(`${form.birthDate}T00:00:00`).getTime() > Date.now()) {
      setError("A data de nascimento nao pode estar no futuro.");
      setSaving(false);
      return;
    }
    if (!isValidOptionalPhone(form.phone)) {
      setError("Informe um telefone valido com DDD.");
      setSaving(false);
      return;
    }
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
        eyebrow={isPatient ? "MedSync Care" : "Cadastros"}
        title={isDoctor ? "Pacientes vinculados" : isPatient ? "Meu cadastro" : "Pacientes"}
        description={
          isDoctor
            ? "Pacientes aparecem aqui somente quando existe consulta vinculada ao seu atendimento."
            : isPatient
              ? "Confira seus dados cadastrais. Edicao de dados permitidos sera liberada em etapa de CRUD."
              : "Mantenha os dados essenciais dos pacientes disponiveis para os atendimentos."
        }
        action={canManage ? (
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo paciente
          </button>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {isPatient && (
        <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
          Edicao do proprio cadastro ainda nao foi implementada. Proximo passo: endpoint de atualizacao com campos permitidos e auditoria.
        </div>
      )}
      {isDoctor && (
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
          O medico nao ve uma base geral de pacientes. Esta lista e filtrada por vinculo de consulta.
        </div>
      )}
      {showForm && (
        <form onSubmit={submit} className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Cadastrar paciente</h2>
            <p className="mt-1 text-xs text-slate-400">Preencha os dados para criar um novo cadastro.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["name", "Nome completo", "text"],
              ["email", "E-mail", "email"],
              ["cpf", "CPF", "text"],
              ["birthDate", "Nascimento", "date"],
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
                      [key]: key === "cpf" ? maskCpf(event.target.value) : event.target.value,
                    })
                  }
                  required={key !== "phone"}
                  minLength={key === "temporaryPassword" ? 12 : undefined}
                  max={key === "birthDate" ? new Date().toISOString().slice(0, 10) : undefined}
                  maxLength={key === "cpf" ? 14 : undefined}
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

      {!isPatient && (
        <div className="mb-5 flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white px-4">
          <Search size={18} className="text-slate-400" />
          <input
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Buscar por nome, e-mail ou CPF"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      {loading ? (
        <LoadingState label="Carregando pacientes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserRound size={22} />}
          title={query ? "Nenhum resultado" : isPatient ? "Cadastro nao encontrado" : "Nenhum paciente cadastrado"}
          description={query ? "Tente buscar usando outro termo." : "Nenhum cadastro foi encontrado para este perfil."}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <article key={patient.id} className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-teal-50 font-bold text-teal-700">
                  {patient.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-ink">{patient.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">CPF {patient.cpfMasked}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-500">
                <p className="flex items-center gap-2.5"><Mail size={15} className="text-teal-600" /> {patient.email}</p>
                <p className="flex items-center gap-2.5"><Phone size={15} className="text-teal-600" /> {patient.phone || "Nao informado"}</p>
                <p className="text-xs text-slate-400">Nascimento: {formatDate(patient.birthDate)}</p>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
