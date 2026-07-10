# Multi Tenancy - MedSync

Status: Architecture Blueprint.

## Objetivo

Definir diretrizes de segregacao multi-tenant para o MedSync.

## Escopo

Inclui tenant, CNPJ contratante, CNPJ tecnico, medico independente, ADM Medico do Trabalho, paciente/beneficiario e regras de isolamento.

## Principios

- Todo dado operacional deve ter escopo claro.
- Consultas devem respeitar tenant e vinculos.
- Usuario nao deve acessar dados de outro CNPJ, paciente ou escopo sem autorizacao explicita.
- Relatorios B2B devem ser agregados e administrativos.

## Escopos conceituais

| Escopo | Descricao |
|---|---|
| Tenant | Unidade de isolamento principal a validar |
| CNPJ contratante | Empresa/parceiro contratante B2B |
| CNPJ tecnico/operacional | CNPJ para pessoa fisica direta cadastrada via suporte |
| Medico independente | Profissional habilitado a atender consultas vinculadas |
| ADM Medico do Trabalho | Perfil clinico associado ao CNPJ contratante |
| Paciente/beneficiario | Pessoa elegivel ao acesso contratado |
| Paciente | Pessoa atendida clinicamente |

TODO: Validar nomenclatura final entre Tenant, Company, TechnicalCompany e perfis clinicos.

## Riscos

- Vazamento entre CNPJs.
- Empresa inferir informacao clinica individual.
- ADM Medico do Trabalho ser confundido com RH ou admin empresarial.
- Usuario administrativo acessar prontuario.
- Auditoria insuficiente de tentativa negada.

## Checklist

- [x] Principios de isolamento definidos.
- [ ] TODO: validar modelo de dados real.
- [ ] TODO: criar testes negativos por tenant.
- [ ] TODO: documentar matriz de permissoes.

## Referencias

- [Data Model B2B](DATA_MODEL_B2B.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [QA Checklist](../08-quality/QA_CHECKLIST.md)
