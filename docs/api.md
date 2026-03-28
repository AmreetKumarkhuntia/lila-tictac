# API Reference

## Authentication

### Device ID Login

```typescript
// Auto-generate or retrieve device ID from localStorage
const deviceId = localStorage.getItem("deviceId") || generateUUID();
localStorage.setItem("deviceId", deviceId);

const session = await client.authenticateDevice(deviceId, {
  username: username,
  create: true,
});
```

### Session Refresh

```typescript
if (session.isexpired(Date.now() / 1000)) {
  session = await client.sessionRefresh(session);
}
```

### Session Persistence

```typescript
// Save
localStorage.setItem("nakamaSession", session.token);
localStorage.setItem("deviceId", deviceId);

// Restore
const token = localStorage.getItem("nakamaSession");
const session = Session.restore(token);
```

---

## RPC Functions

### `create_private_match`

Creates a new authoritative match and returns the match ID.

**Request:**
```json
{
  "mode": "classic"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | Yes | `"classic"` or `"timed"` |

**Response:**
```json
{
  "matchId": "match-uuid-here"
}
```

**Server Implementation:**
```typescript
function createPrivateMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, payload: string): string {
  const params = JSON.parse(payload);
  const matchId = nk.matchCreate("tic-tac-toe", { mode: params.mode });
  return JSON.stringify({ matchId });
}
```

### `submit_score`

Called when a match ends. Updates leaderboard and player stats.

**Request:**
```json
{
  "matchId": "match-uuid",
  "winner": "X",
  "playerX": "user_id_a",
  "playerO": "user_id_b",
  "mode": "classic"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `matchId` | string | Yes | Completed match ID (for idempotency) |
| `winner` | string | Yes | `"X"`, `"O"`, or `"draw"` |
| `playerX` | string | Yes | User ID of player X |
| `playerO` | string | Yes | User ID of player O |
| `mode` | string | Yes | Game mode |

**Response:**
```json
{
  "success": true
}
```

**Scoring:**
- Win: +3 points on leaderboard
- Draw: +1 point each
- Loss: +0 points

**Stats Updated (in Nakama Storage):**
- `wins`, `losses`, `draws`, `gamesPlayed`
- `currentStreak`, `bestStreak`

### `get_player_stats`

Fetches the current player's cumulative stats.

**Request:**
```json
{}
```

**Response:**
```json
{
  "wins": 5,
  "losses": 3,
  "draws": 1,
  "gamesPlayed": 9,
  "currentStreak": 2,
  "bestStreak": 4,
  "winRate": 55.6
}
```

---

## Match Messages

### Client → Server

#### Op Code 1: MOVE

Player makes a move on the board.

```json
{
  "row": 1,
  "col": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `row` | number | Yes | Row index (0-2) |
| `col` | number | Yes | Column index (0-2) |

### Server → Client

#### Op Code 10: STATE_UPDATE

Full state broadcast after every valid move or on initial join.

```json
{
  "board": [["", "X", ""], ["O", "", ""], ["", "", "X"]],
  "currentPlayer": "O",
  "moveCount": 3,
  "status": "playing",
  "timers": {
    "X": 22.5,
    "O": 30.0,
    "timeLimit": 30
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `board` | `string[][]` | 3x3 grid of "", "X", "O" |
| `currentPlayer` | `string` | "X" or "O" — whose turn it is |
| `moveCount` | `number` | Total moves made so far |
| `status` | `string` | "waiting", "playing", "finished" |
| `timers` | `object/null` | Timer state (timed mode only) |

#### Op Code 11: GAME_START

Sent when the second player joins and the game begins.

```json
{
  "players": {
    "X": { "userId": "abc", "username": "Alice" },
    "O": { "userId": "def", "username": "Bob" }
  },
  "mode": "classic",
  "assignedSymbol": "X"
}
```

#### Op Code 12: GAME_OVER

Sent when the game ends (win, draw, or timeout).

```json
{
  "winner": "X",
  "board": [["O", "X", ""], ["O", "X", ""], ["", "X", "O"]],
  "winningLine": [[0, 1], [1, 1], [2, 1]],
  "reason": "win"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `winner` | `string` | "X", "O", or "draw" |
| `board` | `string[][]` | Final board state |
| `winningLine` | `array/null` | 3 cell coordinates if win, null if draw |
| `reason` | `string` | "win", "draw", "timeout", "forfeit" |

#### Op Code 13: ERROR

Sent to a specific player when their move is invalid.

```json
{
  "message": "It is not your turn"
}
```

#### Op Code 14: OPPONENT_LEFT

Sent to the remaining player when opponent disconnects.

```json
{
  "winner": "O",
  "reason": "disconnect"
}
```

#### Op Code 15: MATCH_TERMINATED

Sent to all players when the server terminates the match.

```json
{}
```

---

## Matchmaker API

### Add Matchmaker Ticket

```typescript
const matchmakerTicket = await socket.addMatchmaker(
  session,
  "+properties.mode:classic",
  2,    // minCount
  2,    // maxCount
  { mode: "classic" }  // stringProperties
);
```

### Receive Match

```typescript
socket.onmatchmakermatched = (matched) => {
  const matchId = matched.matchId;
  const opponents = matched.users;
  // Join the match
};
```

### Cancel Matchmaker

```typescript
await socket.removeMatchmaker(session, matchmakerTicket.ticket);
```

---

## Leaderboard API

### List Leaderboard Records

```typescript
const records = await client.listLeaderboardRecords(
  session,
  "tic-tac-toe-wins",
  null,   // ownerIds (null = all)
  50,     // limit
  null,   // cursor
  null    // expiry
);
```

**Record Structure:**
```json
{
  "ownerId": "user_id",
  "username": "Alice",
  "score": 24,
  "numScore": 8,
  "metadata": {
    "wins": 8,
    "gamesPlayed": 15,
    "winRate": 53.3
  }
}
```

### Submit Score (via RPC)

Handled by `submit_score` RPC (see above). Internally calls:

```typescript
nk.leaderboardRecordWrite("tic-tac-toe-wins", userId, username, score, 0, metadata);
```

### Get Player's Rank

```typescript
const records = await client.listLeaderboardRecordsAroundOwner(
  session,
  "tic-tac-toe-wins",
  userId,
  5  // records above and below
);
```

---

## Storage API

### Player Stats Object

**Collection:** `player_stats`
**Key:** `summary`
**Owner:** (player's user ID)

```json
{
  "wins": 5,
  "losses": 3,
  "draws": 1,
  "gamesPlayed": 9,
  "currentStreak": 2,
  "bestStreak": 4,
  "lastMatchAt": 1700000000
}
```

### Read Stats (via RPC `get_player_stats`)

```typescript
const objects = nk.storageRead([{
  collection: "player_stats",
  key: "summary",
  userId: userId
}]);
```

### Write Stats (internal, called from `submit_score`)

```typescript
nk.storageWrite([{
  collection: "player_stats",
  key: "summary",
  userId: userId,
  value: JSON.stringify(stats)
}]);
```

---

## Nakama Server Configuration

### Leaderboard Setup (on server init)

```typescript
function initMatch(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama) {
  // Create leaderboard if it doesn't exist
  try {
    nk.leaderboardCreate("tic-tac-toe-wins", true, "desc", "incr", 0, "");
  } catch (e) {
    // Already exists, ignore
  }
}
```

### RPC Registration

```typescript
function initModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama) {
  nk.registerRpc("create_private_match", createPrivateMatch);
  nk.registerRpc("submit_score", submitScore);
  nk.registerRpc("get_player_stats", getPlayerStats);
  nk.registerMatch("tic-tac-toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLoop,
    matchLeave,
    matchTerminate,
  });
  nk.registerInit(initMatch);
}
```
