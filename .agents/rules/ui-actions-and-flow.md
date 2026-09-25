# Regra: ações, botões e fluxo de telas

Aplica-se a qualquer mudança em `apps/web/src/app/**` ou `apps/web/src/components/**` que adicione, remova,
renomeie ou mova um link, botão ou item de menu. Mapa canônico: `docs/02-design/FLOW_MAP.md`.

Origem: auditoria de 23/09/2026 — a landing tinha 6 CTAs acima da dobra para 3 destinos, e `/consultas` tinha
3 entradas para "nova consulta" com 3 rótulos diferentes. Referência de organização:
`docs/02-design/REFERENCE_PULSECHECK_FLOW.md`.

## R1 — Menu é para lugares; header da página é para ações
O menu lateral (`components/app-shell.tsx`) e o header público (`components/public-header.tsx`) só listam **lugares**.
Nenhum "Nova X", "Solicitar X" ou atalho de ação no menu.
- Errado: bloco fixo "Nova consulta" no rodapé do menu (removido).
- Certo: "Agendar consulta" no `PageHeader action` de `/consultas`.

## R2 — Uma ação principal por tela (por estado)
Cada tela tem no máximo **um** botão sólido primário visível por vez. Se o estado muda (vazio → com dados,
upload → prévia), o primário muda — nunca dois ao mesmo tempo. Ações secundárias usam estilo neutro
(`secondaryButtonClass` / `Button variant="secondary"`) e ações destrutivas ficam isoladas com confirmação.
- Ação repetida por linha de lista/tabela (Salvar, Habilitar, Redefinir senha) é sempre secundária.
- Aba ou filtro selecionado não usa fundo sólido teal (`teal-600/700`) — isso é reservado ao CTA; use `bg-teal-50`.
- Verificação automática: `audit-actions.mjs` marca com ★ os controles de fundo primário e acusa R2 se houver
  mais de um acima da dobra.

## R3 — Um destino, uma entrada por viewport
Dentro da área de conteúdo, um mesmo destino não pode ser alcançado por dois controles visíveis ao mesmo tempo.
Menu e rodapé (mapa do site) não contam.
- Estado vazio abaixo de um header que já tem a ação: **só texto** ("Use 'Agendar consulta' no topo…").
- Painel do dashboard pode ter **um** "Ver todas →" para a tela completa daquela lista.
- Verificação automática: `apps/web/scripts/audit-actions.mjs` sai com código 2 quando encontra duplicata.

## R4 — Rótulo = destino, sempre com o mesmo nome
A mesma ação usa o mesmo verbo em todo o app, por perfil:
| Ação | Paciente | Equipe |
|---|---|---|
| criar consulta | Solicitar consulta | Agendar consulta |
| pedir ajuda | Falar com o suporte / Enviar para o suporte | — |
| entrar | Entrar | Entrar |
O nome do item de menu é o título da página que ele abre (`navigationLabel()` e `PageHeader title` batem).
Única exceção: "Painel", cuja página é a home de cada perfil e pode ter título próprio ("Central de operação").
Rótulo não pode prometer outra coisa: "Privacidade" é só LGPD; dúvida geral é "Ajuda".

## R5 — O funil público tem uma porta só
- Landing e `/sobre`: header com **um lugar secundário + "Entrar"**; hero com **um** CTA.
- Criar conta é alcançado **somente** via `/login → "Criar conta"`. Nenhum botão de cadastro na landing.
- "Sobre" é página própria (`/sobre`), não âncora. Nenhuma página linka para si mesma no header/rodapé.

## R6 — Só mostre o que o perfil pode usar
Um link só aparece se o destino está no menu daquele perfil (ex.: "Ver auditoria" só para quem tem Auditoria).
Nunca leve o usuário a uma tela que vai negar acesso.

## R7 — Funcionalidade que não existe fica desabilitada e rotulada
"Continuar com Google" hoje é `disabled` com selo "Em breve". Nada de botão que parece funcionar e não faz nada,
nem de botão que abre uma tela vazia.

## R8 — Guarda decide o funil, não botão
Redirecionamentos por estado (sem sessão, troca de senha obrigatória, CNPJ pendente) ficam no layout/guarda,
não espalhados como botões "Ir para X" em várias telas.

## Checklist rápido para PR
- [ ] Contei os controles acima da dobra de cada tela alterada (menu/rodapé fora da conta).
- [ ] Nenhum destino duplicado na área de conteúdo (`audit-actions.mjs` retorna 0).
- [ ] Rótulos seguem a tabela da R4.
- [ ] `docs/02-design/FLOW_MAP.md` atualizado se mudou tela, menu ou ação principal.
