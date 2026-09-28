# PHASE 3 — Docker Architecture

## TailorOS Container Architecture

The system is designed as a **five-service microarchitecture** for development and staging.

### Service Topology

```
┌─────────────────────────────────────────┐
│          Your Browser                   │
│       (http://localhost)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Nginx (Reverse Proxy & Load Balancer)  │
│          Port: 80 / 8080                │
└──────────┬─────────────────┬────────────┘
           │                 │
    ┌──────▼──────┐   ┌─────▼────────┐
    │  Frontend   │   │   Backend    │
    │   (React)   │   │ (Express)    │
    │Port: 5173   │   │ Port: 5000   │
    └─────────────┘   └──────┬───────┘
                             │
                    ┌────────┼────────┐
                    │        │        │
              ┌─────▼─┐  ┌──▼──┐  ┌─▼──────┐
              │MongoDB│  │Redis│  │ BullMQ │
              │:27017 │  │:6379│  │(Redis) │
              └───────┘  └─────┘  └────────┘
```

### Five Core Services

#### 1. **Frontend** (React + Vite)
- **Image**: Built from `docker/frontend.dockerfile`
- **Port**: 5173 (development), served via Nginx in production
- **Role**: Web dashboard UI
- **Volume**: `./frontend` (bind mount for hot reload)

#### 2. **Backend** (Node.js + Express)
- **Image**: Built from `docker/backend.dockerfile`
- **Port**: 5000
- **Role**: REST API + WebSocket server
- **Volume**: `./backend/src` (watch for changes)
- **Depends on**: MongoDB (data), Redis (cache/sessions)

#### 3. **MongoDB** (Data Persistence)
- **Image**: `mongo:latest`
- **Port**: 27017
- **Role**: Primary data store
- **Volume**: `mongodb_data` (persistent), `mongodb_config`
- **Health Check**: Connected and responding to `ping`

#### 4. **Redis** (Cache & Session Store)
- **Image**: `redis:latest`
- **Port**: 6379
- **Role**: Caching, session storage, BullMQ job queue
- **Volume**: `redis_data` (persistence)
- **Health Check**: Responds to `PING`

#### 5. **Nginx** (Reverse Proxy)
- **Image**: `nginx:alpine`
- **Port**: 8080 → 80 (internal)
- **Role**: Route requests, serve static files, load balancing
- **Configs**: `nginx.conf`, `default.conf`
- **Health Check**: HTTP 200 on `/health`

### Network

**Network Name**: `tailoros-net` (bridge driver)

All services are connected on this internal network:
- Frontend talks to Backend via `http://backend:5000`
- Backend talks to MongoDB via `mongodb://mongodb:27017`
- Backend talks to Redis via `redis:6379`
- Nginx routes to Frontend and Backend by service name

### Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `NODE_ENV`: development/production
- `MONGODB_URI`: Connection string
- `REDIS_HOST`: Redis hostname
- `JWT_SECRET`: Authentication secret (CHANGE IN PRODUCTION!)
- `CORS_ORIGIN`: Allowed frontend URLs

### Volumes (Persistence)

- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `redis_data` - Redis persistence
- `./backend/src` - Backend source (mounted for hot reload)
- `./frontend` - Frontend source (mounted for dev)

### Health Checks

Each service includes health checks:
- **MongoDB**: `db.runCommand("ping")`
- **Redis**: `redis-cli ping`
- **Backend**: HTTP `GET /health`
- **Frontend/Nginx**: HTTP `GET /`

Services only start when dependencies are healthy.

### Future Services (Post-MVP)

When the MVP is stable, add:

1. **Worker** (Background jobs via BullMQ)
   ```yaml
   worker:
     build: docker/worker.dockerfile
     depends_on:
       - redis
       - mongodb
   ```

2. **Mail Service** (Email delivery)
   ```yaml
   mail:
     image: mailhog:latest  # or your SMTP service
     ports:
       - "1025:1025"
       - "8025:8025"
   ```

3. **Storage** (AWS S3 / MinIO for file uploads)
   ```yaml
   storage:
     image: minio/minio:latest
     ports:
       - "9000:9000"
   ```

4. **Monitoring** (Prometheus + Grafana)
   ```yaml
   prometheus:
     image: prom/prometheus:latest
   
   grafana:
     image: grafana/grafana:latest
   ```

### Networking & Connectivity

Service-to-service communication:
```javascript
// Backend to MongoDB
const uri = `mongodb://mongodb:27017/tailoros`;

// Backend to Redis
const redis = new Redis({
  host: 'redis',
  port: 6379,
});

// Frontend API calls (via Nginx proxy)
fetch('/api/customers', ...);  // Proxies to http://backend:5000/api/customers
```

### Startup Order

Docker Compose automatically manages startup order via `depends_on` with health checks:

1. **MongoDB** starts first (no dependencies)
2. **Redis** starts first (no dependencies)
3. **Backend** waits for MongoDB + Redis health checks
4. **Frontend** starts (builds React app)
5. **Nginx** waits for Backend + Frontend

Full startup: ~30-60 seconds depending on image pulls and builds.

### Resource Limits (Optional)

Add to services for production:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

---

**Next Phase**: PHASE 4 — Running the full stack with `docker compose up`
