# Referência: fluxo do Pulsecheck (`C:\git\test\medsync-test-main`)

Leitura página por página do template Lovable "Pulsecheck" (dashboard de saúde de contas para Customer Success),
publicado em `https://medsync-test.lovable.app`. Stack: TanStack Start, React 19, Tailwind v4, shadcn, Supabase.
Serve de referência de **organização de fluxo e ações**, não de domínio nem de código — a stack do MedSync é
diferente (Next 15 + Tailwind 3.4 + API .NET) e nada foi copiado.

Auditoria feita lendo todo o código-fonte das rotas (~1.900 linhas) e inventariando os botões renderizados com
`apps/web/scripts/audit-actions.mjs` em 23/09/2026.

## 1. A história em uma frase

> Visitante entende o produto → entra (ou cria conta no mesmo cartão) → responde 3 passos de onboarding →
> cai no dashboard e trabalha a partir do menu lateral.

Cada tela existe para avançar exatamente um passo dessa história. Não há atalhos paralelos para o mesmo destino.

## 2. Mapa do funil

```
/  (landing)
├── Docs ─────────────► /docs  (página própria, "sobre/como funciona")
├── Sign in ──────────► /auth
└── Start now ────────► /auth          ← mesmo destino do "Sign in"; é o único CTA grande da página

/auth  (um cartão, dois modos: "signin" | "signup")
├── Continue with Google ─► OAuth → /dashboard
├── Forgot password? ─────► e-mail de reset → /auth/reset
├── Sign in / Create account (submit do modo atual)
└── "New to Pulsecheck? Create an account" ⇄ "Already have an account? Sign in"   ← troca de modo, não de página

/_authenticated  (guarda de layout — não é página)
├── sem sessão ───────────────────────► /auth
├── onboarding incompleto ────────────► /onboarding   (forçado, retomável pelo passo salvo)
└── onboarding completo em /onboarding ► /dashboard

/onboarding  (3 passos: Personal → Company → Data)
└── passo 3 oferece 3 saídas equivalentes: Importar CSV | Dados de exemplo | Pular e finalizar → /dashboard
```

Ponto-chave: **o cadastro não é um botão da landing**. Ele é um modo do cartão de login. A landing só tem que
levar a pessoa até `/auth`.

## 3. Página por página

### `/` — Landing (`src/routes/index.tsx`)
| Zona | Ação | Destino | Observação |
|---|---|---|---|
| Header | Docs | `/docs` | lugar secundário |
| Header | Sign in | `/auth` | botão sólido pequeno |
| Hero | **Start now** | `/auth` | único CTA grande |
| FAQ | 4 acordeões | — | abre/fecha no lugar, não navega |
| Footer | Docs, Sign in | `/docs`, `/auth` | mapa do site |

Acima da dobra: **3 ações, 2 destinos**. Seções abaixo ("How it works", FAQ) são só conteúdo, sem botão.

### `/docs` — Sobre/guia (`docs.tsx`)
Header troca "Docs" por "Home" (nunca linka para si mesma) + Sign in. Conteúdo em seções numeradas
(como funciona, primeiros passos, o que vem e o que não vem, limitações conhecidas). Nenhum botão no corpo.

### `/auth` — Entrar/criar conta (`auth.tsx`)
Um cartão centralizado. Google primeiro, divisor "or", e-mail/senha, submit, e a troca de modo no rodapé do cartão.
Detalhes de fluxo que valem copiar:
- Já logado → redireciona direto para `/dashboard`.
- Erro de cadastro **nunca** diz se o e-mail já existe (mostra sempre "confira seu e-mail").
- "Forgot password?" responde sempre a mesma mensagem neutra.

### `/auth/reset` (`auth.reset.tsx`)
Um campo, um botão ("Update password"), um link de volta. Após sucesso → `/dashboard`.

### `/onboarding` (`_authenticated/onboarding.tsx`)
Barra de progresso de 3 passos, cada passo salva no servidor (`onboarding_step`) — dá para sair e voltar.
Rodapé fixo: **Back** à esquerda; **Skip** + **Continue** à direita. "Exit" no topo = pular tudo.
Passo 3 troca "Continue" por três escolhas de mesmo peso (CSV, exemplo, pular).

### Shell autenticado (`components/AppShell.tsx`)
Menu lateral com **apenas lugares**: Dashboard, Accounts, Analytics, Import, Export, Settings + Sign out.
Não há nenhum botão de ação no menu (nada de "Nova conta" fixo). Item ativo = pílula sólida na cor primária.

### `/dashboard`
Título + subtítulo, 4 cartões de KPI, "Status breakdown", "Highest-risk accounts" (com "View all" → Accounts),
"Upcoming renewals". **Nenhum botão de criação** — o dashboard é leitura. O vazio aponta em texto para
"Add one" / "import a CSV".

### `/accounts`
Header: título + contador ("0 of 0 accounts") + **Add account** (único CTA primário, abre modal).
Barra de busca + 3 filtros. Lista/tabela com link para o detalhe e ícone de excluir por linha.
Vazio: só texto ("No accounts match your filters") — **não repete o "Add account"**, que já está no topo.

### `/accounts/$id`
"← All accounts" + "Delete" no topo; cartão de resumo; formulário com **um** "Save changes"; histórico de status.

### `/analytics`
Somente leitura: 3 KPIs + 3 gráficos. Nenhum botão.

### `/import`
"Choose CSV" (primário) + "Download template" (secundário). Depois do upload aparece a prévia com
"Import N accounts" — o CTA primário muda conforme o estado, nunca coexistem dois primários.

### `/export`
Uma frase ("Ready to export N accounts") e um botão "Export CSV", desabilitado quando não há dados.

### `/settings`
Três blocos: Perfil (com "Save"), "Connect your tools" (botões **desabilitados** com "Coming soon" — não fingem
funcionar), "Danger zone" (ação destrutiva isolada, com confirmação).

## 4. Padrões extraídos (viram regra em `.agents/rules/ui-actions-and-flow.md`)

1. **Menu = lugares; header da página = ações.** Nenhuma ação vive no menu.
2. **Um CTA primário por tela/estado.** Quando o estado muda, o primário muda — nunca dois ao mesmo tempo.
3. **Um destino, uma entrada por viewport.** Se já existe o botão no topo, o estado vazio só explica em texto.
4. **Cadastro mora dentro do login**, como troca de modo. A landing não tem botão de cadastro.
5. **"Sobre/Docs" é página própria**, e a página nunca linka para si mesma.
6. **Rótulo = destino.** "Add account" sempre cria conta; o mesmo verbo não aparece com três nomes diferentes.
7. **Funcionalidade inexistente aparece desabilitada e rotulada** ("Coming soon"), nunca como botão falso.
8. **Destrutivo isolado** numa "danger zone", com confirmação.
9. **Guarda de layout decide o funil** (sem sessão → login; onboarding incompleto → onboarding), não botões.

## 5. O que NÃO copiar

- Glassmorphism pesado (blur/transparência) — destoa do posicionamento clínico; usamos cartões brancos sólidos.
- Single-user sem papéis — o MedSync é multi-perfil; o padrão "menu = lugares" vale por perfil.
- Onboarding com dados de exemplo — em saúde, dado fictício misturado ao real é risco; manter o ambiente demo separado.
