#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/db-backup-manual.sh --dry-run
  scripts/db-backup-manual.sh run

Environment:
  BACKUP_DATABASE_URL  Preferred unpooled Neon connection string
  DATABASE_URL         Fallback connection string when BACKUP_DATABASE_URL is unset
  BACKUP_DIR           Optional output directory, defaults to backups/db

Use an unpooled Neon connection string for pg_dump. Do not use a host containing
"-pooler" for manual backups.
USAGE
}

mode="${1:---dry-run}"
backup_url="${BACKUP_DATABASE_URL:-${DATABASE_URL:-}}"
backup_dir="${BACKUP_DIR:-backups/db}"
timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
output_file="${backup_dir}/linksnap-${timestamp}.dump"

if [[ "${mode}" == "--help" || "${mode}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -z "${backup_url}" ]]; then
  echo "Missing BACKUP_DATABASE_URL or DATABASE_URL." >&2
  exit 1
fi

if [[ "${backup_url}" == *"-pooler"* ]]; then
  echo "Refusing pooled Neon connection string; use an unpooled backup URL." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is not installed or not on PATH." >&2
  exit 1
fi

if [[ "${mode}" == "--dry-run" ]]; then
  echo "pg_dump available: $(pg_dump --version)"
  echo "Backup output would be: ${output_file}"
  exit 0
fi

if [[ "${mode}" != "run" ]]; then
  usage
  exit 2
fi

mkdir -p "${backup_dir}"
pg_dump -Fc -v -Z 1 --no-blobs --lock-wait-timeout=20s -d "${backup_url}" -f "${output_file}"
chmod 600 "${output_file}"
echo "Backup written: ${output_file}"
