#!/bin/sh
set -eu

env_file="${ENV_FILE:-.env.production}"
backup_dir="${BACKUP_DIR:-./backups}"
timestamp=$(date -u '+%Y%m%dT%H%M%SZ')

sh ./deploy/validate-production-env.sh "$env_file"
mkdir -p "$backup_dir"
docker compose --env-file "$env_file" -f docker-compose.production.yml exec -T mongodb \
  sh -c 'mongodump --archive --gzip --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
  > "$backup_dir/tailoros-$timestamp.archive.gz"
test -s "$backup_dir/tailoros-$timestamp.archive.gz"
chmod 600 "$backup_dir/tailoros-$timestamp.archive.gz"
printf 'MongoDB backup created: %s/tailoros-%s.archive.gz\n' "$backup_dir" "$timestamp"
