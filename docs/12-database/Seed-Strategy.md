# Seed Strategy

Status: homologacao/local. Nao aprovado para producao ou pacientes reais.

## Objetivo

Criar dados ficticios suficientes para testar o MedSync como plataforma B2B2C:

- Operacao MedSync.
- Empresa contratante Demo.
- Empresa Alfa.
- Empresa Beta.
- Perfis por papel: empresa admin, financeiro, auditor, paciente/beneficiario e medico.
- Isolamento por tenant/CNPJ.
- Auditoria, privacidade, elegibilidade e financeiro minimizados.

## Ambientes

O seed roda apenas em `Development`, condicionado a `SEED_DEMO_PASSWORD`.

Em producao:

- Seed demo deve estar desabilitado.
- Contas demo nao podem existir.
- Dados reais nao devem ser importados por este mecanismo.

## Estrutura Atual

| Tenant | Empresa/CNPJ de teste | Objetivo |
|---|---|---|
| MedSync Medical | Empresa Demo | Compatibilidade com os testes ja existentes e perfis MedSync |
| Empresa Alfa - Homologacao | Empresa Alfa | Testar segunda empresa contratante |
| Empresa Beta - Homologacao | Empresa Beta | Testar terceira empresa contratante |

As contas estao documentadas em [DEMO_ACCOUNTS.md](../08-quality/DEMO_ACCOUNTS.md).

## Seguranca

- Usar apenas dados ficticios.
- Nao registrar CPF real, prontuario, diagnostico, token ou conteudo de chamada.
- Senha local atual existe apenas para Docker/homologacao e vem de `SEED_DEMO_PASSWORD`.
- Cada empresa deve consultar apenas dados do proprio tenant.

## Evidencias Esperadas

- `multi-company-seed.spec.ts` valida tenants Empresa Demo, Alfa e Beta.
- Financeiro nao acessa elegibilidade individual.
- Auditoria mostra tentativas negadas de forma minimizada.
- DPO opera solicitacoes de titular sem dado sensivel desnecessario.

## Checklist

- [x] Seed multiempresa local criado.
- [x] Contas demo documentadas.
- [x] Teste automatizado de isolamento multiempresa criado.
- [ ] TODO: expandir relatorios agregados cross-CNPJ para perfil MedSync quando a especificacao global for aprovada.
- [ ] TODO: remover ou bloquear seed demo fora de `Development`.
