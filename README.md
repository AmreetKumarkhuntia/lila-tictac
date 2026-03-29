# Lila Tictac

Production-ready multiplayer Tic-Tac-Toe with server-authoritative Nakama backend. All game logic, move validation, and state management runs on the server — clients are thin renderers.

## Tech Stack

| Layer            | Technology                   | Purpose                                           |
| ---------------- | ---------------------------- | ------------------------------------------------- |
| Frontend         | React 19 + TypeScript + Vite | UI, client-side rendering                         |
| Styling          | Tailwind CSS 4               | Responsive, mobile-first design                   |
| State Management | Zustand 5                    | Client state (auth, game, UI)                     |
| Backend          | Nakama 3.x                   | Server-authoritative game engine                  |
| Database         | PostgreSQL                   | Nakama persistence (users, storage, leaderboards) |
| Server Runtime   | Nakama TypeScript Runtime    | Custom server logic (match handler, RPCs)         |
| Real-time        | WebSocket (Nakama JS SDK)    | Live game moves, matchmaking events               |
| Containerization | Docker + Docker Compose      | Local dev and production deployment               |
| CI/CD            | GitHub Actions               | Lint, typecheck, build Docker images to GHCR      |
| Deployment       | Railway + Neon + Vercel      | Production hosting (multiple options available)   |

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

### Key Design Decisions

| Decision                                | Rationale                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Server-authoritative**                | All validation happens server-side. Clients cannot cheat, skip turns, or manipulate state. Both players always see identical authoritative state.                                          |
| **Nakama**                              | Built-in matchmaker, leaderboards, authentication, and storage. Authoritative match system with TypeScript runtime for custom game logic. Production-grade, used by game studios at scale. |
| **Authoritative matches** (not relayed) | Server runs a match handler with full game loop and owns all state. Required for server-side validation and anti-cheat.                                                                    |
| **Zustand** (not Redux/Context)         | Minimal boilerplate, TypeScript-first, no providers needed. Selective subscriptions prevent unnecessary re-renders.                                                                        |
| **Shared WebSocket singleton**          | Matchmaker and match use one socket connection with promise deduplication. Prevents duplicate connections and race conditions.                                                             |
| **Client-side timer interpolation**     | TimerDisplay counts down locally (~100ms intervals) between server updates to avoid jitter. Color-coded urgency: green (>10s), amber (5-10s), red with pulse (<5s).                        |
| **Session persistence**                 | Auth tokens stored in localStorage with automatic session restore and refresh on app load.                                                                                                 |

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
npm run setup          # copy .env, install all deps (frontend + nakama)
npm run dev:fresh      # build nakama modules, start docker, wait for healthy, start vite
```

Or manually:

```bash
npm install
npm run nakama:install
cp .env.example .env
npm run nakama:build
docker compose up -d
npm run dev
```

Open `http://localhost:5173`.

### Verify

1. Open the app — should see the Login / Register page
2. Register a new account with email, username, and password
3. Open a second browser/incognito window, register a different account
4. Both players click "Quick Play" — matched and game starts
5. Play moves — validated server-side and broadcast to both clients
6. After game ends, check the leaderboard

## Features

### Authentication

- Email/password registration and login via Nakama
- Persistent sessions with automatic restore and token refresh
- Logout with full cleanup (disconnect socket, clear storage)

### Game Modes

| Mode        | Description                                            | Tick Rate    | Timer          |
| ----------- | ------------------------------------------------------ | ------------ | -------------- |
| **Classic** | Standard Tic-Tac-Toe. Take your time.                  | 5 ticks/sec  | None           |
| **Timed**   | 30-second countdown per move. Auto-forfeit on timeout. | 10 ticks/sec | 30s per player |

### Matchmaking

- **Quick Play** — Nakama matchmaker automatically pairs players by game mode (Classic or Timed)
- **Private Match** — Create a match, get a shareable ID, opponent joins with the ID. Supports both modes.

### Server-Authoritative Game Logic

