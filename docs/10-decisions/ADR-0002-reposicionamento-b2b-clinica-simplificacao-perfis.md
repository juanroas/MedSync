# ADR-0002: Reposicionamento B2B-clinica, simplificacao de perfis e modelo de rede

## Status

**Aceito em 23/09/2026** (item 1 — reposicionamento: cliente principal e a clinica). Pesquisa concluida em 09/2026. Parte de UI ja implementada (ver secao "UI/UX: itens do ajustes.png"). `EXECUTION_GUARDRAILS.md`/`AI_AGENT_RULES.md` atualizados para remover a proibicao de linguagem "clinica" que contradizia esta decisao.

Ainda **nao confirmados** (dependem de decisao explicita do usuario antes de qualquer alteracao em producao): modelo de rede pool compartilhado (secao 3, depende do ADR-0001 Parte 2).

**Secao 2 (simplificacao de perfis) substituida em 24/09/2026 pelo ADR-0003** (6 perfis e regra de acesso ao prontuario).

## Contexto

Pedido do usuario (09/2026): simplificar o numero de perfis do MedSync; reposicionar o produto para ser vendido a clinicas (a clinica traz seus proprios profissionais); pesquisar como softwares do SUS sao estruturados como referencia; decidir se o paciente deve ver apenas profissionais da propria rede/clinica ou uma gama maior, e se escolher um profissional fora da rede deve exigir pagamento extra; melhorar a tela de medico e de paciente com base em anotacoes coletadas em `ajustes.png`.

O projeto ja tem documentacao extensa de product discovery que e relevante aqui e nao deve ser duplicada, apenas estendida:

- `docs/01-product/PRODUCT_POSITIONING.md` ja define o MedSync como B2B2C ("empresas ou parceiros" contratam; paciente tem experiencia propria; clinica/medico operam o atendimento).
- `docs/01-product/MARKET_REFERENCES.md` ja compara concorrentes privados de telemedicina (Dr.Online, Meu Doutor 24h, Doctoralia, IntegraConsulta, Clicou Consulta), mas nao cobre software publico (SUS).
- `docs/01-product/PROFILE_EXPERIENCE_RESTRUCTURE.md` ja documenta ajustes de experiencia por perfil e deixa em aberto (TODO) a criacao de um "Medico geral MedSync" e a fusao de financeiro empresa/plataforma.
- `ADR-0001` ja abriu, sem implementar (Parte 2), a decisao sobre um pool compartilhado de medicos entre empresas/clinicas, que depende de o modelo de sessao deixar de ser single-tenant.

Hoje `ClinicRole` (`apps/api/src/MedSync.Domain/Entities.cs`) tem 16 valores: `Patient`, `Doctor`, `Receptionist`, `Finance`, `ClinicAdmin`, `MedicalDirector`, `PrivacyAuditor`, `CompanyAdmin`, `CompanyFinance`, `PlatformFinance`, `Support`, `CompanyAuditor`, `PlatformAuditor`, `DataProtectionOfficer`, `PlatformAdmin`, `OccupationalHealthAdmin`. Ha sobreposicao de proposito entre 4 papeis de auditoria/privacidade (`PrivacyAuditor`, `DataProtectionOfficer`, `CompanyAuditor`, `PlatformAuditor`) e entre 3 papeis financeiros (`Finance`, `CompanyFinance`, `PlatformFinance`).

## Pesquisa: referencias do SUS

- **e-SUS APS / PEC (Prontuario Eletronico do Cidadao)**: prontuario unificado da atencao primaria, com o Cartao Nacional de Saude (CNS) funcionando como identificador unico do paciente que atravessa diferentes unidades de saude. Inclui um modulo de agendamento online que conecta o paciente a uma unidade/equipe, nao a um medico especifico escolhido livremente. Padrao relevante: identidade unica do paciente que atravessa "portas de entrada" diferentes — algo que o MedSync ainda nao tem entre tenants (hoje `Patient` e um registro por tenant, ligado a um `CompanyEmployee` local, sem identidade global entre clinicas).
- **SISREG (Sistema Nacional de Regulacao)**: regula o acesso a consultas/exames especializados entre unidades. A unidade de origem faz a solicitacao, uma central de regulacao aprova e direciona para uma unidade de destino com vaga disponivel — o paciente nao escolhe livremente o profissional, o sistema aloca por especialidade e disponibilidade, com auditoria de cada encaminhamento.
- **Padrao comum aos dois**: separacao entre "regulacao/alocacao" (quem decide para onde o paciente vai) e "prestador" (quem executa o atendimento). Isso e essencialmente o que a tela "Solicitar consulta" do MedSync ja faz hoje: o paciente escolhe uma especialidade, o sistema lista os medicos daquela especialidade no tenant e "vincula uma opcao disponivel" — ou seja, o modelo atual do MedSync ja segue o padrao de regulacao por especialidade do SUS, em vez de busca livre por nome de medico (modelo Doctoralia). Vale manter essa direcao ao expandir para o pool compartilhado (ver secao de modelo de rede).

