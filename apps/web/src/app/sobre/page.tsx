import { PublicFooter, PublicHeader } from "@/components/public-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que é o MedSync, para quem ele foi feito e como separamos cuidado, gestão e privacidade.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-h3 font-bold uppercase tracking-tight text-ink">{title}</h2>
      <div className="mt-3 max-w-[70ch] space-y-3 text-caption leading-6 text-slate-600 [&_li]:my-1 [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <PublicHeader current="sobre" />

      <div className="mx-auto grid max-w-4xl gap-4 px-5 py-10 sm:px-8 sm:py-14">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          <p className="text-micro font-semibold uppercase tracking-[0.08em] text-teal-700">Sobre o MedSync</p>
          <h1 className="mt-2 text-h1 font-bold uppercase tracking-tight">Telemedicina que separa cuidado, gestão e privacidade</h1>
          <p className="mt-3 max-w-[70ch] text-caption leading-6 text-slate-500">
            Um resumo direto do que a plataforma faz hoje, para quem ela foi feita e como tratamos os dados.
          </p>
        </section>

        <Section title="Para quem é">
          <p>
            Para o médico que atende no próprio consultório e para a clínica com vários profissionais — quem quer
            atender por vídeo com agenda, sala segura e prontuário no mesmo lugar.
          </p>
        </Section>

        <Section title="Como começa">
          <ul>
            <li><strong>Crie a conta</strong> pela tela de entrada, em &quot;Criar conta&quot;.</li>
            <li><strong>Entre na hora:</strong> o painel já fica disponível para configurar a agenda e a equipe.</li>
            <li><strong>Conferência do cadastro:</strong> a equipe MedSync confere os dados em paralelo e libera os atendimentos.</li>
            <li><strong>Precisa de ajuda?</strong> Dentro da plataforma, o menu Ajuda abre uma solicitação direto para o suporte.</li>
          </ul>
        </Section>

        <Section title="Quem vê o quê">
          <ul>
            <li><strong>Paciente:</strong> as próprias consultas, os termos e a sala de atendimento.</li>
            <li><strong>Médico:</strong> a própria agenda, os pacientes das suas consultas e o prontuário desses atendimentos.</li>
            <li><strong>Clínica:</strong> a agenda da equipe e o cadastro dos pacientes — nunca o conteúdo clínico.</li>
            <li><strong>Equipe MedSync:</strong> suporte e ativação de contas, com cada acesso registrado.</li>
          </ul>
        </Section>

        <Section title="Privacidade">
          <p>
            Separamos essas camadas desde o desenho do produto: cada perfil vê apenas o que lhe cabe, os acessos a dados
            sensíveis ficam registrados em uma trilha de auditoria e os pedidos formais do titular (LGPD) têm um canal
            próprio, a tela de Privacidade.
          </p>
        </Section>
      </div>

      <PublicFooter current="sobre" />
    </main>
  );
}
