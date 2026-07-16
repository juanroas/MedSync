# MedSync

Plataforma multi-clínica de agenda, teleconsulta sem gravação, registro clínico,
auditoria e checkout hospedado.

## Stack

- Next.js 15, TypeScript, Tailwind CSS e App Router
- .NET 9 Web API com uma Clean Architecture enxuta
- PostgreSQL com Entity Framework Core e migrations
- Redis opcional para dados não sensíveis e coordenação
- LiveKit Cloud com E2EE para as salas de vídeo
- Mercado Pago Checkout Pro para cobrança hospedada
- Vercel (web) e Railway (API, PostgreSQL e Redis)

## Status

O MedSync está em homologação controlada. Não declarar conformidade LGPD/CFM
nem prontidão para uso com pacientes reais antes das aprovações técnica,
jurídica, privacidade, segurança e diretor técnico.

## Documentacao

A documentacao do produto, QA, seguranca, privacidade, B2B e producao esta
organizada em [docs/README.md](docs/README.md). Comece por esse indice antes de
alterar ou criar novos documentos.

## Estrutura

```text
MedSync/
├── apps/
│   ├── web/                    # Next.js
│   └── api/
│       ├── src/
│       │   ├── MedSync.Domain/
│       │   ├── MedSync.Application/
│       │   ├── MedSync.Infrastructure/
│       │   └── MedSync.Api/
│       └── Dockerfile
├── infra/
│   └── docker-compose.yml
├── .env.example
└── README.md
```

## Pré-requisitos

