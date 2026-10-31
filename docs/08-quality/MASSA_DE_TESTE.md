# Massa de teste — manhã de testes (9h às 11h)

Para testar, use a versão passo a passo: [Roteiro de Testes MedSync](https://claude.ai/artifact/A45TE2ZXLYRNyccL8iSfcD).

Criada pelo seed (`apps/api/src/MedSync.Api/DatabaseSeeder.Scenarios.cs`) em 28/10/2026. Uso exclusivo em local e
homologação, com dados fictícios. A mesma lista está em [`massa-de-teste-perfis.csv`](massa-de-teste-perfis.csv) para
abrir em planilha.

**Senha de todas as contas:** o valor de `SEED_DEMO_PASSWORD` do ambiente. A cada start a API alinha a senha das contas
demo a esse valor (inclusive depois de trocar a variável), sem pedir troca no primeiro acesso.

## Como a massa chega ao ambiente

- **Local** (`ASPNETCORE_ENVIRONMENT=Development`): roda sozinha quando a API sobe.
- **Homologação**: roda no start da API com `ASPNETCORE_ENVIRONMENT=Homologation` (ou o modo apresentação descrito em
  [`DEMO_ACCOUNTS.md`](DEMO_ACCOUNTS.md)); depois do deploy, também por `POST /ops/presentation-seed`.
- **Dia do teste**: é sempre a próxima manhã. Se o seed roda até as 11h, a manhã de testes é no mesmo dia; depois das
  11h, no dia seguinte. Rodando em 31/10 até as 11h, cai em **31/10/2026 (sábado)**. O histórico fica na véspera.
- **Criado uma vez só**: tudo tem Id fixo. O que você mudar durante o teste (concluir, cancelar, assinar) não volta no
  próximo start. Se o horário já estiver ocupado por outra consulta do médico, aquela linha da massa não é criada.
- **Assinatura**: para assinar na tela, a API precisa de `SIGNATURE_PROVIDER=simulator`. Os documentos que a massa já
  traz assinados saem com a marca "SIMULAÇÃO — SEM VALIDADE".

## Perfis

| Perfil | E-mail | Local | O que validar |
|---|---|---|---|
| Médico ADM MedSync | `admin@medsync.dev` | MedSync | Clínicas: ativar a **Clínica Gama** (em análise); acesso ao prontuário com justificativa |
| Suporte | `suporte@medsync.dev` | MedSync | Ajuda: 2 pedidos (novo e em andamento); Financeiro: mensalidades em todas as situações |
| DPO | `dpo@medsync.dev` | MedSync | Privacidade: pedido de acesso novo (Carlos) e correção resolvida (Carla) |
| ADM da clínica | `clinica.admin@medsync.dev` | Clínica Demo | Painel, consultas, Financeiro (fatura do mês em aberto e mês passado pago) |
| Recepção | `recepcao@medsync.dev` | Clínica Demo | Agenda da manhã de testes, encaixe às 10h30, "Declaração de comparecimento" só nas assinadas |
| Médico | `medico@medsync.dev` | Clínica Demo | Dra. Marina: atendimentos da manhã, laudos, declaração, assinatura |
| Médico em dois locais | `medico.doislocais@medsync.dev` | Clínica Demo + Consultório | "Local de atendimento" no topo; cada local mostra só as próprias consultas |
| Paciente | `paciente@medsync.dev` | Clínica Demo | Carlos: termo de telemedicina às 9h; "Documentos (3)" no histórico |
| Paciente | `paciente2@medsync.dev` | Clínica Demo | Carla: presencial às 9h com o Dr. Bruno; **nunca** consultou com a Dra. Marina (não aparece em Pacientes vinculados dela) |
| Paciente | `paciente3@medsync.dev` | Clínica Demo | Roberto: online às 10h com termo aceito; cancelada e "Não compareceu" no histórico |
| Paciente | `paciente.demo@medsync.dev` | Clínica Demo | Daniel: presencial às 9h30; consulta concluída só com rascunhos — **não pode ver nada** até a médica assinar |
| Paciente | `paciente.demo2@medsync.dev` | Clínica Demo | Mariana: online às 9h30 com o Dr. Bruno; presencial concluída sem documentos |
| Médico + ADM (consultório) | `consultorio@medsync.dev` | Consultório Dra. Helena Souza | Agenda e documentos da própria médica; Financeiro com "Já paguei" aguardando confirmação |
| Recepção do consultório | `recepcao.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Agenda da manhã; declaração assinada do Lucas |
| Paciente | `paciente.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Lucas: presencial às 9h (Helena) e 10h30 (Bruno); "Documentos (2)" no histórico |
| Paciente | `paciente2.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Beatriz: online às 10h com termo aceito |
| ADM da clínica | `clinica2.admin@medsync.dev` | Clínica Alfa | Fatura do mês passado **em atraso** |
| Médico | `medico.empresa2@medsync.dev` | Clínica Alfa | Dr. Rafael: online às 9h |
| Paciente | `paciente.empresa2@medsync.dev` | Clínica Alfa | Patricia: termo e sala às 9h |
| ADM da clínica | `clinica3.admin@medsync.dev` | Clínica Beta | Clínica no Rio de Janeiro |
| Médico | `medico.empresa3@medsync.dev` | Clínica Beta | Dra. Renata: presencial às 10h |
| Paciente | `paciente.empresa3@medsync.dev` | Clínica Beta | João: presencial às 10h |
| ADM da clínica em análise | `clinica.analise@medsync.dev` | Clínica Gama | Painel "Cadastro recebido", sem endereço (cadastro antigo) |

## Manhã de testes (horário de Brasília, consultas de 30 min)

| Hora | Local | Médico | Paciente | Modalidade | Estado inicial |
|---|---|---|---|---|---|
| 09:00 | Clínica Demo | Dra. Marina Costa | Carlos Oliveira | Online | termo de telemedicina **pendente** |
| 09:30 | Clínica Demo | Dra. Marina Costa | Daniel Demo | Presencial | agendada |
| 10:00 | Clínica Demo | Dra. Marina Costa | Roberto MedSync | Online | termo aceito |
| 10:30 | Clínica Demo | Dra. Marina Costa | — | — | **livre** para agendar pela tela |
| 09:00 | Clínica Demo | Dr. Bruno Dois Locais | Carla MedSync | Presencial | agendada |
| 09:30 | Clínica Demo | Dr. Bruno Dois Locais | Mariana Demo | Online | agendada |
| 09:00 | Consultório Helena | Dra. Helena Souza | Lucas Consultório | Presencial | agendada |
| 10:00 | Consultório Helena | Dra. Helena Souza | Beatriz Consultório | Online | termo aceito |
| 09:30 e 10:30 | Consultório Helena | Dra. Helena Souza | — | — | **livres** |
| 10:30 | Consultório Helena | Dr. Bruno Dois Locais | Lucas Consultório | Presencial | agendada |
| 09:00 | Clínica Alfa | Dr. Rafael Lima | Patricia Alfa | Online | termo pendente |
| 10:00 | Clínica Beta | Dra. Renata Souza | Joao Beta | Presencial | agendada |

Dra. Marina, Dra. Helena e o Dr. Bruno têm horário de atendimento das 9h às 11h no dia da semana do teste, para o
paciente e a recepção marcarem os horários livres. O Dr. Rafael (Alfa) e a Dra. Renata (Beta) ficam **sem horário de
atendimento** de propósito: só a consulta da massa, e o paciente deles não consegue marcar outra (os testes E2E contam
com isso).

## Histórico (véspera)

| Hora | Médico | Paciente | Situação | Documentos |
|---|---|---|---|---|
| 09:00 | Dra. Marina | Carlos (online) | Concluída | receita, laudo e declaração **assinados** → paciente vê "Documentos (3)" |
| 09:30 | Dra. Marina | Roberto (presencial) | Cancelada | — |
| 10:00 | Dra. Marina | Mariana (presencial) | Concluída | **nenhum**: a médica vê "Consulta concluída — emita a declaração" |
| 11:00 | Dra. Marina | Daniel (online) | Concluída | receita, relatório e declaração em **rascunho**: o paciente não vê nada |
| 11:30 | Dra. Marina | Roberto (online) | Não compareceu | — |
| 10:00 | Dra. Helena | Lucas (presencial) | Concluída | orientações e declaração **assinadas** → recepção do consultório baixa a declaração |

## Filas da equipe MedSync

- **Suporte**: "Dúvida sobre a mensalidade de outubro" (novo, Clínica Demo) e "Corrigir a especialidade no cadastro"
  (em andamento, consultório).
- **LGPD**: pedido de acesso aos dados do Carlos (novo) e correção de telefone da Carla (resolvido).
- **Financeiro**: Clínica Demo com o mês em aberto e o mês passado pago; Clínica Alfa com o mês passado em atraso;
  consultório com "Já paguei" aguardando confirmação.

## Roteiro sugerido

1. **Médico** (`medico@`): Agenda → consulta concluída das 10h (Mariana) → Prontuário → "Laudos e declarações":
   "Declaração de comparecimento" (confira entrada e saída) e "Novo laudo" → "Ver e assinar" → assinar no simulador →
   o segundo documento assina com um clique.
2. **Paciente** (`paciente.demo2@`): Minhas consultas → Histórico → "Documentos (2)" → baixar os PDFs.
3. **Paciente** (`paciente.demo@`): Histórico → a consulta das 11h **não** tem "Documentos". Depois que a médica
   assinar os rascunhos dela, o botão aparece.
4. **Recepção** (`recepcao@`): Histórico → "Declaração de comparecimento" só nas consultas com a declaração assinada;
   Ativas → a manhã de testes; "Agendar consulta" no horário livre das 10h30.
5. **Atendimento online às 9h**: paciente `paciente@` aceita o termo e entra na sala; a médica inicia, encerra com
   "Consulta realizada — concluir" e cai direto em "Laudos e declarações" para assinar a declaração.
6. **Presencial às 9h30** (Daniel): a médica conclui pela Agenda e cai no prontuário, na mesma seção.
7. **Equipe MedSync**: Médico ADM ativa a Clínica Gama; Suporte confirma o "Já paguei" do consultório; DPO responde o
   pedido do Carlos.
8. **Dois locais** (`medico.doislocais@`): troque o "Local de atendimento" e confira que cada local mostra só as
   próprias consultas (Demo: Carla e Mariana; consultório: Lucas).
