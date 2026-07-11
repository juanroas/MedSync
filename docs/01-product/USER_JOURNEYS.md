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

1. Suporte MedSync realiza o primeiro cadastro assistido da empresa, CNPJ, plano, valor, limite e conta ADM da empresa.
2. Empresa recebe as primeiras informacoes operacionais por canal aprovado. No ambiente atual, a plataforma gera uma previa operacional do e-mail; envio transacional real ainda depende de provedor aprovado.
3. ADM MedSync avalia e habilita ou desabilita o CNPJ em Elegibilidade. Suporte pode cadastrar, mas nao pode habilitar CNPJ.
4. Empresa ADM acessa o ambiente somente apos habilitacao do CNPJ.
5. Empresa ADM cadastra perfis empresariais permitidos ou solicita apoio ao suporte para orientar o processo.
6. Beneficiarios elegiveis sao vinculados ao CNPJ contratante.
7. Empresa ou parceiro acompanha uso administrativo e agregado permitido.
8. Empresa nao acessa dado clinico individual.

Pontos de controle:

- Dados clinicos nunca devem ser exibidos.
- Relatorios precisam ser agregados ou administrativos.
- Permissoes devem ser auditaveis.
- Campos de cadastro devem aplicar limites, validacao e mascara visual quando aplicavel. O dado persistido pode ser normalizado sem mascara.
- Habilitacao de CNPJ e ato de governanca do ADM MedSync, nao do suporte.

## Jornada: Paciente/Beneficiario

1. Paciente recebe acesso via empresa/parceiro ou via suporte MedSync/CNPJ tecnico.
2. Paciente encontra atendimento disponivel.
3. Paciente pode solicitar consulta pela plataforma quando estiver elegivel, escolhendo area/especialidade disponivel.
4. Caso nao consiga usar o fluxo digital, paciente pode acionar o suporte MedSync para orientacao operacional.
5. O sistema vincula uma opcao medica disponivel na especialidade solicitada.
6. Paciente aceita termo quando aplicavel.
7. Paciente acessa sala de espera.
8. Paciente entra na teleconsulta somente quando autorizado.
9. Paciente acompanha status ou historico permitido.

Pontos de controle:

- Consentimento deve ser claro quando exigido.
- Paciente nao acessa consulta de outro paciente.
- Empresa nao visualiza condicao individual.
- Pessoa fisica cadastrada via suporte deve estar vinculada ao CNPJ tecnico.
- Solicitacao por especialidade nao deve expor lista sensivel de medicos ou informacao clinica para empresa.
- Se nao houver especialidade disponivel, o fluxo deve orientar contato com suporte.

## Jornada: Medico

1. Medico independente e cadastrado/credenciado pela operacao MedSync, nao pela empresa contratante.
2. Medico comum/generalista/especialista faz parte do pool assistencial da plataforma.
3. Medico independente acessa agenda vinculada.
4. Medico visualiza consulta autorizada.
5. Medico inicia atendimento quando permitido.
6. Medico registra informacao clinica conforme regra aprovada.
7. Medico encerra consulta.

Pontos de controle:

- Medico acessa somente atendimentos vinculados.
- Medico deve atuar dentro do ramo de atividade/especialidade autorizada.
- Empresa/parceiro nao cria nem administra medico generico.
- ADM Medico do Trabalho permanece perfil separado, associado a CNPJ e finalidade ocupacional.
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

## Jornada: Suporte MedSync

1. Suporte realiza onboarding assistido de empresa e conta ADM inicial.
2. Suporte pode orientar empresa sobre cadastro de funcionarios/beneficiarios.
3. Suporte pode cadastrar pessoa fisica direta quando vinculada ao CNPJ tecnico, apos validacoes comerciais, juridicas, LGPD e responsabilidade clinica.
4. Suporte nao habilita CNPJ contratante.
5. Suporte nao acessa dado clinico individual sem finalidade e permissao aprovadas.

Pontos de controle:

- Cadastro assistido precisa gerar evento de auditoria.
- Habilitacao, bloqueio ou desbloqueio de CNPJ permanece restrito ao ADM MedSync.
- Dados usados em atendimento de suporte devem seguir minimizacao.

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
- [x] Fluxo de onboarding assistido e habilitacao de CNPJ registrado.
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
