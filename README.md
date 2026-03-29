# Lila Tictac

Production-ready multiplayer Tic-Tac-Toe with server-authoritative Nakama backend. All game logic, move validation, and state management runs on the server — clients are thin renderers.

## Tech Stack

| Layer    | Technology                   | Purpose                                   |
| -------- | ---------------------------- | ----------------------------------------- |
| Frontend | React 19 + TypeScript + Vite | UI, client-side rendering                 |
| Styling  | Tailwind CSS                 | Responsive, mobile-first design           |
| State    | Zustand                      | Client state (auth, game, UI)             |
| Backend  | Nakama 3.x                   | Server-authoritative game engine          |
| Database | PostgreSQL (Neon)            | Nakama persistence                        |
| Runtime  | Nakama TypeScript Runtime    | Custom server logic (match handler, RPCs) |
| Infra    | Railway + Vercel + Docker    | Deployment and local dev                  |

## Architecture

```
 Browser (React + Zustand + Nakama JS SDK)
           │ WebSocket + HTTP
           ▼
 Nakama Server (Docker)
   ├── Authoritative Match Handler (game state, move validation, win/draw detection)
   ├── Matchmaker Module
   ├── Leaderboard Module
   ├── Auth Module
   └── RPC Functions (createPrivateMatch, submitScore, getLeaderboard)
           │
           ▼
 PostgreSQL (Docker) — users, storage, leaderboards, match state
```

All validation is server-side — clients cannot manipulate game state, skip turns, or make illegal moves. Both players always see the same authoritative state.

See [docs/architecture.md](docs/architecture.md) for the full system diagram, data flow, and design decisions.

## Prerequisites

| Tool           | Version   |
| -------------- | --------- |
| Node.js        | >= 18.x   |
| npm            | >= 9.x    |
| Docker         | >= 24.x   |
| Docker Compose | >= 2.20.x |

## Quick Start

```bash
git clone <repo-url> lila-tictac
cd lila-tictac
npm install
cp .env.example .env
docker compose up -d
npm run dev
```

Open `http://localhost:5173`.

### Verify

1. Open the app — should see the Auth page
2. Enter a username — authenticates and redirects to Home
3. Open a second browser/incognito window, enter a different username
4. Both players click "Find Game" — matched and game starts

## Features

### Core

- Server-authoritative game logic with move validation
- Real-time multiplayer via WebSocket
- Automatic matchmaking (Quick Play) and private matches
- Responsive, mobile-first UI

### Bonus

- **Leaderboard** — global rankings tracking wins, losses, and win streaks
- **Timer Mode** — 30-second countdown per move with auto-forfeit on timeout

## Project Structure

```
lila-tictac/
├── src/                        # Frontend source
│   ├── components/             # Board, Cell, PlayerCard, TimerDisplay, GameResult, Leaderboard
│   ├── pages/                  # AuthPage, HomePage, GamePage, LeaderboardPage
│   ├── hooks/                  # useNakama, useMatch, useMatchmaker, useLeaderboard
│   ├── store/                  # Zustand stores (authStore, gameStore, uiStore)
│   ├── lib/                    # Nakama client singleton, constants
│   ├── types/                  # TypeScript type definitions
│   ├── App.tsx                 # Root component with router
│   └── main.tsx                # Entry point
├── nakama/
│   ├── modules/                # Server-side game logic
│   │   └── tic-tac-toe.ts      # Match handler + RPCs
│   ├── entrypoint.sh           # Nakama startup script (reads DB env vars)
│   ├── setup-db.sql            # SQL to create dedicated Nakama user/DB
│   ├── local.yml               # Nakama config (runtime, logging, socket)
│   └── Dockerfile              # Custom Nakama image with modules
├── docs/                       # Full documentation
├── docker-compose.yml          # Nakama + PostgreSQL (local dev)
├── render.yaml                 # Render deployment blueprint
├── fly.toml                    # Fly.io deployment config
├── .env.example                # Environment variable template
└── package.json
```

## Available Scripts

| Command                         | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `npm run dev`                   | Start Vite dev server with HMR (`localhost:5173`) |
| `npm run build`                 | Production build to `dist/`                       |
| `npm run preview`               | Preview production build locally                  |
| `npm run lint`                  | Run ESLint                                        |
| `npm run typecheck`             | Run TypeScript type checking                      |
| `docker compose up -d`          | Start Nakama + PostgreSQL                         |
| `docker compose down`           | Stop all containers                               |
| `docker compose logs -f nakama` | View Nakama server logs                           |
| `docker compose restart nakama` | Restart Nakama (after module changes)             |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust:

