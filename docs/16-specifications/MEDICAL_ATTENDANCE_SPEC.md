# Medical Attendance Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais para medico independente, atendimento, agenda vinculada, teleconsulta e registro clinico.

## Escopo

Inclui medico independente, consulta vinculada, ramo/especialidade autorizada, registro clinico e auditoria.

Fora de escopo:

- Definir protocolo clinico.
- Criar prontuario implementado.
- Criar endpoints.
- Criar telas.

## Perfis cobertos

- Medico independente.
- Paciente/beneficiario.
- Auditor Plataforma/MedSync em eventos minimizados.
- DPO/Privacidade quando houver finalidade aprovada.

## Regras

- Medico independente nao precisa estar associado a clinica.
- Medico so acessa consulta vinculada a ele.
- Medico deve atuar dentro do ramo/especialidade autorizada.
- Medico nao acessa contrato, fatura ou elegibilidade empresarial.
- Registro clinico deve ter autoria, data/hora e auditoria.
- Retificacao/aditamento de registro clinico exige regra aprovada.
- Dado clinico nao atravessa para Business.

## Operacoes

| Operacao | Regra |
|---|---|
| Ver agenda | Apenas consultas vinculadas |
| Ver detalhe de consulta | Apenas consulta vinculada |
| Iniciar atendimento | Conforme status, janela e permissao |
| Registrar conduta | Apenas no atendimento vinculado |
| Retificar/aditar registro | TODO: validar regra |
| Encerrar atendimento | Conforme regra aprovada |

## Eventos de auditoria

- Visualizacao de consulta vinculada.
- Inicio de atendimento.
- Emissao de token de teleconsulta.
- Entrada/saida da teleconsulta.
- Criacao de registro clinico.
- Retificacao/aditamento.
- Tentativa de acesso sem vinculo.
- Tentativa de acesso fora do ramo autorizado.

## Testes negativos

- Medico acessando paciente sem consulta vinculada.
- Medico tentando ver consulta de outro medico.
- Medico tentando acessar contrato/fatura/elegibilidade empresarial.
- Medico tentando atender fora da janela.
- Medico tentando atuar fora do ramo autorizado.

## TODO

- TODO: validar credenciamento, CRM/UF e especialidade.
- TODO: validar regra de ramo de atividade.
- TODO: validar retificacao/aditamento.
- TODO: validar responsabilidade tecnica.
- TODO: mapear eventos reais.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [CFM Reference](../reference/CFM.md)
- [Healthcare Reference](../reference/Healthcare.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
