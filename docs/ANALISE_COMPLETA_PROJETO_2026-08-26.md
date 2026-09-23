# Análise Completa do MedSync — Gaps, Riscos e Plano de Ação

Data da análise: 26/08/2026
Repositório analisado: `C:\git\MedSync` (branch `main`, último commit `4532f82` em 20/07/2026)
URL avaliada: https://med-sync-web-six.vercel.app/

Esta análise foi feita lendo o código real (backend .NET, frontend Next.js), a documentação em `docs/`, os checklists de segurança/QA/produção já existentes no projeto, o histórico do git, o pipeline de CI e a página pública em produção. O objetivo é comparar o que a documentação promete com o que está de fato implementado, e apontar o que falta para um lançamento responsável.

---

## 1. Resumo executivo

O MedSync já tem uma base técnica bem mais madura do que o normal para este estágio: arquitetura em camadas (Domain/Application/Infrastructure/Api) coerente, autenticação JWT via cookie HttpOnly, cabeçalhos de segurança configurados, rate limit no login, validação de upload de anexos clínicos com checagem de assinatura de arquivo, isolamento multiempresa aplicado consistentemente nas queries, webhook de pagamento validado por HMAC, e uma suíte de 18 testes end-to-end em Playwright cobrindo os principais fluxos por perfil — todos passando na última execução local.

Ao mesmo tempo, o projeto está exatamente onde a própria documentação diz que está: **homologação controlada, não pronto para produção nem para pacientes reais**. O maior gap não é "o que falta construir", é "o que falta testar, monitorar e validar formalmente". Os três buracos mais sérios encontrados são:

1. **Zero testes automatizados no backend** (nenhum projeto de teste unitário/integração em .NET) — toda a lógica de negócio, autorização e isolamento de dados clínicos depende só dos 18 testes E2E do frontend para ser pega em caso de regressão.
2. **Nenhuma ferramenta de observabilidade/monitoramento** (sem Sentry, Application Insights, OpenTelemetry ou logging estruturado) — hoje, se algo quebrar em produção, ninguém é avisado automaticamente.
3. **MFA, rotação de refresh token e tela de sessões ativas não existem** — para uma plataforma de saúde com dados clínicos, isso é bloqueador de produção, não "nice to have".

Fora isso, o projeto tem lacunas já conhecidas e documentadas pela própria equipe (`docs/14-roadmap`, `docs/09-production/PRODUCTION_CHECKLIST.md`): pentest, teste de carga, teste de restauração de backup, aprovação jurídica/DPO/diretor técnico, SAST/DAST no pipeline. Nada disso é surpresa — está listado como pendência formal — mas nenhum desses itens tem evidência de execução no repositório.

Veredito: **não lançar em produção com pacientes reais neste estado.** O produto está pronto para uma homologação mais agressiva (piloto com empresa de teste, dados fictícios) desde que os gaps de segurança de sessão (MFA, refresh token) e observabilidade sejam endereçados antes, e desde que backend ganhe testes automatizados antes de qualquer expansão de escopo.

---

## 2. O que foi analisado

- Estrutura completa do monorepo (`apps/api` em .NET 9, `apps/web` em Next.js 15 / React 19).
- Código-fonte do backend: `Program.cs`, `ApiEndpoints.cs` (3092 linhas, ~50 rotas), `Security.cs`, `TokenService.cs`, `MercadoPagoPaymentProvider.cs`, `ClinicalAttachmentStorage.cs`, `DatabaseSeeder.cs`, migrations do EF Core.
- Código-fonte do frontend: rotas em `src/app/(platform)`, `src/services/api.ts`, componentes.
- Toda a documentação em `docs/` (16 áreas: produto, design, arquitetura, segurança, qualidade, produção, decisões, roadmap etc.) e as 7 skills locais do projeto em `.agents/skills`.
- Pipeline de CI (`.github/workflows/ci.yml`).
- Suíte de testes E2E (`apps/web/e2e/*.spec.ts`, 18 arquivos) e evidência da última execução (`test-results/.last-run.json`).
- Histórico do git (commits, branches, working tree).
- A aplicação publicada em produção (landing page e tela de login), via busca de conteúdo web.

