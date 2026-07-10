# Actor and Organization Model - MedSync

Status: Product Discovery. Este documento registra definicoes de produto sobre relacao entre perfis, CNPJs, tenants e limites de acesso. Nao confirma implementacao, regra juridica final ou prontidao para uso real.

## Objetivo

Explicar como paciente/beneficiario, medico independente, empresa/parceiro, medico do trabalho, financeiro e auditor/privacidade se relacionam no MedSync.

## Escopo

Inclui:

- Tipos de organizacao e CNPJ.
- Formas de entrada do paciente.
- Papel do medico independente.
- Retirada do perfil Clinica/Admin do foco B2B.
- Papel da empresa/parceiro.
- Perfil ADM Medico do Trabalho.
- Financeiro e auditoria por escopo.
- Limites de acesso por CNPJ/tenant.

Fora de escopo:

- Criar tabelas.
- Criar endpoints.
- Definir contrato juridico final.
- Definir responsabilidades regulatorias finais.
- Autorizar atendimento real.

## Conceitos

| Conceito | Descricao | Status |
|---|---|---|
| Tenant | Unidade logica de isolamento por CNPJ, operacao ou contrato | TODO: validar nomenclatura tecnica |
| CNPJ contratante | Empresa/parceiro que contrata acesso ao cuidado | Definido |
| CNPJ tecnico/operacional | CNPJ usado pelo MedSync para pessoas fisicas cadastradas via suporte e sem empresa patrocinadora | Aprovado conceitualmente; requer validacao juridica/LGPD/operacional |
| Medico independente | Profissional cadastrado para atender pacientes dentro do seu ramo de atividade autorizado | Definido conceitualmente |
| ADM Medico do Trabalho | Perfil clinico associado ao CNPJ da empresa para saude ocupacional, com acesso clinico restrito e auditado | Requer validacao juridica, LGPD e diretor tecnico |
| Paciente | Pessoa atendida clinicamente | Conceitual |
| Beneficiario | Pessoa elegivel por contrato, plano ou cadastro administrativo | Conceitual |

## Regra central

O MedSync deve separar:

- Quem contrata ou patrocina acesso.
- Quem recebe o atendimento.
- Quem atende clinicamente.
- Quem administra elegibilidade, contrato e financeiro.
- Quem acompanha auditoria e privacidade.

Empresa/parceiro pode acompanhar contrato, elegibilidade, faturas e indicadores agregados permitidos, mas nao pode acessar dados clinicos individuais.

Excecao controlada: o perfil ADM Medico do Trabalho pode acessar dados clinicos dentro de finalidade ocupacional, escopo do CNPJ, permissao formal, trilha de auditoria e validacao juridica/LGPD/diretor tecnico. Esse acesso nao e permissao do RH nem da empresa administrativa.

## Entrada do paciente/beneficiario

O MedSync permite dois caminhos, desde que a pessoa esteja vinculada a um CNPJ.

### Caminho A - Via empresa/parceiro contratante

1. Empresa/parceiro possui contrato ativo.
2. Pessoa e cadastrada como beneficiario elegivel no CNPJ contratante.
3. Beneficiario acessa o MedSync como paciente quando agenda ou realiza consulta.
4. Empresa/parceiro acompanha apenas elegibilidade administrativa, contrato, faturamento e uso agregado permitido.

Este e o caminho B2B/B2B2C principal.

### Caminho B - Via MedSync/suporte/CNPJ tecnico

1. Pessoa fisica entra em contato com suporte ou canal aprovado do MedSync.
2. Suporte cadastra a pessoa no CNPJ tecnico/operacional.
3. Pessoa acessa como paciente/beneficiario sem empresa patrocinadora.
4. Financeiro e relatorios ficam associados ao CNPJ tecnico/operacional.

Este caminho esta aprovado conceitualmente, mas depende de validacao comercial, juridica, LGPD, responsabilidade clinica, contrato/termo, suporte e processo financeiro antes de uso real.

## Medico independente

Medico e um perfil independente no MedSync e nao precisa estar associado a uma clinica.

O publico-alvo principal sao empresas/parceiros, e o medico pode atender pacientes vinculados a qualquer CNPJ permitido pela plataforma, desde que:

