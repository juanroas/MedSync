# Identity and Access Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais de identidade, perfis, sessoes, autenticacao e autorizacao.

## Escopo

Inclui login, perfis, escopos por CNPJ/tenant, MFA, sessoes, auditoria de acesso e bloqueios.

Fora de escopo:

- Criar endpoints.
- Criar tabelas.
- Definir provider de identidade.
- Declarar conformidade.

## Perfis cobertos

- Paciente/beneficiario.
- Empresa/Parceiro Admin.
- Medico independente.
- ADM Medico do Trabalho.
- Financeiro Empresa/Parceiro.
- Financeiro Plataforma/MedSync.
- Suporte MedSync.
- Auditor Empresa/Parceiro.
- Auditor Plataforma/MedSync.
- DPO/Privacidade.
- Admin Plataforma.

## Regras

- Todo usuario deve ter perfil, escopo e CNPJ/tenant quando aplicavel.
- Autorizacao deve considerar perfil, CNPJ/tenant, vinculo, finalidade e permissao.
- Perfis sensiveis devem ter MFA antes de producao.
- Login deve evitar enumeracao de usuarios.
- Sessao deve usar cookie HttpOnly, Secure e SameSite adequado ao ambiente.
- Token sensivel nao deve ser salvo em localStorage.
- Alteracao de role, permissao ou escopo deve gerar auditoria.

## Eventos de auditoria

- Login.
- Falha de login.
- Logout.
- Criacao de usuario.
- Alteracao de perfil.
- Alteracao de escopo/CNPJ.
- Revogacao de sessao.
- Tentativa de acesso negado.

## Testes negativos

- Usuario sem perfil tentando acessar area autenticada.
- Usuario de um CNPJ tentando acessar dados de outro CNPJ.
- Empresa/Parceiro Admin tentando acessar dados clinicos.
- Auditor tentando alterar dado operacional.
- Perfil sensivel sem MFA quando MFA for obrigatorio.

## TODO

- TODO: validar roles reais no codigo.
- TODO: definir politica de senha e MFA.
- TODO: definir tempo de sessao por perfil.
- TODO: mapear endpoints e telas.
- TODO: validar matriz com juridico, DPO, seguranca e engenharia.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [Security Checklist](../07-security/SECURITY_CHECKLIST.md)
- [API Guidelines](../03-architecture/API_GUIDELINES.md)
- [Multi Tenancy](../03-architecture/MULTI_TENANCY.md)
