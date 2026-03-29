# API Reference

## Authentication

### Register

```ts
const session = await client.authenticateEmail({
  email: "user@example.com",
  password: "password123",
  username: "player1",
  create: true,
});
```

Creates a new account and returns a session. Requires email, password (min 8 chars), and username (3-20 chars, alphanumeric + underscore).

### Login

```ts
const session = await client.authenticateEmail({
  email: "user@example.com",
  password: "password123",
  create: false,
});
```

Authenticates an existing user. Returns a session with auth and refresh tokens.

### Session Refresh

```ts
const session = await client.sessionRefresh(session);
```

Called automatically by `authStore.restoreSession()` when the auth token is expired but the refresh token is still valid.

### Session Persistence

Sessions are stored in `localStorage` under key `"tictactoeKey"`:

```ts
interface StoredAuth {
  authToken: string;
  refreshToken: string;
  username: string;
}
```

On app load, `restoreSession()` reads stored tokens, checks expiry, and refreshes if needed.

---

## RPC Functions

### `create_private_match`

Creates an authoritative match and returns the match ID.

```ts
const result = await client.rpc(session, "create_private_match", {
  mode: "classic", // or "timed"
});
// result.payload = { matchId: "tic-tac-toe.matchId..." }
```

| Parameter | Type                   | Default     | Description             |
| --------- | ---------------------- | ----------- | ----------------------- |
| `mode`    | `"classic" \| "timed"` | `"classic"` | Game mode for the match |

**Response:**

```json
{ "matchId": "tic-tac-toe.<uuid>" }
```

### `submit_score`

> **Note:** This RPC is now a legacy no-op. Scores are auto-submitted server-side by `submitMatchResult()` after every game. The function still exists for backward compatibility and returns `{ success: true, message: "Scores are auto-submitted by the server" }`.

### `get_player_stats`

Returns the calling player's cumulative stats.

```ts
const result = await client.rpc(session, "get_player_stats");
```

**Response:**

```json
{
  "wins": 5,
  "losses": 2,
  "draws": 1,
  "gamesPlayed": 8,
  "currentStreak": 3,
  "bestStreak": 4,
  "winRate": 62.5
}
```

| Field           | Type   | Description                           |
| --------------- | ------ | ------------------------------------- |
| `wins`          | number | Total wins                            |
| `losses`        | number | Total losses                          |
| `draws`         | number | Total draws                           |
| `gamesPlayed`   | number | Total games completed                 |
| `currentStreak` | number | Current consecutive win streak        |
| `bestStreak`    | number | All-time best win streak              |
| `winRate`       | number | Win percentage (rounded to 1 decimal) |

---

## Match Messages

### Client → Server

#### Op Code 1: MOVE

Player attempts to place their symbol at a board position.

```json
{ "row": 0, "col": 1 }
```

| Field | Type   | Range | Description             |
| ----- | ------ | ----- | ----------------------- |
| `row` | number | 0-2   | Row index (0 = top)     |
| `col` | number | 0-2   | Column index (0 = left) |

### Server → Client

#### Op Code 10: STATE_UPDATE

Broadcast to all players after every move or state change.

```json
{
  "board": [
    ["X", "", ""],
    ["", "O", ""],
    ["", "", "X"]
  ],
  "currentPlayer": "O",
  "moveCount": 3,
  "status": "playing",
  "timers": { "X": 28.5, "O": 30, "timeLimit": 30 },
  "opponentDisconnected": false
}
```

| Field                  | Type                                   | Description                                         |
| ---------------------- | -------------------------------------- | --------------------------------------------------- |
| `board`                | `string[][]`                           | 3x3 grid. Values: `""`, `"X"`, `"O"`                |
| `currentPlayer`        | `"X" \| "O"`                           | Whose turn it is                                    |
| `moveCount`            | number                                 | Total moves made (0-9)                              |
| `status`               | `"waiting" \| "playing" \| "finished"` | Game phase                                          |
| `timers`               | `object \| null`                       | Per-player remaining seconds (null in classic mode) |
| `timers.X`             | number                                 | Player X's remaining time                           |
| `timers.O`             | number                                 | Player O's remaining time                           |
| `timers.timeLimit`     | number                                 | Configured time limit (30s)                         |
| `opponentDisconnected` | `boolean`                              | Whether opponent is currently disconnected          |