- Node.js 20 ou mais recente
- .NET SDK 9
- Docker Desktop
- Um projeto no [LiveKit Cloud](https://cloud.livekit.io/)

## Executar localmente

1. Copie o modelo de configuração e preencha os valores locais:

   ```bash
   cp .env.example .env
   ```

   A API procura automaticamente o primeiro `.env` no diretório atual ou em
   seus diretórios-pai. Ela nunca sobrescreve uma variável já definida pelo
   sistema. Assim, localmente usa o `.env`; no Railway usa as Environment
   Variables, sem qualquer alteração de código.

2. Inicie PostgreSQL e Redis depois de preencher `POSTGRES_PASSWORD` no `.env`:

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

3. Inicie a API:

   ```bash
   cd apps/api
   dotnet restore
   dotnet run --project src/MedSync.Api
   ```

   A API inicia em `http://localhost:8080`, aplica migrations e cria o seed.
   Swagger fica disponível em `http://localhost:8080/swagger`.

4. Configure e inicie o frontend:

   ```bash
   cp apps/web/.env.example apps/web/.env
   npm install
   npm run dev:web
   ```

   O Next.js carrega `apps/web/.env` automaticamente em desenvolvimento. Na
   Vercel, ele lê as variáveis configuradas no projeto.

   Abra `http://localhost:3000`.

## QA automatizado

O frontend possui Playwright para os fluxos de homologação:

```bash
npm run test:e2e
npm run test:e2e:ui
```

| Variável | Descrição |
|---|---|
| `MEDSYNC_E2E_BASE_URL` | URL do frontend. Padrão: `http://localhost:3000`. |
| `MEDSYNC_E2E_API_URL` | URL da API. Padrão: `http://localhost:8080`. |
| `MEDSYNC_E2E_PASSWORD` | Senha das contas de homologação. |
| `MEDSYNC_E2E_MUTATING` | Use `1` para habilitar teste que cria paciente e consulta. |

O relatório HTML é gerado em `apps/web/playwright-report`.

### Usuários de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Médico | `medico@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Paciente | `paciente@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Admin plataforma | `admin@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Empresa/parceiro admin | `empresa.admin@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Financeiro empresa | `empresa.financeiro@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Financeiro MedSync | `plataforma.financeiro@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Suporte MedSync | `suporte@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Auditor empresa | `empresa.auditor@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Auditor MedSync | `plataforma.auditor@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| DPO/Privacidade | `dpo@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| ADM Medico do Trabalho | `medico.trabalho@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |

O seed existe somente em `Development`. Contas criadas pelo administrador
recebem uma senha temporária, que deve ser trocada no primeiro acesso.

## Variáveis de ambiente

### API

| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP. O padrão é `8080`. |
| `DATABASE_URL` | URL PostgreSQL no formato `postgresql://user:pass@host:port/db`. |
| `ConnectionStrings__DefaultConnection` | Alternativa à `DATABASE_URL`. |
| `REDIS_URL` | URL do Redis. Sem ela, a API usa cache em memória. |
| `JWT_SECRET` | Segredo de assinatura do JWT, com no mínimo 32 caracteres. |
| `JWT_ISSUER` | Emissor do JWT. Padrão: `MedSync`. |
| `JWT_AUDIENCE` | Audiência do JWT. Padrão: `MedSync.Web`. |
| `SEED_DEMO_PASSWORD` | Senha inicial dos dois usuários demo. Nunca é versionada. |
| `FRONTEND_URL` | Origem aceita pelo CORS. Aceita múltiplas URLs separadas por vírgula. |
| `LIVEKIT_URL` | URL `wss://` do projeto LiveKit. Reservada para configuração. |
| `LIVEKIT_API_KEY` | Chave da API do LiveKit. |
| `LIVEKIT_API_SECRET` | Segredo do LiveKit. Somente no backend. |
| `VIDEO_E2EE_SECRET` | Segredo independente, com no mínimo 32 caracteres, usado para derivar a chave E2EE de cada sala. |
| `PUBLIC_APP_URL` | URL pública usada nos retornos do checkout. |
| `PUBLIC_API_URL` | URL pública usada no webhook do pagamento. |
| `MERCADOPAGO_ACCESS_TOKEN` | Token do Checkout Pro. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Segredo de validação do webhook. |

### Web

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_BASE_PATH` | Caminho usado pelo browser para chamar a API. Em Vercel, use `/api` para manter cookie same-origin. |
| `NEXT_PUBLIC_API_URL` | URL pública da API, sem barra no final. Usada pelo rewrite/proxy do Next.js quando `API_PROXY_TARGET` nao for definido. |
| `API_PROXY_TARGET` | URL interna ou publica da API usada pelo servidor Next.js no rewrite `/api/:path*`. |
| `NEXT_PUBLIC_LIVEKIT_URL` | URL WebSocket pública do LiveKit (`wss://...`). |

`LIVEKIT_API_SECRET` nunca deve ser configurada na Vercel ou exposta com o
prefixo `NEXT_PUBLIC_`.

Nenhum segredo real é versionado. Os arquivos `.env` são ignorados pelo Git e
os `.env.example` contêm somente placeholders. Em produção, todas as
credenciais vêm das Environment Variables do Railway/Vercel.

## Endpoints

Todos os endpoints, exceto cadastro da clínica, login, healthcheck e webhook,
exigem a sessão em cookie `HttpOnly`.

```text
POST /auth/login
POST /auth/register-clinic
GET  /auth/me
POST /auth/change-password
POST /staff-users
GET  /staff-users
GET  /audit-events
POST /patients
GET  /patients
POST /doctors
GET  /doctors
POST /appointments
GET  /appointments
GET  /appointments/{id}
POST /appointments/{id}/consent
GET  /appointments/{id}/clinical-record
PUT  /appointments/{id}/clinical-record
POST /consultations/{appointmentId}/start
GET  /consultations/{appointmentId}/room
POST /consultations/{appointmentId}/token
POST /consultations/{appointmentId}/end
POST /appointments/{appointmentId}/payments/checkout
POST /payments/mercadopago/webhook
GET  /health
```

## Migrations

A migration inicial está versionada. Para criar outra:

```bash
cd apps/api
dotnet tool install --global dotnet-ef --version 9.0.10
dotnet ef migrations add NomeDaMigration \
  --project src/MedSync.Infrastructure \
  --startup-project src/MedSync.Api \
  --output-dir Migrations
```

A API executa `Database.MigrateAsync()` na inicialização.

## Deploy da API no Railway

1. Crie um projeto no Railway e conecte o repositório do MedSync.
2. Adicione os serviços **PostgreSQL** e **Redis** pelo catálogo do Railway.
3. Crie um serviço para a API usando o mesmo repositório.
4. No serviço da API, defina:

   ```env
   RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=gere-uma-chave-longa-e-aleatoria
   JWT_ISSUER=MedSync
   JWT_AUDIENCE=MedSync.Web
   FRONTEND_URL=https://seu-app.vercel.app
   PUBLIC_APP_URL=https://seu-app.vercel.app
   PUBLIC_API_URL=https://seu-dominio.up.railway.app
   AUTH_COOKIE_SAMESITE=None
   LIVEKIT_URL=wss://seu-projeto.livekit.cloud
   LIVEKIT_API_KEY=sua_chave_livekit
   LIVEKIT_API_SECRET=seu_segredo_livekit
   VIDEO_E2EE_SECRET=gere-outro-segredo-longo-e-independente
   MERCADOPAGO_ACCESS_TOKEN=seu-token
   MERCADOPAGO_WEBHOOK_SECRET=seu-segredo-de-webhook
   ```

   Se os serviços tiverem nomes diferentes de `Postgres` e `Redis`, ajuste as
   referências do Railway. A plataforma injeta `PORT`; o container escuta em
   `http://0.0.0.0:${PORT}`.

5. Em **Settings → Networking**, gere um domínio público para a API.
6. Verifique `https://seu-dominio.up.railway.app/health`.

O contexto de build deve ser a raiz do repositório. O Dockerfile copia os
projetos a partir de `apps/api`.

## Deploy do frontend na Vercel

1. Importe o mesmo repositório na Vercel.
2. Configure **Root Directory** como `apps/web`.
3. Configure:

   ```env
   NEXT_PUBLIC_API_BASE_PATH=/api
   NEXT_PUBLIC_API_URL=https://seu-dominio.up.railway.app
   API_PROXY_TARGET=https://seu-dominio.up.railway.app
   NEXT_PUBLIC_LIVEKIT_URL=wss://seu-projeto.livekit.cloud
   ```

4. Faça o deploy e depois atualize `FRONTEND_URL` no Railway com o domínio final
   da Vercel. Para previews adicionais, inclua as origens separadas por vírgula.

## Segurança e situação da homologação

- Senhas são armazenadas com PBKDF2-SHA256 e salt aleatório.
- A sessão fica em cookie `HttpOnly`; nenhum JWT é salvo no `localStorage`.
- Tokens LiveKit duram 15 minutos e são emitidos somente para o médico e o
  paciente vinculados, dentro da janela da consulta.
- Perfis administrativos, financeiros, suporte e auditoria nao recebem token de videochamada.
- A mídia e os dados da sala usam E2EE com chave por sala.
- O MedSync não habilita gravação, egress ou transcrição.
- Dados são escopados por clínica, perfil e vínculo com o atendimento.
- O cartão é informado apenas no checkout hospedado.
- Headers de segurança incluem CSP, Referrer-Policy, X-Content-Type-Options,
  Permissions-Policy e HSTS fora de desenvolvimento.

## B2B

A fundação de dados B2B inclui `Company`, `CompanyEmployee`, `BenefitPlan`,
`CompanyContract` e `EmployeeEligibility`. A regra central é que empresas nunca
acessam prontuário, diagnóstico, observações clínicas ou dados clínicos
individuais de colaboradores. Consulte [o modelo B2B](docs/01-product/B2B_MODEL.md).

Consulte [o plano de produção](docs/09-production/PLANO_PRODUCAO.md) e
[o relatório de homologação](docs/09-production/RELATORIO_HOMOLOGACAO.md).

Documentos adicionais:

- [Checklist de QA](docs/08-quality/QA_CHECKLIST.md)
- [Checklist de produção](docs/09-production/PRODUCTION_CHECKLIST.md)
- [Checklist de segurança](docs/07-security/SECURITY_CHECKLIST.md)
- [Checklist LGPD](docs/07-security/LGPD_CHECKLIST.md)
- [Registro de riscos](docs/09-production/RISK_REGISTER.md)

A aprovação técnica local não substitui pentest, validação NGS2, jurídico,
privacidade e diretor técnico antes do uso com pacientes reais.
