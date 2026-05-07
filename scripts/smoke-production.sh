#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.justqiu.cloud}"
APEX_URL="${APEX_URL:-https://justqiu.cloud}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"

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

echo "Production smoke passed for $BASE_URL"
