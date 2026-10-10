"use client";

import { AddressFields, addressFromResponse, emptyAddress, isAddressComplete } from "@/components/address-fields";
import { AlertBanner, Button, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, inputClass } from "@/components/ui";
import { BRAZILIAN_STATES } from "@/lib/types";
import type { Address, ClinicProfile } from "@/lib/types";
import { isValidOptionalPhone } from "@/lib/validation";
import { api, getSession } from "@/services/api";
import { Building2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

// Dados da clínica (ADM Clínica): nome, telefone, endereço de atendimento e responsável técnico.
// Razão social e CNPJ são conferidos pela MedSync na ativação e ficam só para leitura.
export default function ClinicProfilePage() {
  const roles = getSession()?.user.roles ?? [];
  if (!roles.includes("ClinicAdmin"))
    return (
      <EmptyState
        icon={<Building2 size={22} />}
        title="Tela do administrador da clínica"
        description="Os dados da clínica são mantidos pelo administrador dela."
      />
    );
  return <ClinicProfileEditor />;
}

function ClinicProfileEditor() {
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    technicalDirectorName: "",
    technicalDirectorCrm: "",
    technicalDirectorCrmUf: "",
  });
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function fill(profile: ClinicProfile) {
    setClinic(profile);
    setForm({
      name: profile.name,
      phone: profile.phone ?? "",
      technicalDirectorName: profile.technicalDirectorName ?? "",
      technicalDirectorCrm: profile.technicalDirectorCrm ?? "",
      technicalDirectorCrmUf: profile.technicalDirectorCrmUf ?? "",
    });
    setAddress(addressFromResponse(profile.address));
  }

  useEffect(() => {
    api.getMyClinic().then(fill).catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar a clínica."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (form.name.trim().length < 3) return setError("Informe o nome da clínica.");
    if (!isValidOptionalPhone(form.phone)) return setError("Informe um telefone válido com DDD.");
    if (!isAddressComplete(address)) return setError("Preencha o endereço completo (CEP, logradouro, número, bairro, cidade e UF).");
    setSaving(true);
    try {
      fill(
        await api.updateMyClinic({
          name: form.name,
          phone: form.phone || undefined,
          address,
          technicalDirectorName: form.technicalDirectorName || undefined,
          technicalDirectorCrm: form.technicalDirectorCrm || undefined,
          technicalDirectorCrmUf: form.technicalDirectorCrmUf || undefined,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const label = "mb-2 block text-xs font-bold text-slate-600";

  return (
    <>
      <PageHeader
        eyebrow="Portal da clínica"
        title="Dados da clínica"
        description="O endereço aparece para o paciente que escolhe consulta presencial e sai nos documentos dos médicos daqui."
      />
      {error && <ErrorBanner message={error} />}
      {saved && <AlertBanner tone="success" message="Dados da clínica salvos." />}
      {!clinic ? (
        <LoadingState label="Carregando dados da clínica..." />
      ) : (
        <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Card className="space-y-6 p-6">
            <section>
              <h2 className="mb-3 text-sm font-bold text-ink">Clínica</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block md:col-span-2">
                  <span className={label}>Nome fantasia</span>
                  <input className={inputClass} value={form.name} maxLength={160} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label className="block">
                  <span className={label}>Telefone</span>
                  <input className={inputClass} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </label>
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold text-ink">Endereço de atendimento</h2>
              <AddressFields value={address} onChange={setAddress} />
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold text-ink">Responsável técnico</h2>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                <label className="block">
                  <span className={label}>Nome do médico</span>
                  <input
                    className={inputClass}
                    value={form.technicalDirectorName}
                    maxLength={160}
                    onChange={(e) => setForm({ ...form, technicalDirectorName: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={label}>CRM</span>
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.technicalDirectorCrm}
                    maxLength={10}
                    onChange={(e) => setForm({ ...form, technicalDirectorCrm: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={label}>UF do CRM</span>
                  <select className={inputClass} value={form.technicalDirectorCrmUf} onChange={(e) => setForm({ ...form, technicalDirectorCrmUf: e.target.value })}>
                    <option value="">—</option>
                    {BRAZILIAN_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving}>
                Salvar dados
              </Button>
            </div>
          </Card>
          <Card className="h-fit space-y-3 p-6 text-sm">
            <h2 className="font-bold text-ink">Conferido pela MedSync</h2>
            <p>
              <span className="block text-xs font-bold text-slate-500">Razão social</span>
              {clinic.legalName ?? "—"}
            </p>
            <p>
              <span className="block text-xs font-bold text-slate-500">CNPJ</span>
              {clinic.taxIdMasked ?? "—"}
            </p>
            <p className="text-xs leading-5 text-slate-500">Para corrigir razão social ou CNPJ, abra um pedido em Ajuda.</p>
          </Card>
        </form>
      )}
    </>
  );
}
