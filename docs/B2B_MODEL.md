# Modelo B2B - MedSync

## Principio de privacidade

O empregador nunca pode acessar dados clinicos individuais do colaborador. Empresas podem ver apenas dados administrativos e agregados.

## Entidades iniciais

- `Company`: empresa contratante vinculada a uma clinica.
- `CompanyEmployee`: colaborador da empresa, opcionalmente vinculado a um paciente.
- `BenefitPlan`: plano de beneficio contratado.
- `CompanyContract`: contrato entre empresa e plano.
- `EmployeeEligibility`: historico de elegibilidade do colaborador.

## Dados permitidos para empresa

- Quantidade de consultas.
- Uso do beneficio.
- Status financeiro e contratual.
- Indicadores agregados sem diagnostico.

## Dados proibidos para empresa

- Diagnostico.
- Prontuario.
- Observacoes clinicas.
- Conteudo de chamada.
- Especialidade sensivel quando expuser condicao individual.
- Identificacao individual ligada a uso clinico sensivel.

## Proximas telas

- Empresas.
- Colaboradores.
- Planos de beneficio.
- Relatorio B2B agregado.
