import { PublicFooter, PublicHeader } from "@/components/public-header";
import { RotatingText } from "@/components/rotating-text";
import { ArrowRight, Building2, CalendarCheck2, HeartPulse, ShieldCheck, Stethoscope, UserPlus } from "lucide-react";
import Link from "next/link";

const headlineSubjects = ["Sua clínica", "Seu consultório"];

const steps = [
  { icon: UserPlus, title: "1. Crie a conta", body: "Cadastre seu consultório ou sua clínica em poucos minutos e já entre no painel." },
  { icon: CalendarCheck2, title: "2. Monte a agenda", body: "Defina os dias e horários em que cada médico atende." },
  { icon: Stethoscope, title: "3. Atenda por vídeo", body: "O paciente solicita a consulta e entra na sala pelo navegador, sem instalar nada." },
  { icon: ShieldCheck, title: "4. Proteja os dados", body: "Cada perfil vê só o que precisa, e todo acesso ao prontuário fica registrado." },
];

const pillars = [
  { icon: HeartPulse, title: "Paciente", body: "Solicita a consulta, acompanha o status e entra na sala sem instalar nada." },
  { icon: Stethoscope, title: "Médico", body: "Vê a própria agenda, define os horários de atendimento e registra o prontuário." },
  { icon: Building2, title: "Clínica", body: "Organiza a equipe, a agenda e o cadastro de pacientes, sem acesso ao conteúdo clínico." },
];

const faqs = [
  {
    q: "Serve para consultório ou só para clínica?",
    a: "Para os dois. O médico pode usar no próprio consultório, e a clínica pode reunir vários profissionais, cada um com a sua agenda.",
  },
  {
    q: "Preciso esperar aprovação para usar?",
    a: "Não. Você entra assim que cria a conta e já pode configurar a agenda e a equipe. A equipe MedSync confere o cadastro em paralelo para liberar os atendimentos.",
  },
  {
    q: "O paciente precisa instalar algum aplicativo?",
    a: "Não. A consulta acontece pelo navegador, com a sala criada no momento do atendimento e acesso temporário para cada participante.",
  },
  {
    q: "Como peço ajuda depois de entrar?",
    a: "Pelo menu Ajuda, dentro da plataforma. A solicitação vai para a fila do suporte MedSync e a resposta aparece na mesma tela.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <PublicHeader current="home" />

      <section
        className="relative overflow-hidden bg-cover bg-center text-white"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(8, 37, 34, .86) 0%, rgba(11, 65, 58, .78) 55%, rgba(8, 37, 34, .9) 100%), url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2200&q=85')",
        }}
      >
        <div className="mx-auto flex min-h-[78svh] max-w-4xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-micro font-semibold text-teal-50">
            <ShieldCheck size={14} /> Telemedicina para médicos e clínicas
          </span>
          <h1 className="mt-6 text-headline font-bold uppercase tracking-tight md:text-display">
            <span className="sr-only">Sua clínica ou seu consultório atendendo por vídeo, sem complicação.</span>
            <span aria-hidden="true">
              <RotatingText words={headlineSubjects} />
              <span className="sm:block">atendendo por vídeo,</span>{" "}
              <span className="sm:block">sem complicação.</span>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80">
            Agenda, sala de vídeo e prontuário em um só lugar, para o médico que atende no próprio consultório e para a
            clínica com vários profissionais.
          </p>
          <Link
            href="/login"
            className="mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-teal-500 px-7 text-label font-semibold text-white shadow-card transition hover:bg-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Começar agora <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-h2 font-bold uppercase tracking-tight">Como funciona</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <Icon className="text-teal-700" size={22} />
                <h3 className="mt-3 text-label font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-caption text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-h2 font-bold uppercase tracking-tight">Um acesso, três experiências</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-caption text-slate-500">
            Todo mundo entra pelo mesmo login, mas cada perfil vê apenas o que precisa.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-mist p-6">
                <span className="grid size-11 place-items-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon size={21} />
                </span>
                <h3 className="mt-4 text-h3 font-semibold">{title}</h3>
                <p className="mt-2 text-caption text-slate-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-center text-h2 font-bold uppercase tracking-tight">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((item, index) => (
              <details
                key={item.q}
                open={index === 0}
                className="group rounded-2xl border border-slate-200 bg-white shadow-card [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-label font-semibold text-ink">
                  {item.q}
                  <span className="text-teal-700 group-open:hidden">+</span>
                  <span className="hidden text-teal-700 group-open:inline">–</span>
                </summary>
                <p className="max-w-[70ch] px-5 pb-5 text-caption leading-6 text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter current="home" />
    </main>
  );
}
