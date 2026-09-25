# Regra: anatomia de página da plataforma

Estrutura padrão das telas autenticadas, para que toda página "leia" igual. Componentes em
`apps/web/src/components/ui.tsx`; shell em `apps/web/src/components/app-shell.tsx`.

## Ordem dos blocos (de cima para baixo)
1. **`PageHeader`** — `eyebrow` opcional, `title` (renderizado em caixa alta pelo componente), `description`
   curta, e no máximo **uma** `action` (a ação principal da tela — ver `ui-actions-and-flow.md` R2).
2. **Banner de estado** (opcional) — só quando algo bloqueia o uso normal (CNPJ pendente, erro). Pode ter um CTA
   próprio, porque ele resolve o bloqueio.
3. **Grade de KPIs** — `MetricCard` em `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`. Cartões são leitura, sem botão.
4. **Painéis de conteúdo** — `Card` brancos, lado a lado em telas largas. Cada painel tem título, no máximo um
   link "Ver todas →", e estado vazio só em texto.

## Visual
- Menu lateral claro (`bg-paper`, borda `slate-200`), item ativo = pílula `bg-teal-600 text-white`.
- Cartões brancos sólidos (`Card`), sem gradiente escuro como moldura de conteúdo.
- Cor de destaque de ação: `teal-600/700`. Coral fica para selos e alertas, não para CTA.
- Estado bloqueante usa âmbar; sucesso usa `emerald`/`teal`; erro usa `ErrorBanner`.

## O que não fazer
- Hero escuro com KPIs embutidos dentro da área logada (padrão descartado em 23/09/2026).
- Dois `PageHeader` na mesma tela, ou título dentro de um cartão repetindo o título da página.
- Botão no `MetricCard`.
