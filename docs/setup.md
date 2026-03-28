# Setup & Installation

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18.x | Frontend build and dev server |
| npm | >= 9.x | Package manager |
| Docker / Podman | >= 24.x / >= 4.x | Running Nakama + PostgreSQL containers |
| Docker Compose | >= 2.20.x | Orchestrating multi-container setup |
| Git | >= 2.x | Version control |

> **Podman users:** alias `docker-compose` to `podman-compose` or use `podman compose`. All commands below use `docker-compose`.

## Project Structure

```
lila-tictac/
├── docs/                          # Documentation
├── src/                           # Frontend source (React 19 + Vite)
│   ├── components/                # Reusable UI components
│   │   ├── Board.tsx              # 3×3 game grid
│   │   ├── Cell.tsx               # Individual cell (X/O/empty)
│   │   ├── PlayerCard.tsx         # Player info display
│   │   ├── TimerDisplay.tsx       # Countdown timer per player
│   │   ├── GameResult.tsx         # Win/Lose/Draw overlay
│   │   ├── Leaderboard.tsx        # Rankings table
│   │   ├── LoadingSpinner.tsx     # Loading state
│   │   ├── PrivateMatchModal.tsx  # Private match create/join modal
│   │   └── ToastContainer.tsx     # Toast notifications
│   ├── pages/                     # Route-level pages
│   │   ├── AuthPage.tsx           # Login/username entry
│   │   ├── HomePage.tsx           # Lobby with matchmaking buttons
│   │   ├── GamePage.tsx           # Active game view
│   │   └── LeaderboardPage.tsx    # Full leaderboard
│   ├── hooks/                     # Custom React hooks
│   │   ├── useNakama.ts           # Nakama client and session
│   │   ├── useMatch.ts            # Match connection and state
│   │   ├── useMatchmaker.ts       # Matchmaker ticket management
│   │   ├── useLeaderboard.ts      # Leaderboard data fetching
│   │   └── useConnectionStatus.ts # Socket connection status
│   ├── store/                     # Zustand state stores
│   │   ├── authStore.ts           # Session, user, auth state
│   │   ├── gameStore.ts           # Game state, board, turn, result
│   │   └── uiStore.ts             # UI state (loading, errors, modals)
│   ├── lib/                       # Core utilities
│   │   ├── nakama.ts              # Nakama client singleton + socket
│   │   └── constants.ts           # Game constants and config
│   ├── types/                     # TypeScript type definitions
│   │   ├── game.ts                # Game state, messages, player types
│   │   ├── protocol.ts            # Nakama protocol op-codes
│   │   ├── leaderboard.ts         # Leaderboard types
│   │   ├── stores.ts              # Store types
│   │   ├── hooks.ts               # Hook return types
│   │   ├── components.ts          # Component prop types
│   │   └── ui.ts                  # UI state types
│   ├── App.tsx                    # Root component with router
│   └── main.tsx                   # Entry point
├── nakama/                        # Server-side code
│   ├── modules/                   # Nakama TypeScript source files
│   │   ├── index.ts               # InitModule — registers RPCs, match handler
│   │   ├── types.ts               # GameState, PlayerStatsData, etc.
│   │   ├── constants.ts           # OP codes, scoring, WIN_LINES
│   │   ├── utils.ts               # Board helpers, win check, broadcast
│   │   ├── stats.ts               # Player stats CRUD, submitMatchResult
│   │   ├── rpc.ts                 # RPCs: create_private_match, submit_score, get_player_stats
│   │   ├── match-init.ts          # matchInit handler
│   │   ├── match-join.ts          # matchJoinAttempt, matchJoin
│   │   ├── match-loop.ts          # matchLoop (move validation, timers, grace period)
│   │   └── match-leave.ts         # matchLeave, matchTerminate, matchSignal
│   ├── build/                     # Compiled output (generated, gitignored)
│   │   └── index.js               # Single ES5 bundle loaded by Nakama
│   ├── package.json               # typescript + nakama-runtime deps
│   ├── tsconfig.json              # ES5, outFile, files array
│   ├── local.yml                  # Nakama runtime config (js_entrypoint, logger, etc.)
│   └── Dockerfile                 # Production Nakama image (not used in dev)
├── docker-compose.yml             # Nakama + PostgreSQL (dev)
├── package.json                   # Frontend deps + npm scripts
├── tsconfig.json                  # Frontend TypeScript config
├── vite.config.ts                 # Vite config (Tailwind, React, allowedHosts)
└── .env.example                   # Environment variable template
```

## Step 1: Clone and Install

```bash
git clone <repo-url> lila-tictac
cd lila-tictac

# One-command setup: copies .env.example → .env, installs frontend + Nakama deps
npm run setup
```

Or manually:

```bash
cp .env.example .env
npm install
npm run nakama:install    # installs nakama/node_modules (typescript, nakama-runtime)
```

