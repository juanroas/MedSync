# MVP Scope - MedSync

Status: Product Discovery. Este documento define escopo candidato para desenvolvimento controlado e nao confirma implementacao, conformidade regulatoria ou uso com pacientes reais.

## Objetivo

Definir o primeiro recorte de produto apos o reposicionamento do MedSync como plataforma de acesso ao cuidado em saude digital com modelo B2B.

## Escopo

Inclui:

- Objetivo do MVP.
- Perfis envolvidos.
- Capacidades candidatas.
- Fluxos prioritarios.
- Fora de escopo.
- Criterios de aceite iniciais.
- Pendencias para desenvolvimento.

Fora de escopo:

- Criar telas.
- Criar endpoints.
- Criar tabelas, migrations ou seeds.
- Aprovar precificacao.
- Declarar conformidade LGPD/CFM.
- Autorizar atendimento real.

## Objetivo do MVP

Validar, em ambiente controlado, que o MedSync consegue entregar uma jornada minima de acesso ao cuidado digital, com teleconsulta, operacao clinica e camada B2B de elegibilidade/contrato sem expor dados clinicos individuais para empresas ou parceiros.

## Tese do MVP

O primeiro produto nao deve parecer sistema de RH. O primeiro produto deve demonstrar:

- Paciente/beneficiario encontra atendimento.
- Paciente/beneficiario agenda ou acessa consulta autorizada.
- Medico independente atende consulta vinculada dentro do ramo autorizado.
- Empresa/parceiro acompanha apenas elegibilidade, contrato e indicadores agregados permitidos.
- ADM Medico do Trabalho acessa dados clinicos ocupacionais somente com permissao, finalidade e auditoria.
- Auditoria e privacidade bloqueiam acessos indevidos.

## Perfis do MVP

| Perfil | Papel no MVP | Limite critico |
|---|---|---|
| Paciente/beneficiario | Acessar cuidado, consulta, consentimento e teleconsulta | Nao acessa dados de outros pacientes |
| Medico independente | Atender consultas vinculadas e registrar informacao autorizada | Nao acessa consultas sem vinculo ou fora do ramo autorizado |
| ADM Medico do Trabalho | Acessar dados clinicos ocupacionais no CNPJ associado | Nao e RH; acesso exige finalidade, permissao e auditoria |
| Empresa/parceiro | Gerenciar contrato, elegibilidade e indicadores agregados | Nunca acessa dado clinico individual |
| Financeiro | Acompanhar pagamentos e pendencias | Nao acessa prontuario ou diagnostico |
| Auditor/Privacidade | Ver eventos e tentativas negadas | Nao altera dados operacionais |

## Capacidades candidatas para MVP

| Dominio | Capacidade | Prioridade | Observacao |
|---|---|---|---|
| Acesso ao cuidado | Home do paciente/beneficiario | P0 | Deve ser a primeira experiencia do paciente |
| Acesso ao cuidado | Agendar consulta | P0 | Pode usar disponibilidade simples em homologacao |
| Teleconsulta | Sala de espera | P0 | Paciente entra somente quando autorizado |
| Teleconsulta | Entrada do medico | P0 | Medico inicia atendimento vinculado |
| Medical | Agenda do medico independente | P0 | Medico acompanha consultas vinculadas |
| Medical | ADM Medico do Trabalho | P1 | Acesso ocupacional restrito por CNPJ, se aprovado |
| B2B | Elegibilidade administrativa | P0 | Empresa/parceiro gerencia acesso sem dado clinico |
| B2B | CNPJ tecnico/operacional | P0 | Suporte vincula pessoa fisica direta ao CNPJ tecnico |
| B2B | Contrato/plano em leitura | P1 | Pode iniciar como visualizacao administrativa |
| B2B | Relatorio agregado basico | P1 | Precisa validacao LGPD e granularidade minima |
| Pagamentos | Status de pagamento quando aplicavel | P1 | Retorno de pagamento nao e fonte de verdade |
| Auditoria | Eventos de acesso e negacao | P0 | Essencial para homologacao |
| Privacidade | Bloqueios por perfil | P0 | Testes negativos obrigatorios |

## Fluxos prioritarios

### Fluxo 1 - Paciente acessa cuidado

