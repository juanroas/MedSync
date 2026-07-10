# Personas - MedSync

Status: Product Discovery. Personas iniciais baseadas na documentacao existente; devem ser validadas com pesquisa e operacao real.

## Objetivo

Mapear personas principais do MedSync para orientar produto, UX, QA, seguranca e documentacao.

## Escopo

Este documento cobre personas de alto nivel:

- Empresa/Parceiro.
- Paciente/Beneficiario.
- Medico.
- ADM Medico do Trabalho.
- Financeiro.
- Auditor/Privacidade.

Fora de escopo:

- Pesquisa conclusiva com usuarios.
- Segmentacao comercial final.
- Regras de permissao implementadas.

## Persona: Empresa/Parceiro

| Campo | Conteudo |
|---|---|
| Objetivo | Contratar acesso a cuidado digital e acompanhar uso administrativo permitido |
| Necessidades | Elegibilidade, contratos, planos, uso agregado, status financeiro |
| Dores | Falta de visibilidade administrativa, risco de expor dados clinicos, dificuldade de medir valor do acesso ao cuidado |
| Limites | Nao pode acessar prontuario, diagnostico, observacoes clinicas ou conteudo da consulta |
| Perguntas abertas | TODO: validar perfil comprador, aprovadores e jornada de compra |

## Persona: Paciente/Beneficiario

| Campo | Conteudo |
|---|---|
| Objetivo | Acessar cuidado digital com privacidade e simplicidade |
| Necessidades | Encontrar atendimento, consultas, consentimento, pagamento quando aplicavel, acesso a teleconsulta |
| Dores | Medo de exposicao ao empregador, friccao no acesso, baixa clareza de status |
| Limites | Deve acessar apenas seus proprios dados e consultas |
| Perguntas abertas | TODO: validar jornada, barreiras e linguagem ideal |

## Persona: Medico

| Campo | Conteudo |
|---|---|
| Objetivo | Atender pacientes como medico independente, dentro do ramo de atividade autorizado |
| Necessidades | Agenda do dia, contexto do paciente, teleconsulta, registro clinico e escopo profissional claro |
| Dores | Acesso incorreto, consulta fora de contexto, friccao na chamada, risco de atender fora do escopo |
| Limites | Deve acessar somente consultas e dados clinicos vinculados ao seu atendimento e ramo autorizado |
| Perguntas abertas | TODO: validar credenciamento, especialidade, responsabilidade tecnica e documentos exigidos |

## Persona: ADM Medico do Trabalho

| Campo | Conteudo |
|---|---|
| Objetivo | Apoiar saude ocupacional no CNPJ associado com acesso clinico permitido e auditado |
| Necessidades | Prontuario ocupacional, diagnostico quando permitido, observacoes clinicas, documentos ocupacionais e evidencias |
| Dores | Separar acesso clinico legitimo de acesso administrativo/RH, risco LGPD e auditoria insuficiente |
| Limites | Nao e RH; nao pode liberar dados clinicos para empresa administrativa; acesso depende de finalidade, permissao e auditoria |
| Perguntas abertas | TODO: validar escopo legal, base legal, documentos permitidos e diretor tecnico |

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
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Modelo B2B](B2B_MODEL.md)
- [User Journeys](USER_JOURNEYS.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
