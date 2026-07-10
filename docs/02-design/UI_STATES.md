# UI States - MedSync

Status: Blueprint.

## Objetivo

Definir estados obrigatorios para interfaces do MedSync.

## Escopo

Inclui estados de carregamento, vazio, erro, sucesso, bloqueio e permissao.

## Estados obrigatorios

| Estado | Quando usar | Observacao |
|---|---|---|
| Loading | Dados sendo carregados | Usar skeleton quando houver estrutura previsivel |
| Empty | Nenhum dado disponivel | Explicar proximo passo quando aplicavel |
| Error | Falha recuperavel | Nao expor detalhe sensivel |
| Blocked | Acao indisponivel por regra | Explicar criterio geral |
| Forbidden | Usuario sem permissao | Nao expor dados do recurso |
| Success | Acao concluida | Confirmar sem excesso de ruido |
| Pending | Processo aguardando evento externo | Ex: pagamento ou homologacao |

## Regras

- Estado de erro nao deve revelar existencia de dados de outro usuario.
- Estado sem permissao deve ser claro e seguro.
- Empty state deve evitar tom comercial exagerado.

## Checklist

- [x] Estados definidos.
- [ ] TODO: validar microcopy.
- [ ] TODO: validar visual.
- [ ] TODO: criar exemplos por perfil.

## Referencias

- [Copywriting Guidelines](COPYWRITING_GUIDELINES.md)
- [UX Guidelines](UX_GUIDELINES.md)
