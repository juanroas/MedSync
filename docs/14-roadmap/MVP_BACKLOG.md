# MVP Backlog - MedSync

Status: Planejamento candidato. Este backlog orienta desenvolvimento controlado, mas depende de validacao de produto, arquitetura, seguranca, QA, privacidade e juridico antes de uso real.

## Objetivo

Quebrar o MVP candidato do MedSync em epicos e historias iniciais, mantendo o foco em acesso ao cuidado, medico independente e B2B como camada de contrato/elegibilidade.

## Escopo

Inclui:

- Epicos candidatos.
- Historias de usuario.
- Criterios de aceite iniciais.
- Dependencias documentais.
- Itens fora de escopo.

Fora de escopo:

- Estimar prazo.
- Definir squad ou responsavel.
- Criar tarefas tecnicas finais.
- Criar API, banco, telas ou testes.
- Aprovar go-live.

## Epico 1 - Home de acesso ao cuidado

Como paciente/beneficiario, quero abrir o MedSync e entender rapidamente como acessar cuidado digital.

Historias candidatas:

- Como paciente/beneficiario, quero ver minha proxima consulta para saber meu status.
- Como paciente/beneficiario, quero iniciar o caminho de agendamento para solicitar atendimento.
- Como paciente/beneficiario, quero ver se minha entrada na consulta esta bloqueada e por qual criterio geral.

Criterios de aceite:

- A primeira tela comunica cuidado e consulta, nao relatorio corporativo.
- Estados de loading, vazio, bloqueado, sem permissao e erro existem.
- A tela nao expõe dados de outro paciente.
- A jornada principal funciona em mobile sem zoom.

## Epico 2 - Agenda e sala de espera

Como paciente/beneficiario, quero agendar ou acessar consulta autorizada.

Historias candidatas:

- Como paciente/beneficiario, quero ver consultas disponiveis quando minha elegibilidade permitir.
- Como paciente/beneficiario, quero acessar a sala de espera da minha consulta.
- Como paciente/beneficiario, quero receber orientacao quando ainda nao posso entrar.

Criterios de aceite:

- O paciente nao entra em consulta de outro paciente.
- O paciente nao entra antes de autorizacao.
- Bloqueios por status, janela, consentimento, elegibilidade ou pagamento usam mensagem segura.
- Tentativas indevidas sao candidatas a evento de auditoria.

## Epico 3 - Agenda do medico e atendimento

Como medico independente, quero visualizar e atender apenas consultas vinculadas a mim, dentro do meu ramo de atividade autorizado.

Historias candidatas:

- Como medico, quero ver minha agenda do dia.
- Como medico, quero abrir detalhe de consulta vinculada.
- Como medico, quero iniciar e encerrar atendimento quando permitido.
- Como medico, quero atualizar ou retificar registro clinico conforme regra aprovada.

Criterios de aceite:

- Medico nao visualiza consultas sem vinculo ou fora do escopo autorizado.
- Consulta fora da janela ou status invalido fica bloqueada.
- Acoes sensiveis sao candidatas a auditoria.
- Prontuario/registro clinico permanece restrito a perfis autorizados.

## Epico 4 - ADM Medico do Trabalho

Como ADM Medico do Trabalho, quero acessar dados clinicos ocupacionais do CNPJ associado quando houver finalidade, permissao e auditoria.

Historias candidatas:

- Como ADM Medico do Trabalho, quero visualizar registros ocupacionais permitidos.
- Como ADM Medico do Trabalho, quero consultar diagnostico/prontuario/observacao clinica ocupacional quando autorizado.
- Como ADM Medico do Trabalho, quero atualizar ou retificar informacao clinica ocupacional conforme regra aprovada.

Criterios de aceite:

- Perfil nao e RH, financeiro ou admin empresarial.
- Acesso clinico depende de CNPJ associado, finalidade, permissao e auditoria.
- Dados clinicos nao sao exibidos para Empresa/Parceiro administrativo.
- Conteudo de chamada so aparece se houver gravacao/transcricao aprovada, o que nao e padrao.

## Epico 5 - Business: contrato e elegibilidade

Como empresa/parceiro, quero gerenciar acesso contratado sem visualizar dados clinicos individuais.

Historias candidatas:

- Como empresa/parceiro, quero ver contrato e plano.
- Como empresa/parceiro, quero ver pessoas elegiveis em visao administrativa.
- Como empresa/parceiro, quero atualizar elegibilidade permitida.
- Como empresa/parceiro, quero acompanhar uso agregado permitido.

Criterios de aceite:

