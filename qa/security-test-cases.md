# Casos de Seguranca

| ID | Caso | Resultado esperado |
|---|---|---|
| SEC-001 | Login invalido repetido | Rate limit/bloqueio progressivo |
| SEC-002 | Cookie de sessao | HttpOnly, Secure em producao, SameSite |
| SEC-003 | Sessao encerrada | Logout invalida acesso por historico ou token antigo |
| SEC-004 | Swagger em producao | Desabilitado ou protegido |
| SEC-005 | Seed em producao | Desabilitado |
| SEC-006 | Secret scan | Nenhum segredo real versionado |
| SEC-007 | Token LiveKit sem consentimento | Bloqueado |
| SEC-008 | Token LiveKit para perfil administrativo | Bloqueado |
| SEC-009 | Token LiveKit para paciente de outro CNPJ | Bloqueado |
| SEC-010 | Nome de sala de video | Sem CPF, nome, e-mail, diagnostico ou especialidade sensivel |
| SEC-011 | Webhook com assinatura invalida | 401 ou rejeicao equivalente |
| SEC-012 | Webhook duplicado | Processamento idempotente |
| SEC-013 | Tentativa cross-CNPJ via URL/API | Bloqueada e auditada |
| SEC-014 | Armazenamento client-side | Sem senha, token sensivel, CPF completo ou dado clinico persistido indevidamente |
| SEC-015 | Erro inesperado | Sem stack trace, segredo, token ou dado pessoal sensivel |
