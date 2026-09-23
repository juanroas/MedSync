# Execution Guardrails - MedSync

Status: regra obrigatoria para humanos e agentes.

## Objetivo

Impedir que o MedSync avance apenas em documentacao quando o objetivo real for produto funcionando, tela validavel, API, teste ou homologacao.

Este documento nasce de um erro de execucao: referencias de mercado e diretrizes do usuario foram documentadas, mas nao foram transformadas com rigor em produto implementado. Esse erro nao pode se repetir.

## Regra central

Documentacao nao e entrega de produto quando a tarefa pede execucao.

Uma entrega so pode ser chamada de concluida quando estiver claramente classificada como:

- Documentada.
- Especificada.
- Implementada.
- Validada.
- Bloqueada por motivo explicito.

Nunca misturar essas categorias.

## Protocolo anti-ilusao

Em toda tarefa, antes de responder como finalizada:

1. Separar o que foi documentado do que foi implementado.
2. Separar o que foi planejado do que foi validado.
3. Listar evidencias reais: build, typecheck, teste, screenshot, healthcheck, diff ou link.
4. Declarar o que ainda nao existe no produto.
5. Declarar bloqueios sem suavizar.
6. Nao usar linguagem que sugira entrega funcional se so houve documento.

## Quando o usuario fornecer referencias externas

O agente deve:

1. Registrar cada referencia em `docs/01-product/REFERENCE_TRACEABILITY_MATRIX.md`.
2. Extrair sinais de produto, UX, negocio e tecnologia.
3. Mapear cada sinal para uma capacidade MedSync.
4. Classificar cada capacidade como `P0`, `P1`, `P2` ou `Fora do MVP`.
5. Criar ou atualizar backlog em `docs/14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md`.
6. Atualizar UX, especificacao, QA e seguranca quando aplicavel.
7. Implementar a fatia mais importante quando o usuario pedir continuidade e o escopo estiver liberado para desenvolvimento.

Se uma referencia nao puder ser implementada agora, deve aparecer como bloqueada ou fora de escopo, nunca como se estivesse absorvida.

## Definition of Done por tipo de tarefa

### Produto

- Referencias rastreadas.
- Decisao de produto registrada.
- Jornada e tela afetadas identificadas.
- Backlog atualizado.
- `TODO` explicito para o que depender de validacao.

### UX/UI

- Tela afetada definida.
- Estado loading, empty, error, forbidden, blocked e success avaliado.
- Restricoes LGPD e B2B descritas.
- Criterio de aceite visual definido.
- Se houver implementacao, tela navegavel em ambiente local/homologacao.

### Backend/API

- Regra de dominio definida.
- Permissao e tenant avaliados.
- Endpoint, entidade ou service implementado quando aplicavel.
- Teste ou verificacao manual registrada.
- Dados sensiveis minimizados.

### QA/Homologacao

- Caso positivo e negativo definido.
- Evidencia real coletada quando executado.
- Falhas nao mascaradas.
- Bloqueadores listados.

### Finalizacao de resposta

Toda resposta final de tarefa relevante deve conter:

- `Implementado:`
- `Documentado:`
- `Validado:`
- `Ainda falta:`
- `Ambiente/links:`

Quando algum item nao existir, escrever `nenhum` ou `nao executado`.

## O que nao pode acontecer

- Dizer que a Sprint acabou se apenas os documentos foram criados e o usuario esperava tela/API.
- Registrar referencias de mercado sem gerar matriz de rastreabilidade e backlog.
- Continuar implementando tela com cara de sistema de RH quando o produto definido e saude digital B2B2C.
- Tratar B2B como painel de RH.
- Vender o modulo de empresas/beneficio como unico caminho de entrada, escondendo o cadastro de clinica (ver [ADR-0002](../10-decisions/ADR-0002-reposicionamento-b2b-clinica-simplificacao-perfis.md), aceito em 23/09/2026: a clinica e o cliente vendido primeiro; o modulo empresa/beneficio e algo que ela ativa depois).
- Dizer que algo esta pronto sem teste ou evidencia.
- Apagar `TODO` sem decisao ou validacao.
- Omitir bloqueios juridicos, LGPD, CFM, DPO ou diretor tecnico.

## Lembrete operacional

Se o usuario disser "continua", "faz tudo", "finaliza" ou equivalente, o agente deve executar ate o proximo resultado verificavel, nao apenas propor.

Se existir duvida entre documentar mais ou implementar a proxima fatia rastreada, implementar a proxima fatia quando o readiness permitir desenvolvimento local/homologacao.

## Referencias

- [Reference Traceability Matrix](../01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [Reference Aligned Implementation Plan](../14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
- [Development Readiness](../DEVELOPMENT_READINESS.md)
- [AI Agent Rules](AI_AGENT_RULES.md)
- [ADR-0002 — Reposicionamento B2B-clinica](../10-decisions/ADR-0002-reposicionamento-b2b-clinica-simplificacao-perfis.md)

## Changelog

- 23/09/2026: usuario confirmou o reposicionamento do ADR-0002 (clinica como cliente principal). Removida a proibicao de linguagem "clinica" na experiencia B2B principal, que contradizia essa decisao. `company-registration-copy.spec.ts` e a landing page (`apps/web/src/app/page.tsx`) precisam refletir a mudanca.
