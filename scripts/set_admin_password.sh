#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."  # repo root

# Load DB URL safely from .env
if [[ ! -f .env ]]; then
  echo "❌ .env not found"; exit 1
fi
export DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | cut -d= -f2-)"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL missing in .env"; exit 1
fi

ADMIN_EMAIL="${1:-admin@orion.dev}"
NEW_PASS="${2:-}"
if [[ -z "$NEW_PASS" ]]; then
  echo "Usage: scripts/set_admin_password.sh <email> <new-password>"
  exit 1
fi

# Hash (sync)
HASH="$(node -e "console.log(require('bcrypt').hashSync(process.argv[1], 10))" "$NEW_PASS")"

# Upsert
cat > /tmp/upsert_admin_password.sql <<SQL
INSERT INTO public.users ("id","email","passwordHash","createdAt","updatedAt")
VALUES (
  'usr_' || substr(md5(random()::text),1,12),
  '${ADMIN_EMAIL}',
  '${HASH}',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE
SET "passwordHash" = EXCLUDED."passwordHash",
    "updatedAt"   = now();
SQL

psql "$DATABASE_URL" -f /tmp/upsert_admin_password.sql >/dev/null

echo "✅ Local password set for ${ADMIN_EMAIL}"
