# Deployment

## Overview

| Component     | Recommended Platform                          | Alternative                       |
| ------------- | --------------------------------------------- | --------------------------------- |
| Nakama Server | Railway, Fly.io, or VM (DigitalOcean/AWS/GCP) | Render.com                        |
| PostgreSQL    | Neon, or same VM as Nakama                    | Managed DB on any provider        |
| Frontend      | Vercel                                        | Netlify, Cloudflare Pages, Docker |

Multiple deployment options are provided. Choose one based on your needs:

- **Railway + Neon + Vercel** — Easiest setup, good for demos
- **Fly.io** — Full WebSocket support (port 7351), auto-scaling, production-ready
- **VM + Caddy** — Full control, best for production workloads
- **Docker Compose** — Self-hosted, simplest setup

## Option A: Railway + Neon + Vercel

### 1. Set up the database (Neon)

Run `nakama/setup-db.sql` in your Neon SQL editor (replace `neondb_owner` with your actual Neon user and `CHANGE_ME` with a secure password):

```sql
CREATE USER nakama WITH PASSWORD 'your_password';
GRANT nakama TO your_neon_user;
CREATE DATABASE nakama OWNER nakama;
\c nakama
GRANT ALL ON SCHEMA public TO nakama;
```

### 2. Deploy Nakama to Railway

1. Create a new **Web Service** on Railway, connect your GitHub repo
2. Set **Docker** runtime with `nakama/Dockerfile`
3. Set **Custom Start Command** to `/nakama/entrypoint.sh`
4. Set **Target Port** to `7350`
5. Add environment variables:

| Variable             | Value                      |
| -------------------- | -------------------------- |
| `NAKAMA_DB_HOST`     | `your-neon-host.neon.tech` |
| `NAKAMA_DB_PORT`     | `5432`                     |
| `NAKAMA_DB_USER`     | `nakama`                   |
| `NAKAMA_DB_PASSWORD` | your password              |
| `NAKAMA_DB_NAME`     | `nakama`                   |

> **Note:** Railway free tier only exposes a single HTTP port (7350). WebSocket realtime connections (port 7351) are not available on the free plan. For full realtime multiplayer, upgrade to a paid Railway plan or use Fly.io.

### 3. Deploy frontend to Vercel

1. Connect your GitHub repo to Vercel (auto-detects Vite)
2. Set environment variables in **Settings → Environment Variables**:

| Variable                 | Value                             |
| ------------------------ | --------------------------------- |
| `VITE_NAKAMA_HOST`       | `your-railway-app.up.railway.app` |
| `VITE_NAKAMA_PORT`       | `443`                             |
| `VITE_NAKAMA_SSL`        | `true`                            |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey`                      |
| `VITE_TIMER_SECONDS`     | `30`                              |

3. Redeploy after setting env vars

## Option B: Fly.io

The `fly.toml` config is pre-configured for the Nakama backend.

### Deploy

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch app (uses nakama/Dockerfile from fly.toml)
fly launch

# Set database secrets
fly secrets set \
  NAKAMA_DB_HOST=your-db-host \
  NAKAMA_DB_PORT=5432 \
  NAKAMA_DB_USER=nakama \
  NAKAMA_DB_PASSWORD=your_password \
  NAKAMA_DB_NAME=nakama

# Deploy
fly deploy
```

### Features

- Exposes both HTTP (7350) and TCP (7351) for full WebSocket support
- Auto-scales to zero machines when idle (`min_machines_running = 0`)
- Forced HTTPS on port 7350
- Region: San Jose (`sjc`) — change in `fly.toml` if needed
- Immediate deploy strategy (no rolling update)

### Frontend Deployment

Deploy the frontend to Vercel, Netlify, or Cloudflare Pages (see Option A step 3 for env vars). Set `VITE_NAKAMA_HOST` to your Fly.io app URL (`lila-tictac-nakama.fly.dev`).

## Option C: Render.com

The `render.yaml` blueprint is pre-configured.

### Deploy

1. Connect your GitHub repo to Render
2. Render auto-detects `render.yaml` — creates the service
3. Set database credentials in the Render dashboard (the `sync: false` variables):
   - `NAKAMA_DB_HOST`
   - `NAKAMA_DB_USER`
   - `NAKAMA_DB_PASSWORD`

