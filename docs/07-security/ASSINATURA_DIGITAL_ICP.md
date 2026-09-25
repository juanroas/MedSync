# Assinatura digital ICP-Brasil das receitas — pesquisa e plano

Status: pesquisa de 25/09/2026. Regra de produto: `.agents/rules/medical-documents.md` (D1–D6).

## Por que ICP-Brasil e não uma assinatura própria

| Documento | Mínimo exigido | Fonte |
|---|---|---|
| Atestado e receita de controlado, eletrônicos | Assinatura **qualificada** (ICP-Brasil) | [Lei 14.063/2020, art. 13](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm) |
| Qualquer documento emitido em telemedicina | ICP-Brasil | [Res. CFM 2.314/2022, art. 13](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf) |

O MedSync é só telemedicina, então login + código não serve. A assinatura sai do **certificado em nuvem do próprio
médico** — o CFM dá o VIDaaS de graça a todo médico com CRM ativo.

## Como integrar: IntegraICP (Valid)

A Valid encaminha integradores para o **IntegraICP**, uma API única sobre os PSCs em nuvem do Brasil
([FAQ](https://validcertificadora.com.br/pages/integraicp-faq), [integração via API](https://validcertificadora.com.br/pages/psc-integracao-via-api)).

- PSCs atendidos: **VIDaaS, BirdID, SafeID, SerproID, RemoteID** — o médico usa o certificado que já tem.
- Acesso por um **Canal** (Channel), equivalente a uma chave de API, pedido ao comercial Saúde da Valid.
- **Não existe ambiente de homologação separado**: o mesmo endpoint serve teste e produção; muda só o canal.
  Para testar, o médico usa o próprio certificado real (o gratuito do CFM).
- **Só o hash sai do MedSync** (SHA-256 em Base64); o documento não é enviado. Formatos: `RAW` e `CMS` (RFC 5652).
- Sessão do médico: credencial de até **168 h** (7 dias) — ele autoriza uma vez e assina várias receitas.
- Referência técnica: [developers.integraicp.com.br](https://developers.integraicp.com.br/api-reference/v3/index.html)
  — **fechada ao público** (403); vem com o canal.

Fluxo (nomes da FAQ; confirmar na referência quando o canal chegar):

1. `GET /authentications` com `channelId`, `secret_data` (PKCE *code challenge*), `callback_uri` e, opcional,
   `subject_key` (CPF do médico sem pontuação) → lista de PSCs ou `autostart=true`.
2. O médico aprova no app do certificado (VIDaaS no celular).
3. O IntegraICP chama o `callback_uri` com o `credentialId`.
4. `GET /credentials/{credentialId}` com `secret_data` = *code verifier*.
5. `POST /signatures` com o `contentDigest` (SHA-256 Base64) → assinatura `CMS`.

## O que fica do lado do MedSync

O IntegraICP devolve a assinatura de um hash; **o PDF assinado (PAdES) é montado pelo MedSync**:

1. Gerar o PDF da receita no servidor (campos do art. 13) — PDFsharp 6.2 (licença MIT).
2. Reservar o campo de assinatura; PDFsharp entrega o intervalo de bytes a assinar a um `IDigitalSigner`.
3. O `IDigitalSigner` do MedSync calcula o SHA-256, chama `POST /signatures` (CMS) e devolve o CMS.
4. O PDFsharp grava o CMS no `/Contents`; o PDF vai para o armazenamento e a receita vira `Signed`.
5. A farmácia confere em [validar.iti.gov.br](https://validar.iti.gov.br).

As etapas 1, 2 e 4 não dependem da Valid e já podem ser testadas com um certificado de teste.

## Perguntas para a Valid (junto com o pedido do canal)

1. Há canal de teste gratuito ou período de avaliação? Qual o custo por assinatura/mês em produção?
2. O `CMS` devolvido já inclui os atributos assinados (`messageDigest` = nosso `contentDigest`, `signingCertificateV2`)
   e a **política de assinatura ICP-Brasil (AD-RB)** exigida para PAdES? Ou precisamos montar os atributos e usar `RAW`?
3. A cadeia de certificados vem na resposta de `/credentials` ou de `/signatures`?
4. O `callback_uri` é redirecionamento do navegador ou chamada servidor-a-servidor? Precisa estar pré-cadastrado?
5. Carimbo do tempo: está incluído ou é contratado à parte?

## E-mail pronto para enviar

> Para: ecleoneide.santos@valid.com — Assunto: Interesse em integração (IntegraICP)
>
> Olá, somos o MedSync, plataforma de telemedicina para médicos e clínicas. Queremos integrar a assinatura de
> receitas e atestados com certificados em nuvem (VIDaaS/CFM e demais PSCs) via IntegraICP. Poderiam nos habilitar
> um canal para testes e informar condições comerciais? Também gostaríamos de confirmar: (1) se o CMS devolvido
> inclui atributos assinados e a política ICP-Brasil para PAdES; (2) se a cadeia de certificados vem na resposta;
> (3) como funciona o `callback_uri` (redirecionamento ou servidor) e se precisa ser pré-cadastrado.
> URL de callback em homologação: `https://<dominio-da-api>/signature/callback`.

## Envio ao paciente

- **WhatsApp**: link `wa.me` aberto no WhatsApp do próprio médico, com mensagem pronta e o link da receita; sem custo e
  sem vínculo do número com o MedSync. Só para receita assinada.
- **E-mail**: SMTP da Hostinger quando o domínio estiver pronto.
- Nos dois casos vai um link que exige login, nunca o PDF anexado (regra D5).