- All moves validated server-side (turn order, bounds, cell occupancy, game status)
- Win detection across all 8 possible lines (3 rows, 3 columns, 2 diagonals)
- Draw detection when all 9 cells are filled
- Winning line coordinates sent to clients for visual highlighting
- Illegal moves rejected with error messages

### Reconnection & Disconnect Handling

- 15-second grace period when a player disconnects mid-game
- Opponent is notified of temporary disconnect with visual indicator
- Reconnecting player gets full state sync (board, timers, assigned symbol)
- If grace period expires, disconnected player forfeits
- Match ID persisted to sessionStorage for page-refresh resilience

### Leaderboard & Scoring

- Global leaderboard (`tic-tac-toe-wins`) sorted by cumulative score
- Scoring: Win = **3 points**, Draw = **1 point**, Loss = 0 points
- Per-player stats tracked: wins, losses, draws, games played, current streak, best streak, win rate
- Scores auto-submitted server-side after every game — no client-side score reporting
- Leaderboard records include metadata (wins, games played, win rate)

### UI & UX

- Responsive, mobile-first design (320px+)
- Dark/light theme toggle with class-based switching (no flash on load)
- Toast notifications for errors, info, and success events
- Post-game result modal with points earned and updated stats
- Accessible: keyboard navigation, ARIA labels, focus traps in modals
- Animations: cell scale-in, timer urgency pulse, result overlay fade

## Project Structure

```
lila-tictac/
├── src/                            # Frontend source (~3,600 LOC)
│   ├── components/                 # Reusable UI primitives
│   │   ├── icons/                  # SVG icon components (Sun, Moon, Arrow, Refresh, X)
│   │   ├── Board.tsx               # 3x3 game grid
│   │   ├── Button.tsx              # Polymorphic button (primary/secondary/ghost/icon)
│   │   ├── Cell.tsx                # Single board cell with X/O animation
│   │   ├── Input.tsx               # Styled text input with label/error
│   │   ├── LoadingSpinner.tsx      # CSS animated spinner
│   │   ├── TabGroup.tsx            # Generic tab switcher
│   │   ├── Table.tsx               # Generic data table with responsive columns
│   │   ├── TimerDisplay.tsx        # Countdown timer with progress bar
│   │   └── ToastContainer.tsx      # Fixed-position toast stack
│   ├── sections/                   # Composite UI sections
│   │   ├── GameResult.tsx          # Post-game overlay (win/loss/draw + stats)
│   │   ├── Leaderboard.tsx         # Rankings table with rank badges
│   │   ├── PlayerCard.tsx          # Player info + symbol + turn indicator
│   │   └── PrivateMatchModal.tsx   # Create/join private match dialog
│   ├── pages/                      # Route-level pages
│   │   ├── AuthPage.tsx            # Login/Register with validation
│   │   ├── HomePage.tsx            # Main menu (Quick Play, Private, Leaderboard)
│   │   ├── GamePage.tsx            # Active game view (board + players + timer)
│   │   └── LeaderboardPage.tsx     # Global rankings + personal stats
│   ├── hooks/                      # Custom React hooks
│   │   ├── useNakama.ts            # Auth operations (register, login, logout)
│   │   ├── useMatch.ts             # In-match operations (join, sendMove, leave)
│   │   ├── useMatchmaker.ts        # Matchmaker lifecycle (find, cancel, private)
│   │   ├── useLeaderboard.ts       # Leaderboard data fetching
│   │   └── useConnectionStatus.ts  # Browser online/offline + WebSocket reconnect
│   ├── store/                      # Zustand state stores
│   │   ├── authStore.ts            # Session, username, auth status, session restore
│   │   ├── gameStore.ts            # Full game state (board, players, timers, matchmaking)
│   │   └── uiStore.ts              # Loading, errors, theme (light/dark), toasts
│   ├── lib/                        # Core utilities
│   │   ├── nakama.ts               # Nakama client singleton + shared WebSocket
│   │   ├── authStorage.ts          # localStorage wrapper for auth tokens
│   │   ├── constants.ts            # Op codes, win lines, scoring, config defaults
│   │   └── matchDataHandler.ts     # Incoming WebSocket message dispatcher
│   ├── types/                      # TypeScript type definitions
│   │   ├── game.ts                 # Game domain types (symbols, board, modes, status)
│   │   ├── protocol.ts             # Client-server message types
│   │   ├── stores.ts               # Zustand store shape interfaces
│   │   ├── components.ts           # Component prop interfaces
│   │   ├── leaderboard.ts          # Leaderboard record and player stats types
│   │   ├── hooks.ts                # Hook return type interfaces
│   │   └── ui.ts                   # Theme, toast, auth mode types
│   ├── App.tsx                     # Root component (router, error boundary, auth gate)
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Tailwind import, animations, base styles
├── nakama/
│   ├── modules/                    # Server-side game logic (~1,000 LOC)
│   │   ├── index.ts                # InitModule — registers match handler, RPCs, matchmaker
│   │   ├── constants.ts            # Op codes, scoring, grace period, win lines
│   │   ├── types.ts                # GameState, PlayerStats, symbol types
│   │   ├── utils.ts                # Board helpers, win check, state broadcast
│   │   ├── stats.ts                # Player stats read/write, match result submission
│   │   ├── rpc.ts                  # RPC functions + matchmakerMatched callback
│   │   ├── match-init.ts           # Match initialization (empty board, mode, tick rate)
│   │   ├── match-join.ts           # Join attempt validation + join handler (assign X/O)
│   │   ├── match-join.ts           # Reconnection handling (state sync, opponent notify)
│   │   ├── match-loop.ts           # Core game loop (grace period, timers, move validation, win/draw)
│   │   └── match-leave.ts          # Disconnect/leave handling, match termination
│   ├── entrypoint.sh               # Nakama startup (DB migrate + serve)
│   ├── setup-db.sql                # SQL to create dedicated Nakama user/DB
│   ├── local.yml                   # Nakama config (runtime, logging, socket)
│   ├── Dockerfile                   # Multi-stage build (Node build → Nakama runtime)
│   ├── package.json                # Build scripts (tsc → single ES5 bundle)
│   └── tsconfig.json               # ES5 target (QuickJS), explicit file ordering
├── docs/                           # Full documentation
├── .github/workflows/              # CI (lint + typecheck) and Release (GHCR images)
├── docker-compose.yml              # PostgreSQL + Nakama + Frontend (local dev)
├── Dockerfile.frontend             # Multi-stage build (Node build → Nginx serve)
├── nginx.conf                      # SPA fallback, gzip, static asset caching
├── render.yaml                     # Render.com deployment blueprint
├── fly.toml                        # Fly.io deployment config
├── dev.sh                          # All-in-one dev startup script
├── .env.example                    # Environment variable template
└── package.json                    # Frontend deps + 16 npm scripts
```

