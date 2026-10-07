# TailorOS — Comprehensive Tailoring Management Platform

An enterprise-grade SaaS system for managing tailoring businesses: customers, orders, production, inventory, payments, and analytics.

## Project Status

The current implementation status for all 31 phases is tracked in [TODO.md](./TODO.md). Phases 1–31 have implementation foundations including tenant-scoped APIs, staff/customer workflows, automated tests, CI, and a hardened VPS deployment configuration. This remains a working product requiring operator-managed credentials, backups, monitoring, and a real production host.

In-app notifications are persisted and delivered live over Socket.IO. WhatsApp uses the Meta Cloud API and requires real provider credentials, an approved template, public HTTPS webhook, and customer opt-in. Email/SMS delivery, payment-provider reconciliation, a transactional outbox, and Redis-backed auth sessions are not included.

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js 20+ and npm (optional, for running backend/frontend outside Docker)
- A modern browser for the web UI

### 1. Clone & Setup

```bash
git clone <repository>
cd TailorOS

# Copy environment template
cp .env.example .env

# Edit secrets if needed
nano .env
```

### 2. Start the app

```bash
docker compose up --build -d
```

### 3. Open the app

- 🌐 Frontend: http://localhost
- 🔌 API: http://localhost/api/v1
- 🗄️ MongoDB: localhost:27017
- ⚡ Redis: localhost:6379

### 4. Verify

```bash
docker compose ps
curl http://localhost/api/v1/health
curl http://localhost/ready
```

### 5. Login

There is no default account. Choose **Create your shop account** to register the first shop owner, then add team members from the user-management workflow.

---

## Production Deployment (Linux VPS)

The development stack above is not production-secure. For VPS deployment, follow [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md). The production stack uses Caddy for automatic HTTPS, keeps MongoDB/Redis/API ports private, requires unique JWT/barcode keys and authenticated data services, and supports a gated GitHub Actions SSH deploy.

At minimum you need a domain pointed at the VPS, inbound TCP 80/443, Docker Engine/Compose, and a securely provisioned `.env.production`. Do not commit production environment files. A live hosted deployment still requires your server, domain, DNS, backups, monitoring, and credentials.

---

## Architecture

### System Diagram

```
Browser (http://localhost)
        ↓
   Nginx:80 (Reverse Proxy)
        ↓
   ┌────┴────┐
   ↓         ↓
Frontend   Backend API
(React)    (Express)
           ↓
        ┌──┴──┐
        ↓     ↓
    MongoDB  Redis
     (Data)  (Cache)
```

### Simple Stack

| Service | Port | Purpose |
|--------|------|---------|
| **Frontend + API proxy** | 80 | React app and API routing |
| **Backend API** | 5000 | Express API server |
| **MongoDB** | 27017 | Primary data store |
| **Redis** | 6379 | Cache and session storage |

---

## Project Structure

```
TailorOS/
├── backend/
│   ├── src/
│   │   └── index.js           # Express server entry point
│   ├── package.json           # Backend dependencies
│   └── Dockerfile             # (in docker/ dir)
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite build config
├── docker/
│   ├── backend.dockerfile     # Backend image
│   ├── frontend.dockerfile    # Frontend image + Nginx
│   ├── nginx.conf             # Nginx config
│   └── default.conf           # Virtual host config
├── docs/
│   ├── PHASE_0.md             # Product specification
│   ├── PHASE_1.md             # Dev environment
│   ├── PHASE_2.md             # Backend setup
│   ├── PHASE_3.md             # Docker architecture
│   ├── PHASE_4.md             # Docker Compose commands
│   └── API.md                 # API endpoint reference
├── docker-compose.yml         # Orchestration (THE FILE)
├── .env.example              # Environment template
├── .env                      # (local, not committed)
├── .gitignore               # Git ignore rules
└── README.md                # This file
```

---

## Core Features (MVP)

### Implemented and planned feature areas

1. **Authentication** — Login, JWT, roles
2. **Dashboard** — Key metrics, overview
3. **Shops/Tenants** — Multi-tenant support
4. **Users & Roles** — RBAC (Admin, Manager, Tailor, Staff)
5. **Customers** — Profiles, contact, history
6. **Measurements** — Save customer body measurements
7. **Garments** — Garment types, patterns, pricing
8. **Orders** — Create, track, status updates
9. **Production** — Assign to tailors, progress tracking
10. **Tailors** — Tailor profiles, assignments, KPIs
11. **Inventory** — Stock tracking, materials
12. **Suppliers** — Supplier management
13. **Purchases** — Purchase orders and inventory receiving
14. **Payments** — Payment/refund ledger and printable receipts
15. **Expenses** — Business expense tracking
16. **Invoices** — Order snapshots and printable invoices
17. **Notifications** — In-app notifications and live Socket.IO updates
18. **Reports & Analytics** — Financial, production, and shop overview summaries
19. **Settings** — Company branding, preferences
20. **Audit Logs** — Tenant-scoped record of write operations
21. **Customer Portal** — Customer login and own orders, invoices, and measurements
22. **Phase 26 — WhatsApp** — Consent-aware approved-template messaging through Meta Cloud API
23. **Phase 27 — Barcode/QR** — Signed tenant-bound Code 128 and QR labels with scan resolution
24. **Phase 28 — Testing** — Backend integration tests, frontend feature tests, CI builds/audits
25. **Phase 29 — Security** — Production settings validation, dependency audits, protected deployment defaults
26. **Phases 30–31 — CI/CD & Deployment** — GitHub Actions and Docker Compose/Caddy for a Linux VPS

