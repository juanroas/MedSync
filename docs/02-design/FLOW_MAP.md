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
| Empresa com CNPJ pendente | `/dashboard` com banner + CTA "Falar com o suporte" → `/ajuda?subject=…` | `CompanyPortalHome` em `dashboard/page.tsx` |

## 3. Menu por perfil (menu = lugares, nunca ações)

| Perfil | Itens do menu |
|---|---|
| Paciente | Painel · Minhas consultas · Meu cadastro · Ajuda · Privacidade |
| Médico | Painel · Agenda · Pacientes vinculados · Meu perfil · Ajuda |
| Suporte | Painel · Meus dados · Empresas · Elegibilidade · Consultas · Pacientes · Medicos · Ajuda (fila) · Privacidade |
| Empresa (admin) | Painel · Meus dados · Elegibilidade · Relatorios · Equipe e acessos · Ajuda |
| Admin MedSync | Painel · Meus dados · Empresas · Elegibilidade · Relatorios · Equipe e acessos · Ajuda · Privacidade |

Definição única em `navigation` + `navigationLabel()` de `components/app-shell.tsx`. O menu não tem mais
o bloco fixo "Nova consulta" — a ação vive no header de `/consultas` e no Painel de quem agenda.

## 4. Tela → ação principal (uma por tela/estado)

| Tela | Quem | Ação principal (header ou formulário) | Observação |
|---|---|---|---|
| `/dashboard` Paciente | Paciente | Cartão "Próximo atendimento": Solicitar consulta → vira Acompanhar status / Entrar na sala | o vazio da lista só explica em texto |
| `/dashboard` Central de operação | Suporte, Recepção, Clínica | **Nova consulta** | "Ver auditoria" só para quem tem Auditoria no menu |
| `/dashboard` demais perfis | Médico, Empresa, Financeiro, Auditor, DPO | nenhuma (leitura) | links "Ver todas/Ver agenda" dentro de painéis são permitidos |
| `/consultas` | Paciente / quem agenda | **Solicitar consulta** / **Agendar consulta** | vazio sem botão (o header já tem) |
| `/consultas` | Médico | seção "Minha disponibilidade" (Adicionar horário) | lista de consultas é leitura |
| `/consultas/nova` | Paciente / quem agenda | **Solicitar** / **Confirmar agendamento** | preço some se o paciente tem benefício ativo |
| `/ajuda` | Todos | **Enviar para o suporte** | Suporte vê a fila e atualiza status por item |
| `/privacidade` | Paciente, DPO, Suporte… | **Registrar solicitação** | só pedidos formais de titular (LGPD); dúvida geral vai para Ajuda |
| `/empresas` | Suporte, Admin | **Cadastrar empresa** (onboarding assistido) | texto explica a diferença para o autocadastro |

## 5. Pendências conhecidas (backlog de fluxo)

1. **Cadastro pede preço e limite do plano** (`app/cadastro/page.tsx`): a clínica define o próprio valor mensal no
   autocadastro, o que contradiz "valores devem ser predefinidos". Proposta: cadastro só com clínica + CNPJ + acesso;
   plano atribuído pela equipe MedSync na ativação. Exige mudar `RegisterClinic` (`ApiEndpoints.cs`), que hoje valida
   `MonthlyFee > 0` — **decisão de produto pendente**.
2. **Homes quase vazias de Auditor/DPO/Admin** (`PlatformAuditorHome`, `DpoHome`, `PlatformOverviewHome`) são só um
   texto + "Abrir X", repetindo o item de menu. Proposta: mostrar um resumo real ou redirecionar o Painel desses
   perfis para a tela principal deles.
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
