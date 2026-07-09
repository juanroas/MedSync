# Plano de ação para produção do MedSync

Status: implementação técnica em homologação; consulte [RELATORIO_HOMOLOGACAO.md](RELATORIO_HOMOLOGACAO.md)  
Data de referência: 1º de julho de 2026  
Escopo: plataforma multi-clínica de agenda, teleconsulta sem gravação e cobrança por checkout hospedado

> Este documento é um plano técnico e operacional de adequação. A aprovação jurídica, ética e regulatória final deve ser feita pelo jurídico, pelo encarregado de dados e pelo diretor técnico médico da operação.

## 1. Decisão arquitetural

O MedSync continuará sendo um único produto e, inicialmente, um monólito modular. Não serão criados microserviços independentes antes de existir uma necessidade comprovada de escala, isolamento regulatório ou operação.

A aplicação será dividida internamente nos seguintes módulos:

1. Identidade e controle de acesso.
2. Clínicas e usuários.
3. Agenda.
4. Atendimento clínico/SRES.
5. Videochamada.
6. Pagamentos.
7. Notificações.
8. Auditoria e privacidade.

Cada módulo terá responsabilidades, permissões e dados delimitados. A interface continuará integrada para o usuário, mas o acesso no backend será sempre validado pela clínica, pelo perfil e pelo vínculo com o atendimento.

```text
Web MedSync
    |
API MedSync
    +-- Identidade/RBAC
    +-- Clínica e agenda
    +-- Clínico/SRES
    +-- Cobrança --------> Checkout hospedado
    +-- Video gateway ---> LiveKit
    +-- Auditoria
```

### Por que não separar tudo agora

- Separar aplicações não reduz os minutos e a banda consumidos no LiveKit.
- Vários serviços aumentariam deploys, credenciais, observabilidade, contratos internos e superfície de ataque.
- Um monólito modular permite entregar a versão inicial com menos custo sem abrir mão de segregação lógica.
- O gateway de vídeo e o provedor de pagamento serão abstraídos por interfaces, permitindo substituição futura.

### Quando extrair um módulo

Um módulo somente deverá virar serviço independente quando houver pelo menos uma destas condições:

- necessidade de escalar vídeo, agenda ou cobrança separadamente;
- exigência contratual de isolamento físico de uma clínica;
- equipe dedicada e capacidade de operar o serviço;
- indisponibilidade de um módulo não puder afetar os demais;
- análise financeira demonstrar economia real;
- exigência técnica ou regulatória formal.

## 2. Problemas encontrados na versão atual

### P0 — bloqueiam o uso com pacientes reais

| Problema | Risco | Estratégia |
|---|---|---|
| Todos os endpoints usam apenas autenticação genérica | Usuários autenticados podem acessar dados que não lhes pertencem | Implementar autorização por clínica, perfil e vínculo |
| Listagens retornam CPF, nascimento e contato completos | Exposição excessiva de dados pessoais | Criar DTOs por perfil e mascarar dados |
| Qualquer usuário autenticado pode consultar todas as consultas | Violação de sigilo e LGPD | Filtrar sempre por `ClinicId`, paciente ou médico responsável |
| Token LiveKit verifica somente se a sala existe | Entrada indevida em consulta alheia | Validar participante, consulta, horário, estado e papel |
| Qualquer usuário autenticado pode criar uma sala | Início indevido e consumo desnecessário | Permitir início apenas ao médico responsável ou operador autorizado |
| Não existe consentimento de telemedicina | Atendimento sem evidência de autorização | Versionar termo e registrar aceite antes da consulta |
| Não existe SRES/prontuário adequado | Não atendimento à Resolução CFM nº 2.314/2022 | Implementar módulo clínico com NGS2, autoria e auditoria |
| Não existe trilha de auditoria | Impossibilidade de comprovar acessos e alterações | Criar log imutável de eventos relevantes |
| JWT fica no `localStorage` por até oito horas | Maior impacto em caso de XSS ou computador compartilhado | Migrar para cookie `HttpOnly`, sessão curta e refresh rotativo |
| Não há isolamento entre clínicas | Possível vazamento entre clientes | Tornar `ClinicId` obrigatório e testar isolamento |

### P1 — necessários antes da homologação

