# Product Positioning - MedSync

Status: Product Discovery. Este documento orienta posicionamento e nao declara funcionalidade implementada, conformidade regulatoria ou prontidao comercial.

## Objetivo

Definir o posicionamento do MedSync como plataforma de saude digital com modelo de contratacao B2B, evitando que o produto seja confundido com sistema de RH.

## Escopo

Este documento cobre:

- Posicionamento central.
- O que o MedSync deve ser.
- O que o MedSync nao deve ser.
- Camadas do produto.
- Implicacoes para UX, roadmap e comunicacao.

Fora de escopo:

- Copy comercial final.
- Precificacao aprovada.
- Contratos juridicos.
- Promessas regulatorias.
- Funcionalidades implementadas.

## Posicionamento central

O MedSync deve ser percebido como uma plataforma de acesso ao cuidado em saude digital, contratada por empresas ou parceiros para entregar atendimento, teleconsulta, jornada do paciente, medicos independentes, saude ocupacional e governanca de privacidade.

O B2B e o modelo de contratacao, elegibilidade, governanca e relatorios permitidos. Ele nao deve ser o centro emocional nem funcional da experiencia do paciente.

## Frase de direcao

MedSync conecta pessoas a cuidado digital com teleconsulta, operacao clinica e governanca B2B, preservando privacidade entre empresa, paciente e equipe de saude.

TODO: validar frase final com produto, juridico, privacidade e marketing.

## O que o MedSync deve ser

- Plataforma de saude digital.
- Jornada de acesso ao cuidado.
- Teleconsulta com suporte a operacao clinica.
- Portal para paciente/beneficiario acessar atendimento.
- Portal para medico independente operar agenda, atendimento e registros autorizados.
- Perfil ADM Medico do Trabalho para saude ocupacional associada ao CNPJ, quando aprovado.
- Portal B2B para contrato, elegibilidade, uso agregado e indicadores permitidos.
- Plataforma com privacidade por design.

## O que o MedSync nao deve ser

- Sistema de RH.
- Ferramenta de monitoramento clinico de paciente/beneficiario pela empresa.
- Portal para empresa acompanhar diagnostico, prontuario ou conduta individual.
- Apenas agenda medica.
- Apenas videochamada.
- Apenas checkout de consulta avulsa.

## Camadas do produto

| Camada | Papel | Experiencia principal |
|---|---|---|
| Acesso ao cuidado | Porta de entrada para atendimento digital | Paciente encontra atendimento, agenda ou entra em teleconsulta |
| Atendimento medico | Execucao do cuidado | Medico independente gerencia agenda, consulta e registros autorizados |
| Saude ocupacional | Acesso clinico restrito por CNPJ | ADM Medico do Trabalho acessa registros ocupacionais permitidos |
| B2B/Contratual | Contratacao e elegibilidade | Empresa ou parceiro gerencia contrato, elegiveis, planos e indicadores permitidos |
| Privacidade e auditoria | Governanca transversal | Regras de acesso, trilhas, evidencias e bloqueios |

## Implicacoes para UX

- A tela inicial do paciente deve priorizar acesso ao atendimento, nao dados corporativos.
- A tela da empresa deve mostrar uso agregado, contrato, elegibilidade e indicadores permitidos, sem parecer prontuario gerencial.
- A tela do medico deve parecer operacao de saude, com agenda, pacientes vinculados, atendimentos e acoes clinicas.
- Landing pages devem abrir com saude digital, cuidado, acesso e teleconsulta; B2B entra como modelo de distribuicao e governanca.

## Implicacoes para roadmap

Capacidades de acesso ao cuidado devem ser tratadas como produto central:

- Pronto atendimento digital.
- Consulta agendada por especialidade.
- Jornada de teleconsulta.
- Perfil/credenciamento de profissional.
- Prescricao, atestado e encaminhamento somente apos validacao regulatoria e tecnica.
- Pagamento avulso ou cobertura por contrato quando aplicavel.

Capacidades B2B continuam essenciais, mas como camada de viabilizacao:

- Empresa.
- Contrato.
- Plano.
- Elegibilidade.
- Faturamento.
- Relatorio agregado.
- Governanca de privacidade.

## Decisoes pendentes

- TODO: definir ICP inicial: empresas, parceiros, CNPJ tecnico, B2C assistido por suporte ou hibrido.
- TODO: decidir se consulta avulsa B2C entra no MVP ou fica como evolucao.
- TODO: definir linhas de cuidado iniciais: clinico geral, pediatria, saude mental, especialidades ou outra composicao.
- TODO: validar se havera white label para parceiros.
- TODO: aprovar copy comercial e limites regulatorios.

## Checklist

- [x] Posicionamento B2B separado de sistema de RH.
- [x] Acesso ao cuidado definido como nucleo do produto.
- [x] Camadas de produto documentadas.
- [ ] TODO: validar ICP e oferta inicial.
- [x] Posicionamento transformado em escopo, fluxo de telas e backlog candidato.

## Referencias

- [Market References](MARKET_REFERENCES.md)
- [Product Vision](PRODUCT_VISION.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Business Model](BUSINESS_MODEL.md)
- [Modelo B2B](B2B_MODEL.md)
- [Information Architecture](INFORMATION_ARCHITECTURE.md)
