# Data Management and CRUD - MedSync

Status: Product Discovery. Este documento define diretrizes iniciais para cadastro, consulta, atualizacao e auditoria de dados. Nao confirma implementacao.

## Objetivo

Documentar que o MedSync deve prever criacao, leitura, atualizacao e controle de alteracoes, e nao apenas cadastro inicial.

## Escopo

Inclui:

- Operacoes CRUD conceituais.
- Perfis que podem solicitar atualizacao.
- Limites por CNPJ, perfil e tipo de dado.
- Auditoria de alteracoes.

Fora de escopo:

- Criar endpoints.
- Criar telas.
- Criar migrations.
- Definir campos finais.
- Definir politica juridica final de retencao/correcao.

## Principios

- Todo dado deve ter dono, finalidade e escopo.
- Atualizacao deve respeitar perfil, CNPJ, vinculo e permissao.
- Dados clinicos exigem regra propria e auditoria reforcada.
- Dados financeiros nao devem liberar acesso clinico.
- Empresa/parceiro nao atualiza nem visualiza dado clinico individual.
- Alteracoes relevantes devem gerar evento de auditoria.

## Operacoes

| Operacao | Definicao | Requisito |
|---|---|---|
| Create | Criar novo registro | Validacao de campos e permissao |
| Read | Visualizar registro | Escopo por perfil, CNPJ e finalidade |
| Update | Atualizar registro existente | Controle de campos permitidos e auditoria |
| Disable/Cancel | Desativar ou cancelar sem apagar indevidamente | Motivo, status e rastreabilidade |
| Delete/Anonymize | Excluir, anonimizar ou pseudonimizar quando aplicavel | Requer regra juridica e politica de retencao |

## Atualizacao por perfil

| Perfil | Pode atualizar | Nao pode atualizar |
|---|---|---|
| Todos os perfis autenticados | Dados pessoais proprios permitidos em `/perfil`: nome, e-mail e telefone quando aplicavel | Papel/permissao, CNPJ/tenant, elegibilidade, CPF, CRM, especialidade, faturas e dados clinicos |
| Paciente/beneficiario | Dados cadastrais proprios permitidos, contato, preferencias e consentimentos quando aplicavel | Dados clinicos registrados por medico, elegibilidade de empresa, faturas |
| Suporte MedSync | Cadastro operacional, vinculo a CNPJ tecnico, correcoes administrativas permitidas | Prontuario, diagnostico, conduta clinica |
| Empresa/Parceiro | Dados administrativos do CNPJ, usuarios empresariais, elegibilidade permitida, dados contratuais conforme permissao | Prontuario, diagnostico, observacoes clinicas, conteudo de chamada |
| Medico independente | Registro clinico do atendimento vinculado, dentro das regras de autoria e retificacao | Dados financeiros, contrato da empresa, elegibilidade B2B |
| ADM Medico do Trabalho | Dados clinicos ocupacionais permitidos no CNPJ associado, se aprovado | Dados financeiros e administrativos fora do escopo clinico |
| Financeiro Empresa/Parceiro | Dados financeiros e administrativos permitidos do CNPJ | Dados clinicos individuais |
| Financeiro Plataforma/MedSync | Dados financeiros operacionais e CNPJ tecnico conforme permissao | Prontuario, diagnostico, observacoes clinicas |
| Auditor/Privacidade | Em regra, nao atualiza dados operacionais; pode registrar evidencias/processos quando aprovado | Alterar consulta, prontuario, fatura ou cadastro sem fluxo proprio |
| Admin Plataforma | Configuracoes, usuarios e operacao permitida | Dados clinicos sem finalidade e autorizacao formal |

## Dados sensiveis e clinicos

Atualizacao de dados clinicos deve considerar:

- autoria;
- versao ou historico;
- motivo de correcao;
- data/hora;
- profissional responsavel;
- trilha de auditoria;
- regra de retencao.

TODO: validar se registros clinicos podem ser editados diretamente ou apenas retificados/aditados.

## Eventos de auditoria candidatos

- Criacao de cadastro.
- Atualizacao de cadastro.
- Alteracao de elegibilidade.
- Alteracao de contrato/plano.
- Alteracao de dados financeiros.
- Criacao ou retificacao de registro clinico.
- Alteracao de consentimento.
- Cancelamento/desativacao.
- Tentativa de update sem permissao.

## Pendencias

- TODO: definir campos editaveis por entidade.
- Implementado parcial: `/profile` permite atualizacao pessoal minima para todos os perfis autenticados, com auditoria.
- TODO: definir quais dados exigem historico de versao.
- TODO: definir politica de retencao, exclusao e anonimizacao.
- TODO: detalhar campos editaveis por operacao a partir da matriz de permissoes.
- TODO: transformar em specifications, testes e criterios de aceite.

## Checklist

- [x] Update documentado como requisito.
- [x] Limites por perfil definidos em alto nivel.
- [x] Auditoria de alteracao prevista.
- [ ] TODO: validar com juridico, privacidade, seguranca e engenharia.

## Referencias

- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [B2B Model](B2B_MODEL.md)
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [LGPD Checklist](../07-security/LGPD_CHECKLIST.md)
- [Specifications](../16-specifications/README.md)
