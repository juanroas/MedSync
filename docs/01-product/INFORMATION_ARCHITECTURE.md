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
| MedSync Business | Empresa/RH | Empresas, contratos, beneficios, colaboradores, relatorios agregados |
| MedSync Care | Colaborador/Paciente | Minhas consultas, consentimentos, pagamentos quando aplicavel, teleconsulta |
| MedSync Clinic | Clinica, medico, recepcao, financeiro | Agenda, pacientes, equipe, consultas, pagamentos, registros clinicos por permissao |
| MedSync Admin | Operacao da plataforma, auditoria | Tenants, usuarios, auditoria, configuracoes, evidencias |

## Dominios de informacao

| Dominio | Conteudo | Observacao |
|---|---|---|
| Identidade | Usuarios, perfis, sessoes, permissoes | Deve seguir menor privilegio |
| Tenant/Clinica | Clinicas, configuracoes e equipe | Base multi-tenant |
| Empresa B2B | Empresas, contratos e beneficios | Sem dados clinicos individuais |
| Colaborador/Paciente | Elegibilidade, cadastro e jornada de consulta | Privacidade como regra central |
| Agenda | Consultas, status e disponibilidade | Regras detalhadas pendentes |
| Teleconsulta | Sala de espera, chamada e encerramento | Sem gravacao por padrao conforme docs atuais |
| Registro clinico | Prontuario e dados sensiveis | Acesso restrito |
| Pagamento | Checkout, status e webhook | Retorno nao e fonte de verdade |
| Auditoria | Eventos, acessos e tentativas negadas | Sem dados sensiveis em logs |
| Relatorios | Indicadores operacionais e agregados | Validar LGPD e contrato |

## Relacao persona x dominio

| Persona | Dominios principais | Dominios proibidos ou restritos |
|---|---|---|
| Empresa/RH | Empresa B2B, beneficios, relatorios agregados | Registro clinico, diagnostico, conteudo de chamada |
| Colaborador/Paciente | Minhas consultas, consentimento, teleconsulta | Dados de outros pacientes ou empresa |
| Clinica/Admin | Operacao, equipe, agenda | Registro clinico quando perfil nao autorizar |
| Medico | Agenda vinculada, teleconsulta, registro clinico autorizado | Dados fora de vinculo |
| Financeiro | Pagamentos e status financeiro | Prontuario e diagnostico |
| Auditor/Privacidade | Auditoria e evidencias | Alteracao operacional |

## Principios de organizacao

- Separar dados administrativos, financeiros e clinicos.
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
- [Personas](PERSONAS.md)
- [Feature Catalog](FEATURE_CATALOG.md)
- [Architecture](../03-architecture/README.md)
- [Specifications](../16-specifications/README.md)