| Problema | Estratégia |
|---|---|
| Não existe MFA | Exigir MFA para médicos e perfis administrativos |
| Swagger fica exposto em qualquer ambiente | Habilitar somente em desenvolvimento ou proteger por rede/autorização |
| Seed de demonstração faz parte da inicialização | Proibir seed e credenciais de demonstração em produção |
| Não há rate limit no login e endpoints sensíveis | Implementar limitação, bloqueio progressivo e alertas |
| Dados completos de pacientes são armazenados no Redis | Não cachear CPF e dados clínicos; separar cache por clínica |
| Não há política de retenção | Criar tabela de retenção por categoria e procedimento de descarte |
| Não há fluxo para direitos dos titulares | Criar canal, autenticação do solicitante e workflow de atendimento |
| Não há plano de incidentes | Criar playbook, responsáveis, evidências e processo de comunicação |
| Não há evidência de backup e restauração | Implementar backups criptografados e testes periódicos de restauração |
| Não há E2EE explicitamente habilitado no LiveKit | Implementar e testar criptografia ponta a ponta |
| Não há lifecycle completo da consulta | Implementar estados, webhooks, timeouts e encerramento |
| A sala excede a altura da tela e exige zoom/scroll no desktop | Limitar a sala à viewport dinâmica e testar o layout responsivo |
| Não há integração de pagamento | Integrar checkout hospedado e webhooks idempotentes |

## 3. Modelo multi-clínica

### Entidades principais

- `Clinic`: clínica contratante.
- `ClinicMembership`: vínculo entre usuário, clínica e perfil.
- `User`: identidade de autenticação.
- `Doctor`: dados profissionais e vínculo com usuário.
- `Patient`: dados cadastrais dentro da clínica.
- `Appointment`: agendamento.
- `Consultation`: execução clínica do atendimento.
- `VideoSession`: estado técnico da chamada, sem mídia gravada.
- `ConsentRecord`: termo aceito, versão, data, origem e evidência.
- `ClinicalRecord`: registro clínico/prontuário.
- `Payment`: cobrança vinculada à consulta.
- `AuditEvent`: evento de segurança, acesso ou alteração.

### Regras obrigatórias

- Toda entidade de negócio deverá possuir `ClinicId`, diretamente ou por vínculo obrigatório.
- Toda consulta ao banco deverá ser escopada pela clínica autenticada.
- IDs públicos serão UUIDs aleatórios; CPF não será usado como chave de integração.
- Uma conta poderá pertencer a mais de uma clínica, mas deverá selecionar o contexto ativo.
- Trocar de clínica exigirá nova validação de autorização.
- Testes automatizados deverão tentar acessar recursos de outra clínica e esperar `403` ou `404`.
- O cache deverá incluir `ClinicId` na chave e nunca armazenar prontuário, consentimento ou CPF completo.

## 4. Papéis e perfis

Os perfis serão atribuídos por clínica. Um mesmo usuário poderá ser médico em uma clínica e administrador em outra.

### Paciente

Pode:

- visualizar e atualizar seus dados permitidos;
- ver suas consultas;
- aceitar o termo de telemedicina;
- realizar pagamento;
- entrar somente em sua videochamada;
- solicitar acesso ou cópia de seus registros;
- cancelar ou reagendar conforme política da clínica.

Não pode:

- consultar outros pacientes;
- alterar registros clínicos;
- iniciar sala como médico;
- visualizar dados administrativos da clínica.

### Médico

Pode:

- ver sua agenda;
- acessar pacientes vinculados aos seus atendimentos;
- iniciar e encerrar sua consulta;
- registrar anamnese, avaliação e conduta;
- emitir documentos quando a funcionalidade estiver homologada;
- consultar o histórico necessário ao cuidado;
- corrigir registro por adendo, sem apagar o original.

Não pode:

- acessar automaticamente todos os pacientes da clínica;
- alterar cobrança;
- apagar prontuário ou auditoria;
- entrar em consulta de outro médico sem vínculo formal.

### Recepção/Agendamento

Pode:

- cadastrar dados administrativos mínimos;
- criar, confirmar, cancelar e reagendar consultas;
- ver médico, paciente, horário e status;
- reenviar convite de acesso;
- verificar se existe pendência de pagamento.

