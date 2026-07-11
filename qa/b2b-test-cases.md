# Casos B2B

| ID | Caso | Resultado esperado |
|---|---|---|
| B2B-001 | Criar empresa/parceiro | Empresa vinculada ao CNPJ contratante |
| B2B-002 | Contratar plano empresarial | Contrato ativo com vigencia e limites registrados |
| B2B-003 | Cadastrar beneficiario elegivel | Vinculo administrativo sem expor prontuario |
| B2B-004 | Atualizar elegibilidade | Alteracao salva e auditada |
| B2B-005 | Beneficiario elegivel usa beneficio | Consulta permitida conforme plano |
| B2B-005A | Beneficiario elegivel solicita consulta por especialidade disponivel | Consulta criada e vinculada a medico disponivel do pool MedSync |
| B2B-005B | Beneficiario elegivel solicita especialidade indisponivel | Solicitacao bloqueada com orientacao para suporte MedSync |
| B2B-006 | Beneficiario inelegivel tenta usar beneficio | Acesso bloqueado ou fluxo de regularizacao iniciado |
| B2B-007 | Relatorio agregado por periodo | Sem diagnostico, prontuario, observacao clinica ou conteudo de chamada |
| B2B-008 | Relatorio com poucos registros | Bloqueia ou agrupa para reduzir risco de reidentificacao |
| B2B-009 | Empresa tenta dado clinico individual | Acesso negado e auditado |
| B2B-010 | Empresa tenta ver lista sensivel de quem consultou especialidade | Bloqueado ou agregado/minimizado |
| B2B-011 | Financeiro empresa consulta faturas | Exibe faturas e uso agregado do proprio CNPJ |
| B2B-012 | Financeiro empresa tenta prontuario | Acesso negado e auditado |
| B2B-013 | Suporte MedSync vincula pessoa fisica ao CNPJ tecnico | Vinculo criado com trilha de auditoria |
| B2B-014 | CNPJ tecnico gera visao financeira operacional | Exibe apenas dados financeiros permitidos |
| B2B-015 | Empresa tenta criar ou credenciar medico comum | Bloqueado; medico comum/generalista/especialista pertence ao pool operacional MedSync |
