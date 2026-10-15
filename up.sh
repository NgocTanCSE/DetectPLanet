#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# AgriScan AI — Single-command full-stack Docker launcher
#
#   ./up.sh              # build + start everything (detached, WITH database)
#   ./up.sh serverless   # build + start WITHOUT database (MVP: FE + API)
#   ./up.sh -f           # follow logs after starting
#   ./up.sh -f serverless
#   ./up.sh build        # (re)build images only, don't start
#
# Brings up:
#   Default:  PostgreSQL + PHP API (both start by default)
#   Serverless (MVP):  PHP API only (postgres scaled to 0 — API uses mock data)
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")"

# ── Helpers ──────────────────────────────────────────────────────────
log() { echo "  $1"; }
ok()  { echo "✅ $1"; }
warn() { echo "⚠️  $1"; }

# ── 1. Preflight: Docker must be running ─────────────────────────────
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# ── 2. Ensure .env exists ───────────────────────────────────────────
if [ ! -f .env ]; then
    log "⚡ .env not found — creating from .env.example"
    cp .env.example .env
    warn "Please review .env and set your Google OAuth credentials before deploying."
fi

# ── 3. Parse arguments ──────────────────────────────────────────────
FOLLOW_LOGS=false
BUILD_ONLY=false
SERVERLESS=false

for arg in "$@"; do
    case "$arg" in
        -f|--logs)  FOLLOW_LOGS=true ;;
        build)      BUILD_ONLY=true ;;
        serverless) SERVERLESS=true ;;
        *)           echo "Unknown option: $arg"; echo "Usage: $0 [-f|--logs] [build] [serverless]"  ; exit 1 ;;
    esac
done

# ── 4. Select compose mode ──────────────────────────────────────────
# Default: PostgreSQL + PHP API (both start together)
# Serverless MVP: skip the DB by scaling postgres=0
SCALE_POSTGRES=""
MODE_DESC="PostgreSQL + API + Web"

if [ "$SERVERLESS" = true ]; then
    SCALE_POSTGRES="--scale postgres=0"   # skip postgres container
    MODE_DESC="Web + API (Serverless MVP — no database)"
fi

# ── 5. Build + start ────────────────────────────────────────────────
echo ""
echo "🚀 AgriScan AI — Docker Stack"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Mode: $MODE_DESC"
echo ""

if [ "$BUILD_ONLY" = true ]; then
    log "🔨 Building all images..."
    docker compose build
    ok "Build complete."
    exit 0
fi

# Start services (serverless mode scales postgres=0 to skip the DB)
if [ "$SERVERLESS" = true ]; then
    log "🔨 Building and starting serverless stack (Web + API, no DB)..."
    docker compose up -d --build $SCALE_POSTGRES
else
    log "🔨 Building and starting all services ($MODE_DESC)..."
    docker compose up -d --build
fi

# ── 5. Wait for services to be running ──────────────────────────────
log "⏳ Waiting for services to start..."
TOTAL=$(docker compose ps --services 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL" -eq 0 ]; then
    warn "No services found — something went wrong."
    exit 1
fi

READY=false
for i in $(seq 1 60); do
    RUNNING=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RUNNING" -ge "$TOTAL" ]; then
        READY=true
        break
    fi
    sleep 2
done

# ── Wait for healthy status ─────────────────────────────────────────
log "⏳ Waiting for health checks..."
HEALTHY=false
for i in $(seq 1 60); do
    HEALTHY_COUNT=$(docker compose ps --services --filter "status=running" 2>/dev/null | while read svc; do
        state=$(docker compose ps --format "{{.State}}" "$svc" 2>/dev/null)
        if echo "$state" | grep -q "healthy"; then echo "1"; fi
    done | wc -l | tr -d ' ')
    if [ "$HEALTHY_COUNT" -ge "$TOTAL" ]; then
        HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$READY" = true ]; then
    ok "All $TOTAL services are running."
else
    warn "Some services are still starting up. Check:  docker compose ps"
fi
if [ "$HEALTHY" = true ]; then
    ok "All $TOTAL services are healthy."
fi

# ── 6. Show status + access info ─────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐  Web Frontend:  http://localhost"
echo "🔌  PHP API:       http://localhost/detectplanet_api"
echo "🧠  AI Service:    http://localhost/ai/"
if [ "$SERVERLESS" = false ]; then
    echo "🗄️   PostgreSQL:   localhost:5432"
fi
echo ""
echo "📝  Logs:   docker compose logs -f"
echo "🛑  Stop:   docker compose down -v"
echo ""

if [ "$FOLLOW_LOGS" = true ]; then
    log "Streaming logs (Ctrl+C to detach)..."
    docker compose logs -f --tail=20
fi
