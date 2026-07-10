# Casos UAT por Perfil

Status: roteiro de homologacao manual e automatizavel. Nao marcar como aprovado sem evidencia.

## Como registrar resultado

Para cada caso, registrar:

- Ambiente e URL.
- Data/hora.
- Perfil e usuario de teste.
- CNPJ/tenant de teste.
- Resultado esperado.
- Resultado obtido.
- Evidencia sanitizada.
- Severidade se falhar: P0, P1, P2 ou P3.

## Empresa Admin

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-EMP-001 | Acessar dashboard empresarial | Exibe contrato, plano, elegibilidade e uso agregado permitido |
| UAT-EMP-002 | Ver texto de privacidade B2B | Informa que dados clinicos individuais nao sao exibidos |
| UAT-EMP-003 | Procurar prontuario ou diagnostico | Nao existe acesso visivel nem rota permitida |
| UAT-EMP-004 | Validar linguagem do produto | Nao usa "clinica" como experiencia principal do cadastro/portal empresa |
| UAT-EMP-005 | Simular duvida de elegibilidade | Mostra caminho administrativo, sem expor motivo clinico |
| UAT-EMP-006 | Atualizar elegibilidade administrativa | Salva status, data final e motivo administrativo com auditoria, sem dados clinicos |
| UAT-EMP-007 | Acessar relatorios do CNPJ | Exibe somente indicadores agregados do proprio CNPJ, com uso oculto quando nao ha grupo minimo |

## Paciente/beneficiario

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-PAC-001 | Login do paciente | Entra na experiencia de cuidado |
| UAT-PAC-002 | Visualizar minhas consultas | Lista apenas consultas proprias |
| UAT-PAC-003 | Entrar na sala antes do medico | Mostra espera ou bloqueio seguro |
| UAT-PAC-004 | Aceitar consentimento quando exigido | Registra aceite e permite continuar quando autorizado |
| UAT-PAC-005 | Tentar acessar consulta de outro paciente | Bloqueia e registra evento candidato |
| UAT-PAC-006 | Atualizar meus dados permitidos | Salva nome, e-mail, nascimento e telefone, sem alterar CPF, elegibilidade, faturas ou dados clinicos |

## Medico independente

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-MED-001 | Login do medico | Entra na experiencia Medical Desk |
| UAT-MED-002 | Ver agenda | Lista consultas vinculadas ao medico |
| UAT-MED-003 | Iniciar sala da consulta vinculada | Sala inicia quando status e janela permitem |
| UAT-MED-004 | Tentar criar agenda como empresa/admin | Acao indisponivel ou bloqueada |
| UAT-MED-005 | Ver perfil medico | Exibe CRM/UF/especialidade quando disponivel |
| UAT-MED-006 | Editar dados profissionais | Salva nome, e-mail, CRM, UF, especialidade e telefone, sem alterar faturas, elegibilidade ou registro clinico |
| UAT-MED-007 | Acessar paciente sem vinculo | Bloqueia e registra evento candidato |

## Financeiro Empresa

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-FIN-001 | Acessar dashboard financeiro | Tela diferente do Empresa Admin, focada em faturas e uso agregado |
| UAT-FIN-002 | Ver faturas do CNPJ | Exibe status financeiro permitido |
| UAT-FIN-003 | Procurar prontuario, diagnostico ou observacao clinica | Nao existe acesso |
| UAT-FIN-004 | Acessar lista individual de elegibilidade | Bloqueado; financeiro nao ve lista individual administrativa |
| UAT-FIN-005 | Exportar relatorio financeiro | TODO: implementar exportacao minimizada e auditada |
| UAT-FIN-006 | Acessar relatorios financeiros agregados | Exibe mensalidade/status e uso minimizado do proprio CNPJ, sem dados clinicos |

