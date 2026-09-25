# Plano de reconstrução tela por tela

Ordem de trabalho para reconstruir o MedSync com os 6 perfis do ADR-0003. Cada tela passa pelo procedimento da skill
[`medsync-screen-rebuild`](../../.agents/skills/medsync-screen-rebuild/SKILL.md) e só é marcada como feita quando o
`audit-actions.mjs` sai com 0 e o `FLOW_MAP.md` foi atualizado.

Critério de ordem: primeiro o que o **médico precisa para fechar uma consulta** (é o que a clínica compra), depois o
paciente, depois a gestão. Base de mercado e regulação: `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md`.

Legenda: ⬜ a fazer · 🟨 em andamento · ✅ feito · ⏸ bloqueado por decisão

## Fase 0 — Base (bloqueia o resto)
| Item | Status | Observação |
|---|---|---|
| Decisões do ADR-0003 | ✅ | Software para médicos e clínicas; módulo empresa removido |
| Commit limpo do trabalho atual | ✅ | `1f799eb`, `d688125` |
| Identidade e ativação da clínica no `Clinic` (entrega A) | ✅ | `f11077b`; tela `/clinicas` |
| Remover módulo empresa (telas, endpoints, perfis, entidades, specs) | ✅ | Entrega C; migração `RemoveCompanyModule` só com os DROP |
| Consolidar `ClinicRole` em 6 perfis + migração + seed | ✅ | Entrega B (`8028003`); migração `ConsolidateRoles` |
| Atualizar `navigation`, `ROLE_LABELS`, `PERMISSION_MATRIX.md`, specs E2E | ✅ | Entregas B e C |
| Escolher e trocar de local de atendimento após o login | ⬜ | Adiado: entra junto com a tela de Vínculos médico ↔ clínica |

## Fase 1 — Público (feito na rodada de 23/09)
| Tela | Status | Falta |
|---|---|---|
| Landing `/` | ✅ | — |
| Sobre `/sobre` | ✅ | — |
| Entrar `/login` | ✅ | Google em breve |
| Criar conta `/cadastro` | 🟨 | Duas portas: **Sou médico** (CRM + UF, cria o consultório) e **Sou clínica** (CNPJ); tirar preço/limite do plano |
| Recuperar senha `/recuperar-senha` | ⬜ | Não existe; todos os concorrentes têm |

## Fase 2 — Médico (fecha a consulta)
| Tela | Status | Ação principal | Paridade / regulação |
|---|---|---|---|
| Início | ✅ | Entrar na próxima consulta | KPIs do dia, cartão "Próxima consulta" (termo do paciente + Entrar na sala quando abre), agenda de hoje |
| Agenda | ✅ | Adicionar horário | Visão Dia (abre em hoje, com Iniciar/Entrar na sala, Prontuário, Cancelar e status do termo) e Semana (grade seg–dom com horários de atendimento e consultas); navegação por semana/dia; "Meus horários de atendimento" com remover |
| Certificado digital (em Meu perfil) | ⬜ | Conectar certificado | Certificado em nuvem gratuito do CFM; **a confirmar a API do PSC (VALID)** antes de construir |
| Atendimento / Prontuário | 🟨 | Finalizar e assinar | Registro assinado ICP-Brasil para dispensar papel (CFM 1.821 arts. 3º–5º); alerta de presencial ≤ 180 dias em crônicos (CFM 2.314 art. 6º §2) |
| Receita | 🟨 | Salvar rascunho → Assinar com certificado digital | Feito: base Anvisa + item próprio, rascunho, renovar uso contínuo, "Medicações em uso", PDF art. 13 gerado no servidor e assinado (PAdES) pelo fluxo IntegraICP, download do PDF assinado, envio pelo WhatsApp do médico. Sessão de assinatura (aprova uma vez, um clique por receita, "Encerrar liberação") e simulador marcado "SIMULAÇÃO — SEM VALIDADE". Falta: **canal da Valid** (liga a assinatura real), e-mail (SMTP Hostinger), "Meus documentos" do paciente |
| Atestado | ⬜ | Emitir e assinar | Exige assinatura qualificada (Lei 14.063 art. 13); entra depois do VIDaaS |
| Pacientes | ✅ | — (leitura) | Só pacientes com consulta com o médico; busca por nome/CPF, filtro "com consulta marcada", próxima e última consulta, "Abrir prontuário" |
| Meu perfil | ✅ | Salvar | Nome, e-mail, telefone, RQE e endereço profissional editáveis; CRM/UF/especialidade como credenciamento (só a administração altera); "Pronto para receitas" com o que falta (art. 13) e o certificado digital "em preparação" |