Não foi possível: rodar a aplicação localmente (Postgres/Redis/API não estavam de pé), verificar o status real das execuções de CI no GitHub Actions (sem acesso ao `gh`/token), nem inspecionar o endpoint de produção da API diretamente (proxy do Next.js bloqueou a checagem automatizada).

---

## 3. Arquitetura implementada

O backend segue Clean Architecture de fato, não só na intenção: `MedSync.Domain`, `MedSync.Application`, `MedSync.Infrastructure`, `MedSync.Api`, todos como projetos `.csproj` separados na solution. Isso bate com a "Direção esperada" descrita em `docs/03-architecture/ARCHITECTURE_OVERVIEW.md` — só que esse próprio documento ainda diz `TODO: Validar com estrutura real do backend`, ou seja, **a documentação de arquitetura nunca foi atualizada para confirmar que o código bate com o planejado**. Vale fechar esse loop: é rápido e destrava a skill `medsync-architecture-blueprint`, que hoje trabalha com uma premissa não confirmada.

Stack real identificada:
- Backend: .NET 9, Minimal APIs, EF Core + Npgsql (PostgreSQL), Redis (cache distribuído, com fallback em memória se `REDIS_URL` não estiver setado), JWT (HMAC-SHA256, expiração de 15 min), LiveKit para videochamada, Mercado Pago para pagamentos.
- Frontend: Next.js 15.5 (App Router), React 19, Tailwind, LiveKit React components.
- Infra local: `docker-compose.yml` só sobe Postgres 17 e Redis 7 — API e Web rodam fora de container em dev.
- Deploy (segundo README): Vercel para o web, Railway para a API — mas não há `vercel.json` nem config de Railway versionada no repo, então a configuração de deploy vive só no painel dessas plataformas, fora do controle de versão.

Nenhum ADR real foi registrado: `docs/10-decisions/` só tem o template (`ADR-0000.md`, `ADR_TEMPLATE.md`), sem decisões arquiteturais capturadas (ex: por que Minimal API em vez de Controllers, por que Redis com fallback em memória, por que JWT de 15 min sem refresh). Isso vira dívida de conhecimento — decisões importantes só existem na cabeça de quem escreveu.

Multi-tenancy é aplicado **manualmente**: toda query relevante filtra por `ClinicId`/`CompanyId` explicitamente (confirmado em dezenas de pontos de `ApiEndpoints.cs`), mas o `MedSyncDbContext` não usa `HasQueryFilter` do EF Core. Isso funciona, mas é frágil: basta um desenvolvedor esquecer um `.Where(x => x.ClinicId == actor.ClinicId)` em um endpoint novo para vazar dado entre empresas. Um filtro global no `OnModelCreating` elimina essa classe inteira de bug e deveria ser tratado como prioridade alta, não só best practice.

---

## 4. O que está implementado e funcionando

Vale registrar isto com clareza porque a documentação do próprio projeto (`docs/14-roadmap`, arquivo de TODOs de homologação) já rastreia isso item a item, com evidência de teste E2E associada. Confirmando por leitura direta do código, estão implementados e com teste E2E passando:

