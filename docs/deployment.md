# Deployment

## Overview

| Component | Service | Purpose |
|-----------|---------|---------|
| Nakama Server | Cloud VM (DigitalOcean/AWS EC2/GCP Compute) | Game server |
| PostgreSQL | Same VM (Docker) or managed DB | Nakama persistence |
| Frontend | Vercel / Netlify / Cloudflare Pages | Static site hosting |

## Prerequisites

- Cloud provider account with billing enabled
- Domain name (optional but recommended for SSL)
- SSH key pair for VM access
- Docker and Docker Compose installed on VM

---

## Step 1: Provision Cloud VM

### Recommended Specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 25 GB SSD | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

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

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (reverse proxy) |
| 7350 | TCP | 0.0.0.0/0 | Nakama HTTP API |
| 7351 | TCP | 0.0.0.0/0 | Nakama WebSocket |

**Note:** In production, ports 7350 and 7351 should be behind the reverse proxy. Expose only 80 and 443 if using Nginx/Caddy.

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

## Step 3: Deploy Nakama Server

### 3.1 Create Project Directory

```bash
mkdir -p /opt/nakama
cd /opt/nakama
```

### 3.2 Production docker-compose.yml

```yaml
version: "3"
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
    image: heroiclabs/nakama:3.22.0
    entrypoint:
      - "/bin/sh"
      - "-ecx"
      - >
        /nakama/nakama migrate up --database.address "nakama:<POSTGRES_PASSWORD>@postgres:5432/nakama" &&
        /nakama/nakama --config /nakama/data/config.yml --database.address "nakama:<POSTGRES_PASSWORD>@postgres:5432/nakama"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./config.yml:/nakama/data/config.yml
      - ./modules:/nakama/data/modules
    ports:
      - "7350:7350"
      - "7351:7351"
    restart: always

volumes:
  postgres_data:
```

### 3.3 Production config.yml

```yaml
name: nakama-tictactoe

logger:
  level: "info"
  stdout: true

console:
  address: "0.0.0.0:7351"
  username: "admin"
  password: "<CHANGE_ME_CONSOLE_PASSWORD>"

session:
  token_expiry_sec: 86400      # 24 hours
  refresh_token_expiry_sec: 604800  # 7 days

socket:
  address: "0.0.0.0:7350"
  max_message_size_bytes: 4096
  read_buffer_size_bytes: 4096
  write_buffer_size_bytes: 4096
  outgoing_queue_size: 64

runtime:
  path: "/nakama/data/modules"
  http_key: "<CHANGE_ME_HTTP_KEY>"

match:
  input_queue_size: 64
  call_queue_size: 64
  join_attempt_queue_size: 64
  max_ticks: 0  # unlimited
```

### 3.4 Upload Custom Modules

```bash
# From local machine
scp -r nakama/modules root@<vm-ip>:/opt/nakama/modules
```

### 3.5 Start Nakama

```bash
cd /opt/nakama
docker compose up -d

# Verify
docker compose logs -f nakama
curl http://localhost:7350/
```

---

## Step 4: Configure Reverse Proxy (Caddy)

Caddy provides automatic SSL via Let's Encrypt.

### 4.1 Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

### 4.2 Caddyfile

Replace `tictactoe.yourdomain.com` with your domain. Point your domain's DNS A record to the VM IP.

```
tictactoe.yourdomain.com {
    reverse_proxy localhost:7350
}

ws.tictactoe.yourdomain.com {
    reverse_proxy localhost:7350
}
```

### 4.3 Restart Caddy

```bash
systemctl restart caddy

# Verify SSL
curl https://tictactoe.yourdomain.com/
```

Caddy automatically provisions and renews SSL certificates.

---

## Step 5: Deploy Frontend

### 5.1 Build

```bash
# Local machine
npm run build
```

Produces `dist/` directory with static files.

### 5.2 Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard:
- `VITE_NAKAMA_HOST` = `tictactoe.yourdomain.com`
- `VITE_NAKAMA_PORT` = `443`
- `VITE_NAKAMA_SSL` = `true`
- `VITE_NAKAMA_SERVER_KEY` = your server key

### 5.3 Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Set the same environment variables in Netlify dashboard.

### 5.4 Option C: Cloudflare Pages

1. Connect GitHub repo to Cloudflare Pages
2. Build command: `npm run build`
3. Build output: `dist`
4. Set environment variables in Cloudflare Pages settings

---

## Step 6: Verification Checklist

- [ ] `https://<frontend-url>` loads the app
- [ ] Player can enter username and authenticate
- [ ] Two players can find each other via Quick Play
- [ ] Game plays correctly with state sync
- [ ] Leaderboard updates after game ends
- [ ] Nakama console accessible at `https://tictactoe.yourdomain.com:7351`
- [ ] SSL certificates valid (no browser warnings)
- [ ] WebSocket connections work (check browser DevTools → Network → WS)

---

## Environment Variables Summary

### Frontend (`.env` / hosting dashboard)

| Variable | Local | Production |
|----------|-------|------------|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | `tictactoe.yourdomain.com` |
| `VITE_NAKAMA_PORT` | `7350` | `443` |
| `VITE_NAKAMA_SSL` | `false` | `true` |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | your server key |
| `VITE_TIMER_SECONDS` | `30` | `30` |

### Server (config.yml)

| Setting | Local | Production |
|---------|-------|------------|
| Console password | `password` | Strong unique password |
| Session token expiry | `86400` | `86400` |
| Runtime HTTP key | `defaultkey` | Strong unique key |
| Logger level | `debug` | `info` |
| DB password | `nakama` | Strong unique password |

---

## Maintenance

### View Logs
```bash
docker compose logs -f nakama --tail=100
```

### Restart Nakama (after module changes)
```bash
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
# Edit docker-compose.yml with new image version
docker compose pull nakama
docker compose up -d
```

### Monitor Resources
```bash
docker stats
```
