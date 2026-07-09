# Relatório de homologação técnica

Data: 1º de julho de 2026  
Ambiente: local isolado, PostgreSQL e Redis em contêineres  
Resultado: **aprovado para continuidade da homologação; ainda não liberado para pacientes reais**

## Evidências aprovadas

- build da API .NET 9: aprovado, sem erros ou avisos;
- typecheck e build de produção do Next.js: aprovados;
- migration `ProductionFoundation` aplicada em banco limpo;
- autenticação em cookie `HttpOnly`, sessão de 15 minutos e troca obrigatória de senha temporária;
- criação dos perfis de recepção, financeiro, administrador e auditor;
- trilha de auditoria restrita ao administrador e auditor da clínica;
- isolamento lógico por `ClinicId` e bloqueio de acesso entre clínicas;
- médico e paciente limitados aos atendimentos vinculados;
- administrador impedido de entrar na videochamada;
- CPF mascarado nas respostas;
- consentimento versionado obrigatório antes do token do paciente;
- registro clínico com autoria, versão e histórico de revisões;
- sala criada apenas pelo médico responsável e somente dentro da janela do atendimento;
- token LiveKit individual, restrito à sala e com TTL de 15 minutos;
- E2EE configurado no cliente e chave derivada por sala entregue somente aos participantes autorizados;
- espera do paciente sem conexão antecipada ao LiveKit;
- checkout hospedado isolado por interface e falha segura quando o Mercado Pago não está configurado;
- layout da sala limitado à viewport dinâmica, sem depender de zoom manual;
- rotina de expiração e remoção de salas pelo Room Service implementada.

O roteiro reproduzível está em `scripts/homologacao.ps1`.

## Pendências externas ou não aprovadas

Estas pendências impedem o go-live com dados reais:

1. Executar chamada real com as credenciais LiveKit de produção/homologação e validar áudio, vídeo, chat, compartilhamento, E2EE e desconexão nas resoluções suportadas.
2. Configurar Mercado Pago Sandbox, validar assinatura, duplicidade de webhook, conciliação, cancelamento, estorno e chargeback.
3. Implementar MFA para médicos e perfis administrativos.
4. Formalizar retenção, descarte, atendimento aos direitos dos titulares, resposta a incidentes e RIPD.
5. Configurar e comprovar backup criptografado e restauração.
6. Validar requisitos do SRES/NGS2, assinatura de documentos e exportação com o diretor técnico e especialista SBIS/CFM.
7. Realizar SAST, análise de dependências, DAST e pentest independente.
8. Revisar contratos de operador/suboperador, região de dados e transferência internacional com LiveKit, e-mail, hospedagem e pagamento.
9. Obter aprovação formal do diretor técnico médico, encarregado de dados e jurídico.
10. Fazer piloto controlado com limites e alertas de custo por clínica.

## Decisão

O sistema está tecnicamente apto para um ambiente de homologação controlado. Ele **não deve ser anunciado como “em conformidade com LGPD/CFM” nem receber pacientes reais** até as pendências acima serem encerradas e as aprovações formais serem registradas.

## Como repetir

Com a API de desenvolvimento em execução e o seed habilitado:

```powershell
.\scripts\homologacao.ps1 -DemoPassword "<senha-do-seed>"
```

Com credenciais LiveKit reais, exija também a remoção efetiva da sala:

```powershell
.\scripts\homologacao.ps1 -DemoPassword "<senha-do-seed>" -RequireLiveKitLifecycle
```
