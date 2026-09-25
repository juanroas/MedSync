# Regra: receitas, atestados e documentos médicos

Aplica-se a qualquer funcionalidade que gere receita, atestado, pedido de exame, relatório ou laudo.

Base: Resolução CFM 2.314/2022 art. 13 e Resolução CFM 2.299/2021 (documento médico eletrônico).
Contexto de mercado: `docs/01-product/MARKET_ANALYSIS_CLINIC_SOFTWARE.md` §4.

## D1 — Integrar, não construir assinatura
Assinatura digital ICP-Brasil (NGS2) é feita por provedor credenciado. Caminho padrão: integração Memed (API gratuita
para software parceiro, assinatura via Soluti). O MedSync **não** implementa assinatura, carimbo de tempo nem
validação ICP-Brasil próprios.

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

## D4 — Nada de documento falso ou de teste que pareça real
Sem PDF de receita gerado localmente "para demonstrar". Em ambiente demo, usar o sandbox do provedor e marcar
visualmente como "DEMONSTRAÇÃO — sem validade".

## D5 — Paciente recebe cópia
Documento emitido aparece em "Meus documentos" do paciente (art. 3º §6: direito à cópia).
