# Reference Aligned Implementation Plan - MedSync

Status: plano de execucao local/homologacao. Nao aprova producao nem uso com pacientes reais.

## Objetivo

Transformar as referencias de mercado e de Agent Skills em execucao rastreavel, evitando que o projeto fique preso em documentacao sem produto.

## Regra

Nenhum item abaixo deve ser tratado como concluido enquanto nao tiver evidencia. Se houver apenas documento, o status deve ser `Documentado` ou `Especificado`, nunca `Implementado`.

## Trilha P0 - Corrigir percepcao do produto

### P0.1 Home Care

Objetivo: a primeira tela do paciente/beneficiario deve parecer saude digital, nao sistema administrativo.

Escopo:

- Proxima consulta.
- Acao principal para acessar cuidado/agendar.
- Status seguro de elegibilidade, consentimento, pagamento e sala.
- Estados loading, empty, blocked, forbidden e error.

Evidencia esperada:

- Tela navegavel local/homologacao.
- Print ou screenshot Playwright.
- Teste de permissao paciente.

Status: `Implementado parcial`.

Evidencia registrada:

- `npm run typecheck:web`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium patient-care-dashboard.spec.ts`
- Ambiente local: web `http://localhost:3003`, API `http://localhost:8082`.

### P0.2 Portal Empresa

Objetivo: empresa/parceiro deve ver contrato, plano, elegibilidade, faturas e uso agregado sem dado clinico individual.

Escopo:

- Dashboard empresarial agregado.
- Elegibilidade administrativa.
- Faturas/status financeiro.
- Bloqueio de diagnostico, prontuario, observacao clinica e conteudo de chamada.

Evidencia esperada:

- Tela navegavel local/homologacao.
- Teste negativo de acesso clinico.
- Dados agregados sem reidentificacao.

Status: `Implementado parcial`.

Evidencia registrada:

- Endpoint agregado `GET /company-portal`.
- Tela navegavel de Portal Empresa em `/dashboard` para `CompanyAdmin`, `CompanyFinance` e `CompanyAuditor`.
- `dotnet build apps/api/MedSync.sln`
- `npm run typecheck:web`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 company-business-dashboard.spec.ts patient-care-dashboard.spec.ts`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 authorization.spec.ts`
- Ambiente local: web `http://localhost:3003`, API `http://localhost:8082`.

### P0.3 Jornada Consulta

Objetivo: aproximar o MedSync das plataformas de consulta online, com caminho claro para atendimento.

Escopo:

- Agendar consulta.
- Sala de espera.
- Termo/consentimento.
- Entrada autorizada na teleconsulta.
- Bloqueio seguro quando nao autorizado.

Evidencia esperada:

- Fluxo E2E em homologacao.
- Token LiveKit emitido apenas para participante autorizado.

Status: `Implementado parcial`.

Evidencia registrada:

- Paciente elegivel pode solicitar consulta por especialidade em `/consultas/nova`.
- Endpoints `GET /care/specialties` e `POST /appointments/request`.
- Pool assistencial: medico comum/generalista/especialista e criado/credenciado pela operacao MedSync, nao pela empresa contratante.
- API vincula automaticamente um medico disponivel na especialidade solicitada e bloqueia quando nao ha disponibilidade.
- Paciente ve consultas do proprio tenant; medico ve consultas vinculadas a ele mesmo, mesmo quando atende beneficiario de outro CNPJ.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 patient-appointment-request.spec.ts consultation-flow.spec.ts`
- E2E focado: 2 passed, 1 skipped (`consultation-flow.spec.ts` exige `MEDSYNC_E2E_MUTATING=1`).

### P0.4 Perfis B2B e CNPJ tecnico

Objetivo: refletir o modelo definido pelo usuario em codigo e testes.

Escopo:

- Empresa/parceiro admin.
- Financeiro empresa.
- Financeiro plataforma.
- Suporte MedSync.
- Auditor empresa/plataforma.
- DPO/privacidade.
- ADM Medico do Trabalho.
- CNPJ tecnico para pessoa fisica assistida.

Evidencia esperada:

- Login por perfil.
- Seed demo.
- Testes negativos de autorizacao.

Status: `Implementado parcial`.

Evidencia adicional:

- [Profile Experience Restructure](../01-product/PROFILE_EXPERIENCE_RESTRUCTURE.md)
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 profile-experience.spec.ts company-business-dashboard.spec.ts patient-care-dashboard.spec.ts`

