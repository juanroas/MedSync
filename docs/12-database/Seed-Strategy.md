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

Em `Production`, o seed demo permanece bloqueado por padrao.

## Ambiente unico de apresentacao

Quando existir apenas um ambiente tecnico e ele estiver nomeado como `Production`, e permitido subir dados demo somente para apresentacao controlada, sem pacientes reais, usando todas as variaveis abaixo:

- `ENABLE_HOMOLOGATION_SEED=true`
- `SEED_DEMO_PASSWORD=<senha forte, diferente da senha local>`

Esse modo nao libera producao real. Ele apenas permite demo/homologacao em um ambiente unico que tecnicamente esta nomeado como producao.

A senha local `MedSyncLocal123!` e bloqueada nesse modo.

Depois do deploy, se o banco continuar vazio porque o servico subiu antes das variaveis ou nao reiniciou, acione o seed manualmente com uma chave operacional:

- `PRESENTATION_SEED_KEY=<chave longa aleatoria>`

Chamada:

```bash
curl -X POST https://<api-url>/ops/presentation-seed \
  -H "x-medsync-seed-key: <PRESENTATION_SEED_KEY>"
```

O endpoint retorna contadores de usuarios, empresas e beneficiarios. Ele nao retorna senhas, tokens, CPF completo ou dado clinico.

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