Fontes consultadas: sisaps.saude.gov.br/esus, artigos da SciELO sobre o PEC e-SUS APS, conass.org.br sobre o SISREG, wiki.saude.gov.br/SISREG (lista completa na resposta enviada ao usuario nesta sessao).

## Pesquisa: rede credenciada e atendimento fora da rede (mercado privado)

Planos de saude brasileiros tratam atendimento fora da rede credenciada de duas formas: (1) reembolso — o paciente paga o valor cheio e depois solicita reembolso parcial conforme tabela do plano, processo manual e sujeito a analise; (2) autorizacao previa quando nao ha prestador credenciado na regiao/especialidade, caso em que o plano pode ser obrigado a custear integralmente. O modelo de reembolso exige uma tabela de referencia de valores e um fluxo de analise/aprovacao, o que aproxima o operador da logica regulatoria de uma operadora de saude (ANS).

## Decisao proposta

### 1. Reposicionamento: cliente principal e a clinica

Hoje a leitura predominante da documentacao e "MedSync vende para Empresas, que compram beneficio de saude digital para funcionarios, dentro do tenant tecnico Clinica". A proposta e inverter a enfase da narrativa comercial: **a Clinica (tenant) e o cliente vendido primeiro**, ela traz seus proprios profissionais (`Doctor`, `MedicalDirector`) e pode, como modulo opcional, revender/gerir contratos B2B com empresas-clientes dela (`Company`/`CompanyContract`) caso queira atender beneficiarios corporativos.

Isso nao exige mudanca de schema — `Clinic` ja e a fronteira de tenant e `Company` ja e um cliente dentro do tenant. E principalmente uma mudanca de onboarding e de landing page: o fluxo `registerClinic` (ja existente) deve ser a porta de entrada principal e mais visivel, com o modulo de empresas/beneficiarios aparecendo como algo que a clinica ativa depois, nao como o unico caminho de entrada. Recomendo atualizar `docs/01-product/PRODUCT_POSITIONING.md` e `docs/02-design/LANDING_PAGE_BLUEPRINT.md` para refletir essa enfase quando o usuario confirmar a direcao.

### 2. Simplificacao de perfis (ClinicRole)

| Papel atual | Proposta |
|---|---|
| `Patient`, `Doctor`, `Receptionist`, `ClinicAdmin`, `MedicalDirector` | Mantem — sao os papeis centrais da operacao clinica, ja com telas dedicadas. |
| `CompanyAdmin`, `CompanyFinance`, `CompanyAuditor` | Mantem os 3 — `PROFILE_EXPERIENCE_RESTRUCTURE.md` ja documenta essa segregacao como decisao deliberada de governanca (empresa nao deve ver financeiro e auditoria misturados no mesmo perfil); nao e redundancia acidental. |
| `OccupationalHealthAdmin` | Mantem isolado — saude ocupacional e sensivel e ja esta marcada como pendente de validacao juridica/DPO; nao simplificar antes dessa validacao. |
| `Finance` | Avaliar fundir com `ClinicAdmin` — hoje sem tela propria dedicada identificada; baixo uso aparente. |
| `PrivacyAuditor` + `DataProtectionOfficer` | Fundir em um so papel (manter `DataProtectionOfficer`, nome mais claro para efeitos de LGPD/encarregado). Hoje as duas roles se sobrepoem conceitualmente. |
| `PlatformAuditor` | Fundir dentro de `PlatformAdmin` com um escopo "somente leitura" — e equipe interna MedSync, baixo volume de usuarios, baixo risco de misturar funcoes. |
| `PlatformFinance`, `Support`, `PlatformAdmin` | Mantem separados — financeiro interno, suporte operacional e administracao de plataforma continuam com responsabilidades distintas. |

