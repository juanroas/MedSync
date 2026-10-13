# ADR-0005: Recepção, consultório do médico e troca de local

## Status

**Aceito em 13/10/2026**, a pedido do usuário, ao montar a massa de teste com dois fluxos: clínica (ADM cadastra o
médico, a recepção cadastra o paciente e agenda) e consultório (o próprio médico cadastra o consultório e pode ter ou
não uma recepcionista). Complementa o ADR-0003 (seis perfis), que passa a ter sete.

## Contexto

- O ADR-0003 deixou a recepção dentro do ADM da clínica. Na prática a recepcionista não deve mexer em equipe, dados da
  clínica nem auditoria; ela cadastra paciente e agenda.
- Médico que atende sozinho precisa se cadastrar sem uma clínica por trás, e muitas vezes não tem recepcionista.
- O mesmo médico pode atender numa clínica e no próprio consultório. O login escolhia sempre o primeiro vínculo, sem
  como trocar.

## Decisão

1. **Sétimo perfil: Recepção (`Receptionist`).** Cadastra e edita pacientes (dados cadastrais), agenda, cancela e
   acompanha a agenda da clínica; nunca vê conteúdo clínico, equipe, dados da clínica nem auditoria. Quem cria a conta
   é o ADM da clínica (ou o médico dono do consultório) em Equipe e acessos.
2. **Consultório = clínica de um médico dono.** O cadastro "Sou médico" cria a clínica com CNPJ, endereço e o médico
   como responsável técnico; a conta recebe os perfis Médico e ADM. Fica "em análise" até o Médico ADM ativar, como
   qualquer clínica.
3. **O dono do consultório nunca fica travado.** Ele sempre pode cadastrar paciente e agendar (como ADM). Incluir uma
   recepcionista é opcional e pode ser feito depois em Equipe e acessos; isso não tira do médico a possibilidade de
   agendar quando a recepcionista falta. Por isso não há uma chave "tenho recepcionista": a existência da conta de
   recepção já diz isso.
4. **Troca de local.** Quem tem vínculo com mais de uma clínica escolhe o local no topo da tela
   (`POST /auth/switch-clinic`); a sessão passa a valer só para o local escolhido. Os dados de cada local continuam
   separados (prontuário é do estabelecimento onde a consulta aconteceu).

## Consequências

- `AccessRules.ManagePatients`, `ViewPatients`, `ManageAppointments` e `ViewAllAppointments` incluem `Receptionist`;
  `ManageDoctors`, Dados da clínica, Equipe e Auditoria continuam só do ADM.
- Matriz de permissões, mapa de telas e seed de demonstração (`recepcao@medsync.dev`) atualizados no mesmo PR.
- Consultório de pessoa física (CPF, sem CNPJ) fica para depois: hoje o cadastro exige CNPJ.
