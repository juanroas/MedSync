# Product Blueprint B2B - MedSync

Status: Product Discovery. Nenhuma funcionalidade nova deve ser inferida como implementada a partir deste documento.

## Visao

Transformar o MedSync em um SaaS B2B de Saude Digital para clinicas, empresas e colaboradores, mantendo separacao rigorosa entre operacao administrativa, atendimento clinico e privacidade do paciente.

## Principio central

Empresas contratantes podem acompanhar uso administrativo e indicadores agregados, mas nunca acessam dados clinicos individuais de colaboradores.

## Publicos-alvo

| Publico | Necessidade principal | Valor esperado |
|---|---|---|
| Clinicas | Operar agenda, teleconsulta, prontuario e cobranca | Mais controle operacional e menor retrabalho |
| Empresas | Oferecer beneficio de saude digital aos colaboradores | Uso mensuravel sem violar privacidade |
| Colaboradores | Acessar consultas remotas com seguranca | Jornada simples e confidencial |
| Medicos | Atender e registrar condutas com contexto | Agenda clara, registro clinico e chamada segura |
| Administradores | Gerenciar usuarios, permissao e operacao | Governanca e auditoria |
| Privacidade/Juridico | Comprovar controles e responder titulares | Evidencias, rastreabilidade e minimizacao |

## Jobs to be done

- Como empresa, quero contratar um plano de beneficio e acompanhar uso agregado.
- Como colaborador, quero usar o beneficio como paciente sem expor minha condicao ao empregador.
- Como clinica, quero separar dados administrativos, financeiros e clinicos por perfil.
- Como medico, quero atender somente pacientes vinculados e registrar informacoes clinicas com auditoria.
- Como auditor, quero verificar acessos sem alterar dados operacionais.

## Proposta de valor

- Teleconsulta segura sem gravacao por padrao.
- Governanca multi-clinica e B2B desde a base do produto.
- Jornada de paciente com consentimento, pagamento quando necessario e sala de espera.
- Relatorios empresariais agregados, sem prontuario, diagnostico ou observacoes clinicas individuais.
- Evidencias para homologacao tecnica, seguranca e privacidade.

## Modulos de produto

| Modulo | Objetivo | Observacao |
|---|---|---|
| Identidade e acesso | Usuarios, papeis, MFA e sessoes | Critico para perfis sensiveis |
| Clinicas | Tenant, equipe e operacao | Base multi-clinica |
| Agenda | Marcacao, conflito e status | Deve impedir sobreposicao de medico |
| Teleconsulta | Sala de espera, LiveKit e encerramento | Paciente so entra apos autorizacao |
| Registro clinico | Prontuario, versoes e autoria | Fora do alcance de empresa e administrativo |
| Pagamentos | Checkout hospedado e webhooks | Retorno nao e fonte de verdade |
| B2B | Empresas, colaboradores, planos e contratos | Relatorios sempre agregados |
| Privacidade | Direitos do titular, retencao e auditoria | Necessita validacao juridica/DPO |
| QA e homologacao | Testes automatizados e manuais | Evidencia para go/no-go |

## Indicadores de sucesso

- Consultas agendadas, iniciadas e concluidas por clinica.
- Taxa de no-show e tempo de espera.
- Uso de beneficio por empresa em dados agregados.
- Falhas de autorizacao bloqueadas.
- Tempo de resposta a solicitacoes LGPD.
- Webhooks de pagamento processados sem divergencia.
- Incidentes, vulnerabilidades e riscos residuais.

## Fora de escopo nesta fase

- Declarar conformidade regulatoria.
- Liberar pacientes reais.
- Criar telas novas.
- Alterar API, banco ou migrations.
- Implementar MFA, sessoes ou endpoints LGPD nesta sprint documental.

## Decisoes a validar

- Modelo comercial: SaaS para clinicas, beneficio corporativo direto ou hibrido.
- Responsabilidades LGPD: controlador, operador e suboperadores por fluxo.
- Relatorios B2B permitidos por contrato e base legal.
- Retencao por categoria de dado.
- Limites de uso, cobranca, cancelamento e no-show por contrato.
- Governanca de suporte tecnico sem acesso clinico.

## Riscos de produto

| Risco | Mitigacao documental |
|---|---|
| Empresa solicitar dados individuais | Regra explicita no modelo B2B, contratos e testes |
| Admin confundir permissao operacional com clinica | Matriz de acesso, QA negativo e auditoria |
| Produto ser vendido como pronto antes da homologacao | Status de homologacao em README e docs |
| Crescimento desorganizado da documentacao | Indice canonico e relatorio de organizacao |
