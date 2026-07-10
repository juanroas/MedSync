# Information Architecture - MedSync

Status: Product Discovery. Este documento organiza conceitos e dominios; nao representa menu, telas ou rotas implementadas.

## Objetivo

Definir uma arquitetura de informacao conceitual para o MedSync, orientando documentacao, UX e organizacao de produto.

## Escopo

Inclui:

- Produtos internos.
- Dominios de informacao.
- Relacao entre personas e dominios.
- Principios de navegacao conceitual.
- Pendencias para UX/UI.

Fora de escopo:

- Wireframes.
- Layouts.
- Rotas finais.
- Permissoes implementadas.

## Produtos internos

| Produto interno | Publico principal | Dominios relacionados |
|---|---|---|
| MedSync Business | Empresa/parceiro contratante | Empresas, contratos, planos, elegibilidade, faturamento, relatorios agregados permitidos |
| MedSync Care | Paciente/beneficiario | Acesso ao cuidado, minhas consultas, consentimentos, pagamentos quando aplicavel, teleconsulta |
| MedSync Medical | Medico independente e ADM Medico do Trabalho | Agenda, pacientes vinculados, consultas, teleconsulta, registros clinicos por permissao |
| MedSync Admin | Operacao da plataforma, auditoria | Tenants, usuarios, auditoria, configuracoes, evidencias |

## Dominios de informacao

| Dominio | Conteudo | Observacao |
|---|---|---|
| Identidade | Usuarios, perfis, sessoes, permissoes | Deve seguir menor privilegio |
| Acesso ao cuidado | Entrada para atendimento, consulta agendada, pronto atendimento e continuidade | Experiencia central do paciente |
| Tenant/CNPJ | CNPJs contratantes, CNPJ tecnico, configuracoes e escopos | Base multi-tenant |
| Empresa B2B | Empresas, contratos, planos e elegibilidade | Sem dados clinicos individuais |
| Paciente/Beneficiario | Elegibilidade, cadastro e jornada de consulta | Privacidade como regra central |
| Medico independente | Credenciamento, agenda, consultas vinculadas e ramo autorizado | Nao precisa estar associado a clinica |
| Saude ocupacional | ADM Medico do Trabalho, documentos e registros autorizados | Acesso clinico restrito por CNPJ e auditoria |
| Agenda | Consultas, status e disponibilidade | Regras detalhadas pendentes |
| Teleconsulta | Sala de espera, chamada e encerramento | Sem gravacao por padrao conforme docs atuais |
| Registro clinico | Prontuario e dados sensiveis | Acesso restrito |
| Pagamento | Checkout, status e webhook | Retorno nao e fonte de verdade |
| Auditoria | Eventos, acessos e tentativas negadas | Sem dados sensiveis em logs |
| Relatorios | Indicadores operacionais e agregados | Validar LGPD e contrato |

## Relacao persona x dominio

| Persona | Dominios principais | Dominios proibidos ou restritos |
|---|---|---|
| Empresa/Parceiro | Empresa B2B, contratos, elegibilidade administrativa, relatorios agregados | Registro clinico, diagnostico, conteudo de chamada |
| Paciente/Beneficiario | Acesso ao cuidado, minhas consultas, consentimento, teleconsulta | Dados de outros pacientes ou empresa |
| Medico | Agenda vinculada, teleconsulta, registro clinico autorizado | Dados fora de vinculo ou fora do ramo autorizado |
| ADM Medico do Trabalho | Saude ocupacional do CNPJ associado e registros clinicos permitidos | Uso administrativo/RH e dados fora do CNPJ/finalidade |
| Financeiro | Pagamentos e status financeiro | Prontuario e diagnostico |
| Auditor/Privacidade | Auditoria e evidencias | Alteracao operacional |

## Principios de organizacao

- Separar dados administrativos, financeiros e clinicos.
- Comecar a experiencia do paciente por cuidado e atendimento, nao por relatorio corporativo.
- Evitar misturar relatorio empresarial com informacao clinica individual.
- Organizar a experiencia por perfil e permissao.
- Manter a documentacao alinhada a specifications, API e QA.
- Transformar decisoes estruturais em ADRs.

## Pendencias

- TODO: criar mapa visual aprovado.
- TODO: validar navegacao com UX.
- TODO: definir matriz de permissoes detalhada.
- TODO: mapear rotas reais quando houver implementacao validada.
- TODO: linkar specifications preenchidas.

## Checklist

- [x] Produtos internos organizados.
- [x] Dominios de informacao definidos em alto nivel.
- [x] Restricoes de privacidade destacadas.
- [ ] TODO: validar com UX/UI.
- [ ] TODO: gerar diagrama em `docs/assets`.
- [ ] TODO: cruzar com permissoes detalhadas.

## Referencias

- [Product Vision](PRODUCT_VISION.md)
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Market References](MARKET_REFERENCES.md)
- [Personas](PERSONAS.md)
- [Feature Catalog](FEATURE_CATALOG.md)
- [Architecture](../03-architecture/README.md)
- [Specifications](../16-specifications/README.md)
