# Agent Skills Standard - MedSync

Status: padrao documental para skills do projeto.

## Objetivo

Definir como o MedSync deve criar skills reutilizaveis para agentes de IA.

## Modelo adotado

O MedSync deve usar o padrao portavel de Agent Skills:

```text
skill-name/
  SKILL.md
  references/
  scripts/
  assets/
```

Regras:

- `SKILL.md` e obrigatorio.
- Frontmatter deve conter no minimo `name` e `description`.
- `name` deve ser lowercase, com numeros e hifens.
- `description` deve dizer o que a skill faz e quando usar.
- Instrucoes detalhadas ficam no corpo Markdown.
- Recursos longos ficam em `references/`.
- Scripts executaveis ficam em `scripts/` somente quando realmente necessarios.
- Templates e assets ficam em `assets/`.
- Skills do MedSync devem consultar `EXECUTION_GUARDRAILS.md` quando a tarefa envolver referencia externa, produto, UX, roadmap ou desenvolvimento.
- Skills nao devem permitir que "documentado" seja confundido com "implementado".

## Local do projeto

Skills compartilhadas do MedSync ficam em:

```text
.agents/skills/<skill-name>/SKILL.md
```

Esse caminho foi escolhido por compatibilidade ampla com clientes que descobrem skills em pastas project-local.

## Skills atuais

- `medsync-product-discovery`
- `medsync-ux-blueprint`
- `medsync-architecture-blueprint`
- `medsync-design-system`
- `medsync-security-lgpd`
- `medsync-qa-homologation`
- `medsync-development-readiness`

## Boas praticas

- Manter `SKILL.md` curto.
- Linkar documentos canonicos em vez de duplicar conteudo.
- Usar divulgacao progressiva: carregar apenas referencias necessarias.
- Incluir output contract verificavel.
- Incluir rastreabilidade de referencias quando aplicavel.
- Nao incluir segredos, credenciais ou dados pessoais.
- Auditar skills de terceiros antes de usar.
- Nao criar scripts se instrucoes Markdown bastarem.

## Referencias

- Agent Skills: https://agentskills.io/home
- OpenAI Codex Skills: https://developers.openai.com/codex/skills/
- Claude Agent Skills: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- VS Code Agent Skills: https://code.visualstudio.com/docs/agent-customization/agent-skills
- Microsoft Agent Framework Skills: https://learn.microsoft.com/en-us/agent-framework/agents/skills
- OpenCode Skills: https://opencode.ai/docs/skills/
- Cursor Skills: https://cursor.com/docs/skills
- Manus Agent Skills: https://manus.im/pt-br/features/agent-skills
