#!/bin/sh
set -e

DB_ADDR="${NAKAMA_DB_USER}:${NAKAMA_DB_PASSWORD}@${NAKAMA_DB_HOST}:${NAKAMA_DB_PORT}/${NAKAMA_DB_NAME}"

echo "Running Nakama migrations..."
/nakama/nakama migrate up --database.address "${DB_ADDR}"

echo "Starting Nakama server..."
exec /nakama/nakama \
  --database.address "${DB_ADDR}" \
  --config /nakama/data/local.yml
