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
| ADM da clínica | Painel · Meus dados · Consultas · Pacientes · Médicos · Equipe e acessos · Auditoria (da clínica) · Ajuda |
| Médico ADM MedSync | Painel · Meus dados · Clínicas · Equipe MedSync · Ajuda (fila) |
| Suporte | Painel · Meus dados · Clínicas · Ajuda (fila) |
| DPO MedSync | Painel · Meus dados · Auditoria (todas as clínicas) · Ajuda · Privacidade (fila) |

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
| `/consultas` (Agenda) | Médico (só médico) | **Adicionar horário** | Abre em "Dia" (hoje); "Semana" mostra a grade com horários de atendimento. Por consulta: Prontuário, Iniciar/Entrar na sala (botão escuro, não primário), **Concluir** (sala aberta, dentro ou depois do horário; mesma janela da sala), Cancelar. Canceladas saem do dia ("Mostrar canceladas"). Desfechos: "Não realizada" (ninguém abriu a sala), "Paciente não entrou", "Sala expirada", "Não compareceu" (registrado pelo médico). Quem é médico e ADM ao mesmo tempo usa a lista da clínica |
| `/consultas/nova` | Paciente / ADM da clínica | **Solicitar** / **Confirmar agendamento** | exige clínica ativa |
| `/ajuda` (paciente) | Paciente | **Enviar para o suporte** ou **Enviar pedido sobre meus dados** (abas) | Pedido LGPD vai para a fila do DPO; "Minhas solicitações" junta os dois tipos |
| `/ajuda` | Todos menos Suporte e paciente | Suporte e Médico ADM veem a fila de todas as clínicas; o Suporte não tem o formulário (não abre pedido para si) |
| `/privacidade` | DPO (paciente é redirecionado para `/ajuda?tipo=lgpd`) | **Registrar solicitação** | o DPO registra pedidos recebidos por outros canais e atualiza a fila |
| Sala `/sala/{id}` | Médico | **Encerrar consulta** → janela MedSync "Consulta realizada — concluir" / "Paciente não compareceu" (só se o médico entrou e o paciente não) → prontuário | "Sair da sala" sai sem encerrar; o "Leave" do LiveKit fica escondido. Paciente: "Consulta encerrada pelo médico" ou "Voltar para a sala" se a conexão cair |
| `/prontuario/{id}` | Médico | **Salvar prontuário** | Seção Receita: "Nova receita", "Renovar uso contínuo", por linha "Ver e imprimir" / "Editar" / excluir rascunho |
| `/assinatura/simulador` | Médico (só com `SIGNATURE_PROVIDER=simulator`) | **Aprovar (simulação)** | "Recusar" volta sem assinar; a tela diz que não é o VIDaaS |
| `/patients` (Pacientes vinculados) | Médico (só médico) | nenhuma (leitura) | Por paciente: "Abrir prontuário" da próxima ou da última consulta |
| `/doctors` (Meu perfil) | Médico (só médico) | **Salvar** | "Pronto para receitas" é leitura; correção de CRM/especialidade vai pela Ajuda |
| `/receita/{id}` | Médico (rascunho e assinada), paciente (só assinada) | Rascunho: **Assinar com certificado digital** (desabilitado com o motivo quando falta dado ou integração) · Assinada: **Baixar PDF assinado** | Secundárias: "Imprimir rascunho"; "Enviar pelo WhatsApp" só para o médico, com a receita assinada. Rascunho sai com a marca "sem validade" |
| `/clinicas` | Suporte, Médico ADM | **Cadastrar clínica** (onboarding assistido) | só o Médico ADM ativa/suspende e define plano, por linha |
| `/acessos` | ADM da clínica, Médico ADM | **Novo acesso** | ADM cria ADM da clínica; Médico ADM cria Médico ADM/Suporte/DPO; ninguém desabilita o próprio acesso |

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
