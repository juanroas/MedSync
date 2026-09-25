# Análise de mercado — software de clínica com telemedicina

Data: 24/09/2026. Origem: levantamento do médico ADM ("iClinic básico R$ 100 com agenda, agendamento online,
prontuário e prescrição; com teleconsulta R$ 300/mês; colegas antigos pagaram licença única").

Regra deste documento: **cada número tem fonte**. Onde só achei fonte secundária (blog de concorrente), está marcado
como *não confirmado*. Complementa `MARKET_REFERENCES.md`, que cobre marcas de telemedicina para o consumidor
(Dr.Online, Doctoralia marketplace, Clicou Consulta) mas não o mercado de **software de gestão de clínica**, que é
onde o MedSync compete depois do ADR-0002.

## 1. O levantamento do médico ADM confere

| Afirmação | Verificado | Fonte |
|---|---|---|
| iClinic básico ~R$ 100 com agenda, agendamento online, prontuário, prescrição | **Sim** — Starter R$ 99/mês | [iclinic.com.br/precos](https://iclinic.com.br/precos/) |
| iClinic com teleconsulta ~R$ 300/mês | **Sim** — Premium R$ 299/mês, teleconsultas ilimitadas | [iclinic.com.br/precos](https://iclinic.com.br/precos/), [iclinic.com.br/premium](https://iclinic.com.br/premium/) |
| Programas antigos com pagamento único | **Sim, mas o mercado abandonou** — ProDoctor vendia licença em CD com atualizações cobradas à parte; hoje vende assinatura em nuvem | [prodoctor.net/faq](https://prodoctor.net/faq), [prodoctor.net/cloud](https://prodoctor.net/cloud/) |

Detalhe que muda a conta: **o iClinic cobra por profissional de saúde**. Clínica com 3 médicos no Premium paga
3 × R$ 299 = R$ 897/mês. Nos planos abaixo do Premium, teleconsulta é pacote extra: +R$ 35/mês a cada 10.

## 2. Concorrentes — preço e o que vem no plano

| Produto | Plano de entrada | Plano com telemedicina | Unidade | Fonte |
|---|---|---|---|---|
| iClinic | Starter **R$ 99** — agenda, agendamento online, prontuário, prescrição digital, lembretes, assinatura digital | Premium **R$ 299** (ilimitada); Pro R$ 169 + R$ 35/10 teleconsultas | por profissional | [oficial](https://iclinic.com.br/precos/) |
| Feegow | Starter **R$ 129** — prontuário, TISS, prescrição digital (Mevo) | não detalhado na página de preços | por profissional | [oficial](https://feegowclinic.com.br/precos-e-planos) |
| Amplimed | Lite **a partir de R$ 89** — cadastro, agenda, confirmação por WhatsApp, prontuário, financeiro simples | telemedicina ilimitada só no "Personalizado" (sob consulta) | por profissional | [oficial](https://www.amplimed.com.br/blog/valor-da-amplimed/) |
| Doctoralia Pro | Starter **R$ 429** — perfil no marketplace + agendamento online, **sem** prontuário e sem telemedicina | Plus **R$ 529** — prontuário, prescrição, telemedicina; IA de notas +R$ 199 | por profissional (anual) | [oficial](https://pro.doctoralia.com.br/preco) |
| Ninsaúde Clinic | R$ 199, secretárias grátis — *não confirmado* (página oficial não mostra preço) | — | por profissional | [secundária](https://www.clinicasyspro.com.br/clinicasyspro-vs-ninsaude.html) |

### O que é obrigatório para competir ("mesa posta")
Presente no plano de entrada de **todos** os concorrentes com preço confirmado:
1. Agenda do profissional + agendamento online pelo paciente.
2. Prontuário eletrônico.
3. Prescrição digital com assinatura (iClinic nativo; Feegow via Mevo; Doctoralia a partir do Plus).
4. Lembrete/confirmação de consulta (e-mail; WhatsApp a partir do 2º plano no iClinic, já no Lite da Amplimed).

Diferencial pago (sobe o preço): telemedicina ilimitada, financeiro completo, TISS/convênios, IA de notas, marketing.

### Leitura de preço
- Faixa de mercado: **R$ 89 a R$ 299 por profissional/mês** para software de clínica; telemedicina ilimitada está
  no topo (R$ 299 no iClinic) ou empacotada com marketplace (R$ 529 no Doctoralia).
- Hipótese para validar com clínicas (não é decisão): um plano único com telemedicina ilimitada e prescrição
  incluídas, abaixo de R$ 299 por profissional, compete direto com o iClinic Premium. **Precisa de 5–10 conversas
  com médicos/clínicas antes de virar preço.**

## 3. Onde o MedSync está hoje (verificado no código em 24/09/2026)

| Item "mesa posta" | MedSync | Onde |
|---|---|---|
| Agenda + disponibilidade do médico | **Tem** | `consultas/page.tsx` (Minha disponibilidade), `DoctorAvailabilitySlot` |
| Paciente solicita consulta | **Tem**, mas só paciente já cadastrado na clínica — não há página pública de agendamento | `consultas/nova/page.tsx` |
| Prontuário eletrônico | **Tem** (texto, anexos, histórico, ditado por voz) | `prontuario/[appointmentId]/page.tsx` |
| Prescrição/atestado digital | **Não tem** — nenhuma entidade, tela ou integração | busca por `Prescri|Receit|Atestado|Memed` em `apps/`: 0 resultados |
| Lembrete de consulta | **Não tem** | — |
| Telemedicina | **Tem, incluída**, com criptografia ponta a ponta (LiveKit E2EE) | `components/consultation-room.tsx` |
| Recuperar senha pelo próprio usuário | **Não tem** ("peça ao administrador") | `login/page.tsx` |

Possíveis diferenciais (não aparecem nas páginas de preço consultadas — confirmar com demo dos concorrentes antes de
usar em material comercial): vídeo com criptografia ponta a ponta; portal LGPD do titular com fila; trilha de
auditoria de acesso ao prontuário.

## 4. O que a regulação exige (fonte primária)

Resolução CFM nº 2.314/2022 (telemedicina), lida no [texto oficial do CFM](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf):

| Artigo | Exige | Impacto no MedSync |
|---|---|---|
| Art. 3º §2 | Registro eletrônico (SRES) atendendo **NGS2**, padrão ICP-Brasil | Requisito de conformidade do prontuário. Concorrentes provam com certificação SBIS (Feegow anuncia SBIS). MedSync não tem — pendência de compliance. |
| Art. 3º §3 | Com empresa intermediando, a **guarda do prontuário é do diretor/responsável técnico** | Base legal do perfil **Médico ADM**: ele é o guardião, não um "super-usuário". |
| Art. 3º §4 | Arquivamento terceirizado: responsabilidade **compartilhada por contrato** | Se o MedSync é só o software da clínica, o guardião é o RT **da clínica**; o MedSync precisa de contrato de operador. |
| Art. 3º §6 e §8 | Paciente tem direito a cópia; médico assistente mantém acesso durante todo o prazo legal | Exportação de prontuário para paciente e médico — hoje não existe. |
| Art. 6º §2 | Doença crônica: consulta presencial a cada **≤ 180 dias** | Alerta para o médico em acompanhamento longo por vídeo. |
| Art. 13 | Receita/atestado a distância exige nome, **CRM**, endereço profissional, dados e local do paciente, data/hora, **assinatura ICP-Brasil** e a menção "telemedicina" | Define o que a futura tela de receita tem que gerar. |
| Art. 15 | Termo de consentimento (TCLE) faz parte do registro do paciente | **Já existe** (`/consent/term`). |
| Art. 17 | Plataforma de telemedicina: sede no Brasil, **inscrição no CRM** e **médico responsável técnico** | O MedSync, como empresa, precisa de RT inscrito — é o Médico ADM. |

Outras normas conferidas:
- Código de Ética Médica, art. 85: é vedado ao médico permitir acesso ao prontuário por **pessoas não obrigadas ao
  sigilo profissional** ([CFM](https://portal.cfm.org.br/images/PDF/cem2019.pdf)). Suporte, DPO e ADM de clínica
  (quando não médico) não veem conteúdo clínico.
- Resolução CFM nº 2.299/2021: documento médico eletrônico com assinatura ICP-Brasil NGS2, validável no ITI ou no
  validador do CFM ([texto](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2021/2299_2021.pdf)).
- Prescrição: a **Memed** oferece integração por API **gratuita** para softwares parceiros, com assinatura digital
  gratuita em parceria com a Soluti ([memed.com.br/parceiro-software](https://memed.com.br/parceiro-software/)).
  O CFM mantém um prescritor gratuito ([prescricaoeletronica.cfm.org.br](https://prescricaoeletronica.cfm.org.br/)).
  Integrar é muito mais barato e seguro do que construir assinatura ICP-Brasil.

## 5. Conclusões (o que muda no produto)

1. **Posicionamento**: o MedSync compete com iClinic/Feegow/Amplimed (software da clínica), não com Doctoralia
   (marketplace). O argumento é "telemedicina segura incluída + prontuário + receita, por menos que o Premium".
2. **Prioridade 1 — assinatura digital do médico**: prescrição e atestado via integração Memed (art. 13 define o
   conteúdo) **e** assinatura ICP-Brasil de cada registro do prontuário (CFM 1.821, arts. 3º–5º; ver §6). Sem isso o
   médico não fecha a consulta no MedSync e ainda teria que manter papel.
3. **Prioridade 2 — lembrete de consulta** (e-mail primeiro; WhatsApp depois, que tem custo por mensagem).
4. **Prioridade 3 — recuperar senha pelo próprio usuário**: todos os concorrentes têm; hoje depende de um administrador.
5. **Compliance antes de vender**: inscrição da empresa no CRM com RT (art. 17) e plano para NGS2/SBIS (art. 3º §2).
   Não é código — é pré-requisito comercial.
6. **Perfis**: 6 perfis (ADR-0003) cobrem o mercado. Nos concorrentes, a **secretária** é usuária padrão (e às vezes
   grátis) — no MedSync ela entra como "ADM Clínica" até uma clínica pedir um perfil mais restrito.
7. **Módulo empresa/benefício** (Empresas, Elegibilidade, Relatórios B2B): nenhum concorrente de software de clínica
   tem isso no plano de entrada. **Decidido em 24/09: remover** (ADR-0003).
8. **Venda**: software para **médicos e clínicas**, cobrado por profissional. O médico se cadastra sozinho (CRM) e
   pode ser vinculado depois a uma ou mais clínicas (CNPJ) — ver §6 e ADR-0003.

## 6. Perguntas de 24/09 respondidas

### O prontuário 100% online é permitido? O médico deixa de imprimir?
**Sim, com uma condição que o MedSync ainda não cumpre.** Resolução CFM 1.821/2007
([texto oficial](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2007/1821_2007.pdf)):
- art. 3º: o sistema eletrônico **elimina a obrigatoriedade do papel** desde que atenda integralmente ao **NGS2**;
- art. 4º: só com NGS1 **não** se pode eliminar o papel;
- art. 5º: NGS2 exige **assinatura digital ICP-Brasil**;
- art. 7º: prontuário eletrônico tem guarda **permanente**; art. 8º: em papel, mínimo 20 anos;
- art. 10 (selo CFM–SBIS) foi revogado pela Resolução CFM 2.218/2018 — não existe mais selo oficial CFM, mas o
  requisito NGS2 continua.
- Lei 13.787/2018, art. 6º: prontuário em papel ou digitalizado pode ser eliminado após **20 anos do último
  registro**, ou devolvido ao paciente ([Imprensa Nacional](https://www.in.gov.br/web/guest/materia/-/asset_publisher/Kujrw0TZC2Mb/content/id/57221806/do1-2018-12-28-lei-n-13-787-de-27-%20de-diciembre-de-2018-57221499)).

Consequência: hoje as anotações do prontuário do MedSync **não são assinadas digitalmente**, então pela regra o
médico ainda teria que manter papel. Para entregar a comodidade de "não precisa imprimir nem salvar arquivo", cada
registro do prontuário precisa ser assinado com ICP-Brasil — isso sobe para prioridade junto com a receita.

Facilitador: o CFM dá a todo médico adimplente um **certificado ICP-Brasil em nuvem (A3), gratuito**, emitido pela
AC VALID (Resolução CFM 2.296/2021) ([CFM Virtual](https://crmvirtual.cfm.org.br/BR/servico/emissao-certificado-digital---padrao-icp-brasil---em-nuvem)).
*A confirmar*: como software de terceiros integra com esse certificado (API do PSC da VALID) — a página não diz.

### Todo médico tem CNPJ?
**Não precisa ter.** A própria Resolução CFM 2.314/2022, art. 17 §1º, prevê o prestador de telemedicina
**pessoa física**: basta ser médico inscrito no CRM. O identificador do médico é **CRM + UF** (e CPF); CNPJ é da
clínica ou da empresa do médico, quando ele tiver uma.

### Vender para médico ou para clínica — o que o mercado aceita melhor?
Todos os concorrentes verificados vendem **para os dois e cobram por profissional**: iClinic se apresenta como
"software médico para clínicas e consultórios"; Doctoralia Pro tem produtos separados "para Especialistas" e "para
Clínicas"; Feegow, Amplimed e iClinic cobram por profissional de saúde. O padrão é: **o médico entra sozinho** (decisão
de uma pessoa, preço de um profissional) e a clínica é um agrupamento de profissionais que paga por cada um.
*Não consegui* a proporção de médicos em consultório próprio vs. clínica (está no relatório completo da
[Demografia Médica 2025](https://amb.org.br/wp-content/uploads/2025/04/DEMOGRAFIA-MEDICA-DO-BRASIL-2025_versao-online.pdf),
não lido) — não usar número sem ler.

## Fontes
- [iClinic — Planos e preços](https://iclinic.com.br/precos/) · [iClinic Premium](https://iclinic.com.br/premium/)
- [Feegow — Preços e planos](https://feegowclinic.com.br/precos-e-planos)
- [Amplimed — Valor da Amplimed](https://www.amplimed.com.br/blog/valor-da-amplimed/)
- [Doctoralia Pro — Preço](https://pro.doctoralia.com.br/preco)
- [Ninsaúde (fonte secundária)](https://www.clinicasyspro.com.br/clinicasyspro-vs-ninsaude.html)
- [ProDoctor — FAQ](https://prodoctor.net/faq)
- [Resolução CFM nº 2.314/2022](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2022/2314_2022.pdf)
- [Resolução CFM nº 2.299/2021](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2021/2299_2021.pdf)
- [Código de Ética Médica](https://portal.cfm.org.br/images/PDF/cem2019.pdf)
- [Memed — parceiro software](https://memed.com.br/parceiro-software/) · [Prescrição Eletrônica CFM](https://prescricaoeletronica.cfm.org.br/)
