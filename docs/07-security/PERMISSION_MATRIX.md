# Permission Matrix - MedSync

Status: Security/LGPD Blueprint. Esta matriz orienta produto, UX, API, banco e QA, mas nao confirma implementacao, conformidade regulatoria ou prontidao para uso real.

## Objetivo

Definir, em alto nivel, quem pode criar, visualizar, atualizar, cancelar/desativar e auditar dados no MedSync, preservando separacao entre empresa/parceiro, paciente, medico independente, ADM Medico do Trabalho, financeiro, suporte, auditoria e plataforma.

## Escopo

Inclui:

- Perfis de acesso.
- Classes de dados.
- Matriz CRUD conceitual.
- Regras de campo sensivel.
- Eventos de auditoria candidatos.
- Testes negativos obrigatorios.

Fora de escopo:

- Criar roles reais no codigo.
- Criar endpoints.
- Criar tabelas, migrations ou policies.
- Definir base legal final.
- Declarar conformidade LGPD/CFM.

## Legenda

| Marcador | Significado |
|---|---|
| `C` | Pode criar quando houver permissao e validacao |
| `R` | Pode visualizar |
| `U` | Pode atualizar campos permitidos |
| `D` | Pode cancelar, desativar, excluir, anonimizar ou solicitar exclusao quando aplicavel |
| `A` | Acao deve ser auditada |
| `N` | Nao permitido |
| `TODO` | Exige validacao juridica, privacidade, produto ou engenharia |

## Perfis

| Perfil | Escopo | Observacao |
|---|---|---|
| Paciente/beneficiario | Propria jornada | Pode vir por CNPJ contratante ou CNPJ tecnico |
| Empresa/Parceiro Admin | CNPJ contratante | Dados administrativos, contrato, elegibilidade e agregado |
| Medico independente | Consultas vinculadas | Dentro do ramo/especialidade autorizada |
| ADM Medico do Trabalho | CNPJ associado | Perfil clinico ocupacional, nao RH |
| Financeiro Empresa/Parceiro | CNPJ contratante | Faturas e uso agregado |
| Financeiro Plataforma/MedSync | Plataforma e CNPJ tecnico | Operacao financeira minimizada |
| Suporte MedSync | Operacao administrativa | CNPJ tecnico e cadastros permitidos |
| Auditor Empresa/Parceiro | Eventos administrativos do proprio CNPJ | Sem dado clinico individual |
| Auditor Plataforma/MedSync | Eventos por CNPJ e visao geral | Minimizacao e controle forte |
| DPO/Privacidade | Direitos do titular, incidentes e evidencias | Base legal, finalidade e minimizacao |
| Admin Plataforma | Configuracoes e operacao | Sem acesso clinico sem finalidade formal |

## Classes de dados

| Classe | Exemplos | Sensibilidade |
|---|---|---|
| Cadastro pessoal | Nome, contato, documento mascarado, dados de perfil | Pessoal |
| Elegibilidade | Vinculo a CNPJ, plano, status de elegibilidade | Pessoal/administrativo |
| Contrato e plano | Contrato, plano, limites, status | Administrativo/contratual |
| Agenda e consulta | Data, horario, status, vinculos | Pessoal/operacional |
| Teleconsulta | Sala, status de entrada, token, participantes | Sensivel operacional |
| Registro clinico | Prontuario, diagnostico, conduta, observacao clinica | Sensivel/clinico |
| Saude ocupacional | Registros ocupacionais vinculados a CNPJ | Sensivel/clinico |
| Financeiro | Fatura, pagamento, status, cobranca | Financeiro/administrativo |
| Relatorio agregado | Uso por periodo, quantidade, indicadores permitidos | Agregado/risco de reidentificacao |
| Auditoria | Eventos, tentativas negadas, trilhas | Seguranca/privacidade |
| Configuracao | Usuarios, roles, permissoes, tenant/CNPJ | Administrativo sensivel |

## Matriz CRUD por classe

