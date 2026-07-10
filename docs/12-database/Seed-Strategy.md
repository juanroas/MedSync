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

O seed roda automaticamente em `Development` ou quando `ASPNETCORE_ENVIRONMENT=Homologation`, condicionado a `SEED_DEMO_PASSWORD`.

Tambem pode rodar em ambiente nao-producao com `ENABLE_HOMOLOGATION_SEED=true`.

Em `Production`, o seed demo permanece bloqueado mesmo que a variavel seja informada.

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
- A base de homologacao cria cinco beneficiarios administrativos por CNPJ para permitir demonstracao de relatorios agregados com grupo minimo.

## Evidencias Esperadas

- `multi-company-seed.spec.ts` valida tenants Empresa Demo, Alfa e Beta.
- Financeiro nao acessa elegibilidade individual.
- Auditoria mostra tentativas negadas de forma minimizada.
- DPO opera solicitacoes de titular sem dado sensivel desnecessario.

## Checklist

- [x] Seed multiempresa local criado.
- [x] Contas demo documentadas.
- [x] Teste automatizado de isolamento multiempresa criado.
- [x] Seed habilitado para `Homologation` com `SEED_DEMO_PASSWORD`.
- [x] Seed bloqueado em `Production`.
- [x] Relatorios agregados cross-CNPJ para perfis MedSync implementados em homologacao.
