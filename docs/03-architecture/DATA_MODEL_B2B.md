# Data Model B2B - MedSync

Status: Architecture Blueprint. Nao cria tabelas nem migrations.

## Objetivo

Mapear o modelo de dados conceitual B2B do MedSync.

## Escopo

Inclui entidades conceituais ja documentadas e relacionamentos a validar.

## Entidades conceituais

| Entidade | Papel |
|---|---|
| Company | Empresa contratante |
| CompanyBeneficiary | Pessoa elegivel vinculada a empresa/parceiro |
| BenefitPlan | Plano de acesso ou beneficio |
| CompanyContract | Contrato de empresa/plano |
| BeneficiaryEligibility | Elegibilidade do paciente/beneficiario |
| TechnicalCompany | CNPJ tecnico/operacional para pessoa fisica direta |
| Doctor | Medico independente |
| OccupationalHealthAdmin | ADM Medico do Trabalho associado a CNPJ |
| Patient | Pessoa atendida |
| Appointment | Consulta |

## Relacionamentos a validar

TODO:

- Company -> CompanyContract.
- Company -> CompanyBeneficiary.
- CompanyContract -> BenefitPlan.
- CompanyBeneficiary -> BeneficiaryEligibility.
- CompanyBeneficiary -> Patient quando aplicavel.
- TechnicalCompany -> CompanyBeneficiary para pessoa fisica direta quando aplicavel.
- Company -> OccupationalHealthAdmin quando aprovado.
- Appointment -> Patient.
- Appointment -> Doctor.

## Regras de privacidade

- Relacionamentos B2B nao podem expor prontuario para empresa.
- Dados clinicos ficam no dominio Medical.
- Dados ocupacionais ficam em dominio clinico restrito, nao em Business/RH.
- Relatorios devem usar agregacao e minimizacao.
- Nomes de entidades sao conceituais e devem ser validados antes de qualquer migration.

## Checklist

- [x] Entidades conceituais listadas.
- [ ] TODO: validar campos.
- [ ] TODO: validar cardinalidades.
- [ ] TODO: atualizar specifications.

## Referencias

- [B2B Model](../01-product/B2B_MODEL.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
- [Product Positioning](../01-product/PRODUCT_POSITIONING.md)
- [Specifications](../16-specifications/README.md)
- [Database](../12-database/README.md)
