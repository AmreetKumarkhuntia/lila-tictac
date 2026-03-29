# Architecture

## Overview

Multiplayer Tic-Tac-Toe with server-authoritative architecture. All game logic, validation, and state management runs on the Nakama server. The React frontend is a thin client that renders state and sends user input.

## Tech Stack

| Layer            | Technology                     | Purpose                                           |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| Frontend         | React 19 + TypeScript + Vite   | UI, client-side rendering                         |
| Styling          | Tailwind CSS 4                 | Responsive, mobile-first design                   |
| State Management | Zustand 5                      | Client-side state (auth, game, UI)                |
| Real-time        | Nakama JS SDK (WebSocket)      | Live game moves, matchmaking events               |
| Backend          | Nakama 3.x                     | Server-authoritative game engine                  |
| Database         | PostgreSQL                     | Nakama persistence (users, storage, leaderboards) |
| Server Runtime   | Nakama TypeScript Runtime (JS) | Custom server logic (match handler, RPCs)         |
| Containerization | Docker + Docker Compose        | Local dev and production deployment               |
| CI/CD            | GitHub Actions                 | Lint, typecheck, Docker image publishing to GHCR  |

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────────────────────────────────────┐ │
│  │           React Frontend                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Zustand  │ │ React    │ │ Nakama JS    │ │ │
│  │  │ Stores   │ │ Router   │ │ Client SDK   │ │ │
│  │  └──────────┘ └──────────┘ └──────┬───────┘ │ │
│  └────────────────────────────────────┼─────────┘ │
└───────────────────────────────────────┼───────────┘
                                        │ WebSocket + HTTP
                                        ▼
┌───────────────────────────────────────────────────┐
│              Nakama Server (Docker)                │
│  ┌──────────────────────────────────────────────┐ │
│  │         Authoritative Match Handler           │ │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐ │ │
│  │  │ Game     │ │ Move      │ │ Win/Draw     │ │ │
│  │  │ State    │ │ Validation│ │ Detection    │ │ │
│  │  └──────────┘ └───────────┘ └──────────────┘ │ │
│  ├──────────────────────────────────────────────┤ │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐ │ │
│  │  │ Auth     │ │ Matchmaker│ │ Leaderboard  │ │ │
│  │  │ Module   │ │ Module    │ │ Module       │ │ │
│  │  └──────────┘ └───────────┘ └──────────────┘ │ │
│  ├──────────────────────────────────────────────┤ │
│  │              RPC Functions                    │ │
│  │  - create_private_match                       │ │
│  │  - submit_score (legacy, auto-submitted)      │ │
│  │  - get_player_stats                           │ │
│  └──────────────────────────────────────────────┘ │
│                        │                          │
│                        ▼                          │
│  ┌──────────────────────────────────────────────┐ │
│  │            PostgreSQL (Docker)                │ │
│  │  - User accounts (email/password)             │ │
│  │  - Storage objects (player stats)             │ │
│  │  - Leaderboard records                        │ │
│  │  - Session tokens                             │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow

```
User enters email + password
        │
        ▼
Frontend calls nakamaClient.authenticateEmail()
        │
        ├── New user (create=true) → Register → Session created
        │
        ├── Existing user (create=false) → Login → Session created
        │
        ▼
Session stored in Zustand authStore + localStorage
        │
        ▼
On next app load: restoreSession() reads localStorage,
checks expiry, refreshes if needed
```

### Game Move Flow

```
Player A clicks cell
       │
       ▼
Frontend sends match data message { op: 1, data: { row, col } }
       │
       ▼
Nakama matchLoop receives message
       │
       ▼
Validate move:
  - Is it this player's turn?
  - Is the cell empty?
  - Is the game still in progress?
       │
       ├── Invalid → send error message to Player A only
       │
       ▼ Valid
Update game state (board, currentPlayer, moveCount)
       │
       ▼
Check for win/draw
       │
       ├── Win → set winner, broadcast game_over, submit scores
       ├── Draw → set draw, broadcast game_over, submit scores
       │
       ▼ Game continues
Broadcast updated state to ALL players in match
       │
       ▼
Both clients receive state_update → UI re-renders
```

### Matchmaking Flow

```
Player A clicks "Find Game"        Player B clicks "Find Game"
       │                                   │
       ▼                                   ▼
Add matchmaker ticket               Add matchmaker ticket
(query: +properties.mode:classic)   (query: +properties.mode:classic)
       │                                   │
       └───────────┬───────────────────────┘
                   ▼
          Nakama Matchmaker pairs them
                   │
                   ▼
          matchmakerMatched callback fires
                   │
                   ▼
          Create authoritative match with mode
                   │
                   ▼
          Both receive matchmaker_matched event
                   │
                   ▼
          Both join match via matchJoin
                   │
                   ▼
          matchJoin assigns X/O → both receive GAME_START
                   │
                   ▼
          Game begins
```

