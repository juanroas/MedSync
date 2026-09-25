"use client";

import { Logo } from "@/components/logo";
import { AlertBanner, Button, secondaryButtonClass } from "@/components/ui";
import { FlaskConical, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

// Stand-in for the certificate app (VIDaaS) until the Valid integration exists.
// Everything signed from here is watermarked "SIMULAÇÃO — SEM VALIDADE" (rule D4).
const API_URL = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api";

export default function SignatureSimulatorPage() {
  return (
    <Suspense>
      <SignatureSimulator />
    </Suspense>
  );
}

function SignatureSimulator() {
  const params = useSearchParams();
  const state = params.get("state") ?? "";
  const hours = Number(params.get("horas") ?? "8");
  const [sending, setSending] = useState(false);

  function answer(approve: boolean) {
    setSending(true);
    const query = new URLSearchParams({ state });
    if (approve) query.set("credentialId", `sim-${crypto.randomUUID()}`);
    else query.set("error", "recusada");
    window.location.href = `${API_URL}/signature/callback?${query.toString()}`;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <section className="rounded-lg border-2 border-dashed border-amber-400 bg-white p-7 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <FlaskConical size={22} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700">Simulador</p>
              <h1 className="text-xl font-bold text-ink">App do certificado digital</h1>
            </div>
          </div>

          <AlertBanner
            tone="warning"
            title="Isto não é o VIDaaS"
            message="Esta tela simula a aprovação que o médico fará no app do certificado em nuvem. Receitas assinadas por aqui saem com a marca “SIMULAÇÃO — SEM VALIDADE” e não servem em farmácia. A versão real entra quando a integração com a Valid estiver pronta."
          />

          <p className="text-sm leading-6 text-slate-600">
            No app real você confirmaria com PIN ou biometria. Aqui, aprovar libera a assinatura por{" "}
            <strong>{hours} {hours === 1 ? "hora" : "horas"}</strong>: nesse período cada receita é assinada com um clique.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryButtonClass} onClick={() => answer(false)} disabled={sending || !state}>
              Recusar
            </button>
            <Button type="button" onClick={() => answer(true)} isLoading={sending} disabled={!state}>
              <ShieldAlert size={17} /> Aprovar (simulação)
            </Button>
          </div>
          {!state && <p className="mt-4 text-sm text-red-600">Link de autorização inválido.</p>}
        </section>
      </div>
    </main>
  );
}
