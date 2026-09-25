"use client";

import { useConfirm } from "@/components/dialog";
import { AlertBanner, Badge, Button, Card, SelectInput, TextInput, cn, secondaryButtonClass } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type {
  MedicationSearchItem,
  PatientMedications,
  Prescription,
  PrescriptionItemInput,
  PrescriptionKind,
} from "@/lib/types";
import { api } from "@/services/api";
import { Pill, Plus, Printer, RefreshCw, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

// Receita do atendimento (.agents/rules/medical-documents.md). Só o médico da consulta vê este painel.
// A assinatura ICP-Brasil (VIDaaS) ainda não existe: rascunho imprime com marca "sem validade" (D4).

const emptyItem: PrescriptionItemInput = {
  medicationName: "",
  dosage: "",
  instructions: "",
  quantity: "",
  continuousUse: false,
};

type Draft = {
  id?: string;
  kind: PrescriptionKind;
  patientLocation: string;
  notes: string;
  renewedFromId?: string | null;
  items: PrescriptionItemInput[];
};

const kindLabel: Record<PrescriptionKind, string> = {
  Simple: "Receita simples",
  Antimicrobial: "Antimicrobiano (2 vias, validade 10 dias)",
};

export function PrescriptionPanel({ appointmentId, patientId }: { appointmentId: string; patientId: string }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<PatientMedications | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, confirmDialog] = useConfirm();

  const load = useCallback(async () => {
    const [list, inUse] = await Promise.all([
      api.getAppointmentPrescriptions(appointmentId),
      api.getPatientMedications(patientId),
    ]);
    setPrescriptions(list);
    setMedications(inUse);
  }, [appointmentId, patientId]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar as receitas."));
  }, [load]);

  function startNew() {
    setMessage("");
    setDraft({ kind: "Simple", patientLocation: "", notes: "", items: [{ ...emptyItem }] });
  }

  function startRenewal() {
    if (!medications || medications.items.length === 0) return;
    setMessage("");
    setDraft({
      kind: "Simple",
      patientLocation: "",
      notes: "",
      renewedFromId: medications.items[0].prescriptionId,
      items: medications.items.map((item) => ({
        medicationName: item.medicationName,
        dosage: item.dosage ?? "",
        instructions: item.instructions,
        quantity: "",
        continuousUse: true,
      })),
    });
  }

  function edit(prescription: Prescription) {
    setMessage("");
    setDraft({
      id: prescription.id,
      kind: prescription.kind,
      patientLocation: prescription.patientLocation ?? "",
      notes: prescription.notes ?? "",
      renewedFromId: prescription.renewedFromId,
      items: prescription.items.map((item) => ({ ...item })),
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    const input = {
      kind: draft.kind,
      patientLocation: draft.patientLocation,
      notes: draft.notes,
      renewedFromId: draft.renewedFromId ?? null,
      items: draft.items.filter((item) => item.medicationName.trim()),
    };
    try {
      if (draft.id) await api.updatePrescription(draft.id, input);
      else await api.createPrescription(appointmentId, input);
      setDraft(null);
      setMessage("Rascunho salvo. Confira no documento antes de assinar.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a receita.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(prescription: Prescription) {
    if (!(await confirm({ title: "Excluir este rascunho?", description: prescription.items.map((item) => item.medicationName).join(", "), confirmLabel: "Excluir rascunho", danger: true }))) return;
    setError("");
    try {
      await api.deletePrescription(prescription.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o rascunho.");
    }
  }

  return (
    <Card className="scroll-mt-24 p-6">
      <span id="receita" />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
            <Pill size={20} />
          </div>
          <h2 className="text-xl font-bold text-ink">Receita</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Monte a receita com a base de medicamentos da Anvisa. Controlados (Portaria 344) não são emitidos aqui.
          </p>
        </div>
        {!draft && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {medications && medications.items.length > 0 && (
              <button type="button" className={secondaryButtonClass} onClick={startRenewal}>
                <RefreshCw size={16} /> Renovar uso contínuo
              </button>
            )}
            <button type="button" className={secondaryButtonClass} onClick={startNew}>
              <Plus size={16} /> Nova receita
            </button>
          </div>
        )}
      </div>

      {error && <AlertBanner tone="error" message={error} />}
      {message && <AlertBanner tone="success" message={message} />}
      {confirmDialog}

      {medications && (medications.items.length > 0 || medications.legacyNote) && !draft && (
        <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm font-bold text-amber-900">Medicações em uso contínuo</p>
          {medications.items.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
              {medications.items.map((item) => (
                <li key={item.medicationName}>
                  <span className="font-semibold">{item.medicationName}</span>
                  {item.dosage ? ` ${item.dosage}` : ""} — {item.instructions}
                  <span className="text-xs text-amber-700"> · {item.prescribedBy}, {formatDateTime(item.lastPrescribedAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {medications.legacyNote && (
            <p className="mt-2 text-xs leading-5 text-amber-800">Anotação do cadastro: {medications.legacyNote}</p>
          )}
        </div>
      )}

      {draft ? (
        <PrescriptionForm
          draft={draft}
          saving={saving}
          onChange={(update) => setDraft((current) => (current ? update(current) : current))}
          onCancel={() => setDraft(null)}
          onSubmit={save}
        />
      ) : prescriptions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Nenhuma receita neste atendimento.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {prescriptions.map((prescription) => (
            <li key={prescription.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={prescription.status === "Signed" ? "success" : "warning"}>
                    {prescription.status === "Signed"
                      ? prescription.signatureSimulated
                        ? "Assinada (simulação)"
                        : "Assinada"
                      : "Rascunho"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {kindLabel[prescription.kind]} · {formatDateTime(prescription.updatedAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {prescription.items.map((item) => item.medicationName).join(", ")}
                </p>
                {prescription.status === "Draft" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Assinatura digital ICP-Brasil (VIDaaS) ainda não ativa: o documento sai com a marca “sem validade”.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/receita/${prescription.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-teal-700 hover:border-teal-200 hover:bg-teal-50"
                >
                  <Printer size={14} /> Ver e imprimir
                </a>
                {prescription.status === "Draft" && (
                  <>
                    <button
                      type="button"
                      onClick={() => edit(prescription)}
                      className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(prescription)}
                      aria-label="Excluir rascunho"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PrescriptionForm({
  draft,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: Draft;
  saving: boolean;
  // Functional updates: the medication picker resolves asynchronously and must not overwrite newer edits.
  onChange: (update: (draft: Draft) => Draft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  function updateItem(index: number, patch: Partial<PrescriptionItemInput>) {
    onChange((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Tipo</span>
          <SelectInput
            value={draft.kind}
            onChange={(event) => onChange((current) => ({ ...current, kind: event.target.value as PrescriptionKind }))}
          >
            <option value="Simple">{kindLabel.Simple}</option>
            <option value="Antimicrobial">{kindLabel.Antimicrobial}</option>
          </SelectInput>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Onde o paciente está agora</span>
          <TextInput
            value={draft.patientLocation}
            onChange={(event) => onChange((current) => ({ ...current, patientLocation: event.target.value }))}
            placeholder="Cidade/UF informada na consulta"
            maxLength={200}
          />
        </label>
      </div>

      <div className="space-y-4">
        {draft.items.map((item, index) => (
          <fieldset key={index} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Item {index + 1}</legend>
              {draft.items.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remover item ${index + 1}`}
                  onClick={() => onChange((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <MedicationPicker
              value={item.medicationName}
              onPick={(picked) =>
                updateItem(index, { medicationName: picked.name, catalogItemId: picked.id })
              }
              onType={(value) => updateItem(index, { medicationName: value, catalogItemId: null })}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_1fr]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Dose</span>
                <TextInput
                  value={item.dosage ?? ""}
                  onChange={(event) => updateItem(index, { dosage: event.target.value })}
                  placeholder="50 mg"
                  maxLength={120}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Como usar</span>
                <TextInput
                  value={item.instructions}
                  onChange={(event) => updateItem(index, { instructions: event.target.value })}
                  placeholder="1 comprimido pela manhã"
                  maxLength={500}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Quantidade</span>
                <TextInput
                  value={item.quantity ?? ""}
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                  placeholder="30 comprimidos"
                  maxLength={120}
                />
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={item.continuousUse}
                onChange={(event) => updateItem(index, { continuousUse: event.target.checked })}
                className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-200"
              />
              Uso contínuo (entra em “Medicações em uso” e na renovação)
            </label>
          </fieldset>
        ))}
        {draft.items.length < 20 && (
          <button
            type="button"
            onClick={() => onChange((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }))}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-800"
          >
            <Plus size={15} /> Adicionar medicamento
          </button>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Orientações (opcional)</span>
        <TextInput
          value={draft.notes}
          onChange={(event) => onChange((current) => ({ ...current, notes: event.target.value }))}
          maxLength={1000}
          placeholder="Ex.: tomar após as refeições"
        />
      </label>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <Button type="submit" isLoading={saving}>
          Salvar rascunho
        </Button>
      </div>
    </form>
  );
}

// Busca na base local (Anvisa + itens da clínica). Se não existir, o médico inclui o item em um clique.
function MedicationPicker({
  value,
  onPick,
  onType,
}: {
  value: string;
  onPick: (item: MedicationSearchItem) => void;
  onType: (value: string) => void;
}) {
  const [results, setResults] = useState<MedicationSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searchError, setSearchError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function search(text: string) {
    onType(text);
    setSearchError("");
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      api
        .searchMedications(text)
        .then((items) => {
          setResults(items);
          setOpen(true);
        })
        .catch(() => setSearchError("Busca indisponível agora; você pode digitar o nome."));
    }, 250);
  }

  async function addCustom() {
    setAdding(true);
    try {
      const created = await api.createMedication({ name: value.trim() });
      onPick(created);
      setOpen(false);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Não foi possível incluir o medicamento.");
    } finally {
      setAdding(false);
    }
  }

  const exactMatch = results.some((item) => item.name.toLowerCase() === value.trim().toLowerCase());

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Medicamento</span>
        <TextInput
          value={value}
          onChange={(event) => search(event.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Digite o nome ou o princípio ativo"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          required
        />
      </label>
      {searchError && <p className="mt-1 text-xs text-amber-700">{searchError}</p>}
      {open && value.trim().length >= 2 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(item);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left hover:bg-teal-50"
              >
                <span className="block text-sm font-semibold text-ink">{item.name}</span>
                <span className="block text-xs text-slate-500">
                  {[item.activeIngredient, item.source === "Custom" ? "incluído pela clínica" : item.therapeuticClass]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
          {!exactMatch && (
            <li className={cn(results.length > 0 && "border-t border-slate-100")}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={addCustom}
                disabled={adding}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-teal-700 hover:bg-teal-50"
              >
                <Plus size={14} /> {adding ? "Incluindo..." : `Incluir “${value.trim()}” como novo medicamento`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
