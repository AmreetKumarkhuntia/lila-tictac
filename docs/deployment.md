# Deployment

## Overview

| Component     | Service                                     | Purpose             |
| ------------- | ------------------------------------------- | ------------------- |
| Nakama Server | Cloud VM (DigitalOcean/AWS EC2/GCP Compute) | Game server         |
| PostgreSQL    | Same VM (Docker) or managed DB              | Nakama persistence  |
| Frontend      | Vercel / Netlify / Cloudflare Pages         | Static site hosting |

## Prerequisites

- Cloud provider account with billing enabled
- Domain name (optional but recommended for SSL)
- SSH key pair for VM access
- Docker and Docker Compose installed on VM
- Node.js >= 18 (to build Nakama modules locally before uploading)

---

## Step 1: Provision Cloud VM

### Recommended Specs

| Resource | Minimum          | Recommended      |
| -------- | ---------------- | ---------------- |
| CPU      | 1 vCPU           | 2 vCPU           |
| RAM      | 2 GB             | 4 GB             |
| Storage  | 25 GB SSD        | 50 GB SSD        |
| OS       | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Provider-Specific Setup

**DigitalOcean:**

1. Create Droplet → Ubuntu 22.04 → Basic → $12/mo (2GB)
2. Add SSH key during creation
3. Note the public IP

**AWS EC2:**

1. Launch Instance → Ubuntu 22.04 LTS → t3.small
2. Configure security group (see firewall rules below)
3. Create and attach Elastic IP
4. Use SSH key pair for access

**GCP Compute Engine:**

1. Create VM → Ubuntu 22.04 LTS → e2-small
2. Configure firewall rules (see below)
3. Note external IP

### Firewall Rules

| Port | Protocol | Source    | Purpose                  |
| ---- | -------- | --------- | ------------------------ |
| 22   | TCP      | Your IP   | SSH access               |
| 80   | TCP      | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
| 443  | TCP      | 0.0.0.0/0 | HTTPS (reverse proxy)    |

> **Note:** Nakama ports 7350/7351 should NOT be exposed directly in production. Route them through the reverse proxy.

---

## Step 2: Install Docker on VM

