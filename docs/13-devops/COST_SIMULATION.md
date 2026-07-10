# Cost Simulation - MedSync

Status: simulacao preliminar. Os valores abaixo sao estimativas para planejamento e nao devem ser usados como proposta comercial sem reconferencia de precos, contrato, impostos, cambio e consumo real.

## Objetivo

Registrar uma simulacao inicial de infraestrutura e capacidade operacional para o MedSync usando LiveKit, Railway e Vercel.

## Escopo

Inclui:

- Custo mensal estimado por fase.
- Capacidade operacional estimada.
- Capacidade simultanea informada.
- Premissas e ressalvas.
- Fontes de preco a reconferir.

Fora de escopo:

- Orcamento final.
- Contrato com fornecedores.
- Garantia de capacidade.
- SLA comercial.
- Analise de impostos, cambio ou suporte enterprise.

## Fontes de preco a reconferir

- LiveKit Pricing: https://livekit.com/pricing
- LiveKit quotas and limits: https://docs.livekit.io/deploy/admin/quotas-and-limits/
- Railway Pricing: https://railway.com/pricing
- Railway pricing docs: https://docs.railway.com/pricing/plans
- Vercel Pricing: https://vercel.com/pricing
- Vercel Pro plan: https://vercel.com/docs/plans/pro-plan

## Premissas

- Duracao media de consulta: 30 minutos.
- Cada consulta considera 2 participantes.
- Valores estimados em USD.
- Video em cenario conservador com uso continuo.
- Bitrate adaptativo WebRTC pode reduzir consumo real.
- Banco, storage, logs, backups, observabilidade, suporte e egress podem alterar custo final.

## Fase 1 - LiveKit Ship

### Custo mensal estimado

| Item | Estimativa |
|---|---:|
| LiveKit | US$ 50 |
| Railway | US$ 100-200 |
| Vercel | US$ 20 |
| Total | US$ 170-270/mes |

### Capacidade operacional estimada

| Metrica | Estimativa |
|---|---:|
| Consultas/mes | 370 |
| Duracao media | 30 minutos |
| Horas de atendimento | 185 horas |
| Tempo total dos participantes | 370 horas |
| Participant-minutes | 22.200 |
| Banda utilizada | 250 GB |
| Consultas simultaneas | Ate 500 |
| Participantes simultaneos | Ate 1.000 |

## Fase 2 - LiveKit Scale

### Custo mensal estimado

| Item | Estimativa |
|---|---:|
| LiveKit | US$ 500 |
| Railway | US$ 100-200 |
| Vercel | US$ 20 |
| Total | US$ 620-720/mes |

### Capacidade operacional estimada

| Metrica | Estimativa |
|---|---:|
| Consultas/mes | 5.000 |
| Duracao media | 30 minutos |
| Horas de atendimento | 2.500 horas |
| Tempo total dos participantes | 5.000 horas |
| Participant-minutes | 300.000 |
| Banda utilizada | 3,29 TB |
| Consultas simultaneas | Ate 2.500 |
| Participantes simultaneos | Ate 5.000 |

## Interpretacao preliminar

- Com cerca de US$ 200/mes, o MedSync poderia planejar um piloto com aproximadamente 370 consultas mensais, sujeito a limites reais dos fornecedores e testes de carga.
- Com cerca de US$ 700/mes, a plataforma poderia planejar crescimento para aproximadamente 5.000 consultas mensais, sujeito a arquitetura, quotas, banco, API, observabilidade e suporte.
- Estes numeros devem ser tratados como capacidade de planejamento, nao como garantia operacional.

## Riscos

| Risco | Mitigacao |
|---|---|
| Preco de fornecedor mudar | Revalidar antes de proposta ou budget |
| Quotas diferentes do plano contratado | Conferir limites oficiais e contrato |
| API, banco ou Redis virarem gargalo | Executar teste de carga e monitoramento |
| Custos de logs, egress e storage crescerem | Definir budgets, alertas e retencao |
| Cambio e impostos alterarem custo BRL | Simular em BRL antes de venda |
| Suporte enterprise ser necessario | Validar plano e SLA com fornecedor |

## Checklist

- [x] Estimativa inicial registrada.
- [x] Fases Ship e Scale documentadas.
- [x] Fontes de preco listadas para reconferencia.
- [ ] TODO: validar precos oficiais no momento da contratacao.
- [ ] TODO: executar teste de carga.
- [ ] TODO: simular custo em BRL com cambio e impostos.
- [ ] TODO: definir alertas de budget.
- [ ] TODO: validar limites contratuais e SLAs.

## Referencias

- [Business Model](../01-product/BUSINESS_MODEL.md)
- [Production Checklist](../09-production/PRODUCTION_CHECKLIST.md)
- [Monitoring](Monitoring.md)
- [Observability](Observability.md)
