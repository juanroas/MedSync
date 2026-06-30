import { Activity } from "lucide-react";
import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span
        className={`grid size-10 place-items-center rounded-2xl ${
          inverse ? "bg-white text-teal-700" : "bg-teal-600 text-white"
        }`}
      >
        <Activity size={21} strokeWidth={2.4} />
      </span>
      <span className={`text-xl font-bold tracking-tight ${inverse ? "text-white" : "text-ink"}`}>
        Med<span className={inverse ? "text-teal-200" : "text-teal-600"}>Sync</span>
      </span>
    </Link>
  );
}

