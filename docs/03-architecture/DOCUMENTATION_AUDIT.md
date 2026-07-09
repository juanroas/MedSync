# Objetivo

Registrar a auditoria e reorganizacao documental do MedSync para uma estrutura Enterprise de produto SaaS B2B de Saude Digital.

Data: 2026-07-08

# Escopo

Esta auditoria cobre exclusivamente documentacao:

- `docs/`
- `docs/agentes/`
- referencias para `qa/`
- referencias no `README.md` principal

Restricoes preservadas:

- Nenhuma alteracao funcional.
- Nenhuma tela nova.
- Nenhuma alteracao em API.
- Nenhuma alteracao em banco.
- Nenhuma migration.
- Nenhuma alteracao em `apps/`, `infra/`, `scripts/` ou `qa/`.

# Responsabilidades

- Produto: manter descoberta, modelo B2B e roadmap.
- Design: manter UX/UI e design system.
- Engenharia: manter arquitetura, API, banco, devops e decisoes.
- Seguranca e privacidade: manter LGPD, controles, riscos e incidentes.
- QA: manter checklists, planos e evidencias.
- Agentes: seguir `docs/agentes/AI_AGENT_RULES.md` e os workflows documentados.

# Fluxo

## Estrutura anterior

Antes da reorganizacao, documentos de dominios diferentes estavam concentrados em `docs/` e `docs/agentes/`:

```text
docs/
  B2B_MODEL.md
  DOCUMENTATION_AUDIT.md
  LGPD_CHECKLIST.md
  PLANO_PRODUCAO.md
  PRODUCT_BLUEPRINT_B2B.md
  PRODUCTION_CHECKLIST.md
  QA_CHECKLIST.md
  README.md
  RELATORIO_HOMOLOGACAO.md
  RISK_REGISTER.md
  SECURITY_CHECKLIST.md
  agentes/
    AI_AGENT_RULES.md
    prompt.md
    prompt_agente.md
    Sprint 1 ...
    Sprint 8 ...
```

## Estrutura atual

```text
docs/
  README.md
  01-product/
  02-design/
  03-architecture/
  04-business/
  05-collaborator/
  06-medical/
  07-security/
  08-quality/
  09-production/
  10-decisions/
  11-api/
  12-database/
  13-devops/
  14-roadmap/
  agentes/
    README.md
    AI_AGENT_RULES.md
    prompts/
    workflows/
    templates/
```

## Arquivos movidos e renomeados

| Origem | Destino |
|---|---|
| `docs/B2B_MODEL.md` | `docs/01-product/B2B_MODEL.md` |
| `docs/PRODUCT_BLUEPRINT_B2B.md` | `docs/01-product/PRODUCT_BLUEPRINT_B2B.md` |
| `docs/agentes/Sprint 1 — Product Blueprint.md` | `docs/01-product/Sprint 1 — Product Blueprint.md` |
| `docs/agentes/Sprint 2—UX-UI Blueprint.md` | `docs/02-design/Sprint 2 — UX-UI Blueprint.md` |
| `docs/agentes/Sprint 3.5 – Design System - Component Library.md` | `docs/02-design/Sprint 3.5 — Design System.md` |
| `docs/agentes/Sprint 3 — Arquitetura.md` | `docs/03-architecture/Sprint 3 — Arquitetura.md` |
| `docs/DOCUMENTATION_AUDIT.md` | `docs/03-architecture/DOCUMENTATION_AUDIT.md` |
| `docs/agentes/Sprint 4 — Portal Empresa (Business).md` | `docs/04-business/Sprint 4 — Portal Empresa.md` |
| `docs/agentes/Sprint 5 — Portal Colaborador.md` | `docs/05-collaborator/Sprint 5 — Portal Colaborador.md` |
| `docs/agentes/Sprint 6 — Portal Médico - Clínica.md` | `docs/06-medical/Sprint 6 — Portal Médico.md` |
| `docs/agentes/Sprint 7 — Segurança e LGPD.md` | `docs/07-security/Sprint 7 — Segurança e LGPD.md` |
| `docs/SECURITY_CHECKLIST.md` | `docs/07-security/SECURITY_CHECKLIST.md` |
| `docs/LGPD_CHECKLIST.md` | `docs/07-security/LGPD_CHECKLIST.md` |
| `docs/agentes/Sprint 8 — Qualidade e Engenharia.md` | `docs/08-quality/Sprint 8 — Qualidade.md` |
| `docs/QA_CHECKLIST.md` | `docs/08-quality/QA_CHECKLIST.md` |
| `docs/PLANO_PRODUCAO.md` | `docs/09-production/PLANO_PRODUCAO.md` |
| `docs/PRODUCTION_CHECKLIST.md` | `docs/09-production/PRODUCTION_CHECKLIST.md` |
| `docs/RELATORIO_HOMOLOGACAO.md` | `docs/09-production/RELATORIO_HOMOLOGACAO.md` |
| `docs/RISK_REGISTER.md` | `docs/09-production/RISK_REGISTER.md` |
| `docs/agentes/prompt.md` | `docs/agentes/prompts/prompt.md` |
| `docs/agentes/prompt_agente.md` | `docs/agentes/prompts/prompt_agente.md` |

## Documentos duplicados

Nao foram encontrados documentos duplicados exatos.

Sobreposicoes saudaveis permanecem:

- `PLANO_PRODUCAO.md` e `PRODUCTION_CHECKLIST.md`: plano detalhado e checklist executivo.
- `RELATORIO_HOMOLOGACAO.md` e `QA_CHECKLIST.md`: evidencias historicas e orientacao para novas validacoes.
- `LGPD_CHECKLIST.md`, `SECURITY_CHECKLIST.md` e `RISK_REGISTER.md`: controles e riscos com finalidades diferentes.
- `B2B_MODEL.md` e `qa/b2b-test-cases.md`: modelo e criterios de teste se complementam.

## Arquivos criados

- `docs/README.md`
- `README.md` em cada pasta numerada.
- Placeholders estruturados em `10-decisions`, `11-api`, `12-database`, `13-devops` e `14-roadmap`.
- `docs/agentes/README.md`
- Prompts por especialidade em `docs/agentes/prompts/`.
- Workflows em `docs/agentes/workflows/`.
- Templates em `docs/agentes/templates/`.

# Checklist

- Nenhum documento existente foi apagado.
- Conteudo existente foi preservado nos arquivos movidos.
- A pasta `qa/` foi mantida sem alteracao.
- `apps/`, `infra/` e `scripts/` nao foram alterados.
- `docs/README.md` passou a ser o indice canonico.
- `README.md` principal aponta para os caminhos novos.
- Cada nova pasta possui `README.md`.
- Os documentos novos seguem a estrutura de escrita padrao.

# Referencias

- [Indice da documentacao](../README.md)
- [Regras dos agentes](../agentes/AI_AGENT_RULES.md)
- [Prompt de reorganizacao](../agentes/prompts/prompt.md)
- [Plano QA externo](../../qa/README.md)
