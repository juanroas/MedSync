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
| HTD-P0-006 | Ambiente Docker/local/HML com API atualizada | Validado parcial | `medsync-api-local` em `8080`; HML usa `ASPNETCORE_ENVIRONMENT=Homologation` e `SEED_DEMO_PASSWORD`; validar a cada nova fatia |

## P1 - Necessario para piloto robusto

| ID | TODO | Status | Proximo passo |
|---|---|---|---|
| HTD-P1-001 | Elegibilidade administrativa da empresa | Validado | `eligibility-management.spec.ts`; `GET /company-beneficiaries`; `PUT /company-beneficiaries/{id}/eligibility`; Financeiro recebe `403` |
| HTD-P1-002 | Historico/faturas do Financeiro Empresa | Validado | `finance-invoices.spec.ts`; `GET /finance/invoices`; Medico recebe `403` |
| HTD-P1-003 | Auditoria por perfil com eventos uteis | Validado | `audit-events.spec.ts`; filtros por resultado/busca; eventos negados com motivo minimizado |
| HTD-P1-004 | CNPJ tecnico para pessoa fisica direta | Bloqueado | Validacao juridica, DPO e responsavel tecnico |
| HTD-P1-005 | DPO/direitos do titular | Validado | `privacy-requests.spec.ts`; `/privacidade`; `GET/POST /privacy/requests`; `PUT /privacy/requests/{id}/status`; Financeiro recebe `403` |
| HTD-P1-006 | Seed multiempresa para homologacao | Validado | `multi-company-seed.spec.ts`; Empresa Demo, Empresa Alfa e Empresa Beta em tenants separados |
| HTD-P1-007 | Relatorios B2B agregados por CNPJ/periodo | Validado | `business-reports.spec.ts`; `/relatorios`; `GET /reports/business-summary`; empresa ve proprio CNPJ; plataforma ve comparativo minimizado |

## P2 - Pode seguir em homologacao com restricao

| ID | TODO | Status | Restricao |
|---|---|---|---|
| HTD-P2-001 | Exportacao financeira | Validado | `business-reports.spec.ts`; `GET /finance/export`; botao CSV em `/relatorios`; empresa exporta proprio CNPJ; MedSync exporta visao global minimizada |
| HTD-P2-002 | Relatorios avancados por periodo | Validado parcial | Relatorio B2B agregado implementado; ainda falta detalhar cortes avancados aprovados |
| HTD-P2-003 | Disponibilidade por especialidade | Pendente | Agenda demo fixa enquanto regra final nao for aprovada |

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
