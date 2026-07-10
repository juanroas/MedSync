# MVP Screen Flow - MedSync

Status: UX Blueprint. Este documento orienta telas e estados para desenvolvimento futuro; nao representa interface implementada.

## Objetivo

Definir o fluxo de telas do MVP candidato, garantindo que o MedSync pareca uma plataforma de acesso ao cuidado em saude digital, e nao um sistema de RH.

## Escopo

Inclui:

- Mapa de telas candidatas.
- Fluxo por perfil.
- Estados obrigatorios.
- Regras de privacidade visiveis na UX.
- Criterios de aceite de experiencia.

Fora de escopo:

- Implementar UI.
- Definir CSS final.
- Criar rotas reais.
- Criar componentes em codigo.
- Aprovar copy comercial final.

## Perfis afetados

- Paciente/beneficiario.
- Medico.
- ADM Medico do Trabalho.
- Empresa/parceiro.
- Financeiro.
- Auditor/Privacidade.

## Mapa de telas candidatas

| Area | Tela | Prioridade | Objetivo |
|---|---|---|---|
| Care | Home de acesso ao cuidado | P0 | Dar entrada clara para atendimento e consultas |
| Care | Agendar consulta | P0 | Permitir escolha de atendimento disponivel quando aprovado |
| Care | Minhas consultas | P0 | Mostrar proximas consultas e historico permitido |
| Care | Meus dados | P1 | Atualizar dados cadastrais permitidos |
| Care | Sala de espera | P0 | Aguardar autorizacao de entrada |
| Care | Teleconsulta | P0 | Participar de consulta autorizada |
| Medical | Agenda do medico | P0 | Listar consultas vinculadas |
| Medical | Atendimento medico | P0 | Iniciar, atender e encerrar consulta |
| Medical | Saude ocupacional | P1 | ADM Medico do Trabalho acessa registros permitidos |
| Business | Visao geral empresa/parceiro | P0 | Mostrar contrato, elegibilidade e indicadores permitidos |
| Business | Elegibilidade | P0 | Gerenciar pessoas elegiveis sem dado clinico |
| Business | Usuarios e dados do CNPJ | P1 | Atualizar dados administrativos permitidos |
| Business | Relatorios agregados | P1 | Mostrar uso agregado quando validado |
| Finance | Pagamentos | P1 | Ver status financeiro sem dado clinico |
| Support | CNPJ tecnico | P0 | Vincular pessoa fisica direta ao CNPJ tecnico |
| Audit | Eventos | P0 | Ver eventos e tentativas negadas sem alterar operacao |

## Fluxo Paciente/Beneficiario

```text
[Login]
  -> [Home de acesso ao cuidado]
      -> [Agendar consulta]
          -> [Confirmacao/Status]
      -> [Minhas consultas]
          -> [Sala de espera]
              -> [Teleconsulta autorizada]
      -> [Meus dados]
          -> [Atualizar dados permitidos]
      -> [Historico permitido]
```

Prioridade da tela inicial:

1. Acao primaria: acessar cuidado ou ver proxima consulta.
2. Acao secundaria: agendar consulta.
3. Informacao de apoio: consentimento, pagamento quando aplicavel, historico permitido.

Estados obrigatorios:

- Loading: carregando elegibilidade, consultas e status.
- Empty: nenhuma consulta agendada; orientar agendamento ou contato permitido.
- Blocked: atendimento indisponivel por elegibilidade, horario, status, consentimento ou pagamento.
- Forbidden: tentativa de acessar consulta de outro paciente.
- Error: falha recuperavel sem expor dados sensiveis.

## Fluxo Medico

```text
[Login]
  -> [Agenda do medico]
      -> [Detalhe da consulta vinculada]
          -> [Iniciar atendimento]
              -> [Teleconsulta]
          -> [Registro/retificacao clinica permitida]
          -> [Encerrar atendimento]
```

Estados obrigatorios:

- Empty: sem consultas vinculadas no periodo.
- Blocked: consulta fora de janela, status invalido ou consentimento pendente.
- Forbidden: consulta nao vinculada ao medico ou fora do ramo autorizado.
- Success: atendimento iniciado ou encerrado.

## Fluxo ADM Medico do Trabalho

