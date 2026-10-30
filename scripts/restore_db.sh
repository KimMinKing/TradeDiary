#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_DUMP="$(find "$ROOT_DIR/database/dumps" -maxdepth 1 -type f \( -name "*.dump" -o -name "*.sql" \) -print 2>/dev/null | xargs -r ls -1t | head -n 1 || true)"
DUMP_FILE="${1:-$DEFAULT_DUMP}"

if [[ -z "${DUMP_FILE}" ]]; then
  echo "No dump file found under database/dumps."
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Dump file not found: $DUMP_FILE"
  exit 1
fi

cd "$ROOT_DIR"

echo "Starting postgres..."
docker compose up -d postgres

echo "Waiting for postgres to become ready..."
for _ in {1..60}; do
  if docker compose exec -T postgres pg_isready -U tradediary -d tradediary >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Restoring dump: $DUMP_FILE"
EXTENSION="${DUMP_FILE##*.}"

if [[ "$EXTENSION" == "dump" ]]; then
  CONTAINER_DUMP_PATH="/tmp/$(basename "$DUMP_FILE")"
  docker cp "$DUMP_FILE" tradediary-postgres:"$CONTAINER_DUMP_PATH"
  docker compose exec -T postgres psql -U tradediary -d tradediary -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  docker compose exec -T postgres pg_restore \
    -U tradediary \
    -d tradediary \
    --clean \
    --if-exists \
    --no-owner \
    "$CONTAINER_DUMP_PATH"
  docker compose exec -T postgres rm -f "$CONTAINER_DUMP_PATH"
elif [[ "$EXTENSION" == "sql" ]]; then
  cat "$DUMP_FILE" | docker compose exec -T postgres psql -U tradediary -d tradediary
else
  echo "Unsupported dump type: $DUMP_FILE"
  exit 1
fi

echo "Database restore complete."
