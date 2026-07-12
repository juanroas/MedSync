# Contas Demo de Homologacao

Status: uso exclusivo em ambiente local/homologacao. Nao usar em producao, pacientes reais ou dados reais.

Senha local atual do Docker: `MedSyncLocal123!`

Em outros ambientes, usar o valor configurado em `SEED_DEMO_PASSWORD`.

Para HML, configurar:

- `ASPNETCORE_ENVIRONMENT=Homologation`
- `SEED_DEMO_PASSWORD=<senha forte de homologacao>`
- opcional em ambiente nao-producao: `ENABLE_HOMOLOGATION_SEED=true`

Se houver apenas um ambiente e ele estiver configurado como `Production`, usar modo apresentacao controlada:

- `ENABLE_HOMOLOGATION_SEED=true`
- `SEED_DEMO_PASSWORD=<senha forte, diferente da senha local>`
- opcional para acionamento manual apos deploy: `PRESENTATION_SEED_KEY=<chave longa aleatoria>`

Esse modo cria contas demo em ambiente publico, mas nao libera producao real nem pacientes reais. A senha local `MedSyncLocal123!` e bloqueada nesse modo.

Se o deploy ja subiu e o banco ficou vazio, chame:

```bash
curl -X POST https://<api-url>/ops/presentation-seed \
  -H "x-medsync-seed-key: <PRESENTATION_SEED_KEY>"
```

## MedSync / Operacao da Plataforma

| Perfil | E-mail | Escopo esperado |
|---|---|---|
| Admin plataforma | `admin@medsync.dev` | Administracao operacional do tenant MedSync |
| Financeiro MedSync | `plataforma.financeiro@medsync.dev` | Visao financeira operacional permitida |
| Suporte MedSync | `suporte@medsync.dev` | Apoio operacional sem acesso a prontuario |
| Auditor MedSync | `plataforma.auditor@medsync.dev` | Auditoria minimizada |
| DPO MedSync | `dpo@medsync.dev` | Direitos do titular e privacidade |
| Medico do trabalho | `medico.trabalho@medsync.dev` | Perfil bloqueado para acesso clinico real ate validacao formal |
| Paciente CNPJ tecnico | `paciente@medsync.dev` | Pessoa fisica assistida por suporte, uso real bloqueado |
| Paciente CNPJ tecnico | `paciente2@medsync.dev` | Pessoa fisica assistida por suporte, uso real bloqueado |
| Paciente CNPJ tecnico | `paciente3@medsync.dev` | Pessoa fisica assistida por suporte, uso real bloqueado |

## Empresa Demo

| Perfil | E-mail | Escopo esperado |
|---|---|---|
| Empresa admin | `empresa.admin@medsync.dev` | Contrato, plano, elegibilidade e uso agregado |
| Financeiro empresa | `empresa.financeiro@medsync.dev` | Faturas e uso financeiro minimizado |
| Auditor empresa | `empresa.auditor@medsync.dev` | Auditoria administrativa do proprio CNPJ |
| Paciente/beneficiario | `paciente.demo@medsync.dev` | Cuidado digital e solicitacoes proprias |
| Paciente/beneficiario | `paciente.demo2@medsync.dev` | Cuidado digital e solicitacoes proprias |
| Medico independente | `medico@medsync.dev` | Agenda e perfil profissional |

## Empresa Alfa

| Perfil | E-mail | Escopo esperado |
|---|---|---|
| Empresa admin | `empresa2.admin@medsync.dev` | Portal da Empresa Alfa |
| Financeiro empresa | `empresa2.financeiro@medsync.dev` | Faturas da Empresa Alfa |
| Auditor empresa | `empresa2.auditor@medsync.dev` | Auditoria da Empresa Alfa |
| Paciente/beneficiario | `paciente.empresa2@medsync.dev` | Beneficiario da Empresa Alfa |
| Medico independente | `medico.empresa2@medsync.dev` | Atendimento no tenant Empresa Alfa |

## Empresa Beta

| Perfil | E-mail | Escopo esperado |
|---|---|---|
| Empresa admin | `empresa3.admin@medsync.dev` | Portal da Empresa Beta |
| Financeiro empresa | `empresa3.financeiro@medsync.dev` | Faturas da Empresa Beta |
| Auditor empresa | `empresa3.auditor@medsync.dev` | Auditoria da Empresa Beta |
| Paciente/beneficiario | `paciente.empresa3@medsync.dev` | Beneficiario da Empresa Beta |
| Medico independente | `medico.empresa3@medsync.dev` | Atendimento no tenant Empresa Beta |

## Regras de Uso

- Cada empresa demo usa um tenant separado para testar isolamento por CNPJ.
- Cada empresa demo possui cinco beneficiarios administrativos ficticios para demonstrar elegibilidade e relatorios agregados.
- Todos os perfis autenticados acessam `/perfil` para editar dados pessoais permitidos.
- Edicao de `/perfil` nao altera papel, CNPJ, elegibilidade, CPF, CRM, especialidade, fatura ou dado clinico.
- Relatorios empresariais nao devem exibir prontuario, diagnostico, observacao clinica ou conteudo de chamada.
- Financeiro nao acessa elegibilidade individual nem fluxo de privacidade.
- Auditoria deve exibir tentativas negadas de forma minimizada.
- Go-live continua bloqueado ate aprovacoes juridicas, DPO, diretor tecnico, seguranca e QA completo.
