# Design System Blueprint - MedSync

Status: Design Blueprint. Este documento define direcao visual e componentes esperados; nao implementa componentes.

## Objetivo

Definir uma base de design system para o MedSync antes do desenvolvimento das telas.

## Escopo

Inclui tokens conceituais, componentes esperados, padroes de layout, estados e boas praticas visuais.

Fora de escopo:

- Criar CSS, React ou Storybook.
- Definir tokens finais sem validacao visual.
- Criar telas finais.

## Direcao visual

O MedSync deve ter aparencia de SaaS B2B de saude moderno: limpo, confiavel, objetivo e operacional.

Referencias de categoria a observar sem copiar:

- Doctoralia.
- DR Online.
- IntegraConsulta.
- Alice Saude.
- Conexa.

## Tokens conceituais

TODO: Validar paleta final.

| Token | Direcao |
|---|---|
| Cor primaria | Saude digital, confianca e acao |
| Cor secundaria | Apoio operacional |
| Cor de sucesso | Confirmacao e status positivo |
| Cor de alerta | Pendencia nao bloqueante |
| Cor de erro | Falha, risco ou bloqueio |
| Superficie | Fundos claros e separacao sutil |
| Texto | Alto contraste e leitura rapida |

## Tipografia

TODO: Validar fonte final.

Diretrizes:

- Priorizar legibilidade.
- Evitar textos excessivamente pequenos em dashboards.
- Diferenciar titulo, subtitulo, label, corpo e ajuda.
- Manter tom profissional.

## Componentes esperados

- Botoes.
- Cards.
- Inputs.
- Selects.
- Checkboxes e toggles.
- Data tables.
- Sidebars.
- Headers.
- Dashboards.
- Modais.
- Calendario.
- Timeline.
- Empty states.
- Loading skeletons.
- Alerts e toasts.
- Badges de status.

## Estados dos componentes

Todo componente interativo deve prever:

- Default.
- Hover quando aplicavel.
- Focus.
- Disabled.
- Loading.
- Error.
- Success quando aplicavel.

## Checklist

- [x] Direcao visual definida.
- [x] Componentes esperados listados.
- [ ] TODO: validar tokens.
- [ ] TODO: criar inventario visual.
- [ ] TODO: criar criterios de acessibilidade.
- [ ] TODO: transformar em componentes na Sprint de desenvolvimento.

## Referencias

- [UX Guidelines](UX_GUIDELINES.md)
- [Component Library](COMPONENT_LIBRARY.md)
- [Sprint 3.5 - Design System](Sprint%203.5%20%E2%80%94%20Design%20System.md)
