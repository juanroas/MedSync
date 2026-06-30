# MedSync

MVP de telemedicina em monorepo, com agenda clínica, cadastro de médicos e
pacientes e videochamada WebRTC pelo LiveKit Cloud.

## Stack

- Next.js 15, TypeScript, Tailwind CSS e App Router
- .NET 9 Web API com uma Clean Architecture enxuta
- PostgreSQL com Entity Framework Core e migrations
- Redis para cache das listagens
- LiveKit Cloud para as salas de vídeo
- Vercel (web) e Railway (API, PostgreSQL e Redis)

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

### Usuários de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Médico | `medico@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |
| Paciente | `paciente@medsync.dev` | valor de `SEED_DEMO_PASSWORD` |

O seed também cria um médico, um paciente e uma consulta de demonstração.

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

### Web

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública da API, sem barra no final. |
| `NEXT_PUBLIC_LIVEKIT_URL` | URL WebSocket pública do LiveKit (`wss://...`). |

`LIVEKIT_API_SECRET` nunca deve ser configurada na Vercel ou exposta com o
prefixo `NEXT_PUBLIC_`.

Nenhum segredo real é versionado. Os arquivos `.env` são ignorados pelo Git e
os `.env.example` contêm somente placeholders. Em produção, todas as
credenciais vêm das Environment Variables do Railway/Vercel.

## Endpoints

Todos os endpoints, exceto login e healthcheck, exigem
`Authorization: Bearer <token>`.

```text
POST /auth/login
POST /patients
GET  /patients
POST /doctors
GET  /doctors
POST /appointments
GET  /appointments
GET  /appointments/{id}
POST /consultations/{appointmentId}/room
GET  /livekit/token?roomName=...&identity=...
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
   SEED_DEMO_PASSWORD=defina-uma-senha-inicial-segura
   FRONTEND_URL=https://seu-app.vercel.app
   LIVEKIT_URL=wss://seu-projeto.livekit.cloud
   LIVEKIT_API_KEY=sua_chave_livekit
   LIVEKIT_API_SECRET=seu_segredo_livekit
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
   NEXT_PUBLIC_API_URL=https://seu-dominio.up.railway.app
   NEXT_PUBLIC_LIVEKIT_URL=wss://seu-projeto.livekit.cloud
   ```

4. Faça o deploy e depois atualize `FRONTEND_URL` no Railway com o domínio final
   da Vercel. Para previews adicionais, inclua as origens separadas por vírgula.

## Notas de segurança do MVP

- Senhas são armazenadas com PBKDF2-SHA256 e salt aleatório.
- Tokens JWT e tokens de sala são emitidos somente pelo backend.
- O token LiveKit expira em duas horas e só é emitido para uma sala existente.
- O frontend guarda a sessão em `localStorage`, uma escolha simples para o MVP.
  Em produção, prefira cookies `HttpOnly`, rotação de refresh token e uma
  política de autorização que valide a relação do usuário com cada consulta.
- Não há pagamento, prontuário completo, prescrição digital ou gravação.
