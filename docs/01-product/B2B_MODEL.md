# Modelo B2B - MedSync

Status: Product Discovery. Este documento descreve o modelo B2B conceitual e nao confirma implementacao completa.

## Objetivo

Definir o modelo B2B inicial do MedSync, preservando privacidade, separacao de responsabilidades e limites de acesso entre empresa/parceiro, paciente/beneficiario, medico independente, ADM Medico do Trabalho, financeiro e auditoria.

O B2B descrito aqui e uma camada de contratacao, elegibilidade, governanca e relatorios permitidos. Ele nao deve fazer o MedSync parecer sistema de RH nem deslocar o centro do produto, que e acesso ao cuidado em saude digital.

## Escopo

Este documento cobre:

- Principio de privacidade B2B.
- Atores do modelo.
- Perfis clinicos associados ao CNPJ.
- Entidades iniciais.
- Dados permitidos para empresas.
- Dados proibidos para empresas.
- Regras conceituais.
- Relatorios B2B.
- Pendencias de validacao.

Fora de escopo:

- Criar tabelas.
- Criar endpoints.
- Criar telas.
- Definir contrato juridico final.
- Declarar conformidade LGPD.

## Principio de privacidade

O empregador, patrocinador ou contratante nunca pode acessar dados clinicos individuais do paciente/beneficiario.

Empresas podem acessar apenas dados administrativos, contratuais, financeiros e indicadores agregados, desde que esses dados nao revelem condicao clinica individual, diagnostico, prontuario, observacoes clinicas, conteudo de chamada ou especialidade sensivel vinculada a uma pessoa identificavel.

## Camadas do modelo

| Camada | Objetivo | Exemplo de experiencia |
|---|---|---|
| Assistencial | Entregar acesso ao cuidado | Paciente inicia atendimento, agenda consulta ou entra em teleconsulta |
| Atendimento medico | Operar a prestacao de servico de saude | Medico independente gerencia agenda, atendimento e registros autorizados |
| B2B/Contratual | Viabilizar contrato e elegibilidade | Empresa gerencia plano, elegiveis, status contratual e uso agregado |
| Privacidade e auditoria | Controlar acesso e evidencias | Logs, bloqueios, trilhas, relatorios permitidos e revisao LGPD |

## Atores

| Ator | Papel | Limites |
|---|---|---|
| Empresa contratante | Contrata acesso a cuidado digital e acompanha uso administrativo/agregado | Nao acessa dado clinico individual |
| Paciente/beneficiario | Pessoa elegivel ao acesso contratado, podendo atuar como paciente | Acessa apenas sua propria jornada |
| Medico independente | Atende pacientes vinculados a consultas dentro do seu ramo de atividade autorizado | Acessa somente dados clinicos autorizados do atendimento |
| ADM Medico do Trabalho | Perfil clinico associado ao CNPJ para saude ocupacional | Acesso clinico restrito, auditado e sujeito a validacao juridica/LGPD/diretor tecnico |
| Financeiro | Acompanha cobrancas e status | Nao acessa prontuario ou diagnostico |
| Auditor/Privacidade | Consulta evidencias e eventos | Nao altera dados operacionais |

## Entidades iniciais

| Entidade | Descricao | Status |
|---|---|---|
| `Company` | Empresa contratante vinculada ao modelo B2B | Documentada conceitualmente |
| `CompanyBeneficiary` | Pessoa elegivel vinculada a uma empresa/parceiro, opcionalmente vinculada a um paciente | TODO: validar nomenclatura tecnica |
| `BenefitPlan` | Plano de acesso ou beneficio contratado | Documentada conceitualmente |
| `CompanyContract` | Contrato entre empresa e plano | Documentada conceitualmente |
| `BeneficiaryEligibility` | Historico de elegibilidade do paciente/beneficiario | TODO: validar nomenclatura tecnica |
| `TechnicalCompany` | CNPJ tecnico/operacional para pessoa fisica cadastrada via suporte | TODO: validar nomenclatura tecnica |
| `OccupationalHealthAdmin` | Perfil ADM Medico do Trabalho associado a CNPJ | TODO: validar modelo juridico/LGPD |

TODO: validar campos, regras, relacionamentos, eventos e permissoes em `docs/16-specifications`.

## Dados permitidos para empresa

Dados permitidos devem ser administrativos, contratuais, financeiros ou agregados.

Exemplos conceituais:

- Quantidade agregada de consultas.
- Uso agregado do acesso ao cuidado.
- Status financeiro e contratual.
- Indicadores administrativos sem diagnostico.
- Elegibilidade administrativa quando nao revelar dado clinico sensivel.