### P0.5 Homologacao por perfil para empresa de teste

Objetivo: liberar uma empresa piloto somente em ambiente de homologacao, com roteiro por perfil, conversa cruzada e evidencias.

Escopo:

- Corrigir linguagem remanescente de clinica/admin clinica na experiencia B2B principal.
- Executar QA por perfil: empresa admin, paciente, medico, financeiro, auditoria, plataforma, DPO e suporte.
- Validar jornada cruzada empresa -> paciente -> medico -> financeiro -> auditoria.
- Registrar evidencias, falhas P0/P1/P2/P3 e decisao go/no-go.

Evidencia esperada:

- [Plano de Homologacao por Perfis](../08-quality/PROFILE_UAT_HOMOLOGATION_PLAN.md)
- [Casos UAT por perfil](../../qa/profile-uat-test-cases.md)
- Teste de regressao da tela de cadastro empresarial.
- Ata curta da conversa entre perfis.

Status: `Implementado parcial`.

Evidencia registrada:

- Cadastro empresarial sem linguagem de clinica na tela `/cadastro`.
- Formularios de atualizacao permitida para Paciente e Medico.
- Endpoints `PUT /patients/{id}` e `PUT /doctors/{id}` com auditoria.
- Admin Plataforma com acesso a tela `Equipe e acessos`.
- Elegibilidade administrativa da empresa em `/elegibilidade`.
- Endpoints `GET /company-beneficiaries` e `PUT /company-beneficiaries/{id}/eligibility`.
- Historico financeiro minimizado no dashboard de Financeiro Empresa.
- Endpoint `GET /finance/invoices`.
- Auditoria operacional com busca, filtro por resultado e destaque de tentativas negadas.
- Eventos negados para acesso indevido a elegibilidade e financeiro, com motivo minimizado.
- Fluxo DPO/direitos do titular em `/privacidade`, com registro, fila, status e nota operacional minimizada.
- Endpoints `GET/POST /privacy/requests` e `PUT /privacy/requests/{id}/status`.
- Seed multiempresa com Empresa Demo, Empresa Alfa e Empresa Beta em tenants separados para homologacao de perfis e isolamento.
- Relatorios B2B agregados em `/relatorios`, com comparativo por CNPJ para perfis MedSync e escopo proprio para empresa contratante.
- Endpoint `GET /reports/business-summary`, com ocultacao de uso quando nao ha grupo minimo e sem retorno de dado clinico individual.
- Exportacao financeira minimizada em `/relatorios`, com `GET /finance/export`.
- Cadastro empresarial em `/cadastro` cria empresa, CNPJ, plano, valor mensal, contrato ativo e usuario `CompanyAdmin`.
- Cadastro empresarial direto foi substituido por onboarding assistido em `/empresas` para `Support` e `PlatformAdmin`.
- Campos de onboarding empresarial aplicam limites, validacao e mascara visual de CNPJ, persistindo CNPJ normalizado.
- Onboarding assistido cria empresa inativa, plano, contrato inicial e ADM empresa com senha temporaria.
- Produto gera previa operacional do e-mail de onboarding; envio transacional real permanece pendente.
- Habilitacao/desabilitacao de CNPJ em `/elegibilidade` e restrita a `PlatformAdmin`.
- Suporte MedSync pode cadastrar empresa, mas nao habilita CNPJ.
- `PlatformAdmin` gerencia apenas perfis MedSync em `/acessos`; `CompanyAdmin` gerencia apenas perfis empresariais.
- Seed de homologacao habilitado para `ASPNETCORE_ENVIRONMENT=Homologation` com `SEED_DEMO_PASSWORD`, bloqueado em `Production`.
- Seed multiempresa expandido para cinco beneficiarios administrativos ficticios por CNPJ, permitindo demonstracao de relatorios agregados.
- Perfis empresariais administrativos nao acessam lista individual de consultas por API.
- Empresa admin acessa equipe e acessos, mas cria apenas `CompanyAdmin`, `CompanyFinance` e `CompanyAuditor`.
- Registro de TODOs de homologacao em [Homologation TODO Register](HOMOLOGATION_TODO_REGISTER.md).
- Teste negativo: Empresa Admin recebe `403` ao tentar atualizar paciente.
- Teste negativo: Financeiro Empresa recebe `403` ao tentar atualizar medico.
- `dotnet build apps/api/MedSync.sln`
- `npm run typecheck:web`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 profile-crud.spec.ts profile-experience.spec.ts`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 access-management.spec.ts profile-experience.spec.ts`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 eligibility-management.spec.ts access-management.spec.ts profile-experience.spec.ts`
- API: Company Admin lista/atualiza elegibilidade com `200`; Financeiro Empresa recebe `403` na lista individual.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 finance-invoices.spec.ts eligibility-management.spec.ts`
- API: Financeiro Empresa lista faturas com `200`; Medico recebe `403` em faturas.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 audit-events.spec.ts finance-invoices.spec.ts eligibility-management.spec.ts`
- E2E: Financeiro Empresa recebe `403` em elegibilidade individual; Auditor Empresa ve `CompanyEligibility.List` negado, sem dado clinico.
- Migration `20260710132637_AddPrivacyRequests`.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 privacy-requests.spec.ts audit-events.spec.ts`
- E2E: Paciente registra solicitacao de privacidade; DPO atualiza status; Financeiro Empresa recebe `403` e nao ve menu de privacidade.
- [Contas Demo de Homologacao](../08-quality/DEMO_ACCOUNTS.md)
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 multi-company-seed.spec.ts finance-invoices.spec.ts eligibility-management.spec.ts audit-events.spec.ts privacy-requests.spec.ts`
- E2E: Empresa Demo, Alfa e Beta acessam o proprio portal por tenant; Empresa Alfa nao exibe dados da Empresa Beta.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 business-reports.spec.ts multi-company-seed.spec.ts finance-invoices.spec.ts eligibility-management.spec.ts audit-events.spec.ts privacy-requests.spec.ts`
- E2E: Empresa ve somente o proprio CNPJ; plataforma compara Empresa Demo, Alfa e Beta; paciente recebe `403` e nao ve menu de relatorios.
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1`
- E2E completo: 42 passed, 1 skipped (`consultation-flow.spec.ts` exige `MEDSYNC_E2E_MUTATING=1`).
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 company-onboarding.spec.ts access-management.spec.ts eligibility-management.spec.ts company-registration-copy.spec.ts`
- E2E focado: 8 passed.
- Paciente Empresa Beta/Empresa2 solicita consulta por especialidade em `/consultas/nova`.
- `patient-appointment-request.spec.ts`: paciente `paciente.empresa2` solicita `Clinica geral`; API bloqueia especialidade inexistente com `409`.

