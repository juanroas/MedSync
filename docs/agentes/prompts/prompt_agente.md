Você é um agente sênior de engenharia, QA e segurança para o projeto MedSync.

Repositório:
https://github.com/juanroas/MedSync

Ambiente de teste:
https://med-sync-web-six.vercel.app/login

Contas de teste:

* Admin clínica: [adm_clinica@medsync.dev](mailto:adm_clinica@medsync.dev) / ADM123@dm!23
* Recepção: [recepcao@medsync.dev](mailto:recepcao@medsync.dev) / ADM123@dm!23
* Financeiro: [financeiro@medsync.dev](mailto:financeiro@medsync.dev) / ADM123@dm!23
* Auditor privacidade: [auditor_privacidade@medsync.dev](mailto:auditor_privacidade@medsync.dev) / ADM123@dm!23
* Paciente: [paciente_novo@teste.com](mailto:paciente_novo@teste.com) / ADM123@dm!23
* Médico: [medico_novo@medsync.dev](mailto:medico_novo@medsync.dev) / ADM123@dm!23

Objetivo:
Melhorar o MedSync como plataforma B2B de telemedicina para empresas, clínicas e colaboradores, garantindo validações básicas, segurança, LGPD, controle de acesso, auditoria e qualidade.

Contexto:
O MedSync é uma plataforma multi-clínica de agenda, teleconsulta sem gravação, registro clínico, auditoria e checkout hospedado. Stack atual: Next.js 15, TypeScript, Tailwind, .NET 9 Web API, PostgreSQL, Redis, LiveKit Cloud com E2EE, Mercado Pago Checkout Pro, Vercel e Railway.

IMPORTANTE:
Não declarar o sistema como “em conformidade com LGPD/CFM” nem pronto para pacientes reais. O objetivo agora é corrigir gaps técnicos e preparar homologação controlada.

Tarefas prioritárias:

1. Criar um módulo de QA automatizado

* Adicionar Playwright no frontend.
* Criar testes E2E para login de todos os perfis.
* Criar testes de autorização por perfil.
* Criar testes de isolamento entre clínicas.
* Criar testes de fluxo completo:

  * recepção cadastra paciente;
  * médico cadastra/visualiza consulta;
  * paciente aceita termo;
  * médico inicia consulta;
  * paciente entra somente quando autorizado;
  * médico encerra consulta.
* Criar testes negativos:

  * paciente tentando acessar consulta de outro paciente;
  * recepção tentando acessar prontuário;
  * financeiro tentando acessar dados clínicos;
  * admin tentando entrar na videochamada;
  * auditor tentando alterar dados;
  * usuário sem consentimento tentando entrar na chamada.
* Criar script:
  npm run test:e2e
  npm run test:e2e:ui
* Gerar relatório HTML do Playwright.

2. Criar checklist de QA manual dentro do projeto
   Criar arquivo:
   docs/08-quality/QA_CHECKLIST.md

Incluir:

* Testes de login.
* Testes de permissões.
* Testes de validação de formulários.
* Testes de responsividade.
* Testes de teleconsulta.
* Testes de auditoria.
* Testes de LGPD.
* Testes de pagamento.
* Testes de erro e mensagens amigáveis.
* Testes de produção/homologação.

3. Melhorar validações básicas do sistema
   Implementar validações no frontend e backend para:

Paciente:

* Nome obrigatório, mínimo 3 caracteres.
* CPF obrigatório, válido e mascarado.
* E-mail válido.
* Telefone válido.
* Data de nascimento obrigatória.
* Bloquear nascimento futuro.
* Validar idade mínima quando necessário.
* Endereço opcional, mas se preenchido validar campos principais.

Médico:

* Nome obrigatório.
* CRM obrigatório.
* UF do CRM obrigatória.
* Especialidade obrigatória.
* E-mail válido.
* Telefone válido.
* Impedir CRM duplicado na mesma clínica.

Consulta:

* Paciente obrigatório.
* Médico obrigatório.
* Data/hora obrigatória.
* Não permitir consulta no passado.
* Não permitir conflito de agenda para o mesmo médico.
* Não permitir duração menor que 10 minutos.
* Não permitir duração maior que o limite da clínica.
* Status controlado somente pelo backend.

Usuários/equipe:

* E-mail obrigatório e único.
* Perfil obrigatório.
* Senha temporária forte.
* Bloquear perfis incompatíveis.
* Exigir troca de senha temporária no primeiro acesso.

Login:

* Mensagens genéricas para evitar enumeração de usuário.
* Rate limit.
* Bloqueio progressivo.
* Auditoria de falhas.

4. Melhorar LGPD e privacidade
   Implementar/validar:

* Minimização de dados nas telas.
* CPF sempre mascarado para perfis não autorizados.
* Prontuário invisível para recepção, financeiro e admin.
* Auditoria para:

  * login;
  * falha de login;
  * leitura de cadastro sensível;
  * criação/alteração de paciente;
  * criação/alteração/cancelamento de consulta;
  * aceite de termo;
  * emissão de token LiveKit;
  * entrada/saída da videochamada;
  * acesso ao prontuário;
  * alteração de permissões;
  * tentativa de acesso negado.
* Criar tela ou endpoint de exportação dos dados do titular.
* Criar estrutura inicial para solicitação LGPD:

  * acesso;
  * correção;
  * exclusão quando aplicável;
  * portabilidade;
  * revogação de consentimento.
* Criar entidade DataSubjectRequest.
* Criar endpoints administrativos para acompanhar solicitações.
* Criar política de retenção configurável por categoria.
* Não registrar token, senha, CPF completo, prontuário ou URL sensível em log.
* Adicionar headers de segurança:

  * Content-Security-Policy;
  * Referrer-Policy: no-referrer;
  * X-Content-Type-Options;
  * Permissions-Policy;
  * Strict-Transport-Security em produção.

