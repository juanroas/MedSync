# Casos de Teste Funcionais

| ID | Caso | Resultado esperado |
|---|---|---|
| QA-001 | Login de todos os perfis | Usuario entra ou troca senha temporaria |
| QA-002 | Recepcao cadastra paciente valido | Paciente criado com CPF mascarado |
| QA-003 | CPF invalido | Formulario/API rejeitam |
| QA-004 | Consulta no passado | API rejeita |
| QA-005 | Conflito de agenda | API retorna conflito |
| QA-006 | Paciente aceita termo | Consentimento auditavel |
| QA-007 | Medico inicia consulta | Sala criada sem dados pessoais no nome |
| QA-008 | Paciente entra apos medico iniciar | Token LiveKit emitido |
| QA-009 | Medico encerra consulta | Status concluido |
