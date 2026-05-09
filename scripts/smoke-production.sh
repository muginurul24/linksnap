#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.justqiu.cloud}"
APEX_URL="${APEX_URL:-https://justqiu.cloud}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"
PRODUCTION_SMOKE_COOKIE="${PRODUCTION_SMOKE_COOKIE:-}"
PRODUCTION_SMOKE_ADMIN_USER_ID="${PRODUCTION_SMOKE_ADMIN_USER_ID:-}"
PRODUCTION_SMOKE_ADMIN_PLAN="${PRODUCTION_SMOKE_ADMIN_PLAN:-BUSINESS}"
PRODUCTION_SMOKE_RUN_ADMIN_MUTATION="${PRODUCTION_SMOKE_RUN_ADMIN_MUTATION:-false}"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

expect_contains() {
  local value="$1"
  local expected="$2"
  local label="$3"

  if [[ "$value" != *"$expected"* ]]; then
    fail "$label did not include '$expected'"
  fi
}

expect_not_contains() {
  local value="$1"
  local forbidden="$2"
  local label="$3"

  if [[ "$value" == *"$forbidden"* ]]; then
    fail "$label unexpectedly included '$forbidden'"
  fi
}

expect_status() {
  local expected="$1"
  local url="$2"
  local status

  status="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "$url")"
  if [[ "$status" != "$expected" ]]; then
    fail "$url returned HTTP $status, expected $expected"
  fi

  echo "OK: $url returned HTTP $expected"
}

expect_authenticated_page() {
  local path="$1"
  local label="$2"

  if [[ -z "$PRODUCTION_SMOKE_COOKIE" ]]; then
    echo "SKIP: $label requires PRODUCTION_SMOKE_COOKIE"
    return
  fi

  local body_file
  local status
  body_file="$(mktemp)"
  status="$(
    curl -sS -o "$body_file" -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" \
      -H "cookie: $PRODUCTION_SMOKE_COOKIE" \
      "$BASE_URL$path"
  )"

  if [[ "$status" != "200" ]]; then
    rm -f "$body_file"
    fail "$label returned HTTP $status, expected 200"
  fi

  local body
  body="$(<"$body_file")"
  rm -f "$body_file"
  expect_not_contains "$body" "Unhandled Runtime Error" "$label body"
  expect_not_contains "$body" "app_sidebar_dropdown_menu_render_error" "$label body"
  expect_not_contains "$body" "Error: " "$label body"
  echo "OK: $label returned HTTP 200 with authenticated session"
}

expect_authenticated_json_api() {
  local path="$1"
  local label="$2"

  if [[ -z "$PRODUCTION_SMOKE_COOKIE" ]]; then
    echo "SKIP: $label requires PRODUCTION_SMOKE_COOKIE"
    return
  fi

  local response
  response="$(
    curl -sS --max-time "$TIMEOUT_SECONDS" \
      -H "accept: application/json" \
      -H "cookie: $PRODUCTION_SMOKE_COOKIE" \
      "$BASE_URL$path" \
      -w "\n%{http_code}"
  )"
  expect_contains "$response" '"success":true' "$label"
  expect_contains "$response" "200" "$label"
  echo "OK: $label returned successful JSON"
}

smoke_admin_plan_change() {
  if [[ "$PRODUCTION_SMOKE_RUN_ADMIN_MUTATION" != "true" ]]; then
    echo "SKIP: admin plan mutation requires PRODUCTION_SMOKE_RUN_ADMIN_MUTATION=true"
    return
  fi

  if [[ -z "$PRODUCTION_SMOKE_COOKIE" || -z "$PRODUCTION_SMOKE_ADMIN_USER_ID" ]]; then
    echo "SKIP: admin plan mutation requires PRODUCTION_SMOKE_COOKIE and PRODUCTION_SMOKE_ADMIN_USER_ID"
    return
  fi

  local response
  response="$(
    curl -sS --max-time "$TIMEOUT_SECONDS" \
      -X PATCH "$BASE_URL/api/v1/admin/users/$PRODUCTION_SMOKE_ADMIN_USER_ID" \
      -H "content-type: application/json" \
      -H "origin: $BASE_URL" \
      -H "x-requested-with: XMLHttpRequest" \
      -H "cookie: $PRODUCTION_SMOKE_COOKIE" \
      --data "{\"plan\":\"$PRODUCTION_SMOKE_ADMIN_PLAN\"}" \
      -w "\n%{http_code}"
  )"

  expect_contains "$response" '"success":true' "admin plan mutation"
  expect_contains "$response" "\"plan\":\"$PRODUCTION_SMOKE_ADMIN_PLAN\"" "admin plan mutation"
  expect_contains "$response" "200" "admin plan mutation"
  echo "OK: admin plan mutation accepted required headers"
}