5. Melhorar autenticação e segurança

* Implementar MFA obrigatório para:

  * médico;
  * administrador da clínica;
  * auditor de privacidade;
  * financeiro.
* Implementar refresh token rotativo.
* Implementar revogação de sessão.
* Criar tela “Minhas sessões”.
* Permitir encerrar sessões antigas.
* Reduzir sessão para perfil sensível.
* Garantir cookie HttpOnly, Secure, SameSite.
* Remover qualquer dependência de localStorage para token sensível.
* Garantir Swagger desabilitado/protegido em produção.
* Garantir seed desabilitado em produção.
* Adicionar verificação para impedir credenciais demo em produção.

6. Melhorar videochamada LiveKit

* Garantir que o paciente fique em sala de espera sem conectar no LiveKit.
* Token LiveKit deve ser emitido somente pelo backend.
* Token deve validar:

  * usuário autenticado;
  * clínica;
  * consulta;
  * vínculo do participante;
  * janela de horário;
  * status da consulta;
  * consentimento aceito;
  * pagamento quando obrigatório.
* Token com TTL curto.
* Nome da sala não pode conter CPF, nome, especialidade ou dados pessoais.
* Médico responsável pode iniciar.
* Paciente só entra quando médico iniciou.
* Admin, recepção, financeiro e auditor não entram na chamada.
* Criar testes de reconexão.
* Criar testes de encerramento automático.
* Validar E2EE real.
* Garantir que gravação, egress e transcrição estejam desabilitados por padrão.
* Medir minutos por clínica e por consulta.

7. Melhorar B2B / modelo empresas
   Criar suporte inicial ao modelo B2B:

Entidades:

* Company
* CompanyEmployee
* BenefitPlan
* CompanyContract
* EmployeeEligibility

Regras:

* Uma empresa pode contratar o MedSync para colaboradores.
* Colaborador pode ser vinculado como paciente.
* Empresa não pode acessar prontuário.
* Empresa só pode ver dados agregados e administrativos:

  * quantidade de consultas;
  * status financeiro;
  * uso do benefício;
  * indicadores sem diagnóstico.
* Empresa não pode ver:

  * diagnóstico;
  * prontuário;
  * observações clínicas;
  * especialidade sensível quando expuser condição;
  * conteúdo da chamada.

Criar telas:

* Empresas
* Colaboradores
* Planos de benefício
* Relatório B2B agregado

Criar regra de privacidade:
O empregador nunca pode acessar dados clínicos individuais do colaborador.

8. Melhorar UX e produto

* Dashboard por perfil:

  * Admin: visão operacional da clínica.
  * Recepção: agenda e pacientes.
  * Médico: agenda do dia e prontuário.
  * Paciente: minhas consultas, pagamento, termo e entrar na sala.
  * Financeiro: cobranças e status.
  * Auditor: eventos e filtros.
* Melhorar estados vazios.
* Melhorar mensagens de erro.
* Melhorar loading states.
* Melhorar responsividade mobile.
* Melhorar tela de videochamada para 1366x768, 1440x900 e mobile.
* Garantir que botões principais fiquem visíveis sem zoom.

9. Pagamentos

* Validar Mercado Pago Sandbox.
* Testar:

  * pagamento aprovado;
  * recusado;
  * pendente;
  * webhook duplicado;
  * webhook inválido;
  * estorno;
  * chargeback.
* Garantir idempotência.
* Página de retorno não pode ser fonte de verdade.
* Criar tela financeira sem dados clínicos.

10. Infra e produção
    Criar ou atualizar:

* docs/09-production/PRODUCTION_CHECKLIST.md
* docs/07-security/SECURITY_CHECKLIST.md
* docs/07-security/LGPD_CHECKLIST.md
* docs/01-product/B2B_MODEL.md
* docs/08-quality/QA_CHECKLIST.md
* docs/09-production/RISK_REGISTER.md

Incluir:

* backup criptografado;
* teste de restauração;
* SAST;
* dependency scan;
* secret scan;
* DAST;
* pentest;
* aprovação jurídica;
* aprovação do diretor técnico;
* aprovação do encarregado de dados;
* plano de resposta a incidentes;
* processo de comunicação de incidente;
* inventário de dados;
* matriz de base legal;
* política de retenção;
* contratos com subprocessadores.

11. Criar agente QA no repositório
    Criar pasta:
    qa/

Com:

* qa/README.md
* qa/test-plan.md
* qa/test-cases.md
* qa/bug-report-template.md
* qa/lgpd-test-cases.md
* qa/security-test-cases.md
* qa/b2b-test-cases.md

Criar GitHub Actions:

* build API
* build web
* typecheck
* unit tests
* e2e tests
* dependency scan
* secret scan

12. Entrega esperada
    Ao final, gerar:

* Pull Request com descrição clara.
* Lista do que foi implementado.
* Lista do que ainda falta.
* Evidências de testes.
* Prints ou relatório Playwright.
* Atualização do README.
* Atualização dos documentos de produção.
* Nenhum segredo real versionado.
* Nenhuma credencial de produção exposta.
* Sistema ainda marcado como “homologação”, não “produção”.

Critério de aceite:

* Nenhum perfil acessa dados fora da sua permissão.
* Nenhum usuário acessa dados de outra clínica.
* Empresa B2B não acessa dado clínico individual.
* Paciente não entra na videochamada sem consentimento.
* Paciente não entra antes do médico iniciar.
* Médico só acessa consultas vinculadas.
* Admin não acessa prontuário nem chamada.
* Financeiro não acessa prontuário.
* Auditor não altera dados.
* Logs não expõem dados sensíveis.
* Testes E2E cobrem os fluxos principais e negativos.