## Client-Server Protocol

### Op Codes

| Code | Direction       | Name                   | Payload                                                                     |
| ---- | --------------- | ---------------------- | --------------------------------------------------------------------------- |
| `1`  | Client → Server | `MOVE`                 | `{ row: number, col: number }`                                              |
| `10` | Server → Client | `STATE_UPDATE`         | `{ board, currentPlayer, moveCount, status, timers, opponentDisconnected }` |
| `11` | Server → Client | `GAME_START`           | `{ players, mode, assignedSymbol }`                                         |
| `12` | Server → Client | `GAME_OVER`            | `{ winner, board, winningLine, reason }`                                    |
| `13` | Server → Client | `ERROR`                | `{ message }`                                                               |
| `14` | Server → Client | `OPPONENT_LEFT`        | `{ winner, reason }`                                                        |
| `15` | Server → Client | `MATCH_TERMINATED`     | _(empty)_                                                                   |
| `16` | Server → Client | `OPPONENT_RECONNECTED` | `{ reconnectedSymbol }`                                                     |

### RPC Functions

| RPC ID                 | Auth | Description                                                                                   |
| ---------------------- | ---- | --------------------------------------------------------------------------------------------- |
| `create_private_match` | Yes  | Creates authoritative match with given mode. Returns `{ matchId }`.                           |
| `submit_score`         | Yes  | Legacy no-op. Scores are auto-submitted server-side after each game.                          |
| `get_player_stats`     | Yes  | Returns caller's stats: wins, losses, draws, gamesPlayed, currentStreak, bestStreak, winRate. |

