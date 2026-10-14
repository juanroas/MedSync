"use client";

import { AddressFields, addressFromResponse, emptyAddress, isAddressComplete } from "@/components/address-fields";
import { DoctorPatients } from "@/components/doctor-patients";
import { PersonForm } from "@/components/person-form";
import { Button, ErrorBanner, EmptyState, LoadingState, PageHeader, SearchField, buttonClass, inputClass } from "@/components/ui";
import { formatDate, formatDateTime, statusClass, statusLabel } from "@/lib/format";
import { CLINICAL_ACCESS_REASON_LABELS } from "@/lib/types";
import type { Address, Appointment, AppointmentStatus, Patient, PatientClinicalAccessEntry } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, getSession, saveSession } from "@/services/api";
import { Download, Mail, MapPin, Phone, Pill, Plus, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const initialEditForm = {
  name: "",
  email: "",
  birthDate: "",
  phone: "",
  continuousMedications: "",
  socialName: "",
  motherName: "",
  motherNameUndeclared: false,
};

// Só médico: lista própria de pacientes atendidos. Paciente, ADM da clínica e quem acumula médico + ADM usam a tela abaixo.
export default function PatientsPage() {
  const roles = getSession()?.user.roles ?? [];
  const isDoctorOnly = roles.length > 0 && roles.every((role) => role === "Doctor");
  return isDoctorOnly ? <DoctorPatients /> : <PatientsRegistry />;
}

function PatientsRegistry() {
  const roles = getSession()?.user.roles ?? [];
  const isDoctor = roles.includes("Doctor");
  const isPatient = roles.includes("Patient");
  const canManage = roles.includes("ClinicAdmin") || roles.includes("Receptionist");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [editAddress, setEditAddress] = useState<Address>(emptyAddress);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      api.getPatients(),
      isDoctor ? api.getAppointments() : Promise.resolve([] as Appointment[]),
    ])
      .then(([patientData, appointmentData]) => {
        setPatients(patientData);
        setAppointments(appointmentData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar pacientes."))
      .finally(() => setLoading(false));
  }, [isDoctor]);

  // "Cadastrar pessoa" from the reception booking opens the form directly (?novo=1).
  useEffect(() => {
    if (canManage && new URLSearchParams(window.location.search).get("novo") === "1") setShowForm(true);
  }, [canManage]);

  const ownPatient = isPatient ? patients[0] : undefined;

  useEffect(() => {
    if (!ownPatient) return;
    setEditForm({
      name: ownPatient.name,
      email: ownPatient.email,
      birthDate: ownPatient.birthDate,
      phone: ownPatient.phone ?? "",
      continuousMedications: ownPatient.continuousMedications ?? "",
      socialName: ownPatient.socialName ?? "",
      motherName: ownPatient.motherName ?? "",
      motherNameUndeclared: ownPatient.motherNameUndeclared ?? false,
    });
    setEditAddress(addressFromResponse(ownPatient.address));
  }, [ownPatient]);

  const appointmentsByPatient = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appointment) => {
      const current = map.get(appointment.patientId) ?? [];
      current.push(appointment);
      map.set(appointment.patientId, current);
    });

    return map;
  }, [appointments]);

  const specialtyOptions = useMemo(
    () =>
      Array.from(new Set(appointments.map((appointment) => appointment.specialty)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [appointments],
  );

  const filtered = useMemo(
    () =>
      patients.filter((patient) => {
        const patientAppointments = appointmentsByPatient.get(patient.id) ?? [];
        const matchesQuery = `${patient.name} ${patient.email} ${patient.cpfMasked}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus =
          !isDoctor ||
          statusFilter === "all" ||
          patientAppointments.some((appointment) => appointment.status === statusFilter);
        const matchesSpecialty =
          !isDoctor ||
          specialtyFilter === "all" ||
          patientAppointments.some((appointment) => appointment.specialty === specialtyFilter);

        return matchesQuery && matchesStatus && matchesSpecialty;
      }),
    [appointmentsByPatient, isDoctor, patients, query, specialtyFilter, statusFilter],
  );

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
      setError("A data de nascimento não pode estar no futuro.");
      setUpdating(false);
      return;
    }
    if (!isValidOptionalPhone(editForm.phone)) {
      setError("Informe um telefone válido com DDD.");
      setUpdating(false);
      return;
    }
    const addressTouched = Object.values(editAddress).some((value) => value?.trim());
    if (addressTouched && !isAddressComplete(editAddress)) {
      setError("Preencha o endereço completo (CEP, logradouro, número, bairro, cidade e UF).");
      setUpdating(false);
      return;
    }
    try {
      const updated = await api.updatePatient(ownPatient.id, {
        ...editForm,
        motherName: editForm.motherNameUndeclared ? undefined : editForm.motherName,
        address: addressTouched ? editAddress : undefined,
      });
      setPatients((items) => items.map((patient) => patient.id === updated.id ? updated : patient));
      saveSession(await api.me());
      setSuccess("Cadastro atualizado com segurança.");
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
              : "Mantenha os dados essenciais dos pacientes disponíveis para os atendimentos."
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
              CPF e registros clínicos não são alterados por este formulário.
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
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Nome social (opcional)</span>
              <input
                className={inputClass}
                value={editForm.socialName}
                onChange={(event) => setEditForm({ ...editForm, socialName: event.target.value })}
                maxLength={160}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-600">Nome da mãe</span>
              <input
                className={inputClass}
                value={editForm.motherName}
                onChange={(event) => setEditForm({ ...editForm, motherName: event.target.value })}
                disabled={editForm.motherNameUndeclared}
                maxLength={160}
              />
              <span className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={editForm.motherNameUndeclared}
                  onChange={(event) => setEditForm({ ...editForm, motherNameUndeclared: event.target.checked, motherName: "" })}
                />
                Não declarado
              </span>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-bold text-slate-600">Medicações de uso contínuo</span>
            <textarea
              className={`${inputClass} h-24 resize-none py-2.5`}
              placeholder="Ex.: Losartana 50mg (1x ao dia), Metformina 850mg (2x ao dia)"
              value={editForm.continuousMedications}
              onChange={(event) => setEditForm({ ...editForm, continuousMedications: event.target.value })}
              maxLength={2000}
            />
          </label>
          <div className="mt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Endereço</h3>
            <AddressFields value={editAddress} onChange={setEditAddress} required={false} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">Atualizações geram trilha de auditoria.</p>
            <button className={buttonClass} disabled={updating}>
              {updating ? "Atualizando..." : "Atualizar cadastro"}
            </button>
          </div>
        </form>
      )}
      {isPatient && <ClinicalAccessLog />}
      {isDoctor && (
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
          O médico não ve uma base geral de pacientes. Esta lista e filtrada por vinculo de consulta.
        </div>
      )}
      {showForm && (
        <div className="mb-7 rounded-lg border border-teal-100 bg-white p-6 shadow-soft">
          <div className="mb-5">
            <h2 className="font-bold text-ink">Cadastrar paciente</h2>
            <p className="mt-1 text-xs text-slate-400">Pessoa física: identificação, contato e endereço.</p>
          </div>
          <PersonForm
            submitLabel="Salvar paciente"
            onCancel={() => setShowForm(false)}
            onCreated={(created) => {
              setPatients((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
              setShowForm(false);
              const back = new URLSearchParams(window.location.search).get("volta");
              if (back?.startsWith("/")) window.location.assign(`${back}${back.includes("?") ? "&" : "?"}paciente=${created.id}`);
            }}
          />
        </div>
      )}

      {!isPatient && (
        <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_auto]">
            <SearchField
              label="Buscar por nome, e-mail ou CPF"
              wrapperClassName="border-slate-200"
              placeholder="Buscar por nome, e-mail ou CPF"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {isDoctor && (
              <>
                <select
                  className={inputClass}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | AppointmentStatus)}
                  aria-label="Filtrar por status"
                >
                  <option value="all">Todos os status</option>
                  <option value="Scheduled">Agendadas</option>
                  <option value="InProgress">Em andamento</option>
                  <option value="Completed">Concluídas</option>
                  <option value="Cancelled">Canceladas</option>
                  <option value="NoShow">Não compareceu</option>
                </select>
                <select
                  className={inputClass}
                  value={specialtyFilter}
                  onChange={(event) => setSpecialtyFilter(event.target.value)}
                  aria-label="Filtrar por especialidade"
                >
                  <option value="all">Todas as especialidades</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </>
            )}
            <div className="flex items-center rounded-lg bg-slate-50 px-4 text-sm font-bold text-slate-600">
              {filtered.length} de {patients.length}
            </div>
          </div>
        </section>
      )}

      {isPatient ? (
        loading && <LoadingState label="Carregando seu cadastro..." />
      ) : loading ? (
        <LoadingState label="Carregando pacientes..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UserRound size={22} />}
          title={query ? "Nenhum resultado" : isPatient ? "Cadastro não encontrado" : "Nenhum paciente cadastrado"}
          description={query ? "Tente buscar usando outro termo." : "Nenhum cadastro foi encontrado para este perfil."}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => {
            const patientAppointments = appointmentsByPatient.get(patient.id) ?? [];
            const nextLinkedAppointment =
              patientAppointments.find((appointment) => appointment.status === "InProgress") ??
              patientAppointments.find((appointment) => appointment.status === "Scheduled") ??
              patientAppointments[0];

            return (
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
                <p className="flex items-center gap-2.5"><Phone size={15} className="text-teal-600" /> {patient.phone || "Não informado"}</p>
                <p className="text-xs text-slate-400">Nascimento: {formatDate(patient.birthDate)}</p>
                {patient.address?.city && (
                  <p className="flex items-center gap-2.5 text-xs">
                    <MapPin size={15} className="text-teal-600" /> {patient.address.city}/{patient.address.state}
                  </p>
                )}
              </div>
              {isDoctor && patient.continuousMedications && (
                <div className="mt-4 flex gap-2.5 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-800">
                  <Pill size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Medicações de uso contínuo</p>
                    <p className="mt-0.5 leading-5">{patient.continuousMedications}</p>
                  </div>
                </div>
              )}
              {isDoctor && nextLinkedAppointment && (
                <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Último vinculo assistencial</p>
                      <p className="mt-1 text-sm font-bold text-ink">{nextLinkedAppointment.specialty}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(nextLinkedAppointment.scheduledAt)}</p>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[nextLinkedAppointment.status]}`}>
                      {statusLabel[nextLinkedAppointment.status]}
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
          })}
        </section>
      )}
    </>
  );
}

