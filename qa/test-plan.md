# Plano de Teste

Status: plano para homologacao controlada. Este documento nao declara conformidade regulatoria nem libera uso com pacientes reais.

## Escopo

- Login multi-perfil.
- Autorizacao por perfil e por CNPJ.
- Isolamento entre CNPJs contratantes e CNPJ tecnico.
- Jornada de paciente/beneficiario via empresa/parceiro.
- Jornada de pessoa fisica cadastrada via suporte MedSync no CNPJ tecnico.
- Jornada de medico independente.
- Jornada de ADM Medico do Trabalho associado a CNPJ.
- CRUD e atualizacao de dados permitidos por perfil.
- Teleconsulta com consentimento e token LiveKit.
- Auditoria, LGPD, pagamentos e relatorios B2B agregados.

## Fora de escopo nesta fase

- Declaracao de conformidade LGPD, CFM, ANS ou juridica.
- Uso com pacientes reais.
- Pentest formal substituido por automacao.
- Validacao final de base legal, retencao e regras clinicas.

## Criterios de entrada

- Ambiente identificado como homologacao.
- Dados de teste sem pacientes reais.
- Perfis de teste criados por CNPJ.
- Permissoes alinhadas com `docs/07-security/PERMISSION_MATRIX.md`.
- Casos de autorizacao alinhados com `docs/08-quality/AUTHORIZATION_TEST_MATRIX.md`.

## Evidencias

- Relatorio HTML Playwright.
- Logs do GitHub Actions ou terminal local.
- Prints de falhas anexados ao relatorio.
- Registro manual em `docs/08-quality/QA_CHECKLIST.md`.
- Evidencia sanitizada de auditoria para acessos sensiveis.

## Bloqueadores de homologacao

- Empresa/parceiro acessa dado clinico individual.
- Financeiro acessa prontuario, diagnostico, observacao clinica ou conteudo de chamada.
- Suporte MedSync acessa dado clinico sem processo excepcional aprovado.
- Medico acessa paciente sem consulta vinculada.
- ADM Medico do Trabalho acessa CNPJ fora do escopo.
- Relatorio B2B permite reidentificacao indevida.
- Paciente acessa consulta de outro paciente.
