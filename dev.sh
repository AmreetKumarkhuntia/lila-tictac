#!/usr/bin/env bash
set -e

# ── Step 1: Stop containers (pass --wipe to also remove volumes/data) ────────
if [ "$1" = "--wipe" ]; then
  echo ">> Stopping containers and removing volumes (fresh DB)..."
  docker-compose down -v
else
  echo ">> Stopping containers (keeping data)..."
  docker-compose down
fi

# ── Step 2: Build Nakama modules ─────────────────────────────────────────────
echo ">> Building Nakama modules..."
npm --prefix nakama run build

# ── Step 3: Start backend ────────────────────────────────────────────────────
echo ">> Starting Nakama + PostgreSQL..."
docker-compose up -d

# ── Step 4: Wait for Nakama to be healthy ────────────────────────────────────
echo ">> Waiting for Nakama to be healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -sf http://127.0.0.1:7350/ > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "!! Nakama failed to start after ${MAX_ATTEMPTS}s. Dumping logs:"
    docker-compose logs --tail=40 nakama
    exit 1
  fi
  sleep 1
done
echo ">> Nakama is up!"

# ── Step 5: Show loaded modules ──────────────────────────────────────────────
echo ">> Nakama startup logs:"
docker-compose logs --tail=20 nakama | grep -iE "runtime|module|rpc|match" || true
echo ""

# ── Step 6: Start Vite frontend dev server ───────────────────────────────────
echo ">> Starting Vite dev server..."
exec npx vite
