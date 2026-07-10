# Market References - MedSync

Status: Product Discovery. Este documento registra observacoes iniciais de mercado a partir de referencias publicas indicadas pelo usuario. Nao representa benchmark completo ou validacao comercial.

## Objetivo

Registrar aprendizados de referencias de saude digital para ajustar o posicionamento do MedSync antes de aprofundar desenvolvimento.

Este documento nao basta para considerar uma referencia incorporada. A incorporacao real deve ser rastreada em [REFERENCE_TRACEABILITY_MATRIX.md](REFERENCE_TRACEABILITY_MATRIX.md) e priorizada em [Reference Aligned Implementation Plan](../14-roadmap/REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md).

## Escopo

Inclui observacoes de posicionamento, jornada e capacidades aparentes em referencias publicas.

Fora de escopo:

- Copiar produto, marca, texto ou layout de terceiros.
- Confirmar dados comerciais sem validacao.
- Fazer analise juridica ou regulatoria.
- Definir precificacao final.

## Referencias analisadas

| Referencia | Sinal observado | Aprendizado para MedSync |
|---|---|---|
| Dr.Online | Saude digital, pronto atendimento 24h, especialistas, saude mental, gestao do cuidado, white label, dashboards e seguranca | O discurso B2B pode existir sem transformar o produto em RH; o centro e acesso ao cuidado e resultado assistencial |
| Meu Doutor 24h | Atendimento medico online rapido, acessivel, jornada direta de iniciar atendimento, pagar e ser atendido | A jornada do paciente precisa ser simples, orientada a resolver necessidade de saude |
| Doctoralia | Busca por especialidade/localidade, perfil profissional, registro, opinioes, servicos e agendamento | Perfil do profissional, confianca e agenda sao componentes importantes quando houver marketplace ou rede credenciada |
| IntegraConsulta | Telemedicina, especialidades, planos, beneficios, pessoa fisica e empresa | Modelo hibrido pode combinar assinatura, acesso por plano e oferta empresarial |
| Clicou Consulta | Consulta online 24h, pagamento avulso, videochamada e documentos digitais | Consulta transacional pode ser uma linha de produto, mas exige validacao regulatoria, operacional e financeira |

## Padroes percebidos

- Produtos fortes de saude digital falam primeiro de cuidado, acesso, disponibilidade e resolucao.
- O B2B aparece como canal, contrato, escala, white label, dashboard ou beneficio, nao como experiencia principal do paciente.
- A jornada B2C/transacional costuma ser direta: necessidade, cadastro, pagamento, atendimento.
- A jornada B2B precisa equilibrar valor para a empresa com privacidade do beneficiario.
- Confiança profissional aparece por meio de CRM/registro, especialidade, avaliacoes, reputacao ou credenciamento.

## Oportunidade para MedSync

O MedSync pode se posicionar como plataforma B2B2C de saude digital:

- B2B: empresas, clinicas ou parceiros contratam, configuram planos, elegibilidade e regras.
- B2C interno: paciente/beneficiario acessa cuidado com experiencia propria e privada.
- Clinical ops: clinica e medico operam agenda, teleconsulta e registros autorizados.
- Governance: privacidade, auditoria, LGPD, controles e evidencias estruturam a operacao.

## Riscos de posicionamento

| Risco | Ajuste recomendado |
|---|---|
| Parecer sistema de RH | Trocar narrativa central para acesso ao cuidado, teleconsulta e operacao clinica |
| Parecer somente marketplace medico | Manter contratos, elegibilidade, governanca e operacao B2B claros |
| Parecer somente videochamada | Valorizar jornada completa: acesso, agenda, teleconsulta, registro, pagamento e auditoria |
| Prometer conformidade antes de validacao | Manter linguagem de homologacao e revisao juridica |
| Expor dados clinicos para empresa | Preservar regra de privacidade B2B em todos os documentos e telas |

## Implicacoes para o MedSync

- A landing page deve abrir com saude digital e cuidado, nao com RH.
- O dashboard empresarial deve ser uma area de gestao de contrato e indicadores agregados.
- O paciente deve ter uma home de acesso ao atendimento.
- O roadmap deve incluir linhas de cuidado, rede profissional e jornada de atendimento.
- O modelo B2B deve continuar forte, mas como camada comercial e de governanca.
- Cada implicacao deve virar tela, backlog, especificacao, teste ou bloqueio explicito.

## Decisoes pendentes

- TODO: decidir se o MedSync sera B2B puro, B2B2C ou hibrido com consulta avulsa.
- TODO: validar quais linhas de cuidado entram no MVP.
- TODO: validar se white label sera produto inicial ou futuro.
- TODO: definir criterios de credenciamento profissional.
- TODO: validar documentos digitais como atestado, prescricao e encaminhamento com juridico, privacidade e diretor tecnico.

## Referencias externas

- https://dronline.com.vc/
- https://consulta.meudoutor24horas.com.br/clinico-geral/
- https://www.doctoralia.com.br/yda-barcellos/psicanalista-psicologo/florianopolis
- https://integraconsulta.com.br/
- https://app.clicouconsulta.com.br/
- https://www.clicouconsulta.com.br/

## Referencias internas

- [Product Positioning](PRODUCT_POSITIONING.md)
- [Reference Traceability Matrix](REFERENCE_TRACEABILITY_MATRIX.md)
- [Product Vision](PRODUCT_VISION.md)
- [Business Model](BUSINESS_MODEL.md)
- [Modelo B2B](B2B_MODEL.md)