## Step 2: Environment Variables

Edit `.env` if needed:

```env
# Nakama Server — local development
VITE_NAKAMA_HOST=127.0.0.1
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey

# Tunnel URL (optional) — overrides HOST/PORT/SSL above when set.
# Useful for multi-device testing via ngrok, Cloudflare Tunnel, etc.
# VITE_NAKAMA_URL=https://your-tunnel.ngrok-free.app

# Game Config
VITE_TIMER_SECONDS=30
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | Nakama server host |
| `VITE_NAKAMA_PORT` | `7350` | Nakama HTTP API port |
| `VITE_NAKAMA_SSL` | `false` | Use HTTPS/WSS |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | Nakama server key |
| `VITE_NAKAMA_URL` | _(unset)_ | Full tunnel URL — overrides HOST/PORT/SSL when set |
| `VITE_TIMER_SECONDS` | `30` | Seconds per move in timed mode |

## Step 3: Build Nakama Server Modules

Nakama requires a **single bundled ES5 JavaScript file**. The TypeScript source in `nakama/modules/` must be compiled before starting the server:

```bash
npm run nakama:build
```

This runs `tsc` with `outFile` to produce `nakama/build/index.js`.

> **Important:** You must re-run `nakama:build` after editing any file in `nakama/modules/`, then restart Nakama.

## Step 4: Start Nakama Server

```bash
npm run backend:up
```

This starts:
- **PostgreSQL** (internal, port 5432)
- **Nakama** on ports 7349 (gRPC), 7350 (HTTP API + WebSocket), 7351 (Console)

On first start, Nakama automatically runs `migrate up` to initialize the database schema.

### Verify Nakama is Running

```bash
curl http://127.0.0.1:7350/
```

Expected response:
```json
{"name":"nakama","version":"3.38.0"}
```

### Nakama Developer Console

Open `http://127.0.0.1:7351` (credentials: `admin` / `password`), or:

```bash
npm run nakama:console
```

## Step 5: Start Frontend Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Quick Start (All-in-One)

To build Nakama modules, start containers, and launch the frontend dev server in one command:

```bash
npm run start
```

## Step 6: Verify Everything Works

1. Open `http://localhost:5173` — should see the Auth page
2. Enter a username — should authenticate and redirect to Home
3. Open a second browser/incognito window with a different username
4. Both players click "Quick Play" — should match and start a game

## Multi-Device Testing (Tunnel)

To test from multiple devices on a network:

1. Tunnel Nakama port 7350 (e.g., with ngrok):
   ```bash
   ngrok http 7350
   ```
2. Set the tunnel URL in `.env`:
   ```env
   VITE_NAKAMA_URL=https://abc123.ngrok-free.app
   ```
3. Restart the frontend dev server (`npm run dev`)
4. Access the Vite dev server from your devices (you may also need to tunnel port 5173, or use `--host` to expose Vite on your local network)

## npm Scripts Reference

| Command | Purpose |
|---------|---------|
| `npm run setup` | First-time setup: copy `.env`, install all deps |
| `npm run start` | Build Nakama modules + start containers + Vite dev server |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on `src/` |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run nakama:install` | Install Nakama backend dependencies |
| `npm run nakama:build` | Compile Nakama TypeScript modules → `nakama/build/index.js` |
| `npm run nakama:console` | Open Nakama developer console in browser |
| `npm run backend:up` | Start Nakama + PostgreSQL containers |
| `npm run backend:down` | Stop all containers |
| `npm run backend:reset` | Stop containers and delete volumes (full reset) |
| `npm run backend:restart` | Restart Nakama container (after rebuilding modules) |
| `npm run backend:logs` | Tail Nakama server logs |
| `npm run backend:ps` | Show container status |

## Troubleshooting

### Nakama won't start
- Ensure Docker/Podman is running: `docker info`
- Check port conflicts: `lsof -i :7350` and `lsof -i :5432`
- View logs: `npm run backend:logs`

### "Found runtime modules count=0"
- You forgot to build: run `npm run nakama:build`
- Verify `nakama/build/index.js` exists
- Verify `nakama/local.yml` has `js_entrypoint: "build/index.js"`

### Frontend can't connect to Nakama
- Verify Nakama is running: `curl http://127.0.0.1:7350/`
- Check `.env` variables match your Nakama config
- If using `VITE_NAKAMA_URL`, ensure it points to a reachable tunnel
- Restart Vite after changing `.env`: `npm run dev`

### Database connection errors
- PostgreSQL needs a few seconds to initialize on first run
- If persistent errors: `npm run backend:reset` (deletes data) then `npm run backend:up`

### Nakama module changes not reflected
1. Rebuild: `npm run nakama:build`
2. Restart: `npm run backend:restart`
3. Check logs for errors: `npm run backend:logs`
