# Reference Traceability Matrix - MedSync

Status: Product Execution Control. Esta matriz e obrigatoria sempre que referencias externas forem usadas para orientar produto, UX, arquitetura, skills ou desenvolvimento.

## Objetivo

Garantir que referencias nao fiquem apenas como inspiracao documental. Cada referencia precisa virar decisao, backlog, UX, especificacao, teste, implementacao ou bloqueio explicito.

## Regra de uso

Antes de considerar uma referencia "incorporada", preencher:

- Sinal observado.
- Interpretacao para o MedSync.
- Capacidade MedSync resultante.
- Tela ou fluxo afetado.
- Artefato tecnico afetado.
- Teste/evidencia esperada.
- Status de implementacao.

## Status permitidos

- `Nao analisado`: referencia citada, mas ainda nao decomposta.
- `Mapeado`: sinais extraidos e relacionados ao MedSync.
- `Especificado`: possui backlog, UX ou specification.
- `Implementado parcial`: existe codigo ou tela parcial.
- `Implementado`: existe codigo/tela/endpoints completos para o escopo definido.
- `Validado`: implementado e testado com evidencia.
- `Bloqueado`: depende de decisao, juridico, LGPD, CFM, DPO, diretor tecnico ou viabilidade.
- `Fora do MVP`: decisao explicita de nao fazer agora.

## Referencias de mercado de saude digital

| Referencia | Sinal observado | Interpretacao para MedSync | Capacidade MedSync | Tela/fluxo afetado | Artefato tecnico | Evidencia esperada | Status |
|---|---|---|---|---|---|---|---|
| Dr.Online | Saude digital B2B, pronto atendimento, especialistas, saude mental, white label, dashboards e seguranca | B2B deve ser canal e governanca; a experiencia central deve ser acesso ao cuidado | Portal Business + Portal Care + dashboards agregados | Landing, Home Care, Portal Empresa | B2B Company, Patient Care, Reporting | Tela empresa sem dado clinico e home paciente focada em atendimento | Especificado parcial |
| Meu Doutor 24h | Jornada direta para consulta online | Paciente precisa de fluxo simples de iniciar atendimento ou agendar | Consulta agora/agendamento guiado | Home Care, Agendar consulta | Patient Care, Medical Attendance | Paciente inicia jornada em ate poucos passos | Mapeado |
| Doctoralia | Busca por profissional, especialidade, perfil e agenda | Confianca medica exige perfil profissional e especialidade visivel quando permitido | Perfil medico e agenda por especialidade | Buscar profissional, Agenda medico | Doctor, Specialty, Schedule | Perfil medico com CRM/UF/especialidade e agenda | Mapeado |
| IntegraConsulta | Telemedicina, especialidades, planos e oferta pessoa fisica/empresa | Modelo pode ser B2B2C ou hibrido, mas precisa decisao de ICP | Planos, beneficios, elegibilidade, possivel B2C assistido | Planos, Elegibilidade, CNPJ tecnico | BenefitPlan, CompanyContract, Technical CNPJ | Beneficiario elegivel e pessoa fisica assistida por suporte | Especificado parcial |
| Clicou Consulta | Consulta online 24h, pagamento avulso, videochamada e documentos digitais | Consulta transacional e pagamento sao uteis, mas documentos clinicos exigem validacao regulatoria | Consulta avulsa, pagamento, sala, documentos futuros | Checkout, Consulta, Documentos | Payment, Consultation, future Documents | Pagamento sandbox e video autorizados | Implementado parcial |

## Referencias de Agent Skills

| Referencia | Sinal observado | Interpretacao para MedSync | Capacidade MedSync | Artefato afetado | Evidencia esperada | Status |
|---|---|---|---|---|---|---|
| agentskills.io | Skills como pacotes reutilizaveis de instrucao | Skills do projeto devem ser portaveis e pequenas | Padrao de skills project-local | `.agents/skills`, `docs/agentes/SKILLS_STANDARD.md` | SKILL.md com trigger claro e referencias | Especificado parcial |
| Claude Agent Skills | Skill com instrucoes e recursos sob demanda | Separar instrucoes curtas de referencias longas | Progressive disclosure | `.agents/skills/*/SKILL.md` | Skills com referencias diretas quando necessario | Especificado parcial |
| OpenAI Codex Skills | Pasta com `SKILL.md` e recursos opcionais | Usar estrutura compatível com Codex | Skills locais por dominio | `.agents/skills` | Skill valida e reutilizavel | Especificado parcial |
| Manus Agent Skills | Habilidades reutilizaveis por tarefa | Skills devem encapsular workflow real, nao so texto generico | Workflows por dominio MedSync | `docs/agentes/workflows` | Workflow com DoD e evidencias | Mapeado |
| Microsoft Agent Framework Skills | Composicao de capacidades de agente | Skills precisam deixar entradas/saidas claras | Output contracts | `.agents/skills/*/SKILL.md` | Output contract verificavel | Especificado parcial |
| VS Code Copilot Agent Skills | Customizacao local do agente | Repositorio deve orientar agentes dentro do IDE | Agent rules + prompts | `docs/agentes` | Regras lidas antes da tarefa | Especificado parcial |
| OpenCode Skills | Skills orientadas por arquivo Markdown | Manter compatibilidade simples | Markdown-first skills | `.agents/skills` | Skills sem dependencia proprietaria | Especificado parcial |
| Cursor Skills | Contexto acionavel no editor | O skill deve guiar implementacao, nao so discovery | Skill + backlog + guardrails | `.agents/skills`, `docs/14-roadmap` | Tarefa rastreada ate codigo ou bloqueio | Mapeado |

## Lacunas obrigatorias

- TODO: validar se o MVP sera B2B puro, B2B2C ou hibrido.
- TODO: definir se consulta avulsa entra no MVP.
- TODO: definir linhas de cuidado iniciais.
- TODO: validar documentos digitais: atestado, prescricao e encaminhamento.
- TODO: decompor cada capacidade mapeada em tarefas tecnicas pequenas.
- TODO: criar telas de Home Care, Portal Empresa e Jornada Consulta Agora.

## Referencias internas

- [Market References](MARKET_REFERENCES.md)
- [Product Positioning](PRODUCT_POSITIONING.md)
- [MVP Scope](MVP_SCOPE.md)
- [MVP Screen Flow](../02-design/MVP_SCREEN_FLOW.md)
- [Reference Aligned Implementation Plan](../14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
- [Execution Guardrails](../agentes/EXECUTION_GUARDRAILS.md)