## Auditor Empresa

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-AUD-001 | Acessar visao de auditoria | Tela diferente do Empresa Admin, focada em eventos administrativos |
| UAT-AUD-002 | Ver eventos do proprio CNPJ | Exibe apenas eventos permitidos e minimizados |
| UAT-AUD-003 | Tentar alterar cadastro operacional | Bloqueia |
| UAT-AUD-004 | Procurar dado clinico individual | Nao existe acesso |
| UAT-AUD-005 | Filtrar tentativas negadas | Exibe evento negado com motivo minimizado, sem prontuario, diagnostico, CPF completo, token ou conteudo de chamada |
| UAT-AUD-006 | Consultar relatorio agregado | Exibe trilha/indicadores permitidos sem alterar operacao e sem lista sensivel individual |

## Admin Plataforma MedSync

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-ADM-001 | Acessar visao geral da plataforma | Exibe operacao por CNPJ e alertas sem dado clinico indevido |
| UAT-ADM-002 | Ver CNPJ tecnico | Exibe apenas dados administrativos/operacionais permitidos |
| UAT-ADM-003 | Tentar criar agenda clinica | Acao bloqueada ou fora do perfil |
| UAT-ADM-004 | Ver equipe e acessos | Exibe usuarios administrativos do ambiente, permite criar acesso autorizado e reforca que perfis nao veem dado clinico |

## Financeiro Plataforma MedSync

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-FPL-001 | Acessar financeiro global | Exibe visao por CNPJ com minimizacao |
| UAT-FPL-002 | Ver CNPJ tecnico | Exibe pessoa fisica direta apenas quando aprovado e minimizado |
| UAT-FPL-003 | Procurar dado clinico | Nao existe acesso |
| UAT-FPL-004 | Comparar CNPJs em relatorios | Exibe Empresa Demo, Alfa e Beta com indicadores agregados e ocultacao por grupo minimo |

## Auditor Plataforma / DPO

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-DPO-001 | Consultar eventos globais | Exibe eventos minimizados por CNPJ/perfil |
| UAT-DPO-002 | Ver evento sensivel | Sem senha, token, CPF completo, prontuario ou diagnostico |
| UAT-DPO-003 | Registrar solicitacao de titular | Solicitação registrada em `/privacidade` com tipo, status, nota operacional minimizada e auditoria |
| UAT-DPO-004 | Alterar dado operacional | Bloqueia |
| UAT-DPO-005 | Atualizar status da solicitacao | DPO atualiza status sem registrar CPF completo, prontuario, diagnostico, token ou conteudo de chamada |

## ADM Medico do Trabalho

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-OCC-001 | Acessar CNPJ associado | TODO: depende de validacao juridica, DPO e diretor tecnico |
| UAT-OCC-002 | Ver registro ocupacional permitido | TODO: implementar somente com finalidade e auditoria |
| UAT-OCC-003 | Tentar compartilhar dado clinico com empresa/RH | Bloqueia |
| UAT-OCC-004 | Acessar outro CNPJ | Bloqueia |

## Conversa cruzada

| ID | Caso | Resultado esperado |
|---|---|---|
| UAT-X-001 | Empresa confirma elegibilidade e paciente usa cuidado | Jornada faz sentido sem expor dado clinico a empresa |
| UAT-X-002 | Medico inicia sala e paciente entra | Somente participantes autorizados entram |
| UAT-X-003 | Financeiro revisa uso depois da consulta | Ve uso agregado/cobranca, nao dados clinicos |
| UAT-X-004 | Auditor verifica tentativa negada | Evento aparece minimizado |
| UAT-X-005 | Grupo debate o que faltou para piloto | Lista de P0/P1/P2/P3 registrada |

## Go/no-go

Liberar empresa de teste somente se:

- Nenhum P0 aberto.
- Nenhum P1 aberto na jornada testada.
- Ambiente marcado como homologacao.
- Dados ficticios.
- Evidencias registradas.
- Restricoes aceitas por escrito quando houver P2.

## Referencias

- [Plano de Homologacao por Perfis](../docs/08-quality/PROFILE_UAT_HOMOLOGATION_PLAN.md)
- [Plano de Teste](test-plan.md)
- [Casos B2B](b2b-test-cases.md)
- [Casos LGPD](lgpd-test-cases.md)
- [Casos de Autorizacao](authorization-test-cases.md)
