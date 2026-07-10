import { Activity } from "lucide-react";
import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span
        className={`relative grid size-10 place-items-center rounded-xl ${
          inverse ? "bg-white text-teal-800" : "bg-teal-700 text-white"
        }`}
      >
        <Activity size={21} strokeWidth={2.4} />
        <span
          className={`absolute -right-0.5 -top-0.5 size-3 rounded-full ${
            inverse ? "bg-coral-500" : "bg-coral-400"
          }`}
        />
      </span>
      <span className={`text-xl font-bold tracking-tight ${inverse ? "text-white" : "text-ink"}`}>
        Med<span className={inverse ? "text-teal-200" : "text-teal-700"}>Sync</span>
      </span>
    </Link>
  );
}
