# Casos LGPD

| ID | Caso | Resultado esperado |
|---|---|---|
| LGPD-001 | CPF em listas administrativas | Exibe apenas mascarado quando nao houver necessidade operacional |
| LGPD-002 | Empresa/parceiro tenta prontuario | Acesso negado e auditado |
| LGPD-003 | Empresa/parceiro tenta diagnostico individual | Acesso negado e auditado |
| LGPD-004 | Financeiro tenta dados clinicos | Acesso negado e auditado |
| LGPD-005 | Suporte tenta acessar prontuario | Acesso negado e auditado |
| LGPD-006 | Auditor altera cadastro operacional | Acesso negado e auditado |
| LGPD-007 | ADM Medico do Trabalho acessa registro ocupacional autorizado | Acesso auditado com CNPJ, finalidade e usuario |
| LGPD-008 | ADM Medico do Trabalho acessa outro CNPJ | Acesso negado e auditado |
| LGPD-009 | Aceite de termo | Evento auditado com versao do termo |
| LGPD-010 | Exportacao do titular | Retorna apenas dados do titular, com minimizacao |
| LGPD-011 | Correcao de dado cadastral | Alteracao permitida conforme perfil e auditada |
| LGPD-012 | Logs de falha | Sem senha, token, CPF completo, prontuario ou diagnostico |
| LGPD-013 | Relatorio B2B de baixa granularidade | Bloqueado, agrupado ou minimizado |
| LGPD-014 | Pessoa fisica no CNPJ tecnico | Base legal, finalidade e vinculo registrados como TODO de validacao juridica |