- esteja cadastrado e credenciado;
- tenha CRM/UF e dados profissionais validados;
- atue dentro do seu ramo de atividade, especialidade ou escopo autorizado;
- esteja vinculado a uma consulta especifica;
- respeite permissao, janela, status, consentimento e regras aplicaveis.

Medico nao deve acessar dados de pacientes sem consulta, vinculo, finalidade ou autorizacao.

TODO: validar credenciamento, responsabilidade tecnica, especialidade/ramo de atividade, contrato profissional e regras CFM com diretor tecnico e juridico.

## Clinica/Admin

Clinica/Admin nao faz parte do foco B2B atual e deve ser tratado como perfil legado ou futuro.

O foco operacional passa a ser:

- Empresa/parceiro como CNPJ contratante.
- Medico independente como prestador clinico.
- ADM Medico do Trabalho como perfil clinico associado ao CNPJ, quando aprovado.
- MedSync/Admin como operacao da plataforma.

TODO: revisar documentos, rotas e backlog que ainda mencionem Clinica/Admin para decidir se serao removidos, renomeados ou mantidos como legado.

## Empresa/Parceiro

Empresa/parceiro representa o CNPJ que contrata ou patrocina acesso ao cuidado.

Pode ver, quando aprovado:

- Contrato.
- Plano.
- Elegibilidade administrativa.
- Faturas.
- Uso agregado.
- Quantidade de consultas por periodo.
- Relatorios permitidos.

Nao pode ver:

- Diagnostico.
- Prontuario.
- Observacoes clinicas.
- Conteudo de chamada.
- Dados clinicos individuais.
- Especialidade sensivel associada a pessoa identificavel.
- Lista individual sensivel do tipo "fulano fez consulta X".

TODO: validar granularidade minima dos relatorios para evitar reidentificacao.

## ADM Medico do Trabalho

ADM Medico do Trabalho e um perfil clinico associado ao CNPJ da empresa, diferente de RH, financeiro e admin empresarial.

Pode acessar, quando juridicamente aprovado e dentro da finalidade ocupacional:

- Diagnostico.
- Prontuario.
- Observacao clinica.
- Documentos clinicos ocupacionais.
- Conteudo clinico permitido por regra aprovada.

Sobre conteudo da chamada:

- O MedSync nao deve gravar teleconsulta por padrao conforme documentacao atual.
- Se nao houver gravacao/transcricao, nao ha conteudo de chamada armazenado para consulta posterior.
- Qualquer acesso a conteudo de chamada gravado/transcrito, se um dia existir, exige decisao especifica, consentimento/base legal, finalidade, retencao, auditoria e aprovacao juridica/diretor tecnico.

Limites:

- Nao e RH.
- Nao e financeiro.
- Nao pode liberar acesso clinico para perfis administrativos da empresa.
- Deve ter escopo por CNPJ, finalidade, permissao e trilha de auditoria.

TODO: validar com juridico, DPO, diretor tecnico e regras de saude ocupacional.

## Financeiro

O perfil financeiro deve ter escopo por organizacao.

| Tipo de financeiro | Escopo | Limite |
|---|---|---|
| Financeiro Empresa/Parceiro | Faturas, contrato, status financeiro e uso agregado do CNPJ contratante | Nao acessa dado clinico individual |
| Financeiro Plataforma/MedSync | Visao financeira operacional geral, CNPJs atendidos e pessoas fisicas associadas ao CNPJ tecnico | Deve minimizar dados e nao acessar conteudo clinico |
| Financeiro CNPJ tecnico/operacional | Pagamentos e cobrancas de pacientes diretos vinculados ao CNPJ tecnico | Aprovado conceitualmente; nao acessa prontuario/diagnostico |

Nao existe Financeiro Clinica no foco B2B atual.

Nenhum financeiro deve ver prontuario, diagnostico, observacao clinica ou conteudo de chamada.

## Auditor/Privacidade

Auditor/Privacidade deve ter escopo.

