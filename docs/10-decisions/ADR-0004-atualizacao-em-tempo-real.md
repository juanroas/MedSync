# ADR-0004: Atualização em tempo real (SignalR com Redis)

## Status

**Aceito em 25/09/2026**, a pedido do usuário: "quando o status muda, o médico ou o paciente não precisa atualizar
[...] vamos ter uma estrutura com vários usuários plugados, então precisa ser algo que suporte essa estrutura".

## Contexto

- Hoje cada tela só atualiza ao recarregar ou ao voltar para a aba. Exemplo real em homologação: a médica encerrou a
  consulta e a lista do paciente continuou "Em andamento".
- Web na **Vercel**, que repassa `/api/*` para a API na **Railway** (`next.config.ts`). O repasse da Vercel não é caminho
  confiável para conexão longa: WebSocket pelo proxy não é garantido e proxies costumam segurar `text/event-stream`
  em buffer ([Vercel — WebSocket vs SSE](https://vercel.com/i/websocket-vs-server-sent-events),
  [Vercel — rewrites](https://vercel.com/docs/routing/rewrites)).
- A sessão é um cookie do domínio da Vercel; ele não vai para o domínio da API.
- A API já usa Redis (cache distribuído) e pode rodar com mais de uma instância.

## Decisão

1. **ASP.NET Core SignalR** na API, hub `/hubs/events`, **só WebSocket** e **sem negociação** (`skipNegotiation`): assim
   não é preciso *sticky session* no balanceador.
2. **Redis como backplane** (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`) quando `REDIS_URL` existe: um aviso
   publicado em qualquer instância chega a quem está conectado em qualquer outra
   ([Microsoft — Redis backplane](https://learn.microsoft.com/en-us/aspnet/core/signalr/redis-backplane?view=aspnetcore-10.0)).
3. **O navegador conecta direto na API** (`NEXT_PUBLIC_REALTIME_URL`), não pela Vercel.
4. **Ticket de tempo real**: `POST /realtime/ticket` (pela Vercel, com o cookie) devolve um JWT de **2 minutos** com
   audiência própria `MedSync.Realtime`, enviado na conexão pelo `access_token` da query
   ([Microsoft — segurança SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/security?view=aspnetcore-8.0)).
   A API recusa esse ticket nas rotas normais (audiência diferente) e o hub recusa o token de sessão. A revogação de
   sessão vale para os dois. Cada reconexão pede um ticket novo.
5. **O evento avisa, não entrega dado**: `{ type, id }` e nada mais. A tela recarrega pela API, onde a autorização já é
   decidida. Nenhum dado clínico passa pelo canal (LGPD) e nenhuma regra de acesso é duplicada.
6. **Grupos**: `user:{id}` (cada pessoa), `clinic-admins:{clinicId}`, `clinics` (Médico ADM e Suporte), `support-queue`
   (Suporte e Médico ADM), `privacy-queue` (DPO). O servidor coloca a conexão nos grupos a partir das claims do ticket;
   o cliente não escolhe grupo nem envia mensagens.
7. **Sem tempo real configurado, nada quebra**: as telas atualizam a cada 30 s e ao voltar para a aba.

Eventos: `appointmentChanged`, `prescriptionChanged`, `supportRequestChanged`, `privacyRequestChanged`,
`clinicChanged`.

## Alternativas descartadas

- **Polling curto** em todas as telas: simples, mas custo cresce com usuários e o atraso continua.
- **SSE pela Vercel**: buffer e limite de duração no proxy.
- **Serviço gerenciado (Azure SignalR, Ably, Pusher)**: tira a carga de conexões da API, mas é mais um fornecedor
  (contrato, suboperador LGPD, custo). Fica como evolução se o número de conexões pesar; o código do hub não muda com
  Azure SignalR.

## Sala de espera

O paciente em espera entra no instante em que o médico abre a sala (`appointmentChanged` da consulta). A checagem
periódica continua como garantia: 5 s sem conexão ao vivo, 30 s com ela. Entregar o acesso à chamada só avisa na
**primeira** entrada de cada lado (reconexões não geram evento), e a tela ignora avisos enquanto uma tentativa de
entrar está em andamento — sem isso, o aviso de "paciente entrou" disparava uma nova tentativa em laço.

## Consequências

- Variáveis novas: `NEXT_PUBLIC_REALTIME_URL` na Vercel (URL pública da API) e, na Railway, WebSocket precisa estar
  liberado (é o padrão).
- Toda mudança de status nova deve chamar o `RealtimeNotifier` depois de salvar.
