# Modelo B2B - MedSync

Status: Product Discovery. Este documento descreve o modelo B2B conceitual e nao confirma implementacao completa.

## Objetivo

Definir o modelo B2B inicial do MedSync, preservando privacidade, separacao de responsabilidades e limites de acesso entre empresa, colaborador, clinica e equipe medica.

## Escopo

Este documento cobre:

- Principio de privacidade B2B.
- Atores do modelo.
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

O empregador nunca pode acessar dados clinicos individuais do colaborador.

Empresas podem acessar apenas dados administrativos, contratuais, financeiros e indicadores agregados, desde que esses dados nao revelem condicao clinica individual, diagnostico, prontuario, observacoes clinicas, conteudo de chamada ou especialidade sensivel vinculada a uma pessoa identificavel.

## Atores

| Ator | Papel | Limites |
|---|---|---|
| Empresa contratante | Contrata beneficio e acompanha uso administrativo/agregado | Nao acessa dado clinico individual |
| Colaborador | Pessoa elegivel ao beneficio, podendo atuar como paciente | Acessa apenas sua propria jornada |
| Clinica | Opera atendimento, agenda e equipe | Deve respeitar tenant, perfil e permissao |
| Medico | Atende paciente vinculado e registra conduta | Acessa somente dados clinicos autorizados |
| Financeiro | Acompanha cobrancas e status | Nao acessa prontuario ou diagnostico |
| Auditor/Privacidade | Consulta evidencias e eventos | Nao altera dados operacionais |

## Entidades iniciais

| Entidade | Descricao | Status |
|---|---|---|
| `Company` | Empresa contratante vinculada ao modelo B2B | Documentada conceitualmente |
| `CompanyEmployee` | Colaborador da empresa, opcionalmente vinculado a um paciente | Documentada conceitualmente |
| `BenefitPlan` | Plano de beneficio contratado | Documentada conceitualmente |
| `CompanyContract` | Contrato entre empresa e plano | Documentada conceitualmente |
| `EmployeeEligibility` | Historico de elegibilidade do colaborador | Documentada conceitualmente |

TODO: validar campos, regras, relacionamentos, eventos e permissoes em `docs/16-specifications`.

## Dados permitidos para empresa

Dados permitidos devem ser administrativos, contratuais, financeiros ou agregados.

Exemplos conceituais:

- Quantidade agregada de consultas.
- Uso agregado do beneficio.
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

- Uma empresa pode contratar o MedSync para colaboradores.
- Um colaborador pode ser elegivel a um beneficio.
- Um colaborador pode ser vinculado a uma jornada de paciente quando aplicavel.
- A empresa nao pode acessar dados clinicos individuais do colaborador.
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
- Utilizacao do beneficio.
- Indicadores financeiros e contratuais.
- Elegibilidade administrativa.

TODO: validar quais relatorios sao permitidos por contrato, base legal e politica de privacidade.

## Produtos internos relacionados

| Produto | Relacao com B2B |
|---|---|
| MedSync Business | Interface conceitual da empresa/RH para beneficio e relatorios permitidos |
| MedSync Care | Jornada do colaborador/paciente |
| MedSync Clinic | Operacao de clinica, medico, agenda e atendimento |
| MedSync Admin | Governanca, configuracoes, auditoria e operacao da plataforma |

## Proximas telas

As telas abaixo sao direcao de produto e nao confirmam implementacao:

- Empresas.
- Colaboradores.
- Planos de beneficio.
- Relatorio B2B agregado.

TODO: validar com UX, seguranca, LGPD e QA antes de qualquer implementacao.

## Riscos

| Risco | Mitigacao documental |
|---|---|
| Empresa solicitar dados clinicos individuais | Regra explicita de proibicao e contrato claro |
| Relatorio agregado permitir reidentificacao | Definir granularidade minima e revisao LGPD |
| Perfil administrativo acessar prontuario | Matriz de permissoes e testes negativos |
| Uso comercial antes da homologacao | Manter status de homologacao e checklist de go/no-go |
| Responsabilidade LGPD indefinida | Mapear controlador, operador e suboperadores por fluxo |

## Checklist

- [x] Principio de privacidade B2B definido.
- [x] Entidades iniciais listadas.
- [x] Dados permitidos e proibidos separados.
- [x] Produtos internos relacionados.
- [ ] TODO: validar campos das entidades.
- [ ] TODO: validar relatorios permitidos.
- [ ] TODO: criar matriz de permissoes detalhada.
- [ ] TODO: aprovar regras com juridico, privacidade e diretor tecnico.

## Referencias

- [Product Vision](PRODUCT_VISION.md)
- [Business Model](BUSINESS_MODEL.md)
- [Personas](PERSONAS.md)
- [User Journeys](USER_JOURNEYS.md)
- [Specifications](../16-specifications/README.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
