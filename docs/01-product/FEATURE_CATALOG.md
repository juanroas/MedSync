# Feature Catalog - MedSync

Status: Product Discovery. Este catalogo separa capacidades documentadas, hipoteses e pendencias; nao confirma implementacao.

## Objetivo

Catalogar capacidades de produto do MedSync para apoiar priorizacao, QA, arquitetura e roadmap.

## Escopo

Inclui capacidades por dominio de produto:

- Identidade e acesso.
- Clinicas e operacao.
- Agenda.
- Teleconsulta.
- Registro clinico.
- Pagamentos.
- B2B.
- Privacidade.
- Auditoria.
- QA e homologacao.

## Legenda de status

| Status | Significado |
|---|---|
| Documentado | Aparece na documentacao existente |
| TODO | Precisa validacao ou detalhamento |
| Futuro | Possivel evolucao, sem compromisso |

## Catalogo

| Dominio | Capacidade | Status | Observacao |
|---|---|---|---|
| Identidade e acesso | Login por perfil | Documentado | Ver README principal e QA |
| Identidade e acesso | MFA para perfis sensiveis | TODO | Validar escopo e implementacao |
| Identidade e acesso | Sessoes e revogacao | TODO | Validar requisitos |
| Clinicas e operacao | Gestao de equipe | Documentado | Contexto existente |
| Clinicas e operacao | Multi-clinica | Documentado | Deve preservar isolamento |
| Agenda | Criacao e consulta de agendamentos | Documentado | Validar regras detalhadas |
| Agenda | Conflito de agenda | TODO | Requer criterios formais |
| Teleconsulta | Sala de espera | Documentado | Paciente entra somente quando permitido |
| Teleconsulta | LiveKit com E2EE | Documentado | Confirmar evidencias por ambiente |
| Registro clinico | Prontuario/registro clinico | Documentado | Acesso restrito |
| Registro clinico | Prescricao | TODO | Especificacao existe como placeholder |
| Pagamentos | Checkout hospedado | Documentado | Retorno nao e fonte de verdade |
| Pagamentos | Webhook idempotente | TODO | Requer validacao tecnica |
| B2B | Empresas | Documentado | Modelo B2B inicial |
| B2B | Colaboradores | Documentado | Elegibilidade a detalhar |
| B2B | Planos de beneficio | Documentado | Regras pendentes |
| B2B | Relatorio agregado | TODO | Validar contrato e LGPD |
| Privacidade | Direitos do titular | TODO | Requer juridico/DPO |
| Privacidade | Retencao | TODO | Requer politica aprovada |
| Auditoria | Eventos de acesso | Documentado | Detalhar catalogo de eventos |
| QA | Checklists e casos de teste | Documentado | Ver `docs/08-quality` e `qa/` |

## Priorizacao inicial

TODO: Validar priorizacao com produto, engenharia, seguranca e QA.

Sugestao de agrupamento documental:

1. Fundacao de privacidade, permissoes e multi-tenancy.
2. Fluxos clinicos e de teleconsulta.
3. Modelo B2B e relatorios agregados.
4. Pagamentos e conciliacao.
5. Auditoria, evidencias e homologacao.

## Checklist

- [x] Capacidades documentadas catalogadas.
- [x] Hipoteses marcadas como `TODO`.
- [ ] TODO: validar status real por implementacao.
- [ ] TODO: associar cada feature a personas e jornadas.
- [ ] TODO: criar criterios de aceite por feature priorizada.

## Referencias

- [Product Blueprint B2B](PRODUCT_BLUEPRINT_B2B.md)
- [User Journeys](USER_JOURNEYS.md)
- [Information Architecture](INFORMATION_ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