- Login multiperfil (paciente, médico, empresa/parceiro admin, financeiro, suporte, auditor, admin plataforma, DPO) com troca de senha temporária obrigatória.
- Cadastro assistido de empresa pelo suporte, com ativação de CNPJ restrita ao admin MedSync.
- Separação de escopo de acesso e permissões: cada perfil só vê o que a matriz de permissões permite (testado com casos negativos em `authorization.spec.ts`, `access-management.spec.ts`).
- Elegibilidade de beneficiários, faturas e relatórios financeiros agregados sem exposição de dado clínico individual.
- Fluxo de teleconsulta: paciente só recebe token LiveKit após consentimento e após o médico iniciar a sala; token com TTL de 15 minutos; nome de sala sem dado pessoal.
- Prontuário/registro clínico com anexos (upload validado por tamanho, tipo de conteúdo e assinatura binária do arquivo — proteção real contra upload malicioso disfarçado de PDF/imagem).
- Checkout Mercado Pago com validação de assinatura HMAC no webhook.
- Auditoria de eventos (login, falha de login, criação/leitura de dados sensíveis, aceite de termo, emissão de token de vídeo).
- Portal de privacidade/DPO com solicitações do titular (`/privacidade`, `GET/POST /privacy/requests`).
- Seed multiempresa para homologação (Empresa Demo, Alfa, Beta em tenants isolados).
- 18 specs E2E cobrindo esses fluxos, com a última execução local registrando **status "passed", zero falhas**.

Isso é uma base sólida. O risco não está no que foi construído — está no que valida essa construção continuamente (testes de backend, monitoramento) e no que ainda não foi construído ou aprovado (seção 6 a 9).

---

## 5. Testes automatizados — a maior lacuna técnica

**Backend: zero testes.** Não existe nenhum projeto `xunit`/`nunit`/`MSTest` na solution (`MedSync.sln` só lista os 4 projetos de produção). Isso significa que toda a lógica de autorização por perfil, isolamento multiempresa, cálculo de elegibilidade, regras de agenda, validação de upload e integração com pagamento/vídeo roda sem uma única linha de teste unitário ou de integração no lado do servidor. O único wildlife net hoje é a suíte E2E do frontend — que testa o comportamento visível na tela, mas não cobre casos de borda de API, concorrência, nem regras de domínio que nunca chegam a aparecer na UI.

Para uma plataforma que lida com prontuário médico e dado ocupacional, isso é o gap mais crítico de todo o levantamento — mais crítico até que MFA, porque sem teste de backend, uma regressão silenciosa em uma regra de autorização (por exemplo, alguém remover um `.Where(ClinicId ==)` sem querer) só seria pega se o E2E cobrir exatamente aquele caminho.

**Frontend: só E2E, sem teste unitário.** Os 18 arquivos em `apps/web/e2e/` são Playwright (ponta a ponta, via browser real). Não há Jest, Vitest, React Testing Library nem qualquer teste de componente isolado. Isso é aceitável para uma aplicação com poucas regras de UI complexas, mas componentes com lógica de formatação, máscara de CPF, cálculo de agenda ou validação client-side ficam sem cobertura rápida — hoje qualquer refatoração de componente só é validada rodando a suíte E2E inteira (mais lenta, mais frágil a mudanças de layout).

**CI:** o pipeline builda API e Web, faz typecheck, roda `npm audit` e `gitleaks` (bom, scan de dependência e de segredo já existe). Mas: (a) não há `dotnet test` porque não há o que rodar; (b) o job de E2E só executa se as variáveis de repositório `MEDSYNC_E2E_BASE_URL`/`MEDSYNC_E2E_API_URL` estiverem configuradas — não dá para confirmar a partir do repo se isso está setado, então é possível que a suíte E2E nunca rode em CI, só localmente; (c) não há SAST (ex: CodeQL, Semgrep) nem DAST, confirmando o item já listado como pendente em `PRODUCTION_CHECKLIST.md`.

**Recomendação concreta:** criar `MedSync.Tests` (xUnit) cobrindo, no mínimo, os testes negativos de autorização que hoje só existem em Playwright (mais rápido e mais confiável rodar 200 casos de "perfil X não pode ver Y" como teste de integração de API do que como E2E de browser). Priorizar: isolamento por `ClinicId`/`CompanyId`, bloqueio de dado clínico para empresa/financeiro/suporte, validação de upload, e a lógica de rate limit/senha temporária.

---

## 6. Segurança — checklist real vs. implementação

