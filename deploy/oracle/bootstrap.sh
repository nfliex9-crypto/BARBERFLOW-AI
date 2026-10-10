#!/usr/bin/env bash
# Run on a provisioned Always Free Oracle Ubuntu instance with Docker installed.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo 'Docker Engine and Compose plugin required. See deploy/oracle/README.md.' >&2
  exit 1
fi
DOMAIN="${BARBERFLOW_DOMAIN:-}"
if [[ -z "$DOMAIN" ]]; then
  printf 'Public DNS hostname pointing at the VM: '
  read -r DOMAIN
fi
if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]] || [[ "$DOMAIN" != *.* ]]; then
  echo 'Supply a DNS hostname, not an IP or full URL.' >&2
  exit 1
fi
if [[ -f .env ]]; then
  echo 'Existing secret retained.'
  set -a
  source .env
  set +a
  if [[ "$DOMAIN" != "$BARBERFLOW_DOMAIN" ]]; then
    echo 'Hostname differs from stored .env. Edit .env safely and retry.' >&2
    exit 1
  fi
else
  umask 077
  SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"
  printf 'BARBERFLOW_DOMAIN=%s\nBARBERFLOW_SECRET_KEY=%s\n' "$DOMAIN" "$SECRET" > .env
  chmod 600 .env
fi
docker compose --env-file .env -f compose.yaml config --quiet
docker compose --env-file .env -f compose.yaml up --build -d
printf '\nTest: https://%s/api/ready\n' "$DOMAIN"
echo 'DNS propagation, HTTPS certificate issuance, and Oracle ingress rules are prerequisites.'
echo 'Never commit .env or use docker compose down -v: that destroys media and user data.'