Não pode:

- ver observações clínicas, prontuário ou conteúdo da consulta;
- acessar áudio ou vídeo;
- emitir token para entrar como participante;
- consultar dados financeiros além do necessário para atendimento.

### Financeiro

Pode:

- criar ou reenviar cobrança;
- ver valor, vencimento e situação;
- executar estorno conforme permissão;
- conciliar pagamento;
- exportar relatórios financeiros autorizados.

Não pode:

- acessar prontuário, diagnóstico ou observações;
- ver dados de cartão;
- entrar em consultas.

### Administrador da clínica

Pode:

- gerenciar usuários, perfis, horários e configurações da clínica;
- consultar a agenda completa com dados administrativos;
- configurar pagamento, políticas de cancelamento e duração;
- consultar relatórios operacionais;
- visualizar auditorias administrativas.

Não pode, apenas por ser administrador:

- ler prontuários;
- assistir chamadas;
- acessar consultas como participante;
- visualizar gravações, pois não existirão;
- apagar auditorias.

### Diretor técnico médico

Pode:

- exercer as permissões clínicas previstas para sua responsabilidade;
- acessar registros clínicos da clínica quando houver finalidade assistencial, ética, regulatória ou de auditoria;
- supervisionar protocolos e qualidade;
- autorizar acessos excepcionais.

Todo acesso ampliado deverá:

- exigir justificativa;
- gerar evento de auditoria;
- notificar ou ser revisado pelo encarregado/auditor quando aplicável.

### Encarregado de dados/Auditor de privacidade

Pode:

- consultar inventário de tratamento;
- acompanhar solicitações dos titulares;
- consultar trilhas de auditoria;
- conduzir investigação de incidente;
- gerar evidências de conformidade.

O acesso ao conteúdo clínico não será automático. Quando indispensável, utilizará acesso excepcional justificado.

### Suporte técnico da plataforma

Pode:

- consultar saúde dos serviços, identificadores técnicos e logs minimizados;
- administrar configurações da plataforma;
- auxiliar na recuperação de conta mediante procedimento controlado.

Não pode:

- visualizar prontuário, CPF completo, mídia ou notas clínicas;
- assumir a identidade do usuário sem autorização e auditoria;
- executar consultas diretas irrestritas no banco de produção.

### Administrador da plataforma

Pode:

- criar e suspender tenants;
- configurar planos e limites;
- administrar infraestrutura e chaves por procedimento controlado.

Não pode:

- ter uma tela de “ver todos os pacientes”;
- acessar conteúdo clínico como rotina;
- entrar em chamadas.

### Matriz resumida

| Recurso | Paciente | Médico responsável | Recepção | Financeiro | Admin clínica | Diretor médico | Suporte |
|---|---:|---:|---:|---:|---:|---:|---:|
| Própria agenda | Sim | Sim | Sim | Metadados | Sim | Sim | Não |
| Agenda da clínica | Não | Não por padrão | Sim | Metadados | Sim | Sim | Não |
| Dados cadastrais completos | Próprios | Vinculados | Parcial | Parcial | Parcial | Conforme finalidade | Não |
| Prontuário | Próprio, por solicitação/portal | Sim | Não | Não | Não | Sim, auditado | Não |
| Cobrança | Própria | Status | Status | Sim | Sim | Status | Não |
| Iniciar videochamada | Não | Sim | Não | Não | Não | Se vinculado | Não |
| Entrar na chamada | Própria | Se vinculado | Não | Não | Não | Se vinculado | Não |
| Auditoria | Não | Própria atividade | Não | Financeira | Administrativa | Clínica | Técnica minimizada |

## 5. Ciclo de vida da videochamada

### O que significa “criar a sala próximo ao horário”

O agendamento e o identificador interno da futura sessão podem existir com antecedência. O que não deve existir antecipadamente é um token válido que permita conexão ao LiveKit.

Na versão atual, “criar sala” grava um registro interno com `RoomName`; isso não deve, por si só, autorizar ninguém a entrar.

A proposta é:

1. A consulta é agendada normalmente.
2. O paciente recebe um link para a página de espera do MedSync.
3. Antes da janela permitida, a página apenas mostra data e instruções.
4. Dentro da janela, a página valida identidade, consentimento e pagamento.
5. O teste de câmera e microfone é local, sem conectar ao LiveKit.
6. O paciente aguarda sem consumir minuto do LiveKit.
7. O médico autenticado clica em **Iniciar consulta**.
8. O backend muda a sessão para `Ready` ou `InProgress`.
9. Médico e paciente solicitam tokens individuais e curtos.
10. Somente nesse momento os clientes conectam ao LiveKit.

Essa regra reduz conexões antecipadas, chamadas abandonadas e consumo por no-show. Ela não altera o preço unitário do LiveKit.

### Janelas propostas

Os valores deverão ser configuráveis por clínica:

- página de espera disponível: até 24 horas antes;
- paciente pode concluir pré-check-in: 15 minutos antes;
- médico pode iniciar: 15 minutos antes;
- tolerância de atraso: 15 minutos;
- duração padrão: 60 minutos;
- tolerância após o fim: 15 minutos;
- reconexão após queda: 5 minutos;
- participante sozinho durante chamada ativa: máximo de 10 minutos.

### Estados da consulta

```text
Scheduled
   |
   v
CheckInOpen
   |
   +--> Cancelled
   +--> NoShow
   |
   v
Ready
   |
   v
InProgress
   |
   +--> Reconnecting
   |
   v
Completed
```

Transições serão feitas no backend. O frontend nunca poderá decidir sozinho que uma consulta está autorizada.

### Encerrar participantes ociosos

“Ocioso” não significa ausência de fala ou movimento, pois isso poderia encerrar uma consulta válida. Serão usados eventos objetivos:

- consulta ainda não iniciada pelo médico;
- participante sozinho além do limite configurado;
- ausência de heartbeat da aplicação;
- token expirado;
- consulta cancelada;
- médico encerrou explicitamente;
- duração máxima ultrapassada;
- usuário autenticado perdeu o vínculo ou foi bloqueado.

Implementação:

1. Receber webhooks de participante conectado e desconectado.
2. Manter `LastActivityAt`, quantidade de participantes e estado da sessão.
3. Executar job periódico para identificar sessões expiradas.
4. Usar as APIs administrativas do LiveKit para remover participante ou encerrar sala.
5. Registrar o motivo em `AuditEvent`.
6. Permitir extensão somente pelo médico responsável, dentro de limite configurado.

### Regras de token

- Token individual e não compartilhável.
- Identidade derivada do usuário autenticado, nunca recebida livremente da query string.
- Sala derivada da consulta autorizada, nunca informada livremente pelo cliente.
- TTL sugerido de 10 a 15 minutos para entrada.
- Nova emissão permitida para reconexão enquanto a consulta estiver ativa.
- Grants mínimos por perfil.
- Revogação lógica ao cancelar ou encerrar a consulta.
- Nome da sala aleatório, sem nome do paciente, médico, CPF ou especialidade.

### Privacidade da mídia

- Nenhuma gravação, egress ou transcrição por padrão.
- E2EE habilitado para áudio, vídeo e canal de dados.
- Chave distribuída somente aos participantes autorizados.
- Sem analytics de terceiros na rota da chamada.
- `Referrer-Policy: no-referrer`.
- Logs sem URLs completas ou tokens.
- Dispositivos devem ser liberados após sair da sala.

### Responsividade da sala

- A área completa da chamada deverá ocupar no máximo `100dvh`.
- No desktop, cabeçalho, vídeos e controles deverão permanecer visíveis sem zoom e sem rolagem da página.
- O grid de participantes deverá diminuir dentro do espaço disponível, sem aumentar a altura da página.
- Quando os dados da consulta não couberem, somente o painel lateral poderá ter rolagem vertical.
- Em telas menores, a seção de vídeo ocupará uma viewport e os dados administrativos poderão aparecer abaixo ou em painel recolhível.
- A barra de controles deverá permanecer utilizável sem encobrir os vídeos.
- A abertura do chat, compartilhamento de tela e alteração da quantidade de participantes não poderá provocar overflow da página.
- Serão homologadas, no mínimo, as larguras de 360, 768, 1024, 1366, 1440 e 1920 pixels, com zoom do navegador em 100%.

## 6. Estratégia de pagamentos