#### Op Code 11: GAME_START

Sent individually to each player when the game begins (both players have joined). Contains the player's assigned symbol.

```json
{
  "players": {
    "X": { "userId": "abc123", "username": "Player1" },
    "O": { "userId": "def456", "username": "Player2" }
  },
  "mode": "classic",
  "assignedSymbol": "X"
}
```

| Field                     | Type                   | Description                   |
| ------------------------- | ---------------------- | ----------------------------- |
| `players`                 | `object`               | Map of symbol to player info  |
| `players.X` / `players.O` | `object`               | `{ userId, username }`        |
| `mode`                    | `"classic" \| "timed"` | Game mode                     |
| `assignedSymbol`          | `"X" \| "O"`           | The receiving player's symbol |

#### Op Code 12: GAME_OVER

Broadcast to all players when the game ends.

```json
{
  "winner": "X",
  "board": [
    ["X", "O", ""],
    ["", "X", ""],
    ["", "O", "X"]
  ],
  "winningLine": [
    [0, 0],
    [1, 1],
    [2, 2]
  ],
  "reason": "win"
}
```

| Field         | Type                                        | Description                                              |
| ------------- | ------------------------------------------- | -------------------------------------------------------- |
| `winner`      | `"" \| "X" \| "O" \| "draw"`                | Winner symbol, `"draw"` if tie, `""` if match terminated |
| `board`       | `string[][]`                                | Final board state                                        |
| `winningLine` | `[number, number][] \| null`                | Winning cell coordinates, or null for draw/forfeit       |
| `reason`      | `"win" \| "draw" \| "timeout" \| "forfeit"` | Why the game ended                                       |

#### Op Code 13: ERROR

Sent to a single player when their move is rejected.

```json
{ "message": "Not your turn" }
```

Common error messages:

| Message                        | Cause                                      |
| ------------------------------ | ------------------------------------------ |
| `"Game not in progress"`       | Game hasn't started or is already finished |
| `"Not a player in this match"` | Sender is not recognized as X or O         |
| `"Not your turn"`              | It's the other player's turn               |
| `"Invalid row/col"`            | Row or column out of range [0,2]           |
| `"Cell already occupied"`      | Target cell is not empty                   |

#### Op Code 14: OPPONENT_LEFT

Sent to the remaining player when their opponent disconnects.

```json
{ "winner": "", "reason": "disconnected_temporary" }
```

| Field    | Type                       | Description                                 |
| -------- | -------------------------- | ------------------------------------------- |
| `winner` | `""`                       | Empty — game is NOT over yet (grace period) |
| `reason` | `"disconnected_temporary"` | Opponent has 15 seconds to reconnect        |

If the opponent doesn't reconnect within 15 seconds, a separate `GAME_OVER` message is sent with `reason: "forfeit"`.

#### Op Code 15: MATCH_TERMINATED

Sent when the server terminates the match (e.g., both players disconnect).

```json
{}
```

Empty payload. Clients should redirect to the home screen.

#### Op Code 16: OPPONENT_RECONNECTED

Sent to the remaining player when their opponent reconnects within the grace period.

```json
{ "reconnectedSymbol": "O" }
```

| Field               | Type         | Description              |
| ------------------- | ------------ | ------------------------ |
| `reconnectedSymbol` | `"X" \| "O"` | Which symbol reconnected |

Followed by a `STATE_UPDATE` with the current game state.

---

## Matchmaker API

### Add Matchmaker Ticket

