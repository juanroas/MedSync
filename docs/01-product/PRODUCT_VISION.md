# Product Vision - MedSync

Status: Product Discovery. Este documento nao declara funcionalidade implementada, conformidade regulatoria ou prontidao para uso com pacientes reais.

## Objetivo

Definir a visao inicial do MedSync como plataforma de Saude Digital com modelo B2B, alinhando direcao de produto, publicos, principios, diferenciais e limites da fase atual.

## Escopo

Este documento cobre:

- Visao do produto.
- Posicionamento.
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

O MedSync deve evoluir para uma plataforma de acesso ao cuidado em Saude Digital para pacientes, medicos independentes, empresas e parceiros, combinando agenda, teleconsulta, registro clinico autorizado, auditoria, pagamentos e governanca de privacidade.

A visao central e permitir que pessoas acessem atendimento digital de forma simples e privada, enquanto medicos independentes e perfis clinicos autorizados operam atendimentos com seguranca, rastreabilidade e separacao clara de permissoes.

O modelo B2B viabiliza contratos, elegibilidade, planos, faturamento, relatorios permitidos e governanca para empresas ou parceiros. Ele nao transforma o MedSync em sistema de RH: empresas nunca acessam dados clinicos individuais, e a experiencia principal do paciente deve continuar orientada a cuidado, consulta e continuidade assistencial.

## Principios

- Privacidade por design.
- Menor privilegio por perfil.
- Separacao entre dados administrativos, financeiros e clinicos.
- Multi-tenancy como premissa estrutural.
- Evidencias para homologacao, auditoria e go/no-go.
- Experiencia simples para paciente/beneficiario.
- Operacao clara para empresas, medicos independentes e MedSync.

## Publicos

| Publico | Necessidade | Valor esperado |
|---|---|---|
| Empresas | Contratar acesso a cuidado digital e acompanhar uso administrativo permitido | Indicadores agregados sem acesso a dados clinicos individuais |
| Pacientes/beneficiarios | Acessar cuidado digital com confidencialidade | Jornada simples, segura e privada |
| Medicos independentes | Atender pacientes vinculados e registrar condutas dentro do ramo autorizado | Agenda clara, acesso correto e registro auditavel |
| ADM Medico do Trabalho | Apoiar saude ocupacional no CNPJ associado | Acesso clinico restrito, auditado e separado de RH |
| Administradores | Gerenciar usuarios, perfis e operacao | Governanca, rastreabilidade e menor risco operacional |
| Privacidade e juridico | Validar controles e responder solicitacoes | Evidencias, minimizacao e trilhas de auditoria |

## Produtos internos

| Produto | Objetivo | Status documental |
|---|---|---|
| MedSync Business | Portal para empresas e parceiros acompanharem contrato, elegibilidade, faturamento e indicadores agregados permitidos | TODO: detalhar em documento proprio |
| MedSync Care | Portal do paciente/beneficiario para acesso ao cuidado, consultas e teleconsulta | TODO: detalhar em documento proprio |
| MedSync Medical | Portal do medico independente e ADM Medico do Trabalho | TODO: detalhar em documento proprio |
| MedSync Admin | Backoffice da plataforma | TODO: detalhar em documento proprio |

## Diferenciais

- Modelo B2B com regra explicita de privacidade: empresa nao acessa prontuario, diagnostico, observacoes clinicas ou conteudo da consulta.
- Posicionamento B2B2C: contratacao institucional com experiencia propria e privada para o paciente.
- Separacao entre operacao administrativa, atendimento clinico, pagamentos e auditoria.
- Teleconsulta sem gravacao por padrao, conforme documentacao atual de homologacao.
- Relatorios empresariais planejados para dados agregados e administrativos.
- Estrutura documental preparada para humanos e agentes de IA.
- Status de homologacao controlada mantido de forma explicita.

## Mercado

TODO: Validar tamanho de mercado, segmentos prioritarios, ICP, jornada de compra, canais e criterios de precificacao.

Hipoteses iniciais a validar:

- Empresas podem contratar acesso a cuidado digital para pessoas elegiveis.
- Empresas precisam contratar acesso a cuidado digital com elegibilidade, governanca e relatorios permitidos.
- Medicos independentes precisam de agenda, teleconsulta e registro clinico integrados.
- Privacidade e separacao de dados sao criterios centrais de compra em contexto B2B de saude.
- Auditoria, evidencias e controles podem ser diferenciais em vendas enterprise.

## Concorrentes e referencias

Referencias iniciais indicadas pelo usuario foram registradas em [Market References](MARKET_REFERENCES.md). O mapeamento ainda precisa validacao formal.

Categorias a validar:

- Plataformas de telemedicina.
- Plataformas de atendimento medico digital.
- Beneficios corporativos de saude.
- Plataformas de saude ocupacional.
- Solucoes de prontuario e atendimento digital.

## Regras de produto ja estabelecidas

- Empresas podem acessar apenas dados administrativos e agregados.
- Empresas nao podem acessar dados clinicos individuais de pacientes ou beneficiarios.
- O MedSync permanece em homologacao controlada ate aprovacoes formais.
- O retorno de pagamento nao deve ser tratado como fonte de verdade.
- Dados sensiveis nao devem aparecer em logs, documentos ou exemplos.

## Decisoes pendentes

- Modelo comercial prioritario: empresas, parceiros, CNPJ tecnico ou hibrido.
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
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Market References](MARKET_REFERENCES.md)
- [Modelo B2B](B2B_MODEL.md)
- [Sprint 1 - Product Blueprint](Sprint%201%20%E2%80%94%20Product%20Blueprint.md)
- [Regras dos agentes](../agentes/AI_AGENT_RULES.md)
- [Checklist de producao](../09-production/PRODUCTION_CHECKLIST.md)
