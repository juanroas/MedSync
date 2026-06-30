import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
      <LoaderCircle className="animate-spin text-teal-600" size={20} />
      {label}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
        {icon}
      </span>
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100";

export const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60";

