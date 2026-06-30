import { Logo } from "@/components/logo";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fbfa]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-bold text-slate-600 sm:block">
            Entrar
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white transition hover:bg-teal-800"
          >
            Acessar plataforma <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-24">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-700">
            <Sparkles size={14} /> Cuidado que aproxima
          </span>
          <h1 className="mt-7 max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-ink sm:text-6xl lg:text-7xl">
            Sua consulta, onde você estiver.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Uma experiência de telemedicina simples, segura e feita para que médicos e
            pacientes foquem no que realmente importa: o cuidado.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-7 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700"
            >
              Começar agora <ArrowRight size={17} />
            </Link>
            <a
              href="#recursos"
              className="inline-flex h-13 items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 transition hover:border-teal-200"
            >
              Conhecer recursos
            </a>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            {["Sem instalação", "Vídeo protegido", "Pronto em minutos"].map((label) => (
              <span key={label} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-teal-100 text-teal-700">
                  <Check size={12} strokeWidth={3} />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -right-16 -top-16 size-72 rounded-full bg-teal-200/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-12 size-72 rounded-full bg-orange-100 blur-3xl" />
          <div className="relative rounded-[2.25rem] bg-ink p-3 shadow-2xl shadow-teal-900/25">
            <div className="subtle-grid overflow-hidden rounded-[1.7rem] bg-[#20302d]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
                <div>
                  <p className="text-xs text-white/50">Consulta em andamento</p>
                  <p className="mt-0.5 text-sm font-semibold">Clínica geral</p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-teal-400/15 px-3 py-1.5 text-xs text-teal-200">
                  <span className="size-1.5 rounded-full bg-teal-300" /> Conectado
                </span>
              </div>
              <div className="grid aspect-[1.2] grid-cols-2 gap-3 p-3">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900">
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid size-20 place-items-center rounded-full bg-white/10 text-2xl font-bold text-white">
                      MC
                    </span>
                  </div>
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-white">
                    Dra. Marina
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800">
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="grid size-20 place-items-center rounded-full bg-white/10 text-2xl font-bold text-white">
                      CO
                    </span>
                  </div>
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/25 px-2.5 py-1.5 text-xs text-white">
                    Carlos
                  </span>
                </div>
              </div>
              <div className="flex justify-center gap-2 pb-5">
                <span className="grid size-11 place-items-center rounded-full bg-white/10 text-white">
                  <Video size={18} />
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-coral text-white">
                  <span className="h-0.5 w-5 bg-white" />
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-7 -left-7 hidden items-center gap-3 rounded-2xl bg-white p-4 shadow-soft sm:flex">
            <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-600">
              <CalendarCheck2 size={21} />
            </span>
            <div>
              <p className="text-xs text-slate-400">Próxima consulta</p>
              <p className="text-sm font-bold text-ink">Hoje, às 14:00</p>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-teal-600">
            Tudo em um só lugar
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Tecnologia que não fica no caminho da consulta
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              [Video, "Videochamada integrada", "Entre na sala pelo navegador, com controles simples de áudio e vídeo."],
              [CalendarCheck2, "Agenda organizada", "Crie consultas e acompanhe médicos, pacientes e horários em um só painel."],
              [ShieldCheck, "Acesso protegido", "Autenticação JWT e credenciais sensíveis mantidas somente no servidor."],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof Video;
              return (
                <article key={title as string} className="rounded-3xl border border-slate-100 bg-[#fbfdfc] p-7">
                  <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
                    <FeatureIcon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{description as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

