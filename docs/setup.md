# Setup & Installation

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 18.x | Frontend build and dev server |
| npm | >= 9.x | Package manager |
| Docker | >= 24.x | Running Nakama + PostgreSQL containers |
| Docker Compose | >= 2.20.x | Orchestrating multi-container setup |
| Git | >= 2.x | Version control |

## Project Structure

```
lila-tictac/
├── docs/                          # Documentation
├── src/                           # Frontend source
│   ├── components/                # Reusable UI components
│   │   ├── Board.tsx              # 3x3 game grid
│   │   ├── Cell.tsx               # Individual cell (X/O/empty)
│   │   ├── PlayerCard.tsx         # Player info display
│   │   ├── TimerDisplay.tsx       # Countdown timer per player
│   │   ├── GameResult.tsx         # Win/Lose/Draw overlay
│   │   ├── Leaderboard.tsx        # Rankings table
│   │   └── LoadingSpinner.tsx     # Loading state
│   ├── pages/                     # Route-level pages
│   │   ├── AuthPage.tsx           # Login/username entry
│   │   ├── HomePage.tsx           # Lobby with matchmaking buttons
│   │   ├── GamePage.tsx           # Active game view
│   │   └── LeaderboardPage.tsx    # Full leaderboard
│   ├── hooks/                     # Custom React hooks
│   │   ├── useNakama.ts           # Nakama client and session
│   │   ├── useMatch.ts            # Match connection and state
│   │   ├── useMatchmaker.ts       # Matchmaker ticket management
│   │   └── useLeaderboard.ts      # Leaderboard data fetching
│   ├── store/                     # Zustand state stores
│   │   ├── authStore.ts           # Session, user, auth state
│   │   ├── gameStore.ts           # Game state, board, turn, result
│   │   └── uiStore.ts             # UI state (loading, errors, modals)
│   ├── lib/                       # Core utilities
│   │   ├── nakama.ts              # Nakama client singleton
│   │   └── constants.ts           # Game constants and config
│   ├── types/                     # TypeScript type definitions
│   │   └── game.ts                # Game state, messages, player types
│   ├── App.tsx                    # Root component with router
│   └── main.tsx                   # Entry point
├── nakama/                        # Server-side code
│   ├── modules/                   # Nakama TypeScript modules
│   │   └── tic-tac-toe.ts         # Match handler + RPCs
│   └── Dockerfile                 # Custom Nakama image with modules
├── docker-compose.yml             # Nakama + PostgreSQL
├── Dockerfile                     # Frontend production build
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .env.example                   # Environment variable template
```

## Step 1: Clone and Install

```bash
git clone <repo-url> lila-tictac
cd lila-tictac
npm install
```

## Step 2: Environment Variables

Copy the example env file and configure:

```bash
cp .env.example .env
```

### `.env.example`

```env
# Nakama Server
VITE_NAKAMA_HOST=127.0.0.1
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_SSL=false
VITE_NAKAMA_SERVER_KEY=defaultkey

# Game Config
VITE_TIMER_SECONDS=30
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | Nakama server host |
| `VITE_NAKAMA_PORT` | `7350` | Nakama HTTP API port |
| `VITE_NAKAMA_SSL` | `false` | Use HTTPS/WSS in production |
| `VITE_NAKAMA_SERVER_KEY` | `defaultkey` | Nakama server key |
| `VITE_TIMER_SECONDS` | `30` | Seconds per move in timed mode |

## Step 3: Start Nakama Server

```bash
docker compose up -d
```

This starts:
- **Nakama** on ports 7349 (GRPC), 7350 (HTTP), 7351 (WebSocket)
- **PostgreSQL** on port 5432 (internal, not exposed to host)

### Verify Nakama is Running

```bash
curl http://127.0.0.1:7350/
```

Expected response:
```json
{"name":"nakama","version":"3.x.x"}
```

### Nakama Developer Console

Open `http://127.0.0.1:7351` in a browser to access the Nakama console (default credentials: `admin` / `password`).

## Step 4: Start Frontend Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Step 5: Verify Everything Works

1. Open `http://localhost:5173` — should see the Auth page
2. Enter a username — should authenticate and redirect to Home
3. Open a second browser/incognito window
4. Both players click "Find Game" — should match and start a game

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `docker compose up -d` | Start Nakama + PostgreSQL |
| `docker compose down` | Stop all containers |
| `docker compose logs -f nakama` | View Nakama server logs |
| `docker compose restart nakama` | Restart Nakama (after module changes) |

## Troubleshooting

### Nakama won't start
- Ensure Docker is running: `docker info`
- Check port conflicts: `lsof -i :7350` and `lsof -i :5432`
- View logs: `docker compose logs nakama`

### Frontend can't connect to Nakama
- Verify Nakama is running: `curl http://127.0.0.1:7350/`
- Check `.env` variables match your Nakama config
- Restart Vite after changing `.env`: `npm run dev`

### Database connection errors
- PostgreSQL needs a few seconds to initialize on first run
- If persistent errors: `docker compose down -v` (deletes data) then `docker compose up -d`

### Nakama module changes not reflected
- Restart Nakama: `docker compose restart nakama`
- Check logs for compilation errors: `docker compose logs -f nakama`
