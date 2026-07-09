# Casos LGPD

| ID | Caso | Resultado esperado |
|---|---|---|
| LGPD-001 | CPF em lista de pacientes | Exibe apenas mascarado |
| LGPD-002 | Recepcao tenta prontuario | Acesso negado |
| LGPD-003 | Financeiro tenta dados clinicos | Acesso negado |
| LGPD-004 | Admin tenta videochamada | Acesso negado |
| LGPD-005 | Auditor altera cadastro | Acesso negado |
| LGPD-006 | Aceite de termo | Evento auditado |
| LGPD-007 | Exportacao do titular | Retorna apenas dados do titular |
| LGPD-008 | Logs de falha | Sem senha, token ou CPF completo |