Resultado: de 16 para aproximadamente 13 papeis. A simplificacao e deliberadamente conservadora — reduz so a redundancia interna (equipe MedSync), preservando as segregacoes que ja foram decisao de compliance do lado empresa e saude ocupacional. **Esta e uma recomendacao para validacao do usuario antes de qualquer fusao/remocao em codigo**, porque afeta usuarios ja existentes no seed/homologacao (`DatabaseSeeder.cs`) e teria que vir acompanhada de migracao de dados.

### 3. Modelo de rede (dentro/fora) e pagamento

Recomendacao, combinando o padrao SUS (regulacao por especialidade) com o padrao de mercado privado (pagamento avulso fora da rede em vez de reembolso):

- **Hoje (mantem como esta)**: paciente ve e e alocado somente entre medicos da propria clinica/tenant — "rede propria". Isso ja esta implementado e alinhado ao padrao SISREG de alocacao por especialidade.
- **Fase 2, ainda nao implementada (depende do ADR-0001 Parte 2 ser resolvido primeiro)**: quando a clinica nao tiver a especialidade disponivel, o paciente pode ver medicos "fora da rede" (pool MedSync ou de outra clinica parceira), marcados visualmente como "fora da rede — particular", com um filtro explicito ("Somente minha clinica" vs "Ampliar busca").
- **Regra de pagamento recomendada para fora da rede**: cobranca do valor cheio no ato (modelo "Clicou Consulta", pagamento avulso), em vez de reembolso pos-pago. O reembolso exige tabela de valores de referencia e processo de analise, alem de aproximar o MedSync da logica regulatoria de uma operadora de plano de saude (ANS) sem necessidade comprovada nesta fase.
- Este item **nao e implementavel ainda** sem primeiro decidir entre o Caminho 1 (tenant "MedSync Pool" + vinculo por empresa + sessao multi-tenant) ou Caminho 2 (duplicar cadastro de medico por tenant) descritos no ADR-0001.

## UI/UX: itens de `ajustes.png`

O usuario enviou uma captura da tela "Solicitar consulta" (paciente) com anotacoes. Itens ja corrigidos nesta sessao, no arquivo `apps/web/src/app/(platform)/consultas/nova/page.tsx`:

- [x] Campo "Duracao" removido do formulario do paciente; duracao da consulta fixada em 30 minutos (o paciente nao escolhe mais).
- [x] Campo de anexo adicionado ao formulario de solicitacao — o paciente pode anexar exame/documento ao pedir a consulta. Reaproveita o endpoint ja existente de anexos do prontuario (`POST /appointments/{id}/clinical-record/attachments`), que ja permite upload pelo proprio paciente da consulta; o upload acontece logo apos a consulta ser criada, usando o id retornado.
- [x] `npm run typecheck:web` validado sem erros apos a mudanca.

Itens implementados nesta rodada seguinte da sessao, apos revisao ao vivo e nova lista de pedidos do usuario:

