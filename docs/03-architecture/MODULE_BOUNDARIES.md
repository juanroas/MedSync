# Module Boundaries - MedSync

Status: Architecture Blueprint.

## Objetivo

Definir fronteiras conceituais entre modulos do MedSync.

## Escopo

Inclui responsabilidades, dependencias permitidas e limites de dados.

## Fronteiras

| Modulo | Pode depender de | Nao deve fazer |
|---|---|---|
| Identity | Audit | Conter regra clinica |
| Business | Identity, Audit | Acessar dado clinico individual |
| Care | Identity, Business, Medical, Video, Payment | Acessar dados de outros pacientes |
| Medical | Identity, Business, Audit | Expor dado clinico a empresa |
| Occupational Health | Identity, Business, Medical, Audit | Virar acesso de RH a dados clinicos |
| Video | Identity, Business, Medical, Audit | Emitir token sem validacao |
| Payment | Identity, Business, Audit | Ser fonte de dado clinico |
| Audit | Identity | Alterar dados operacionais |
| Privacy | Identity, Audit | Ignorar base legal e minimizacao |

## Regras transversais

- Todo acesso sensivel deve considerar tenant, perfil e vinculo.
- Dados clinicos nao devem atravessar para Business.
- ADM Medico do Trabalho deve permanecer em modulo clinico/ocupacional, separado de RH e Business administrativo.
- Eventos relevantes devem ser auditaveis.
- Integrações externas devem ficar isoladas por contrato.

## Checklist

- [x] Fronteiras conceituais definidas.
- [ ] TODO: validar dependencias reais no codigo.
- [ ] TODO: transformar regras em testes de arquitetura.
- [ ] TODO: criar ADR se fronteiras mudarem.

## Referencias

- [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
- [Actor and Organization Model](../01-product/ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](../01-product/DATA_MANAGEMENT_CRUD.md)
- [B2B Model](../01-product/B2B_MODEL.md)
- [Security](../07-security/README.md)
