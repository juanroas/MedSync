# User Journeys - MedSync

Status: Product Discovery. Jornadas conceituais; nao representam telas implementadas.

## Objetivo

Descrever jornadas principais por persona para orientar produto, UX, QA, seguranca e planejamento.

## Escopo

Inclui jornadas de alto nivel para:

- Empresa/Parceiro.
- Paciente/Beneficiario.
- Medico.
- ADM Medico do Trabalho.
- Financeiro.
- Auditor/Privacidade.

Fora de escopo:

- Wireframes.
- Rotas de frontend.
- Endpoints.
- Estados detalhados de UI.

## Jornada: Empresa/Parceiro

1. TODO: empresa e cadastrada ou convidada.
2. TODO: contrato, plano e linhas de cuidado sao configurados.
3. TODO: beneficiarios elegiveis sao vinculados.
4. Empresa ou parceiro acompanha uso administrativo e agregado permitido.
5. Empresa nao acessa dado clinico individual.

Pontos de controle:

- Dados clinicos nunca devem ser exibidos.
- Relatorios precisam ser agregados ou administrativos.
- Permissoes devem ser auditaveis.

## Jornada: Paciente/Beneficiario

1. Paciente recebe acesso via empresa/parceiro ou via suporte MedSync/CNPJ tecnico.
2. Paciente encontra atendimento disponivel.
3. TODO: paciente agenda, inicia pronto atendimento ou acessa consulta disponivel.
4. Paciente aceita termo quando aplicavel.
5. Paciente acessa sala de espera.
6. Paciente entra na teleconsulta somente quando autorizado.
7. Paciente acompanha status ou historico permitido.

Pontos de controle:

- Consentimento deve ser claro quando exigido.
- Paciente nao acessa consulta de outro paciente.
- Empresa nao visualiza condicao individual.
- Pessoa fisica cadastrada via suporte deve estar vinculada ao CNPJ tecnico.

## Jornada: Medico

1. Medico independente acessa agenda vinculada.
2. Medico visualiza consulta autorizada.
3. Medico inicia atendimento quando permitido.
4. Medico registra informacao clinica conforme regra aprovada.
5. Medico encerra consulta.

Pontos de controle:

- Medico acessa somente atendimentos vinculados.
- Medico deve atuar dentro do ramo de atividade/especialidade autorizada.
- Registro clinico e sensivel.
- Teleconsulta segue janela, status e consentimento.

## Jornada: ADM Medico do Trabalho

1. ADM Medico do Trabalho acessa CNPJ associado.
2. Visualiza somente registros clinicos ocupacionais permitidos.
3. Consulta ou atualiza informacao clinica ocupacional quando houver permissao e finalidade.
4. Eventos relevantes sao auditados.
5. Nao libera dado clinico para RH, financeiro ou empresa administrativa.

Pontos de controle:

- Perfil e clinico, nao administrativo/RH.
- Acesso depende de finalidade, permissao e auditoria.
- Conteudo de chamada so existe se houver gravacao/transcricao aprovada, o que nao e padrao.

## Jornada: Financeiro

1. Financeiro consulta cobrancas e status.
2. Financeiro acompanha pagamento ou pendencias.
3. Financeiro trata divergencias sem acessar dado clinico.
4. Eventos financeiros relevantes sao auditados.

Pontos de controle:

- Retorno de pagamento nao e fonte de verdade.
- Webhook deve ser idempotente quando implementado.
- Dados clinicos permanecem ocultos.
- Financeiro do CNPJ tecnico esta aprovado conceitualmente para pagamentos de pacientes diretos.

## Jornada: Auditor/Privacidade

1. Auditor consulta eventos.
2. Auditor filtra acessos e tentativas negadas.
3. Auditor coleta evidencias.
4. Auditor nao altera dados operacionais.
5. TODO: solicita ou acompanha processos LGPD quando aprovados.

Pontos de controle:

- Auditoria de leitura e acesso negado.
- Logs sem dados sensiveis.
- Exportacoes controladas.

## Dependencias

- Personas validadas.
- Matriz de permissoes.
- Regras LGPD.
- QA negativo por perfil.
- Definicao de relatorios B2B permitidos.

## Checklist

- [x] Jornadas conceituais registradas.
- [x] Pontos de privacidade destacados.
- [ ] TODO: validar jornadas com stakeholders.
- [ ] TODO: transformar jornadas em criterios de aceite.
- [ ] TODO: criar mapas visuais em `docs/assets` quando aprovados.

## Referencias

- [Personas](PERSONAS.md)
- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Feature Catalog](FEATURE_CATALOG.md)
- [Modelo B2B](B2B_MODEL.md)
- [QA Checklist](../08-quality/QA_CHECKLIST.md)
