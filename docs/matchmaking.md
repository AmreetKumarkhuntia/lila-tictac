# Matchmaking

## Overview

Two ways to start a game:

1. **Quick Play (Matchmaker)** — Automatic pairing via Nakama's built-in matchmaker
2. **Private Game** — Create a match and share the ID for a friend to join

Both modes support **Classic** and **Timed (30s)** game variants.

## Quick Play Flow

```
┌──────────────┐     ┌──────────────┐
│   Player A   │     │   Player B   │
│  "Find Game" │     │  "Find Game" │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
  socket.addMatchmaker  socket.addMatchmaker
  (query: +mode:classic) (query: +mode:classic)
  (properties: mode)     (properties: mode)
       │                     │
       └──────────┬──────────┘
                  ▼
         Nakama pairs tickets
                  │
                  ▼
     matchmakerMatched callback fires
     (server-side: creates match with mode)
                  │
                  ▼
     matchmaker_matched event fires
     on both clients
                  │
                  ▼
     Both call socket.joinMatch(matchId)
                  │
                  ▼
     matchJoin assigns X and O
                  │
                  ▼
     GAME_START broadcast (per-player, with assignedSymbol)
                  │
                  ▼
     Game begins
```

### Implementation

**Client side:**

```typescript
const ticket = await socket.addMatchmaker(
  "+properties.mode:classic", // query — only match with same mode
  2, // minCount
  2, // maxCount
  { mode: "classic" }, // stringProperties
);

socket.onmatchmakermatched = (matched: MatchmakerMatched) => {
  const matchId = matched.matchId;
  await socket.joinMatch(matchId);
  navigate(`/game/${matchId}`);
};
```

**Server side (matchmakerMatched callback):**

```typescript
function matchmakerMatched(ctx, logger, nk, matches): string {
  const mode = matches[0].properties.mode || "classic";
  const matchId = nk.matchCreate("tic-tac-toe", { mode });
  return matchId;
}
```

Registered in `InitModule`. Extracts mode from matched users' properties, creates the match, returns the ID.

### Matchmaker Properties

| Property   | Value                      | Description               |
| ---------- | -------------------------- | ------------------------- |
| `mode`     | `"classic"` or `"timed"`   | Game mode selection       |
| `minCount` | `2`                        | Exactly 2 players needed  |
| `maxCount` | `2`                        | No more than 2            |
| `query`    | `+properties.mode:classic` | Only match with same mode |

### Mode Selection

On the Home page, a `TabGroup` selector offers two modes:

- **Classic** → matchmaker with `mode: "classic"`
- **Timed (30s)** → matchmaker with `mode: "timed"`

Players are only matched with others who selected the same mode.

### Cancel Matchmaking

```typescript
await socket.removeMatchmaker(ticket);
```

## Private Game Flow

```
┌──────────────┐                    ┌──────────────┐
│   Player A   │                    │   Player B   │
│ "Create Room"│                    │  "Join Room" │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       ▼                                   │
  RPC: create_private_match                 │
  { mode: "classic" }                       │
       │                                   │
       ▼                                   │
  Returns: matchId                          │
       │                                   │
       ▼                                   │
  Display matchId (copy button)             │
       │                                   │
       └────── matchId shared ─────────────┘
                                            │
                                            ▼
                                   Enter matchId
                                            │
                                            ▼
                                   socket.joinMatch(matchId)
                                            │
                                            ▼
                                   matchJoin assigns X/O
                                            │
                                            ▼
                                   GAME_START → game begins
```

### Implementation

**Create private match (RPC):**

```typescript
const response = await client.rpc(session, "create_private_match", {
  mode: "classic", // or "timed"
});
const matchId = JSON.parse(response.payload).matchId;
```

**Join private match:**

```typescript
const match = await socket.joinMatch(matchId);
```

The private match modal supports both creating and joining via a tabbed interface (`PrivateMatchModal.tsx`). The created match ID is displayed with a copy-to-clipboard button.

