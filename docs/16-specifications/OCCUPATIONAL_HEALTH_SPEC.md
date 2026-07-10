# Occupational Health Specification - MedSync

Status: Specification Draft. Nao confirma implementacao e exige validacao juridica, DPO e diretor tecnico.

## Objetivo

Definir requisitos conceituais para o perfil ADM Medico do Trabalho e dados clinicos ocupacionais associados a CNPJ.

## Escopo

Inclui acesso clinico ocupacional por CNPJ, separacao de RH, auditoria, finalidade, minimizacao e bloqueios.

Fora de escopo:

- Autorizar uso real de saude ocupacional.
- Definir documentos ocupacionais finais.
- Criar endpoints ou telas.
- Permitir acesso de RH a dados clinicos.

## Perfis cobertos

- ADM Medico do Trabalho.
- Empresa/Parceiro Admin como perfil explicitamente proibido para dado clinico.
- Auditor Plataforma/MedSync.
- DPO/Privacidade.

## Regras

- ADM Medico do Trabalho e perfil clinico, nao RH.
- Deve estar associado a CNPJ.
- Acesso depende de finalidade, permissao, escopo e auditoria.
- Dados clinicos ocupacionais nao podem ser exibidos para Empresa/Parceiro Admin, financeiro ou auditor empresarial.
- Conteudo de chamada nao existe por padrao, pois gravacao/transcricao estao desabilitadas por padrao.
- Qualquer gravacao/transcricao futura exige decisao especifica, consentimento/base legal, retencao e aprovacao juridica.

## Operacoes

| Operacao | Regra |
|---|---|
| Ver registros ocupacionais | Apenas CNPJ associado e finalidade aprovada |
| Criar registro ocupacional | TODO: validar regra |
| Atualizar/retificar | Exige autoria, motivo, auditoria e regra aprovada |
| Exportar | TODO: validar se permitido e por qual finalidade |
| Compartilhar com empresa administrativa | Nao permitido |

## Eventos de auditoria

- Leitura de registro ocupacional.
- Criacao/retificacao de registro ocupacional.
- Tentativa de acesso fora do CNPJ.
- Tentativa de exportacao.
- Tentativa de acesso por RH/empresa administrativa.
- Alteracao de permissao do perfil.

## Testes negativos

- Empresa/Parceiro Admin acessando registro ocupacional.
- Financeiro acessando registro ocupacional.
- ADM Medico do Trabalho acessando CNPJ fora do escopo.
- Auditor empresarial tentando ver dado clinico ocupacional.
- Exportacao sem finalidade aprovada.

## TODO

- TODO: validar base legal e finalidade.
- TODO: validar documentos permitidos.
- TODO: validar papel do diretor tecnico.
- TODO: definir retencao.
- TODO: definir break-glass, se existir.
- TODO: criar ADR para adocao do perfil.

## Referencias

- [Permission Matrix](../07-security/PERMISSION_MATRIX.md)
- [LGPD Reference](../reference/LGPD.md)
- [Healthcare Reference](../reference/Healthcare.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
