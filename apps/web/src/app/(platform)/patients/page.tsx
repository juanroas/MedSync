"use client";

import { ErrorBanner, EmptyState, LoadingState, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Patient } from "@/lib/types";
import { isValidCpf, isValidOptionalPhone, maskCpf } from "@/lib/validation";
import { api, getSession, saveSession } from "@/services/api";
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

const initialEditForm = {
  name: "",
  email: "",
  birthDate: "",
  phone: "",
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
      .getPatients()
      .then(setPatients)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar pacientes."))
      .finally(() => setLoading(false));
  }, []);

  const ownPatient = isPatient ? patients[0] : undefined;

  useEffect(() => {
    if (!ownPatient) return;
    setEditForm({
      name: ownPatient.name,
      email: ownPatient.email,
      birthDate: ownPatient.birthDate,
      phone: ownPatient.phone ?? "",
    });
  }, [ownPatient]);

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

  async function submitUpdate(event: FormEvent) {
    event.preventDefault();
    if (!ownPatient) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    if (editForm.name.trim().length < 3) {
      setError("Informe o nome completo com pelo menos 3 caracteres.");
      setUpdating(false);
      return;
    }
    if (editForm.birthDate && new Date(`${editForm.birthDate}T00:00:00`).getTime() > Date.now()) {
      setError("A data de nascimento nao pode estar no futuro.");
      setUpdating(false);
      return;
    }
    if (!isValidOptionalPhone(editForm.phone)) {
      setError("Informe um telefone valido com DDD.");
      setUpdating(false);
      return;
    }
    try {
      const updated = await api.updatePatient(ownPatient.id, editForm);
      setPatients((items) => items.map((patient) => patient.id === updated.id ? updated : patient));
      saveSession(await api.me());
      setSuccess("Cadastro atualizado com seguranca.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cadastro.");
    } finally {
      setUpdating(false);
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
              ? "Confira e atualize seus dados cadastrais permitidos."
              : "Mantenha os dados essenciais dos pacientes disponiveis para os atendimentos."
        }
        action={canManage ? (
          <button className={buttonClass} onClick={() => setShowForm((value) => !value)}>
            <Plus size={17} /> Novo paciente
          </button>
        ) : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      )}
      {isPatient && ownPatient && (
        <form onSubmit={submitUpdate} className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Dados cadastrais permitidos</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              CPF, elegibilidade, faturas e registros clinicos nao sao alterados por este formulario.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Nascimento</span>
              <input
                className={inputClass}
                type="date"
                value={editForm.birthDate}
                onChange={(event) => setEditForm({ ...editForm, birthDate: event.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Telefone</span>
              <input
                className={inputClass}
                type="tel"
                value={editForm.phone}
                onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
              />
            </label>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">Atualizacoes geram trilha de auditoria.</p>
            <button className={buttonClass} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar cadastro"}
            </button>
          </div>
        </form>
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