- [x] Grid principal (dashboard) nao mostrava a consulta mais recente para medico nem para paciente — eram dois bugs de frontend independentes (`DoctorHome` nao ordenava `upcoming` antes do `.slice(0,5)`; `PatientCareHome` fatiava o array ascendente pelo lado errado). Corrigido em `apps/web/src/app/(platform)/dashboard/page.tsx`. O backend ja ordenava corretamente (`OrderByDescending(x => x.ScheduledAt)` em `AppointmentQuery`).
- [x] Medico agora pode configurar dias/horarios de disponibilidade ("Minha disponibilidade" em `apps/web/src/app/(platform)/doctors/page.tsx`), persistidos na nova entidade `DoctorAvailabilitySlot`. O paciente so ve e so pode escolher um horario dentro dessas janelas quando o medico tiver ao menos uma configurada — `GET /doctors/{id}/available-times?date=` calcula slots de 30 minutos livres, e `RequestAppointment` passou a respeitar essas janelas na alocacao. Compatibilidade retroativa: medico sem nenhuma janela configurada continua sem restricao de horario (comportamento anterior preservado), e a tela "Solicitar consulta" so troca o campo livre `datetime-local` pelo seletor de horarios quando o medico escolhido tem agenda fixa (`CareDoctorOptionResponse.HasAvailability`).
- [x] Campo "Medicacoes de uso continuo" adicionado ao paciente (`Patient.ContinuousMedications`, ate 2000 caracteres). Editavel no cadastro (staff) e na autoedicao do proprio paciente; visivel para medico/staff na lista de pacientes, no prontuario do atendimento e no historico da tela de videochamada — sempre pelo mesmo filtro de finalidade assistencial (`canSeeNotes`) ja usado para as observacoes da consulta.
- [x] Historico do prontuario disponivel na tela de stream: nova aba "Historico" na barra lateral da videochamada (`apps/web/src/components/consultation-room.tsx`), ao lado de "Dados" e "Prontuario", reaproveitando `GET /patients/{id}/clinical-records` ja usado na pagina de prontuario. Mostra tambem as medicacoes de uso continuo do paciente no topo.
- [x] `npm run typecheck:web` validado sem erros apos todas as mudancas de frontend desta rodada.

Itens ainda pendentes, que exigem desenho de dados maior e devem ser priorizados pelo usuario antes de entrar em desenvolvimento:

- [ ] Aumentar o tamanho do video do participante remoto na tela de stream.
- [ ] Area de receituario: adicionar medicacao, historico, opcao de impressao e persistencia no banco. Nao existe hoje nenhuma entidade de prescricao/receituario — e uma feature nova, com implicacoes de responsabilidade medica e formatacao de impressao que merece validacao com o diretor tecnico antes de implementar. Deliberadamente mantido separado do campo mais simples "medicacoes de uso continuo" (implementado acima), que e so um texto livre no cadastro do paciente, sem impressao nem estrutura de posologia.

**Pendencia tecnica importante**: os quatro arquivos de backend alterados (`Entities.cs`, `MedSyncDbContext.cs`, `Contracts.cs`, `ApiEndpoints.cs`) adicionam a entidade `DoctorAvailabilitySlot` e o campo `Patient.ContinuousMedications`, que exigem uma migracao EF Core. Nem o sandbox de nuvem desta sessao nem a maquina do usuario acessada via ponte remota tem o SDK do .NET instalado com acesso liberado ao NuGet, entao a migracao nao pode ser gerada por aqui. **O usuario precisa rodar localmente**, na raiz de `apps/api`: `dotnet ef migrations add AddDoctorAvailabilityAndContinuousMedications --project src/MedSync.Infrastructure --startup-project src/MedSync.Api` (ajustar os nomes de projeto conforme o `.csproj` real) e depois `dotnet ef database update`, antes que essas duas funcionalidades funcionem contra o banco real.

## UI/UX: achados da revisao ao vivo (ambiente demo)

Revisao feita no navegador real do usuario, logado como medico (`medico@medsync.dev`) e como paciente (`paciente@medsync.dev`) no ambiente demo (`med-sync-web-six.vercel.app`). Achados concretos, fora do que ja estava em `ajustes.png`:

