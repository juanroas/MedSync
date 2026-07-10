# Authorization Test Matrix - MedSync

Status: QA Blueprint. Este documento planeja testes; nenhum teste esta marcado como executado ou aprovado.

## Objetivo

Derivar testes de autorizacao, privacidade, escopo por CNPJ e CRUD a partir da [Permission Matrix](../07-security/PERMISSION_MATRIX.md).

## Escopo

Inclui:

- Testes positivos por perfil.
- Testes negativos obrigatorios.
- Evidencias esperadas.
- Bloqueadores de homologacao.
- Riscos residuais.

Fora de escopo:

- Executar testes.
- Marcar resultado como aprovado.
- Criar automacao Playwright.
- Criar dados reais.
- Declarar conformidade regulatoria.

## Perfis cobertos

- Paciente/beneficiario.
- Empresa/Parceiro Admin.
- Medico independente.
- ADM Medico do Trabalho.
- Financeiro Empresa/Parceiro.
- Financeiro Plataforma/MedSync.
- Suporte MedSync.
- Auditor Empresa/Parceiro.
- Auditor Plataforma/MedSync.
- DPO/Privacidade.
- Admin Plataforma.

## Testes positivos planejados

| ID | Perfil | Cenario | Evidencia esperada |
|---|---|---|---|
| AUTH-POS-001 | Paciente/beneficiario | Visualizar propria jornada e consultas | Tela/API retorna apenas dados proprios |
| AUTH-POS-002 | Paciente/beneficiario | Atualizar dados cadastrais permitidos | Alteracao salva e evento auditado |
| AUTH-POS-003 | Empresa/Parceiro Admin | Visualizar contrato, plano e elegibilidade administrativa | Sem dado clinico individual |
| AUTH-POS-004 | Empresa/Parceiro Admin | Atualizar elegibilidade permitida | Alteracao auditada |
| AUTH-POS-005 | Medico independente | Ver agenda de consultas vinculadas | Nao lista consultas sem vinculo |
| AUTH-POS-006 | Medico independente | Registrar ou retificar registro clinico vinculado | Autoria, data/hora e evento auditado |
| AUTH-POS-007 | ADM Medico do Trabalho | Acessar registro ocupacional do CNPJ associado | Evento de leitura auditado |
| AUTH-POS-008 | Financeiro Empresa/Parceiro | Visualizar faturas e uso agregado do proprio CNPJ | Sem prontuario, diagnostico ou observacao clinica |
| AUTH-POS-009 | Financeiro Plataforma/MedSync | Visualizar operacao financeira minimizada | Sem dado clinico individual |
| AUTH-POS-010 | Suporte MedSync | Cadastrar pessoa fisica no CNPJ tecnico | Vinculo ao CNPJ tecnico e evento auditado |
| AUTH-POS-011 | Auditor Empresa/Parceiro | Visualizar eventos administrativos do proprio CNPJ | Sem dado clinico individual |
| AUTH-POS-012 | Auditor Plataforma/MedSync | Visualizar eventos por CNPJ com minimizacao | Sem CPF completo, token, prontuario ou diagnostico |
| AUTH-POS-013 | DPO/Privacidade | Registrar processo de titular quando aprovado | Evidencia e finalidade registradas |

## Testes negativos obrigatorios

| ID | Perfil | Tentativa | Resultado esperado |
|---|---|---|---|
| AUTH-NEG-001 | Empresa/Parceiro Admin | Acessar prontuario | Bloqueado e auditado |
| AUTH-NEG-002 | Empresa/Parceiro Admin | Ver diagnostico | Bloqueado e auditado |
| AUTH-NEG-003 | Empresa/Parceiro Admin | Ver lista individual sensivel de consultas | Bloqueado ou agregado/minimizado |
| AUTH-NEG-004 | Financeiro Empresa/Parceiro | Acessar registro clinico | Bloqueado e auditado |
| AUTH-NEG-005 | Financeiro Plataforma/MedSync | Acessar diagnostico | Bloqueado e auditado |
| AUTH-NEG-006 | Suporte MedSync | Acessar prontuario | Bloqueado e auditado |
| AUTH-NEG-007 | Medico independente | Acessar paciente sem consulta vinculada | Bloqueado e auditado |
| AUTH-NEG-008 | Medico independente | Atender fora do ramo/especialidade autorizada | Bloqueado e auditado |
| AUTH-NEG-009 | ADM Medico do Trabalho | Acessar CNPJ fora do escopo | Bloqueado e auditado |
| AUTH-NEG-010 | ADM Medico do Trabalho | Exportar dados clinicos para perfil administrativo | Bloqueado e auditado |
| AUTH-NEG-011 | Auditor Empresa/Parceiro | Ver dado clinico individual | Bloqueado e auditado |
| AUTH-NEG-012 | Auditor Plataforma/MedSync | Alterar dado operacional | Bloqueado e auditado |
| AUTH-NEG-013 | Paciente/beneficiario | Acessar consulta de outro paciente | Bloqueado e auditado |
| AUTH-NEG-014 | Usuario autorizado parcialmente | Atualizar campo nao permitido | Bloqueado e auditado |
| AUTH-NEG-015 | Empresa/Parceiro Admin | Acessar conteudo de chamada | Bloqueado; conteudo nao deve existir por padrao |
| AUTH-NEG-016 | Usuario de um CNPJ | Acessar dados de outro CNPJ | Bloqueado e auditado |