```ts
const ticket = await socket.addMatchmaker(
  "+properties.mode:classic", // query string
  2, // minCount
  2, // maxCount
  { mode: "classic" }, // stringProperties
);
```

| Parameter          | Value                                                      | Description                  |
| ------------------ | ---------------------------------------------------------- | ---------------------------- |
| `query`            | `"+properties.mode:classic"` or `"+properties.mode:timed"` | Ensures mode-matched pairing |
| `minCount`         | `2`                                                        | Minimum players per match    |
| `maxCount`         | `2`                                                        | Maximum players per match    |
| `stringProperties` | `{ mode: "classic" }`                                      | Mode property for filtering  |

### Matchmaker Matched Event

```ts
socket.onmatchmakermatched = (matched: MatchmakerMatched) => {
  // matched contains ticket, token, users
  // Server creates match via matchmakerMatched callback
  // Client joins the match
};
```

### Cancel Matchmaker Ticket

```ts
await socket.removeMatchmaker(ticket);
```

### Server-side: matchmakerMatched Callback

Registered in `InitModule`. When Nakama matches players:

1. Extracts `mode` from matched users' string properties
2. Creates a new `"tic-tac-toe"` match with that mode
3. Returns the `matchId` — Nakama routes players to the match automatically

---

## Leaderboard API

### Leaderboard Configuration

- **ID:** `tic-tac-toe-wins`
- **Sort:** Descending (highest score first)
- **Operator:** Incremental (scores accumulate across matches)
- **Created:** On module init (idempotent)

### Scoring

| Outcome | Points |
| ------- | ------ |
| Win     | +3     |
| Draw    | +1     |
| Loss    | +0     |

### Leaderboard Record Structure

```json
{
  "ownerId": "user_uuid",
  "username": "player1",
  "score": 15,
  "rank": 1,
  "metadata": {
    "wins": 5,
    "gamesPlayed": 8,
    "winRate": 62.5
  }
}
```

### Fetch Global Leaderboard

```ts
const records = await client.listLeaderboardRecords(
  session,
  "tic-tac-toe-wins",
  undefined, // ownerIds
  50, // limit
  undefined, // cursor
  undefined, // expiry
);
```

### Fetch Records Around Current Player

```ts
const records = await client.listLeaderboardRecordsAroundOwner(
  session,
  "tic-tac-toe-wins",
  session.userId,
  10, // limit (5 above + 5 below)
);
```

---

## Storage API

Player stats are stored in Nakama Storage. Written exclusively by the server.

### Storage Path

| Field      | Value            |
| ---------- | ---------------- |
| Collection | `"player_stats"` |
| Key        | `"summary"`      |
| User       | Per-player       |

### Permissions

| Permission | Value             |
| ---------- | ----------------- |
| Read       | `2` (public)      |
| Write      | `0` (server-only) |

### Stats Object

```json
{
  "wins": 5,
  "losses": 2,
  "draws": 1,
  "gamesPlayed": 8,
  "currentStreak": 3,
  "bestStreak": 4,
  "lastMatchAt": 1711843200
}
```

---

## Nakama Server Configuration

Configured in `nakama/local.yml`:

```yaml
logger:
  level: "INFO"
runtime:
  js_entrypoint: "build/index.js"
session:
  token_expiry_sec: 7200
socket:
  max_message_size_bytes: 4096
  max_request_size_bytes: 131072
```

### Module Registration (`InitModule`)

On startup, the server:

1. **Creates leaderboard** `tic-tac-toe-wins` (idempotent)
2. **Registers RPCs:** `create_private_match`, `submit_score`, `get_player_stats`
3. **Registers match handler** `"tic-tac-toe"` with all 7 lifecycle hooks:
   - `matchInit`, `matchJoinAttempt`, `matchJoin`, `matchLoop`, `matchLeave`, `matchTerminate`, `matchSignal`
4. **Registers matchmaker callback** `matchmakerMatched`
