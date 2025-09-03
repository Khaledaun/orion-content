#!/usr/bin/env bash
# Orion Content — Prod Smoke Tests (auth + core pages)
set -uo pipefail

bold(){ printf "\n\033[1m==> %s\033[0m\n" "$*"; }
section(){ printf "\n\033[1;34m### %s\033[0m\n" "$*"; }

# ----- Setup -----
if [[ -z "${HOST:-}" ]]; then
  read -rp "Production host (no protocol, e.g. my-app.vercel.app): " HOST
fi
# normalize: strip protocol/path if pasted
HOST="${HOST#http://}"; HOST="${HOST#https://}"; HOST="${HOST%%/*}"
if [[ -z "$HOST" ]]; then echo "HOST is empty"; exit 2; fi
PROD_URL="https://${HOST}"

read -rp "Vercel protection bypass token (Enter if none): " BYPASS
JAR="$(mktemp)"; TMPDIR="$(mktemp -d)"

bold "Setting Vercel bypass cookie (best-effort)"
if [[ -n "$BYPASS" ]]; then
  curl -sS -c "$JAR" -o /dev/null \
    "$PROD_URL/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$BYPASS" || true
else
  : >"$JAR"
fi

classify(){ code="$1"; hdr="$2";
  mpath="$(grep -i '^x-matched-path:' "$hdr" | awk -F': ' '{print $2}' | tr -d '\r')"
  ctype="$(grep -i '^content-type:' "$hdr" | awk -F': ' '{print $2}' | tr -d '\r')"
  if [[ "$code" == "200" ]]; then
    [[ "$ctype" == application/json* ]] && echo "✅ 200 JSON — route registered" || echo "⚠️ 200 non-JSON: $ctype"
  elif [[ "$code" == "404" ]]; then
    [[ "$mpath" == "/_not-found" ]] && echo "❌ 404 (x-matched-path: /_not-found) — not in build" || echo "❌ 404 — not found"
  elif [[ "$code" == "500" ]]; then
    echo "❌ 500 — handler crashed (env/runtime)"
  else
    echo "ℹ️ HTTP $code"
  fi
}

req(){ path="$1"; label="${2:-GET $1}"; section "$label"
  hdr="$TMPDIR/h.$RANDOM"; body="$TMPDIR/b.$RANDOM"
  code="$(curl -sS -b "$JAR" -o "$body" -D "$hdr" -w "%{http_code}" "$PROD_URL$path" || echo 000)"
  echo "URL: $PROD_URL$path"
  echo "HTTP: $code"
  echo "-- Headers (top) --"; sed -n '1,20p' "$hdr"
  echo "-- Body (first 300) --"; head -c 300 "$body" | sed 's/[^[:print:]\t]\+/./g'; echo
  classify "$code" "$hdr"
}

bold "Auth endpoints — expect 200 + JSON"
req "/api/auth/providers"
req "/api/auth/csrf"
req "/api/auth/session" "GET /api/auth/session (unauthenticated)"

bold "Pages — expect 200 (or redirect→200), not 500"
req "/"
req "/login"
req "/dashboard"

bold "Interpretation key"
echo "- ✅ 200 + application/json => route registered & working"
echo "- ❌ 404 + x-matched-path: /_not-found => route not included in build"
echo "- ❌ 500 => handler crashed (env/logic)"
