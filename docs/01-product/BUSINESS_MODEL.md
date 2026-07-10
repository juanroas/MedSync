# Business Model - MedSync

Status: Product Discovery. Este documento registra hipoteses e diretrizes iniciais; nao representa modelo comercial aprovado.

## Objetivo

Definir o modelo de negocio inicial do MedSync como plataforma SaaS B2B de Saude Digital, separando hipoteses de decisoes ja documentadas.

## Escopo

Este documento cobre:

- Segmentos de cliente.
- Proposta de valor por publico.
- Hipoteses de receita.
- Canais e relacionamento.
- Estrutura de custos a validar.
- Metricas de negocio.
- Riscos comerciais.

Fora de escopo:

- Precificacao final.
- Contratos juridicamente aprovados.
- Promessas regulatorias.
- Funcionalidades nao documentadas.

## Segmentos de cliente

| Segmento | Descricao | Status |
|---|---|---|
| Empresas | Organizacoes que desejam contratar acesso a cuidado digital para pessoas elegiveis | Hipotese inicial |
| Operadoras, associacoes e parceiros | Possiveis canais, clientes institucionais ou distribuidores white label | TODO: validar aplicabilidade |
| Pessoas fisicas via suporte | Pacientes diretos vinculados ao CNPJ tecnico/operacional | Conceitual aprovado; requer validacao juridica/operacional |

## Proposta de valor

| Publico | Valor esperado |
|---|---|
| Empresa/Parceiro | Acompanhar contrato, elegibilidade e uso agregado permitido sem acessar dados clinicos individuais |
| Paciente/Beneficiario | Acessar atendimento digital com privacidade e jornada simples |
| Medico independente | Atender pacientes vinculados e registrar condutas de forma auditavel |
| ADM Medico do Trabalho | Apoiar saude ocupacional do CNPJ associado com acesso clinico restrito |
| Auditor/Privacidade | Ter evidencias de acesso, consentimento e controles |

## Hipoteses de receita

TODO: Validar modelo comercial.

Possibilidades a avaliar:

- Assinatura mensal por empresa contratante.
- Valor por pessoa elegivel.
- Valor por consulta realizada.
- Fluxo financeiro para pessoa fisica via CNPJ tecnico.
- Consulta avulsa transacional quando aprovada.
- Plano hibrido com mensalidade e uso.
- Modulos adicionais para auditoria, relatorios ou suporte enterprise.

## Canais

TODO: Validar canais prioritarios.

Hipoteses:

- Venda direta B2B.
- Parcerias com empresas de beneficios, saude corporativa ou acesso digital ao cuidado.
- Indicacao por consultorias de saude corporativa.

## Relacionamento com cliente

TODO: Definir modelo de atendimento e suporte.

Topicos a validar:

- Onboarding de empresas.
- Onboarding de medicos independentes.
- Onboarding de CNPJ tecnico/operacional quando aplicavel.
- Suporte tecnico.
- Suporte administrativo.
- Governanca de privacidade.
- SLAs para ambientes enterprise.

## Custos e operacao

TODO: Validar estrutura de custos antes de proposta comercial ou compromisso operacional.

Categorias esperadas:

- Infraestrutura.
- Videochamada.
- Pagamentos.
- Suporte.
- Seguranca e compliance.
- Operacao juridica e privacidade.
- QA e homologacao.

Simulacao inicial documentada:

- [Cost Simulation - MedSync](../13-devops/COST_SIMULATION.md)

Resumo preliminar:

| Fase | Estimativa mensal | Capacidade mensal estimada | Observacao |
|---|---:|---:|---|
| LiveKit Ship | US$ 170-270 | 370 consultas | Estimativa conservadora para piloto/homologacao |
| LiveKit Scale | US$ 620-720 | 5.000 consultas | Estimativa sujeita a quotas, testes de carga e contrato |

Esses valores nao incluem validacao juridica, suporte enterprise, impostos, cambio, incident response, pentest, observabilidade avancada ou eventuais custos adicionais por uso.

## Metricas de negocio

TODO: Validar metricas finais.

Metricas candidatas:

- Empresas contratantes ativas.
- Medicos independentes ativos.
- Pessoas elegiveis.
- Consultas agendadas, iniciadas e concluidas.
- Uso agregado por empresa.
- Receita recorrente.
- Churn de empresas/parceiros.
- Tempo de onboarding.
- Incidentes e riscos por cliente.

## Riscos comerciais

| Risco | Mitigacao documental |
|---|---|
| Vender como produto pronto antes da homologacao | Manter status de homologacao em documentos e materiais |
| Empresa solicitar dados clinicos individuais | Regra B2B explicita e contrato com limites claros |
| Precificacao desalinhada ao custo de video/operacao | Validar custos antes de proposta comercial |
| Responsabilidades LGPD mal definidas | Mapear controlador, operador e suboperadores por fluxo |
| Promessa regulatoria indevida | Exigir aprovacao juridica, privacidade e diretor tecnico |

## Decisoes pendentes

- ICP inicial.
- Modelo comercial prioritario.
- Politica de precificacao.
- SLAs e suporte.
- Contrato B2B padrao.
- Limites de relatorios por empresa.
- Processo de piloto e criterios de go/no-go.

## Checklist

- [x] Segmentos iniciais mapeados.
- [x] Proposta de valor inicial registrada.
- [x] Hipoteses de receita separadas de decisoes.
- [ ] TODO: validar precificacao.
- [ ] TODO: validar canais.
- [ ] TODO: validar custos.
- [ ] TODO: validar contrato e responsabilidades LGPD.

## Referencias

- [Product Vision](PRODUCT_VISION.md)
- [Product Blueprint B2B](PRODUCT_BLUEPRINT_B2B.md)
- [Modelo B2B](B2B_MODEL.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Cost Simulation](../13-devops/COST_SIMULATION.md)
- [Reference Business Rules](../reference/Business-Rules.md)
