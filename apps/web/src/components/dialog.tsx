"use client";

import { Button, cn, secondaryButtonClass } from "@/components/ui";
import { X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

// MedSync dialog, used instead of the browser's confirm(): same look as the product, keyboard accessible
// (Esc closes, focus moves into the dialog and back).
export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 text-ink shadow-soft"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50">
            <X size={17} />
          </button>
        </div>
        {description && <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

type ConfirmOptions = { title: string; description?: ReactNode; confirmLabel: string; danger?: boolean };

// const [confirm, confirmDialog] = useConfirm();  …  if (!(await confirm({...}))) return;  …  render {confirmDialog}
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })),
    [],
  );
  const close = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
    },
    [state],
  );

  const dialog = (
    <Dialog open={state !== null} title={state?.title ?? ""} description={state?.description} onClose={() => close(false)}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={secondaryButtonClass} onClick={() => close(false)}>
          Voltar
        </button>
        <Button
          type="button"
          onClick={() => close(true)}
          className={cn(state?.danger && "bg-red-600 hover:bg-red-700 focus:ring-red-100")}
        >
          {state?.confirmLabel}
        </Button>
      </div>
    </Dialog>
  );

  return [confirm, dialog];
}
