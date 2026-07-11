# Feature Catalog - MedSync

Status: Product Discovery. Este catalogo separa capacidades documentadas, hipoteses e pendencias; nao confirma implementacao.

## Objetivo

Catalogar capacidades de produto do MedSync para apoiar priorizacao, QA, arquitetura e roadmap.

## Escopo

Inclui capacidades por dominio de produto:

- Identidade e acesso.
- Acesso ao cuidado.
- Medicos e saude ocupacional.
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
| Implementado parcial | Existe fluxo/codigo inicial, mas ainda exige evolucao, validacao ou integracao |
| Validado local | Existe evidencia local automatizada/manual, sem liberar producao |
| TODO | Precisa validacao ou detalhamento |
| Futuro | Possivel evolucao, sem compromisso |

## Catalogo

| Dominio | Capacidade | Status | Observacao |
|---|---|---|---|
| Identidade e acesso | Login por perfil | Documentado | Ver README principal e QA |
| Identidade e acesso | MFA para perfis sensiveis | TODO | Validar escopo e implementacao |
| Identidade e acesso | Sessoes e revogacao | TODO | Validar requisitos |
| Acesso ao cuidado | Home do paciente/beneficiario | TODO | Deve priorizar consulta, atendimento e continuidade de cuidado |
| Acesso ao cuidado | Pronto atendimento digital | TODO | Validar linha de cuidado, equipe, escala e regulatorio |
| Acesso ao cuidado | Consulta agendada por especialidade | Validado local | Paciente elegivel solicita por especialidade; API vincula medico disponivel; falta catalogo formal de especialidades e credenciamento completo |
| Acesso ao cuidado | Perfil de profissional | TODO | Validar credenciamento, registro profissional e exposicao publica |
| Acesso ao cuidado | Consulta avulsa transacional | TODO | Validar se entra no MVP ou fica como evolucao |
| Medicos e saude ocupacional | Medico independente | Documentado | Nao depende de clinica; precisa credenciamento e ramo autorizado |
| Medicos e saude ocupacional | ADM Medico do Trabalho | TODO | Acesso clinico ocupacional associado a CNPJ; exige validacao juridica/LGPD |
| Agenda | Criacao e consulta de agendamentos | Documentado | Validar regras detalhadas |
| Agenda | Atualizacao e cancelamento de agendamento | TODO | Deve auditar mudancas e respeitar permissao |
| Agenda | Conflito de agenda | Implementado parcial | Solicitacao do paciente evita conflito simples por medico/horario; criterios finais ainda precisam validacao |
| Teleconsulta | Sala de espera | Documentado | Paciente entra somente quando permitido |
| Teleconsulta | LiveKit com E2EE | Documentado | Confirmar evidencias por ambiente |
| Registro clinico | Prontuario/registro clinico | Documentado | Acesso restrito |
| Registro clinico | Retificacao/aditamento de registro clinico | TODO | Validar regra de edicao, versao e autoria |
| Registro clinico | Prescricao | TODO | Especificacao existe como placeholder |
| Cadastro e atualizacao | Atualizar dados cadastrais | TODO | Ver `DATA_MANAGEMENT_CRUD.md` |
| Cadastro e atualizacao | Atualizar elegibilidade | TODO | Empresa/parceiro ou suporte conforme permissao |
| Cadastro e atualizacao | Auditar alteracoes | TODO | Obrigatorio para dados sensiveis e administrativos relevantes |
| Pagamentos | Checkout hospedado | Documentado | Retorno nao e fonte de verdade |
| Pagamentos | Webhook idempotente | TODO | Requer validacao tecnica |
| B2B | Empresas | Documentado | Modelo B2B inicial |
| B2B | Elegibilidade de beneficiarios | Documentado | Nao deve expor dado clinico individual para empresa |
| B2B | Planos de acesso | Documentado | Regras pendentes |
| B2B | Relatorio agregado | TODO | Validar contrato e LGPD |
| Privacidade | Direitos do titular | TODO | Requer juridico/DPO |
| Privacidade | Retencao | TODO | Requer politica aprovada |
| Auditoria | Eventos de acesso | Documentado | Detalhar catalogo de eventos |
| QA | Checklists e casos de teste | Documentado | Ver `docs/08-quality` e `qa/` |

## Priorizacao inicial

TODO: Validar priorizacao com produto, engenharia, seguranca e QA.

Sugestao de agrupamento documental:

1. Fundacao de privacidade, permissoes e multi-tenancy.
2. Acesso ao cuidado, fluxos clinicos e teleconsulta.
3. Modelo B2B, elegibilidade e relatorios agregados.
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
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Market References](MARKET_REFERENCES.md)
- [MVP Scope](MVP_SCOPE.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [User Journeys](USER_JOURNEYS.md)
- [Information Architecture](INFORMATION_ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
