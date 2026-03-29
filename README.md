# Lila Tictac

Production-ready multiplayer Tic-Tac-Toe with server-authoritative Nakama backend. All game logic, move validation, and state management runs on the server — clients are thin renderers.

## Tech Stack

| Layer    | Technology                   | Purpose                                   |
| -------- | ---------------------------- | ----------------------------------------- |
| Frontend | React 19 + TypeScript + Vite | UI, client-side rendering                 |
| Styling  | Tailwind CSS                 | Responsive, mobile-first design           |
| State    | Zustand                      | Client state (auth, game, UI)             |
| Backend  | Nakama 3.x                   | Server-authoritative game engine          |
| Database | PostgreSQL                   | Nakama persistence                        |
| Runtime  | Nakama TypeScript Runtime    | Custom server logic (match handler, RPCs) |
| Infra    | Docker + Docker Compose      | Local dev and deployment                  |

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
│   └── Dockerfile              # Custom Nakama image with modules
├── docs/                       # Full documentation
├── docker-compose.yml          # Nakama + PostgreSQL
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

See [docs/deployment.md](docs/deployment.md) for the full deployment guide covering:

- Cloud VM provisioning (DigitalOcean, AWS EC2, GCP)
- Production Nakama configuration with SSL (Caddy reverse proxy)
- Frontend deployment to Vercel, Netlify, or Cloudflare Pages
- Database backup and maintenance

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
