#!/bin/sh
set -eu

env_file="${1:-.env.production}"
if [ ! -f "$env_file" ]; then
  printf 'Production environment file not found: %s\n' "$env_file" >&2
  exit 1
fi

required='DOMAIN MONGO_ROOT_USER MONGO_ROOT_PASSWORD MONGO_APP_USER MONGO_APP_PASSWORD MONGODB_URI REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET BARCODE_SIGNING_SECRET'
for key in $required; do
  value=$(grep -E "^${key}=" "$env_file" | tail -n 1 | cut -d= -f2- || true)
  if [ -z "$value" ] || printf '%s' "$value" | grep -q 'CHANGE_ME\|example.com'; then
    printf 'Missing or placeholder production setting: %s\n' "$key" >&2
    exit 1
  fi
done

secret_values=''
for secret in MONGO_ROOT_PASSWORD MONGO_APP_PASSWORD REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET BARCODE_SIGNING_SECRET; do
  value=$(grep -E "^${secret}=" "$env_file" | tail -n 1 | cut -d= -f2-)
  if ! printf '%s' "$value" | grep -Eq '^[[:xdigit:]]{32,}$'; then
    printf '%s must be at least 32 hexadecimal characters\n' "$secret" >&2
    exit 1
  fi
  case " $secret_values " in
    *" $value "*)
      printf 'Production secrets must all be unique (%s is reused)\n' "$secret" >&2
      exit 1
      ;;
  esac
  secret_values="$secret_values $value"
done

app_user=$(grep -E '^MONGO_APP_USER=' "$env_file" | tail -n 1 | cut -d= -f2-)
app_password=$(grep -E '^MONGO_APP_PASSWORD=' "$env_file" | tail -n 1 | cut -d= -f2-)
mongo_uri=$(grep -E '^MONGODB_URI=' "$env_file" | tail -n 1 | cut -d= -f2-)
case "$mongo_uri" in
  "mongodb://$app_user:$app_password@"*) ;;
  *)
    printf 'MONGODB_URI must authenticate as MONGO_APP_USER using MONGO_APP_PASSWORD\n' >&2
    exit 1
    ;;
esac

printf 'Production environment contains required non-placeholder values.\n'
