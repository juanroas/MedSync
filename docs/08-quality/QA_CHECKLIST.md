# Checklist de QA - MedSync

Status do produto: homologacao controlada. Este checklist nao declara conformidade LGPD/CFM nem prontidao para pacientes reais.

## Login

- [ ] Login valido para admin clinica, recepcao, financeiro, auditor, paciente e medico.
- [ ] Mensagem generica para credenciais invalidas.
- [ ] Rate limit retorna 429 apos tentativas excessivas.
- [ ] Usuario com senha temporaria e redirecionado para troca de senha.
- [ ] Logout remove a sessao e impede retorno por historico do navegador.

## Permissoes

- [ ] Recepcao cadastra pacientes e consultas, mas nao acessa prontuario.
- [ ] Financeiro visualiza cobrancas sem dados clinicos.
- [ ] Admin gerencia equipe, mas nao entra em videochamada nem acessa prontuario.
- [ ] Auditor visualiza eventos e nao altera cadastros.
- [ ] Medico acessa apenas consultas vinculadas.
- [ ] Paciente acessa apenas as proprias consultas.
- [ ] Dados de outra clinica nao aparecem em listas ou detalhes.

## Validacao de formularios

- [ ] Paciente exige nome com minimo 3 caracteres.
- [ ] CPF obrigatorio, valido, mascarado e unico por clinica.
- [ ] E-mail e telefone validos.
- [ ] Nascimento obrigatorio e nao futuro.
- [ ] Medico exige nome, CRM, UF do CRM, especialidade, e-mail e telefone validos.
- [ ] Consulta exige paciente, medico, data futura e duracao entre 10 e 240 minutos.
- [ ] Conflito de agenda do medico e bloqueado.

## Responsividade

- [ ] Login, dashboard e agenda funcionam em mobile.
- [ ] Menu lateral abre/fecha sem cobrir acoes principais.
- [ ] Videochamada funciona em 1366x768, 1440x900 e mobile.
- [ ] Botoes primarios ficam visiveis sem zoom.

## Teleconsulta

- [ ] Medico responsavel inicia a consulta.
- [ ] Paciente sem consentimento nao recebe token LiveKit.
- [ ] Paciente aguarda ate o medico iniciar.
- [ ] Admin, recepcao, financeiro e auditor nao recebem token de chamada.
- [ ] Encerramento pelo medico muda status para concluido.
- [ ] Nome da sala nao contem CPF, nome ou especialidade.
- [ ] E2EE esta ativo no cliente.

## Auditoria

- [ ] Login e falha de login geram evento.
- [ ] Leitura/criacao de paciente gera evento.
- [ ] Criacao e leitura de consulta geram evento.
- [ ] Aceite de termo gera evento.
- [ ] Emissao de token de video gera evento.
- [ ] Acesso ao prontuario gera evento.
- [ ] Eventos nao registram senha, token, CPF completo, URL sensivel ou prontuario.

## LGPD

- [ ] CPF mascarado para perfis sem necessidade operacional.
- [ ] Dados clinicos invisiveis para empregador, recepcao, financeiro e admin.
- [ ] Exportacao de dados do titular planejada/testada antes da producao.
- [ ] Solicitacoes de acesso, correcao, exclusao, portabilidade e revogacao mapeadas.
- [ ] Retencao por categoria revisada por juridico/DPO.

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
