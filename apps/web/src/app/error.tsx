"use client";

import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Erro nao tratado na interface MedSync:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-8 w-fit">
          <Logo />
        </div>
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle size={26} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-red-600">Algo deu errado</p>
        <h1 className="mt-3 text-2xl font-bold text-ink">Não foi possível carregar esta tela.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          O erro já foi registrado. Tente novamente ou volte mais tarde. Se o problema continuar,
          avise o suporte MedSync.
        </p>
        <button type="button" className={`${buttonClass} mt-8 inline-flex`} onClick={() => reset()}>
          <RotateCcw size={16} /> Tentar novamente
        </button>
      </div>
    </main>
  );
}
