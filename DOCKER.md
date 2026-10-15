# AgriScan AI — Docker + Cloudflare

> **1 lệnh khởi động toàn bộ hệ thống** — PostgreSQL + PHP API (trên Docker) + Cloudflare Workers AI

## Quick Start

### Full Stack (with database)
```bash
# 1. Deploy the Cloudflare Worker (one-time setup)
cd workers/ai-worker
npm install
npx wrangler deploy --env production

# 2. Start the Docker stack
docker compose up --build -d
```

### Serverless MVP (no database)
```bash
# PHP API runs in mock mode (returns static data for GET routes)
# while still calling real Cloudflare Workers AI for /analyze and /chat
docker compose up --build -d --scale postgres=0
```

> **Serverless mode**: When PostgreSQL không chạy, PHP API tự động chuyển sang **mock mode** — trả về dữ liệu mẫu cho các route GET (`home`, `history`, `guides`, `scan/session`, `result/latest`, `auth/me`), đồng thời vẫn gọi thực sự tới Cloudflare Workers AI cho `analyze` và `chat`. Google OAuth vẫn thực hiện token verification với Google, nhưng không ghi vào database.

Truy cập:
- **PHP API**: http://localhost:887/detectplanet_api
- **AI Service**: Cloudflare Workers AI (deployed globally)
- **PostgreSQL** (full mode only): localhost:5432

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                                 │
│                        │                                            │
│                    ┌───┴───┐                                        │
│                    │  Expo  │  (mobile app: scan, chat, auth)       │
│                    │  App   │                                        │
│                    └───┬───┘                                        │
│                        │                                            │
│              ┌─────────┴─────────┐                                   │
│              │  Docker Stack     │                                    │
│              │    (port 887)      │                                   │
│              ├──  PHP API  ────────┐                                 │
│              │  (auth, scan,       │   ┌─────────────────┐           │
│              │   chat proxy)       ├──▶ Cloudflare AI    │           │
│              └──       ┬           │  │  Workers          │           │
│                        │           │  │ (predict + chat)  │           │
│                    ┌───┴───┐       │  └─────────────────┘           │
│                    │Postgres│       │                                │
│                    │(5432)  │       │                                │
│                    └───────┘       │                                │
└────────────────────────────────────┴───────────────────────────────┘
```

### Services (`docker-compose.yml`)

| Service        | Port  | Description                                    |
|---------------|-------|------------------------------------------------|
| `postgres`    | 5432  | PostgreSQL 16 with init SQL + seed (profile: full) |
| `api`         | 887   | PHP 8.2 + Apache + PDO (Cloudflare AI proxy)   |

### Cloudflare Worker

| File                          | Purpose                              |
|-------------------------------|--------------------------------------|
| `workers/ai-worker/wrangler.toml` | Worker config + AI binding        |
| `workers/ai-worker/src/index.js`  | `/predict` + `/chat` + `/health` |

Deploy:
```bash
cd workers/ai-worker
npm install
npx wrangler deploy --env production
```

## Production (HTTPS)

```bash
# 1. Generate SSL certs
certbot certonly --standalone -d agriscan.ai
cp /etc/letsencrypt/live/agriscan.ai/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/agriscan.ai/privkey.pem  nginx/certs/

# 2. Start with SSL
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 3. Deploy Cloudflare Worker
cd workers/ai-worker && npx wrangler deploy --env production
```

## Useful Commands

```bash
docker compose up --build -d   # Start full stack (with PostgreSQL)
docker compose down -v                         # Stop + clean volumes
docker compose logs -f                         # Follow all logs
docker compose ps                              # Show status

cd workers/ai-worker && npx wrangler dev        # Local Worker dev
```