| Variable                 | Default      | Description                              |
| ------------------------ | ------------ | ---------------------------------------- |
| `VITE_NAKAMA_HOST`       | `127.0.0.1`  | Nakama server host                       |
| `VITE_NAKAMA_PORT`       | `7350`       | Nakama HTTP API port                     |
| `VITE_NAKAMA_SSL`        | `false`      | Use HTTPS/WSS (set `true` in production) |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | Nakama server key                        |
| `VITE_TIMER_SECONDS`     | `30`         | Seconds per move in timed mode           |

#### Nakama Database (Railway / production)

| Variable              | Default | Description               |
| --------------------- | ------- | ------------------------- |
| `NAKAMA_DB_HOST`      | —       | PostgreSQL host           |
| `NAKAMA_DB_PORT`      | `5432`  | PostgreSQL port           |
| `NAKAMA_DB_USER`      | —       | Database user             |
| `NAKAMA_DB_PASSWORD`  | —       | Database password         |
| `NAKAMA_DB_NAME`      | `nakama`| Database name             |

### Ports

| Service          | Port | Purpose                    |
| ---------------- | ---- | -------------------------- |
| Nakama HTTP API  | 7350 | REST API                   |
| Nakama gRPC      | 7349 | Internal                   |
| Nakama WebSocket | 7351 | Real-time communication    |
| Frontend (dev)   | 5173 | Vite dev server            |
| PostgreSQL       | 5432 | Database (Docker-internal) |

## Testing Multiplayer

1. Start the app: `docker compose up -d && npm run dev`
2. Open `http://localhost:5173` in Browser A — enter username "Player1"
3. Open `http://localhost:5173` in Browser B (incognito) — enter username "Player2"
4. Both click **Quick Play** — Nakama matchmaker pairs them
5. Play the game — moves are validated server-side and broadcast to both clients
6. After game ends, check the leaderboard

## Deployment

The production deployment uses **Railway** (Nakama) + **Neon** (PostgreSQL) + **Vercel** (frontend).

### Live URL

Frontend: [https://lila-tictac.vercel.app/](https://lila-tictac.vercel.app/)

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

| Variable              | Value                                    |
| --------------------- | ---------------------------------------- |
| `NAKAMA_DB_HOST`      | `your-neon-host.neon.tech`               |
| `NAKAMA_DB_PORT`      | `5432`                                   |
| `NAKAMA_DB_USER`      | `nakama`                                 |
| `NAKAMA_DB_PASSWORD`  | your password                            |
| `NAKAMA_DB_NAME`      | `nakama`                                 |

### 3. Deploy frontend to Vercel

1. Connect your GitHub repo to Vercel (auto-detects Vite)
2. Set environment variables in **Settings → Environment Variables**:

| Variable                 | Value                          |
| ------------------------ | ------------------------------ |
| `VITE_NAKAMA_HOST`       | `your-railway-app.up.railway.app` |
| `VITE_NAKAMA_PORT`       | `443`                          |
| `VITE_NAKAMA_SSL`        | `true`                         |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey`                   |
| `VITE_TIMER_SECONDS`     | `30`                           |

3. Redeploy after setting env vars

> **Note:** Railway free tier only exposes a single HTTP port (7350). WebSocket realtime connections (port 7351) are not available on the free plan. For full realtime multiplayer, upgrade to a paid Railway plan or use a platform that supports multiple ports.

See [docs/deployment.md](docs/deployment.md) for additional deployment options.

## Documentation

| Doc                                          | Description                                      |
| -------------------------------------------- | ------------------------------------------------ |
| [docs/plan.md](docs/plan.md)                 | Implementation plan and phase breakdown          |
| [docs/architecture.md](docs/architecture.md) | System architecture, data flow, design decisions |
| [docs/setup.md](docs/setup.md)               | Detailed setup and troubleshooting               |
| [docs/api.md](docs/api.md)                   | API and RPC reference                            |
| [docs/game-logic.md](docs/game-logic.md)     | Server-side game logic and match handler         |
| [docs/matchmaking.md](docs/matchmaking.md)   | Matchmaking system design                        |
| [docs/frontend.md](docs/frontend.md)         | Frontend architecture and components             |
| [docs/testing.md](docs/testing.md)           | Testing strategy                                 |
| [docs/deployment.md](docs/deployment.md)     | Deployment process and configuration             |
