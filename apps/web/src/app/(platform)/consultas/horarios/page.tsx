"use client";

import { DoctorScheduleEditor } from "@/components/doctor-schedule";
import { EmptyState } from "@/components/ui";
import { getSession } from "@/services/api";
import { CalendarClock } from "lucide-react";

// Só o médico edita os próprios horários; os outros perfis não têm entrada para esta tela.
export default function DoctorSchedulePage() {
  const roles = getSession()?.user.roles ?? [];
  if (!roles.includes("Doctor"))
    return (
      <EmptyState
        icon={<CalendarClock size={22} />}
        title="Tela do médico"
        description="Os horários de atendimento são definidos por cada médico."
      />
    );
  return <DoctorScheduleEditor />;
}