## Trilha P1 - Profundidade assistencial

### P1.1 Perfil medico confiavel

Objetivo: aumentar confianca com CRM, UF, especialidade, agenda e escopo autorizado.

Status: `Mapeado`.

### P1.2 Especialidades e linhas de cuidado

Objetivo: definir oferta inicial com clinico geral, saude mental, pediatria ou outras linhas.

Status: `Bloqueado` por decisao de produto/diretor tecnico.

### P1.3 Documentos digitais

Objetivo: avaliar prescricao, atestado e encaminhamento.

Status: `Bloqueado` por validacao juridica, CFM, DPO e diretor tecnico.

## Trilha P1 - Skills e execucao de agentes

### P1.4 Skills project-local completas

Objetivo: aproximar as skills do padrao das plataformas indicadas.

Escopo:

- `SKILL.md` com trigger claro.
- Referencias carregadas sob demanda.
- Output contract verificavel.
- Guardrails anti-ilusao.

Status: `Implementado parcial`.

### P1.5 Workflow obrigatorio referencia -> produto -> codigo

Objetivo: impedir que referencias virem apenas texto.

Status: `Implementado` em documentos e skills; `Validado` quando aplicado nas proximas tarefas.

## Checklist por entrega futura

- [ ] Referencia rastreada.
- [ ] Capacidade MedSync definida.
- [ ] Tela/fluxo afetado definido.
- [ ] Especificacao atualizada.
- [ ] Permissao/LGPD avaliada.
- [ ] Backlog atualizado.
- [ ] Codigo implementado quando pedido.
- [ ] Build/typecheck/teste executado.
- [ ] Evidencia registrada.

## Referencias

- [Reference Traceability Matrix](../01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [MVP Backlog](MVP_BACKLOG.md)
- [MVP Screen Flow](../02-design/MVP_SCREEN_FLOW.md)
- [Execution Guardrails](../agentes/EXECUTION_GUARDRAILS.md)
