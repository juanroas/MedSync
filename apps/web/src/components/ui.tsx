import { LoaderCircle } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "error";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-teal-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function Button({
  children,
  className,
  isLoading = false,
  variant = "primary",
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      className={cn(
        buttonVariants[variant],
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={props.disabled || isLoading}
      {...props}
    >
      {isLoading && <LoaderCircle className="animate-spin" size={17} />}
      {children}
    </button>
  );
}

const buttonVariants = {
  primary: "bg-teal-700 text-white shadow-sm shadow-teal-900/10 hover:bg-teal-800 focus:ring-teal-100",
  secondary:
    "border border-slate-200 bg-white text-ink shadow-sm hover:border-teal-200 hover:bg-teal-50/40 focus:ring-teal-100",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-100",
  ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-100",
};

export function TextInput({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function SelectInput({ className, ...props }: ComponentPropsWithoutRef<"select">) {
  return <select className={cn(inputClass, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  as,
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const Component = as ?? "section";

  return (
    <Component className={cn("rounded-lg border border-slate-200/80 bg-white shadow-sm", className)}>
      {children}
    </Component>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card as="article" className="p-5 transition hover:border-teal-100 hover:shadow-brand">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
        </div>
        {icon && (
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg", toneSurface[tone])}>
            {icon}
          </span>
        )}
      </div>
      {detail && <p className="mt-4 text-xs text-slate-400">{detail}</p>}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
        badgeTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AlertBanner({
  title,
  message,
  tone = "info",
}: {
  title?: string;
  message: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("mb-5 rounded-lg border px-4 py-3 text-sm", alertTone[tone])}>
      {title && <p className="mb-1 font-bold">{title}</p>}
      <p>{message}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <AlertBanner tone="error" message={message} />;
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
      <LoaderCircle className="animate-spin text-teal-600" size={20} />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200", className)} />;
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
    <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-lg bg-teal-50 text-teal-600">
        {icon}
      </span>
      <h3 className="font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
      <div>
        <h2 className="font-bold text-ink">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const toneSurface: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-sky-50 text-sky-700",
  success: "bg-teal-50 text-teal-600",
  warning: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
};

const badgeTone: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-sky-50 text-sky-700",
  success: "bg-teal-50 text-teal-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

const alertTone: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-sky-100 bg-sky-50 text-sky-700",
  success: "border-teal-100 bg-teal-50 text-teal-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  error: "border-red-100 bg-red-50 text-red-700",
};

export const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 text-sm font-bold text-white shadow-sm shadow-teal-900/10 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60";
