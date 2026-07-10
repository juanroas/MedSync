# Diretrizes do MedSync

O MedSync nao e apenas um sistema de telemedicina.

O MedSync e uma plataforma de Saude Digital com modelo B2B, voltada para acesso ao cuidado por pacientes/beneficiarios e operacao para empresas, clinicas, operadoras, associacoes e parceiros.

Toda decisao tecnica deve priorizar:

- Seguranca
- Escalabilidade
- Simplicidade
- Experiencia do usuario
- LGPD by Design
- Multi-tenancy
- Codigo limpo
- Manutenibilidade

Regra anti-ilusao obrigatoria:

- Documentacao nao e entrega de produto quando a tarefa pede execucao.
- Referencia externa nao esta incorporada ate estar rastreada, priorizada e ligada a backlog, UX, especificacao, QA e implementacao ou bloqueio.
- Toda resposta final deve separar `Implementado`, `Documentado`, `Validado`, `Ainda falta` e `Ambiente/links`.
- Nao dizer que uma etapa esta finalizada se nao houver evidencia ou se o resultado esperado pelo usuario era tela/API/teste.
- Quando o usuario disser "continua", "faz tudo" ou "finaliza", executar ate o proximo resultado verificavel quando o readiness permitir.

Antes de qualquer tarefa baseada em referencia externa, ler:

- [EXECUTION_GUARDRAILS.md](EXECUTION_GUARDRAILS.md)
- [REFERENCE_TRACEABILITY_MATRIX.md](../01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md](../14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)

Toda implementacao deve responder as seguintes perguntas:

1. Resolve um problema real do cliente?
2. Esta alinhada ao modelo B2B?
3. Respeita a LGPD?
4. Respeita o principio do menor privilegio?
5. Esta preparada para escalar?
6. Possui documentacao?
7. Possui testes?
8. Possui auditoria?
9. Mantem compatibilidade com funcionalidades existentes?
10. Segue o Design System?

O MedSync possui quatro produtos internos:

- MedSync Business: portal para empresas/parceiros, contratos, elegibilidade, faturamento e indicadores agregados permitidos.
- MedSync Care: portal do paciente/beneficiario para acesso ao cuidado, consultas e teleconsulta.
- MedSync Medical: portal do medico independente e da operacao clinica autorizada.
- MedSync Admin: backoffice da plataforma.

Todos utilizam a mesma API, o mesmo dominio de negocio e o mesmo banco de dados multi-tenant.

O empregador, patrocinador ou contratante nunca tera acesso ao prontuario, diagnostico, conteudo da consulta ou qualquer dado clinico individual.

Toda informacao exibida para empresas/parceiros devera ser agregada, anonimizada quando aplicavel e limitada a finalidade do contrato.

Nenhuma funcionalidade podera ser implementada sem considerar:

- arquitetura;
- UX;
- LGPD;
- seguranca;
- auditoria;
- testes;
- documentacao.

Nenhuma funcionalidade orientada por referencia externa podera ser considerada pronta sem:

- linha na matriz de rastreabilidade;
- tela ou fluxo afetado;
- decisao de prioridade;
- criterio de aceite;
- teste esperado;
- evidencia real se houver implementacao.

Antes de iniciar qualquer Sprint, o agente deve ler a documentacao relevante do projeto para entender o contexto e evitar retrabalho.

Ao finalizar cada Sprint, devera:

- atualizar a documentacao;
- gerar relatorio da Sprint;
- informar claramente o que foi somente documentado;
- informar claramente o que foi implementado;
- informar claramente o que foi validado;
- listar riscos encontrados;
- listar pendencias;
- sugerir melhorias para a proxima Sprint.

O objetivo do MedSync e ser uma plataforma enterprise de saude digital comparavel as melhores solucoes do mercado, mantendo alta qualidade tecnica, seguranca, excelente experiencia do usuario e revisao regulatoria adequada antes de qualquer uso real.
