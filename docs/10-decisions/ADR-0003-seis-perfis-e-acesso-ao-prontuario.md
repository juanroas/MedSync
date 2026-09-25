# ADR-0003: Seis perfis e regra de acesso ao prontuário

## Status

**Aceito em 24/09/2026.** Substitui a seção 2 ("Simplificação de perfis") do ADR-0002, que propunha ir de 16 para
~13 perfis e nunca foi confirmada. As duas decisões de modelo estão na seção "Decisões tomadas".

## Contexto

Pedido do usuário: o sistema precisa de poucos perfis — Paciente, Médico, Médico ADM do MedSync, Suporte, DPO do
MedSync e ADM da Clínica — e o Médico ADM, por ter CRM, poderia acessar prontuários e fazer auditoria.

Hoje `ClinicRole` (`apps/api/src/MedSync.Domain/Entities.cs`) tem 16 valores e 12 usuários demo. Contagem de
referências na API em 24/09/2026: `PlatformAdmin` 41, `Patient` 26, `CompanyAdmin` 26, `Doctor` 21, `ClinicAdmin` 18,
`Support` 14, `MedicalDirector` 13, `CompanyFinance` 11, `PlatformFinance` 11, `CompanyAuditor` 11,
`OccupationalHealthAdmin` 10, `PlatformAuditor` 9, `DataProtectionOfficer` 8, `Receptionist` 7, `PrivacyAuditor` 7,
`Finance` 5.

A análise de mercado e de regulação está em `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md`.

## Decisão proposta

### Os 6 perfis

| # | Perfil | Quem é | Vê conteúdo clínico? | Valor em `ClinicRole` |
|---|---|---|---|---|
| 1 | Paciente | Pessoa atendida | Só o próprio | `Patient` |
| 2 | Médico | Médico assistente, com CRM | Só dos pacientes que atendeu (e histórico deles) | `Doctor` |
| 3 | Médico ADM MedSync | **Responsável técnico** da plataforma (CFM 2.314, art. 17), com CRM | Sim, **com justificativa registrada** (ver regra abaixo) | `MedicalDirector` (passa a ser papel da plataforma) |
| 3.1 | Suporte | Equipe de atendimento do MedSync | **Não** | `Support` |
| 4 | DPO MedSync | Encarregado LGPD | **Não** — vê metadados de auditoria, não conteúdo | `DataProtectionOfficer` |
| 5 | ADM Clínica | Dono/gestor da clínica; também faz o papel de secretária | **Não** (se for médico, recebe também `Doctor`) | `ClinicAdmin` |

Um usuário pode ter mais de um perfil. Exemplo comum: o médico dono do consultório = `Doctor` + `ClinicAdmin`.

### O que acontece com os outros 10

| Hoje | Vai para | Por quê |
|---|---|---|
| `Receptionist` | `ClinicAdmin` | Agenda e cadastro de paciente são tarefas do ADM Clínica. Reabrir perfil restrito de secretária só se uma clínica pedir. |
| `Finance` | `ClinicAdmin` | Sem tela própria. |
| `PlatformAdmin` | `MedicalDirector` (governança, ativação) + `Support` (operação) | Ativar clínica envolve checar CRM do RT da clínica — decisão médica. |
| `PlatformAuditor`, `PrivacyAuditor` | `DataProtectionOfficer` (trilha de acesso) e `MedicalDirector` (auditoria clínica) | Separa auditoria de privacidade (DPO, sem conteúdo) de auditoria clínica (médico, com sigilo). |
| `CompanyAdmin`, `CompanyFinance`, `CompanyAuditor`, `OccupationalHealthAdmin`, `PlatformFinance` | **Removidos** (decisão 2) | Pertencem ao módulo empresa/benefício, removido. |

### Regra de acesso ao prontuário

Base: CFM 2.314/2022 art. 3º §3 (guarda pelo diretor/responsável técnico), §8 (acesso do médico assistente) e
Código de Ética Médica art. 85 (proibido dar acesso a quem não tem obrigação de sigilo profissional).

1. **Paciente**: o próprio prontuário e documentos liberados a ele.
2. **Médico**: consultas em que é o médico assistente e o histórico desses pacientes (já é assim:
   `IsAssignedDoctor` / `CanViewPatientClinicalHistory` em `ApiEndpoints.cs`).
3. **Médico ADM MedSync**: acesso por **justificativa** — antes de abrir um prontuário que não é dele, escolhe o
   motivo (auditoria de qualidade, incidente, pedido do titular, ordem judicial) e escreve um texto curto; o acesso
   fica registrado com motivo e aparece para o DPO. Sem exportação em massa pela interface.
   Hoje `CanViewClinical` libera `MedicalDirector` sem motivo; **isso muda**.
4. **Suporte, DPO, ADM Clínica**: nunca o conteúdo clínico. Veem que uma consulta existe, status, datas e quem acessou.

### Telas por perfil (alvo)

