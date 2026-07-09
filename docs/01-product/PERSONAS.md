# Personas - MedSync

Status: Product Discovery. Personas iniciais baseadas na documentacao existente; devem ser validadas com pesquisa e operacao real.

## Objetivo

Mapear personas principais do MedSync para orientar produto, UX, QA, seguranca e documentacao.

## Escopo

Este documento cobre personas de alto nivel:

- Empresa/RH.
- Colaborador/Paciente.
- Clinica/Admin.
- Medico.
- Financeiro.
- Auditor/Privacidade.

Fora de escopo:

- Pesquisa conclusiva com usuarios.
- Segmentacao comercial final.
- Regras de permissao implementadas.

## Persona: Empresa/RH

| Campo | Conteudo |
|---|---|
| Objetivo | Oferecer beneficio de saude digital e acompanhar uso administrativo |
| Necessidades | Elegibilidade, contratos, uso agregado, status financeiro |
| Dores | Falta de visibilidade administrativa, risco de expor dados clinicos, dificuldade de medir beneficio |
| Limites | Nao pode acessar prontuario, diagnostico, observacoes clinicas ou conteudo da consulta |
| Perguntas abertas | TODO: validar perfil comprador, aprovadores e jornada de compra |

## Persona: Colaborador/Paciente

| Campo | Conteudo |
|---|---|
| Objetivo | Usar o beneficio de saude com privacidade e simplicidade |
| Necessidades | Consultas, consentimento, pagamento quando aplicavel, acesso a teleconsulta |
| Dores | Medo de exposicao ao empregador, friccao no acesso, baixa clareza de status |
| Limites | Deve acessar apenas seus proprios dados e consultas |
| Perguntas abertas | TODO: validar jornada, barreiras e linguagem ideal |

## Persona: Clinica/Admin

| Campo | Conteudo |
|---|---|
| Objetivo | Operar agenda, equipe, pacientes, consultas e configuracoes |
| Necessidades | Controle operacional, usuarios, permissoes, indicadores de operacao |
| Dores | Retrabalho, erro de agenda, permissao incorreta, falta de auditoria |
| Limites | Nao deve acessar dados clinicos quando o perfil nao exigir |
| Perguntas abertas | TODO: validar responsabilidades por tipo de clinica |

## Persona: Medico

| Campo | Conteudo |
|---|---|
| Objetivo | Atender pacientes vinculados e registrar condutas |
| Necessidades | Agenda do dia, contexto do paciente, teleconsulta, registro clinico |
| Dores | Acesso incorreto, consulta fora de contexto, friccao na chamada |
| Limites | Deve acessar somente consultas e dados clinicos vinculados ao seu atendimento |
| Perguntas abertas | TODO: validar fluxo clinico e documentos exigidos |

## Persona: Financeiro

| Campo | Conteudo |
|---|---|
| Objetivo | Acompanhar cobrancas e status financeiro sem acessar dado clinico |
| Necessidades | Status de pagamento, conciliacao, relatorios financeiros |
| Dores | Divergencia de pagamento, falta de idempotencia, visao misturada com dados clinicos |
| Limites | Nao pode acessar prontuario, diagnostico ou observacoes clinicas |
| Perguntas abertas | TODO: validar processos financeiros e conciliacao |

## Persona: Auditor/Privacidade

| Campo | Conteudo |
|---|---|
| Objetivo | Revisar eventos, acessos e evidencias sem alterar dados operacionais |
| Necessidades | Trilhas de auditoria, filtros, exportacoes e evidencias |
| Dores | Ausencia de rastreabilidade, logs incompletos, excesso de dados sensiveis |
| Limites | Deve ter acesso de leitura controlada e nao alterar dados |
| Perguntas abertas | TODO: validar necessidades juridicas, DPO e auditoria |

## Checklist

- [x] Personas principais mapeadas.
- [x] Limites de privacidade destacados.
- [ ] TODO: validar personas com usuarios reais ou stakeholders.
- [ ] TODO: mapear dores por segmento.
- [ ] TODO: linkar personas a jornadas e funcionalidades.

## Referencias

- [Product Vision](PRODUCT_VISION.md)
- [Modelo B2B](B2B_MODEL.md)
- [User Journeys](USER_JOURNEYS.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
