import { Logo } from "@/components/logo";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  Check,
  FileCheck2,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const productPillars = [
  {
    icon: HeartPulse,
    title: "Care",
    description: "Paciente encontra atendimento, acompanha consultas e acessa a sala com uma jornada simples.",
  },
  {
    icon: Stethoscope,
    title: "Medical",
    description: "Medicos independentes atendem por especialidade, com agenda e vinculo assistencial controlado.",
  },
  {
    icon: Building2,
    title: "Business",
    description: "Empresas acompanham contrato, elegibilidade, faturas e uso agregado sem acessar dados clinicos.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy",
    description: "Perfis, trilhas de auditoria e minimizacao ajudam a separar cuidado, operacao e governanca.",
  },
];

const demoProfiles = [
  "Admin MedSync",
  "Suporte",
  "Financeiro MedSync",
  "Empresa admin",
  "Financeiro empresa",
  "Paciente",
  "Medico",
  "Auditor",
];

const b2bFlow = [
  "Clinica se cadastra em poucos minutos e ja acessa o painel.",
  "Equipe MedSync ativa o CNPJ para liberar o uso completo.",
  "Clinica cadastra medicos, monta a agenda e atende pacientes.",
  "Se quiser, ativa o modulo de empresa parceira para patrocinar o beneficio do time, sem acesso a dado clinico.",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f8f6] text-ink">
      <section
        className="relative min-h-[88svh] overflow-hidden bg-cover bg-center text-white"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(8, 37, 34, .94) 0%, rgba(11, 65, 58, .82) 44%, rgba(11, 65, 58, .24) 100%), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2200&q=85')",
        }}
      >
        <div className="relative z-10 border-b border-white/70 bg-white/95 text-ink shadow-sm backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
            <Logo />
            <div className="flex items-center gap-3">
              <Link href="/login" className="hidden text-sm font-bold text-slate-600 hover:text-teal-700 sm:block">
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="hidden h-11 items-center gap-2 rounded-lg border border-teal-700 px-5 text-sm font-bold text-teal-800 transition hover:bg-teal-50 sm:inline-flex"
              >
                Cadastrar minha clinica
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-800 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700"
              >
                Entrar na demo <ArrowRight size={16} />
              </Link>
            </div>
          </nav>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-16 sm:px-8 lg:pt-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.08em] text-teal-50">
              <span className="size-2 rounded-full bg-coral" />
              Saude digital para clinicas
            </span>
            <h1 className="mt-7 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              MedSync: a operacao digital da sua clinica, do agendamento ao atendimento por video.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Uma plataforma para clinicas atenderem pacientes por telemedicina com agenda, prontuario e
              consultas por video em um so lugar. Empresas parceiras podem patrocinar o beneficio para seus
              times sem acessar dado clinico individual — sem transformar a clinica em RH.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-coral px-7 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#e46852]"
              >
                Cadastrar minha clinica <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-7 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Acessar ambiente demo
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
            {[
              ["Agenda e atendimento", "Medicos atendem por especialidade e disponibilidade propria"],
              ["Empresas parceiras", "Uso agregado por CNPJ, sem dado clinico individual"],
              ["Jornada assistencial", "Paciente solicita cuidado por especialidade"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/66">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="border-b border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Produto</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Cada perfil ve uma plataforma diferente.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              A experiencia foi pensada para separar acesso ao cuidado, operacao medica, gestao empresarial,
              financeiro e privacidade.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {productPillars.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-[#fbfdfc] p-6 shadow-sm">
                <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon size={21} />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Empresas parceiras</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A clinica atende. A empresa patrocinadora acompanha valor, sem ver o clinico.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Quando uma empresa patrocina o beneficio para seu time, o MedSync evita misturar painel
              empresarial com informacao clinica. Empresas veem elegibilidade, plano, faturas e indicadores
              agregados; dados assistenciais ficam nos fluxos autorizados da clinica.
            </p>
          </div>
          <div className="grid gap-3">
            {b2bFlow.map((item, index) => (
              <article key={item} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="self-center text-sm font-semibold text-slate-700">{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-20 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-200">Demo guiada</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Apresente a plataforma por perfil, nao por tela solta.
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/65">
                Para uma empresa teste, a narrativa fica clara quando cada usuario entra no seu escopo:
                MedSync opera, empresa governa, paciente recebe cuidado e auditor acompanha evidencias.
              </p>
              <Link
                href="/login"
                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-teal-500 px-7 text-sm font-bold text-white transition hover:bg-teal-400"
              >
                Entrar na demo <ArrowRight size={17} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {demoProfiles.map((profile) => (
                <div key={profile} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
                  <span className="grid size-9 place-items-center rounded-lg bg-white/10 text-coral-200">
                    <LockKeyhole size={17} />
                  </span>
                  <span className="text-sm font-bold">{profile}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 md:grid-cols-3">
          {[
            [UsersRound, "Elegibilidade", "Controle administrativo de quem pode usar o beneficio."],
            [BarChart3, "Relatorios", "Indicadores agregados por CNPJ, periodo e escopo autorizado."],
            [FileCheck2, "Auditoria", "Eventos e evidencias para acompanhar acessos e tentativas negadas."],
          ].map(([Icon, title, text]) => {
            const ItemIcon = Icon as typeof CalendarCheck2;
            return (
              <article key={title as string} className="rounded-lg border border-slate-200 bg-[#fbfdfc] p-5">
                <ItemIcon className="text-teal-700" size={22} />
                <h3 className="mt-4 font-bold">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