### Disconnect & Reconnection Flow

```
Player A disconnects mid-game
       │
       ▼
matchLeave fires for Player A
       │
       ▼
Store DisconnectedPlayer record with current tick
       │
       ▼
Broadcast OPPONENT_LEFT to Player B (reason: "disconnected_temporary")
       │
       ▼
matchLoop checks each tick: elapsed time < 15s grace period?
       │
       ├── Player A reconnects within 15s
       │       │
       │       ▼
       │   matchJoin detects reconnection
       │       │
       │       ▼
       │   Restore presenceMap, clear disconnected record
       │   Send GAME_START to reconnecting player (state sync)
       │   Broadcast STATE_UPDATE to all
       │   Send OPPONENT_RECONNECTED to opponent
       │       │
       │       ▼
       │   Game resumes normally
       │
       └── 15s elapsed without reconnect
               │
               ▼
           Forfeit: disconnected player loses
           Winner = opponent
           submitMatchResult() → update stats + leaderboard
           Broadcast GAME_OVER (reason: "forfeit")
```

### Score & Leaderboard Flow

```
Game ends (win/draw/timeout/forfeit)
       │
       ▼
Server calls submitMatchResult()
       │
       ▼
Read both players' current stats from Nakama Storage
(collection: "player_stats", key: "summary")
       │
       ▼
Update stats based on result:
  - Winner: wins++, currentStreak++, bestStreak updated, score += 3
  - Loser: losses++, currentStreak = 0, score += 0
  - Draw:  draws++, currentStreak = 0, score += 1 (both)
       │
       ▼
Write updated stats to Storage (per player)
       │
       ▼
Write leaderboard records (score + metadata: wins, gamesPlayed, winRate)
       │
       ▼
Clients fetch updated stats via get_player_stats RPC + leaderboard API
```

## Key Design Decisions

### Why Server-Authoritative?

- **Anti-cheat:** All validation happens server-side. Clients cannot manipulate game state, skip turns, or make illegal moves.
- **Consistency:** Both players always see the same state. No desync issues.
- **Single source of truth:** The server is the authority. Clients are stateless renderers.

### Why Nakama?

- Built-in matchmaker, leaderboards, authentication, and storage.
- Authoritative match system with TypeScript runtime for custom game logic.
- WebSocket support for real-time communication.
- Production-grade, used by game studios at scale.

### Why Zustand over Redux/Context?

- Minimal boilerplate, TypeScript-first.
- No providers or wrappers needed.
- Performant: selective subscriptions prevent unnecessary re-renders.
- Sufficient for this app's state complexity.

### Why Authoritative Matches (not Relayed)?

Nakama supports two match types:

- **Relayed:** Server passes messages between clients. No server-side logic.
- **Authoritative:** Server runs a match handler with full game loop. Server owns all state.

We use **authoritative** because the requirement explicitly states server-side validation and state management.

### Why Shared WebSocket Singleton?

The matchmaker and match both need a WebSocket connection. Creating separate connections would:

- Waste resources
- Cause race conditions during matchmaker → match transition
- Require complex coordination

Instead, `lib/nakama.ts` creates one shared socket with promise deduplication — all callers share the same connection.

### Why Client-Side Timer Interpolation?

Server timer updates arrive every ~100ms (timed mode at 10 tps). If we only displayed server values, the timer would appear jumpy. Instead, the client interpolates locally between server updates, providing smooth countdown while still being anchored to the authoritative server time.

## Client-Server Communication

| Channel    | Protocol         | Purpose                                         |
| ---------- | ---------------- | ----------------------------------------------- |
| Auth       | HTTP             | Email/password login, register, session refresh |
| Matchmaker | HTTP + WebSocket | Add/cancel ticket, receive matched event        |
| Match      | WebSocket        | Real-time game moves, state updates             |
| RPC        | HTTP             | Create private match, fetch player stats        |
| Storage    | HTTP via Nakama  | Read/write player stats (server-side only)      |

## Ports

| Service           | Port | Purpose                       |
| ----------------- | ---- | ----------------------------- |
| Nakama API        | 7350 | HTTP REST API                 |
| Nakama GRPC       | 7349 | GRPC (internal)               |
| Nakama WebSocket  | 7351 | Real-time communication       |
| Frontend (dev)    | 5173 | Vite dev server               |
| Frontend (Docker) | 3000 | Nginx production serve        |
| PostgreSQL        | 5432 | Database (internal to Docker) |
