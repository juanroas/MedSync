# API Guidelines - MedSync

Status: Architecture Blueprint. Nao cria endpoints.

## Objetivo

Definir diretrizes de API para desenvolvimento futuro.

## Escopo

Inclui autenticacao, autorizacao, erros, paginacao, filtros, versionamento e webhooks em nivel conceitual.

## Diretrizes

- Todo endpoint sensivel exige autenticacao.
- Autorizacao deve considerar tenant, perfil e vinculo.
- Erros devem ser consistentes e nao expor dados sensiveis.
- Listagens devem prever paginacao.
- Filtros e ordenacao devem usar campos permitidos.
- Webhooks devem ser idempotentes quando aplicavel.
- Status criticos devem ser controlados no backend.

## Contratos

TODO: Documentar contratos reais em `docs/11-api` quando implementados ou aprovados.

## Segurança

- Nao retornar dados clinicos para perfis administrativos.
- Nao expor token, CPF completo, prontuario ou segredo.
- Login deve evitar enumeracao de usuarios.

## Checklist

- [x] Diretrizes iniciais criadas.
- [ ] TODO: mapear endpoints reais.
- [ ] TODO: validar erros padronizados.
- [ ] TODO: criar contrato OpenAPI quando aplicavel.

## Referencias

- [API](../11-api/README.md)
- [Authorization](authorization/README.md)
- [Security](../07-security/README.md)