| Perfil | Telas |
|---|---|
| Paciente | Início · Minhas consultas · Sala · Meus documentos (receitas/atestados) · Meus dados · Ajuda · Privacidade |
| Médico | Início (agenda do dia) · Agenda (consultas + disponibilidade) · Pacientes · Atendimento/Prontuário (assinado + receita/atestado) · Meu perfil (CRM, certificado digital, locais de atendimento) · Ajuda |
| ADM Clínica | Início · Agenda da clínica · Pacientes · Equipe (médicos, CRM) · Serviços e preços · Financeiro · Dados da clínica · Ajuda |
| Médico ADM MedSync | Início (pendências) · Clínicas (ativação, RT da clínica) · Médicos (verificação de CRM) · Auditoria clínica · Ajuda |
| Suporte | Fila de ajuda · Clínicas (onboarding assistido) · **Vínculos médico ↔ clínica** (CRM ↔ CNPJ) · Usuários (reset de acesso) |
| DPO | Solicitações de titular · Trilha de auditoria · Incidentes |

Ordem de construção e status de cada tela: `docs/02-design/SCREEN_REBUILD_PLAN.md`.

## Decisões tomadas em 24/09/2026

### 1. Modelo: software para médicos e clínicas
O MedSync é o software usado por **médicos e clínicas** (como iClinic/Feegow), não um prestador com médicos próprios.
- **O médico se cadastra sozinho**, identificado por **CRM + UF** (CNPJ não é obrigatório: CFM 2.314 art. 17 §1º prevê
  o médico pessoa física). Ao se cadastrar, ele ganha o próprio **consultório** no MedSync.
- **A clínica se cadastra** com CNPJ; o ADM Clínica gerencia a equipe.
- **O Suporte vincula** um médico já cadastrado a uma clínica (CRM ↔ CNPJ). O médico pode ter vários vínculos.
- **Guarda do prontuário** (CFM 1.821/2007: o prontuário é da instituição onde o paciente foi atendido, "unidade de
  saúde ou consultório"): atendimento no consultório do médico → guarda do médico; atendimento pela clínica → guarda
  da clínica/RT dela. O MedSync é operador (LGPD) e arquivamento terceirizado (CFM 2.314 art. 3º §4).
- **Médico ADM MedSync** é o RT da plataforma (art. 17) e acessa prontuário de terceiros só por justificativa, com
  previsão no contrato com médico/clínica.
- **Médico que se desvincula** de uma clínica mantém acesso aos prontuários dos pacientes que ele atendeu lá, durante
  todo o prazo legal (CFM 2.314 art. 3º §8).

### 2. Módulo empresa/benefício: remover
Sai tudo: telas (Empresas parceiras, Elegibilidade de beneficiários, Relatórios B2B, Financeiro empresa), endpoints,
perfis `CompanyAdmin`/`CompanyFinance`/`CompanyAuditor`/`OccupationalHealthAdmin`/`PlatformFinance`, a regra de preço
"coberto pelo benefício" e as specs E2E correspondentes. Entidades e migração de remoção de tabelas numa entrega
própria, **depois de um commit limpo** para a remoção ser revertível pelo git.

## O que muda no modelo de dados

| Hoje (verificado no código) | Passa a ser |
|---|---|
| `Clinic` é o tenant; "clínica" era também a porta de entrada do cadastro | `Clinic` = **local de atendimento**: consultório do médico (sem CNPJ) ou clínica (com CNPJ) |
| Usuário pode ter `ClinicMembership` em várias clínicas, mas o login abre sempre a mais antiga (`memberships[0]`, `ApiEndpoints.cs` ~l.1609) | Após o login, o usuário com mais de um local **escolhe** e pode **trocar de local** sem sair |
| `Doctor` tem `ClinicId` (um registro por clínica, CRM repetido) | Mantém um registro por local (caminho 2 do ADR-0001), todos ligados ao mesmo `User`; CRM + UF únicos por usuário |
| `Company`, `CompanyEmployee`, `CompanyContract`, `BenefitPlan`, `EmployeeEligibility` | Removidos |

## Consequências

- Migração: usuários com papéis removidos recebem o papel de destino ou são apagados (módulo empresa); seed passa de
  12 para 6–7 usuários demo.
- E2E: specs de empresa/financeiro/auditor (`company-*`, `finance-*`, `business-reports`, `eligibility-*`,
  `multi-company-seed`) saem com o módulo; `audit-events` e `profile-experience` são reescritas para os 6 perfis.
- Cadastro público passa a ter duas portas dentro de "Criar conta": **Sou médico** (CRM) e **Sou clínica** (CNPJ).
- `ROLE_LABELS`, `navigation` e `navigationLabel()` no front, e `PERMISSION_MATRIX.md`, mudam na mesma entrega.
- A mudança de `CanViewClinical` exige tela de justificativa e novo evento de auditoria — é a primeira tela do perfil
  Médico ADM a ser construída.
