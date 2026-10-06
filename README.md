# TailorOS — Comprehensive Tailoring Management Platform

An enterprise-grade SaaS system for managing tailoring businesses: customers, orders, production, inventory, payments, and analytics.

## Project Status

- **Phase 1** ✅ — Docker foundation (frontend, backend, MongoDB, Redis, Nginx)
- **Phase 2** ✅ — Authentication (Zod validation, JWT rotation, bcrypt, protected sessions)
- **Phase 3** ✅ — RBAC and granular permissions
- **Phase 4** ✅ — Multi-tenancy enforcement
- **Phase 5** ✅ — Customer enhancements and measurement templates
- **Phase 6** ✅ — Measurement profiles and order snapshots
- **Phase 7** → Garments

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js 20+ (optional, for local development)

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
```

### 5. Login

Use the default admin account:

- Email: john@example.com
- Password: password123

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

### Phase 0 — 20 Modules (Specification)

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
13. **Purchases** — POs, receiving
14. **Payments** — Payment processing, invoices
15. **Expenses** — Business expense tracking
16. **Invoices/Receipts** — Generate & email
17. **Notifications** — In-app, email, SMS alerts
18. **Reports** — Sales, inventory, performance analytics
19. **Settings** — Company branding, preferences
20. **Audit Logs** — Track all user actions

### Future Phases

- WhatsApp / SMS integration
- Barcode / QR codes
- Customer portal
- Mobile app (iOS/Android)
- Subscription/SaaS billing

---

## Technology Stack

### Backend

- **Framework**: Express.js 4.18+
- **Language**: JavaScript (Node.js 20)
- **Database**: MongoDB 7+
- **Cache**: Redis 7+
- **Queue**: BullMQ 4+
- **Auth**: JWT + bcryptjs
- **Validation**: Input sanitization
- **Testing**: Jest (future)

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

### Current Endpoints

```
GET    /health              → System health status
GET    /api/version         → API version info
```

### Future Endpoints (Built in Phases 5+)

**Authentication**:
- `POST /auth/register` — Create account
- `POST /auth/login` — User login
- `POST /auth/refresh` — Refresh JWT
- `POST /auth/logout` — Logout

**Customers**:
- `GET /api/customers` — List
- `POST /api/customers` — Create
- `GET /api/customers/:id` — Get one
- `PUT /api/customers/:id` — Update
- `DELETE /api/customers/:id` — Delete

**Orders**:
- `GET /api/orders` — List
- `POST /api/orders` — Create
- `PUT /api/orders/:id` — Update status

And many more... See `docs/API.md` for full reference.

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

1. Set `NODE_ENV=production`
2. Use managed MongoDB/Redis (AWS RDS, ElastiCache)
3. Update `JWT_SECRET` with strong key
4. Remove development volume mounts
5. Add resource limits
6. Enable HTTPS (via AWS CloudFront, Let's Encrypt)
7. Deploy via ECS, Kubernetes, or Docker Swarm

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
