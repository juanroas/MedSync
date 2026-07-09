# Registro de Riscos - MedSync

| Risco | Impacto | Probabilidade | Mitigacao | Status |
|---|---:|---:|---|---|
| Acesso indevido a prontuario | Alto | Medio | RBAC, testes negativos, auditoria | Em andamento |
| Vazamento de token ou CPF em log | Alto | Medio | Sanitizacao, revisao de logs, secret scan | Em andamento |
| Paciente entrar sem consentimento | Alto | Baixo | Validacao backend antes do token LiveKit | Mitigado tecnicamente |
| Conflito de agenda medica | Medio | Medio | Validacao backend de sobreposicao | Mitigado tecnicamente |
| Empresa acessar dado clinico individual | Alto | Medio | Modelo B2B segregado e relatorios agregados | Em desenho |
| Webhook de pagamento duplicado | Medio | Medio | Idempotencia por payment id/status | Parcial |
| Falta de MFA para perfis sensiveis | Alto | Medio | Implementar MFA obrigatorio antes de producao | Aberto |
| Sem revogacao de sessao | Alto | Medio | Refresh token rotativo e tela de sessoes | Aberto |
| Backup sem restauracao testada | Alto | Medio | Rotina de restore em homologacao | Aberto |
| Dependencia vulneravel | Medio | Medio | Dependency scan no CI e triagem | Em andamento |