O projeto já mantém um `SECURITY_CHECKLIST.md` bem pensado, mas todos os itens estão com a caixa vazia (`[ ]`), o que não reflete o estado real — vários já estão implementados. Cruzando checklist com código:

**Já implementado (checklist deveria estar marcado):**
- Cookie de sessão HttpOnly, Secure condicional, SameSite configurável (`ApiEndpoints.cs:2892`).
- Nenhum token JWT salvo em localStorage (frontend só guarda o objeto de usuário em `localStorage`, não o token — o token vive só no cookie HttpOnly).
- JWT de curta duração (15 min).
- Rate limit no login (`AUTH_RATE_LIMIT_PER_MINUTE`, padrão 10/min, HTTP 429).
- CSP, Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy e HSTS configurados globalmente em `Program.cs`.
- Token LiveKit emitido só pelo backend, com TTL de 15 min, sem dado pessoal no nome da sala.
- Webhook de pagamento validado por assinatura HMAC-SHA256.
- Swagger habilitado só em `Development` (some fora disso).
- Seed demo protegido por `PRESENTATION_SEED_KEY` com comparação em tempo constante, e bloqueado por padrão fora de ambientes de desenvolvimento/homologação.

**Genuinamente ausente (checklist correto em apontar como gap):**
- **MFA** para médico, admin, auditor e financeiro: não existe nenhum código relacionado a segundo fator (nenhuma menção a TOTP/2FA no backend).
- **Refresh token rotativo**: não existe. O JWT expira em 15 minutos e não há endpoint de refresh — na prática, ou a sessão expira sem aviso e o usuário precisa logar de novo, ou (mais provável, a validar) o front tem algum comportamento não mapeado nesta análise. Vale confirmar qual é o comportamento hoje quando o token expira em uma sessão longa de consulta.
- **Tela "Minhas sessões" / revogação de sessão**: não existe endpoint nem tela para isso.
- **Log de falha de login auditado especificamente como tal**: existe auditoria genérica, mas não foi possível confirmar no código um evento dedicado de "falha de login" (vale checar `AuditWriter` com mais profundidade).
- **Nenhum handler de exceção global** (`app.UseExceptionHandler` ou `IExceptionHandler`): não há middleware central de tratamento de erro no backend. Isso não necessariamente vaza stack trace (o ASP.NET Core por padrão retorna 500 vazio fora de `Development`), mas significa respostas de erro inconsistentes entre endpoints e nenhum correlation ID central para depurar incidente em produção. Recomendo adicionar `ProblemDetails` centralizado.
- **Sem monitoramento de dependências desatualizadas além do `npm audit` no CI** — o lado .NET não tem nenhum scan de dependência equivalente (nenhum `dotnet list package --vulnerable` no pipeline).
- **Rate limiting só existe na política "auth"** (login, registro de clínica, seed de apresentação). Endpoints de dado (pacientes, consultas, prontuário) não têm rate limit — como exigem autenticação, o risco é menor, mas ainda vale um limite geral por IP/usuário para mitigar abuso ou vazamento por enumeração.

---

## 7. LGPD e privacidade

A mesma dinâmica se repete: `LGPD_CHECKLIST.md` está todo com caixas vazias, mas boa parte do trabalho técnico de suporte já existe — o que falta majoritariamente é **validação formal**, não código.

Implementado tecnicamente: portal de privacidade com solicitações do titular (`/privacidade`), bloqueio de dado clínico para perfis administrativos/financeiros/suporte (testado em `authorization.spec.ts` e correlatos), isolamento por CNPJ nas queries, trilha de auditoria para acesso a prontuário/registro ocupacional.

