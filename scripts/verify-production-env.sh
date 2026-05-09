#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-}"
PRODUCTION_URL="${PRODUCTION_URL:-https://www.justqiu.cloud}"
PAYGATE_URL="${PAYGATE_WEBHOOK_URL:-https://www.justqiu.cloud/api/v1/payments/webhook}"
GOOGLE_CALLBACK_URL="${GOOGLE_CALLBACK_URL:-https://www.justqiu.cloud/api/auth/callback/google}"

failures=0
warnings=0

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "FAIL: ENV_FILE does not exist: $ENV_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

fail() {
  echo "FAIL: $*" >&2
  failures=$((failures + 1))
}

warn() {
  echo "WARN: $*" >&2
  warnings=$((warnings + 1))
}

pass() {
  echo "OK: $*"
}

value_of() {
  local key="$1"
  printf '%s' "${!key-}"
}

require_var() {
  local key="$1"
  local description="$2"
  local value
  value="$(value_of "$key")"

  if [[ -z "${value// }" ]]; then
    fail "$key is required ($description)"
    return
  fi

  pass "$key is set"
}

require_one_of() {
  local label="$1"
  shift

  local key
  for key in "$@"; do
    if [[ -n "$(value_of "$key")" ]]; then
      pass "$label is set via $key"
      return
    fi
  done

  fail "$label is required; set one of: $*"
}

require_url() {
  local key="$1"
  local expected_prefix="${2:-https://}"
  local value
  value="$(value_of "$key")"

  if [[ -z "$value" ]]; then
    fail "$key is required"
    return
  fi

  if [[ "$value" != "$expected_prefix"* ]]; then
    fail "$key must start with $expected_prefix (got '$value')"
    return
  fi

  pass "$key uses $expected_prefix"
}

require_equals() {
  local key="$1"
  local expected="$2"
  local value
  value="$(value_of "$key")"

  if [[ "$value" != "$expected" ]]; then
    fail "$key must be '$expected' (got '${value:-<empty>}')"
    return
  fi

  pass "$key matches $expected"
}

require_min_length() {
  local key="$1"
  local min_length="$2"
  local value
  value="$(value_of "$key")"

  if (( ${#value} < min_length )); then
    fail "$key must be at least $min_length characters"
    return
  fi

  pass "$key length is >= $min_length"
}

require_not_value() {
  local key="$1"
  local forbidden="$2"
  local value
  value="$(value_of "$key")"

  if [[ "$value" == "$forbidden" ]]; then
    fail "$key must not be '$forbidden' in production"
    return
  fi

  pass "$key is not '$forbidden'"
}

echo "Verifying LinkSnap production environment"
echo "Expected production URL: $PRODUCTION_URL"

require_url NEXT_PUBLIC_APP_URL
require_url NEXT_PUBLIC_API_URL
require_url APP_URL
require_one_of "Auth canonical URL" AUTH_URL NEXTAUTH_URL
require_equals NEXT_PUBLIC_APP_URL "$PRODUCTION_URL"
require_equals NEXT_PUBLIC_API_URL "$PRODUCTION_URL/api/v1"
require_equals APP_URL "$PRODUCTION_URL"
require_equals AUTH_TRUST_HOST "true"

if [[ -n "${AUTH_URL-}" ]]; then
  require_equals AUTH_URL "$PRODUCTION_URL"
fi

if [[ -n "${NEXTAUTH_URL-}" ]]; then
  require_equals NEXTAUTH_URL "$PRODUCTION_URL"
fi

require_var DATABASE_URL "Neon PostgreSQL connection string"
require_var UPSTASH_REDIS_URL "Upstash Redis REST URL"
require_var UPSTASH_REDIS_TOKEN "Upstash Redis REST token"
require_var RESEND_API_KEY "Resend transactional email key"
require_var RESEND_FROM_EMAIL "Verified Resend sender"
require_var PAYGATE_API_BASE_URL "PayGate base URL"
require_var PAYGATE_STORE_API_TOKEN "PayGate store token"
require_var PAYGATE_WEBHOOK_SECRET "PayGate webhook HMAC secret"
require_var CRON_SECRET "Vercel cron shared secret"
require_var IP_HASH_SALT "Analytics IP hashing salt"
require_var USD_IDR_RATE "Pricing conversion fallback"
require_min_length AUTH_SECRET 32
require_min_length CRON_SECRET 32
require_min_length IP_HASH_SALT 32
require_min_length PAYGATE_WEBHOOK_SECRET 16

if [[ -z "${AUTH_GOOGLE_ID-}" || -z "${AUTH_GOOGLE_SECRET-}" ]]; then
  fail "Google OAuth requires AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET"
else
  pass "Google OAuth credentials are set"
fi

require_not_value AUTH_EMAIL_DELIVERY "file"
require_not_value PAYMENT_EMAIL_DELIVERY "file"

if [[ -n "${MAXMIND_DB_PATH-}" && ! -f "$MAXMIND_DB_PATH" ]]; then
  warn "MAXMIND_DB_PATH is set but file is not present in this environment: $MAXMIND_DB_PATH"
else
  pass "MAXMIND_DB_PATH is unset or points to an existing file"
fi

if [[ "${PAYGATE_API_BASE_URL-}" != https://* ]]; then
  fail "PAYGATE_API_BASE_URL must use https"
else
  pass "PAYGATE_API_BASE_URL uses https"
fi

echo "Manual dashboard checks:"
echo "- Vercel env vars must match this script output for Production."
echo "- Vercel custom domains: justqiu.cloud and www.justqiu.cloud."
echo "- Vercel Cron paths: /api/v1/analytics/click-queue/process and /api/v1/payments/subscriptions/renew."
echo "- Google OAuth callback URL: $GOOGLE_CALLBACK_URL"
echo "- PayGate webhook URL: $PAYGATE_URL"

if (( failures > 0 )); then
  echo "Production env verification failed with $failures failure(s) and $warnings warning(s)." >&2
  exit 1
fi

echo "Production env verification passed with $warnings warning(s)."
