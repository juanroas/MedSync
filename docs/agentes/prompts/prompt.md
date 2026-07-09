# Objetivo

Reorganizar a documentação do projeto MedSync para seguir um padrão Enterprise utilizado em produtos SaaS B2B.

IMPORTANTE:

- NÃO alterar código da aplicação.
- NÃO modificar arquivos dentro de apps/.
- NÃO alterar infra/.
- NÃO alterar scripts/.
- NÃO alterar qa/.
- NÃO remover nenhum conteúdo existente.
- Apenas reorganizar a documentação, movendo arquivos e atualizando referências.

---

# Nova estrutura

docs/

    README.md

    01-product/
        B2B_MODEL.md
        PRODUCT_BLUEPRINT_B2B.md
        Sprint 1 — Product Blueprint.md

    02-design/
        Sprint 2 — UX-UI Blueprint.md
        Sprint 3.5 — Design System.md

    03-architecture/
        Sprint 3 — Arquitetura.md
        DOCUMENTATION_AUDIT.md

    04-business/
        Sprint 4 — Portal Empresa.md

    05-collaborator/
        Sprint 5 — Portal Colaborador.md

    06-medical/
        Sprint 6 — Portal Médico.md

    07-security/
        Sprint 7 — Segurança e LGPD.md
        SECURITY_CHECKLIST.md
        LGPD_CHECKLIST.md

    08-quality/
        Sprint 8 — Qualidade.md
        QA_CHECKLIST.md

    09-production/
        PLANO_PRODUCAO.md
        PRODUCTION_CHECKLIST.md
        RELATORIO_HOMOLOGACAO.md
        RISK_REGISTER.md

    10-decisions/

    11-api/

    12-database/

    13-devops/

    14-roadmap/

    agentes/
        README.md
        AI_AGENT_RULES.md

        prompts/
            backend.md
            frontend.md
            database.md
            devops.md
            qa.md
            security.md
            ux.md

        workflows/
            feature.md
            refactor.md
            bugfix.md
            code-review.md

        templates/
            pr-template.md
            sprint-template.md
            task-template.md

---

# O que fazer

1.

Criar todas as pastas acima caso não existam.

2.

Mover os arquivos existentes para a nova estrutura.

Não apagar nenhum arquivo.

3.

Caso algum arquivo tenha nome diferente, renomear preservando o conteúdo.

4.

Atualizar todos os links relativos (.md) quebrados.

5.

Criar um docs/README.md contendo:

- índice da documentação
- objetivo de cada pasta
- ordem de leitura
- convenções

6.

Criar README.md em cada uma das novas pastas explicando sua finalidade.

7.

Criar placeholders (.md) vazios para as pastas novas:

10-decisions

11-api

12-database

13-devops

14-roadmap

Cada README deverá explicar:

- propósito
- responsáveis
- arquivos esperados
- padrão de escrita

---

# Organização dos agentes

Reorganizar docs/agentes conforme:

agentes/

    README.md

    AI_AGENT_RULES.md

    prompts/
        backend.md
        frontend.md
        database.md
        devops.md
        qa.md
        security.md
        ux.md

    workflows/
        feature.md
        bugfix.md
        refactor.md
        code-review.md

    templates/
        sprint-template.md
        task-template.md
        pr-template.md

Mover os prompts existentes para a pasta adequada.

---

# Padronização

Todos os documentos deverão utilizar a estrutura:

# Objetivo

# Escopo

# Responsabilidades

# Fluxo

# Checklist

# Referências

---

# Resultado esperado

Ao final da reorganização:

- nenhum documento perdido
- nenhuma referência quebrada
- estrutura organizada por domínio
- documentação pronta para IA (Codex, Claude Code e Cursor)
- documentação preparada para crescimento do MedSync como plataforma SaaS B2B Enterprise

Antes de realizar qualquer alteração, apresente um plano de execução resumido indicando:
- quais pastas serão criadas;
- quais arquivos serão movidos;
- quais arquivos serão apenas renomeados;
- quais links precisarão ser atualizados.

Somente após essa análise inicie a reorganização.

----------------------------------------------------------

Antes de implementar qualquer funcionalidade nova, faça uma análise completa do projeto MedSync.

Objetivo:

Transformar o MedSync em um produto SaaS B2B de Saúde Digital.

IMPORTANTE:

NÃO implementar telas.

NÃO alterar código.

NÃO alterar banco.

NÃO criar migrations.

NÃO alterar API.

Esta sprint é exclusivamente de Product Discovery e organização do projeto.

Tarefa:

1. Ler completamente a estrutura atual do projeto.

2. Auditar a pasta docs/.

3. Auditar a pasta qa/.

4. Identificar documentos duplicados.

5. Identificar documentos faltantes.

6. Propor uma nova organização profissional da documentação.

7. Criar apenas os documentos que estiverem faltando.

8. Nunca apagar documentação existente.

9. Caso existam documentos semelhantes, consolidar.

10. Atualizar docs/README.md criando um índice navegável.

11. Atualizar README principal apontando para a documentação.

12. Gerar um relatório contendo:

- estrutura atual

- estrutura proposta

- arquivos criados

- arquivos consolidados

- arquivos que recomenda mover

- arquivos que recomenda manter

- documentos obrigatórios ainda pendentes

IMPORTANTE:

Nenhuma alteração funcional deverá ser feita nesta Sprint.

Esta Sprint é apenas para preparar a base do produto.