- ~~**"Meu cadastro" quebrado para o paciente**~~ — **correcao**: achado descartado apos leitura completa de `apps/web/src/app/(platform)/patients/page.tsx` e do handler `UpdatePatient` em `ApiEndpoints.cs`. O fluxo de autoedicao do paciente (`isPatient && ownPatient`, formulario com `submitUpdate` chamando `api.updatePatient`) ja existe, ja funciona e ja tem suporte no backend (`canUpdateOwn` para o papel `Patient`). O TODO citado em `PROFILE_EXPERIENCE_RESTRUCTURE.md` ("Edicao do proprio cadastro permanece como TODO ate existir endpoint de update") esta desatualizado — o endpoint existe. A navegacao "revertendo para o painel" observada na sessao ao vivo foi, com alta probabilidade, um clique com coordenada de pixel que nao acertou o elemento certo (mesmo problema de escala ~1.53x entre viewport reportado e screenshot documentado nesta sessao), nao um defeito real do produto. Recomenda-se tambem atualizar `PROFILE_EXPERIENCE_RESTRUCTURE.md` para remover esse TODO desatualizado.
- **Lista "Minhas consultas" do paciente mostra o nome errado em destaque**: cada linha mostra "Carlos Oliveira" (o proprio paciente) em negrito como titulo, e "Dra. Marina Costa - Clinica geral" em cinza como subtitulo. Do ponto de vista do paciente, o dado relevante em destaque deveria ser com quem e a consulta (o medico), nao o proprio nome repetido em toda linha. Parece reaproveitamento do mesmo componente de lista usado na agenda do medico (onde faz sentido mostrar o nome do paciente) sem inverter qual campo e o titulo.
- **TODO interno vazando para o usuario final**: o painel do medico mostra o texto "Edicao de perfil medico e disponibilidade por especialidade: TODO de produto/API." diretamente na tela, dentro do card "Pacientes vinculados". Isso deveria ser um comentario de codigo/backlog, nao uma string visivel na interface de producao/demo.
- **Erro de concordancia**: "1 pacientes" no card de pacientes vinculados do medico (deveria ser "1 paciente").
- **Pagina 404 sem identidade visual**: acessar uma rota inexistente (ex.: `/profile`) cai na pagina 404 padrao do Next.js — fundo preto, texto generico, sem logo, sem link de volta. Vale ter uma 404 com a identidade do MedSync e um caminho de volta ao painel.
- **Padrao geral confirmado**: tanto o painel do medico quanto o do paciente sao, hoje, majoritariamente tabelas/cards planos em branco e cinza, com iniciais coloridas no lugar de foto/avatar e pouca hierarquia visual alem de negrito. Isso é consistente com o "nao esta interessante ainda" apontado pelo usuario — nao ha um bug unico responsavel, e sim ausencia de variação visual (icones, cor de status, estados vazios ilustrados) nas telas centrais do produto.

Importante: os dois ajustes ja implementados nesta sessao (duracao fixa em 30 min e anexo na solicitacao de consulta) estao no arquivo local `apps/web/src/app/(platform)/consultas/nova/page.tsx`, sincronizados no `C:\git\MedSync` do usuario, mas **ainda nao aparecem no ambiente demo publicado** (`med-sync-web-six.vercel.app`), porque esse ambiente e um deploy Vercel separado do working copy local — so vao aparecer la depois de commit/push e redeploy.

## Pesquisa: notas de IA na consulta vs. substituir/embutir Microsoft Teams como stream

Pedido do usuario: avaliar um agente de IA para anotar a consulta automaticamente (para o medico nao precisar digitar durante o atendimento), OU avaliar trocar/embutir o Microsoft Teams como ferramenta de videochamada em vez do servico pago atual (LiveKit), sem sair da plataforma. Pesquisa feita nesta sessao; nenhuma implementacao foi iniciada — e uma avaliacao de viabilidade para o usuario decidir o proximo passo.

### Embutir o Teams em vez do LiveKit

Nao e possivel simplesmente colocar `teams.microsoft.com` num `<iframe>` — o proprio cliente web do Teams bloqueia isso (duvida recorrente e nao resolvida em foruns da Microsoft). O caminho realmente suportado e o **Azure Communication Services (ACS) com interoperabilidade Teams via BYOI ("bring your own identity")**: o app cria/obtem o link de uma reuniao Teams (via Microsoft Graph, `OnlineMeeting`) e usa o **ACS Calling SDK** dentro da propria tela de stream do MedSync para entrar nessa reuniao como participante externo anonimo — sem exigir licenca Teams do paciente, sem sair da plataforma, com audio/video/compartilhamento de tela e chat funcionando. A Microsoft cita explicitamente esse cenario ("healthcare providers using Teams can conduct telehealth virtual visits with their patients who use a custom application") como caso de uso oficial.

O que isso custaria/exigiria:

- Um tenant Microsoft Entra/M365 com licenca Teams para quem cria as reunioes (a clinica), possivelmente Teams Premium para habilitar o "Intelligent Recap" (resumo e notas automaticas da Microsoft) — esse seria o principal ganho de ir para o Teams: a IA de notas viria pronta da Microsoft, sem o MedSync ter que construir a propria.
- Um recurso Azure Communication Services, com cobranca por minuto de participante (custo recorrente novo, hoje o LiveKit ja e o "servico pago" que o usuario quer evitar trocar por outro custo).
- Registro de aplicativo no Graph API e uma nova tela de chamada construida com o ACS Calling SDK, substituindo os componentes `LiveKitRoom`/`VideoConference` atuais — trabalho de integracao comparavel a uma segunda implementacao de videochamada do zero.
- Perda do modelo de criptografia ponta a ponta que o MedSync ja implementou com LiveKit (`ExternalE2EEKeyProvider`, visivel na tela de stream hoje). ACS/Teams processam a midia na nuvem da Microsoft; nao ha o mesmo tipo de garantia E2E que o app ja anuncia ao paciente ("Criptografia ponta a ponta" no cabecalho da sala).
- A propria Microsoft e explicita: cabe ao MedSync detectar quando gravacao/transcricao do Teams esta ativa e notificar o usuario em tempo real dentro da propria interface — ou seja, a obrigacao de consentimento continua sendo do MedSync, o Teams nao resolve isso sozinho.

**Avaliacao**: tecnicamente viavel, mas e uma segunda integracao de videochamada inteira (Azure + Graph + ACS Calling SDK), com custo recorrente novo e perda do E2E encryption ja implementado, so para herdar a IA de notas pronta da Microsoft (que ainda depende de licenciamento Teams Premium). Nao recomendo como primeiro passo.

### Agente de IA para notas da consulta, mantendo o LiveKit atual

O MedSync ja tem uma base para isso: a pagina de prontuario (`apps/web/src/app/(platform)/prontuario/[appointmentId]/page.tsx`) ja tem um botao "Iniciar/Parar ditado" que usa a Web Speech API do navegador para transcrever a fala do medico direto no campo de texto do prontuario, hoje acionado manualmente e sem estruturacao.

Dois caminhos possiveis, dado que o LiveKit ja roda com criptografia ponta a ponta (o servidor LiveKit nao consegue ler o audio):

- **Caminho A — 100% no navegador (recomendado como piloto)**: estender o ditado existente para (1) rodar automaticamente durante a chamada em vez de exigir clique manual, (2) ao final da consulta, enviar a transcricao acumulada (texto, nao audio) para um modelo de linguagem gerar um rascunho estruturado (queixa, historico, conduta) e preencher o campo de prontuario como rascunho — nunca salvar sozinho, o medico revisa e clica em "Salvar prontuario" como ja faz hoje. Como a transcricao acontece no proprio navegador (Web Speech API), o audio da chamada nunca precisa sair criptografado para um servidor de IA — preserva a mesma garantia de criptografia ponta a ponta que o produto ja anuncia. Limitacao tecnica: a Web Speech API captura o microfone local por padrao; capturar tambem o audio remoto do paciente exige rotear o stream de audio do LiveKit para a API de transcricao, o que e tecnicamente possivel mas precisa de validacao de compatibilidade entre navegadores.
- **Caminho B — agente de servidor via LiveKit Agents**: o LiveKit tem um framework proprio (`livekit/agents`) para um "participante-robo" entrar na sala e processar audio em tempo real (STT + LLM), mais robusto e sem depender da Web Speech API do navegador do medico. Mas isso exige que o agente receba o audio decodificado — ou seja, entrar na sala teria que abrir mao da criptografia ponta a ponta para aquela consulta (compartilhar a chave de encriptacao com um processo de servidor), o que e uma mudanca de postura de privacidade que merece decisao explicita do usuario/DPO antes de qualquer prova de conceito.

**Consentimento e LGPD** (equivalente brasileiro ao que a pesquisa de mercado (EUA/HIPAA) chama de consentimento obrigatorio e cadeia de acordos de processamento de dados com cada fornecedor que toca o audio/transcricao): transcricao e nota clinica sao dado sensivel de saude (LGPD art. 11), exigindo consentimento especifico e destacado do paciente — um novo passo de consentimento, no mesmo padrao do termo de telemedicina que ja existe hoje (`GET /consent/term`, tela de "Consentimento para telemedicina"), especifico para "este atendimento usara IA para ajudar a estruturar o registro clinico" — mais um registro de auditoria (o app ja tem o padrao pronto, via `AuditWriter`). O rascunho gerado por IA nunca deve ser salvo automaticamente no prontuario sem revisao e confirmacao explicita do medico, pelo mesmo motivo que a pesquisa de mercado aponta taxas de erro/alucinacao relatadas entre 1% e ~26% dependendo do fornecedor — o medico continua sendo o unico responsavel legal pelo conteudo final do prontuario.