// Rule C3: the patient sees every justified access to their record by the MedSync medical team.
function ClinicalAccessLog() {
  const [entries, setEntries] = useState<PatientClinicalAccessEntry[] | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    api.getMyClinicalAccessLog().then(setEntries).catch(() => setEntries([]));
  }, []);
  // LGPD art. 18 e 19: the full list of who touched the patient's data, as a PDF.
  async function downloadReport() {
    setDownloading(true);
    setDownloadError("");
    try {
      await api.downloadMyDataAccessReport();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Não foi possível gerar o relatório.");
    } finally {
      setDownloading(false);
    }
  }
  if (entries === null) return null;
  return (
    <section className="mb-7 rounded-lg border border-slate-200 bg-white p-6 shadow-sm" aria-label="Quem acessou meu prontuário">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-bold text-ink">Quem acessou meu prontuário</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Além dos médicos que atenderam você, só o Médico ADM MedSync pode abrir seu prontuário, com motivo registrado.
            O relatório completo lista todos que acessaram ou alteraram seus dados.
          </p>
        </div>
        <Button type="button" variant="secondary" className="shrink-0" onClick={downloadReport} isLoading={downloading}>
          <Download size={16} /> Baixar relatório de acessos (PDF)
        </Button>
      </div>
      {downloadError && <p className="mt-2 text-xs font-semibold text-red-600">{downloadError}</p>}
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nenhum acesso da equipe médica MedSync até agora.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {entries.map((entry) => (
            <li key={entry.at} className="py-2">
              <b>{formatDateTime(entry.at)}</b> · {entry.actorName}
              {entry.actorCrm ? ` · ${entry.actorCrm}` : ""} ({entry.actorRole}) · {CLINICAL_ACCESS_REASON_LABELS[entry.reason]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
