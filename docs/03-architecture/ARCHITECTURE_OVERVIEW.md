# Architecture Overview - MedSync

Status: Architecture Blueprint. Este documento nao altera a implementacao.

## Objetivo

Definir a visao arquitetural do MedSync como plataforma de Saude Digital com modelo B2B.

## Escopo

Inclui modulos, responsabilidades, dependencias conceituais, camadas, DDD, CQRS e limites.

Fora de escopo:

- Alterar codigo.
- Criar migrations.
- Criar microservicos.
- Criar endpoints.

## Visao geral

O MedSync deve permanecer organizado como produto modular, com separacao clara entre identidade, empresa/CNPJ, acesso ao cuidado, atendimento medico independente, saude ocupacional, video, pagamentos, auditoria e privacidade.

## Modulos conceituais

| Modulo | Responsabilidade |
|---|---|
| Identity | Autenticacao, sessoes, usuarios e papeis |
| Business | Empresas/parceiros, contratos, elegibilidade e planos |
| Care | Jornada paciente/beneficiario e acesso ao cuidado |
| Medical | Medico independente, atendimento, prontuario e informacao clinica |
| Occupational Health | ADM Medico do Trabalho, CNPJ associado e registros ocupacionais permitidos |
| Video | Sala de espera, token e teleconsulta |
| Payment | Checkout, status e webhooks |
| Audit | Eventos, tentativas negadas e evidencias |
| Privacy | LGPD, direitos do titular, retencao e minimizacao |

## Camadas

TODO: Validar com estrutura real do backend.

Direcao esperada:

- Domain: regras e entidades.
- Application: casos de uso e contratos.
- Infrastructure: persistencia e integracoes.
- API: endpoints e autenticacao.
- Web: experiencia por perfil.

## DDD

TODO: Validar bounded contexts finais.

Possiveis contextos:

- Identity.
- Medical Care.
- Occupational Health.
- B2B Contracts and Eligibility.
- Payments.
- Audit and Privacy.
- Video Consultation.

## CQRS

TODO: Validar se CQRS sera adotado formalmente.

Diretriz inicial:

- Usar separacao clara entre comandos e consultas quando reduzir complexidade.
- Nao introduzir CQRS cerimonial sem necessidade.
- Registrar decisao em ADR se houver adocao formal.

## Checklist

- [x] Modulos conceituais definidos.
- [x] Camadas previstas.
- [ ] TODO: validar com codigo real.
- [ ] TODO: registrar ADRs arquiteturais.
- [ ] TODO: preencher especificacoes tecnicas.

## Referencias

- [Module Boundaries](MODULE_BOUNDARIES.md)
- [Multi Tenancy](MULTI_TENANCY.md)
- [API Guidelines](API_GUIDELINES.md)
- [Decisions](../10-decisions/README.md)
