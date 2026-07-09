# Casos de Seguranca

| ID | Caso | Resultado esperado |
|---|---|---|
| SEC-001 | Login invalido repetido | Rate limit/bloqueio progressivo |
| SEC-002 | Cookie de sessao | HttpOnly, Secure em producao, SameSite |
| SEC-003 | Swagger em producao | Desabilitado ou protegido |
| SEC-004 | Seed em producao | Desabilitado |
| SEC-005 | Token LiveKit sem consentimento | Bloqueado |
| SEC-006 | Token LiveKit de perfil administrativo | Bloqueado |
| SEC-007 | Webhook com assinatura invalida | 401 |
| SEC-008 | Secret scan | Nenhum segredo real versionado |
