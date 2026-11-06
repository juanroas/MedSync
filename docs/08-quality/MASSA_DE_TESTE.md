# Massa de teste — sessão de testes (19h às 22h)

Para testar, use a versão passo a passo: [Roteiro de Testes MedSync](https://claude.ai/artifact/A45TE2ZXLYRNyccL8iSfcD).

Criada pelo seed (`apps/api/src/MedSync.Api/DatabaseSeeder.Scenarios.cs`) em 28/10/2026. Uso exclusivo em local e
homologação, com dados fictícios. A mesma lista está em [`massa-de-teste-perfis.csv`](massa-de-teste-perfis.csv) para
abrir em planilha.

**Senha de todas as contas:** o valor de `SEED_DEMO_PASSWORD` do ambiente. A cada start a API alinha a senha das contas
demo a esse valor (inclusive depois de trocar a variável), sem pedir troca no primeiro acesso.

## Como a massa chega ao ambiente

- **Local** (`ASPNETCORE_ENVIRONMENT=Development`): roda sozinha quando a API sobe.
- **Homologação (Railway)**: a API roda em modo produção, onde o seed fica **desligado**, e o deploy sozinho não cria a
  massa. Configure no serviço da **API** (não no Postgres): `ENABLE_HOMOLOGATION_SEED=true`,
  `ALLOW_PRESENTATION_SEED_IN_PRODUCTION=true`, `PRESENTATION_SEED_ACK=DEMO_ONLY_NO_REAL_PATIENTS` e
  `SEED_DEMO_PASSWORD` (forte e diferente da senha local: vazia ou igual à local, a API não sobe). A massa nasce no
  próximo start. Retire essas variáveis antes de qualquer uso com dados reais.
- **Sessão de testes**: das **19h às 22h** (horário de Brasília). É hoje até as 22h; depois disso, o dia seguinte.
  Para outro horário, `TEST_SESSION_HOURS` no serviço da API (ex.: `9-11`; no mínimo 2 horas, entre 6h e 23h). A massa
  ocupa as duas primeiras horas e o resto fica livre para agendar pela tela. O histórico fica na véspera.
- **Uma massa por sessão**: os Ids derivam da data e da hora de início da sessão (duas sessões no mesmo dia não se
  misturam), e o histórico fica na véspera, nas mesmas horas da sessão. Cada start cria a sessão do dia se ela ainda não existe, então
  todo dia de teste começa limpo; o que você mudou num teste anterior (concluir, cancelar, assinar) fica no dia dele.
  Reiniciar a API no mesmo dia não duplica nada. Se o horário já estiver ocupado por outra consulta do médico, aquela
  linha da massa não é criada.
- **Assinatura**: para assinar na tela, a API precisa de `SIGNATURE_PROVIDER=simulator`. Os documentos que a massa já
  traz assinados saem com a marca "SIMULAÇÃO — SEM VALIDADE".

## Perfis

| Perfil | E-mail | Local | O que validar |
|---|---|---|---|
| Médico ADM MedSync | `admin@medsync.dev` | MedSync | Clínicas: ativar a **Clínica Gama** (em análise); acesso ao prontuário com justificativa |
| Suporte | `suporte@medsync.dev` | MedSync | Ajuda: 2 pedidos (novo e em andamento); Financeiro: mensalidades em todas as situações |
| DPO | `dpo@medsync.dev` | MedSync | Privacidade: pedido de acesso novo (Carlos) e correção resolvida (Carla) |
| ADM da clínica | `clinica.admin@medsync.dev` | Clínica Demo | Painel, consultas, Financeiro (fatura do mês em aberto e mês passado pago) |
| Recepção | `recepcao@medsync.dev` | Clínica Demo | Agenda da sessão de testes, horários livres a partir das 20h30, "Declaração de comparecimento" só nas assinadas |
| Médico | `medico@medsync.dev` | Clínica Demo | Dra. Marina: atendimentos da sessão, laudos, declaração, assinatura |
| Médico em dois locais | `medico.doislocais@medsync.dev` | Clínica Demo + Consultório | "Local de atendimento" no topo; cada local mostra só as próprias consultas |
| Paciente | `paciente@medsync.dev` | Clínica Demo | Carlos: termo de telemedicina às 19h; "Documentos (3)" no histórico |
| Paciente | `paciente2@medsync.dev` | Clínica Demo | Carla: presencial às 19h com o Dr. Bruno; **nunca** consultou com a Dra. Marina (não aparece em Pacientes vinculados dela) |
| Paciente | `paciente3@medsync.dev` | Clínica Demo | Roberto: online às 20h com termo aceito; cancelada e "Não compareceu" no histórico |
| Paciente | `paciente.demo@medsync.dev` | Clínica Demo | Daniel: presencial às 19h30; consulta concluída só com rascunhos — **não pode ver nada** até a médica assinar |
| Paciente | `paciente.demo2@medsync.dev` | Clínica Demo | Mariana: online às 19h30 com o Dr. Bruno; presencial concluída sem documentos |
| Médico + ADM (consultório) | `consultorio@medsync.dev` | Consultório Dra. Helena Souza | Agenda e documentos da própria médica; Financeiro com "Já paguei" aguardando confirmação |
| Recepção do consultório | `recepcao.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Agenda da sessão; declaração assinada do Lucas |
| Paciente | `paciente.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Lucas: presencial às 19h (Helena) e 20h30 (Bruno); "Documentos (2)" no histórico |
| Paciente | `paciente2.consultorio@medsync.dev` | Consultório Dra. Helena Souza | Beatriz: online às 20h com termo aceito |
| ADM da clínica | `clinica2.admin@medsync.dev` | Clínica Alfa | Fatura do mês passado **em atraso** |
| Médico | `medico.empresa2@medsync.dev` | Clínica Alfa | Dr. Rafael: online às 19h |
| Paciente | `paciente.empresa2@medsync.dev` | Clínica Alfa | Patricia: termo e sala às 19h |
| ADM da clínica | `clinica3.admin@medsync.dev` | Clínica Beta | Clínica no Rio de Janeiro |
| Médico | `medico.empresa3@medsync.dev` | Clínica Beta | Dra. Renata: presencial às 20h |
| Paciente | `paciente.empresa3@medsync.dev` | Clínica Beta | João: presencial às 20h |
| ADM da clínica em análise | `clinica.analise@medsync.dev` | Clínica Gama | Painel "Cadastro recebido", sem endereço (cadastro antigo) |

## Sessão de testes (horário de Brasília, consultas de 30 min)

| Hora | Local | Médico | Paciente | Modalidade | Estado inicial |
|---|---|---|---|---|---|
| 19:00 | Clínica Demo | Dra. Marina Costa | Carlos Oliveira | Online | termo de telemedicina **pendente** |
| 19:30 | Clínica Demo | Dra. Marina Costa | Daniel Demo | Presencial | agendada |
| 20:00 | Clínica Demo | Dra. Marina Costa | Roberto MedSync | Online | termo aceito |
| 20:30 a 21:30 | Clínica Demo | Dra. Marina Costa | — | — | **livres** para agendar pela tela |
| 19:00 | Clínica Demo | Dr. Bruno Dois Locais | Carla MedSync | Presencial | agendada |
| 19:30 | Clínica Demo | Dr. Bruno Dois Locais | Mariana Demo | Online | agendada |
| 20:00 | Clínica Demo | Dr. Bruno Dois Locais | Sofia Demo (8 anos, **sem CPF**) | Online | conta da mãe, Mariana (`paciente.demo2@medsync.dev`) |
| 19:00 | Consultório Helena | Dra. Helena Souza | Lucas Consultório | Presencial | agendada |
| 20:00 | Consultório Helena | Dra. Helena Souza | Beatriz Consultório | Online | termo aceito |
| 19:30, 20:30 a 21:30 | Consultório Helena | Dra. Helena Souza | — | — | **livres** |
| 20:30 | Consultório Helena | Dr. Bruno Dois Locais | Lucas Consultório | Presencial | agendada |
| 19:00 | Clínica Alfa | Dr. Rafael Lima | Patricia Alfa | Online | termo pendente |
| 20:00 | Clínica Beta | Dra. Renata Souza | Joao Beta | Presencial | agendada |

Dra. Marina e Dra. Helena atendem das 19h às 22h no dia da semana da sessão, e o Dr. Bruno das 19h às 20h (Clínica Demo)
e das 20h às 21h (consultório), para o paciente e a recepção marcarem os horários livres. O Dr. Rafael (Alfa) e a Dra. Renata (Beta) ficam **sem horário de
atendimento** de propósito: só a consulta da massa, e o paciente deles não consegue marcar outra (os testes E2E contam
com isso).

## Histórico (véspera)

| Hora | Médico | Paciente | Situação | Documentos |
|---|---|---|---|---|
| 19:00 | Dra. Marina | Carlos (online) | **Atendimento encerrado** | receita, laudo e declaração **assinados** → paciente vê "Documentos (3)"; o prontuário é somente leitura |
| 19:30 | Dra. Marina | Roberto (presencial) | Cancelada | — |
| 20:00 | Dra. Marina | Mariana (presencial) | Concluída | **nenhum**: a médica vê "Consulta concluída — emita a declaração" |
| 21:00 | Dra. Marina | Daniel (online) | Concluída | receita, relatório e declaração em **rascunho**: o paciente não vê nada |
| 21:30 | Dra. Marina | Roberto (online) | Não compareceu | — |
| 20:00 | Dra. Helena | Lucas (presencial) | Concluída | orientações e declaração **assinadas** → recepção do consultório baixa a declaração |

## Filas da equipe MedSync

- **Suporte**: "Dúvida sobre a mensalidade de outubro" (novo, Clínica Demo) e "Corrigir a especialidade no cadastro"
  (em andamento, consultório).
- **LGPD**: pedido de acesso aos dados do Carlos (novo) e correção de telefone da Carla (resolvido).
- **Financeiro**: Clínica Demo com o mês em aberto e o mês passado pago; Clínica Alfa com o mês passado em atraso;
  consultório com "Já paguei" aguardando confirmação.

## Roteiro sugerido

1. **Médico** (`medico@`): Agenda → consulta concluída das 20h (Mariana) → Prontuário → "Laudos e declarações":
   "Declaração de comparecimento" (confira entrada e saída) e "Novo laudo" → "Ver e assinar" → assinar no simulador →
   o segundo documento assina com um clique.
2. **Paciente** (`paciente.demo2@`): Minhas consultas → Histórico → "Documentos (2)" → baixar os PDFs.
3. **Paciente** (`paciente.demo@`): Histórico → a consulta das 21h **não** tem "Documentos". Depois que a médica
   assinar os rascunhos dela, o botão aparece.
4. **Recepção** (`recepcao@`): Histórico → "Declaração de comparecimento" só nas consultas com a declaração assinada;
   Ativas → a sessão de testes; "Agendar consulta" num horário livre a partir das 20h30.
5. **Atendimento online às 19h**: paciente `paciente@` aceita o termo e entra na sala; a médica inicia, encerra com
   "Consulta realizada — concluir" e cai direto em "Laudos e declarações" para assinar a declaração.
6. **Presencial às 19h30** (Daniel): a médica conclui pela Agenda e cai no prontuário, na mesma seção.
7. **Equipe MedSync**: Médico ADM ativa a Clínica Gama; Suporte confirma o "Já paguei" do consultório; DPO responde o
   pedido do Carlos.
8. **Dois locais** (`medico.doislocais@`): troque o "Local de atendimento" e confira que cada local mostra só as
   próprias consultas (Demo: Carla e Mariana; consultório: Lucas).
