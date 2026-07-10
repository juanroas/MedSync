# B2B Company Specification - MedSync

Status: Specification Draft. Nao confirma implementacao.

## Objetivo

Definir requisitos conceituais para empresa/parceiro, CNPJ contratante, contratos, planos, elegibilidade e relatorios agregados.

## Escopo

Inclui dados administrativos, contrato/plano, elegibilidade, relatorios permitidos, CNPJ tecnico e limites de privacidade.

Fora de escopo:

- Criar contratos juridicos finais.
- Criar endpoints.
- Criar tabelas.
- Definir precificacao.

## Perfis cobertos

- Empresa/Parceiro Admin.
- Financeiro Empresa/Parceiro.
- Auditor Empresa/Parceiro.
- Suporte MedSync.
- Admin Plataforma.
- Paciente/beneficiario quando vinculado a CNPJ.

## Regras

- Empresa/parceiro so acessa dados administrativos, contratuais, financeiros e agregados permitidos.
- Empresa/parceiro nao acessa diagnostico, prontuario, observacoes clinicas, conduta clinica ou conteudo de chamada.
- Elegibilidade pode ser criada/atualizada por perfil autorizado.
- Pessoa fisica direta deve ser vinculada ao CNPJ tecnico/operacional via suporte.
- Relatorios agregados precisam respeitar granularidade minima.
- Baixa granularidade deve bloquear ou ocultar relatorio sensivel.

## Operacoes

| Operacao | Regra |
|---|---|
| Criar empresa/parceiro | TODO: validar fluxo administrativo |
| Atualizar dados do CNPJ | Apenas campos administrativos permitidos |
| Gerenciar elegibilidade | Empresa/parceiro ou suporte, conforme permissao |
| Ver contrato/plano | Empresa/parceiro e perfis internos autorizados |
| Ver relatorio | Apenas agregado e permitido |
| Cancelar/desativar | Requer motivo, status e auditoria |

## Eventos de auditoria

- Criacao/atualizacao de CNPJ.
- Alteracao de contrato/plano.
- Alteracao de elegibilidade.
- Tentativa de acesso a dado clinico.
- Exportacao de relatorio.
- Bloqueio por baixa granularidade.

## Testes negativos

- Empresa tentando ver prontuario.
- Empresa tentando ver diagnostico.
- Empresa tentando ver lista individual sensivel de consultas.
- Financeiro tentando ver dado clinico.
- Auditor empresarial tentando acessar conteudo clinico.

## TODO

- TODO: definir granularidade minima.
- TODO: validar campos administrativos.
- TODO: validar contrato e base legal.
- TODO: mapear CNPJ tecnico/operacional.
- TODO: criar criteria de aceite por relatorio.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [LGPD Reference](../reference/LGPD.md)
