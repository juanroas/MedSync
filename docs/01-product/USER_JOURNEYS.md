# User Journeys - MedSync

Status: Product Discovery. Jornadas conceituais; nao representam telas implementadas.

## Objetivo

Descrever jornadas principais por persona para orientar produto, UX, QA, seguranca e planejamento.

## Escopo

Inclui jornadas de alto nivel para:

- Empresa/RH.
- Colaborador/Paciente.
- Clinica/Admin.
- Medico.
- Financeiro.
- Auditor/Privacidade.

Fora de escopo:

- Wireframes.
- Rotas de frontend.
- Endpoints.
- Estados detalhados de UI.

## Jornada: Empresa/RH

1. TODO: empresa e cadastrada ou convidada.
2. TODO: contrato e plano de beneficio sao configurados.
3. TODO: colaboradores elegiveis sao vinculados.
4. Empresa acompanha uso administrativo e agregado.
5. Empresa nao acessa dado clinico individual.

Pontos de controle:

- Dados clinicos nunca devem ser exibidos.
- Relatorios precisam ser agregados ou administrativos.
- Permissoes devem ser auditaveis.

## Jornada: Colaborador/Paciente

1. TODO: colaborador recebe acesso ou elegibilidade.
2. TODO: colaborador agenda ou acessa consulta disponivel.
3. Paciente aceita termo quando aplicavel.
4. Paciente acessa sala de espera.
5. Paciente entra na teleconsulta somente quando autorizado.
6. Paciente acompanha status ou historico permitido.

Pontos de controle:

- Consentimento deve ser claro quando exigido.
- Paciente nao acessa consulta de outro paciente.
- Empresa nao visualiza condicao individual.

## Jornada: Clinica/Admin

1. TODO: clinica configura operacao e usuarios.
2. Admin acompanha agenda, pacientes e equipe conforme permissao.
3. Admin gerencia usuarios e perfis.
4. Admin nao acessa prontuario quando nao autorizado.
5. Eventos relevantes sao auditados.

Pontos de controle:

- Separacao por clinica.
- Menor privilegio.
- Acoes sensiveis auditadas.

## Jornada: Medico

1. Medico acessa agenda vinculada.
2. Medico visualiza consulta autorizada.
3. Medico inicia atendimento quando permitido.
4. Medico registra informacao clinica conforme regra aprovada.
5. Medico encerra consulta.

Pontos de controle:

- Medico acessa somente atendimentos vinculados.
- Registro clinico e sensivel.
- Teleconsulta segue janela, status e consentimento.

## Jornada: Financeiro

1. Financeiro consulta cobrancas e status.
2. Financeiro acompanha pagamento ou pendencias.
3. Financeiro trata divergencias sem acessar dado clinico.
4. Eventos financeiros relevantes sao auditados.

Pontos de controle:

- Retorno de pagamento nao e fonte de verdade.
- Webhook deve ser idempotente quando implementado.
- Dados clinicos permanecem ocultos.

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
- [Feature Catalog](FEATURE_CATALOG.md)
- [Modelo B2B](B2B_MODEL.md)
- [QA Checklist](../08-quality/QA_CHECKLIST.md)
