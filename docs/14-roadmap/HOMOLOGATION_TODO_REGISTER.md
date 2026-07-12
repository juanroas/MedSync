# Registro de TODOs para Homologacao

Status: controle operacional para empresa contratante de teste. Este documento nao libera producao nem pacientes reais.

## Regra

TODO nao pode desaparecer sem uma das saidas abaixo:

- `Implementado`: existe codigo/tela/API.
- `Validado`: existe evidencia de teste.
- `Bloqueado`: depende de decisao externa, juridico, DPO, diretor tecnico ou seguranca.
- `Aceito com restricao`: pode seguir em homologacao com risco documentado.

## P0 - Bloqueia empresa de teste

| ID | TODO | Status | Evidencia ou proximo passo |
|---|---|---|---|
| HTD-P0-001 | Remover linguagem de clinica da experiencia B2B principal | Validado | `company-registration-copy.spec.ts` |
| HTD-P0-002 | Paciente atualizar dados cadastrais permitidos | Validado | `profile-crud.spec.ts`; `PUT /patients/{id}` |
| HTD-P0-003 | Medico atualizar perfil profissional permitido | Validado | `profile-crud.spec.ts`; `PUT /doctors/{id}` |
| HTD-P0-004 | Admin Plataforma acessar equipe e acessos | Validado | `access-management.spec.ts`; menu `/acessos` liberado para `PlatformAdmin` |
| HTD-P0-005 | Empresa/financeiro/auditor sem acesso clinico individual | Validado parcial | Testes negativos existentes; ampliar por endpoint quando novos fluxos surgirem |
| HTD-P0-006 | Ambiente Docker/local/HML/apresentacao unica com API atualizada | Validado parcial | `medsync-api-local` em `8080`; HML usa `ASPNETCORE_ENVIRONMENT=Homologation` e `SEED_DEMO_PASSWORD`; ambiente unico `Production` exige `ALLOW_PRESENTATION_SEED_IN_PRODUCTION=true` e confirmacao demo; seed manual em `/ops/presentation-seed` com `PRESENTATION_SEED_KEY`; validar a cada nova fatia |
| HTD-P0-007 | Cadastro assistido de empresa pelo suporte com campos limitados e CNPJ mascarado | Validado | `/empresas`; `POST /companies/onboarding`; `company-onboarding.spec.ts`; `company-registration-copy.spec.ts` |
| HTD-P0-008 | Habilitacao de CNPJ restrita ao ADM MedSync | Validado | `/elegibilidade`; `GET /companies/activation`; `PUT /companies/{id}/activation`; suporte nao ve acao de habilitar em `company-onboarding.spec.ts` |
| HTD-P0-009 | Equipe e acessos separada por escopo MedSync versus empresa | Validado | `access-management.spec.ts`; PlatformAdmin ve apenas perfis MedSync; CompanyAdmin ve apenas perfis empresariais |
| HTD-P0-010 | Todos os perfis editam dados pessoais permitidos | Validado | `/perfil`; `GET /profile`; `PUT /profile`; `personal-profile.spec.ts` com 23 cenarios Chromium |

## P1 - Necessario para piloto robusto

| ID | TODO | Status | Proximo passo |
|---|---|---|---|
| HTD-P1-001 | Elegibilidade administrativa da empresa | Validado | `eligibility-management.spec.ts`; `GET /company-beneficiaries`; `PUT /company-beneficiaries/{id}/eligibility`; Financeiro recebe `403` |
| HTD-P1-002 | Historico/faturas do Financeiro Empresa | Validado | `finance-invoices.spec.ts`; `GET /finance/invoices`; Medico recebe `403` |
| HTD-P1-003 | Auditoria por perfil com eventos uteis | Validado | `audit-events.spec.ts`; filtros por resultado/busca; eventos negados com motivo minimizado |
| HTD-P1-004 | CNPJ tecnico para pessoa fisica direta | Bloqueado | Validacao comercial, juridica, DPO e responsavel tecnico antes de uso real |
| HTD-P1-005 | DPO/direitos do titular | Validado | `privacy-requests.spec.ts`; `/privacidade`; `GET/POST /privacy/requests`; `PUT /privacy/requests/{id}/status`; Financeiro recebe `403` |
| HTD-P1-006 | Seed multiempresa para homologacao | Validado | `multi-company-seed.spec.ts`; Empresa Demo, Empresa Alfa e Empresa Beta em tenants separados |
| HTD-P1-007 | Relatorios B2B agregados por CNPJ/periodo | Validado | `business-reports.spec.ts`; `/relatorios`; `GET /reports/business-summary`; empresa ve proprio CNPJ; plataforma ve comparativo minimizado |
| HTD-P1-008 | Envio transacional de e-mail de onboarding | Pendente | Produto gera previa operacional; integrar provedor, template aprovado e regra de senha temporaria |

## P2 - Pode seguir em homologacao com restricao

| ID | TODO | Status | Restricao |
|---|---|---|---|
| HTD-P2-001 | Exportacao financeira | Validado | `business-reports.spec.ts`; `GET /finance/export`; botao CSV em `/relatorios`; empresa exporta proprio CNPJ; MedSync exporta visao global minimizada |
| HTD-P2-002 | Relatorios avancados por periodo | Validado parcial | Relatorio B2B agregado implementado; ainda falta detalhar cortes avancados aprovados |
| HTD-P2-003 | Disponibilidade por especialidade | Validado parcial | `GET /care/specialties`; `POST /appointments/request`; `patient-appointment-request.spec.ts`; ainda falta catalogo formal de especialidades, escala real e credenciamento completo |

## Bloqueados por validacao externa

| ID | TODO | Bloqueio |
|---|---|
| HTD-BLK-001 | ADM Medico do Trabalho acessar dado ocupacional | Juridico, DPO e diretor tecnico |
| HTD-BLK-002 | Documentos digitais: prescricao, atestado, encaminhamento | Juridico, CFM, DPO e diretor tecnico |
| HTD-BLK-003 | Uso real com pacientes | QA completo, LGPD, CFM, seguranca, juridico e operacao |
| HTD-BLK-004 | Claim de conformidade LGPD/CFM/ANS | Revisao formal |

## Proxima ordem de execucao

1. Revisar bloqueios externos antes de qualquer uso real.
2. Evoluir P2 quando a empresa piloto confirmar prioridade: exportacao financeira, relatorios avancados e disponibilidade por especialidade.
3. Executar rodada UAT com empresa teste usando os perfis homologados.

## Referencias

- [Reference Aligned Implementation Plan](REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
- [Plano de Homologacao por Perfis](../08-quality/PROFILE_UAT_HOMOLOGATION_PLAN.md)
- [Casos UAT por perfil](../../qa/profile-uat-test-cases.md)
- [Production Checklist](../09-production/PRODUCTION_CHECKLIST.md)
