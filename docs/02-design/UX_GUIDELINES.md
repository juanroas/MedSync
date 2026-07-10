# UX Guidelines - MedSync

Status: UX Blueprint. Este documento nao representa tela implementada.

## Objetivo

Definir diretrizes de experiencia para o MedSync como plataforma de Saude Digital com modelo B2B.

## Escopo

Inclui principios de UX, estrutura por perfil, estados de interface, acessibilidade, responsividade e requisitos de privacidade na experiencia.

Fora de escopo:

- Implementar telas.
- Definir componentes em codigo.
- Criar rotas.
- Declarar conformidade regulatoria.

## Principios de experiencia

- Clareza operacional para perfis administrativos.
- Acesso ao cuidado como centro da experiencia do paciente.
- Privacidade visivel para paciente/beneficiario.
- Separacao clara entre dados administrativos, financeiros e clinicos.
- Menor privilegio refletido na interface.
- Estados vazios e erros que orientam sem expor dados sensiveis.
- Experiencia mobile sem depender de zoom.
- Linguagem sobria, confiavel e sem promessa regulatoria indevida.

## Perfis e foco de UX

| Perfil | Foco de experiencia | Risco principal |
|---|---|---|
| Empresa/Parceiro | Contratos, elegibilidade, uso agregado permitido e faturamento | Inferir dado clinico individual |
| Paciente/Beneficiario | Acesso ao cuidado, consultas, consentimento, status e teleconsulta | Confusao sobre privacidade |
| Medico independente | Agenda do dia, atendimento e registro clinico | Acesso fora do vinculo ou ramo autorizado |
| ADM Medico do Trabalho | Saude ocupacional no CNPJ associado | Virar atalho de acesso clinico para RH |
| Financeiro | Cobrancas e conciliacao | Exposicao de dado clinico |
| Auditor/Privacidade | Eventos e evidencias | Alterar dados operacionais |

## Estados de interface

Todo fluxo deve prever:

- Loading.
- Empty state.
- Erro recuperavel.
- Erro bloqueante.
- Acesso negado.
- Sem permissao.
- Dados insuficientes.
- Sucesso.
- Confirmacao para acoes sensiveis.

## Responsividade

TODO: Validar breakpoints finais com implementacao.

Diretrizes iniciais:

- Priorizar telas de operacao em desktop.
- Garantir jornadas essenciais em mobile.
- Evitar tabelas horizontais sem alternativa responsiva.
- Manter acoes primarias visiveis.
- Nao depender de hover para informacao essencial.

## Acessibilidade

TODO: Validar criterio formal.

Diretrizes iniciais:

- Contraste adequado.
- Foco visivel.
- Labels claros.
- Mensagens de erro associadas ao campo.
- Navegacao por teclado para fluxos criticos.
- Texto sem dependencia exclusiva de cor.

## Checklist

- [x] Principios de UX definidos.
- [x] Perfis mapeados.
- [x] Estados obrigatorios definidos.
- [ ] TODO: validar com usuarios.
- [ ] TODO: criar prototipos.
- [ ] TODO: validar acessibilidade.

## Referencias

- [Product Vision](../01-product/PRODUCT_VISION.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [Personas](../01-product/PERSONAS.md)
- [User Journeys](../01-product/USER_JOURNEYS.md)
- [Design System](DESIGN_SYSTEM.md)
