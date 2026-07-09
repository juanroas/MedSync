# Product Vision - MedSync

Status: Product Discovery. Este documento nao declara funcionalidade implementada, conformidade regulatoria ou prontidao para uso com pacientes reais.

## Objetivo

Definir a visao inicial do MedSync como produto SaaS B2B de Saude Digital, alinhando direcao de produto, publicos, principios, diferenciais e limites da fase atual.

## Escopo

Este documento cobre:

- Visao do produto.
- Principios de produto.
- Publicos atendidos.
- Produtos internos.
- Diferenciais esperados.
- Hipoteses de mercado.
- Concorrentes e referencias a validar.
- Limites e pendencias.

Fora de escopo:

- Implementar funcionalidades.
- Criar telas.
- Criar endpoints, tabelas ou migrations.
- Declarar conformidade LGPD/CFM/ANS.
- Autorizar uso com pacientes reais.

## Visao do produto

O MedSync deve evoluir para uma plataforma SaaS B2B de Saude Digital para clinicas, empresas e colaboradores, combinando agenda, teleconsulta, registro clinico, auditoria, pagamentos e governanca de privacidade.

A visao central e permitir que empresas oferecam beneficios de saude digital aos colaboradores sem acessar dados clinicos individuais, enquanto clinicas e profissionais de saude operam atendimentos com seguranca, rastreabilidade e separacao clara de permissoes.

## Principios

- Privacidade por design.
- Menor privilegio por perfil.
- Separacao entre dados administrativos, financeiros e clinicos.
- Multi-tenancy como premissa estrutural.
- Evidencias para homologacao, auditoria e go/no-go.
- Experiencia simples para colaborador/paciente.
- Operacao clara para clinicas e empresas.

## Publicos

| Publico | Necessidade | Valor esperado |
|---|---|---|
| Empresas | Oferecer beneficio de saude digital e acompanhar uso administrativo | Indicadores agregados sem acesso a dados clinicos individuais |
| Colaboradores | Usar o beneficio como paciente com confidencialidade | Jornada simples, segura e privada |
| Clinicas | Operar agenda, equipe, teleconsulta, cobranca e atendimento | Controle operacional e reducao de retrabalho |
| Medicos | Atender pacientes vinculados e registrar condutas | Agenda clara, acesso correto e registro auditavel |
| Administradores | Gerenciar usuarios, perfis e operacao | Governanca, rastreabilidade e menor risco operacional |
| Privacidade e juridico | Validar controles e responder solicitacoes | Evidencias, minimizacao e trilhas de auditoria |

## Produtos internos

| Produto | Objetivo | Status documental |
|---|---|---|
| MedSync Business | Portal para empresas e RH acompanharem dados administrativos e agregados | TODO: detalhar em documento proprio |
| MedSync Care | Portal do colaborador/paciente | TODO: detalhar em documento proprio |
| MedSync Clinic | Portal da clinica e do medico | TODO: detalhar em documento proprio |
| MedSync Admin | Backoffice da plataforma | TODO: detalhar em documento proprio |

## Diferenciais

- Modelo B2B com regra explicita de privacidade: empresa nao acessa prontuario, diagnostico, observacoes clinicas ou conteudo da consulta.
- Separacao entre operacao administrativa, atendimento clinico, pagamentos e auditoria.
- Teleconsulta sem gravacao por padrao, conforme documentacao atual de homologacao.
- Relatorios empresariais planejados para dados agregados e administrativos.
- Estrutura documental preparada para humanos e agentes de IA.
- Status de homologacao controlada mantido de forma explicita.

## Mercado

TODO: Validar tamanho de mercado, segmentos prioritarios, ICP, jornada de compra, canais e criterios de precificacao.

Hipoteses iniciais a validar:

- Empresas podem contratar beneficios de saude digital para colaboradores.
- Clinicas precisam de uma operacao digital com agenda, teleconsulta e registro clinico integrados.
- Privacidade e separacao de dados sao criterios centrais de compra em contexto B2B de saude.
- Auditoria, evidencias e controles podem ser diferenciais em vendas enterprise.

## Concorrentes e referencias

TODO: Mapear concorrentes diretos, indiretos e referencias de produto.

Categorias a validar:

- Plataformas de telemedicina.
- Sistemas de gestao clinica.
- Beneficios corporativos de saude.
- Plataformas de saude ocupacional.
- Solucoes de prontuario e atendimento digital.

## Regras de produto ja estabelecidas

- Empresas podem acessar apenas dados administrativos e agregados.
- Empresas nao podem acessar dados clinicos individuais de colaboradores.
- O MedSync permanece em homologacao controlada ate aprovacoes formais.
- O retorno de pagamento nao deve ser tratado como fonte de verdade.
- Dados sensiveis nao devem aparecer em logs, documentos ou exemplos.

## Decisoes pendentes

- Modelo comercial prioritario: clinicas, empresas ou hibrido.
- ICP inicial e segmento de entrada.
- Contratos, limites de uso, cancelamento e no-show.
- Relatorios B2B permitidos por base legal e contrato.
- Responsabilidades LGPD por fluxo: controlador, operador e suboperadores.
- Criterios formais de go/no-go para pilotos.

## Checklist

- [x] Visao inicial definida com base nos documentos existentes.
- [x] Principio de privacidade B2B preservado.
- [x] Produtos internos listados.
- [x] Diferenciais iniciais documentados.
- [ ] TODO: validar mercado.
- [ ] TODO: mapear concorrentes.
- [ ] TODO: detalhar personas.
- [ ] TODO: detalhar jornadas.
- [ ] TODO: aprovar criterios de publicacao em ambiente de testes.

## Referencias

- [Product Blueprint B2B](PRODUCT_BLUEPRINT_B2B.md)
- [Modelo B2B](B2B_MODEL.md)
- [Sprint 1 - Product Blueprint](Sprint%201%20%E2%80%94%20Product%20Blueprint.md)
- [Regras dos agentes](../agentes/AI_AGENT_RULES.md)
- [Checklist de producao](../09-production/PRODUCTION_CHECKLIST.md)
