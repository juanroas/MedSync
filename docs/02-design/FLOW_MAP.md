# MedSync — mapa de fluxo e ações

Fonte da verdade para "qual tela existe, para quem, e qual é a única ação principal dela".
Regras que este mapa aplica: [`.agents/rules/ui-actions-and-flow.md`](../../.agents/rules/ui-actions-and-flow.md).
Referência que inspirou a organização: [`REFERENCE_PULSECHECK_FLOW.md`](REFERENCE_PULSECHECK_FLOW.md).

Qualquer PR que adicione tela, item de menu ou botão que navega **atualiza este arquivo no mesmo PR**.

> Este mapa descreve o código **atual**. O alvo (6 perfis, sem módulo empresa) está no ADR-0003 e é construído na
> ordem de [`SCREEN_REBUILD_PLAN.md`](SCREEN_REBUILD_PLAN.md); cada tela reconstruída atualiza este arquivo.

## 1. Funil público (visitante → conta)

```
/            Landing ─── header: [Sobre] [Entrar]   hero: [Começar agora → /login]
/sobre       Sobre ────── header: [Início] [Entrar]  sem botões no corpo
/login       Entrar ───── [Continuar com Google (em breve, desabilitado)] [Entrar]  link: "Criar conta" → /cadastro
/cadastro    Criar conta ─ [Criar conta]  link: "Voltar ao login"
                  │
                  └── cria sessão na hora → /dashboard (CNPJ pendente → banner com "Falar com o suporte")
```

- O cadastro **não** aparece na landing nem no `/sobre`: a porta é sempre `/login → Criar conta`.
- Rodapé público = mapa do site (Sobre/Inicio + Entrar); não conta como CTA.
- Verificado com `apps/web/scripts/audit-actions.mjs`: acima da dobra da landing há 3 ações (antes eram 6 com 3 destinos).

## 2. Guardas (não são botões)

| Condição | Para onde vai | Onde está |
|---|---|---|
| Sem sessão em rota da plataforma | `/login` | `components/app-shell.tsx` (`api.me()` falha) |
| `mustChangePassword` | `/alterar-senha` | `app-shell.tsx`, `login/page.tsx` |
| Clínica em análise (`clinicActivationStatus` ≠ Active) | `/dashboard` do ADM da clínica com banner + CTA "Falar com o suporte" → `/ajuda?subject=…`; "Nova consulta" some | `ClinicPendingBanner` em `dashboard/page.tsx` |

## 3. Menu por perfil (menu = lugares, nunca ações)

| Perfil | Itens do menu |
|---|---|
| Paciente | Painel · Minhas consultas · Meu cadastro · Ajuda (inclui "Pedido sobre meus dados") |
| Médico | Painel · Agenda · Pacientes vinculados · Meu perfil · Ajuda |
| ADM da clínica | Painel · Meus dados · Consultas · Pacientes · Médicos · Dados da clínica · Equipe e acessos · Auditoria (da clínica) · Ajuda |
| Médico ADM MedSync | Painel · Meus dados · Clínicas · Equipe MedSync · Acessos ao prontuário · Ajuda (fila) |
| Suporte | Painel · Meus dados · Clínicas · Ajuda (fila) |
| DPO MedSync | Painel · Meus dados · Auditoria (todas as clínicas) · Acessos ao prontuário · Ajuda · Privacidade (fila) |

Os seis perfis são os do ADR-0003. A equipe MedSync (Médico ADM, Suporte, DPO) mora na clínica plataforma
"MedSync Operação" e enxerga as filas de todas as clínicas.

Definição única em `navigation` + `navigationLabel()` de `components/app-shell.tsx`. O menu não tem mais
o bloco fixo "Nova consulta" — a ação vive no header de `/consultas` e no Painel de quem agenda.

## 4. Tela → ação principal (uma por tela/estado)

