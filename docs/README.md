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
- [05-collaborator](05-collaborator/README.md): jornada do colaborador.
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

# Fluxo

Fluxo de leitura recomendado:

1. [01-product/PRODUCT_VISION.md](01-product/PRODUCT_VISION.md)
2. [01-product/BUSINESS_MODEL.md](01-product/BUSINESS_MODEL.md)
3. [01-product/PERSONAS.md](01-product/PERSONAS.md)
4. [01-product/USER_JOURNEYS.md](01-product/USER_JOURNEYS.md)
5. [01-product/FEATURE_CATALOG.md](01-product/FEATURE_CATALOG.md)
6. [01-product/INFORMATION_ARCHITECTURE.md](01-product/INFORMATION_ARCHITECTURE.md)
7. [01-product/ROADMAP.md](01-product/ROADMAP.md)
8. [01-product/B2B_MODEL.md](01-product/B2B_MODEL.md)
9. [01-product/PRODUCT_BLUEPRINT_B2B.md](01-product/PRODUCT_BLUEPRINT_B2B.md)
10. [03-architecture/README.md](03-architecture/README.md)
11. [11-api/README.md](11-api/README.md)
12. [12-database/README.md](12-database/README.md)
13. [07-security/README.md](07-security/README.md)
14. [08-quality/README.md](08-quality/README.md)
15. [09-production/README.md](09-production/README.md)
16. [10-decisions/README.md](10-decisions/README.md)
17. [agentes/README.md](agentes/README.md)

Guia para novos desenvolvedores:

1. Comece pelo [README principal](../README.md).
2. Leia este indice.
3. Consulte produto, arquitetura, API, database, seguranca e QA antes de propor mudancas.
4. Use `TODO` quando houver lacuna ainda nao validada.
5. Atualize ADRs, specifications e reference quando houver decisao ou regra aprovada.

Como utilizar IA no projeto:

1. Ler [AI_AGENT_RULES.md](agentes/AI_AGENT_RULES.md).
2. Selecionar o perfil em [agentes/agents](agentes/agents/).
3. Consultar o prompt correspondente em [agentes/prompts](agentes/prompts/).
4. Executar o workflow apropriado em [agentes/workflows](agentes/workflows/).
5. Registrar saidas com os templates de [agentes/templates](agentes/templates/).

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
- [Prompt atual](prompt.md)
- [Auditoria documental](03-architecture/DOCUMENTATION_AUDIT.md)
- [Plano QA externo](../qa/README.md)
