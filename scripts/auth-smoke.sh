#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:3000}"
JAR=".cookies.nextauth.jar"; rm -f "$JAR"
EMAIL="${EMAIL:-admin@example.com}"
PASS="${PASS:-secret123}"

csrf=$(curl -sS -c "$JAR" "$BASE/api/auth/csrf" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).csrfToken)}catch{process.stdout.write("")}})')
curl -sS -b "$JAR" -c "$JAR" -i "$BASE/api/auth/callback/credentials" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$csrf" \
  --data-urlencode "callbackUrl=$BASE/" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASS" >/dev/null

echo "Session:"; curl -sS -b "$JAR" "$BASE/api/auth/session"; echo
echo "Sites (GET):"; curl -sS -b "$JAR" "$BASE/api/sites"; echo
KEY="smoke-$(date +%s)"
echo "Create site:"; curl -sS -b "$JAR" -H 'content-type: application/json' \
  -d '{"key":"'"$KEY"'","name":"Smoke","timezone":"UTC","publisher":"wordpress","locales":["en"]}' \
  "$BASE/api/sites"; echo