Ainda pendente e corretamente bloqueado até validação externa (isso é decisão certa da equipe, não um erro técnico): CNPJ técnico para pessoa física direta, acesso do ADM Médico do Trabalho a dado clínico ocupacional, documentos digitais (prescrição, atestado, encaminhamento), e qualquer claim de conformidade LGPD/CFM/ANS — todos marcados como `Bloqueado` no próprio `docs/14-roadmap`, dependendo de jurídico, DPO e diretor técnico. Está certo manter bloqueado; o risco aqui não é técnico, é de governança — vale garantir que essas aprovações estejam de fato agendadas, porque documentação sozinha não libera nada.

Não encontrado no código: inventário de dados pessoais por tela/endpoint/tabela, matriz de base legal por finalidade, política de retenção configurável por categoria, processo de exportação de dados do titular implementado de ponta a ponta (o endpoint de privacidade existe, mas não ficou claro se gera export estruturado dos dados). Isso é trabalho de produto/dados mais do que engenharia pura, mas precisa de dono e prazo.

---

## 8. Produção, DevOps e observabilidade

Este é o segundo maior gap depois de testes de backend.

**Observabilidade: inexistente.** Nenhuma integração de logging estruturado (Serilog), APM ou rastreamento de erro (Sentry, Application Insights, OpenTelemetry) foi encontrada nem no backend nem no frontend. Hoje, se a API cair em produção ou um usuário tomar um erro 500, a única forma de saber é alguém reclamar ou olhar log bruto manualmente — não há alerta automático. Para uma plataforma de saúde isso é inaceitável antes de qualquer uso real, mesmo piloto.

**Backup:** `docker-compose.yml` só define Postgres/Redis locais sem nenhuma rotina de backup — o que é esperado em dev, mas não há evidência de que backup criptografado e teste de restauração (itens do `PRODUCTION_CHECKLIST.md`) tenham sido configurados no ambiente real (Railway). Isso só é confirmável no painel do Railway, fora do alcance desta análise de código.

**Teste de carga:** nenhum script de load test (k6, Artillery, Gatling) encontrado no repositório. Item pendente confirmado.

**Deploy:** sem `vercel.json`/config de Railway versionada, a configuração de ambiente vive só nos painéis das plataformas — isso funciona, mas significa que não há histórico versionado de mudança de configuração de produção (env vars, domínios, redirects). Vale pelo menos documentar as env vars de produção fora do painel (sem os valores, só os nomes) para reduzir dependência de conhecimento tácito.

**Working tree com mudanças não commitadas:** o repositório local tem 20+ arquivos modificados e não commitados (migrations, `ApiEndpoints.cs`, várias páginas do frontend), e o último commit em `main` é de 20/07/2026 — mais de um mês antes desta análise (26/08/2026). Vale confirmar se isso é trabalho em andamento que precisa ser commitado/revisado, ou resíduo de uma sessão anterior, porque migrations modificadas e não commitadas são um risco real de dessincronia entre ambientes.

---

## 9. Sugestões de melhoria (layout, estrutura, produto)

Pela página pública e pela análise das rotas do frontend:

- A landing page comunica bem a proposta ("cuidado digital para empresas, sem transformar saúde em RH") e já separa claramente as quatro experiências (Care, Medical, Business, Privacy) — isso está alinhado com a diretriz de UX do próprio projeto de não parecer software de RH. Manter.
- A tela de login expõe corretamente a instrução de senha demo sem vazar a senha em si — bom padrão para ambiente de homologação pública.
- Acessibilidade: apenas 6 dos 25 arquivos `.tsx` do frontend usam `aria-label` ou `role`. Como o projeto tem uma diretriz própria de acessibilidade (`docs/02-design/ACCESSIBILITY_GUIDELINES.md`), vale uma varredura dedicada — especialmente nas telas de agenda, prontuário e formulários, que tendem a ter mais interação complexa (date pickers, uploads, tabelas).
- Vale considerar `HasQueryFilter` global (mencionado na seção 3) tanto como melhoria de segurança quanto de manutenibilidade — reduz código repetitivo de filtro em cada novo endpoint.
- Um endpoint de refresh token e uma tela simples de "sessões ativas" resolveriam dois itens do checklist de segurança de uma vez e melhorariam a experiência de quem usa o sistema por períodos longos (ex: médico numa manhã inteira de consultas).
- Considerar Sentry (ou equivalente) desde já, mesmo em homologação — colher volume real de erros antes de produção é mais barato do que descobrir problemas só depois do piloto.

