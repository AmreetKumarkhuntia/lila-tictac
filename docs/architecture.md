# Architecture

## Overview

Multiplayer Tic-Tac-Toe with server-authoritative architecture. All game logic, validation, and state management runs on the Nakama server. The React frontend is a thin client that renders state and sends user input.

## Tech Stack

| Layer            | Technology                     | Purpose                                           |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| Frontend         | React 18 + TypeScript + Vite   | UI, client-side rendering                         |
| Styling          | Tailwind CSS                   | Responsive, mobile-first design                   |
| State Management | Zustand                        | Client-side state (auth, game, UI)                |
| Backend          | Nakama 3.x                     | Server-authoritative game engine                  |
| Database         | PostgreSQL                     | Nakama persistence (users, storage, leaderboards) |
| Runtime          | Nakama TypeScript Runtime (JS) | Custom server logic (match handler, RPCs)         |
| Containerization | Docker + Docker Compose        | Local dev and production deployment               |

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
│  │  - createPrivateMatch                         │ │
│  │  - submitScore                                │ │
│  │  - getLeaderboard                             │ │
│  └──────────────────────────────────────────────┘ │
│                        │                          │
│                        ▼                          │
│  ┌──────────────────────────────────────────────┐ │
│  │            PostgreSQL (Docker)                │ │
│  │  - User accounts                              │ │
│  │  - Storage objects (player stats)             │ │
│  │  - Leaderboard records                        │ │
│  │  - Match state (if persisted)                 │ │
│  └──────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

## Data Flow

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
       ├── Win → set winner, broadcast game_over
       ├── Draw → set draw, broadcast game_over
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
          Create authoritative match
                   │
                   ▼
          Both receive matchmaker_matched event
                   │
                   ▼
          Both join match via matchJoin
                   │
                   ▼
          matchInit runs → empty board created
                   │
                   ▼
          Both players joined → game starts
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

## Client-Server Communication

| Channel    | Protocol         | Purpose                                               |
| ---------- | ---------------- | ----------------------------------------------------- |
| Auth       | HTTP             | Login, session create, token refresh                  |
| Matchmaker | HTTP + WebSocket | Add/cancel ticket, receive matched event              |
| Match      | WebSocket        | Real-time game moves, state updates                   |
| RPC        | HTTP             | Create private match, submit score, fetch leaderboard |
| Storage    | HTTP via RPC     | Read/write player stats                               |

## Ports

| Service          | Port | Purpose                       |
| ---------------- | ---- | ----------------------------- |
| Nakama API       | 7350 | HTTP REST API                 |
| Nakama GRPC      | 7349 | GRPC (internal)               |
| Nakama WebSocket | 7351 | Real-time communication       |
| Frontend (dev)   | 5173 | Vite dev server               |
| PostgreSQL       | 5432 | Database (internal to Docker) |
