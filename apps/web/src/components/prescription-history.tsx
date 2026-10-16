"use client";

import { cn } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { PatientPrescriptionHistory, PrescriptionKind } from "@/lib/types";
import { api } from "@/services/api";
import { Pill } from "lucide-react";
import { useEffect, useState } from "react";

const KIND_LABELS: Record<PrescriptionKind, string> = {
  Simple: "Simples",
  Antimicrobial: "Antimicrobiano",
  ControlledSpecial: "Controle especial",
};

// The patient's earlier prescriptions (signed or issued outside the MedSync signature), for the doctor who attends
// this patient. The API refuses anyone else and records each read in the audit trail.
export function PrescriptionHistory({
  patientId,
  currentAppointmentId,
  variant = "light",
}: {
  patientId: string;
  currentAppointmentId: string;
  variant?: "light" | "dark";
}) {
  const [items, setItems] = useState<PatientPrescriptionHistory[] | null>(null);
  const [error, setError] = useState("");
  const dark = variant === "dark";

  useEffect(() => {
    let active = true;
    api
      .getPatientPrescriptions(patientId)
      .then((data) => {
        if (active) setItems(data.filter((item) => item.appointmentId !== currentAppointmentId));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Não foi possível carregar as receitas.");
      });
    return () => {
      active = false;
    };
  }, [patientId, currentAppointmentId]);

  return (
    <section aria-label="Receitas anteriores" className={dark ? "rounded-2xl border border-white/10 bg-white/5 p-4" : undefined}>
      <div className={cn("flex items-center gap-2", !dark && "border-b border-slate-100 px-6 py-5")}>
        <Pill size={18} className={dark ? "text-amber-200" : "text-teal-700"} />
        <div>
          <h2 className={cn("font-bold", dark ? "text-sm text-white" : "text-ink")}>Receitas anteriores</h2>
          <p className={cn("mt-1 text-xs", dark ? "text-white/45" : "text-slate-400")}>
            Emitidas para este paciente nesta clínica, da mais recente para a mais antiga.
          </p>
        </div>
      </div>
      <div className={dark ? "mt-3" : undefined}>
        {error ? (
          <p className={cn("text-xs", dark ? "text-red-100" : "px-6 py-5 text-red-600")}>{error}</p>
        ) : items === null ? (
          <p className={cn("text-sm", dark ? "text-white/60" : "px-6 py-8 text-center text-slate-500")}>Carregando receitas...</p>
        ) : items.length === 0 ? (
          <p className={cn("text-sm", dark ? "text-white/60" : "px-6 py-8 text-center text-slate-500")}>
            Nenhuma receita anterior para este paciente.
          </p>
        ) : (
          <ul className={cn("overflow-y-auto", dark ? "max-h-[360px] space-y-3 pr-1" : "max-h-[520px] divide-y divide-slate-100")}>
            {items.map((item) => (
              <li key={item.id} className={dark ? "rounded-xl border border-white/10 bg-white/5 p-3" : "px-6 py-4"}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("text-sm font-bold", dark ? "text-white" : "text-ink")}>{formatDateTime(item.issuedAt)}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      dark ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {KIND_LABELS[item.kind]} ·{" "}
                    {item.status === "Signed" ? (item.simulated ? "assinada (simulação)" : "assinada") : "fora da assinatura do MedSync"}
                  </span>
                </div>
                <p className={cn("mt-1 text-xs", dark ? "text-white/45" : "text-slate-400")}>{item.doctorName}</p>
                <ul className="mt-2 space-y-1">
                  {item.items.map((line, index) => (
                    <li key={index} className={cn("text-xs leading-5", dark ? "text-white/75" : "text-slate-600")}>
                      <b>
                        {line.medicationName}
                        {line.dosage ? ` ${line.dosage}` : ""}
                      </b>
                      {line.quantity ? ` — ${line.quantity}` : ""} · {line.instructions}
                      {line.continuousUse ? " (uso contínuo)" : ""}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
