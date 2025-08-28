#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:?BASE_URL not set}"
TOKEN="${ORION_TOKEN:?ORION_TOKEN not set}"

AUTH="Authorization: Bearer $TOKEN"
CURL="curl -fsS --retry 2 --retry-connrefused --connect-timeout 5"

ok(){ printf "\033[32m✓ %s\033[0m\n" "$1"; }
fail(){ printf "\033[31m✗ %s\033[0m\n" "$1"; exit 1; }

# health (no auth)
$CURL "$BASE_URL/api/health" >/dev/null && ok "/api/health" || fail "/api/health failed"

# bearer-protected GETs
$CURL -H "$AUTH" "$BASE_URL/api/sites"         >/dev/null && ok "GET /api/sites"         || fail "GET /api/sites (bearer) failed"
$CURL -H "$AUTH" "$BASE_URL/api/weeks/current" >/dev/null && ok "GET /api/weeks/current" || fail "GET /api/weeks/current (bearer) failed"
$CURL -H "$AUTH" "$BASE_URL/api/daily-picks"   >/dev/null && ok "GET /api/daily-picks"   || fail "GET /api/daily-picks (bearer) failed"

# save secrets again via API (idempotent)
payload='{
  "openaiApiKey":"sk-test",
  "cseProvider":"cse",
  "cseId":"cx-test",
  "cseApiKey":"cse-test",
  "wordpress":{"baseUrl":"https://yoursite.com","username":"user","appPassword":"app-pass"},
  "consoleToken":"'"$TOKEN"'"
}'
echo "$payload" | $CURL -H "Content-Type: application/json" -H "$AUTH" \
  -d @- "$BASE_URL/api/setup/secrets" >/dev/null \
  && ok "POST /api/setup/secrets" || fail "POST /api/setup/secrets failed (401 means token not saved)"

# connections list
$CURL -H "$AUTH" "$BASE_URL/api/connections" >/dev/null && ok "GET /api/connections" || fail "GET /api/connections failed"

# optional GitHub secrets push
if [[ -n "${GITHUB_PAT:-}" ]]; then
  repo="${GITHUB_REPO_FULL:-$(git config --get remote.origin.url | sed -E 's#.*/github.com/([^/]+/[^.]+)(\.git)?#\1#')}"
  gh_payload='{
    "repoFull":"'"$repo"'",
    "pat":"'"${GITHUB_PAT:?}"'",
    "secrets":{
      "OPENAI_API_KEY":"sk-test",
      "CSE_ID":"cx-test",
      "CSE_API_KEY":"cse-test",
      "WORDPRESS_BASE_URL":"https://yoursite.com",
      "WORDPRESS_USERNAME":"user",
      "WORDPRESS_APP_PASSWORD":"app-pass",
      "ORION_CONSOLE_TOKEN":"'"$TOKEN"'"
    }
  }'
  echo "$gh_payload" | $CURL -H "Content-Type: application/json" -H "$AUTH" \
    -d @- "$BASE_URL/api/setup/github-secrets" >/dev/null \
    && ok "POST /api/setup/github-secrets" || fail "GitHub secrets push failed"
else
  printf "⚠ Skipping GitHub secrets push (set GITHUB_PAT to enable).\n"
fi

ok "Phase 2 smoke tests passed."
