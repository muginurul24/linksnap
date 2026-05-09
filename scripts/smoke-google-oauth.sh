#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://www.justqiu.cloud}"
APP_URL="${APP_URL%/}"
EXPECTED_SIGNIN_URL="${APP_URL}/api/auth/signin/google"
EXPECTED_CALLBACK_URL="${APP_URL}/api/auth/callback/google"

fail() {
  printf 'Google OAuth smoke failed: %s\n' "$1" >&2
  exit 1
}

providers_json="$(curl -fsSL "${APP_URL}/api/auth/providers")"

PROVIDERS_JSON="$providers_json" \
EXPECTED_SIGNIN_URL="$EXPECTED_SIGNIN_URL" \
EXPECTED_CALLBACK_URL="$EXPECTED_CALLBACK_URL" \
node <<'NODE'
const providers = JSON.parse(process.env.PROVIDERS_JSON ?? "{}");
const google = providers.google;

if (!google) {
  console.error("Google provider is missing from /api/auth/providers.");
  process.exit(1);
}

if (google.signinUrl !== process.env.EXPECTED_SIGNIN_URL) {
  console.error(
    `Expected Google signinUrl ${process.env.EXPECTED_SIGNIN_URL}, got ${google.signinUrl}.`,
  );
  process.exit(1);
}

if (google.callbackUrl !== process.env.EXPECTED_CALLBACK_URL) {
  console.error(
    `Expected Google callbackUrl ${process.env.EXPECTED_CALLBACK_URL}, got ${google.callbackUrl}.`,
  );
  process.exit(1);
}
NODE

headers_file="$(mktemp)"
trap 'rm -f "$headers_file"' EXIT

callback_param="$(
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' \
    "${APP_URL}/links"
)"
status="$(
  curl -fsS -o /dev/null -D "$headers_file" -w '%{http_code}' \
    "${EXPECTED_SIGNIN_URL}?callbackUrl=${callback_param}" || true
)"

case "$status" in
  302|303|307) ;;
  *) fail "expected Google sign-in to redirect to Google, got HTTP ${status}" ;;
esac

location="$(
  awk 'BEGIN {IGNORECASE = 1} /^location:/ {sub(/\r$/, ""); print substr($0, index($0, $2)); exit}' \
    "$headers_file"
)"

location_host="$(
  LOCATION="$location" node <<'NODE'
try {
  const url = new URL(process.env.LOCATION ?? "");
  process.stdout.write(url.hostname);
} catch {
  process.exit(1);
}
NODE
)"

if [[ "$location_host" != "accounts.google.com" ]]; then
  fail "expected redirect host accounts.google.com, got ${location_host:-empty}"
fi

printf 'Google OAuth smoke passed for %s\n' "$APP_URL"