### Future Phases

- Email and SMS notification delivery
- Mobile app (iOS/Android)
- Subscription/SaaS billing
- Accounting exports, payment-provider reconciliation, and transactional outbox

---

## Technology Stack

### Backend

- **Framework**: Express.js 4.18+
- **Language**: JavaScript (Node.js 20)
- **Database**: MongoDB 7+
- **Cache**: Redis 7+
- **Queue**: BullMQ 6+
- **Auth**: JWT + bcryptjs
- **Validation**: Input sanitization
- **Testing**: Node.js built-in test runner (`node --test`)

### Frontend

- **Framework**: React 18+
- **Build Tool**: Vite
- **Styling**: TailwindCSS (future)
- **State**: Redux Toolkit (future)
- **HTTP**: Axios
- **WebSocket**: Socket.io (future)

### DevOps

- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions (future)
- **Hosting**: AWS ECS / Kubernetes (future)

---

## Development Workflow

### Local Development

```bash
# Start stack
docker compose up -d

# Edit code (auto-reloads via volume mount)
nano backend/src/index.js

# Add dependency
docker exec tailoros-backend npm install <package>

# Rebuild container
docker compose build backend

# View logs
docker compose logs -f backend

# Stop stack
docker compose down
```

### Database Operations

```bash
# Access MongoDB
docker exec -it tailoros-mongodb mongosh

# Access Redis
docker exec -it tailoros-redis redis-cli

# Seed data
docker exec tailoros-backend node backend/src/scripts/seed.js
```

---

## API Overview

### Implemented API Areas

Authentication, user management, customers, measurements, garments, orders, inventory, suppliers, tailors, purchases, payments, expenses, invoices, production, notifications, reports, analytics, audit logs, customer portal, WhatsApp, and barcode/QR workflows have API routes. Phase status is tracked in [TODO.md](./TODO.md); integration setup and behavior are described in [docs/API.md](./docs/API.md), [docs/DATABASE.md](./docs/DATABASE.md), and [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

---

## Environment Variables

See `.env.example`. Key variables:

```
NODE_ENV=development
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://mongodb:27017/tailoros
REDIS_HOST=redis
REDIS_PORT=6379
CLIENT_URL=http://localhost
```

---

## Common Tasks

### Start Everything

```bash
docker compose up --pull always
```

### Stop Everything

```bash
docker compose down
```

### View Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs          # All services
```

### Rebuild Images

```bash
docker compose build --no-cache
```

### Access a Container

```bash
docker exec -it tailoros-backend sh
```

### Database Backup

```bash
docker exec tailoros-mongodb mongodump --out /backup
docker cp tailoros-mongodb:/backup ./backup
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Port already in use" | Change `ports:` in docker-compose.yml |
| "MongoDB won't connect" | Wait for health check. See logs: `docker compose logs mongodb` |
| "Frontend not building" | `docker compose build --no-cache frontend` |
| "Hot reload not working" | Verify volume mounts: `docker inspect tailoros-backend` |

More details in `docs/PHASE_4.md`.

---

## Production Deployment

Production deployment is not configured or validated. The following are requirements for future deployment, not steps that make this repository production-ready by themselves:

1. Set `NODE_ENV=production` and provide strong, unique secrets.
2. Use managed MongoDB/Redis or securely configured production services.
3. Remove development mounts and bind only required ports.
4. Add resource limits, backups, monitoring, and operational runbooks.
5. Enable HTTPS and validate proxy/security settings.
6. Add and verify a deployment pipeline and rollback process.

See `docs/PHASE_4.md` → **Production Deployment** section.

---

## Contribution

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add my feature'`
3. Push: `git push origin feature/my-feature`
4. Open a Pull Request

---

## Security

- ✅ JWT-based authentication
- ✅ RBAC (Role-Based Access Control)
- ✅ Password hashing (bcryptjs)
- ✅ Input validation & sanitization
- ✅ CORS configured per environment
- ⚠️ **TODO**: HTTPS enforcement
- ⚠️ **TODO**: Rate limiting
- ⚠️ **TODO**: Security headers (CSP, HSTS)

---

## Performance

- ✅ Redis caching layer
- ✅ Database indexing (via MongoDB)
- ✅ Connection pooling
- ⚠️ **TODO**: API pagination
- ⚠️ **TODO**: Query optimization
- ⚠️ **TODO**: Image optimization

---

## Support & Documentation

- **API Reference**: `docs/API.md`
- **Architecture**: `docs/PHASE_3.md`
- **Commands**: `docs/PHASE_4.md`
- **Product Spec**: `docs/PHASE_0.md`
- **Setup Guide**: `docs/PHASE_1.md`

---

## License

MIT License — See LICENSE file

---

## Contact

- **Website**: tailoros.local (future)
- **Issues**: GitHub Issues
- **Email**: dev@tailoros.local

---

**Ready to build? Start with:**

```bash
docker compose up
```

See http://localhost and http://localhost:5000/health