```bash
ssh root@<vm-ip>

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose (if not included)
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Step 3: Build Nakama Modules

Nakama requires a **single bundled ES5 JavaScript file**. Build it locally before deploying:

```bash
# On your local machine
npm run nakama:build
```

This compiles `nakama/modules/*.ts` → `nakama/build/index.js`.

---

## Step 4: Deploy Nakama Server

### 4.1 Create Project Directory

```bash
ssh root@<vm-ip>
mkdir -p /opt/nakama/build
```

### 4.2 Upload Files

```bash
# From local machine — upload the compiled module and config
scp nakama/build/index.js root@<vm-ip>:/opt/nakama/build/
scp nakama/local.yml root@<vm-ip>:/opt/nakama/local.yml
```

### 4.3 Production docker-compose.yml

Create `/opt/nakama/docker-compose.yml` on the VM:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: nakama
      POSTGRES_USER: nakama
      POSTGRES_PASSWORD: <CHANGE_ME_STRONG_PASSWORD>
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "nakama"]
      interval: 10s
      timeout: 5s
      retries: 5

  nakama:
    image: registry.heroiclabs.com/heroiclabs/nakama:3.38.0
    restart: always
    entrypoint:
      - "/bin/sh"
      - "-ecx"
      - >
        /nakama/nakama migrate up --database.address "nakama:<POSTGRES_PASSWORD>@postgres:5432/nakama" &&
        exec /nakama/nakama
        --name nakama1
        --database.address "nakama:<POSTGRES_PASSWORD>@postgres:5432/nakama"
        --config /nakama/data/local.yml
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./build:/nakama/data/modules/build
      - ./local.yml:/nakama/data/local.yml:ro
    ports:
      - "7350:7350"
      - "7351:7351"
    healthcheck:
      test: ["CMD", "/nakama/nakama", "healthcheck"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 4.4 Production local.yml

Create `/opt/nakama/local.yml` on the VM (or edit the uploaded copy):

```yaml
logger:
  level: "info"

runtime:
  js_entrypoint: "build/index.js"
  http_key: "<CHANGE_ME_HTTP_KEY>"

console:
  username: "admin"
  password: "<CHANGE_ME_CONSOLE_PASSWORD>"

session:
  token_expiry_sec: 86400
  refresh_token_expiry_sec: 604800

socket:
  max_message_size_bytes: 4096
  max_request_size_bytes: 131072
```

### 4.5 Start Nakama

```bash
cd /opt/nakama
docker compose up -d

# Verify
docker compose logs -f nakama
curl http://localhost:7350/
```

Look for logs confirming module loading:

```
Found runtime modules  count=1  modules=[build/index.js]
```

---

## Step 5: Configure Reverse Proxy (Caddy)

Caddy provides automatic SSL via Let's Encrypt.

### 5.1 Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

### 5.2 Caddyfile

Replace `api.yourdomain.com` with your domain. Point your domain's DNS A record to the VM IP.

```
api.yourdomain.com {
    reverse_proxy localhost:7350
}
```

### 5.3 Restart Caddy

```bash
systemctl restart caddy

# Verify SSL
curl https://api.yourdomain.com/
```

Caddy automatically provisions and renews SSL certificates.

---

## Step 6: Deploy Frontend

### 6.1 Build

```bash
# Local machine
npm run build
```

Produces `dist/` directory with static files.

### 6.2 Configure Environment

Set one of these in your hosting provider's dashboard:

**Option A — Single URL (recommended):**

- `VITE_NAKAMA_URL` = `https://api.yourdomain.com`

**Option B — Individual vars:**

- `VITE_NAKAMA_HOST` = `api.yourdomain.com`
- `VITE_NAKAMA_PORT` = `443`
- `VITE_NAKAMA_SSL` = `true`
- `VITE_NAKAMA_SERVER_KEY` = your server key

Both options also need:

- `VITE_TIMER_SECONDS` = `30`

> **Note:** `VITE_NAKAMA_URL` takes precedence over the individual vars when set.

### 6.3 Option A: Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard.

### 6.4 Option B: Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

Set environment variables in Netlify dashboard.

### 6.5 Option C: Cloudflare Pages

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Build output: `dist`
4. Set environment variables in Cloudflare Pages settings

---

## Step 7: Verification Checklist

- [ ] `https://<frontend-url>` loads the app
- [ ] Player can enter username and authenticate
- [ ] Two players can find each other via Quick Play
- [ ] Game plays correctly with real-time state sync
- [ ] Timer mode works (countdown visible, auto-forfeit on timeout)
- [ ] Leaderboard updates after game ends
- [ ] Nakama console accessible at `https://api.yourdomain.com:7351` (or via Caddy)
- [ ] SSL certificates valid (no browser warnings)
- [ ] WebSocket connections work (check browser DevTools → Network → WS)

---

## Environment Variables Summary

### Frontend (`.env` / hosting dashboard)

| Variable                 | Local        | Production                   |
| ------------------------ | ------------ | ---------------------------- |
| `VITE_NAKAMA_URL`        | _(unset)_    | `https://api.yourdomain.com` |
| `VITE_NAKAMA_HOST`       | `127.0.0.1`  | _(use URL instead)_          |
| `VITE_NAKAMA_PORT`       | `7350`       | _(use URL instead)_          |
| `VITE_NAKAMA_SSL`        | `false`      | _(use URL instead)_          |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | your server key              |
| `VITE_TIMER_SECONDS`     | `30`         | `30`                         |

### Server (local.yml)

| Setting              | Local                | Production             |
| -------------------- | -------------------- | ---------------------- |
| Console password     | `password` (default) | Strong unique password |
| Session token expiry | `7200`               | `86400`                |
| Runtime HTTP key     | _(default)_          | Strong unique key      |
| Logger level         | `DEBUG`              | `info`                 |
| DB password          | `nakama`             | Strong unique password |

---

## Maintenance

### View Logs

```bash
docker compose logs -f nakama --tail=100
```

### Update Nakama Modules

```bash
# On local machine: edit nakama/modules/*.ts, then:
npm run nakama:build
scp nakama/build/index.js root@<vm-ip>:/opt/nakama/build/

# On VM:
cd /opt/nakama
docker compose restart nakama
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

```bash
cd /opt/nakama
# Edit docker-compose.yml with new image tag
docker compose pull nakama
docker compose up -d
```

### Full Reset (deletes all data)

```bash
cd /opt/nakama
docker compose down -v
docker compose up -d
```

### Monitor Resources

```bash
docker stats
```
