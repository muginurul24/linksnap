#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/load-test-redirect.sh --dry-run redirect
  scripts/load-test-redirect.sh run redirect
  scripts/load-test-redirect.sh run api

Environment:
  LOAD_TEST_TARGET          Base URL, for example https://www.justqiu.cloud
  LOAD_TEST_SLUG            Existing cached short-link slug for redirect tests
  LOAD_TEST_SESSION_COOKIE  Authenticated session cookie for API/payment tests
  LOAD_TEST_LINK_ID         Existing owned link ID for analytics API tests

The run mode uses bunx artillery. Execute only against approved staging or
production windows.
USAGE
}

mode="${1:-}"
profile="${2:-redirect}"

if [[ "${mode}" == "--help" || "${mode}" == "-h" ]]; then
  usage
  exit 0
fi

case "${profile}" in
  redirect)
    config_file="scripts/load-test-redirect.yml"
    required_vars=("LOAD_TEST_TARGET" "LOAD_TEST_SLUG")
    ;;
  api)
    config_file="scripts/load-test-api.yml"
    required_vars=("LOAD_TEST_TARGET" "LOAD_TEST_SESSION_COOKIE" "LOAD_TEST_LINK_ID")
    ;;
  *)
    usage
    exit 2
    ;;
esac

if [[ ! -f "${config_file}" ]]; then
  echo "Missing Artillery config: ${config_file}" >&2
  exit 1
fi

if [[ "${mode}" == "--dry-run" ]]; then
  echo "Load test config found: ${config_file}"
  echo "Profile: ${profile}"
  echo "Required vars: ${required_vars[*]}"
  exit 0
fi

if [[ "${mode}" != "run" ]]; then
  usage
  exit 2
fi

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
done

echo "Running ${profile} load test against ${LOAD_TEST_TARGET}"
bunx artillery run "${config_file}"