## Fase 3 — Paciente
| Tela | Status | Ação principal | Paridade / regulação |
|---|---|---|---|
| Início | 🟨 | Solicitar consulta / Entrar na sala | — |
| Minhas consultas | 🟨 | Solicitar consulta | Lembrete de consulta (prioridade 2 de mercado) |
| Sala | ⬜ | Entrar | TCLE antes (art. 15, já existe) |
| Meus documentos | ⬜ | Baixar | Receitas/atestados; cópia do registro (art. 3º §6) |
| Meus dados | 🟨 | Salvar | — |

Pontos levantados pelo usuário em 25/09 (homologação), para esta fase:
1. ✅ **Solicitar consulta (`/consultas/nova`)**: calendário aberto (mês, navegável até 60 dias) que só libera os
   dias com horário livre do médico; o primeiro dia livre já vem selecionado e os horários ficam embaixo. API
   `GET /doctors/{id}/available-days`. Médico sem horários cadastrados segue com data/hora livre. Textos com acento e
   painel "Como funciona" claro.
2. **Ajuda × Privacidade no menu do paciente**: parecem a mesma coisa para o paciente. Proposta: um item só
   ("Ajuda"), com a opção "Pedido sobre meus dados (LGPD)" dentro dele. A LGPD (art. 18 e art. 41) exige canal para o
   titular e um encarregado, não um item de menu próprio; a fila do DPO continua separada da do Suporte por trás.
3. ✅ **Sala do paciente**: quando o médico encerra (sala apagada, motivo `ROOM_DELETED`), o paciente vê "Consulta
   encerrada pelo médico" com "Ver minhas consultas"; se a conexão cair, qualquer participante vê "Voltar para a
   sala". Falta o atalho para os documentos da consulta (entra com "Meus documentos").

## Fase 4 — ADM Clínica
| Tela | Status | Ação principal | Paridade / regulação |
|---|---|---|---|
| Início | ⬜ | — | Ocupação da agenda, consultas do dia, pendência de ativação |
| Agenda da clínica | ⬜ | Agendar consulta | Visão de todos os médicos (padrão iClinic/Feegow) |
| Pacientes | 🟨 | Novo paciente | Sem conteúdo clínico (CEM art. 85) |
| Equipe | 🟨 | Convidar médico | CRM obrigatório por médico |
| Serviços e preços | ⬜ | Salvar tabela | Preço vem da tabela, não digitado a cada consulta |
| Financeiro | ⬜ | — | Recebimentos por período |
| Dados da clínica | ⬜ | Salvar | RT da clínica (nome, CRM) |

## Fase 5 — Médico ADM MedSync
| Tela | Status | Ação principal | Paridade / regulação |
|---|---|---|---|
| Início | ⬜ | — | Pendências: clínicas a ativar, CRMs a verificar |
| Clínicas | 🟨 | Ativar clínica | Tela própria `/clinicas` (Fase 0); falta ficha da clínica e responsável técnico |
| Médicos | ⬜ | Verificar CRM | — |
| Auditoria clínica | ⬜ | Abrir prontuário com justificativa | Regra de acesso do ADR-0003 |

## Fase 6 — Suporte e DPO
| Tela | Status | Ação principal |
|---|---|---|
| Fila de ajuda (Suporte) | ✅ | Atualizar status |
| Clínicas — onboarding assistido (Suporte) | 🟨 | Cadastrar clínica |
| Vínculos médico ↔ clínica (Suporte) | ⬜ | Vincular médico (busca por CRM + UF, clínica por CNPJ) |
| Usuários (Suporte) | ⬜ | Redefinir acesso |
| Solicitações de titular (DPO) | ✅ | Atualizar status |
| Trilha de auditoria (DPO) | 🟨 | Filtrar |
