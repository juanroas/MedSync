# Patient Care Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais da jornada do paciente/beneficiario para acesso ao cuidado digital.

## Escopo

Inclui cadastro, CNPJ de vinculo, elegibilidade, agendamento, minhas consultas, sala de espera, teleconsulta e atualizacao de dados proprios permitidos.

Fora de escopo:

- Criar UI.
- Criar endpoints.
- Definir regras clinicas finais.
- Autorizar atendimento real.

## Perfis cobertos

- Paciente/beneficiario via empresa/parceiro.
- Paciente/beneficiario via suporte/CNPJ tecnico.
- Suporte MedSync para cadastro administrativo permitido.

## Regras

- Paciente deve estar vinculado a um CNPJ contratante ou CNPJ tecnico.
- Paciente acessa apenas propria jornada.
- Paciente nao acessa consulta de outro paciente.
- Paciente pode atualizar dados cadastrais proprios permitidos.
- Paciente nao altera elegibilidade, fatura ou registro clinico.
- Entrada na teleconsulta depende de consulta vinculada, status, janela, consentimento e regra aplicavel.

## Operacoes

| Operacao | Regra |
|---|---|
| Criar cadastro | Via empresa/parceiro, suporte ou fluxo aprovado |
| Atualizar cadastro proprio | Apenas campos permitidos |
| Consultar elegibilidade | Apenas propria elegibilidade |
| Agendar consulta | Conforme elegibilidade e disponibilidade |
| Entrar em sala de espera | Somente consulta propria |
| Ver historico permitido | Apenas proprio historico permitido |

## Eventos de auditoria

- Criacao de cadastro.
- Atualizacao de cadastro.
- Aceite/revogacao de consentimento quando aplicavel.
- Agendamento/cancelamento/reagendamento.
- Entrada/saida de sala de espera.
- Tentativa de acessar consulta de outro paciente.

## Testes negativos

- Paciente acessando consulta de outro paciente.
- Paciente atualizando elegibilidade.
- Paciente acessando teleconsulta fora da janela.
- Paciente sem consentimento tentando entrar quando consentimento for exigido.
- Paciente tentando ver dados financeiros do CNPJ.

## TODO

- TODO: definir campos de cadastro editaveis.
- TODO: validar termos e consentimento.
- TODO: definir regras de disponibilidade.
- TODO: definir regras de historico permitido.
- TODO: mapear fluxo para CNPJ tecnico.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [MVP Scope](../01-product/MVP_SCOPE.md)
- [MVP Screen Flow](../02-design/MVP_SCREEN_FLOW.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
