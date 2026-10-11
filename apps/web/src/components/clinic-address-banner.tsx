"use client";

import type { ClinicSummary } from "@/lib/types";
import { api } from "@/services/api";
import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Without the clinic address, in-person hours stay hidden from patients and special prescriptions cannot be signed.
// The clinic admin gets the link to fix it; the doctor is told who fixes it.
export function useClinicSummary() {
  const [clinic, setClinic] = useState<ClinicSummary | null>(null);
  useEffect(() => {
    api.getCurrentClinic().then(setClinic).catch(() => setClinic(null));
  }, []);
  return clinic;
}

export function ClinicAddressBanner({ audience, show = true }: { audience: "admin" | "doctor"; show?: boolean }) {
  const clinic = useClinicSummary();
  if (!clinic || clinic.hasAddress || !show) return null;
  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <MapPinOff size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-bold">A clínica ainda não cadastrou o endereço de atendimento.</p>
        {audience === "admin" ? (
          <p className="mt-1">
            Sem ele, os pacientes não conseguem marcar consulta presencial e receitas de antimicrobiano não podem ser assinadas.{" "}
            <Link href="/clinica" className="font-bold underline">
              Cadastrar endereço
            </Link>
          </p>
        ) : (
          <p className="mt-1">
            Seus horários presenciais não aparecem para os pacientes até o administrador da clínica preencher o endereço em
            Dados da clínica. Os horários online continuam valendo.
          </p>
        )}
      </div>
    </div>
  );
}
