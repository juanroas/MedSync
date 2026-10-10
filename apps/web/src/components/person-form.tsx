"use client";

import { AddressFields, emptyAddress, isAddressComplete } from "@/components/address-fields";
import { Button, inputClass } from "@/components/ui";
import type { Address, Patient } from "@/lib/types";
import { isValidCpf, isValidOptionalPhone, maskCpf } from "@/lib/validation";
import { api } from "@/services/api";
import { FormEvent, useState } from "react";

// Cadastro de pessoa física (paciente) pela clínica: identificação completa para prontuário e receitas.
// Usado em Pacientes e no agendamento feito pela recepção.

const initialPerson = {
  name: "",
  socialName: "",
  cpf: "",
  birthDate: "",
  sex: "",
  motherName: "",
  motherNameUndeclared: false,
  phone: "",
  email: "",
  temporaryPassword: "",
  continuousMedications: "",
};

export function PersonForm({
  onCreated,
  onCancel,
  submitLabel = "Salvar cadastro",
}: {
  onCreated: (patient: Patient) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [form, setForm] = useState(initialPerson);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (form.name.trim().length < 3) return setError("Informe o nome completo com pelo menos 3 caracteres.");
    if (!isValidCpf(form.cpf)) return setError("Informe um CPF válido.");
    if (form.birthDate && new Date(`${form.birthDate}T00:00:00`).getTime() > Date.now())
      return setError("A data de nascimento não pode estar no futuro.");
    if (!form.motherNameUndeclared && form.motherName.trim().length < 3)
      return setError("Informe o nome da mãe ou marque \"Não declarado\".");
    if (!isValidOptionalPhone(form.phone)) return setError("Informe um telefone válido com DDD.");
    if (!isAddressComplete(address)) return setError("Preencha o endereço completo (CEP, logradouro, número, bairro, cidade e UF).");

    setSaving(true);
    try {
      const created = await api.createPatient({
        name: form.name,
        socialName: form.socialName || undefined,
        cpf: form.cpf,
        birthDate: form.birthDate,
        sex: form.sex || undefined,
        motherName: form.motherNameUndeclared ? undefined : form.motherName,
        motherNameUndeclared: form.motherNameUndeclared,
        phone: form.phone || undefined,
        email: form.email,
        temporaryPassword: form.temporaryPassword,
        continuousMedications: form.continuousMedications || undefined,
        address,
      });
      setForm(initialPerson);
      setAddress(emptyAddress);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  const label = "mb-2 block text-xs font-bold text-slate-600";

  return (
    <form onSubmit={submit} className="space-y-6" aria-label="Cadastro de pessoa">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Identificação</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className={label}>Nome completo</span>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={160} />
          </label>
          <label className="block">
            <span className={label}>CPF</span>
            <input
              className={inputClass}
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })}
              required
              maxLength={14}
              inputMode="numeric"
            />
          </label>
          <label className="block md:col-span-2">
            <span className={label}>Nome social (opcional)</span>
            <input className={inputClass} value={form.socialName} onChange={(e) => setForm({ ...form, socialName: e.target.value })} maxLength={160} />
          </label>
          <label className="block">
            <span className={label}>Data de nascimento</span>
            <input
              className={inputClass}
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              max={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className={label}>Nome da mãe</span>
            <input
              className={inputClass}
              value={form.motherName}
              onChange={(e) => setForm({ ...form, motherName: e.target.value })}
              disabled={form.motherNameUndeclared}
              required={!form.motherNameUndeclared}
              maxLength={160}
            />
            <span className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={form.motherNameUndeclared}
                onChange={(e) => setForm({ ...form, motherNameUndeclared: e.target.checked, motherName: "" })}
              />
              Não declarado
            </span>
          </label>
          <label className="block">
            <span className={label}>Sexo</span>
            <select className={inputClass} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="">Não informado</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </label>
          <label className="block">
            <span className={label}>Celular</span>
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="block">
            <span className={label}>E-mail</span>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="block">
            <span className={label}>Senha temporária</span>
            <input
              className={inputClass}
              type="password"
              value={form.temporaryPassword}
              onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Endereço</h3>
        <AddressFields value={address} onChange={setAddress} />
      </section>
      <label className="block">
        <span className={label}>Medicações de uso contínuo (opcional)</span>
        <textarea
          className={`${inputClass} h-20 resize-none py-2.5`}
          placeholder="Ex.: Losartana 50mg (1x ao dia)"
          value={form.continuousMedications}
          onChange={(e) => setForm({ ...form, continuousMedications: e.target.value })}
          maxLength={2000}
        />
      </label>
      <p className="text-xs leading-5 text-slate-500">
        Endereço e nome da mãe identificam o paciente sem ambiguidade e saem no receituário de controle especial. Só a equipe
        da clínica e o médico que atende veem estes dados (LGPD). Com e-mail, a pessoa recebe acesso à própria conta.
      </p>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" className="h-11 px-4 text-sm font-bold text-slate-500 hover:text-ink" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <Button type="submit" isLoading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
