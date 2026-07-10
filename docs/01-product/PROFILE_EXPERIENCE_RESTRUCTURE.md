# Profile Experience Restructure - MedSync

Status: implementado parcial em ambiente local/homologacao. Nao aprova producao.

## Objetivo

Registrar a correcao de rumo sobre perfis, navegacao e experiencia do produto para evitar que o MedSync pareca um sistema generico de RH, agenda ou administracao.

## Decisoes aplicadas

### Empresa/parceiro admin

Deve ver contrato, plano, elegibilidade, faturas e uso agregado permitido do CNPJ.

Nao deve ver dado clinico individual, lista sensivel de consultas, diagnostico, prontuario, observacao clinica ou conteudo da chamada.

### Financeiro empresa

Nao deve parecer igual ao admin da empresa.

Deve priorizar faturas, historico financeiro, contrato e uso agregado. Nao deve ter aba de consultas individuais.

### Auditor empresa

Nao deve parecer igual ao admin da empresa.

Deve priorizar evidencias administrativas, auditoria e limites de acesso. Nao altera dados operacionais e nao ve dado clinico individual.

### Medico independente

Nao cria a propria agenda no modelo B2B.

Ve agenda vinculada, pacientes vinculados a consultas sob sua responsabilidade e relatorios por dia, semana, mes e ano.

Paciente aparece para o medico somente quando ha consulta vinculada.

### Paciente/beneficiario

Ve sua propria jornada, consultas e cadastro.

Edicao do proprio cadastro permanece como TODO ate existir endpoint de update, matriz de campos permitidos e auditoria.

### Admin plataforma

Nao deve ser usado como atalho de agenda.

Na experiencia atual, tem visao de relatorios da plataforma, CNPJs, CNPJ tecnico e exportacoes futuras. Se tambem possuir role legado `ClinicAdmin`, a UI deve dar precedencia ao comportamento de `PlatformAdmin`.

### ADM Medico do Trabalho

Permanece perfil clinico associado a CNPJ, separado de RH. Precisa validacao juridica, DPO e diretor tecnico para escopo final de dados clinicos ocupacionais.

### Medico geral MedSync

Perfil conceitual ainda nao implementado como role separada.

TODO: decidir se sera uma nova role ou se ficara dentro de `PlatformAdmin` com escopo de relatorios clinicos minimizados e aprovados.

## Itens corrigidos em codigo

- Card de privacidade empresarial ficou legivel.
- `Doctor` nao ve acao de criar consulta.
- `PlatformAdmin` nao ve acao de criar consulta, mesmo quando possui role legado `ClinicAdmin`.
- `CompanyFinance` nao ve aba `Consultas`.
- Dashboard do medico passou a mostrar indicadores por periodo.
- Dashboard financeiro empresa passou a ter prioridade financeira.
- Dashboard admin plataforma passou a ter foco em relatorios.

## Evidencias

- `npm run typecheck:web`
- `npm run test:e2e --workspace=@medsync/web -- --project=chromium --workers=1 profile-experience.spec.ts company-business-dashboard.spec.ts patient-care-dashboard.spec.ts`

## Proximos TODO

- Criar endpoint de update cadastral com campos permitidos por perfil.
- Criar role ou escopo especifico para Medico Geral MedSync, se aprovado.
- Criar relatorios reais por CNPJ, periodo e especialidade permitida.
- Separar financeiro empresa e financeiro plataforma em endpoints especificos.
- Definir jornada de elegibilidade por CPF e primeiro acesso.
- Definir fluxo de selecao por especialidade para paciente/beneficiario.
