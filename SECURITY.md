
Customer measurement values are accepted only through a tenant-owned active template. The backend validates field types and allowed select options, so frontend-generated forms are not treated as a security boundary.
# TailorOS Security

## Authentication

- Passwords are hashed with bcryptjs and are never returned by the API.
- Access tokens are JWTs signed with `JWT_SECRET` and expire after `JWT_ACCESS_EXPIRES_IN` (15 minutes by default).
- Refresh tokens are JWTs signed with `JWT_REFRESH_SECRET`, stored in an HttpOnly, SameSite cookie, and expire after `JWT_REFRESH_EXPIRES_IN` (7 days by default).
- Refresh tokens are rotated on every refresh. Only a SHA-256 hash and expiry are stored in MongoDB, so logout and password changes revoke the active refresh session.
- Access tokens contain only `userId`, `shopId`, and `role` claims. Protected requests resolve the user from MongoDB and reject inactive accounts.

## Required secrets

Set unique production values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. Never commit `.env`, credentials, tokens, password hashes, or production secrets.

## API protections

Helmet, CORS, Zod request validation, authentication rate limiting, account status checks, and safe production error responses are enabled. Passwords, tokens, JWT secrets, and hashes are not logged.

## Authorization

Roles and permissions are defined centrally in `backend/src/config/rolePermissions.js` and `backend/src/config/permissions.js`. Protected routes use `requirePermission()` or `requireRole()`. Authorization reads the role and shop context loaded by the backend; request body roles, user IDs, and shop IDs are not trusted. Shop owners can manage shop users, but cannot assign `SUPER_ADMIN`.

## Tenant isolation

All business records carry a required `shopId`. Protected routes derive the tenant from the authenticated user. Normal users cannot override it with a request body or header. `SUPER_ADMIN` may explicitly select a shop with `X-Shop-Id`; without that header, system-level access spans shops. Legacy records can be reviewed and backfilled with `npm run migrate:tenancy`; unresolved records are reported rather than assigned arbitrarily.

Measurement profiles are append-only from the customer workflow. Orders store their own profile/value snapshot, so changing a customer's current measurements cannot rewrite historical order data.

## Testing

Start the Phase 1 services, then run:

```bash
cd backend
npm test
```

The integration tests use the configured MongoDB connection and remove their generated test user when complete.
