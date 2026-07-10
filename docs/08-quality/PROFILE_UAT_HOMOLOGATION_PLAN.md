# Plano de Homologacao por Perfis - MedSync

Status: homologacao controlada. Este plano nao libera producao, pacientes reais ou declaracao de conformidade LGPD/CFM.

## Objetivo

Validar o MedSync como produto de saude digital B2B2C, com uma empresa de teste, antes de qualquer uso real.

O foco da homologacao e confirmar que cada perfil enxerga uma experiencia propria, util e limitada ao seu papel:

- Paciente/beneficiario recebe acesso ao cuidado.
- Medico independente atende consultas vinculadas ao seu escopo.
- Empresa/parceiro acompanha contrato, elegibilidade, faturas e uso agregado.
- Financeiro acompanha cobrancas sem dado clinico.
- Auditoria acompanha eventos permitidos sem alterar operacao.
- MedSync opera suporte, plataforma, privacidade e evidencias.

## Principio de negocio obrigatorio

O MedSync nao deve parecer sistema de RH legado.

A empresa contratante e uma camada de contrato, elegibilidade, governanca e relatorios permitidos. Ela nunca pode acessar prontuario, diagnostico, observacao clinica, conteudo de chamada ou dado clinico individual do paciente/beneficiario.

## Perfis participantes

| Perfil | Objetivo no teste | O que deve validar |
|---|---|---|
| Empresa Admin | Governanca B2B do CNPJ | Contrato, plano, elegibilidade, uso agregado e limites de privacidade |
| Paciente/beneficiario | Jornada de cuidado | Login, consultas proprias, sala, consentimento, bloqueios e cadastro proprio permitido |
| Medico independente | Operacao assistencial | Agenda vinculada, entrada na sala, perfil medico e bloqueio de agenda indevida |
| Financeiro Empresa | Faturamento do CNPJ | Faturas, pendencias e uso agregado sem dado clinico |
| Auditor Empresa | Evidencias administrativas | Eventos administrativos do proprio CNPJ, sem dado clinico e sem edicao |
| Admin Plataforma MedSync | Operacao geral | Visao por CNPJ, configuracoes, suporte operacional e bloqueios |
| Financeiro Plataforma MedSync | Financeiro global | Visao operacional financeira minimizada por CNPJ e CNPJ tecnico |
| Auditor Plataforma / DPO | Privacidade e auditoria | Eventos globais minimizados, incidentes, direitos do titular e evidencias |
| ADM Medico do Trabalho | Saude ocupacional restrita | Somente quando houver validacao juridica, DPO e diretor tecnico |

## Rodada de homologacao

### 1. Preparacao

- Ambiente identificado como homologacao/teste.
- Nenhum dado real de paciente.
- CNPJ de teste criado.
- Usuarios de teste por perfil.
- Plano e contrato de teste associados ao CNPJ.
- Consultas e pacientes ficticios carregados.
- Senhas temporarias trocadas quando o fluxo exigir.

### 2. Teste individual por perfil

Cada participante testa apenas seu papel e registra:

- Perfil usado.
- Tela acessada.
- Acao executada.
- Resultado esperado.
- Resultado obtido.
- Evidencia: print, video curto, log sanitizado ou relatorio Playwright.
- Bloqueio, duvida ou melhoria.
- Risco LGPD, se houver.

### 3. Teste cruzado entre perfis

Executar a jornada de ponta a ponta:

| Passo | Perfil principal | Validacao |
|---|---|---|
| 1 | Empresa Admin | Confirma empresa, plano e elegibilidade administrativa |
| 2 | Paciente | Acessa propria jornada e visualiza consulta autorizada |
| 3 | Medico | Enxerga consulta vinculada e inicia sala |
| 4 | Paciente | Entra na sala somente quando autorizado |
| 5 | Financeiro Empresa | Enxerga fatura/uso agregado sem dado clinico |
| 6 | Auditor Empresa | Enxerga eventos administrativos permitidos |
| 7 | Admin Plataforma | Confere operacao por CNPJ sem quebrar segregacao |
| 8 | Auditor Plataforma/DPO | Confere eventos e minimizacao de dados |

### 4. Conversa estruturada entre perfis

Ao fim da rodada, registrar uma conversa curta com perguntas fixas:

| Pergunta | Quem responde |
|---|---|
| O que eu preciso fazer no MedSync para cumprir meu papel? | Todos |
| O que eu vi que nao deveria ver? | Todos |
| O que eu nao consegui fazer e deveria conseguir? | Todos |
| Alguma tela parece RH/administrativo demais e pouco saude digital? | Todos |
| Algum dado pode identificar condicao clinica individual? | Empresa, financeiro, auditoria, DPO |
| O fluxo de consulta ficou claro e seguro? | Paciente e medico |
| O que bloqueia uma empresa piloto de teste? | MedSync, empresa e QA |

## Criterios de aceite por perfil

| Perfil | Aceite minimo para homologacao |
|---|---|
| Empresa Admin | Tela B2B clara, sem linguagem de clinica/RH e sem dado clinico individual |
| Paciente | Consegue ver suas consultas e entende proximo passo de cuidado |
| Medico | Ve agenda vinculada, consegue iniciar sala quando permitido e nao agenda como empresa |
| Financeiro Empresa | Diferente do Empresa Admin, com foco em cobranca e uso agregado |
| Auditor Empresa | Diferente do Empresa Admin, com foco em evidencias, somente leitura e eventos permitidos |
| Admin Plataforma | Visao operacional geral por CNPJ sem criar agenda clinica |
| Financeiro Plataforma | Visao financeira global minimizada, incluindo CNPJ tecnico quando aprovado |
| Auditor Plataforma/DPO | Eventos globais minimizados, sem CPF completo, senha, token ou prontuario |

## Testes negativos obrigatorios

- Empresa Admin tenta acessar prontuario: deve bloquear.
- Empresa Admin tenta ver diagnostico individual: deve bloquear.
- Financeiro tenta acessar dado clinico: deve bloquear.
- Auditor Empresa tenta alterar cadastro: deve bloquear.
- Medico tenta acessar paciente sem consulta vinculada: deve bloquear.
- Paciente tenta abrir consulta de outro paciente: deve bloquear.
- Perfil sem autorizacao tenta entrar na sala: deve bloquear.
- Relatorio B2B com poucos registros tenta expor uso individual: deve bloquear, agrupar ou ocultar.

## Bloqueadores para empresa piloto de teste

Qualquer item abaixo bloqueia disponibilizar para uma empresa de teste:

- Tela principal ainda usa "clinica/admin clinica" como linguagem do MVP B2B.
- Empresa, financeiro ou auditoria acessa dado clinico individual.
- Paciente acessa dados de outro paciente.
- Medico acessa consulta sem vinculo.
- Sala libera token para perfil nao autorizado.
- Logs, eventos ou prints expõem senha, token, CPF completo, prontuario ou diagnostico.
- Ambiente nao esta claramente marcado como homologacao/teste.
- Dados reais foram inseridos.

## Nao pronto para producao

Antes de producao ou pacientes reais, continuam obrigatorios:

- Validacao juridica.
- Validacao do DPO/encarregado de dados.
- Validacao do diretor tecnico.
- Inventario de dados pessoais.
- Matriz de base legal por finalidade.
- Politica de retencao.
- Pentest ou avaliacao de seguranca aplicavel.
- Backup/restore testado.
- Monitoramento e runbooks.

## Evidencias aceitas

- Relatorio HTML do Playwright.
- Prints sem dados sensiveis.
- Logs sanitizados.
- Respostas de API sanitizadas.
- Registro de auditoria sanitizado.
- Ata curta da conversa entre perfis.
- Lista de falhas com severidade.

## Severidade de falhas

| Severidade | Definicao | Decisao |
|---|---|---|
| P0 | Vazamento clinico, tenant/CNPJ quebrado, sala liberada indevidamente ou dado real exposto | Bloqueia homologacao |
| P1 | Perfil essencial nao consegue executar jornada principal | Bloqueia piloto ate corrigir |
| P2 | Fluxo incompleto com contorno aceitavel em teste | Pode seguir com restricao documentada |
| P3 | Texto, polimento visual ou melhoria menor | Pode seguir se nao confundir regra de negocio |

## Saida esperada

Ao final da rodada, o resultado deve ser um dos tres:

- `Go para empresa de teste`: apenas homologacao, sem pacientes reais.
- `Go com restricoes`: homologacao limitada, com riscos aceitos por escrito.
- `No-go`: bloqueadores P0/P1 ainda abertos.

## Referencias

- [QA Checklist](QA_CHECKLIST.md)
- [Authorization Test Matrix](AUTHORIZATION_TEST_MATRIX.md)
- [Plano de Teste](../../qa/test-plan.md)
- [Casos UAT por perfil](../../qa/profile-uat-test-cases.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [Production Checklist](../09-production/PRODUCTION_CHECKLIST.md)