## Testes de relatorio agregado

| ID | Cenario | Resultado esperado |
|---|---|---|
| AUTH-REP-001 | Relatorio com granularidade adequada | Exibe apenas dados agregados permitidos |
| AUTH-REP-002 | Relatorio com baixa granularidade | Bloqueia, oculta ou agrupa para evitar reidentificacao |
| AUTH-REP-003 | Relatorio tentando incluir diagnostico | Bloqueado |
| AUTH-REP-004 | Relatorio tentando incluir especialidade sensivel identificavel | Bloqueado ou minimizado |
| AUTH-REP-005 | Exportacao de relatorio empresarial | Sem dado clinico individual |

## Testes de auditoria

| ID | Cenario | Resultado esperado |
|---|---|---|
| AUTH-AUD-001 | Leitura de registro clinico por medico | Evento registrado |
| AUTH-AUD-002 | Leitura por ADM Medico do Trabalho | Evento registrado com CNPJ e finalidade |
| AUTH-AUD-003 | Tentativa negada por empresa | Evento registrado sem dado sensivel |
| AUTH-AUD-004 | Atualizacao de elegibilidade | Evento registrado |
| AUTH-AUD-005 | Retificacao de registro clinico | Evento registrado com autoria e motivo |
| AUTH-AUD-006 | Evento de auditoria | Sem senha, token, CPF completo, prontuario ou diagnostico exposto |

## Evidencias exigidas

- Relatorio HTML do Playwright quando automatizado.
- Captura ou log de teste manual quando aplicavel.
- Requisicao/resposta sanitizada para API quando aplicavel.
- Registro de evento de auditoria sanitizado.
- Identificacao do ambiente.
- Data/hora da execucao.
- Perfil utilizado.
- Resultado esperado vs. obtido.
- Risco residual se houver falha aceita.

## Bloqueadores de homologacao

- Empresa/parceiro acessa dado clinico individual.
- Financeiro acessa prontuario, diagnostico ou observacao clinica.
- Suporte acessa dado clinico.
- Medico acessa paciente sem vinculo.
- ADM Medico do Trabalho acessa CNPJ fora do escopo.
- Auditor altera dado operacional.
- Logs ou eventos expoem senha, token, CPF completo, prontuario ou diagnostico.
- Relatorio B2B permite reidentificacao.
- Paciente acessa consulta de outro paciente.

## Riscos residuais

- ADM Medico do Trabalho exige validacao juridica, DPO e diretor tecnico.
- CNPJ tecnico/operacional exige validacao juridica e base legal.
- Granularidade minima de relatorio ainda esta `TODO`.
- Campos editaveis por entidade ainda estao `TODO`.
- Break-glass e acesso excepcional ainda estao `TODO`.

## Checklist

- [x] Testes planejados por perfil.
- [x] Testes negativos de autorizacao listados.
- [x] Evidencias esperadas definidas.
- [x] Bloqueadores de homologacao listados.
- [ ] TODO: transformar casos em testes automatizados.
- [ ] TODO: executar testes e anexar evidencias.
- [ ] TODO: validar resultados com QA, seguranca, DPO e engenharia.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [QA Checklist](QA_CHECKLIST.md)
- [QA Authorization Test Cases](../../qa/authorization-test-cases.md)
- [Security Checklist](../07-security/SECURITY_CHECKLIST.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
- [MVP Backlog](../14-roadmap/MVP_BACKLOG.md)
