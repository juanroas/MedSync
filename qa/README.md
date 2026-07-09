# QA MedSync

Esta pasta concentra o agente de QA do MedSync para homologacao controlada.

Comandos principais:

```bash
npm run test:e2e
npm run test:e2e:ui
```

Variaveis uteis:

- `MEDSYNC_E2E_BASE_URL`: URL do frontend. Padrao: `http://localhost:3000`.
- `MEDSYNC_E2E_API_URL`: URL da API. Padrao: `http://localhost:8080`.
- `MEDSYNC_E2E_PASSWORD`: senha compartilhada das contas de homologacao.
- `MEDSYNC_E2E_MUTATING=1`: habilita testes que criam paciente/consulta.

Relatorio HTML: `apps/web/playwright-report/index.html`.
