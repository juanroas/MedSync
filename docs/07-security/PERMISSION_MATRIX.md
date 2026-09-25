# Permission Matrix - MedSync

Status: reflete o código após a Fase 0 (ADR-0003). A autorização é decidida na API
(`apps/api/src/MedSync.Api/ApiEndpoints.cs` e `AccessRules` em `Security.cs`); esconder um botão no front não é
controle de acesso. Conformidade LGPD/CFM ainda depende de validação jurídica.

## Perfis

| Perfil (`ClinicRole`) | Onde mora | Escopo |
|---|---|---|
| Paciente (`Patient`) | Clínica onde é atendido | A própria jornada |
| Médico (`Doctor`) | Clínica onde atende | Consultas em que é o médico designado |
| ADM da clínica (`ClinicAdmin`) | A própria clínica | Operação da clínica: pacientes, médicos, agenda, equipe, auditoria |
| Médico ADM MedSync (`MedicalDirector`) | Clínica plataforma "MedSync Operação" | Responsável técnico: ativa clínicas, gerencia a equipe MedSync, fila de Ajuda |
| Suporte MedSync (`Support`) | Clínica plataforma | Onboarding de clínicas e fila de Ajuda de todas as clínicas |
| DPO MedSync (`DataProtectionOfficer`) | Clínica plataforma | Direitos do titular e trilha de auditoria de todas as clínicas |

A equipe MedSync é identificada pela claim `platform` do JWT (`RequestContext.IsPlatformStaff`). O módulo
empresa/benefício foi removido (tabelas apagadas pela migração `RemoveCompanyModule`).

## Legenda

`C` criar · `R` ver · `U` atualizar · `D` desativar/cancelar · `A` auditado · `N` não permitido

## Matriz por classe de dado

| Perfil | Cadastro pessoal | Clínica (CNPJ, ativação, plano) | Agenda/consulta | Prontuário, medicação, anexos | Teleconsulta (token) | Pagamento | Auditoria | Equipe e acessos | Ajuda | Privacidade |
|---|---|---|---|---|---|---|---|---|---|---|
| Paciente | R/U próprio/A | N | C (solicitar)/R/D próprias/A | R próprio | R quando designado/A | C/R próprio | N | N | C/R próprias | C/R próprias |
| Médico | R/U próprio; R pacientes vinculados | N | R designadas; disponibilidade C/D | C/R/U quando designado/A | R quando designado/A | R designadas | N | N | C/R próprias | N |
| ADM da clínica | C/R/U pacientes e médicos da clínica/A | R status da própria | C/R/D da clínica/A | **N** (mesmo se também for médico, só vê as consultas que atende) | N | R da clínica | R da clínica | C/R/U ADM da clínica/A | C/R próprias | N |
| Médico ADM MedSync | R/U próprio | C/R/U todas; **só ele ativa/suspende**/A | N | **N até a Fase 5** (acesso com justificativa, regra C3) | N | N | N | C/R/U Médico ADM, Suporte, DPO/A | R/U fila de todas/A | N |
| Suporte MedSync | R/U próprio | C (onboarding)/R todas/A | N | N | N | N | N | N | R/U fila de todas/A | N |
| DPO MedSync | R/U próprio | N | N | N | N | N | R todas (só metadados) | N | C/R próprias | C/R/U fila de todas/A |

Regras de acesso ao conteúdo clínico: [`.agents/rules/clinical-data-access.md`](../../.agents/rules/clinical-data-access.md).

## Regras de campo

- Medicação contínua do paciente só volta na API para o próprio paciente e para o médico que o atende.
- Notas da consulta e medicações só aparecem para o médico designado (`AppointmentQuery`), nunca para o ADM da
  clínica, mesmo quando a mesma pessoa tem os dois papéis.
- CNPJ aparece mascarado em listas (`MaskTaxId`).
- Auditoria guarda ação, recurso, resultado e motivo; nunca conteúdo clínico, CPF completo ou token.
- Ninguém desabilita o próprio acesso (validação em `UpdateStaffUserActivation`).

## Testes negativos (E2E em `apps/web/e2e/authorization.spec.ts` e `access-management.spec.ts`)

- ADM da clínica, Médico ADM, Suporte e DPO recebem 403/404 no prontuário.
- Suporte e DPO não cadastram paciente.
- Equipe MedSync não lista consultas individuais.
- ADM da clínica não recebe token de videochamada.
- Médico e Médico ADM não criam agenda por API.
- Suporte e ADM da clínica não ativam clínica.
- ADM da clínica só cria ADM da clínica; Médico ADM só cria equipe MedSync.

## Decisões pendentes

- Fase 5: acesso do Médico ADM ao prontuário com justificativa registrada e auditoria reforçada.
- Vínculo médico ↔ várias clínicas (feito pelo Suporte) e troca de local após o login.
- Break-glass e matriz de base legal por finalidade, a validar com jurídico e DPO.

## Referências

- [ADR-0003 — seis perfis e acesso ao prontuário](../10-decisions/ADR-0003-seis-perfis-e-acesso-ao-prontuario.md)
- [FLOW_MAP](../02-design/FLOW_MAP.md)
- [LGPD Checklist](LGPD_CHECKLIST.md)
- [Security Checklist](SECURITY_CHECKLIST.md)
