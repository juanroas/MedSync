# QA MedSync

Esta pasta concentra os planos e casos de QA do MedSync para homologacao controlada.

Status: planejamento de QA. Nenhum teste deve ser marcado como aprovado sem evidencia de execucao.

## Documentos

- [Plano de teste](test-plan.md)
- [Casos UAT por perfil](profile-uat-test-cases.md)
- [Casos funcionais](test-cases.md)
- [Casos de autorizacao](authorization-test-cases.md)
- [Casos de seguranca](security-test-cases.md)
- [Casos LGPD](lgpd-test-cases.md)
- [Casos B2B](b2b-test-cases.md)

## Referencias

- [Matriz de autorizacao](../docs/08-quality/AUTHORIZATION_TEST_MATRIX.md)
- [Matriz de permissoes](../docs/07-security/PERMISSION_MATRIX.md)
- [Checklist QA](../docs/08-quality/QA_CHECKLIST.md)
- [Plano de Homologacao por Perfis](../docs/08-quality/PROFILE_UAT_HOMOLOGATION_PLAN.md)

## Comandos principais

```bash
npm run test:e2e
npm run test:e2e:ui
```

## Variaveis uteis

- `MEDSYNC_E2E_BASE_URL`: URL do frontend. Padrao: `http://localhost:3000`.
- `MEDSYNC_E2E_API_URL`: URL da API. Padrao: `http://localhost:8080`.
- `MEDSYNC_E2E_PASSWORD`: senha compartilhada das contas de homologacao.
- `MEDSYNC_E2E_MUTATING=1`: habilita testes que criam dados de homologacao.

## Evidencias

- Relatorio HTML: `apps/web/playwright-report/index.html`.
- Logs do pipeline ou terminal.
- Capturas de tela quando o teste for manual.
- Requisicoes/respostas sanitizadas quando o teste for de API.
- Evento de auditoria sanitizado quando aplicavel.
