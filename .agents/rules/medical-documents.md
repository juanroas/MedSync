# Regra: receitas, atestados e documentos médicos

Aplica-se a qualquer funcionalidade que gere receita, atestado, pedido de exame, relatório ou laudo.

Base: Resolução CFM 2.314/2022 art. 13 e Resolução CFM 2.299/2021 (documento médico eletrônico).
Contexto de mercado: `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md` §4.

## D1 — Fluxo nosso, assinatura ICP-Brasil do médico
O MedSync monta, guarda, imprime e envia o documento. A **assinatura** é sempre ICP-Brasil, feita com o certificado do
próprio médico por um PSC credenciado (padrão: API de nuvem do **VIDaaS**, que é o certificado gratuito do CFM). O
MedSync **não** cria assinatura própria (login + código não vale: Lei 14.063/2020 art. 13 e CFM 2.314 art. 13), nem
carimbo de tempo ou validação ICP-Brasil próprios. Integração Memed segue como alternativa, não como requisito.

## D2 — Conteúdo obrigatório (CFM 2.314, art. 13)
Todo documento emitido a distância registra no prontuário:
1. médico: nome, **CRM** (número e UF) e endereço profissional;
2. paciente: identificação e **endereço/local informado do atendimento**;
3. data e hora;
4. assinatura digital ICP-Brasil (ou outro padrão legalmente aceito);
5. a indicação de que foi emitido **em modalidade de telemedicina**.
Faltou um campo → o botão de emitir fica desabilitado com o motivo visível (ex.: "Cadastre seu CRM em Meu perfil").

## D3 — Só o médico assistente emite
Quem emite é o médico da consulta, com CRM cadastrado. Médico ADM, ADM Clínica, Suporte e DPO não emitem.

## D4 — Nada de documento que pareça válido sem ser
Enquanto o documento não tiver assinatura ICP-Brasil real (rascunho, ambiente de homologação, sandbox do PSC), a
visualização e a impressão levam a marca "SEM VALIDADE — rascunho/homologação". Não gerar PDF "de exemplo".
O simulador de assinatura (`SIGNATURE_PROVIDER=simulator`) segue a mesma regra: tela dizendo que não é o app do
certificado, PDF com "SIMULAÇÃO — SEM VALIDADE" e a receita marcada como simulada no banco e na auditoria.

## D5 — Paciente recebe cópia
Documento emitido aparece para o paciente em Minhas consultas → "Documentos (n)" da consulta (art. 3º §6: direito à
cópia). WhatsApp e e-mail levam só um link que exige login; nunca o PDF anexado. No prontuário, documento assinado tem
"Enviar por WhatsApp" (wa.me com o celular do paciente): mensagem curta, sem o título do documento, e o link da página
`/documento/{id}`; sem sessão, o login volta para ela.

## D7 — Laudo em branco e declaração de comparecimento (28/10/2026)
- Laudo: documento livre no modelo padrão (`MedicalDocumentPdf.cs`): cabeçalho do local e do médico, título
  centralizado em negrito, paciente, texto, cidade e data, assinatura; marca d'água com o nome do local de atendimento.
  Quantos o médico quiser por consulta. Na telemedicina, só assina com o local informado pelo paciente (D2).
- Declaração de comparecimento: emitida e **assinada pelo médico** depois de concluir a consulta, com entrada e saída;
  uma por consulta. Não sai mais nada em nome da plataforma nem sem assinatura.
- O paciente só vê depois de assinado (mesma assinatura da receita, D1/D4). O laudo é conteúdo clínico (C1); a
  declaração assinada também vai para ADM e Recepção do local.

## D8 — "Concluir consulta" e "Encerrar atendimento" (31/10/2026)
São dois passos. **Concluir** termina a consulta (chamada, se houver) e volta para a agenda: prontuário e documentos
seguem editáveis. **Encerrar atendimento** é o fim do processo: só o médico da consulta, com a consulta concluída, o
registro clínico salvo e nenhum rascunho de receita ou documento. Depois disso a API recusa (409, com auditoria) toda
escrita da consulta: prontuário, receita, documento, anexo, retorno e desfecho. Tudo continua disponível para leitura.
Declaração não assinada não pode mais ser emitida: a janela de confirmação avisa.
Consulta que não aconteceu também não recebe nada (06/11/2026, `ConsultationRules.WriteBlock`): cancelada, "não
compareceu" ou online cuja sala não abriu até 30 minutos depois do fim. Presencial "aguardando conclusão" segue aberta.
Trava de auxílio (06/11/2026): enquanto houver consulta do dia, no mesmo local, concluída e não encerrada, a API recusa
iniciar a sala ou concluir outra (`code: pending_closure`), e a agenda mostra qual falta encerrar.

## D9 — Solicitação de exames e retorno (31/10/2026)
- Solicitação de exames: documento do tipo `ExamRequest`, com o mesmo modelo, a mesma assinatura e o mesmo acesso do laudo
  (conteúdo clínico, D7). Um exame por linha; o paciente só vê depois de assinado.
- Retorno: quantos dias depois da consulta (`FollowUpDays`). É conduta, então só o médico da consulta e o paciente veem;
  a API devolve nulo para os demais perfis.

## D6 — Receita eletrônica de controlado e antimicrobiano só com SNCR; presencial vai em papel
RDC Anvisa 1.000/2025: receita **eletrônica** de controle especial, notificações A/B e receitas de retenção
(antimicrobiano e GLP-1) precisam do número do SNCR; receita em papel não. Na receita de controle especial e de retenção
o número vem da API do SNCR, pedido pela plataforma integrada: o médico autoriza, não solicita em site nenhum. A numeração
de notificação A/B continua pedida à Vigilância Sanitária. Decidido com o responsável médico em 13/10/2026 (código em
`PrescriptionRules.cs`, testado em `PrescriptionRulesTests`):
- Controle especial (C1/C5): assinatura eletrônica bloqueada até o MedSync emitir o número do SNCR.
- Antimicrobiano: a transição sem número terminou em 29/10/2026 (informe da Anvisa; `SNCR_ELECTRONIC_GRACE_UNTIL`). Desde
  30/10/2026 a assinatura eletrônica está bloqueada até o MedSync se integrar à API do SNCR.
- Sempre existe uma segunda via de emissão, para o paciente não esperar a plataforma (decisão de 13/10/2026):
  - Consulta **presencial**: "Imprimir para assinar à mão" — fecha a receita, sai sem a marca de rascunho, com rodapé
    "Emitida em consulta presencial" e linha para a assinatura à caneta.
  - **Telemedicina**: "Emitir para assinar fora do MedSync" — fecha a receita e libera ao médico o PDF sem assinatura;
    o médico assina com o próprio certificado ICP-Brasil (CFM 2.314 art. 13) e envia ao paciente (ex.: WhatsApp).
    Controle especial e antimicrobiano por telemedicina dependem do SNCR no sistema que o médico usar: a tela avisa que,
    assinada fora de um sistema integrado, a farmácia pode recusar (a Anvisa não aceita documento digitalizado nem
    assinado depois de impresso).
  - O evento `Prescription.IssuePaper` fica na auditoria; o paciente não baixa esse PDF pelo MedSync.
Notificações A/B não são emitidas pelo MedSync. Os dois modelos de 2 vias exigem quantidade, endereço do paciente e da
clínica; sem endereço profissional próprio, o médico usa o endereço da clínica.