### O que é checkout hospedado

O MedSync cria uma cobrança por API e redireciona o paciente para uma página mantida pelo provedor. O paciente informa cartão, Pix ou boleto no ambiente do provedor e retorna ao MedSync.

O MedSync não deverá receber, transmitir ou armazenar número completo do cartão ou CVV.

Exemplos:

- [Mercado Pago Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview): opção inicial recomendada para avaliar no Brasil, com Pix, boleto e cartão em página redirecionada.
- [Stripe Checkout](https://docs.stripe.com/payments/checkout): alternativa com página hospedada e Checkout Sessions.

A escolha comercial dependerá de tarifa, prazo de recebimento, estorno, split, antifraude, suporte, contrato e disponibilidade para o modelo de clínicas.

### Decisão inicial proposta

- Implementar uma interface `IPaymentProvider`.
- Iniciar com apenas um provedor homologado.
- Preferir que cada clínica seja a recebedora em sua própria conta.
- O MedSync orquestrará a cobrança e armazenará apenas identificadores e status.
- Não implementar carteira, saldo interno ou repasse manual na primeira versão.
- Não implementar split sem análise jurídica, fiscal e contratual específica.

### Fluxo

1. A clínica agenda a consulta e define o valor.
2. O backend cria `Payment` como `Pending`.
3. O backend cria a sessão/preferência no provedor.
4. O paciente é redirecionado ao checkout hospedado.
5. O provedor processa o pagamento.
6. O provedor envia webhook assinado.
7. O backend verifica assinatura e idempotência.
8. O backend consulta o provedor quando necessário e atualiza o estado.
9. A página de retorno apenas informa o resultado; ela não é fonte de verdade.
10. A regra da clínica decide se pagamento aprovado é obrigatório para liberar o check-in.

### Estados de pagamento

```text
Pending
Processing
Paid
Failed
Cancelled
RefundPending
Refunded
Chargeback
```

### Dados permitidos no pagamento

- ID opaco da clínica.
- ID opaco da consulta.
- ID do paciente no provedor, se necessário.
- Valor, moeda e vencimento.
- Status e identificadores do provedor.
- Bandeira e últimos quatro dígitos somente se retornados e necessários.

Não enviar:

- diagnóstico;
- observação clínica;
- prontuário;
- especialidade sensível;
- CPF em metadados livres;
- descrição que exponha condição de saúde.

### Requisitos técnicos

- Webhook com verificação criptográfica.
- Idempotency key em criação, estorno e processamento de webhook.
- Segredos por ambiente e por clínica, quando aplicável.
- Criptografia dos tokens do provedor.
- Reconciliação periódica.
- Política de estorno e cancelamento configurável.
- Auditoria de todas as ações financeiras.
- Ambiente sandbox separado.
- Testes de pagamento aprovado, recusado, pendente, duplicado, estornado e chargeback.
- Validação do escopo aplicável do PCI DSS 4.0.1 com o provedor/adquirente.

## 7. SRES, consentimento e registros clínicos

### Consentimento de telemedicina

Antes do primeiro acesso à chamada, o backoffice deverá registrar:

- versão do termo;
- texto ou hash verificável do documento;
- titular ou responsável legal;
- data e hora;
- origem do aceite;
- usuário autenticado;
- IP e user agent como evidência proporcional;
- possibilidade de recusa e alternativa presencial;
- autorização para transmissão de áudio, vídeo e dados;
- revogação, quando aplicável.

Aceitar o termo da telemedicina não substitui a definição das bases legais da LGPD para cada tratamento.

### Registro clínico

O SRES deverá oferecer:

- autoria de cada registro;
- data e hora confiáveis;
- histórico de versões;
- correção por adendo;
- integridade e não repúdio;
- assinatura quando exigida;
- impressão e exportação;
- interoperabilidade planejada;
- controle de acesso;
- trilha de auditoria;
- retenção legal;
- backup e restauração.

O vídeo não será armazenado. O médico registrará no prontuário a avaliação, os dados clínicos relevantes e a conduta adotada.

## 8. Auditoria

Eventos mínimos:

- login, logout, falhas e MFA;
- criação, alteração e cancelamento de agendamento;
- leitura e alteração de cadastro sensível;
- acesso ao prontuário;
- criação e assinatura de registro clínico;
- aceite ou revogação de consentimento;
- emissão de token de vídeo;
- entrada, saída, remoção e encerramento;
- acesso excepcional;
- criação, confirmação, estorno e chargeback;
- alteração de perfil ou permissão;
- exportação de dados;
- solicitação de titular;
- ação administrativa.

Cada evento deverá conter:

- identificador;
- data/hora UTC;
- clínica;
- ator;
- perfil e contexto;
- ação;
- recurso;
- resultado;
- motivo ou justificativa quando exigido;
- correlação da requisição;
- IP e dispositivo quando proporcionais.

Os eventos não deverão armazenar prontuário, token, senha, número de cartão ou conteúdo da chamada.

## 9. Segurança

### Aplicação

- Cookies `Secure`, `HttpOnly` e `SameSite`.
- Access token curto e refresh token rotativo.
- MFA obrigatório para profissionais.
- política de senha e proteção contra credential stuffing;
- rate limiting;
- CSRF quando aplicável;
- CSP restritiva;
- validação de entrada;
- headers de segurança;
- dependências monitoradas;
- secrets manager;
- rotação de chaves;
- Swagger desabilitado em produção;
- mensagens de erro sem dados internos.

### Dados

- TLS em todas as conexões.
- Banco, cache e backups criptografados.
- Chaves separadas dos dados.
- CPF mascarado e, quando necessário, proteção adicional em nível de aplicação.
- Cache sem conteúdo clínico.
- Dados de desenvolvimento sintéticos.
- Proibição de cópia de produção para desenvolvimento.

### Infraestrutura

- Ambientes de desenvolvimento, homologação e produção separados.
- Menor privilégio para contas de serviço.
- banco sem acesso público;
- allowlist e rede privada quando disponível;
- WAF/rate limit na borda;
- logs centralizados e alertas;
- backups automáticos;
- restauração testada;
- plano de continuidade e recuperação.

## 10. Privacidade e governança

Entregáveis:

- inventário das operações de tratamento;
- matriz de bases legais;
- Relatório de Impacto à Proteção de Dados Pessoais;
- aviso de privacidade;
- termos de uso;
- termo de telemedicina;
- política de retenção e descarte;
- política de controle de acesso;
- política de segurança;
- plano de resposta a incidentes;
- procedimento de direitos dos titulares;
- contratos controlador-operador;
- avaliação de fornecedores e subprocessadores;
- mecanismo para transferência internacional;
- designação formal do encarregado ou decisão documentada aplicável;
- registro e diretor técnico médico conforme enquadramento validado.

## 11. Plano de execução

### Fase 0 — decisões e responsáveis

Responsáveis: Produto, Arquitetura, Jurídico/Privacidade e Diretor Técnico.

- [ ] Confirmar modelo de negócio: software para clínica ou intermediador de atendimento.
- [ ] Definir quem será controlador e operador em cada fluxo.
- [ ] Confirmar sede, registro no CRM e diretor técnico.
- [ ] Escolher provedor de pagamento para prova de conceito.
- [ ] Levantar custo atual e projetado do LiveKit.
- [ ] Definir duração, tolerância, no-show e política de cancelamento.
- [ ] Definir política de retenção por categoria.
- [ ] Aprovar papéis e matriz de acesso deste documento.

Saída: decisões registradas e responsáveis nomeados.

### Fase 1 — fundação multi-clínica e identidade

- [x] Criar `Clinic` e `ClinicMembership`.
- [x] Associar médicos, pacientes, consultas e usuários a uma clínica.
- [x] Implementar políticas de autorização no backend.
- [x] Substituir listagens globais por consultas escopadas.
- [x] Criar DTOs específicos por perfil.
- [x] Mascarar CPF e reduzir dados nas telas.
- [x] Migrar autenticação para cookies seguros.
- [ ] Implementar refresh rotativo, revogação e MFA.
- [x] Adicionar rate limit e eventos de autenticação.
- [x] Criar testes de isolamento entre tenants.

Critério de saída: nenhum perfil acessa recurso de outra clínica ou fora de sua finalidade.

### Fase 2 — auditoria e governança de dados

- [x] Criar `AuditEvent` append-only.
- [x] Instrumentar acessos e alterações sensíveis.
- [x] Criar tela de auditoria por perfis autorizados.
- [ ] Implementar justificativa para acesso excepcional.
- [x] Remover PII do cache e dos logs.
- [ ] Criar inventário de dados e matriz de bases legais.
- [ ] Implementar canal e workflow de direitos dos titulares.
- [ ] Criar políticas e plano de incidente.

Critério de saída: ações críticas são rastreáveis sem expor conteúdo sensível nos logs.

### Fase 3 — SRES e consentimento

- [x] Criar `ConsentRecord` versionado.
- [x] Bloquear chamada sem consentimento válido.
- [x] Criar registro clínico com autoria e histórico.
- [ ] Implementar adendos, assinatura, impressão e exportação.
- [ ] Implementar controles e evidências compatíveis com NGS2.
- [ ] Definir retenção, backup e restauração.
- [ ] Validar fluxo com diretor técnico e jurídico.

Critério de saída: atendimento remoto gera registro íntegro, acessível e auditável no SRES.

### Fase 4 — novo ciclo de vídeo

- [ ] Criar `IVideoProvider`.
- [ ] Implementar adaptador LiveKit.
- [x] Criar pre-check-in sem conexão ao LiveKit.
- [x] Implementar estados da consulta.
- [x] Restringir início ao médico responsável.
- [x] Gerar tokens no backend com grants mínimos.
- [x] Reduzir TTL e permitir reconexão controlada.
- [x] Implementar E2EE e distribuição de chaves.
- [ ] Receber e validar webhooks.
- [x] Implementar job de expiração.
- [x] Encerrar sala e participantes pelos critérios definidos.
- [ ] Garantir que egress/gravação/transcrição estejam desabilitados.
- [x] Corrigir o layout para ocupar a viewport sem zoom ou scroll no desktop.
- [ ] Testar vídeos, chat, compartilhamento e painel lateral nas resoluções homologadas.
- [ ] Medir minutos por clínica e consulta.

Critério de saída: uma pessoa sem vínculo, fora da janela ou com link encaminhado não entra na chamada.

### Fase 5 — pagamentos

- [x] Criar `IPaymentProvider`.
- [x] Implementar sessão/preferência de checkout no backend.
- [x] Criar estados e persistência de `Payment`.
- [x] Implementar retorno de sucesso, falha e pendência.
- [x] Implementar webhook assinado e idempotente.
- [ ] Implementar conciliação.
- [ ] Implementar estorno conforme permissão.
- [x] Não armazenar PAN ou CVV.
- [ ] Criar relatórios financeiros sem dados clínicos.
- [ ] Testar sandbox e validar PCI com o adquirente/provedor.

Critério de saída: a confirmação vem do webhook/consulta ao provedor, nunca da URL de retorno.

### Fase 6 — infraestrutura e resiliência

- [ ] Separar ambientes e segredos.
- [ ] Restringir banco e Redis à rede privada.
- [ ] Usar TLS também no Redis.
- [ ] Configurar backups criptografados.
- [ ] Executar e documentar teste de restauração.
- [ ] Configurar alertas de erro, segurança e custo.
- [ ] Criar runbooks de indisponibilidade do LiveKit, pagamento e banco.
- [x] Remover seed, Swagger e configurações de desenvolvimento da produção.

Critério de saída: restauração e resposta a falhas foram exercitadas, não apenas configuradas.

### Fase 7 — homologação

- [ ] Revisão de arquitetura e threat model.
- [ ] SAST, análise de dependências e secrets scan.
- [ ] DAST e pentest.
- [x] Teste de autorização horizontal e vertical.
- [x] Teste de isolamento entre clínicas.
- [x] Teste de consentimento e prontuário.
- [ ] Teste de pagamento e webhooks duplicados.
- [ ] Teste de no-show, expiração e reconexão.
- [ ] Teste responsivo da sala com zoom em 100%, chat aberto e compartilhamento de tela.
- [ ] Teste de incidente e restauração.
- [ ] Revisão de acessibilidade.
- [ ] Aprovação do diretor técnico.
- [ ] Aprovação de privacidade/jurídico.
- [ ] Aceite formal dos riscos residuais.

Critério de saída: todos os bloqueadores P0 foram encerrados e as aprovações foram registradas.

### Fase 8 — lançamento controlado

- [ ] Piloto com uma clínica e poucos médicos.
- [ ] Limites de uso e orçamento do LiveKit.
- [ ] Monitoramento diário de segurança, falhas e custos.
- [ ] Canal de suporte e escalonamento.
- [ ] Revisão após as primeiras consultas.
- [ ] Expansão gradual por clínica.

## 12. Critérios de “go/no-go” para produção

A produção com pacientes reais somente será autorizada se:

- [x] isolamento entre clínicas estiver comprovado;
- [x] médico e paciente acessarem somente consultas vinculadas;
- [x] recepção, financeiro e administradores não acessarem prontuário;
- [x] consentimento estiver versionado e registrado;
- [ ] SRES e controles NGS2 estiverem validados;
- [ ] nenhuma mídia for gravada;
- [ ] E2EE estiver habilitado e testado;
- [x] tokens de vídeo forem curtos e contextuais;
- [ ] sala, vídeos e controles couberem na viewport homologada sem exigir zoom;
- [x] logs e auditoria não contiverem segredos ou conteúdo clínico;
- [x] checkout não expuser cartão ao MedSync;
- [x] webhooks forem verificados e idempotentes;
- [ ] backups e restauração tiverem evidência;
- [ ] resposta a incidentes estiver aprovada;
- [ ] contratos e transferências internacionais estiverem regularizados;
- [ ] pentest não possuir achado crítico ou alto sem mitigação aprovada;
- [ ] diretor técnico, privacidade e jurídico tiverem aprovado a operação.

## 13. Métricas pós-lançamento

### Segurança e privacidade

- acessos negados por autorização;
- tentativas de acesso entre clínicas;
- falhas e desafios de MFA;
- acessos excepcionais;
- incidentes e tempo de resposta;
- solicitações de titulares e prazo de atendimento.

### Videochamada

- minutos por participante e por clínica;
- tempo conectado antes do início;
- consultas com no-show;
- participantes removidos por expiração;
- falhas de conexão e reconexão;
- duração média e p95;
- custo médio por consulta.

### Pagamentos

- aprovação, recusa e pendência;
- webhooks duplicados;
- divergências de conciliação;
- estornos e chargebacks;
- custo médio por pagamento.

### Produto

- consultas agendadas, iniciadas e concluídas;
- tempo médio de check-in;
- falhas por etapa;
- tickets de suporte por consulta.

## 14. Referências regulatórias e técnicas

- [Lei nº 13.709/2018 — LGPD, texto atualizado](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.pdf)
- [Lei nº 14.510/2022 — Telessaúde](https://www2.camara.leg.br/legin/fed/lei/2022/lei-14510-27-dezembro-2022-793576-publicacaooriginal-166678-pl.html)
- [Lei nº 13.787/2018 — Prontuário de paciente](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13787-27-dezembro-2018-787543-publicacaooriginal-157119-pl.html)
- [Resolução CFM nº 2.314/2022 — Telemedicina](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf)
- [Resolução ANPD nº 15/2024 — Comunicação de incidentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [Resolução ANPD nº 18/2024 — Encarregado](https://www.in.gov.br/en/web/dou/-/resolucao-cd/anpd-n-18-de-16-de-julho-de-2024-572632074)
- [Resolução ANPD nº 19/2024 — Transferência internacional](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [LiveKit — estimativa de cobrança de vídeo](https://kb.livekit.io/articles/3947254704-understanding-livekit-cloud-pricing)
- [LiveKit — criptografia ponta a ponta](https://docs.livekit.io/transport/encryption/)
- [Mercado Pago Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [PCI DSS 4.0.1](https://www.pcisecuritystandards.org/pt/document_library/)

## 15. Definição de pronto

Uma funcionalidade deste plano somente estará pronta quando:

- código e migrations estiverem revisados;
- testes unitários, integração e autorização estiverem aprovados;
- eventos de auditoria estiverem definidos;
- documentação operacional estiver atualizada;
- observabilidade e alertas estiverem configurados;
- impacto de privacidade tiver sido revisado;
- rollback estiver previsto;
- evidências da homologação estiverem anexadas à entrega.
