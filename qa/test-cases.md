# Casos de Teste Funcionais

| ID | Caso | Resultado esperado |
|---|---|---|
| QA-001 | Login de todos os perfis previstos | Usuario entra ou troca senha temporaria |
| QA-002 | Empresa/parceiro cadastra ou importa beneficiario elegivel | Beneficiario vinculado ao CNPJ contratante |
| QA-003 | Suporte MedSync cadastra pessoa fisica no CNPJ tecnico | Pessoa vinculada ao CNPJ tecnico e evento auditado |
| QA-004 | CPF invalido | Formulario/API rejeitam |
| QA-005 | Atualizacao de dados cadastrais permitidos | Alteracao salva e evento auditado |
| QA-006 | Atualizacao de campo nao permitido pelo perfil | API bloqueia e audita tentativa |
| QA-007 | Consulta no passado | API rejeita |
| QA-008 | Conflito de agenda de medico | API retorna conflito |
| QA-009 | Paciente aceita termo | Consentimento auditavel |
| QA-010 | Paciente sem consentimento tenta entrar na consulta | Token de video bloqueado |
| QA-011 | Medico independente inicia consulta vinculada | Sala criada sem dados pessoais no nome |
| QA-012 | Paciente entra apos medico iniciar | Token LiveKit emitido para participante autorizado |
| QA-013 | Medico encerra consulta | Status concluido e evento auditado |
| QA-014 | Medico registra atendimento clinico | Registro vinculado a consulta, medico e paciente |
| QA-015 | ADM Medico do Trabalho acessa registro ocupacional do proprio CNPJ | Acesso permitido e auditado com finalidade |
| QA-016 | Empresa/parceiro abre dashboard administrativo | Exibe contrato, plano, elegibilidade, faturas e uso agregado |
| QA-017 | Financeiro empresa abre faturas do proprio CNPJ | Exibe cobrancas sem dado clinico |
| QA-018 | Auditor empresa consulta eventos administrativos | Exibe somente eventos do proprio CNPJ |
