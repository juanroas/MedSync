# Finance Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais para financeiro empresa/parceiro, financeiro plataforma/MedSync e financeiro do CNPJ tecnico.

## Escopo

Inclui faturas, status financeiro, cobrancas, pagamentos, conciliacao e uso agregado permitido.

Fora de escopo:

- Criar integracao de pagamento.
- Criar endpoints.
- Definir modelo fiscal/contabil final.
- Acessar dados clinicos.

## Perfis cobertos

- Financeiro Empresa/Parceiro.
- Financeiro Plataforma/MedSync.
- Suporte MedSync em consulta operacional limitada.
- Empresa/Parceiro Admin em visao administrativa permitida.

## Regras

- Financeiro nao acessa prontuario, diagnostico, conduta clinica ou observacao clinica.
- Financeiro Empresa/Parceiro ve faturas e uso agregado do CNPJ contratante.
- Financeiro Plataforma/MedSync ve operacao financeira geral e CNPJ tecnico com minimizacao.
- Financeiro CNPJ tecnico cobre pagamentos de pacientes diretos vinculados ao CNPJ tecnico.
- Retorno de pagamento nao e fonte de verdade.
- Webhook deve ser validado e idempotente quando implementado.

## Operacoes

| Operacao | Regra |
|---|---|
| Ver fatura | Conforme CNPJ/escopo |
| Atualizar status financeiro | Apenas por fluxo autorizado |
| Consultar pagamento | Sem dado clinico |
| Conciliar | TODO: validar regra |
| Exportar relatorio financeiro | Sem dado clinico e com minimizacao |

## Eventos de auditoria

- Criacao/alteracao de fatura.
- Alteracao de status financeiro.
- Recebimento de webhook.
- Divergencia de pagamento.
- Exportacao financeira.
- Tentativa de acesso a dado clinico.

## Testes negativos

- Financeiro acessando prontuario.
- Financeiro acessando diagnostico.
- Financeiro acessando observacao clinica.
- Financeiro usando retorno de pagamento como fonte de verdade.
- Financeiro de um CNPJ acessando fatura de outro CNPJ.

## TODO

- TODO: validar modelo financeiro por CNPJ.
- TODO: validar CNPJ tecnico.
- TODO: mapear integracao de pagamento.
- TODO: definir conciliacao.
- TODO: definir relatorios permitidos.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Cost Simulation](../13-devops/COST_SIMULATION.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
