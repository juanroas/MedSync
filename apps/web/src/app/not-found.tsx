import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";
import { ArrowLeft, Compass } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-8 w-fit">
          <Logo />
        </div>
        <span className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <Compass size={26} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Erro 404</p>
        <h1 className="mt-3 text-2xl font-bold text-ink">Esta página não existe ou foi movida.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Verifique o endereço ou volte para um ponto conhecido da plataforma.
        </p>
        <Link href="/" className={`${buttonClass} mt-8 inline-flex`}>
          <ArrowLeft size={16} /> Voltar ao início
        </Link>
      </div>
    </main>
  );
}
