# TailorOS Development Progress

Status reflects code currently present in the repository, not planned work or package dependencies alone.

- [x] Phase 1 — Docker foundation (Compose stack for frontend, backend, MongoDB, Redis, and frontend Nginx)
- [x] Phase 2 — Authentication (registration, login, JWT access/refresh, password hashing, protected sessions)
- [x] Phase 3 — RBAC (canonical roles, permission registry, role defaults, `requirePermission`, `requireRole`, user management)
- [x] Phase 4 — Multi-tenancy (shop-scoped data, server-derived tenant context, super-admin shop selection, isolation tests)
- [x] Phase 5 — Customers (tenant-scoped CRUD, per-shop sequential IDs, URL-backed search/filters/sort/pagination, soft deletion, permission-aware UI, integration tests)
- [x] Phase 6 — Measurement templates (shop-scoped template CRUD, field validation, archive)
- [x] Phase 7 — Measurement profiles (versioned customer profiles and order measurement snapshots)
- [x] Phase 8 — Garments (shop-scoped catalog CRUD)
- [x] Phase 9 — Orders (creation, status, assignment, cancellation, payment summary, measurement snapshots)
- [x] Phase 10 — Payments (tenant-scoped payment/refund ledger, order balance/status synchronization, voids, metadata updates, and printable receipts)
- [x] Phase 11 — Production (per-order-item jobs, stage transitions, blocking/resume, tenant-scoped tailor assignment, order status synchronization, and legacy-order backfill)
- [x] Phase 12 — Tailors (tailor profiles, availability, specialization, experience, workload)
- [x] Phase 13 — Inventory (stock, reorder thresholds, supplier reference, stock adjustments)
- [x] Phase 14 — Suppliers (shop-scoped CRUD and contact/payment terms)
- [x] Phase 15 — Purchases (tenant-scoped purchase orders, inventory receiving, duplicate-receipt protection, and cancellation)
- [x] Phase 16 — Expenses (tenant-scoped create/list/update and void workflows)
- [x] Phase 17 — Invoices (order snapshots, issue/list/read/void, payment synchronization, and printable frontend view)
- [x] Phase 18 — Redis (connection/readiness checks, tenant-keyed report/analytics caching, and metric cache invalidation)
- [x] Phase 19 — BullMQ (retryable business-notification queue, worker persistence, and graceful shutdown)
- [x] Phase 20 — Socket.IO (JWT-authenticated connections, trusted server user/shop context, and scoped shop/user rooms)
- [x] Phase 21 — Notifications (in-app shop/user notifications, read state, announcements, and queued business events)
- [x] Phase 22 — Reports (tenant-scoped financial and production reports)
- [x] Phase 23 — Analytics (cached tenant-scoped overview metrics)
- [x] Phase 24 — Audit logs (write-operation capture, immutable records, tenant-scoped query API and UI)
- [x] Phase 25 — Customer portal (customer account management, login, and customer-scoped orders/invoices/measurements)
- [x] Phase 26 — WhatsApp (Meta Cloud API template sending, consent tracking/revocation, BullMQ worker, signed status webhooks, masked delivery logs, tenant permissions, and staff UI)
- [x] Phase 27 — Barcode/QR (Code 128 and QR labels, shop-bound signatures, tenant-checked resolution, printable UI, camera/USB scanner workflow)
- [x] Phase 28 — Testing (backend integration coverage for modules, RBAC/tenant isolation, queues/webhooks/barcodes, frontend component tests, and CI builds/audits)
- [x] Phase 29 — Security (production secret/config validation, least-privilege Mongo app account, Redis auth, exact HTTPS CORS, request limits, reduced container privileges, dependency audits)
- [x] Phase 30 — CI/CD (GitHub Actions tests/audits/container builds and gated SSH deployment workflow)
- [x] Phase 31 — Production deployment (VPS Docker Compose, private data network, Caddy-managed HTTPS, health checks, validation and MongoDB backup tooling)

## Notes

- A permission is registered before it is considered available, but a registry entry alone does not mean the corresponding product module exists.
- Phase completion should include backend behavior, authorization, tenant scoping where applicable, frontend workflow, and tests appropriate to the feature.
- Phases 15–25 have working backend routes and permission checks; UI workflows are available for staff-facing modules and the customer portal.
- Notification delivery currently means in-app persistence and Socket.IO updates. Email, SMS/WhatsApp delivery, payment-provider reconciliation, and a transactional outbox are not included in these phases.
- Redis is used for report/analytics caching and BullMQ. Redis-backed auth sessions are not enabled; JWT refresh-token handling remains the authentication strategy.
- Reports and analytics are operational summaries, not a replacement for accounting exports or a full business-intelligence platform.
- WhatsApp sending requires a Meta app/Cloud API phone number, approved template, provider credentials, public HTTPS webhook, and customer consent. Integration credentials are configured per installation, not per shop.
- Production hosting is packaged for a Linux VPS and has not been applied to a live domain/server. Follow `docs/DEPLOYMENT.md`, provision the GitHub deployment secrets/variables, and set Meta credentials before enabling these external integrations.
- Automated verification covers backend HTTP workflows and frontend components with CI builds and audits. A Meta account and a long-running production host are not dependencies of the automated tests.
