"use client";

import { inputClass } from "@/components/ui";
import { BRAZILIAN_STATES } from "@/lib/types";
import type { Address, AddressResponse } from "@/lib/types";
import { digitsOnly } from "@/lib/validation";
import { api } from "@/services/api";
import { useRef, useState } from "react";

// Endereço brasileiro com busca de CEP (feita pela API MedSync, sem expor quem digita).
// Se a busca falhar, os campos continuam editáveis.

export const emptyAddress: Address = {
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};

export function addressFromResponse(address?: AddressResponse | null): Address {
  return {
    zipCode: address?.zipCode ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    district: address?.district ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
  };
}

export function isAddressComplete(address: Address) {
  return (
    digitsOnly(address.zipCode).length === 8 &&
    Boolean(address.street.trim() && address.number.trim() && address.district.trim() && address.city.trim() && address.state)
  );
}

function maskZip(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function AddressFields({
  value,
  onChange,
  required = true,
}: {
  value: Address;
  onChange: (address: Address) => void;
  required?: boolean;
}) {
  const [lookup, setLookup] = useState<"idle" | "loading" | "notFound">("idle");
  // The lookup resolves later: merge into what is on screen then, not into the value from when it started.
  const latest = useRef(value);
  latest.current = value;
  // What the previous lookup filled: a new CEP replaces those, never what the person typed.
  const lastFill = useRef<Partial<Address>>({});

  async function changeZip(raw: string) {
    const zipCode = maskZip(raw);
    onChange({ ...value, zipCode });
    const digits = digitsOnly(zipCode);
    if (digits.length !== 8) return;
    setLookup("loading");
    try {
      const found = await api.lookupZipCode(digits);
      setLookup("idle");
      const current = latest.current;
      if (digitsOnly(current.zipCode) !== digits) return;
      const pick = (key: "street" | "district" | "city" | "state") => {
        const typed = current[key] ?? "";
        const replaceable = !typed.trim() || typed === lastFill.current[key];
        return replaceable && found[key] ? found[key]! : typed;
      };
      const next = { ...current, street: pick("street"), district: pick("district"), city: pick("city"), state: pick("state") };
      lastFill.current = { street: next.street, district: next.district, city: next.city, state: next.state };
      onChange(next);
    } catch {
      setLookup("notFound");
    }
  }

  const field = (key: keyof Address, label: string, className: string, extra?: { maxLength?: number; optional?: boolean }) => (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-600">{label}</span>
      <input
        className={inputClass}
        aria-label={label}
        value={value[key] ?? ""}
        maxLength={extra?.maxLength}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        required={required && !extra?.optional}
      />
    </label>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <label className="block sm:col-span-2">
        <span className="mb-2 block text-xs font-bold text-slate-600">CEP</span>
        <input
          className={inputClass}
          aria-label="CEP"
          inputMode="numeric"
          value={value.zipCode}
          onChange={(event) => void changeZip(event.target.value)}
          placeholder="00000-000"
          required={required}
        />
        <span className="mt-1 block text-[11px] text-slate-400">
          {lookup === "loading" ? "Buscando endereço..." : lookup === "notFound" ? "CEP não encontrado: preencha à mão." : "Preenche rua, bairro e cidade."}
        </span>
      </label>
      {field("street", "Logradouro", "sm:col-span-4", { maxLength: 160 })}
      {field("number", "Número", "sm:col-span-1", { maxLength: 20 })}
      {field("complement", "Complemento", "sm:col-span-2", { maxLength: 80, optional: true })}
      {field("district", "Bairro", "sm:col-span-3", { maxLength: 80 })}
      {field("city", "Cidade", "sm:col-span-4", { maxLength: 80 })}
      <label className="block sm:col-span-2">
        <span className="mb-2 block text-xs font-bold text-slate-600">UF</span>
        <select
          className={inputClass}
          aria-label="UF"
          value={value.state}
          onChange={(event) => onChange({ ...value, state: event.target.value })}
          required={required}
        >
          <option value="">Escolha</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