1. Paciente/beneficiario entra no portal.
2. Sistema mostra acoes de acesso ao cuidado.
3. Paciente escolhe agendar consulta ou acessar consulta existente.
4. Sistema valida elegibilidade, permissao, consentimento e status quando aplicavel.
5. Paciente segue para sala de espera ou acompanha status.

### Fluxo 2 - Medico realiza atendimento

1. Medico acessa agenda do dia.
2. Medico visualiza apenas consultas vinculadas.
3. Sistema valida ramo de atividade/especialidade autorizada quando aplicavel.
4. Medico inicia atendimento quando permitido.
5. Paciente entra apos autorizacao.
6. Medico encerra atendimento.
7. Eventos relevantes sao auditados.

### Fluxo 3 - Empresa/parceiro acompanha camada B2B

1. Empresa/parceiro acessa area Business.
2. Visualiza contrato, plano e elegibilidade administrativa.
3. Visualiza indicadores agregados permitidos quando aprovados.
4. Tentativas de acessar dado clinico individual sao bloqueadas e auditadas.

### Fluxo 4 - ADM Medico do Trabalho acessa saude ocupacional

1. ADM Medico do Trabalho acessa CNPJ associado.
2. Visualiza registros ocupacionais permitidos.
3. Atualiza ou retifica informacao clinica ocupacional quando permitido.
4. Sistema audita acesso e alteracao.
5. Dados nao ficam disponiveis para RH, financeiro ou empresa administrativa.

## Fora de escopo do MVP candidato

- Consulta avulsa B2C publica.
- Marketplace publico de profissionais.
- White label.
- Prescricao, atestado e encaminhamento sem validacao regulatoria e tecnica.
- Relatorios clinicos para empresa/parceiro.
- Analiticos por especialidade sensivel vinculados a pessoa identificavel.
- Gravacao, egress ou transcricao de teleconsulta por padrao.
- Perfil Clinica/Admin no MVP B2B atual.
- Declaracao de conformidade LGPD/CFM.

## Criterios de aceite iniciais

- Paciente/beneficiario consegue identificar claramente como acessar cuidado.
- Empresa/parceiro nao visualiza diagnostico, prontuario, observacoes clinicas, conteudo de chamada ou dado clinico individual.
- Medico independente so visualiza consultas vinculadas e dentro do escopo autorizado.
- ADM Medico do Trabalho nao compartilha dado clinico com RH/empresa administrativa.
- Financeiro nao visualiza dado clinico.
- Auditor nao altera dados operacionais.
- Estados de loading, vazio, erro, bloqueio e sem permissao existem nos fluxos principais.
- Todos os acessos negados relevantes sao candidatos a evento de auditoria.
- Documentacao permanece com status de homologacao controlada.

## Pendencias para desenvolvimento

- TODO: validar ICP inicial: empresas, parceiros ou hibrido.
- TODO: validar linhas de cuidado do MVP.
- TODO: definir regras de disponibilidade e agenda.
- TODO: definir granularidade minima para relatorios agregados.
- TODO: validar contrato B2B e responsabilidades LGPD por fluxo.
- TODO: transformar este escopo em specifications, tarefas e testes.
- TODO: aprovar go/no-go de homologacao com QA, seguranca, privacidade, juridico e diretor tecnico.

## Checklist

- [x] MVP reposicionado como acesso ao cuidado.
- [x] B2B definido como camada de contrato/elegibilidade/governanca.
- [x] Fora de escopo regulatorio e comercial explicitado.
- [ ] TODO: validar prioridades P0/P1 com stakeholders.
- [ ] TODO: linkar specifications quando criadas.
- [ ] TODO: derivar backlog tecnico.

## Referencias

- [Product Positioning](PRODUCT_POSITIONING.md)
- [Actor and Organization Model](ACTOR_ORGANIZATION_MODEL.md)
- [Data Management and CRUD](DATA_MANAGEMENT_CRUD.md)
- [Market References](MARKET_REFERENCES.md)
- [Feature Catalog](FEATURE_CATALOG.md)
- [User Journeys](USER_JOURNEYS.md)
- [B2B Model](B2B_MODEL.md)
- [UX MVP Screen Flow](../02-design/MVP_SCREEN_FLOW.md)
