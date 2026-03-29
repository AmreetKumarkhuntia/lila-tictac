# Matchmaking

## Overview

Two ways to start a game:

1. **Quick Play (Matchmaker)** — Automatic pairing via Nakama's built-in matchmaker
2. **Private Game** — Create a match and share the ID for a friend to join

## Quick Play Flow

```
┌──────────────┐     ┌──────────────┐
│   Player A   │     │   Player B   │
│  "Find Game" │     │  "Find Game" │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
  nakama.addMatchmaker  nakama.addMatchmaker
  (query: +mode:classic) (query: +mode:classic)
       │                     │
       └──────────┬──────────┘
                  ▼
         Nakama pairs tickets
                  │
                  ▼
     matchmaker_matched event fires
     on both clients
                  │
                  ▼
     Both call nakama.joinMatch(matchId)
                  │
                  ▼
     matchJoin assigns X and O
                  │
                  ▼
     game_start broadcast → game begins
```

### Implementation Steps

1. **Add matchmaker ticket**

   ```typescript
   const ticket = await client.addMatchmaker(session, {
     query: "+properties.mode:classic",
     minCount: 2,
     maxCount: 2,
     stringProperties: { mode: "classic" },
   });
   ```

2. **Listen for matchmaker match**

   ```typescript
   socket.onmatchmakermatched = (matched) => {
     const matchId = matched.matchId;
     // Join the match
     const match = await socket.joinMatch(matchId);
   };
   ```

3. **Cancel matchmaking**
   ```typescript
   await client.removeMatchmaker(session, ticket.ticket);
   ```

### Matchmaker Properties

| Property   | Value                      | Description               |
| ---------- | -------------------------- | ------------------------- |
| `mode`     | `"classic"` or `"timed"`   | Game mode selection       |
| `minCount` | `2`                        | Exactly 2 players needed  |
| `maxCount` | `2`                        | No more than 2            |
| `query`    | `+properties.mode:classic` | Only match with same mode |

### Mode Selection

On the Home page, two buttons:

- **Classic** → matchmaker with `mode: "classic"`
- **Timed (30s)** → matchmaker with `mode: "timed"`

Players are only matched with others who selected the same mode.

## Private Game Flow

```
┌──────────────┐                    ┌──────────────┐
│   Player A   │                    │   Player B   │
│ "Create Room"│                    │  "Join Room" │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       ▼                                   │
  RPC: createPrivateMatch()                │
       │                                   │
       ▼                                   │
  Returns: matchId                         │
       │                                   │
       ▼                                   │
  Display matchId to share                 │
  (copy to clipboard)                      │
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
                                  matchJoin → game starts
```

### Implementation

**Create private match (RPC):**

```typescript
const response = await client.rpc(session, "create_private_match", {
  mode: "classic", // or "timed"
});
const matchId = response.payload.matchId;
```

**Join private match:**

```typescript
const match = await socket.joinMatch(matchId);
```

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
    2nd player   │ PLAYING │ ← game_start broadcast
    joins        └────┬────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐   ┌────▼───┐   ┌────▼────┐
   │  WIN   │   │  DRAW  │   │ FORFEIT │
   └────┬───┘   └────┬───┘   └────┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                 ┌────▼─────┐
                 │ FINISHED │ → match destroyed after both leave
                 └──────────┘
```

## Disconnect Handling

### Player Disconnects Mid-Game

1. `matchLeave` fires on the server
2. Server sets `status: "finished"`, `winner: opponent`
3. Remaining player receives `OPPONENT_LEFT` message
4. Remaining player sees "Opponent disconnected — You win!" overlay
5. Score is submitted to leaderboard

### Player Disconnects During Matchmaking

1. Nakama automatically removes the matchmaker ticket
2. No action needed — the other player (if any) simply continues waiting

### Reconnection

If a player briefly loses connection (page refresh, network blip):

1. Nakama maintains the match and player presence for a grace period
2. On page reload, the client:
   - Restores session from localStorage
   - Checks for active matches via `socket.listSubscriptions()` or stored match ID
   - Reconnects via `socket.joinMatch(matchId)`
3. Server sends current state to the reconnecting player
4. Game resumes from where it left off

For timed mode:

- Timer pauses during reconnect window (up to 10 seconds)
- If player doesn't reconnect within 10 seconds → auto-forfeit

### Implementation for Reconnect

```typescript
// On app load
const savedMatchId = localStorage.getItem("activeMatchId");
if (savedMatchId && session) {
  try {
    const match = await socket.joinMatch(savedMatchId);
    // Restore game state from match state
  } catch {
    // Match no longer exists
    localStorage.removeItem("activeMatchId");
  }
}
```

## Cleanup

- Matches are destroyed when both players leave
- Stale matches (no players, game finished) auto-terminated after 60 seconds
- Nakama handles orphaned match cleanup on server restart