```text
[Login]
  -> [Saude ocupacional]
      -> [CNPJ associado]
      -> [Registros ocupacionais permitidos]
      -> [Atualizar/retificar registro permitido]
```

Regras de UX:

- Perfil deve ser apresentado como clinico, nao RH.
- Exibir avisos de escopo e finalidade quando acessar dado clinico ocupacional.
- Nao liberar dados para Empresa/Parceiro administrativo.
- Conteudo de chamada nao deve aparecer salvo decisao especifica sobre gravacao/transcricao.

## Fluxo Empresa/Parceiro

```text
[Login]
  -> [Visao geral Business]
      -> [Contrato/Plano]
      -> [Elegibilidade]
      -> [Atualizar dados administrativos permitidos]
      -> [Relatorios agregados permitidos]
```

Regras de UX:

- Usar linguagem de contrato, elegibilidade, utilizacao agregada e faturamento.
- Nao usar linguagem de acompanhamento clinico individual.
- Nao exibir especialidade sensivel associada a pessoa identificavel.
- Nao exibir prontuario, diagnostico, observacoes clinicas ou conteudo de chamada.

Estados obrigatorios:

- Empty: nenhum beneficiario elegivel ou nenhum indicador agregado disponivel.
- Forbidden: tentativa de acessar dado clinico individual.
- Blocked: relatorio indisponivel por baixa granularidade ou falta de aprovacao.

## Fluxo Suporte/CNPJ tecnico

```text
[Login suporte]
  -> [CNPJ tecnico]
      -> [Cadastrar pessoa fisica]
      -> [Atualizar dados administrativos permitidos]
      -> [Pagamentos do CNPJ tecnico]
```

Regras de UX:

- Toda pessoa fisica direta deve ficar vinculada ao CNPJ tecnico.
- Suporte nao acessa prontuario, diagnostico ou observacoes clinicas.
- Alteracoes administrativas devem ser auditadas.

## Fluxo Auditor/Privacidade

```text
[Login]
  -> [Eventos e tentativas negadas]
      -> [Filtros]
      -> [Evidencias]
```

Regras de UX:

- Leitura controlada.
- Sem alteracao operacional.
- Sem dados sensiveis desnecessarios nos eventos.

## Microcopy inicial

Textos candidatos, sujeitos a revisao:

- "Acesse seu cuidado digital"
- "Agende ou acompanhe sua consulta"
- "Voce ainda nao tem consultas agendadas"
- "Esta acao nao esta disponivel para o seu perfil"
- "Relatorio indisponivel para proteger a privacidade dos pacientes"
- "Empresas visualizam apenas dados administrativos e agregados permitidos"

Nao usar:

- "Acompanhar saude do colaborador"
- "Ver dados medicos dos colaboradores"
- "Conformidade garantida"
- "Atendimento liberado para pacientes reais"

## Criterios de aceite de UX

- A primeira tela do paciente comunica cuidado, consulta e proxima acao.
- A primeira tela da empresa comunica contrato, elegibilidade e indicadores permitidos.
- O paciente entende quando nao pode entrar na sala e qual proximo passo geral.
- O medico entende quais consultas pode atender.
- O ADM Medico do Trabalho entende que seu acesso e clinico, restrito, auditado e separado da empresa administrativa.
- Usuarios autorizados encontram opcoes de atualizar dados permitidos.
- Estados vazios orientam sem expor informacao sensivel.
- Acoes principais funcionam em mobile sem depender de hover.

## Pendencias

- TODO: validar rotas finais.
- TODO: validar nomes finais das telas.
- TODO: validar microcopy com juridico e privacidade.
- TODO: criar prototipo visual.
- TODO: mapear cada tela a permissao e teste negativo.
- TODO: validar responsividade em desktop e mobile antes de implementacao final.

## Checklist

- [x] Fluxos por perfil documentados.
- [x] Estados obrigatorios definidos.
- [x] Privacidade B2B refletida na UX.
- [ ] TODO: validar com stakeholders.
- [ ] TODO: transformar em backlog de UI.

## Referencias

- [MVP Scope](../01-product/MVP_SCOPE.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
- [User Journeys](../01-product/USER_JOURNEYS.md)
- [UX Guidelines](UX_GUIDELINES.md)
- [Wireframes](WIREFRAMES.md)
- [UI States](UI_STATES.md)