## Match States

```
                 ┌─────────┐
     createMatch │ CREATED │
                 └────┬────┘
                      │
                 ┌────▼────┐
    1st player   │ WAITING │ ← matchJoinAttempt accepted
    joins        └────┬────┘
                      │
                 ┌────▼────┐
    2nd player   │ PLAYING │ ← GAME_START broadcast
    joins        └────┬────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐   ┌────▼───┐   ┌────▼────┐
   │  WIN   │   │  DRAW  │   │ FORFEIT │ ← disconnect grace period expired
   └────┬───┘   └────┬───┘   └────┬────┘
        │             │             │
        │        ┌────▼────┐        │
        │        │ TIMEOUT │        │ ← timed mode only
        │        └────┬────┘        │
        │             │             │
        └─────────────┼─────────────┘
                      │
                 ┌────▼─────┐
                 │ FINISHED │ → submitMatchResult() → stats + leaderboard updated
                 └────┬─────┘
                      │
                 match destroyed after both leave
```

## Disconnect Handling

### Player Disconnects Mid-Game

1. `matchLeave` fires on the server
2. Server stores `DisconnectedPlayer` record with current tick
3. Remaining player receives `OP_OPPONENT_LEFT` with `reason: "disconnected_temporary"`
4. **15-second grace period** begins (the game continues running)
5. Remaining player sees "Opponent disconnected" indicator
6. After 15 seconds without reconnect:
   - Disconnected player forfeits
   - `GAME_OVER` broadcast with `reason: "forfeit"`
   - Stats and leaderboard updated

### Player Disconnects During Matchmaking

1. Nakama automatically removes the matchmaker ticket
2. No action needed — the other player (if any) simply continues waiting

### Both Players Disconnect

If both players disconnect simultaneously:

1. The second `matchLeave` detects `state.disconnected` is already set
2. Disconnect record is cleared (no winner declared)
3. Match returns `null` on next tick → destroyed

## Reconnection

When a player briefly loses connection (page refresh, network blip):

### Client-Side Resilience

1. **Match ID persistence:** Active match ID is saved to `sessionStorage` via `persistMatchId()`
2. **Session persistence:** Auth tokens stored in `localStorage`, auto-restored on reload
3. **Connection monitoring:** `useConnectionStatus` hook listens for browser `online`/`offline` events
4. **Auto-reconnect:** On browser `online` event, re-establishes Nakama WebSocket

### Reconnection Flow

1. Player reconnects → page reloads → `SessionRestore` component restores auth
2. `GamePage` reads `matchId` from URL params
3. `socket.joinMatch(matchId)` is called
4. Server `matchJoinAttempt` detects reconnection via `state.disconnected.userId`
5. Server `matchJoin`:
   - Restores presence and clears disconnect record
   - Sends `OP_GAME_START` to reconnecting player (full state: board, timers, assigned symbol)
   - Broadcasts `OP_STATE_UPDATE` to all
   - Sends `OP_OPPONENT_RECONNECTED` to the opponent
6. Game resumes from where it left off

### Grace Period Details

| Setting                | Value                                             |
| ---------------------- | ------------------------------------------------- |
| Grace duration         | 15 seconds (`RECONNECT_GRACE_SECONDS`)            |
| Tick rate during grace | Same as game mode (10 tps timed, 5 tps classic)   |
| Timer behavior         | Timers continue counting down during grace period |
| After grace expires    | Disconnected player forfeits, opponent wins       |

### Match Not Found

If the match has already been destroyed (both players left, or server restart):

```typescript
try {
  await socket.joinMatch(matchId);
} catch {
  clearPersistedMatchId();
  navigate("/home");
  addToast("Match no longer exists", "error");
}
```

## Cleanup

- Matches are destroyed when all players leave (`presenceMap` empty)
- Finished matches stay alive until both players leave (allows viewing results)
- `matchTerminate` broadcasts termination message before destruction
- Server handles orphaned match cleanup on restart
