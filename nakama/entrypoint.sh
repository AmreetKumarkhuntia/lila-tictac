#!/bin/sh
set -e

DB_ADDR="${NAKAMA_DB_USER}:${NAKAMA_DB_PASSWORD}@${NAKAMA_DB_HOST}:${NAKAMA_DB_PORT}/${NAKAMA_DB_NAME}"

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "${DB_ADDR}"

API_PORT="${PORT:-7350}"

echo "Starting Nakama server on port ${API_PORT}..."
exec /nakama/nakama \
  --name nakama1 \
  --database.address "${DB_ADDR}" \
  --config /nakama/data/local.yml \
  --api.port "${API_PORT}"
