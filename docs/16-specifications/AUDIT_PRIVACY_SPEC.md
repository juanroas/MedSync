# Audit and Privacy Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais para auditoria, privacidade, DPO, eventos, evidencias e direitos do titular.

## Escopo

Inclui eventos de auditoria, tentativas negadas, minimizacao, exportacao controlada, direitos do titular e acesso por DPO/privacidade.

Fora de escopo:

- Criar endpoint de exportacao.
- Definir processo juridico final.
- Declarar conformidade LGPD.
- Criar tela real.

## Perfis cobertos

- Auditor Empresa/Parceiro.
- Auditor Plataforma/MedSync.
- DPO/Privacidade.
- Admin Plataforma.

## Regras

- Auditor Empresa/Parceiro ve apenas eventos administrativos do proprio CNPJ.
- Auditor Empresa/Parceiro nao acessa dado clinico individual.
- Auditor Plataforma/MedSync pode ter visao por CNPJ e global com minimizacao.
- Auditor nao altera dados operacionais.
- DPO/Privacidade acessa dados por finalidade, base legal e minimizacao.
- Eventos nao devem conter CPF completo, token, senha, prontuario, diagnostico ou conteudo clinico desnecessario.

## Eventos minimos candidatos

- Login e falha de login.
- Criacao/atualizacao de cadastro.
- Alteracao de elegibilidade.
- Alteracao de contrato/plano.
- Criacao/cancelamento/reagendamento de consulta.
- Emissao de token de teleconsulta.
- Entrada/saida de teleconsulta.
- Leitura/criacao/retificacao de registro clinico.
- Leitura por ADM Medico do Trabalho.
- Tentativa de acesso negado.
- Exportacao ou solicitacao LGPD.

## Operacoes

| Operacao | Regra |
|---|---|
| Consultar eventos | Conforme perfil e escopo |
| Filtrar eventos | Sem expor dados sensiveis indevidos |
| Registrar processo LGPD | DPO/Privacidade quando aprovado |
| Exportar evidencias | TODO: validar controle |
| Alterar dado operacional | Nao permitido para auditor |

## Testes negativos

- Auditor Empresa/Parceiro acessando prontuario.
- Auditor Empresa/Parceiro acessando evento clinico individual.
- Auditor Plataforma alterando dado operacional.
- DPO acessando dado sem finalidade registrada.
- Evento contendo CPF completo, token ou prontuario.

## TODO

- TODO: definir catalogo de eventos final.
- TODO: definir retencao de logs.
- TODO: definir processo de direitos do titular.
- TODO: definir exportacao controlada.
- TODO: validar break-glass.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
- [LGPD Reference](../reference/LGPD.md)
- [Security Checklist](../07-security/SECURITY_CHECKLIST.md)
