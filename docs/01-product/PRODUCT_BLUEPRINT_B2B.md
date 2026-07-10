# Product Blueprint B2B - MedSync

Status: Product Discovery. Nenhuma funcionalidade nova deve ser inferida como implementada a partir deste documento.

## Visao

Transformar o MedSync em uma plataforma de Saude Digital com modelo B2B para pacientes, medicos independentes, empresas e parceiros, mantendo separacao rigorosa entre acesso ao cuidado, atendimento medico, contratacao e privacidade do paciente.

## Principio central

Empresas contratantes podem acompanhar contrato, elegibilidade, uso administrativo e indicadores agregados permitidos, mas nunca acessam dados clinicos individuais de pacientes ou beneficiarios.

## Publicos-alvo

| Publico | Necessidade principal | Valor esperado |
|---|---|---|
| Empresas/parceiros | Contratar acesso a cuidado digital e acompanhar indicadores permitidos | Uso mensuravel sem violar privacidade |
| Pacientes/beneficiarios | Acessar consultas remotas com seguranca | Jornada simples e confidencial |
| Medicos independentes | Atender e registrar condutas com contexto | Agenda clara, registro clinico e chamada segura |
| ADM Medico do Trabalho | Apoiar saude ocupacional no CNPJ associado | Acesso clinico restrito e auditado |
| Administradores | Gerenciar usuarios, permissao e operacao | Governanca e auditoria |
| Privacidade/Juridico | Comprovar controles e responder titulares | Evidencias, rastreabilidade e minimizacao |

## Jobs to be done

- Como paciente, quero encontrar atendimento, agendar ou entrar em consulta sem friccao.
- Como empresa/parceiro, quero contratar acesso ao cuidado e acompanhar uso agregado permitido.
- Como beneficiario, quero usar o acesso contratado como paciente sem expor minha condicao ao empregador ou patrocinador.
- Como medico independente, quero atender somente pacientes vinculados e registrar informacoes clinicas com auditoria.
- Como ADM Medico do Trabalho, quero acessar dados ocupacionais permitidos sem liberar dados clinicos para RH.
- Como auditor, quero verificar acessos sem alterar dados operacionais.

## Proposta de valor

- Teleconsulta segura sem gravacao por padrao.
- Acesso ao cuidado como experiencia central do paciente.
- Governanca por CNPJ/tenant e B2B desde a base do produto.
- Jornada de paciente com consentimento, pagamento quando necessario e sala de espera.
- Relatorios empresariais agregados, sem prontuario, diagnostico ou observacoes clinicas individuais.
- Evidencias para homologacao tecnica, seguranca e privacidade.

## Modulos de produto

| Modulo | Objetivo | Observacao |
|---|---|---|
| Identidade e acesso | Usuarios, papeis, MFA e sessoes | Critico para perfis sensiveis |
| CNPJ/Tenant | Empresa contratante, CNPJ tecnico e escopos | Base multi-tenant |
| Medical | Medico independente e ADM Medico do Trabalho | Acesso clinico restrito por vinculo/finalidade |
| Agenda | Marcacao, conflito e status | Deve impedir sobreposicao de medico |
| Teleconsulta | Sala de espera, LiveKit e encerramento | Paciente so entra apos autorizacao |
| Registro clinico | Prontuario, versoes e autoria | Fora do alcance de empresa e administrativo |
| Pagamentos | Checkout hospedado e webhooks | Retorno nao e fonte de verdade |
| Acesso ao cuidado | Entrada de atendimento, consultas e continuidade | Experiencia central do paciente |
| B2B | Empresas/parceiros, elegibilidade, planos e contratos | Relatorios sempre agregados |
| Privacidade | Direitos do titular, retencao e auditoria | Necessita validacao juridica/DPO |
| QA e homologacao | Testes automatizados e manuais | Evidencia para go/no-go |

## Indicadores de sucesso

- Consultas agendadas, iniciadas e concluidas por CNPJ/tenant.
- Taxa de no-show e tempo de espera.
- Uso de acesso ao cuidado por empresa/parceiro em dados agregados.
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

- Modelo comercial: B2B2C, beneficio corporativo direto, CNPJ tecnico, consulta assistida por suporte ou hibrido.
- Responsabilidades LGPD: controlador, operador e suboperadores por fluxo.
- Relatorios B2B permitidos por contrato e base legal.
- Retencao por categoria de dado.
- Limites de uso, cobranca, cancelamento e no-show por contrato.
- Governanca de suporte tecnico sem acesso clinico.

## Riscos de produto

| Risco | Mitigacao documental |
|---|---|
| Empresa solicitar dados individuais | Regra explicita no modelo B2B, contratos e testes |
| Admin confundir permissao operacional com acesso clinico | Matriz de acesso, QA negativo e auditoria |
| Produto ser vendido como pronto antes da homologacao | Status de homologacao em README e docs |
| Crescimento desorganizado da documentacao | Indice canonico e relatorio de organizacao |
