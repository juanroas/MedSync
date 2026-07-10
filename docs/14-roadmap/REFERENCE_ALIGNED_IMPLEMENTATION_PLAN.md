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
