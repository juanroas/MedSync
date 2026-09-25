"use client";

import { Dialog } from "@/components/dialog";
import { Button, cn, secondaryButtonClass } from "@/components/ui";
import { formatTime } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { api } from "@/services/api";
import { CheckCircle2, UserX } from "lucide-react";
import { useEffect, useState } from "react";

// Encerrar a consulta, de dentro da sala ou pela agenda. "Paciente não compareceu" só aparece quando o médico
// entrou na chamada e o paciente não (a API confere a mesma regra).
export function EndConsultationDialog({
  appointmentId,
  open,
  onClose,
  onEnded,
}: {
  appointmentId: string;
  open: boolean;
  onClose: () => void;
  onEnded: (outcome: "Completed" | "NoShow") => void;
}) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState<"Completed" | "NoShow" | null>(null);
  const [error, setError] = useState("");

  // Fresh data every time it opens: the patient may have joined since the page loaded.
  useEffect(() => {
    if (!open) return;
    setError("");
    api.getAppointment(appointmentId).then(setAppointment).catch(() => setAppointment(null));
  }, [appointmentId, open]);

  async function end(outcome: "Completed" | "NoShow") {
    setBusy(outcome);
    setError("");
    try {
      await api.endConsultation(appointmentId, outcome);
      onEnded(outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível encerrar. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  const canMarkNoShow = Boolean(appointment?.doctorJoined && !appointment?.patientJoined);

  return (
    <Dialog
      open={open}
      title="Encerrar consulta"
      description={
        appointment ? (
          <>
            {appointment.patientName} · {formatTime(appointment.scheduledAt)}. Quem estiver na chamada será desconectado.
          </>
        ) : (
          "Quem estiver na chamada será desconectado."
        )
      }
      onClose={onClose}
    >
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-2">
        <Button type="button" className="w-full justify-start" onClick={() => end("Completed")} isLoading={busy === "Completed"} disabled={busy !== null}>
          <CheckCircle2 size={17} /> Consulta realizada — concluir
        </Button>
        {canMarkNoShow && (
          <button
            type="button"
            onClick={() => end("NoShow")}
            disabled={busy !== null}
            className={cn(secondaryButtonClass, "w-full justify-start")}
          >
            <UserX size={17} /> {busy === "NoShow" ? "Registrando..." : "Paciente não compareceu"}
          </button>
        )}
        <button type="button" onClick={onClose} disabled={busy !== null} className="h-11 w-full text-sm font-bold text-slate-500 hover:text-ink">
          Continuar na consulta
        </button>
      </div>
      {!canMarkNoShow && appointment && !appointment.patientJoined && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          “Paciente não compareceu” fica disponível depois que você entra na sala e o paciente não entra.
        </p>
      )}
    </Dialog>
  );
}
