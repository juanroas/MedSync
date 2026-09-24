import { PublicFooter, PublicHeader } from "@/components/public-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre",
  description: "O que e a MedSync, como a plataforma funciona e como separamos cuidado, gestao e privacidade.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-h3 font-bold uppercase tracking-tight text-ink">{title}</h2>
      <div className="mt-3 max-w-[70ch] space-y-3 text-caption leading-6 text-slate-600 [&_li]:ml-5 [&_li]:list-disc [&_li]:my-1">
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
          <p className="text-micro font-semibold uppercase tracking-[0.08em] text-teal-700">Sobre a MedSync</p>
          <h1 className="mt-2 text-h1 font-bold uppercase tracking-tight">Telemedicina que separa cuidado, gestao e privacidade</h1>
          <p className="mt-3 max-w-[70ch] text-caption leading-6 text-slate-500">
            Um resumo direto do que a plataforma faz hoje, para quem ela foi feita e como tratamos os dados.
          </p>
        </section>

        <Section title="Para quem e">
          <p>
            Clinicas que querem atender pacientes por video com agenda, sala segura e prontuario no mesmo lugar —
            e, opcionalmente, empresas que patrocinam esse cuidado para os proprios times.
          </p>
        </Section>

        <Section title="Como comeca">
          <ul>
            <li><strong>Crie a conta</strong> da clinica pela tela de login, em &quot;Criar conta&quot;.</li>
            <li><strong>Entre na hora:</strong> o painel ja fica disponivel para configurar equipe e agenda.</li>
            <li><strong>Validacao do CNPJ:</strong> a equipe MedSync confirma os dados em paralelo e libera atendimentos reais.</li>
            <li><strong>Precisa de ajuda?</strong> Dentro da plataforma, o menu Ajuda abre uma solicitacao direto para o suporte.</li>
          </ul>
        </Section>

        <Section title="Quem ve o que">
          <ul>
            <li><strong>Paciente:</strong> as proprias consultas, termos e a sala de atendimento.</li>
            <li><strong>Medico:</strong> a propria agenda, os pacientes vinculados as suas consultas e o prontuario.</li>
            <li><strong>Empresa parceira:</strong> contrato, elegibilidade, faturas e uso agregado — nunca dado clinico individual.</li>
            <li><strong>Operacao MedSync:</strong> suporte, ativacao e auditoria, com cada acesso registrado.</li>
          </ul>
        </Section>

        <Section title="Privacidade">
          <p>
            Separamos essas camadas desde o desenho do produto: cada perfil enxerga apenas o seu escopo, acessos a dados
            sensiveis ficam em trilha de auditoria, e pedidos formais de titular (LGPD) tem um canal proprio, a tela de
            Privacidade.
          </p>
        </Section>
      </div>

      <PublicFooter current="sobre" />
    </main>
  );
}
