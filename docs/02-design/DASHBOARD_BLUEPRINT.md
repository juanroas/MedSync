# Dashboard Blueprint - MedSync

Status: Blueprint. Nao representa dashboard implementado.

## Objetivo

Definir a estrutura conceitual dos dashboards por perfil.

## Escopo

Inclui visoes de dashboard para empresa/parceiro, paciente/beneficiario, medico independente, ADM Medico do Trabalho, financeiro e auditor.

Fora de escopo:

- Layout final.
- Graficos finais.
- Consultas de API.
- Permissoes implementadas.

## Dashboard Empresa/Parceiro

Papel: gestao de contrato, elegibilidade, faturamento e indicadores agregados permitidos. Este dashboard nao deve parecer prontuario, monitoramento clinico ou ferramenta de RH para acompanhar saude individual.

Conteudo permitido:

- Uso agregado do acesso ao cuidado.
- Beneficiarios elegiveis em visao administrativa.
- Status contratual.
- Indicadores financeiros.
- Linhas de cuidado contratadas em formato agregado, quando aprovado.

Conteudo proibido:

- Diagnostico.
- Prontuario.
- Observacoes clinicas.
- Dados clinicos individuais.

## Dashboard Paciente/Beneficiario

Conteudo:

- Acesso ao cuidado.
- Iniciar atendimento ou agendar consulta quando permitido.
- Minhas consultas.
- Status de consentimento.
- Pagamento quando aplicavel.
- Entrada para sala de espera.
- Historico permitido.

## Dashboard Medico Independente

Conteudo:

- Agenda do dia.
- Consultas vinculadas.
- Acoes de iniciar/encerrar atendimento quando permitido.
- Registro clinico autorizado.

## Dashboard ADM Medico do Trabalho

Conteudo:

- CNPJ associado.
- Registros ocupacionais permitidos.
- Diagnostico/prontuario/observacoes clinicas quando aprovado.
- Evidencias e trilha de auditoria.

Limites:

- Nao e RH.
- Nao libera dado clinico para empresa administrativa.
- Conteudo de chamada somente se houver gravacao/transcricao aprovada, o que nao e padrao.

## Dashboard Financeiro

Conteudo:

- Cobrancas.
- Status de pagamentos.
- Pendencias financeiras.
- Conciliacao.

Conteudo proibido:

- Prontuario.
- Diagnostico.
- Observacoes clinicas.

## Dashboard Auditor/Privacidade

Conteudo:

- Eventos de auditoria.
- Tentativas negadas.
- Filtros.
- Evidencias.

Limite:

- Nao alterar dados operacionais.

## Checklist

- [x] Dashboards por perfil definidos.
- [x] Dados proibidos destacados.
- [ ] TODO: validar metricas reais.
- [ ] TODO: mapear permissao por card.
- [ ] TODO: criar wireframes visuais.

## Referencias

- [Personas](../01-product/PERSONAS.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [Information Architecture](../01-product/INFORMATION_ARCHITECTURE.md)
- [B2B Model](../01-product/B2B_MODEL.md)
