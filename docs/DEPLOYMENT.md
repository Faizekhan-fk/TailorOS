# Production Deployment: Linux VPS

The production Compose file is intended for a fresh Linux VPS with Docker Compose v2. It is not the development `docker-compose.yml` stack and has not been deployed to a live domain by this repository change.

## Requirements

- Linux VPS with Docker Engine and the Compose plugin
- A domain whose A/AAAA records point to the server
- Inbound TCP ports 80 and 443; UDP 443 is optional for HTTP/3
- Git access to this repository on the VPS
- A secure way to provision `.env.production` and store backups

Only Caddy publishes host ports. Caddy obtains/renews TLS certificates; the frontend and backend communicate over Docker networks, while MongoDB and Redis are attached only to the private internal network. Do not publish database ports in a firewall or add host port mappings.

## Initial setup

1. Clone the repository to a persistent directory, for example `/srv/tailoros`, and check out the intended deployment branch.
2. Copy `.env.production.example` to `.env.production`.
3. Set `DOMAIN` to the public hostname. Replace each placeholder with a unique secret generated from a cryptographically secure source. `openssl rand -hex 32` produces a URL-safe 64-character value. Use separate values for Mongo root/app, Redis, JWT access, JWT refresh, and barcode signing secrets.
4. Set `MONGODB_URI` to use `MONGO_APP_USER` and the exact `MONGO_APP_PASSWORD`, with `authSource=tailoros`. The example uses URL-safe hex secrets so URI escaping is unnecessary.
5. Set `CLIENT_URL` and `CORS_ORIGIN` to `https://<your-domain>`. Add only additional HTTPS origins you control.
6. Restrict the file and validate configuration:

```sh
chmod 600 .env.production
sh ./deploy/validate-production-env.sh .env.production
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

7. Start the stack and inspect health:

```sh
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl --fail https://<your-domain>/ready
```

On the first MongoDB start, the official image initializes the root account and `deploy/mongo-init.js` creates a separate application user with `readWrite` access only to the `tailoros` database. Keep the root credentials for administration/backup; the backend connects with the application URI. Initialization scripts run only when the MongoDB data volume is first created. Changing credentials later does not rotate database users automatically.

The app validates strong independent signing secrets, authenticated MongoDB, Redis password, and HTTPS-only CORS at startup. If a secret is changed, rotate access/refresh tokens as appropriate; changing `BARCODE_SIGNING_SECRET` invalidates labels that were already printed.

## Continuous delivery

`.github/workflows/ci.yml` runs backend integration tests against MongoDB/Redis, frontend tests/build, dependency audits, and both container builds. `.github/workflows/deploy.yml` invokes the CI workflow before deploying over SSH. For automatic deploys on `master`, set repository variable `VPS_DEPLOY_ENABLED=true`; otherwise trigger the workflow manually.

Configure these GitHub Actions secrets in the protected `production` environment:

- `VPS_HOST` — VPS host name/IP
- `VPS_USER` — restricted SSH deployment account
- `VPS_SSH_KEY` — private key for that account
- `VPS_KNOWN_HOSTS` — pre-verified known-hosts line(s); do not collect trust keys during the deploy job

Configure repository variables `VPS_DEPLOY_PATH` (the existing checkout directory on the VPS) and, for push-triggered delivery, `VPS_DEPLOY_ENABLED=true`. The VPS checkout must be able to fast-forward from `origin/master`, Docker Compose must be available to the deployment account, and `.env.production` must already be provisioned on that host. Keep SSH access restricted and use environment approvals where appropriate.

## WhatsApp Cloud API

WhatsApp is optional. To enable outbound messaging:

1. Create/configure the Meta app and Cloud API phone number.
2. Set the provider access token, phone-number ID, app secret, webhook verification token, approved template name, and template language in `.env.production`.
3. Configure the Meta webhook URL as `https://<your-domain>/api/v1/whatsapp/webhook` and subscribe to message status callbacks.
4. Ensure every recipient has recorded opt-in in TailorOS before sending.

The service is not enabled until all required values are set. Secrets remain backend-only. Test with a Meta development recipient/template before messaging customers.

## Backups and recovery

Create a MongoDB archive while the services are running:

```sh
BACKUP_DIR=/srv/tailoros-backups sh ./deploy/backup-production.sh
```

The script writes a gzip-compressed MongoDB archive with mode `0600`. It does not encrypt, rotate, or upload the file. Encrypt and copy backups off-host, restrict access, define retention, and regularly rehearse restore into a separate environment. Docker named volumes on one VPS are not disaster recovery. Also protect Caddy's certificate data volume.

For upgrades, capture a backup first, then deploy from a known-good commit. Review MongoDB/index migrations and test restore/rollback before changing production data. Do not run `docker compose down -v` on a production environment; it deletes persisted databases and certificates.

## Operational boundaries

- The production stack has one backend replica; in-memory rate limits and Socket.IO are not horizontally distributed.
- WhatsApp provider credentials/template are configured once per installation, not independently per shop.
- Monitoring, alert routing, off-host backup encryption, DNS ownership, server patching, and cloud/VPS account controls remain operator responsibilities.