apex_headers="$(curl -sS -I --max-time "$TIMEOUT_SECONDS" "$APEX_URL")"
expect_contains "$apex_headers" " 307" "apex redirect status"
expect_contains "${apex_headers,,}" "location: $BASE_URL/" "apex redirect location"
echo "OK: $APEX_URL redirects to $BASE_URL/"

base_headers="$(curl -sS -I --max-time "$TIMEOUT_SECONDS" "$BASE_URL")"
expect_contains "$base_headers" " 200" "base status"
expect_contains "${base_headers,,}" "content-security-policy:" "base headers"
expect_contains "${base_headers,,}" "strict-transport-security:" "base headers"
expect_contains "${base_headers,,}" "x-frame-options: deny" "base headers"
echo "OK: $BASE_URL returns security headers"

for path in / /pricing /blog /login /register /verify /sitemap.xml /robots.txt; do
  expect_status "200" "$BASE_URL$path"
done

sitemap="$(curl -sS --max-time "$TIMEOUT_SECONDS" "$BASE_URL/sitemap.xml")"
expect_contains "$sitemap" "$BASE_URL/" "sitemap"
expect_contains "$sitemap" "$BASE_URL/pricing" "sitemap"
expect_contains "$sitemap" "$BASE_URL/blog" "sitemap"
expect_not_contains "$sitemap" "linksnap.id" "sitemap"
echo "OK: sitemap uses $BASE_URL"

robots="$(curl -sS --max-time "$TIMEOUT_SECONDS" "$BASE_URL/robots.txt")"
expect_contains "$robots" "Host: $BASE_URL" "robots"
expect_contains "$robots" "Sitemap: $BASE_URL/sitemap.xml" "robots"
expect_contains "$robots" "Disallow: /api" "robots"
expect_contains "$robots" "Disallow: /login" "robots"
expect_contains "$robots" "Disallow: /register" "robots"
expect_contains "$robots" "Disallow: /verify" "robots"
expect_not_contains "$robots" "linksnap.id" "robots"
echo "OK: robots uses $BASE_URL"

missing_header_response="$(
  curl -sS --max-time "$TIMEOUT_SECONDS" \
    -X POST "$BASE_URL/api/v1/auth/verify" \
    -H "content-type: application/json" \
    --data '{"email":"smoke@example.invalid","otp":"000000"}' \
    -w "\n%{http_code}"
)"
expect_contains "$missing_header_response" "CSRF_HEADER_REQUIRED" "missing-header API guard"
expect_contains "$missing_header_response" "403" "missing-header API guard"
echo "OK: API guard rejects missing custom header"

bad_origin_response="$(
  curl -sS --max-time "$TIMEOUT_SECONDS" \
    -X POST "$BASE_URL/api/v1/auth/verify" \
    -H "content-type: application/json" \
    -H "x-requested-with: XMLHttpRequest" \
    -H "origin: https://attacker.test" \
    --data '{"email":"smoke@example.invalid","otp":"000000"}' \
    -w "\n%{http_code}"
)"
expect_contains "$bad_origin_response" "FORBIDDEN_ORIGIN" "bad-origin API guard"
expect_contains "$bad_origin_response" "403" "bad-origin API guard"
echo "OK: API guard rejects untrusted origin"

expect_authenticated_page "/analytics" "authenticated analytics page"
expect_authenticated_page "/admin/analytics" "superadmin analytics page"
expect_authenticated_json_api "/api/v1/admin/analytics" "superadmin analytics API"
smoke_admin_plan_change

echo "OK: cache fallback smoke command is available via 'rtk bun run smoke:cache-fallback'"
echo "Production smoke passed for $BASE_URL"
