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

## D5 — Paciente recebe cópia
Documento emitido aparece em "Meus documentos" do paciente (art. 3º §6: direito à cópia). WhatsApp e e-mail levam
só um link que exige login; nunca o PDF anexado.

## D6 — Controlados ficam de fora até o SNCR
Receita de controle especial e notificações A/B só por serviço integrado ao SNCR da Anvisa. Até lá, a tela avisa que
controlados não são emitidos pelo MedSync.
