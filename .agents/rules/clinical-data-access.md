# Regra: acesso a conteúdo clínico

Aplica-se a qualquer endpoint, tela, relatório, exportação ou log que toque prontuário, anexos clínicos,
medicações, receitas, atestados, notas da consulta ou conteúdo da chamada.

Base: Resolução CFM 2.314/2022 art. 3º (§3 guarda pelo diretor/responsável técnico, §6 cópia ao paciente,
§8 acesso do médico assistente) e Código de Ética Médica art. 85 (vedado permitir acesso ao prontuário por quem
não tem obrigação de sigilo profissional). Decisão de perfis: `docs/10-decisions/ADR-0003-seis-perfis-e-acesso-ao-prontuario.md`.

## C1 — Quem pode ver
| Perfil | Conteúdo clínico |
|---|---|
| Paciente | só o próprio |
| Médico | consultas em que é o assistente + histórico desses pacientes |
| Médico ADM MedSync | qualquer um, **só com justificativa registrada** (C3) |
| Suporte, DPO, ADM Clínica | **nunca** — só metadados (existe, status, datas, quem acessou) |

Um usuário com dois perfis (ex.: `Doctor` + `ClinicAdmin`) recebe a soma, mas cada acesso é avaliado pelo perfil
que o autoriza.

## C2 — A decisão é da API
Toda checagem acontece em `apps/api/src/MedSync.Api/ApiEndpoints.cs` (`CanViewClinical`,
`CanViewPatientClinicalHistory` e afins). Esconder botão no front não é controle de acesso. DTO de listagem para
perfis sem acesso clínico **não carrega** o campo clínico (padrão já usado em `GetPatients` com `canSeeMedications`).

## C3 — Acesso com justificativa (Médico ADM)
Abrir prontuário que não é do próprio atendimento exige motivo (lista fechada: auditoria de qualidade, incidente,
pedido do titular, ordem judicial) + texto curto. O acesso gera evento de auditoria com o motivo, visível para o DPO.
Sem exportação em massa pela interface.

## C4 — Todo acesso deixa rastro
Leitura de conteúdo clínico gera `audit.Add(...)` (padrão `ClinicalRecord.Read`). Tentativa negada também
(`"Denied"`), como já é feito nos endpoints de privacidade.

## C5 — Nada clínico em lugar errado
Proibido em: logs de aplicação, mensagens de erro, e-mails/WhatsApp de lembrete, telas de Suporte/DPO/ADM Clínica,
relatórios agregados, nome de arquivo e URL. Lembrete de consulta diz data, hora e médico — nunca motivo ou
especialidade sensível.

## Checklist de PR
- [ ] Identifiquei qual perfil lê cada campo clínico novo e a checagem está na API.
- [ ] Perfis sem acesso recebem DTO sem o campo (não só escondido na tela).
- [ ] Leitura e negação geram evento de auditoria.
- [ ] Nenhum dado clínico em log, notificação, URL ou tela administrativa.
