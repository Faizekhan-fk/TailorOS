# PHASE 1 — Prepare Your Development Environment

## Required Tools

### Install Locally

- **Git** - Version control
  - macOS: `brew install git`
  - Windows: https://git-scm.com/download/win
  - Linux: `apt-get install git`

- **Docker Desktop** - Containerization
  - macOS/Windows: https://www.docker.com/products/docker-desktop
  - Linux: `sudo apt-get install docker.io docker-compose`

- **VS Code** - Code editor
  - https://code.visualstudio.com/
  - Extensions: REST Client, Thunder Client, or Postman for API testing

- **Node.js** (optional but recommended for CLI tools)
  - macOS: `brew install node@20`
  - Windows: https://nodejs.org/
  - Linux: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`

- **npm** - Comes with Node.js, or use within Docker

### Verification

```bash
# Check versions
git --version
docker --version
docker compose version
node --version
npm --version
```

## Project Setup

### 1. Clone or Initialize

```bash
# If starting fresh
cd TailorOS
npm install
```

### 2. Copy Environment File

```bash
cp .env.example .env
```

### 3. Start Development Stack

```bash
# Pull latest images and start all services with file watching
docker compose up --pull always
```

**Expected output:**
```
✓ MongoDB ready on mongodb:27017
✓ Redis ready on redis:6379
✓ API running on http://localhost:5000
```

### 4. Test the API

```bash
# In a new terminal
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}

curl http://localhost:5000/api/version
# Should return: {"version":"0.1.0","name":"TailorOS API"}
```

## Common Commands

### Docker Compose Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f api

# Stop all services
docker compose down

# Rebuild the API image
docker compose build --no-cache api

# Access MongoDB shell
docker exec -it tailoros-mongodb mongosh

# Access Redis CLI
docker exec -it tailoros-redis redis-cli
```

### Container Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop a container
docker stop tailoros-api

# Remove a container
docker rm tailoros-api

# View container stats
docker stats
```

## Development Workflow

### Making Changes

**Backend (Node.js):**
- Edit files in `./server/`
- Changes auto-reload via `docker compose watch`
- Check logs: `docker compose logs -f api`

**Adding Dependencies:**
```bash
# Add to package.json
npm install express-validator

# Rebuild Docker image
docker compose build api
```

**Database Seeding:**
- Seed scripts will be in `./scripts/seed.js`
- Run: `docker exec tailoros-api node scripts/seed.js`

### Debugging

```bash
# View real-time logs
docker compose logs -f

# Access running container shell
docker exec -it tailoros-api sh

# Restart a service
docker compose restart api
```

## Environment Variables

Key variables in `.env`:

```
NODE_ENV=development        # Development mode
PORT=5000                   # API port
MONGODB_URI=...            # MongoDB connection
REDIS_HOST=redis           # Redis hostname
JWT_SECRET=...             # Change in production!
CLIENT_URL=http://localhost:5173  # Frontend URL
```

## Next Steps

1. ✓ Set up Docker
2. ✓ Initialize project structure
3. → **Start Phase 2: Build Authentication Module**

---

**Need Help?**
- Docker docs: https://docs.docker.com/
- Express docs: https://expressjs.com/
- MongoDB docs: https://docs.mongodb.com/