| Tela | Quem | Ação principal (header ou formulário) | Observação |
|---|---|---|---|
| `/dashboard` Paciente | Paciente | Cartão "Próximo atendimento": Solicitar consulta → vira Acompanhar status / Entrar na sala | o vazio da lista só explica em texto |
| `/dashboard` Central de operação | ADM da clínica | **Nova consulta** (some enquanto a clínica está em análise) | "Ver auditoria" só para quem tem Auditoria no menu |
| `/dashboard` Médico | Médico | **Entrar na sala** no cartão "Próxima consulta", só com a janela aberta (15 min antes) | "Ver prontuário" e "Ver agenda" são links secundários; a agenda de hoje não tem botão por linha |
| `/dashboard` demais perfis | Médico ADM (clínicas em análise), Suporte (pedidos abertos), DPO | nenhuma (leitura) | links "Ver todas/Ver agenda" dentro de painéis são permitidos |
| `/consultas` | Paciente / quem agenda | **Solicitar consulta** / **Agendar consulta** | vazio sem botão (o header já tem) |
| `/consultas` (Agenda) | Médico (só médico) | **Horários de atendimento** (link para `/consultas/horarios`) | Abre em "Dia" (hoje); "Semana" mostra a grade com as faixas (online/presencial) e folgas; "Mês" mostra o mês inteiro com o total de consultas por dia, e clicar no dia abre "Dia". Por consulta: Prontuário, Iniciar/Entrar na sala (botão escuro, não primário), **Concluir** (sala aberta, dentro ou depois do horário; mesma janela da sala), Cancelar. Canceladas saem do dia ("Mostrar canceladas"). Desfechos: "Não realizada" (ninguém abriu a sala), "Paciente não entrou", "Sala expirada", "Não compareceu" (registrado pelo médico). Quem é médico e ADM ao mesmo tempo usa a lista da clínica |
| `/consultas/horarios` | Médico | **Salvar regras** (duração da consulta e até quando o paciente marca: 7 a 180 dias, padrão 90) | Semana-padrão: "Adicionar faixa" por dia (início, fim, online/presencial/os dois) e remover faixa; "Bloquear datas" para folgas. "Voltar para a agenda" no header. Outros perfis veem aviso, sem entrada no menu |
| `/consultas/nova` | Paciente / ADM da clínica | **Solicitar** / **Confirmar agendamento** | exige clínica ativa. Paciente escolhe **Online** ou **Presencial** (só o que algum médico da especialidade oferece); o cartão do médico mostra CRM e, no presencial, clínica + endereço + "Ver no mapa"; calendário e horários filtram pela modalidade. Presencial não tem sala de vídeo nem termo de telemedicina: o médico conclui pela agenda a partir do horário marcado. **ADM da clínica (recepção)**: busca o paciente por CPF completo ou nome ("Cadastrar pessoa" leva a `/patients?novo=1` e volta com ele selecionado), escolhe médico e modalidade (presencial por padrão), dia e horário livre, ou "Encaixe em outro horário"; ao lado, "Hoje na clínica" |
| `/ajuda` (paciente) | Paciente | **Enviar para o suporte** ou **Enviar pedido sobre meus dados** (abas) | Pedido LGPD vai para a fila do DPO; "Minhas solicitações" junta os dois tipos |
| `/ajuda` | Todos menos Suporte e paciente | Suporte e Médico ADM veem a fila de todas as clínicas; o Suporte não tem o formulário (não abre pedido para si) |
| `/privacidade` | DPO (paciente é redirecionado para `/ajuda?tipo=lgpd`) | **Registrar solicitação** | o DPO registra pedidos recebidos por outros canais e atualiza a fila |
| Sala `/sala/{id}` | Médico | **Encerrar consulta** → janela MedSync "Consulta realizada — concluir" / "Paciente não compareceu" (só se o médico entrou e o paciente não) → prontuário | "Sair da sala" sai sem encerrar; o "Leave" do LiveKit fica escondido. Paciente: "Consulta encerrada pelo médico" ou "Voltar para a sala" se a conexão cair |
| `/prontuario/{id}` | Médico | **Salvar prontuário** | Seção Receita: "Nova receita", "Renovar uso contínuo", por linha "Ver e imprimir" / "Editar" / excluir rascunho |
| `/assinatura/simulador` | Médico (só com `SIGNATURE_PROVIDER=simulator`) | **Aprovar (simulação)** | "Recusar" volta sem assinar; a tela diz que não é o VIDaaS |
| `/patients` (Pacientes vinculados) | Médico (só médico) | nenhuma (leitura) | Por paciente: "Abrir prontuário" da próxima ou da última consulta |
| `/doctors` (Meu perfil) | Médico (só médico) | **Salvar** | "Pronto para receitas" é leitura; correção de CRM/especialidade vai pela Ajuda |
| `/receita/{id}` | Médico (rascunho e assinada), paciente (só assinada) | Rascunho: **Assinar com certificado digital** (desabilitado com o motivo quando falta dado ou integração) · Assinada: **Baixar PDF assinado** | Secundárias: "Imprimir rascunho"; "Enviar pelo WhatsApp" só para o médico, com a receita assinada. Rascunho sai com a marca "sem validade". Antimicrobiano e Controle especial saem no modelo "Receita de Controle Especial" em 2 vias (1ª farmácia, 2ª paciente), com emitente, dados do paciente (mãe, nascimento, sexo, endereço) e quadros de comprador/fornecedor em branco; Regra D6: controle especial e (depois de 29/10/2026) antimicrobiano não assinam eletronicamente sem SNCR; em consulta **presencial** o rascunho tem **Imprimir para assinar à mão** (vira a ação principal quando a assinatura digital está bloqueada), que fecha a receita ("Em papel") e imprime sem marca de rascunho |
| `/clinicas` | Suporte, Médico ADM | **Cadastrar clínica** (onboarding assistido) | só o Médico ADM ativa/suspende e define plano, por linha |
| `/patients` (Pacientes) | ADM da clínica | **Novo paciente** | Cadastro de pessoa física: nome, nome social, CPF, nascimento, sexo, nome da mãe (ou "Não declarado"), contato, endereço com busca de CEP. Abre direto com `?novo=1` (vindo do agendamento da recepção) |
| `/clinica` (Dados da clínica) | ADM da clínica | **Salvar dados** | Nome fantasia, telefone, endereço de atendimento e responsável técnico; razão social e CNPJ só leitura (correção pela Ajuda) |
| `/cadastro` | visitante | **Criar conta** | Clínica informa razão social, nome fantasia, CNPJ, telefone, **endereço de atendimento** (obrigatório) e responsável técnico (opcional) |
| `/acessos-prontuario` | Médico ADM (DPO só leitura) | **Solicitar acesso** (só Médico ADM) | Janela: CPF completo → paciente, motivo (lista fechada), finalidade (mín. 30 caracteres), declaração de sigilo → "Abrir prontuário por 30 min" (somente leitura). Por linha ativa: "Abrir prontuário". DPO vê todos os acessos com a finalidade, sem conteúdo clínico. Paciente vê "Quem acessou meu prontuário" em Meu cadastro |
| `/acessos` | ADM da clínica, Médico ADM | **Novo acesso** | ADM cria ADM da clínica; Médico ADM cria Médico ADM/Suporte/DPO; ninguém desabilita o próprio acesso |