### Communication Channels

| Channel    | Protocol         | Purpose                                         |
| ---------- | ---------------- | ----------------------------------------------- |
| Auth       | HTTP             | Email/password login, register, session refresh |
| Matchmaker | HTTP + WebSocket | Add/cancel ticket, receive matched event        |
| Match      | WebSocket        | Real-time game moves, state updates             |
| RPC        | HTTP             | Create private match, fetch player stats        |
| Storage    | HTTP via Nakama  | Read/write player stats (server-side)           |

## Available Scripts

| Command                   | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `npm run setup`           | First-time setup: copy `.env`, install frontend + nakama deps   |
| `npm run dev`             | Start Vite dev server with HMR (`localhost:5173`)               |
| `npm run dev:fresh`       | Full fresh start via `dev.sh` (stop, build, start, wait, serve) |
| `npm run start`           | Build nakama + start docker + start Vite                        |
| `npm run build`           | Production build (`tsc -b && vite build`)                       |
| `npm run preview`         | Preview production build locally                                |
| `npm run lint`            | Run ESLint on `src/`                                            |
| `npm run typecheck`       | Run TypeScript type checking                                    |
| `npm run format`          | Format all files with Prettier                                  |
| `npm run format:check`    | Check formatting without writing                                |
| `npm run backend:up`      | Start Nakama + PostgreSQL containers                            |
| `npm run backend:down`    | Stop all containers                                             |
| `npm run backend:reset`   | Stop containers and remove volumes (fresh DB)                   |
| `npm run backend:restart` | Restart Nakama (after module changes)                           |
| `npm run backend:logs`    | Stream Nakama server logs                                       |
| `npm run backend:ps`      | Show container status                                           |
| `npm run nakama:install`  | Install nakama module dependencies                              |
| `npm run nakama:build`    | Compile nakama TypeScript → single JS bundle                    |
| `npm run nakama:console`  | Open Nakama console in browser                                  |

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and adjust:

| Variable                 | Default      | Description                                                    |
| ------------------------ | ------------ | -------------------------------------------------------------- |
| `VITE_NAKAMA_HOST`       | `127.0.0.1`  | Nakama server host                                             |
| `VITE_NAKAMA_PORT`       | `7350`       | Nakama HTTP API port                                           |
| `VITE_NAKAMA_SSL`        | `false`      | Use HTTPS/WSS (set `true` in production)                       |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | Nakama server key                                              |
| `VITE_NAKAMA_URL`        | _(unset)_    | Full tunnel URL (overrides HOST/PORT/SSL when set, e.g. ngrok) |
| `VITE_TIMER_SECONDS`     | `30`         | Seconds per move in timed mode                                 |

#### Nakama Database (production)

| Variable             | Default  | Description       |
| -------------------- | -------- | ----------------- |
| `NAKAMA_DB_HOST`     | —        | PostgreSQL host   |
| `NAKAMA_DB_PORT`     | `5432`   | PostgreSQL port   |
| `NAKAMA_DB_USER`     | —        | Database user     |
| `NAKAMA_DB_PASSWORD` | —        | Database password |
| `NAKAMA_DB_NAME`     | `nakama` | Database name     |

### Ports

| Service           | Port | Purpose                       |
| ----------------- | ---- | ----------------------------- |
| Nakama HTTP API   | 7350 | REST API, RPCs, auth          |
| Nakama gRPC       | 7349 | Internal                      |
| Nakama WebSocket  | 7351 | Real-time game communication  |
| Frontend (dev)    | 5173 | Vite dev server               |
| Frontend (Docker) | 3000 | Nginx-served production build |
| PostgreSQL        | 5432 | Database (Docker-internal)    |

## Testing Multiplayer

1. Start the app: `npm run dev:fresh`
2. Open `http://localhost:5173` in Browser A — register account "Player1"
3. Open `http://localhost:5173` in Browser B (incognito) — register account "Player2"
4. Both click **Quick Play** (same mode) — Nakama matchmaker pairs them
5. Play the game — moves are validated server-side and broadcast to both clients
6. After game ends, both see the result overlay with updated stats
7. Check the **Leaderboard** page for global rankings

