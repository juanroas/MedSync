# ADR-0001: Corpo clinico proprio por empresa e pool compartilhado de medicos

## Status

Proposto. Parte 1 (corpo clinico proprio por empresa) implementada em 26/08/2026. Parte 2 (pool compartilhado com vinculo/restricao) ainda nao implementada.

## Contexto

Durante analise do fluxo "empresa cadastra funcionarios/pacientes/medicos", foi identificado que:

- `ManagePatients` e `ManageDoctors` (`apps/api/src/MedSync.Api/Security.cs`) usam os papeis legados `Receptionist`, `ClinicAdmin` e `MedicalDirector`, que nunca estavam disponiveis para o ADM da empresa criar via `/staff-users` (`CompanyStaffRoles` so continha `CompanyAdmin`, `CompanyFinance`, `CompanyAuditor`).
- Isso significava que, apos o onboarding de uma empresa e habilitacao do CNPJ, ninguem dentro do tenant daquela empresa conseguia efetivamente cadastrar Paciente ou Medico pela API — so o seed de desenvolvimento (`DatabaseSeeder.cs`) populava esses registros.
- O modelo de sessao atual e estritamente single-tenant: o login (`Login` em `ApiEndpoints.cs`) fixa `clinic_id` no JWT usando a primeira `ClinicMembership` do usuario (`memberships[0]`). Nao existe seletor/troca de tenant. Isso significa que um Suporte/PlatformAdmin nao consegue, com a mesma sessao, criar Paciente ou Medico dentro do tenant de uma empresa especifica — toda escrita em `/patients` e `/doctors` e escopada por `actor.ClinicId`, que vem do tenant onde o usuario logou.
- Em conversa com o responsavel pelo produto (26/08/2026), foi confirmado que o MedSync precisa suportar dois modelos ao mesmo tempo: (a) empresas com corpo clinico proprio (medico contratado por aquela empresa, atende so os beneficiarios dela) e (b) um pool de medicos independentes da MedSync, vinculavel a mais de uma empresa, com necessidade de alguma restricao de acesso por vinculo.

## Decisao

**Parte 1 (implementada agora):** habilitar o modelo (a) — corpo clinico proprio por empresa — pelo caminho de menor risco: os papeis `Receptionist` e `MedicalDirector` foram adicionados a `CompanyStaffRoles` (backend) e a `companyStaffRoleValues`/`staffRoleOptions` (frontend, `acessos/page.tsx`). Isso permite que o ADM da empresa nomeie, dentro do proprio tenant, alguem como Recepcao (ganha `ManagePatients`) e Diretor Medico (ganha `ManagePatients` + `ManageDoctors`), usando os endpoints `/patients` e `/doctors` que ja existiam e ja tinham UI pronta (as paginas de pacientes/medicos ja checavam esses papeis, so nunca eram atribuiveis). Nenhuma mudanca de sessao/login foi necessaria.

Tambem foi adicionado, em `CreatePatient`, um vinculo automatico: ao criar um Paciente cujo e-mail bate com um `CompanyEmployee` (beneficiario) ja cadastrado no mesmo tenant e ainda sem `PatientId`, o sistema vincula os dois automaticamente (`CompanyEmployee.PatientId = patient.Id`). Isso faz os contadores de `company-portal`, `company-beneficiaries` e os relatorios B2B (`reports/business-summary`) passarem a refletir o paciente corretamente, sem exigir um fluxo de self-service.

**Parte 2 (nao implementada, decisao em aberto):** o modelo (b) — pool de medicos compartilhado entre empresas, com restricao de vinculo — exige um dos dois caminhos abaixo, ainda nao escolhido:

1. Introduzir um tenant "MedSync Pool" onde o medico tem sua `ClinicMembership` primaria, mais uma tabela de vinculo `DoctorCompanyLink` (ou equivalente) autorizando esse medico a atender pacientes de tenants especificos, e ajustar `RequestContext`/`Login` para suportar mais de um `clinic_id` ativo (seletor de tenant na sessao, ou um claim de "tenants autorizados" verificado por endpoint em vez de um `clinic_id` fixo).
2. Manter o modelo atual (Doctor 100% escopado a um `ClinicId`) e, para "vinculo com mais de uma empresa", criar um registro de Doctor por tenant vinculado a mesma pessoa/CRM (chave natural: CRM + UF), aceitando duplicacao de cadastro em troca de nao mexer no modelo de sessao.

## Alternativas consideradas

- Deixar `ManagePatients`/`ManageDoctors` como estavam e criar endpoints novos so para o ADM da empresa (ex.: `POST /company-doctors`) — descartado por duplicar logica que ja existe e ja tem UI pronta em `/patients` e `/doctors`.
- Resolver o pool compartilhado agora, junto com a parte 1 — descartado por exigir mudanca no modelo de sessao/login (JWT com tenant fixo), que e uma mudanca estrutural maior e mais arriscada para a fase atual do projeto (reta final, sem ambiente de build disponivel para validar mudancas profundas no fluxo de autenticacao).

## Consequencias

Positivas: desbloqueia o fluxo real (empresa cadastra funcionario -> paciente vinculado -> aparece em elegibilidade/relatorios) sem tocar no modelo de sessao, com risco baixo (mudanca de duas listas de papeis + um vinculo automatico por e-mail).

Negativas / riscos: o modelo de pool compartilhado (parte 2) continua bloqueado ate esta decisao ser tomada e implementada. Enquanto isso, uma empresa que dependa de medico compartilhado com outras empresas nao tem caminho no produto — precisa, por ora, ter o medico cadastrado independentemente em cada tenant (duplicando o cadastro), ou aguardar a parte 2.

## Referencias

- `apps/api/src/MedSync.Api/Security.cs` (`AccessRules.ManagePatients`, `AccessRules.ManageDoctors`)
- `apps/api/src/MedSync.Api/ApiEndpoints.cs` (`StaffRoles`, `CompanyStaffRoles`, `Login`, `CreatePatient`)
- `apps/web/src/app/(platform)/acessos/page.tsx`
- `docs/03-architecture/MULTI_TENANCY.md`