- Empresa/parceiro nao visualiza diagnostico, prontuario, observacao clinica ou conteudo de chamada.
- Relatorios agregados respeitam granularidade minima a validar.
- Baixa granularidade bloqueia ou oculta relatorio sensivel.
- Tentativas de acesso indevido sao candidatas a evento de auditoria.

## Epico 6 - Auditoria e privacidade

Como auditor/privacidade, quero consultar eventos relevantes sem alterar dados operacionais.

Historias candidatas:

- Como auditor, quero ver tentativas negadas.
- Como auditor, quero filtrar eventos por periodo e perfil.
- Como auditor, quero coletar evidencias sem acessar dados sensiveis desnecessarios.

Criterios de aceite:

- Auditor nao altera dados operacionais.
- Eventos nao carregam CPF completo, token, senha, prontuario ou conteudo clinico.
- Acesso negado e tentativas sensiveis sao rastreaveis.

## Epico 7 - Financeiro seguro

Como financeiro, quero acompanhar cobrancas sem acessar dados clinicos.

Historias candidatas:

- Como financeiro, quero ver status de pagamentos.
- Como financeiro, quero identificar pendencias.
- Como financeiro, quero tratar divergencias sem acessar prontuario.

Criterios de aceite:

- Financeiro nao ve diagnostico, prontuario ou observacoes clinicas.
- Retorno de pagamento nao e tratado como fonte de verdade.
- Estados pendentes diferenciam aguardando pagamento de erro tecnico.
- Financeiro CNPJ tecnico cobre pagamentos de pacientes diretos vinculados ao CNPJ tecnico.

## Epico 8 - Suporte e CNPJ tecnico

Como suporte MedSync, quero cadastrar pessoa fisica no CNPJ tecnico quando ela entrar em contato diretamente.

Historias candidatas:

- Como suporte, quero criar beneficiario vinculado ao CNPJ tecnico.
- Como suporte, quero atualizar dados cadastrais permitidos.
- Como suporte, quero corrigir vinculos administrativos sem acessar dado clinico.

Criterios de aceite:

- Toda pessoa fisica direta fica vinculada ao CNPJ tecnico.
- Suporte nao acessa prontuario, diagnostico ou observacoes clinicas.
- Alteracoes administrativas sao auditadas.

## Epico 9 - CRUD e atualizacao de dados

Como usuario autorizado, quero atualizar dados permitidos sem perder rastreabilidade.

Historias candidatas:

- Como paciente/beneficiario, quero atualizar meus dados cadastrais permitidos.
- Como empresa/parceiro, quero atualizar dados administrativos e elegibilidade permitida.
- Como financeiro, quero atualizar informacoes financeiras permitidas.
- Como auditor, quero consultar alteracoes sem alterar dados operacionais.

Criterios de aceite:

- Cada update respeita perfil, CNPJ, finalidade e campos permitidos.
- Atualizacoes sensiveis geram evento de auditoria.
- Dados clinicos usam retificacao/aditamento quando aplicavel.

## Fora de escopo deste backlog candidato

- Marketplace publico.
- Consulta avulsa publica.
- White label.
- Prescricao, atestado e encaminhamento sem validacao.
- Relatorios clinicos por empresa/parceiro.
- Gravacao ou transcricao de teleconsulta por padrao.
- Perfil Clinica/Admin no MVP B2B atual.
- Go-live com pacientes reais.

## Dependencias

- [Reference Traceability Matrix](../01-product/REFERENCE_TRACEABILITY_MATRIX.md)
- [Reference Aligned Implementation Plan](REFERENCE_ALIGNED_IMPLEMENTATION_PLAN.md)
- [MVP Scope](../01-product/MVP_SCOPE.md)
- [MVP Screen Flow](../02-design/MVP_SCREEN_FLOW.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
- [QA Checklist](../08-quality/QA_CHECKLIST.md)

## Pendencias

- TODO: validar prioridades P0/P1.
- TODO: decompor historias em tarefas tecnicas.
- TODO: mapear cada historia para especificacao, rota, endpoint, permissao e teste.
- TODO: mapear cada referencia externa para capacidade, tela, endpoint, teste e evidencia.
- TODO: validar dados exibidos por perfil.
- TODO: aprovar granularidade minima de relatorios B2B.
- TODO: definir criterios formais de homologacao.

## Checklist

- [x] Epicos candidatos definidos.
- [x] Historias iniciais criadas.
- [x] Criticos de privacidade destacados por epico.
- [ ] TODO: validar com stakeholders.
- [ ] TODO: abrir specifications tecnicas.
- [ ] TODO: derivar testes de aceite.