TODO: validar granularidade minima de agregacao para evitar reidentificacao.

## Dados proibidos para empresa

Empresas nao podem acessar:

- Diagnostico.
- Prontuario.
- Observacoes clinicas.
- Conteudo de chamada.
- Dados clinicos individuais.
- Especialidade sensivel quando expuser condicao individual.
- Identificacao individual ligada a uso clinico sensivel.
- Registros de atendimento que permitam inferencia clinica indevida.

## Regras conceituais

- Uma empresa ou parceiro pode contratar o MedSync para pessoas elegiveis.
- Um paciente/beneficiario pode ser elegivel a um acesso contratado.
- Uma pessoa fisica pode ser cadastrada via suporte no CNPJ tecnico/operacional.
- Um paciente/beneficiario pode ser vinculado a uma jornada de paciente quando aplicavel.
- A empresa nao pode acessar dados clinicos individuais do paciente/beneficiario.
- Medico independente pode atender pacientes de diferentes CNPJs quando houver consulta vinculada e escopo profissional autorizado.
- ADM Medico do Trabalho pode acessar dados clinicos ocupacionais no CNPJ associado somente com regra aprovada, finalidade, permissao e auditoria.
- Relatorios para empresas devem ser agregados ou administrativos.
- Perfis administrativos nao devem acessar prontuario quando nao houver permissao clinica.
- Toda tentativa de acesso indevido deve ser considerada evento de auditoria quando aplicavel.

TODO: validar regras finais com produto, juridico, privacidade e engenharia.

## Relatorios B2B

Relatorios B2B devem seguir estes principios:

- Minimizar dados.
- Agregar informacoes.
- Evitar reidentificacao.
- Separar indicadores administrativos de informacoes clinicas.
- Explicitar finalidade contratual.

Possiveis relatorios a validar:

- Uso agregado por periodo.
- Consultas realizadas por status.
- Utilizacao do acesso ao cuidado.
- Indicadores financeiros e contratuais.
- Elegibilidade administrativa.

TODO: validar quais relatorios sao permitidos por contrato, base legal e politica de privacidade.

## Produtos internos relacionados

| Produto | Relacao com B2B |
|---|---|
| MedSync Business | Interface conceitual da empresa/parceiro para contrato, elegibilidade, faturamento e relatorios permitidos |
| MedSync Care | Jornada do paciente/beneficiario para acesso ao cuidado |
| MedSync Medical | Jornada do medico independente e ADM Medico do Trabalho |
| MedSync Admin | Governanca, configuracoes, auditoria e operacao da plataforma |

## Proximas telas

As telas abaixo sao direcao de produto e nao confirmam implementacao:

- Acesso ao cuidado do paciente/beneficiario.
- Pronto atendimento digital ou consulta agendada, quando aprovado.
- Agenda e teleconsulta.
- Empresas e parceiros contratantes.
- Elegibilidade de beneficiarios.
- Medicos independentes.
- ADM Medico do Trabalho.
- Planos e contratos.
- Relatorio B2B agregado permitido.
- Financeiro por escopo.

TODO: validar com UX, seguranca, LGPD e QA antes de qualquer implementacao.

## Riscos

| Risco | Mitigacao documental |
|---|---|
| Empresa solicitar dados clinicos individuais | Regra explicita de proibicao e contrato claro |
| Relatorio agregado permitir reidentificacao | Definir granularidade minima e revisao LGPD |
| Perfil administrativo acessar prontuario | Matriz de permissoes e testes negativos |
| Uso comercial antes da homologacao | Manter status de homologacao e checklist de go/no-go |
| Responsabilidade LGPD indefinida | Mapear controlador, operador e suboperadores por fluxo |
| ADM Medico do Trabalho virar atalho de acesso do RH | Perfil clinico separado, permissao forte, auditoria e aprovacao juridica |
| Medico independente atender fora do ramo autorizado | Credenciamento, especialidade/escopo e testes de autorizacao |

## Checklist

- [x] Principio de privacidade B2B definido.
- [x] Entidades iniciais listadas.
- [x] Dados permitidos e proibidos separados.
- [x] Produtos internos relacionados.
- [ ] TODO: validar campos das entidades.
- [ ] TODO: validar relatorios permitidos.
- [x] Matriz de permissoes inicial criada.
- [ ] TODO: aprovar regras com juridico, privacidade e diretor tecnico.

## Referencias

- [Product Vision](PRODUCT_VISION.md)
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Market References](MARKET_REFERENCES.md)
- [Business Model](BUSINESS_MODEL.md)
- [Personas](PERSONAS.md)
- [User Journeys](USER_JOURNEYS.md)
- [Specifications](../16-specifications/README.md)
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