| Perfil | Cadastro pessoal | Elegibilidade | Contrato/plano | Agenda/consulta | Registro clinico | Saude ocupacional | Financeiro | Relatorio agregado | Auditoria | Configuracao |
|---|---|---|---|---|---|---|---|---|---|---|
| Paciente/beneficiario | R/U proprio/A | R proprio | R limitado | R proprio | R proprio permitido/TODO | N | R proprio quando aplicavel | N | N | N |
| Empresa/Parceiro Admin | R/U administrativo/A | C/R/U permitido/A | R/U permitido/A | R agregado/administrativo | N | N | R administrativo | R agregado/TODO | R administrativo limitado | U usuarios empresariais/TODO |
| Medico independente | R vinculado | N | N | R consulta vinculada/U status clinico/A | C/R/U por retificacao/A | N salvo atendimento ocupacional aprovado | N | N | N | N |
| ADM Medico do Trabalho | R CNPJ associado/TODO | R limitado/TODO | N | R relacionado/TODO | R ocupacional/TODO | C/R/U por regra aprovada/A | N | N | R clinico ocupacional limitado/A | N |
| Financeiro Empresa/Parceiro | R administrativo limitado | R agregado/administrativo | R financeiro | N | N | N | C/R/U financeiro/A | R financeiro agregado | N | N |
| Financeiro Plataforma/MedSync | R minimizado | R administrativo | R financeiro | N | N | N | C/R/U financeiro plataforma/A | R financeiro agregado | R financeiro/A | N |
| Suporte MedSync | C/R/U cadastro permitido/A | C/R/U CNPJ tecnico/A | N | R administrativo limitado | N | N | R operacional limitado | N | R suporte/A | N |
| Auditor Empresa/Parceiro | N | R administrativo limitado | R evidencias permitidas | R administrativo limitado | N | N | R evidencias financeiras | R agregado permitido | R proprio CNPJ/A | N |
| Auditor Plataforma/MedSync | R minimizado/TODO | R minimizado/TODO | R evidencias | R eventos | N por padrao/TODO | N por padrao/TODO | R evidencias | R agregado/global/TODO | R global/A | N |
| DPO/Privacidade | R por finalidade/TODO | R por finalidade/TODO | R por finalidade/TODO | R por finalidade/TODO | R minimizado/TODO | R minimizado/TODO | R por finalidade/TODO | R quando permitido | C/R/U processo privacidade/A | N |
| Admin Plataforma | R/U operacional/A | R/U operacional/A | R/U operacional/A | R operacional limitado | N sem finalidade formal | N sem finalidade formal | R operacional limitado | R operacional agregado | R/A | C/R/U configuracao/A |

## Regras de campos proibidos para empresa/parceiro

Empresa/Parceiro Admin, Financeiro Empresa/Parceiro e Auditor Empresa/Parceiro nao podem ver:

- diagnostico;
- prontuario;
- observacoes clinicas;
- conduta clinica;
- conteudo de chamada;
- token de teleconsulta;
- documento pessoal completo quando mascara for exigida;
- especialidade sensivel associada a pessoa identificavel;
- lista individual sensivel do tipo "pessoa X realizou consulta Y".

Empresa/Parceiro Admin, em configuracao de equipe e acessos, pode criar ou visualizar apenas perfis empresariais do proprio CNPJ:

- Empresa/Parceiro Admin;
- Financeiro Empresa/Parceiro;
- Auditor Empresa/Parceiro.

Empresa/Parceiro Admin nao pode criar, listar ou administrar perfis MedSync, incluindo Suporte MedSync, Financeiro Plataforma, Auditor Plataforma, DPO/Privacidade, Admin Plataforma e ADM Medico do Trabalho.

## Regras para ADM Medico do Trabalho

O ADM Medico do Trabalho:

- e perfil clinico, nao RH;
- deve estar associado a um CNPJ;
- so acessa dados clinicos ocupacionais com finalidade aprovada;
- precisa de auditoria reforcada para leitura e atualizacao;
- nao compartilha dados clinicos com Empresa/Parceiro Admin, financeiro ou auditor empresarial;
- nao deve acessar conteudo de chamada salvo decisao futura especifica sobre gravacao/transcricao, consentimento/base legal, retencao e aprovacao juridica.

TODO: validar regras finais com juridico, DPO, diretor tecnico e seguranca.

## Regras para medico independente

O medico independente:

- nao precisa estar associado a clinica;
- pode atender pacientes de diferentes CNPJs;
- so acessa consulta vinculada;
- deve atuar dentro do ramo/especialidade autorizada;
- nao acessa contrato, fatura ou elegibilidade empresarial;
- cria/retifica registro clinico conforme regra aprovada.

TODO: validar credenciamento, CRM/UF, especialidade/ramo, responsabilidade tecnica e contrato profissional.

## Regras para CNPJ tecnico

Pessoa fisica direta deve ser vinculada ao CNPJ tecnico/operacional quando cadastrada via suporte.

Suporte MedSync pode:

- criar cadastro administrativo permitido;
- vincular pessoa ao CNPJ tecnico;
- atualizar dados administrativos permitidos;
- consultar status operacional minimo.

Suporte MedSync nao pode:

- acessar prontuario;
- acessar diagnostico;
- acessar conduta clinica;
- acessar observacoes clinicas;
- alterar registro clinico.

TODO: validar juridicamente o uso do CNPJ tecnico/operacional, base legal, termos, responsabilidade clinica e financeiro.

## Eventos de auditoria obrigatorios candidatos

- Login e falha de login.
- Criacao de cadastro.
- Atualizacao de cadastro.
- Vinculo ou alteracao de CNPJ.
- Alteracao de elegibilidade.
- Alteracao de contrato/plano.
- Criacao, cancelamento ou reagendamento de consulta.
- Emissao de token de teleconsulta.
- Entrada ou saida de teleconsulta.
- Tentativa de acesso a consulta de outro paciente.
- Leitura de registro clinico.
- Criacao ou retificacao de registro clinico.
- Leitura por ADM Medico do Trabalho.
- Atualizacao por ADM Medico do Trabalho.
- Tentativa de acesso clinico por empresa/parceiro, financeiro, suporte ou auditor empresarial.
- Alteracao de permissao, role ou escopo.
- Exportacao ou solicitacao de direitos do titular.

## Testes negativos obrigatorios

- Empresa/Parceiro Admin tentando acessar prontuario.
- Empresa/Parceiro Admin tentando ver diagnostico.
- Empresa/Parceiro Admin tentando ver lista individual sensivel de consultas.
- Financeiro Empresa/Parceiro tentando acessar dado clinico.
- Suporte MedSync tentando acessar prontuario.
- Medico independente tentando acessar paciente sem consulta vinculada.
- Medico independente tentando atender fora do ramo/especialidade autorizada.
- ADM Medico do Trabalho tentando acessar CNPJ fora do escopo.
- ADM Medico do Trabalho tentando exportar dados clinicos para perfil administrativo.
- Auditor Empresa/Parceiro tentando acessar dado clinico individual.
- Auditor Plataforma tentando alterar dado operacional.
- Paciente tentando acessar consulta de outro paciente.
- Usuario tentando atualizar campo nao permitido.

## Decisoes pendentes

- TODO: definir granularidade minima para relatorios agregados.
- TODO: definir campos editaveis por perfil e entidade.
- TODO: validar escopo final do ADM Medico do Trabalho.
- TODO: validar CNPJ tecnico/operacional com juridico e DPO.
- TODO: definir break-glass e acesso excepcional.
- TODO: mapear cada regra para endpoint, tela, teste e evento.
- TODO: criar matriz de base legal por finalidade.

## Checklist

- [x] Perfis principais listados.
- [x] Classes de dados classificadas em alto nivel.
- [x] CRUD conceitual mapeado por perfil.
- [x] Regras especiais para medico independente, ADM Medico do Trabalho e CNPJ tecnico registradas.
- [x] Testes negativos candidatos listados.
- [ ] TODO: validar com produto, juridico, DPO, diretor tecnico, seguranca, QA e engenharia.
- [ ] TODO: derivar specifications por dominio.

## Referencias

- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [LGPD Checklist](LGPD_CHECKLIST.md)
- [Security Checklist](SECURITY_CHECKLIST.md)
- [Authorization Test Matrix](../08-quality/AUTHORIZATION_TEST_MATRIX.md)
- [LGPD Reference](../reference/LGPD.md)
- [Healthcare Reference](../reference/Healthcare.md)
