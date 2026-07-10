# Checklist de QA - MedSync

Status do produto: homologacao controlada. Este checklist nao declara conformidade LGPD/CFM/ANS nem prontidao para pacientes reais.

## Login

- [ ] Login valido para paciente/beneficiario, empresa/parceiro admin, medico independente, ADM Medico do Trabalho, financeiro empresa, financeiro plataforma, suporte MedSync, auditor empresa, auditor plataforma, DPO/privacidade e admin plataforma.
- [ ] Mensagem generica para credenciais invalidas.
- [ ] Rate limit retorna 429 apos tentativas excessivas.
- [ ] Usuario com senha temporaria e redirecionado para troca de senha.
- [ ] Logout remove a sessao e impede retorno por historico do navegador.

## Homologacao por perfis

- [ ] Roteiro `PROFILE_UAT_HOMOLOGATION_PLAN.md` executado com empresa de teste.
- [ ] Cada perfil registrou resultado esperado, resultado obtido e evidencia.
- [ ] Conversa cruzada entre empresa, paciente, medico, financeiro, auditoria e MedSync registrada.
- [ ] Falhas classificadas como P0, P1, P2 ou P3.
- [ ] Nenhum P0 aberto antes de liberar empresa piloto de teste.
- [ ] Nenhum P1 aberto na jornada testada antes de liberar empresa piloto de teste.
- [ ] Ambiente identificado como homologacao/teste e sem dados reais.

## Permissoes

- [ ] Empresa/parceiro gerencia contrato, plano, elegibilidade, faturas e relatorios agregados sem dado clinico individual.
- [ ] Financeiro visualiza cobrancas e uso agregado sem dados clinicos.
- [ ] Suporte cadastra pessoa fisica no CNPJ tecnico sem acessar prontuario.
- [ ] Auditor visualiza eventos permitidos e nao altera cadastros operacionais.
- [ ] Medico independente acessa apenas consultas vinculadas e dentro do ramo/especialidade autorizada.
- [ ] ADM Medico do Trabalho acessa apenas registros ocupacionais do CNPJ associado, com finalidade auditada.
- [ ] Paciente acessa apenas as proprias consultas e dados.
- [ ] Dados de outro CNPJ nao aparecem em listas, detalhes, relatorios ou endpoints.

## Validacao de formularios e CRUD

- [ ] Pessoa exige nome com minimo definido pelo produto.
- [ ] CPF obrigatorio quando aplicavel, valido, mascarado e unico conforme regra de CNPJ/base legal.
- [ ] E-mail e telefone validos.
- [ ] Nascimento obrigatorio quando aplicavel e nao futuro.
- [ ] Medico exige nome, CRM, UF do CRM, especialidade/ramo, e-mail e telefone validos.
- [ ] Consulta exige paciente, medico, data futura e duracao dentro dos limites definidos.
- [ ] Conflito de agenda do medico e bloqueado.
- [ ] Atualizacao de dados permitidos por perfil e salva e auditada.
- [ ] Atualizacao de campo nao permitido e bloqueada e auditada.

## Responsividade

- [ ] Login, dashboards e agenda funcionam em mobile.
- [ ] Menu lateral abre/fecha sem cobrir acoes principais.
- [ ] Videochamada funciona em 1366x768, 1440x900 e mobile.
- [ ] Botoes primarios ficam visiveis sem zoom.

## Teleconsulta

- [ ] Medico responsavel inicia a consulta.
- [ ] Paciente sem consentimento nao recebe token LiveKit.
- [ ] Paciente aguarda ate o medico iniciar.
- [ ] Perfis administrativos, financeiros, suporte e auditoria nao recebem token de chamada.
- [ ] Encerramento pelo medico muda status para concluido.
- [ ] Nome da sala nao contem CPF, nome, e-mail, diagnostico ou especialidade sensivel.
- [ ] Conteudo de chamada nao e gravado por padrao.
- [ ] E2EE esta ativo no cliente quando aplicavel.

## Auditoria

- [ ] Login e falha de login geram evento.
- [ ] Criacao/leitura/atualizacao de pessoa ou beneficiario gera evento conforme sensibilidade.
- [ ] Criacao e leitura de consulta geram evento.
- [ ] Aceite de termo gera evento com versao.
- [ ] Emissao de token de video gera evento.
- [ ] Acesso ao prontuario ou registro ocupacional gera evento.
- [ ] Eventos nao registram senha, token, CPF completo, URL sensivel, prontuario ou diagnostico.

## LGPD

- [ ] CPF mascarado para perfis sem necessidade operacional.
- [ ] Dados clinicos invisiveis para empresa/parceiro, suporte, financeiro e admin administrativo.
- [ ] ADM Medico do Trabalho tem acesso restrito ao CNPJ, finalidade e base validada.
- [ ] Exportacao de dados do titular planejada/testada antes da producao.
- [ ] Solicitacoes de acesso, correcao, exclusao, portabilidade e revogacao mapeadas.
- [ ] Retencao por categoria revisada por juridico/DPO.
- [ ] CNPJ tecnico validado por juridico, DPO e responsavel tecnico antes de producao.

## Pagamentos

- [ ] Checkout Mercado Pago Sandbox aprovado, recusado e pendente.
- [ ] Webhook valido atualiza status.
- [ ] Webhook duplicado e idempotente.
- [ ] Webhook invalido retorna nao autorizado.
- [ ] Retorno do checkout nao e fonte de verdade.
- [ ] Tela financeira nao mostra dados clinicos.

## Erros e homologacao

- [ ] Erros mostram mensagem amigavel sem stack trace.
- [ ] Healthcheck responde sem expor segredo.
- [ ] Swagger fica restrito/desabilitado fora de desenvolvimento.
- [ ] Seed demo fica desabilitado fora de desenvolvimento.
- [ ] Ambiente segue marcado como homologacao.
