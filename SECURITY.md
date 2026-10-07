
Customer measurement values are accepted only through a tenant-owned active template. The backend validates field types and allowed select options, so frontend-generated forms are not treated as a security boundary.
# TailorOS Security

## Authentication

- Passwords are hashed with bcryptjs and are never returned by the API.
- Access tokens are JWTs signed with `JWT_SECRET` and expire after `JWT_ACCESS_EXPIRES_IN` (15 minutes by default).
- Refresh tokens are JWTs signed with `JWT_REFRESH_SECRET`, stored in an HttpOnly, SameSite cookie, and expire after `JWT_REFRESH_EXPIRES_IN` (7 days by default).
- Refresh tokens are rotated on every refresh. Only a SHA-256 hash and expiry are stored in MongoDB, so logout and password changes revoke the active refresh session.
- Access tokens contain only `userId`, `shopId`, and `role` claims. Protected requests resolve the user from MongoDB and reject inactive accounts.

## Required secrets

Set unique production values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `BARCODE_SIGNING_SECRET` (at least 32 random characters; each key must be distinct). Set a password for Redis and use a MongoDB application account with only `readWrite` access to the TailorOS database. Never commit `.env`, `.env.production`, credentials, tokens, password hashes, or production secrets. `.env.production.example` contains placeholders only.

## API protections

Helmet, exact-origin CORS, request-body size limits, Zod request validation, API/authentication rate limiting (including versioned auth endpoints), account status checks, and safe production error responses are enabled. The Express `X-Powered-By` header is disabled. Passwords, tokens, JWT secrets, provider secrets, and hashes are not logged.

Production startup fails closed if JWT/signing secrets are weak or reused, database credentials are missing, Redis has no password, or CORS origins are not HTTPS. The VPS Compose file does not publish MongoDB, Redis, or the API ports; only Caddy publishes HTTP/HTTPS. Backend and frontend containers run read-only with reduced Linux capabilities. Caddy provisions and renews TLS certificates, so the domain must resolve to the VPS and inbound TCP 80/443 (and optional UDP 443) must be reachable.

## Authorization

Roles and permissions are defined centrally in `backend/src/config/rolePermissions.js` and `backend/src/config/permissions.js`. `PERMISSION_CATALOG` groups actions by resource, and the exported flat `PERMISSIONS` list is used by authorization middleware. To add a permission, add its action under the appropriate resource (or add a new resource), then grant it only to the intended roles in `rolePermissions.js` and protect its route with `requirePermission()`.

Protected routes use `requirePermission()` or `requireRole()`. Authorization reads the role and shop context loaded by the backend; request body roles, user IDs, and shop IDs are not trusted. Shop owners can manage shop users, but cannot assign `SUPER_ADMIN`.

## Tenant isolation

All business records carry a required `shopId`. Protected routes derive the tenant from the authenticated user. Normal users cannot override it with a request body or header. `SUPER_ADMIN` may explicitly select a shop with `X-Shop-Id`; without that header, system-level access spans shops. Legacy records can be reviewed and backfilled with `npm run migrate:tenancy`; unresolved records are reported rather than assigned arbitrarily.

Measurement profiles are append-only from the customer workflow. Orders store their own profile/value snapshot, so changing a customer's current measurements cannot rewrite historical order data.

## WhatsApp integration

Only approved Meta Cloud API templates are used. Provider credentials stay in the backend environment. Sending requires recorded customer opt-in; the worker rechecks consent immediately before sending. The app stores a masked phone number in the delivery log and does not store template parameter text there. Webhook POST signatures are HMAC-SHA256 verified over the exact raw body using `WHATSAPP_APP_SECRET`; the GET verification token is compared in constant time.

## Barcode and QR integration

Codes use HMAC signatures with `BARCODE_SIGNING_SECRET` and encode only resource type/ID/signature. Resolve operations verify both signature and tenant scope and return limited summaries. Barcode values are not authorization credentials and still require an authenticated caller with `barcodes.resolve`.

## Operations and verification

CI runs the backend's MongoDB/Redis-backed integration suite, frontend component tests and production build, container builds, and npm dependency audits. Dependabot checks npm and GitHub Actions dependencies weekly. Keep deployment secrets limited to a protected production environment and require approvals as appropriate.

Production setup and VPS deployment instructions are in `docs/DEPLOYMENT.md`. Backups should be encrypted and copied off-host; the provided MongoDB dump script sets restrictive local file permissions but does not encrypt or upload its output.

## Testing

Start the Phase 1 services, then run:

```bash
cd backend
npm test
```

The integration tests use the configured MongoDB and Redis connections and remove their generated test data when complete.
