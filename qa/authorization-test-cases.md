# Casos de Autorizacao

Base: `docs/08-quality/AUTHORIZATION_TEST_MATRIX.md`.

Status: casos planejados. Nao marcar como aprovado sem evidencia.

## Casos positivos

| ID | Perfil | Caso | Resultado esperado |
|---|---|---|---|
| AUTH-001 | Paciente/beneficiario | Visualizar propria jornada e consultas | Retorna apenas dados proprios |
| AUTH-002 | Paciente/beneficiario | Atualizar dados cadastrais permitidos | Alteracao salva e evento auditado |
| AUTH-003 | Empresa/Parceiro Admin | Visualizar contrato, plano e elegibilidade | Sem dado clinico individual |
| AUTH-004 | Empresa/Parceiro Admin | Atualizar elegibilidade permitida | Alteracao auditada |
| AUTH-005 | Medico independente | Ver agenda de consultas vinculadas | Nao lista consultas sem vinculo |
| AUTH-006 | Medico independente | Registrar atendimento vinculado | Autoria, data/hora e auditoria registradas |
| AUTH-007 | ADM Medico do Trabalho | Acessar registro ocupacional do CNPJ associado | Leitura permitida e auditada |
| AUTH-008 | Financeiro Empresa/Parceiro | Visualizar faturas e uso agregado | Sem prontuario, diagnostico ou observacao |
| AUTH-009 | Financeiro Plataforma/MedSync | Visualizar operacao financeira minimizada | Sem dado clinico individual |
| AUTH-010 | Suporte MedSync | Cadastrar pessoa fisica no CNPJ tecnico | Vinculo criado e evento auditado |
| AUTH-011 | Auditor Empresa/Parceiro | Visualizar eventos administrativos do proprio CNPJ | Sem dado clinico individual |
| AUTH-012 | Auditor Plataforma/MedSync | Visualizar eventos por CNPJ com minimizacao | Sem CPF completo, token, prontuario ou diagnostico |
| AUTH-013 | DPO/Privacidade | Registrar processo de titular aprovado | Finalidade e evidencia registradas |

## Casos negativos

| ID | Perfil | Tentativa | Resultado esperado |
|---|---|---|---|
| AUTH-101 | Empresa/Parceiro Admin | Acessar prontuario | Bloqueado e auditado |
| AUTH-102 | Empresa/Parceiro Admin | Ver diagnostico | Bloqueado e auditado |
| AUTH-103 | Empresa/Parceiro Admin | Ver lista individual sensivel de consultas | Bloqueado ou agregado/minimizado |
| AUTH-104 | Financeiro Empresa/Parceiro | Acessar registro clinico | Bloqueado e auditado |
| AUTH-105 | Financeiro Plataforma/MedSync | Acessar diagnostico | Bloqueado e auditado |
| AUTH-106 | Suporte MedSync | Acessar prontuario | Bloqueado e auditado |
| AUTH-107 | Medico independente | Acessar paciente sem consulta vinculada | Bloqueado e auditado |
| AUTH-108 | Medico independente | Atender fora do ramo/especialidade autorizada | Bloqueado e auditado |
| AUTH-109 | ADM Medico do Trabalho | Acessar CNPJ fora do escopo | Bloqueado e auditado |
| AUTH-110 | ADM Medico do Trabalho | Exportar dados clinicos para perfil administrativo | Bloqueado e auditado |
| AUTH-111 | Auditor Empresa/Parceiro | Ver dado clinico individual | Bloqueado e auditado |
| AUTH-112 | Auditor Plataforma/MedSync | Alterar dado operacional | Bloqueado e auditado |
| AUTH-113 | Paciente/beneficiario | Acessar consulta de outro paciente | Bloqueado e auditado |
| AUTH-114 | Usuario autorizado parcialmente | Atualizar campo nao permitido | Bloqueado e auditado |
| AUTH-115 | Empresa/Parceiro Admin | Acessar conteudo de chamada | Bloqueado; conteudo nao deve existir por padrao |
| AUTH-116 | Usuario de um CNPJ | Acessar dados de outro CNPJ | Bloqueado e auditado |

## Relatorios e auditoria

| ID | Caso | Resultado esperado |
|---|---|---|
| AUTH-201 | Relatorio empresarial agregado | Exibe apenas dados permitidos e agregados |
| AUTH-202 | Relatorio com baixa granularidade | Bloqueia, oculta ou agrupa para evitar reidentificacao |
| AUTH-203 | Exportacao B2B tentando incluir diagnostico | Bloqueada |
| AUTH-204 | Leitura de registro clinico por medico | Evento registrado |
| AUTH-205 | Leitura por ADM Medico do Trabalho | Evento registrado com CNPJ e finalidade |
| AUTH-206 | Tentativa negada por empresa | Evento registrado sem dado sensivel |