Clínica sem endereço de atendimento (comum em clínica cadastrada pelo Suporte): presencial não chega ao paciente e a API
recusa marcar presencial. Todos são avisados: o médico em Horários de atendimento (se tiver faixa presencial), o ADM no
Painel ("Cadastrar endereço" → `/clinica`) e na recepção (Presencial desabilitado), o paciente em Solicitar consulta
("Atendimento presencial ainda indisponível"). O Médico ADM vê endereço e responsável técnico em `/clinicas` antes de ativar.

Revisão de usabilidade antes de liberar: `apps/web/scripts/walkthrough.mjs` percorre os 6 perfis, tira foto de cada passo e
lista erros de console e respostas de erro da API.

Confirmações usam a janela do MedSync (`components/dialog.tsx`, `useConfirm`), nunca o `confirm()` do navegador.

## 5. Pendências conhecidas (backlog de fluxo)

1. ~~**Cadastro pede preço e limite do plano**~~ — resolvido na Fase 0 (entrega A): o plano é definido pelo Médico
   ADM na ativação em `/clinicas`.
2. **Home do DPO** (`DpoHome`) ainda é só texto + "Abrir X", repetindo o menu. Médico ADM e Suporte já mostram a
   fila deles (clínicas em análise / pedidos abertos). Proposta: resumo real da fila de privacidade.
3. **Login Google**: botão desabilitado com "Em breve" até existirem credenciais OAuth e o endpoint `/auth/google`.

### Resultado da auditoria logada (23/09/2026)

`audit-actions.mjs --as <perfil>` em 40 telas × 9 perfis (paciente, médico, suporte, empresa admin, admin MedSync,
financeiro MedSync, financeiro empresa, auditor empresa, DPO).

| Versão | Violações | O que era |
|---|---|---|
| Publicada (antes) | 12 R1 + R2 | bloco "Nova consulta/Solicitar consulta" no menu (paciente e suporte, em todas as telas); aba "Ativas" com o mesmo fundo do CTA em `/consultas`; "Salvar elegibilidade" primário em cada linha |
| Local (depois) | **0** | — |

Também corrigido na mesma rodada: o chip do usuário mostrava o papel em inglês ("Patient"), e havia 3 mapas diferentes
de nome de papel; agora existe um só (`ROLE_LABELS` em `lib/types.ts`).

## 6. Como auditar

```bash
cd apps/web
node scripts/audit-actions.mjs --out ../../qa/actions http://localhost:3000/ http://localhost:3000/sobre http://localhost:3000/login
AUDIT_PASSWORD='<senha demo>' node scripts/audit-actions.mjs --as paciente@medsync.dev http://localhost:3000/dashboard http://localhost:3000/consultas
```

Sai com código 2 se encontrar destino duplicado fora de menu/rodapé. Procedimento completo:
[`.agents/skills/medsync-flow-audit/SKILL.md`](../../.agents/skills/medsync-flow-audit/SKILL.md).