---

## 10. Ferramentas/MCPs recomendados para reforçar a garantia de qualidade

Como pedido: aqui estão conectores disponíveis no registro que ajudariam diretamente a fechar os gaps acima. Nenhum foi conectado — são sugestões para você habilitar se fizer sentido:

- **Sentry** — monitoramento de erro e performance. Resolve diretamente o gap de observabilidade (seção 8) tanto no backend quanto no frontend.
- **Vercel** (conector oficial) — inspecionar deployments, logs e configuração de produção do frontend diretamente pelo Claude, sem depender de acesso manual ao painel.
- **Railway** — mesma lógica para a API: ver logs, status de deploy e variáveis de ambiente configuradas (sem expor os valores), útil para confirmar itens do `PRODUCTION_CHECKLIST.md` como "Swagger desabilitado em produção" ou "backup configurado".
- **Pi Security** — plataforma de segurança agente-a-agente, útil para revisão de design de segurança e findings automatizados; pode ajudar a substituir parte do trabalho manual de SAST/DAST listado como pendência.

Fora do registro de conectores, meu conselho de engenharia pura: priorizar a criação de um projeto **xUnit** no backend antes de qualquer MCP — nenhuma ferramenta externa substitui testes de integração de API cobrindo as regras de autorização e isolamento multiempresa, que são o ativo mais sensível deste sistema.

---

## 11. Plano de ação priorizado

**P0 — antes de qualquer piloto com empresa real, mesmo em homologação:**
1. Criar suíte de testes automatizados de backend (xUnit), priorizando autorização, isolamento multiempresa e upload de anexos.
2. Configurar observabilidade mínima (Sentry ou equivalente) em API e Web.
3. Implementar MFA para perfis sensíveis (médico, admin, auditor, financeiro).
4. Resolver/commitar as mudanças pendentes no working tree e confirmar que as migrations em andamento estão corretas.
5. Confirmar (via painel Railway/Vercel ou conector) se backup automatizado e teste de restauração já existem; se não, configurar.

**P1 — necessário para um piloto robusto:**
6. Refresh token rotativo + tela de sessões ativas.
7. Middleware central de tratamento de exceção (`ProblemDetails`).
8. `HasQueryFilter` global por tenant no EF Core.
9. Confirmar/ativar execução real do job de E2E no CI (variáveis de repositório).
10. Adicionar SAST (ex: CodeQL) e scan de dependência .NET ao pipeline.
11. Fechar o `TODO` de e-mail transacional de onboarding (hoje sem provedor integrado).

**P2 — antes de produção com pacientes reais (a maioria já é bloqueio formal reconhecido pela própria equipe):**
12. Pentest contratado e concluído.
13. Teste de carga.
14. Aprovações formais: jurídico, DPO, diretor técnico.
15. Inventário de dados pessoais e matriz de base legal publicados.
16. Política de retenção por categoria configurada.
17. Runbooks de incidente aprovados.

---

## 12. Conclusão

O MedSync não é um projeto no papel — é um sistema real, com autenticação funcionando, isolamento de dados aplicado, pagamento validado, vídeo com controle de consentimento e uma suíte E2E que passa. Isso é raro de ver neste estágio e é uma base genuinamente boa para construir em cima.

O que separa o estado atual de um lançamento responsável não é "mais funcionalidade" — é fechar os três buracos estruturais (testes de backend, observabilidade, segurança de sessão) e depois seguir o roteiro de validação formal que a própria equipe já desenhou nos checklists de segurança, LGPD e produção. Nenhum desses checklists precisa ser reinventado; eles só precisam ser **executados e marcados com evidência real**, em vez de ficarem como intenção documentada.