### What to verify

- Moves appear instantly on both screens (WebSocket broadcast)
- Cannot click on occupied cells or when it's not your turn
- Winning line is highlighted on the board
- Timed mode: timer counts down, auto-forfeit on expiry
- Disconnect one player: opponent sees "Opponent disconnected" with 15s countdown
- Reconnect within 15s: game resumes
- Leaderboard updates after each game

## Deployment

### Live URL

Frontend: [https://lila-tictac.vercel.app/](https://lila-tictac.vercel.app/)

### Option A: Railway + Neon + Vercel

#### 1. Set up the database (Neon)

Run `nakama/setup-db.sql` in your Neon SQL editor:

```sql
CREATE USER nakama WITH PASSWORD 'your_password';
GRANT nakama TO your_neon_user;
CREATE DATABASE nakama OWNER nakama;
\c nakama
GRANT ALL ON SCHEMA public TO nakama;
```

#### 2. Deploy Nakama to Railway

1. Create a new **Web Service** on Railway, connect your GitHub repo
2. Set **Docker** runtime with `nakama/Dockerfile`
3. Set **Custom Start Command** to `/nakama/entrypoint.sh`
4. Set **Target Port** to `7350`
5. Add environment variables (`NAKAMA_DB_HOST`, `NAKAMA_DB_PORT`, `NAKAMA_DB_USER`, `NAKAMA_DB_PASSWORD`, `NAKAMA_DB_NAME`)

#### 3. Deploy frontend to Vercel

1. Connect your GitHub repo to Vercel (auto-detects Vite)
2. Set environment variables: `VITE_NAKAMA_HOST`, `VITE_NAKAMA_PORT=443`, `VITE_NAKAMA_SSL=true`, `VITE_NAKAMA_SERVER_KEY`
3. Redeploy after setting env vars

> **Note:** Railway free tier only exposes a single HTTP port (7350). WebSocket realtime connections (port 7351) are not available on the free plan. For full realtime multiplayer, upgrade to a paid Railway plan or use a platform that supports multiple ports.

### Option B: Fly.io

The `fly.toml` config is ready for the Nakama backend:

```bash
fly launch   # uses nakama/Dockerfile
fly secrets set NAKAMA_DB_HOST=... NAKAMA_DB_PORT=5432 NAKAMA_DB_USER=... NAKAMA_DB_PASSWORD=...
fly deploy
```

Fly.io exposes both HTTP (7350) and TCP (7351) for full WebSocket support. Auto-scales to zero machines when idle.

### Option C: Render.com

The `render.yaml` blueprint is configured. Connect your repo, set the database credentials (`sync: false` vars), and deploy.

### Option D: Docker Compose (self-hosted)

```bash
docker compose up -d    # starts PostgreSQL + Nakama + Frontend (Nginx)
# Frontend on :3000, Nakama on :7350/:7351
```

See [docs/deployment.md](docs/deployment.md) for detailed instructions including VM provisioning, reverse proxy setup with Caddy, and maintenance.

## CI/CD

### Pre-commit (Husky + lint-staged)

Every `git commit` automatically runs on staged files:

- **`src/**/\*.{ts,tsx}`\*\*: ESLint fix → Prettier write → TypeScript typecheck
- **`nakama/**/\*.ts`\*\*: Prettier write → TypeScript typecheck
- **Config/doc files**: Prettier write

Commits are blocked if any check fails.

### GitHub Actions

| Workflow                     | Trigger             | Steps                                                                             |
| ---------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| **CI** (`ci.yaml`)           | Push/PR to `master` | ESLint → Frontend typecheck → Nakama typecheck → Prettier check                   |
| **Release** (`release.yaml`) | Push to `master`    | Build + push Docker images to GHCR (frontend + nakama, tagged `latest` + `<sha>`) |

Images published to `ghcr.io/<owner>/lila-tictac/frontend` and `ghcr.io/<owner>/lila-tictac/nakama`.

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
