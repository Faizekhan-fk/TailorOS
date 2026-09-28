# PHASE 4 — Running the Complete Docker Stack

## Quick Start

### 1. Copy Environment File

```bash
cp .env.example .env
```

Edit `.env` and set critical values:
```
JWT_SECRET=your-production-secret-key-here
NODE_ENV=development
```

### 2. Build and Start All Services

```bash
docker compose up --pull always
```

**Expected output**:
```
tailoros-mongodb  | Waiting for connections
tailoros-redis    | Ready to accept connections
tailoros-backend  | ✓ TailorOS API running on http://localhost:5000
tailoros-frontend | ✓ Vite dev server ready
tailoros-nginx    | Listening on port 80
```

### 3. Access the Application

- **Frontend**: http://localhost (served by Nginx)
- **API**: http://localhost/api/* (proxied by Nginx)
- **Direct Backend**: http://localhost:5000 (for testing)
- **MongoDB**: localhost:27017 (local access only)
- **Redis**: localhost:6379 (local access only)

### 4. Verify Health

```bash
# Check all services
docker compose ps

# Test API
curl http://localhost:5000/health

# View logs
docker compose logs -f backend
```

---

## Common Commands

### Development Workflow

```bash
# Start in foreground (see all logs)
docker compose up

# Start in background
docker compose up -d

# Stop all services
docker compose down

# Rebuild images
docker compose build --no-cache

# View logs
docker compose logs -f api      # Backend logs
docker compose logs -f frontend # Frontend logs

# Access shell in a container
docker exec -it tailoros-backend sh

# Run npm commands
docker exec tailoros-backend npm install express-validator

# Restart a single service
docker compose restart backend
```

### Database & Cache Management

```bash
# MongoDB shell
docker exec -it tailoros-mongodb mongosh

# Redis CLI
docker exec -it tailoros-redis redis-cli

# View data
docker exec tailoros-mongodb mongosh --eval "db.customers.find()"
```

### Debugging

```bash
# Full service status
docker compose ps -a

# Detailed service info
docker inspect tailoros-backend

# Resource usage
docker stats

# View startup logs
docker compose logs

# Check network
docker network inspect tailoros_tailoros-net
```

### Clean Up

```bash
# Stop and remove containers
docker compose down

# Remove volumes (data loss!)
docker compose down -v

# Remove images
docker rmi tailoros-backend tailoros-frontend

# Full cleanup
docker compose down -v
docker system prune -a
```

---

## Troubleshooting

### "Port 80 already in use"

```bash
# Change Nginx port in docker-compose.yml
ports:
  - "8080:80"  # Change from 80:80

# Or kill the process on port 80
# macOS/Linux: sudo lsof -ti:80 | xargs sudo kill -9
# Windows: netstat -ano | findstr :80
```

### "MongoDB connection refused"

MongoDB takes time to start. Check health:
```bash
docker compose logs mongodb
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### "Frontend won't build"

```bash
# Rebuild from scratch
docker compose build --no-cache frontend

# Check build logs
docker compose build frontend --progress=plain
```

### "Hot reload not working"

Ensure volume mounts are correct in `docker-compose.yml`:
```yaml
volumes:
  - ./backend/src:/app/backend/src
```

### Services won't start

```bash
# Check dependencies
docker compose logs

# Verify health checks
docker exec tailoros-backend wget -q http://localhost:5000/health -O -

# Force restart
docker compose restart
```

---

## Environment Variables

All services read from `.env`:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env

# Reload services
docker compose up --force-recreate
```

Key variables:
- `NODE_ENV` - development/production
- `JWT_SECRET` - **Change in production!**
- `MONGODB_URI` - Database connection
- `REDIS_HOST` - Cache hostname
- `CLIENT_URL` - Frontend origin

---

## Development Best Practices

### 1. Local Development Loop

```bash
# Terminal 1: Start stack
docker compose up

# Terminal 2: Edit backend code
vim backend/src/index.js

# Changes auto-reload via volume watch
# Terminal 1 shows "✓ File changed"
```

### 2. Database Seeding

```bash
# Create seed script
cat > backend/src/scripts/seed.js << 'EOF'
// Seed database with sample data
EOF

# Run it
docker exec tailoros-backend node src/scripts/seed.js
```

### 3. Testing

```bash
# Run tests inside container
docker exec tailoros-backend npm test

# Or add test service to docker-compose.yml
```

### 4. Code Quality

```bash
# Linting
docker exec tailoros-backend npm run lint

# Formatting
docker exec tailoros-backend npm run format
```

---

## Production Deployment

### Changes Required

1. **Build frontend for production**:
   ```yaml
   # docker/frontend.dockerfile already does this
   RUN npm run build  # Vite build
   ```

2. **Set environment variables**:
   ```bash
   NODE_ENV=production
   JWT_SECRET=<generate-strong-secret>
   ```

3. **Use production MongoDB/Redis**:
   ```bash
   # Don't use Docker instances
   MONGODB_URI=mongodb+srv://user:[REDACTED]@cluster.mongodb.net/tailoros
   REDIS_HOST=redis.myservice.com
   ```

4. **Remove volume mounts**:
   ```yaml
   # Remove these in production
   volumes:
     - ./backend/src:/app/backend/src
   ```

5. **Add resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

### Deploy to AWS ECS / Kubernetes

```bash
# Push images to registry
docker tag tailoros-backend:latest myregistry.dkr.ecr.us-east-1.amazonaws.com/tailoros-backend:latest
docker push myregistry.dkr.ecr.us-east-1.amazonaws.com/tailoros-backend:latest

# Deploy via ECS/K8s using docker-compose.yml as reference
```

---

## Monitoring & Observability

### Logs

```bash
# All services
docker compose logs

# Follow backend
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100
```

### Health Status

Each service includes health checks visible in `docker compose ps`:

```
NAME                    STATUS
tailoros-frontend       Up (healthy)
tailoros-backend        Up (healthy)
tailoros-mongodb        Up (healthy)
tailoros-redis          Up (healthy)
tailoros-nginx          Up (healthy)
```

### Metrics

```bash
# CPU/Memory usage
docker stats

# Container info
docker inspect tailoros-backend
```

---

## Next Steps

1. ✅ Spin up full stack: `docker compose up`
2. ✅ Verify http://localhost works
3. → **PHASE 5**: Add authentication (JWT login/signup)
4. → **PHASE 6**: Build customer module (CRUD)
5. → **PHASE 7**: Deploy to production

---

**Remember**: Your containers are ephemeral. Data persists in Docker Volumes (`mongodb_data`, `redis_data`), not in containers themselves. When you `docker compose down -v`, data is deleted.
