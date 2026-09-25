---
name: medsync-screen-rebuild
description: Use when rebuilding, redesigning or creating any MedSync screen listed in docs/02-design/SCREEN_REBUILD_PLAN.md, or when the user asks to "refazer a tela", "trabalhar tela por tela", or add a feature a competitor (iClinic, Feegow, Amplimed, Doctoralia) already has. Grounds each screen in the profile's job, market parity, CFM/LGPD constraints and the flow rules before writing code.
---

# MedSync — reconstrução de tela

Uma tela por vez, sempre na ordem de `docs/02-design/SCREEN_REBUILD_PLAN.md`, a menos que o usuário peça outra.

## Instruções

1. **Escolha a tela** no plano e marque 🟨. Se a fase dela depende de decisão aberta (⏸), pare e pergunte.
2. **Escreva a ficha da tela** (na resposta, antes de codar) — 6 linhas, sem achismo:
   - **Perfil(is)** que usam (ADR-0003) e o que cada um vê.
   - **Trabalho a fazer**: a frase "quando eu ___, quero ___, para ___".
   - **Ação principal** (uma só) e ações secundárias.
   - **Paridade de mercado**: o que iClinic/Feegow/Amplimed/Doctoralia fazem nessa tela, citando
     `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md`. Se o dado não estiver lá, pesquise e **adicione ao
     documento com a fonte** antes de usar.
   - **Restrição regulatória**: artigos de `.agents/rules/clinical-data-access.md` e
     `.agents/rules/medical-documents.md` que se aplicam (ou "nenhuma").
   - **Dados e API**: endpoints existentes reaproveitados; o que é novo.
3. **Leia o código atual da tela inteiro** antes de mudar. Reaproveite `components/ui.tsx`
   (`PageHeader`, `MetricCard`, `Card`, `buttonClass`, `secondaryButtonClass`) e `ROLE_LABELS`.
4. **Autorização primeiro**: qualquer campo clínico novo começa pela checagem na API (regra C2), depois a tela.
5. **Construa** seguindo `.agents/rules/page-anatomy.md` e `.agents/rules/ui-actions-and-flow.md`.
6. **Verifique** com a skill `medsync-flow-audit`: `audit-actions.mjs --as <perfil>` para cada perfil da ficha,
   `npm run typecheck:web`, `npm run build:web`, `dotnet build` se mexeu na API. Olhe o screenshot gerado.
7. **Feche**: marque ✅ no plano, atualize `docs/02-design/FLOW_MAP.md` (menu, tela → ação principal) e ajuste specs
   E2E que dependem dos textos alterados.

## Referências obrigatórias
- `docs/02-design/SCREEN_REBUILD_PLAN.md`
- `docs/10-decisions/ADR-0003-seis-perfis-e-acesso-ao-prontuario.md`
- `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md`
- `.agents/rules/ui-actions-and-flow.md`, `.agents/rules/page-anatomy.md`
- `.agents/rules/clinical-data-access.md`, `.agents/rules/medical-documents.md`

## Contrato de saída
- A ficha da tela (6 linhas).
- Arquivos alterados, com o que mudou na API e no front.
- Resultado de audit/typecheck/build por perfil, e o screenshot conferido.
- Linha do plano atualizada e o que ficou pendente.
