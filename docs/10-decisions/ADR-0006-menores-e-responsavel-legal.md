# ADR-0006: Paciente menor de idade e responsável legal

## Status

**Aceito em 31/10/2026 para cadastro e acesso**, depois da reunião de testes em que o cadastro de criança sem CPF ficou
sem solução. A regra de sigilo do adolescente (abaixo) continua **pendente de decisão do responsável médico**.

## Contexto

- O cadastro exigia CPF e e-mail próprios para todo paciente. Criança pequena muitas vezes não tem CPF: a certidão de
  nascimento consultada na reunião não trazia o número.
- CFM 2.314/2022: o paciente **ou seu representante legal** autoriza a telemedicina e recebe cópia dos dados.
- Não há norma que obrigue CPF para cadastrar criança em prontuário. A Lei 14.534/2023 trata do CPF como número único em
  serviços públicos. Em receita controlada, o material da RDC Anvisa 1.000/2025 aceita registrar que o paciente não possui
  CPF, com a data de nascimento.
- LGPD art. 14: dado de criança é tratado no melhor interesse dela, com consentimento específico de um dos pais ou
  responsável.

## Decisão

1. Menor de 18 anos: **responsável legal obrigatório** (nome, CPF e vínculo) e **CPF do paciente opcional**. Adulto segue
   com CPF obrigatório. A API decide (`PatientRules`); a tela só acompanha.
2. A conta é **do responsável**. Um mesmo login pode ter vários pacientes (ele e os filhos): o responsável vê as consultas,
   entra na sala, aceita o termo e baixa os documentos deles. Por isso e-mail e conta só são únicos para quem não é
   dependente (índices filtrados por `GuardianName`).
3. Sem CPF, a recepção encontra a criança pelo CPF do responsável; documentos imprimem "não possui", a data de nascimento
   e o responsável. O CPF pode ser incluído depois, uma vez.
4. "Meu perfil" é sempre do titular da conta, nunca de um dependente.

## Pendente: sigilo do adolescente

O art. 74 do Código de Ética Médica veda revelar a pais ou responsáveis o que foi tratado com adolescente que tenha
discernimento, salvo risco. Como a conta é do responsável, hoje ele veria prontuário e documentos do adolescente. Até o
responsável médico decidir, a orientação é não usar a conta do responsável para adolescente que peça sigilo. Falta definir
a idade de corte (o parecer do CFM usa 12 anos) e o que o responsável enxerga dali em diante.

## Alternativas descartadas

- **CPF do responsável no campo do paciente**: quebra a unicidade e identifica a pessoa errada na receita.
- **Login próprio para a criança**: criança não tem e-mail, e quem acompanha o atendimento é o responsável.

## Consequências

- O paciente que completa 18 anos continua como dependente até a clínica ajustar o cadastro: ainda não há transição
  automática.
- Toda checagem "o paciente é o dono desta consulta" continua valendo, porque o `UserId` da criança é o do responsável.

## Referências

- [Resolução CFM 2.314/2022](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf)
- [Lei 14.534/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14534.htm)
- [Guia de telemedicina na pediatria (SBP)](https://www.sbp.com.br/fileadmin/user_upload/Guia_Telemedicina_-_AGO_2022.pdf)
- [Memed: RDC 1.000/2025 e paciente sem CPF](https://www.memed.com.br/receituario-azul-amarelo/receita-digital/controlados/rdc1000-2025-da-anvisa-guia-completo-da-prescricao-digital-para-medicos)
