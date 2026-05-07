#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://www.justqiu.cloud}"
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

fetch_body_and_status() {
  local path="$1"
  local body_file="$2"

  curl -sS -o "$body_file" -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" \
    "$BASE_URL$path"
}

fetch_get() {
  local path="$1"
  local label="$2"
  local body_file

  body_file="$(mktemp)"
  LAST_STATUS="$(fetch_body_and_status "$path" "$body_file")"
  LAST_BODY="$(cat "$body_file")"
  rm -f "$body_file"

  echo "OK: $label returned HTTP $LAST_STATUS"
}

expect_not_found_body() {
  local body="$1"
  local label="$2"

  expect_contains "$body" "This link doesn't exist" "$label"
  expect_not_contains "$body" "INTERNAL_ERROR" "$label"
}

LAST_STATUS=""
LAST_BODY=""

fetch_get "/xss%3Cscript%3Ealert%281%29%3Cscript%3E" "xss-like slug"
expect_not_found_body "$LAST_BODY" "xss-like slug body"
expect_not_contains "$LAST_BODY" "<script>alert(1)<script>" "xss-like slug body"
expect_not_contains "$LAST_BODY" "alert(1)</script>" "xss-like slug body"
echo "OK: XSS-like slug is rejected without reflected script payload"

long_slug="$(printf 'a%.0s' {1..120})"
fetch_get "/$long_slug" "overlong slug"
expect_not_found_body "$LAST_BODY" "overlong slug body"
echo "OK: overlong slug is rejected without server error"

fetch_get "/.env" "env file exposure"
expect_not_contains "$LAST_BODY" "DATABASE_URL" "env file body"
expect_not_contains "$LAST_BODY" "AUTH_SECRET" "env file body"
echo "OK: .env is not publicly exposed"

malformed_json_response="$(
  curl -sS --max-time "$TIMEOUT_SECONDS" \
    -X POST "$BASE_URL/api/v1/auth/verify" \
    -H "content-type: application/json" \
    -H "x-requested-with: XMLHttpRequest" \
    -H "origin: $BASE_URL" \
    --data "{" \
    -w "\n%{http_code}"
)"
expect_contains "$malformed_json_response" "VALIDATION_ERROR" "malformed JSON response"
expect_contains "$malformed_json_response" "400" "malformed JSON response"
expect_not_contains "$malformed_json_response" "SyntaxError" "malformed JSON response"
echo "OK: malformed JSON returns generic validation error"

invalid_webhook_response="$(
  curl -sS --max-time "$TIMEOUT_SECONDS" \
    -X POST "$BASE_URL/api/v1/payments/webhook" \
    -H "content-type: application/json" \
    --data '{"gross_amount":"128000.00","order_id":"LS-penetration-smoke","signature_key":"bad-signature","status_code":"200","transaction_status":"settlement"}' \
    -w "\n%{http_code}"
)"
expect_contains "$invalid_webhook_response" "INVALID_SIGNATURE" "invalid webhook response"
expect_contains "$invalid_webhook_response" "401" "invalid webhook response"
echo "OK: invalid Midtrans webhook signature is rejected"

echo "Basic penetration smoke passed for $BASE_URL"