### Configuration

| Setting | Value                        |
| ------- | ---------------------------- |
| Runtime | Docker (`nakama/Dockerfile`) |
| Plan    | Free                         |
| Port    | 7350                         |
| DB Name | `nakama`                     |
| DB Port | `5432`                       |

## Option D: VM with Caddy Reverse Proxy

### Step 1: Provision VM

Recommended specs:

| Resource | Minimum      | Recommended  |
| -------- | ------------ | ------------ |
| CPU      | 1 vCPU       | 2 vCPU       |
| RAM      | 2 GB         | 4 GB         |
| Storage  | 25 GB SSD    | 50 GB SSD    |
| OS       | Ubuntu 22.04 | Ubuntu 22.04 |

**Firewall rules — only expose:**

| Port | Source  | Purpose |
| ---- | ------- | ------- |
| 22   | Your IP | SSH     |
| 80   | All     | HTTP    |
| 443  | All     | HTTPS   |

Do NOT directly expose Nakama ports (7349, 7350, 7351).

### Step 2: Install Docker

```bash
# Update and install Docker
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 3: Build Nakama Modules

```bash
npm run nakama:build
```

Build locally before deploying, or build on the VM if Node.js is installed.

### Step 4: Deploy Nakama

Create `/opt/nakama` and upload:

```bash
sudo mkdir -p /opt/nakama
# Upload: nakama/build/, nakama/local.yml, docker-compose.yml (production version)
```

Production `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nakama
      POSTGRES_USER: nakama
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nakama -d nakama"]
      interval: 3s
      retries: 5

  nakama:
    image: registry.heroiclabs.com/heroiclabs/nakama:3.38.0
    restart: unless-stopped
    entrypoint:
      - "/bin/sh"
      - "-ecx"
      - >
        /nakama/nakama migrate up --database.address nakama:your_secure_password@postgres:5432/nakama &&
        exec /nakama/nakama
        --name nakama1
        --database.address nakama:your_secure_password@postgres:5432/nakama
        --config /nakama/data/local.yml
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./build:/nakama/data/modules/build
      - ./local.yml:/nakama/data/local.yml:ro
    ports:
      - "127.0.0.1:7350:7350"
      - "127.0.0.1:7351:7351"

volumes:
  postgres-data:
```

> **Important:** Bind Nakama ports to `127.0.0.1` only — Caddy will proxy externally.

Start:

```bash
cd /opt/nakama && docker compose up -d
```

### Step 5: Reverse Proxy (Caddy)

Caddy provides automatic SSL via Let's Encrypt.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

`/etc/caddy/Caddyfile`:

```
api.yourdomain.com {
    reverse_proxy localhost:7350

    handle /ws/* {
        reverse_proxy localhost:7351
    }
}
```

```bash
sudo systemctl restart caddy
```

### Step 6: Deploy Frontend

Build locally:

```bash
VITE_NAKAMA_HOST=api.yourdomain.com \
VITE_NAKAMA_PORT=443 \
VITE_NAKAMA_SSL=true \
npm run build
```

Deploy `dist/` to Vercel, Netlify, or Cloudflare Pages.

## Option E: Docker Compose (Full Stack)

For self-hosted or local network deployment:

```bash
docker compose up -d
```

This starts three services:

| Service    | Port             | Description      |
| ---------- | ---------------- | ---------------- |
| PostgreSQL | 5432 (internal)  | Database         |
| Nakama     | 7349, 7350, 7351 | Game server      |
| Frontend   | 3000             | Nginx-served SPA |

Frontend is built from `Dockerfile.frontend` and served by Nginx with SPA fallback and gzip compression.

## CI/CD Pipeline

### GitHub Actions Workflows

#### CI (`ci.yaml`)

Triggers on every push to `master` and every PR targeting `master`.

| Step                  | Command                              | Description                 |
| --------------------- | ------------------------------------ | --------------------------- |
| Install frontend deps | `npm ci`                             | Clean install from lockfile |
| Install nakama deps   | `npm --prefix nakama install`        | Server module dependencies  |
| ESLint                | `npm run lint`                       | Lint `src/`                 |
| Frontend typecheck    | `npm run typecheck`                  | `tsc --noEmit`              |
| Nakama typecheck      | `npm --prefix nakama run type-check` | Server TypeScript check     |
| Prettier check        | `npm run format:check`               | Verify formatting           |

#### Release (`release.yaml`)

Triggers on every push to `master`. Builds and pushes Docker images to GitHub Container Registry (GHCR).

| Image                                  | Tags                    |
| -------------------------------------- | ----------------------- |
| `ghcr.io/<owner>/lila-tictac/frontend` | `latest`, `<short-sha>` |
| `ghcr.io/<owner>/lila-tictac/nakama`   | `latest`, `<short-sha>` |

Built from `Dockerfile.frontend` and `nakama/Dockerfile` respectively.

### Pre-commit Hooks (Husky + lint-staged)

Every `git commit` runs on staged files:

- **`src/**/\*.{ts,tsx}`\*\*: ESLint fix → Prettier write → TypeScript typecheck
- **`nakama/**/\*.ts`\*\*: Prettier write → TypeScript typecheck
- **Config/doc files**: Prettier write

Commits are blocked if any check fails.

### Deployment Flow

```
git push origin master
       │
       ├── CI workflow: lint + typecheck
       │
       └── Release workflow: build + push Docker images to GHCR
              │
              └── Manual: pull images on VM or trigger platform deploy
```

Images are pushed to GHCR but deployment to Railway/Fly.io/Render is manual or via platform-native auto-deploy hooks.

## Verification Checklist

After deploying, verify:

1. Nakama healthcheck: `curl https://your-api-host/` returns `{"name":"nakama","version":"3.38.0"}`
2. Frontend loads and shows the login page
3. Can register a new account
4. Two players can find each other via Quick Play
5. Moves appear in real-time on both screens
6. Leaderboard updates after a game
7. Timed mode countdown works
8. Disconnect/reconnect works within 15s grace period
9. SSL certificate is valid (Caddy auto-renews)

## Environment Variables Summary

### Frontend (.env)

| Variable                 | Local Dev    | Production           |
| ------------------------ | ------------ | -------------------- |
| `VITE_NAKAMA_HOST`       | `127.0.0.1`  | `api.yourdomain.com` |
| `VITE_NAKAMA_PORT`       | `7350`       | `443`                |
| `VITE_NAKAMA_SSL`        | `false`      | `true`               |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | `defaultkey`         |
| `VITE_TIMER_SECONDS`     | `30`         | `30`                 |

### Backend (Nakama)

| Variable             | Local Dev (Docker)     | Production           |
| -------------------- | ---------------------- | -------------------- |
| `NAKAMA_DB_HOST`     | `postgres` (container) | `your-db-host`       |
| `NAKAMA_DB_PORT`     | `5432`                 | `5432`               |
| `NAKAMA_DB_USER`     | `nakama`               | `nakama`             |
| `NAKAMA_DB_PASSWORD` | `nakama`               | your secure password |
| `NAKAMA_DB_NAME`     | `nakama`               | `nakama`             |

## Maintenance

### View Logs

```bash
docker compose logs -f nakama          # Nakama server logs
docker compose logs -f postgres        # Database logs
docker compose logs -f frontend        # Nginx access/error logs
```

### Update Nakama Modules

```bash
npm run nakama:build                   # Rebuild TypeScript
docker compose restart nakama          # Restart with new modules
```

### Backup Database

```bash
docker compose exec postgres pg_dump -U nakama nakama > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker compose exec -T postgres psql -U nakama nakama
```

### Update Nakama Version

Edit the image tag in `docker-compose.yml`:

```yaml
image: registry.heroiclabs.com/heroiclabs/nakama:3.38.0
# Change to desired version
```

Then:

```bash
docker compose pull nakama
docker compose up -d
```

### Monitor Resources

```bash
docker stats                            # CPU/Memory per container
docker compose ps                       # Container status
```

### Full Reset

```bash
docker compose down -v                  # Stop and remove volumes
docker compose up -d                    # Fresh start (re-runs migrations)
```
