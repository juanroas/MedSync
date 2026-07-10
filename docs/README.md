# Objetivo

Ser a fonte unica de verdade da documentacao Enterprise do MedSync.

Visao Geral: o MedSync esta documentado por dominios para apoiar desenvolvimento humano, revisao tecnica e agentes de IA. Esta documentacao preserva o status de homologacao controlada e nao declara conformidade regulatoria ou prontidao para pacientes reais sem aprovacoes formais.

# Escopo

Esta documentacao cobre:

- Produto e modelo B2B.
- Design, UX e assets documentais.
- Arquitetura, API, database e specifications.
- Seguranca, LGPD, qualidade e producao.
- DevOps, roadmap, ADRs, referencias e agentes de IA.

Fora de escopo deste indice:

- Codigo da aplicacao.
- Infraestrutura executavel.
- Dados sensiveis, credenciais ou segredos.
- Regras, APIs ou tabelas ficticias.

# Estrutura

Estrutura das pastas:

- [01-product](01-product/README.md): produto, discovery e modelo B2B.
- [02-design](02-design/README.md): UX, UI e design system.
- [03-architecture](03-architecture/README.md): arquitetura e subdominios tecnicos.
- [04-business](04-business/README.md): portal empresa e contexto B2B.
- [05-collaborator](05-collaborator/README.md): jornada do paciente/beneficiario.
- [06-medical](06-medical/README.md): portal medico e contexto clinico.
- [07-security](07-security/README.md): seguranca, privacidade e LGPD.
- [08-quality](08-quality/README.md): QA, checklist e evidencias.
- [09-production](09-production/README.md): producao, homologacao e riscos.
- [10-decisions](10-decisions/README.md): ADRs e decisoes.
- [11-api](11-api/README.md): contratos e convencoes de API.
- [12-database](12-database/README.md): banco, migrations, seed, backup e restore.
- [13-devops](13-devops/README.md): operacao, CI/CD, observabilidade e runbooks.
- [14-roadmap](14-roadmap/README.md): roadmap e planejamento.
- [16-specifications](16-specifications/README.md): especificacoes de dominio.
- [reference](reference/README.md): glossario, terminologia e referencias.
- [assets](assets/README.md): imagens, diagramas e fontes visuais.
- [agentes](agentes/README.md): agentes, prompts, workflows e templates.
- [DEVELOPMENT_READINESS.md](DEVELOPMENT_READINESS.md): criterio para iniciar desenvolvimento controlado.
- [agentes/EXECUTION_GUARDRAILS.md](agentes/EXECUTION_GUARDRAILS.md): protocolo anti-ilusao e rastreabilidade obrigatoria.

# Fluxo

Fluxo de leitura recomendado:

1. [01-product/PRODUCT_VISION.md](01-product/PRODUCT_VISION.md)
2. [01-product/PRODUCT_POSITIONING.md](01-product/PRODUCT_POSITIONING.md)
3. [01-product/MARKET_REFERENCES.md](01-product/MARKET_REFERENCES.md)
4. [01-product/REFERENCE_TRACEABILITY_MATRIX.md](01-product/REFERENCE_TRACEABILITY_MATRIX.md)
5. [01-product/MVP_SCOPE.md](01-product/MVP_SCOPE.md)
6. [01-product/ACTOR_ORGANIZATION_MODEL.md](01-product/ACTOR_ORGANIZATION_MODEL.md)
7. [01-product/DATA_MANAGEMENT_CRUD.md](01-product/DATA_MANAGEMENT_CRUD.md)
8. [01-product/BUSINESS_MODEL.md](01-product/BUSINESS_MODEL.md)
9. [01-product/PERSONAS.md](01-product/PERSONAS.md)
10. [01-product/USER_JOURNEYS.md](01-product/USER_JOURNEYS.md)
11. [01-product/FEATURE_CATALOG.md](01-product/FEATURE_CATALOG.md)
12. [01-product/INFORMATION_ARCHITECTURE.md](01-product/INFORMATION_ARCHITECTURE.md)
13. [01-product/ROADMAP.md](01-product/ROADMAP.md)
14. [01-product/B2B_MODEL.md](01-product/B2B_MODEL.md)
15. [01-product/PRODUCT_BLUEPRINT_B2B.md](01-product/PRODUCT_BLUEPRINT_B2B.md)
16. [02-design/UX_GUIDELINES.md](02-design/UX_GUIDELINES.md)
17. [02-design/MVP_SCREEN_FLOW.md](02-design/MVP_SCREEN_FLOW.md)
18. [02-design/COMPONENT_LIBRARY.md](02-design/COMPONENT_LIBRARY.md)
19. [03-architecture/ARCHITECTURE_OVERVIEW.md](03-architecture/ARCHITECTURE_OVERVIEW.md)
20. [03-architecture/MODULE_BOUNDARIES.md](03-architecture/MODULE_BOUNDARIES.md)
21. [11-api/README.md](11-api/README.md)
22. [12-database/README.md](12-database/README.md)
23. [07-security/README.md](07-security/README.md)
24. [07-security/PERMISSION_MATRIX.md](07-security/PERMISSION_MATRIX.md)
25. [16-specifications/README.md](16-specifications/README.md)
26. [16-specifications/IDENTITY_ACCESS_SPEC.md](16-specifications/IDENTITY_ACCESS_SPEC.md)
27. [16-specifications/B2B_COMPANY_SPEC.md](16-specifications/B2B_COMPANY_SPEC.md)
28. [16-specifications/PATIENT_CARE_SPEC.md](16-specifications/PATIENT_CARE_SPEC.md)
29. [16-specifications/MEDICAL_ATTENDANCE_SPEC.md](16-specifications/MEDICAL_ATTENDANCE_SPEC.md)
30. [16-specifications/OCCUPATIONAL_HEALTH_SPEC.md](16-specifications/OCCUPATIONAL_HEALTH_SPEC.md)
31. [16-specifications/FINANCE_SPEC.md](16-specifications/FINANCE_SPEC.md)
32. [16-specifications/AUDIT_PRIVACY_SPEC.md](16-specifications/AUDIT_PRIVACY_SPEC.md)
33. [08-quality/README.md](08-quality/README.md)
34. [08-quality/AUTHORIZATION_TEST_MATRIX.md](08-quality/AUTHORIZATION_TEST_MATRIX.md)
35. [09-production/README.md](09-production/README.md)
36. [10-decisions/README.md](10-decisions/README.md)
37. [14-roadmap/MVP_BACKLOG.md](14-roadmap/MVP_BACKLOG.md)
38. [14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md](14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
39. [agentes/SKILLS_STANDARD.md](agentes/SKILLS_STANDARD.md)
40. [agentes/EXECUTION_GUARDRAILS.md](agentes/EXECUTION_GUARDRAILS.md)
41. [DEVELOPMENT_READINESS.md](DEVELOPMENT_READINESS.md)

Guia para novos desenvolvedores:

1. Comece pelo [README principal](../README.md).
2. Leia este indice.
3. Consulte produto, arquitetura, API, database, seguranca e QA antes de propor mudancas.
4. Use `TODO` quando houver lacuna ainda nao validada.
5. Atualize ADRs, specifications e reference quando houver decisao ou regra aprovada.

Como utilizar IA no projeto:

1. Ler [AI_AGENT_RULES.md](agentes/AI_AGENT_RULES.md).
2. Ler [EXECUTION_GUARDRAILS.md](agentes/EXECUTION_GUARDRAILS.md).
3. Ler [SKILLS_STANDARD.md](agentes/SKILLS_STANDARD.md).
4. Selecionar uma skill project-local em `.agents/skills`.
5. Selecionar o perfil em [agentes/agents](agentes/agents/) quando necessario.
6. Consultar o prompt correspondente em [agentes/prompts](agentes/prompts/).
7. Executar o workflow apropriado em [agentes/workflows](agentes/workflows/).
8. Registrar saidas com os templates de [agentes/templates](agentes/templates/).

Como criar ADRs:

1. Copiar [ADR-0000.md](10-decisions/ADR-0000.md).
2. Criar um novo arquivo numerado em `docs/10-decisions/`.
3. Preencher status, contexto, decisao, alternativas, consequencias e referencias.
4. Linkar o ADR nos documentos afetados.

Como documentar novas funcionalidades:

1. Criar ou atualizar especificacao em [16-specifications](16-specifications/README.md).
2. Atualizar API, database, QA, seguranca e produto quando aplicavel.
3. Registrar regra aprovada em [reference/Business-Rules.md](reference/Business-Rules.md).
4. Criar ADR se a decisao tiver impacto estrutural.
5. Manter lacunas marcadas como `TODO`.

# Boas práticas

- Nao modificar codigo para atender demandas documentais.
- Nao tratar documentacao como produto implementado.
- Nao finalizar tarefa com referencias externas sem matriz de rastreabilidade.
- Nao inventar regras de negocio.
- Nao criar APIs, tabelas ou infraestrutura ficticias.
- Nao registrar dados pessoais reais, credenciais, tokens ou segredos.
- Manter links relativos validos.
- Preferir documentos pequenos, rastreaveis e linkados.
- Preservar historico; nao apagar documentos sem decisao registrada.

# Checklist

Checklist para Pull Request documental:

- [ ] A mudanca respeita o escopo documental.
- [ ] Nenhum arquivo existente foi removido sem ADR ou decisao explicita.
- [ ] Novos placeholders estao marcados como `TODO`.
- [ ] Links Markdown locais foram validados.
- [ ] `docs/README.md` foi atualizado quando houve nova pasta ou documento canonico.
- [ ] READMEs seguem o formato padrao.
- [ ] Nao ha dados sensiveis ou segredos.
- [ ] Nao ha regra, endpoint, tabela ou infraestrutura ficticia.
- [ ] QA, seguranca, produto e arquitetura foram linkados quando aplicavel.

# Referências

- [README principal](../README.md)
- [Regras dos agentes](agentes/AI_AGENT_RULES.md)
- [Execution Guardrails](agentes/EXECUTION_GUARDRAILS.md)
- [Padrao de skills](agentes/SKILLS_STANDARD.md)
- [Development Readiness](DEVELOPMENT_READINESS.md)
- [Prompt atual](prompt.md)
- [Auditoria documental](03-architecture/DOCUMENTATION_AUDIT.md)
- [Plano QA externo](../qa/README.md)