| Tipo de auditor | Escopo | Limite |
|---|---|---|
| Auditor Empresa/Parceiro | Eventos administrativos do proprio CNPJ e evidencias contratuais permitidas | Nao acessa dado clinico individual |
| Auditor Plataforma/MedSync | Eventos, tentativas negadas, relatorios por CNPJ e visao geral da plataforma | Deve usar minimizacao e controles fortes |
| DPO/Privacidade | Processos de titular, evidencias e incidentes | Requer base legal, finalidade e aprovacao formal |

Nao existe Auditor Clinica no foco B2B atual.

Auditor nao deve alterar dados operacionais.

Relatorios por CNPJ ou globais podem existir para auditor/plataforma, mas devem evitar dados sensiveis desnecessarios, CPF completo, prontuario, diagnostico, conteudo de chamada ou inferencia clinica individual.

TODO: validar modelo de acesso cross-CNPJ, break-glass, trilha de auditoria e aprovacao do DPO/juridico.

## Matriz resumida

| Perfil | Escopo principal | Pode ver dado clinico individual? |
|---|---|---|
| Paciente/beneficiario via empresa | Propria jornada e CNPJ contratante | Apenas seus proprios dados permitidos |
| Paciente/beneficiario via suporte | Propria jornada e CNPJ tecnico | Apenas seus proprios dados permitidos |
| Medico independente | Consultas vinculadas ao medico | Sim, dentro do atendimento e ramo autorizado |
| Empresa/Parceiro | Contrato, plano, elegibilidade, financeiro e agregado | Nao |
| ADM Medico do Trabalho | Saude ocupacional no CNPJ associado | Sim, se aprovado e auditado |
| Financeiro Empresa/Parceiro | Faturas e uso agregado do CNPJ | Nao |
| Financeiro Plataforma/MedSync | Operacao financeira geral e CNPJ tecnico | Nao |
| Auditor Empresa/Parceiro | Eventos administrativos do proprio CNPJ | Nao |
| Auditor Plataforma/MedSync | Eventos por CNPJ e visao geral minimizada | Nao, salvo autorizacao formal especifica |
| DPO/Privacidade | Direitos do titular, incidentes e evidencias | Somente com finalidade, base legal e minimizacao |

## CRUD e atualizacao de dados

Todo perfil com permissao de cadastro deve ter regras explicitas para leitura e atualizacao.

Diretriz:

- Cadastro cria o registro.
- Visualizacao respeita perfil, CNPJ e finalidade.
- Atualizacao deve ser permitida somente para campos autorizados.
- Alteracoes sensiveis devem gerar evento de auditoria.
- Historico de alteracao deve preservar rastreabilidade quando aplicavel.

Detalhamento inicial esta em [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md).

## Decisoes pendentes

- TODO: validar juridicamente o uso do CNPJ tecnico/operacional para pessoa fisica.
- TODO: definir quem responde clinicamente pelo CNPJ tecnico/operacional.
- TODO: validar ADM Medico do Trabalho, escopo de acesso e documentos permitidos.
- TODO: definir regras de credenciamento do medico independente.
- TODO: definir matriz de permissoes por CNPJ, tenant e perfil.
- TODO: validar relatorios por CNPJ e globais com LGPD/juridico.
- TODO: revisar documentos remanescentes de Clinica/Admin.

## Checklist

- [x] Paciente por empresa e por CNPJ tecnico documentado.
- [x] Medico independente documentado.
- [x] Clinica/Admin removido do foco B2B atual.
- [x] Empresa/parceiro limitado a dados administrativos/agregados.
- [x] ADM Medico do Trabalho documentado como perfil clinico restrito.
- [x] Financeiro Clinica removido do foco atual.
- [x] Financeiro CNPJ tecnico aprovado conceitualmente.
- [x] Auditor Clinica removido do foco atual.
- [x] CRUD/update registrado como requisito transversal.
- [ ] TODO: validar juridico, privacidade e diretor tecnico.
- [x] Matriz de permissoes criada em `docs/07-security/PERMISSION_MATRIX.md`.

## Referencias

- [B2B Model](B2B_MODEL.md)
- [MVP Scope](MVP_SCOPE.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [Information Architecture](INFORMATION_ARCHITECTURE.md)
- [LGPD](../reference/LGPD.md)
- [Multi Tenancy](../03-architecture/MULTI_TENANCY.md)
