# AGENTS.md — MedSync

Instruções para agentes de código (Claude Code, Codex, Cursor etc.) trabalhando neste repositório.
Leia este arquivo antes de qualquer mudança; ele aponta para as regras e skills que se aplicam.

## Projeto

Software de telemedicina para médicos e clínicas (ADR-0003): clínicas e médicos atendem pacientes por vídeo, com
agenda, prontuário e auditoria. Não há módulo de empresa/benefício.

| Parte | Stack | Caminho |
|---|---|---|
| Web | Next.js 15 (App Router), React 19, Tailwind 3.4 | `apps/web` |
| API | .NET 9 minimal APIs, EF Core + PostgreSQL, Redis | `apps/api` |
| Infra local | Docker Compose | `infra/` |
| Documentação de produto/UX/arquitetura | Markdown | `docs/` (decisões em `docs/10-decisions`) |

Comandos (na raiz): `npm run dev:web`, `npm run typecheck:web`, `npm run build:web`, `npm run test:e2e`.
API: `dotnet build` em `apps/api`; migrations com `dotnet ef migrations add <Nome> --project src/MedSync.Infrastructure --startup-project src/MedSync.Api`.

## Regras (sempre valem)

| Regra | Quando se aplica |
|---|---|
| [`.agents/rules/ui-actions-and-flow.md`](.agents/rules/ui-actions-and-flow.md) | Qualquer mudança que adicione, remova, renomeie ou mova botão, link, item de menu ou página |
| [`.agents/rules/page-anatomy.md`](.agents/rules/page-anatomy.md) | Criar ou reestruturar uma tela da plataforma logada |
| [`.agents/rules/clinical-data-access.md`](.agents/rules/clinical-data-access.md) | Qualquer código, tela, log ou relatório que toque prontuário, anexo, medicação, receita ou atestado |
| [`.agents/rules/medical-documents.md`](.agents/rules/medical-documents.md) | Receita, atestado, pedido de exame, laudo |

Modelo (ADR-0003, **aceito**): software para **médicos e clínicas**. O médico se cadastra sozinho (CRM + UF) e pode
ser vinculado pelo Suporte a clínicas (CNPJ). Não existe mais módulo de empresa/benefício.
Perfis: Paciente, Médico, Médico ADM MedSync (responsável técnico), Suporte, DPO, ADM Clínica. Conteúdo clínico:
paciente (o próprio), médico (o que atendeu), Médico ADM (com justificativa); ninguém mais.
Ordem de trabalho das telas: [`docs/02-design/SCREEN_REBUILD_PLAN.md`](docs/02-design/SCREEN_REBUILD_PLAN.md).

Resumo das regras de fluxo: **menu = lugares, header = ações; uma ação principal por tela; um destino, uma
entrada; mesmo verbo para a mesma ação; cadastro só via `/login`; só mostre o que o perfil pode usar; nada de
botão falso.** O mapa canônico de telas e ações é [`docs/02-design/FLOW_MAP.md`](docs/02-design/FLOW_MAP.md) —
atualize-o no mesmo PR quando mudar tela, menu ou ação principal.

## Skills

| Skill | Use para |
|---|---|
| [`medsync-screen-rebuild`](.agents/skills/medsync-screen-rebuild/SKILL.md) | Reconstruir ou criar uma tela: ficha (perfil, ação, mercado, regulação) → código → auditoria |
| [`medsync-flow-audit`](.agents/skills/medsync-flow-audit/SKILL.md) | Auditar botões/fluxo renderizado por perfil antes de entregar mudança de UI |
| [`medsync-ux-blueprint`](.agents/skills/medsync-ux-blueprint/SKILL.md) | Wireframes, jornadas e copy antes de implementar |
| [`medsync-design-system`](.agents/skills/medsync-design-system/SKILL.md) | Tokens, componentes e estados |
| [`medsync-security-lgpd`](.agents/skills/medsync-security-lgpd/SKILL.md) | Dado sensível, controle de acesso, auditoria, LGPD |
| [`medsync-architecture-blueprint`](.agents/skills/medsync-architecture-blueprint/SKILL.md) | Módulos, multi-tenancy, modelo de dados, API |
| [`medsync-product-discovery`](.agents/skills/medsync-product-discovery/SKILL.md) | Modelo B2B, personas, roadmap |
| [`medsync-qa-homologation`](.agents/skills/medsync-qa-homologation/SKILL.md) | Planos de teste, critérios de aceite, evidências |
| [`medsync-development-readiness`](.agents/skills/medsync-development-readiness/SKILL.md) | Checar se algo está pronto para ser implementado |
| [`frontend-design`](.agents/skills/frontend-design/SKILL.md), [`web-design-guidelines`](.agents/skills/web-design-guidelines/SKILL.md), [`composition-patterns`](.agents/skills/composition-patterns/SKILL.md) | Guias genéricos de UI/React (terceiros, ver `skills-lock.json`) |

## MCP

`.mcp.json` declara o **Playwright MCP** oficial (`@playwright/mcp`, versão fixada, headless e sessão isolada) para
navegar pelas telas durante a reconstrução. Para inventário automatizado de botões, continue usando
`apps/web/scripts/audit-actions.mjs`. Nunca digite senha em comando: use `AUDIT_PASSWORD`.

Mercado e regulação: [`docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md`](docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md).

## Limites que não se negociam

- Dado clínico (prontuário, diagnóstico, medicação, conteúdo de chamada) nunca aparece para ADM da clínica,
  Suporte, DPO ou em auditoria. Na dúvida, leia `medsync-security-lgpd`.
- Autorização é decidida na API (`apps/api/src/MedSync.Api/ApiEndpoints.cs`); esconder um botão no front não é controle de acesso.
- Segredos (`.env`, `SEED_DEMO_PASSWORD`) nunca são versionados, impressos em log ou passados como argumento de comando.
