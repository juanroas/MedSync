---
name: medsync-flow-audit
description: Use before shipping or reviewing any MedSync screen change that adds, removes, renames or moves a button, link, menu item or page — or when the user reports "too many buttons", confusing navigation, duplicated actions, or a screen whose name doesn't match what it does. Audits the rendered UI against the flow rules and updates the flow map.
---

# MedSync Flow Audit

Garante que cada tela conta uma parte de uma história só: um lugar no menu, uma ação principal, nenhum
caminho duplicado. Nasceu da auditoria de 23/09/2026 (landing com 6 CTAs para 3 destinos).

## Instruções

1. Leia as regras: `.agents/rules/ui-actions-and-flow.md` e `.agents/rules/page-anatomy.md`.
2. Leia o mapa atual: `docs/02-design/FLOW_MAP.md`. Identifique quais telas e perfis a mudança toca.
3. **Inventarie o que está renderizado**, não o que o código parece fazer — a mesma página muda por perfil:
   ```bash
   cd apps/web
   npm run build && npx next start -p 3107 &
   node scripts/audit-actions.mjs --out ../../qa/actions http://localhost:3107/<rota>
   AUDIT_PASSWORD='<senha demo>' node scripts/audit-actions.mjs --as <email-do-perfil> http://localhost:3107/<rota>
   ```
   Rode `--as` para **cada perfil** afetado (e-mails em `README.md`, seção de contas demo). Nunca passe a
   senha como argumento nem a escreva em arquivo; use a variável `AUDIT_PASSWORD`.
4. Para cada tela, preencha mentalmente: *lugar (menu) → ação principal → ações secundárias → saídas*.
   Aplique as regras R1–R8. Trate como falha:
   - mais de um botão primário visível ao mesmo tempo (R2);
   - destino repetido na área de conteúdo — o script sai com código 2 (R3);
   - a mesma ação com rótulos diferentes, ou rótulo que promete outra coisa (R4);
   - botão de cadastro fora de `/login` (R5);
   - link para tela que o perfil não tem no menu (R6);
   - botão que não faz nada ou abre tela vazia (R7).
5. Corrija removendo, não adicionando: a resposta para "o usuário não acha X" quase nunca é um terceiro botão
   para X — é mover X para o lugar certo e renomear.
6. Rode o script de novo até sair com código 0, depois `npm run typecheck` e `npm run build`.
7. Procure specs que dependem de textos alterados: `rg -n "getByRole|getByText" apps/web/e2e` e ajuste seletores
   frágeis no mesmo PR.
8. Atualize `docs/02-design/FLOW_MAP.md` (menu por perfil, tabela tela → ação principal, pendências).

## Referências obrigatórias

- `.agents/rules/ui-actions-and-flow.md`
- `.agents/rules/page-anatomy.md`
- `docs/02-design/FLOW_MAP.md`
- `docs/02-design/REFERENCE_PULSECHECK_FLOW.md` (como a referência organiza o funil e as ações)
- `apps/web/src/components/app-shell.tsx` (`navigation`, `navigationLabel()`)

## Contrato de saída

- Lista de telas × perfis auditados, com contagem de ações acima da dobra antes/depois.
- Violações encontradas, cada uma com a regra (R1–R8) e o arquivo:linha.
- O que foi corrigido e o que ficou como pendência (registrada em `FLOW_MAP.md` §5).
- Resultado final do `audit-actions.mjs` (código de saída) e de typecheck/build.
- Specs E2E afetadas e ajustadas, ou "nenhuma".
