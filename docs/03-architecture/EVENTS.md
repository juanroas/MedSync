# Events - MedSync

Status: Architecture Blueprint. Nao implementa eventos.

## Objetivo

Definir catalogo conceitual de eventos relevantes para auditoria, seguranca, privacidade e produto.

## Escopo

Inclui eventos candidatos para auditoria e integracoes futuras.

## Eventos candidatos

| Dominio | Evento | Observacao |
|---|---|---|
| Identity | Login realizado | Sem token ou segredo |
| Identity | Falha de login | Mensagem sem enumeracao |
| Identity | Acesso negado | Deve registrar contexto minimo |
| Patient | Cadastro criado/alterado | Evitar dados sensiveis no log |
| Appointment | Consulta criada/alterada/cancelada | Auditar ator e tenant |
| Consent | Termo aceito | Registrar data, versao e ator |
| Video | Token solicitado/emitido | Nao registrar token |
| Video | Entrada/saida da sala | Registrar metadados seguros |
| Medical | Prontuario acessado/alterado | Altamente sensivel |
| Payment | Checkout criado | Sem dados de cartao |
| Payment | Webhook processado | Idempotencia |
| B2B | Elegibilidade alterada | Sem dado clinico |
| Privacy | Solicitacao LGPD criada | Controlar acesso |

## Regras

- Eventos nao devem conter segredo, token, senha, CPF completo ou prontuario.
- Eventos sensiveis precisam de retencao definida.
- Tentativas negadas sao relevantes.

## Checklist

- [x] Eventos candidatos listados.
- [ ] TODO: validar catalogo final.
- [ ] TODO: definir payload seguro.
- [ ] TODO: definir retencao.

## Referencias

- [Security Checklist](../07-security/SECURITY_CHECKLIST.md)
- [LGPD](../reference/LGPD.md)
- [Audit](../09-production/RISK_REGISTER.md)
