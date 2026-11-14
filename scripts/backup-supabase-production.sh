#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env.supabase-backup"
OUT_DIR="$ROOT/backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$OUT_DIR/supabase-production-$STAMP.dump"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Create it with SUPABASE_DB_URL set; do not commit it." >&2
  exit 2
fi
if ! grep -Eq '^SUPABASE_DB_URL=postgres(ql)?://' "$ENV_FILE"; then
  echo "SUPABASE_DB_URL is missing or malformed in $ENV_FILE. Use a plain, unquoted Docker env-file assignment." >&2
  exit 2
fi
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
echo "Creating encrypted-transport PostgreSQL custom-format dump from Supabase..."
# Connection URL is passed only inside the container environment; it is not echoed.
docker run --rm --env-file "$ENV_FILE" postgres:17-alpine \
  sh -ceu 'pg_dump "$SUPABASE_DB_URL" --no-owner --no-acl --format=custom' > "$OUT_FILE"
chmod 600 "$OUT_FILE"
if [[ ! -s "$OUT_FILE" ]]; then
  rm -f "$OUT_FILE"
  echo "Backup file is empty; aborting." >&2
  exit 1
fi
printf '\nBackup created: %s\n' "$OUT_FILE"
ls -lh "$OUT_FILE"
sha256sum "$OUT_FILE"
echo "Do not delete the Supabase project or change production DNS yet. Store a second copy off the VPS before proceeding."
