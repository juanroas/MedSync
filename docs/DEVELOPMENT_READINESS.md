# Development Readiness - MedSync

Status: pronto para iniciar desenvolvimento controlado em ambiente local ou homologacao. Nao aprovado para producao ou pacientes reais.

# Objetivo

Definir o ponto minimo para iniciar desenvolvimento do MedSync com base na documentacao de produto, UX, arquitetura, design system, seguranca, QA e operacao.

# Escopo

Este documento cobre readiness documental para desenvolvimento.

Fora de escopo:

- Aprovar producao.
- Aprovar atendimento com pacientes reais.
- Declarar conformidade LGPD/CFM/ANS.
- Substituir revisao juridica, privacidade, seguranca ou diretor tecnico.

# Estrutura

Documentos base:

- [Sprint 1 Report](01-product/SPRINT_1_REPORT.md)
- [Sprint 2 Report](02-design/SPRINT_2_REPORT.md)
- [Sprint 3 Report](03-architecture/SPRINT_3_REPORT.md)
- [Sprint 3.5 Report](02-design/SPRINT_3_5_REPORT.md)
- [Design System Readiness](02-design/DESIGN_SYSTEM_READINESS.md)
- [Architecture Overview](03-architecture/ARCHITECTURE_OVERVIEW.md)
- [Security](07-security/README.md)
- [Quality](08-quality/README.md)
- [Production](09-production/README.md)
- [Skills Standard](agentes/SKILLS_STANDARD.md)
- [Execution Guardrails](agentes/EXECUTION_GUARDRAILS.md)
- [Reference Traceability Matrix](01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [Reference Aligned Implementation Plan](14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)

# Fluxo

Antes de iniciar desenvolvimento:

1. Ler produto: Product Vision, Business Model, Personas, Journeys, Feature Catalog, B2B Model.
2. Ler Execution Guardrails.
3. Se houver referencias externas, validar Reference Traceability Matrix e Reference Aligned Implementation Plan.
4. Ler UX: UX Guidelines, Wireframes, Dashboard Blueprint, Copywriting Guidelines.
5. Ler arquitetura: Architecture Overview, Module Boundaries, Multi Tenancy, API Guidelines, Events.
6. Ler design system: Component Library, UI States, Accessibility, Responsive Guidelines.
7. Ler seguranca/LGPD: checklists e referencias.
8. Ler QA: checklist e plano de testes.
9. Selecionar skill apropriada em `.agents/skills`.
10. Definir escopo de implementacao como local ou homologacao.

# Boas práticas

- Implementar em fatias pequenas.
- Implementar a proxima fatia rastreada quando o usuario pedir continuidade e o readiness permitir.
- Nao tratar documentacao como implementacao.
- Criar criterios de aceite antes do codigo.
- Comecar por componentes reutilizaveis quando a tela depender deles.
- Nao remover `TODO` sem validacao.
- Nao publicar em producao sem checklist e aprovacao formal.
- Nao usar dados reais em desenvolvimento.
- Nao versionar segredos.

# Checklist

Readiness documental:

- [x] Sprint 1 Product Blueprint concluida.
- [x] Sprint 2 UX/UI Blueprint concluida.
- [x] Sprint 3 Architecture Blueprint concluida.
- [x] Sprint 3.5 Design System Blueprint concluida.
- [x] Skills project-local criadas em `.agents/skills`.
- [x] Referencias LGPD/CFM/Telessaude registradas.
- [x] Simulacao de custo documentada.
- [x] Primeira fatia de Design System implementada para homologacao/local.
- [x] Protocolo anti-ilusao e rastreabilidade de referencias criado.

Permitido iniciar:

- [x] Desenvolvimento local.
- [x] Desenvolvimento em ambiente de teste/homologacao.
- [x] Prototipo funcional sem pacientes reais.
- [x] Primeira fatia de desenvolvimento iniciada: perfis B2B, seed demo, permissoes base e E2E alinhados.
- [x] Desenvolvimento guiado por referencias rastreadas, desde que limitado a local/homologacao.

Bloqueado:

- [ ] Producao.
- [ ] Pacientes reais.
- [ ] Claim de conformidade LGPD/CFM.
- [ ] Relatorios B2B sem validacao juridica/privacidade.

Pendencias antes de producao:

- [ ] TODO: validacao juridica.
- [ ] TODO: validacao do encarregado de dados.
- [ ] TODO: validacao do diretor tecnico.
- [ ] TODO: QA completo.
- [ ] TODO: pentest ou avaliacao de seguranca aplicavel.
- [ ] TODO: teste de carga.
- [ ] TODO: backup/restore testado.
- [ ] TODO: runbooks aprovados.

# Referências

- [Documentacao](README.md)
- [Product Roadmap](01-product/ROADMAP.md)
- [Design System Readiness](02-design/DESIGN_SYSTEM_READINESS.md)
- [Production Checklist](09-production/PRODUCTION_CHECKLIST.md)
- [Skills Standard](agentes/SKILLS_STANDARD.md)
- [Execution Guardrails](agentes/EXECUTION_GUARDRAILS.md)
- [Reference Traceability Matrix](01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [Reference Aligned Implementation Plan](14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