**Avaliacao**: recomendo o Caminho A como piloto de baixo risco — reaproveita o ditado ja existente, nao exige infraestrutura nova, nao abre excecao na criptografia ponta a ponta ja implementada, e nao troca o LiveKit por um servico pago adicional. O Caminho B (agente de servidor) fica como evolucao futura, condicionado a uma decisao explicita sobre abrir mao do E2E encryption para consultas com IA habilitada. Nenhum dos dois foi implementado nesta sessao — fica como proximo passo dependendo da priorizacao do usuario.

## Alternativas consideradas

- Manter os 16 perfis como estao — descartado por pedido explicito do usuario, mas com o risco de uma simplificacao agressiva demais quebrar segregacoes de compliance ja decididas no lado empresa; por isso a proposta acima e conservadora.
- Implementar reembolso (modelo tradicional de plano de saude) em vez de pagamento avulso para fora da rede — descartado por ora, por aumentar complexidade financeira e aproximar o produto de responsabilidades regulatorias de operadora de saude sem necessidade comprovada.

## Consequencias

Positivas: narrativa comercial e roadmap alinhados ao pedido do usuario; simplificacao de papeis reduz so redundancia interna, preservando segregacoes de compliance ja deliberadas; o modelo de rede aproveita padroes ja testados (SUS para regulacao por especialidade, mercado privado para pagamento avulso fora da rede) em vez de inventar um modelo do zero; dois itens do backlog de UI ja saem implementados e validados nesta sessao.

Negativas/riscos: a simplificacao de papeis ainda depende de confirmacao do usuario e, se aprovada, exige migracao dos usuarios ja existentes no seed/homologacao; o modelo de pool compartilhado continua bloqueado ate o ADR-0001 Parte 2 ser resolvido; os itens de agenda por disponibilidade e receituario sao features novas, fora do MVP atual, e nao devem ser iniciadas sem priorizacao explicita do usuario dado o tamanho do escopo ja em aberto no projeto.

## Referencias

- `ADR-0001` (pool compartilhado de medicos, ainda em aberto)
- `docs/01-product/PRODUCT_POSITIONING.md`
- `docs/01-product/MARKET_REFERENCES.md`
- `docs/01-product/PROFILE_EXPERIENCE_RESTRUCTURE.md`
- `apps/api/src/MedSync.Domain/Entities.cs` (`enum ClinicRole`)
- `apps/web/src/app/(platform)/consultas/nova/page.tsx`
- `apps/web/src/app/(platform)/doctors/page.tsx`, `apps/web/src/app/(platform)/patients/page.tsx`, `apps/web/src/app/(platform)/prontuario/[appointmentId]/page.tsx`, `apps/web/src/components/consultation-room.tsx` (disponibilidade do medico, medicacoes de uso continuo, historico no stream)
- `apps/api/src/MedSync.Domain/Entities.cs` (`DoctorAvailabilitySlot`, `Patient.ContinuousMedications`)
- Pesquisa externa sobre e-SUS APS/PEC, SISREG e rede credenciada/reembolso (links completos na resposta enviada ao usuario nesta sessao, em 09/2026)
- Pesquisa externa sobre IA de notas e Teams (09/2026): [LiveKit Transcriptions docs](https://docs.livekit.io/agents/voice-agent/transcriptions/), [LiveKit Agents framework (GitHub)](https://github.com/livekit/agents), [Teams meeting interoperability — Azure Communication Services](https://learn.microsoft.com/en-us/azure/communication-services/concepts/join-teams-meeting), [Want to embed Microsoft Teams in your app? (Microsoft 365 Dev Blog)](https://devblogs.microsoft.com/microsoft365dev/want-to-embed-microsoft-teams-in-your-app-heres-how/), [AI Clinical Scribe in Telemedicine: HIPAA-Safe Build Guide (Trembit)](https://trembit.com/blog/ai-clinical-scribe-telemedicine-hipaa/), [Barriers and opportunities of scaling ambient AI scribes (npj Digital Medicine)](https://www.nature.com/articles/s41746-026-02554-0)
