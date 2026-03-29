# Game Logic

## Game State Schema

```typescript
type PlayerSymbol = "X" | "O";
type CellValue = "" | "X" | "O";
type GameMode = "classic" | "timed";
type GameStatus = "waiting" | "playing" | "finished";

interface GameState {
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  players: Record<PlayerSymbol, string | null>;
  usernames: Record<string, string>;
  presenceMap: Record<string, nkruntime.Presence>;
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  timers: PlayerTimers | null;
  disconnected: DisconnectedPlayer | null;
  originalTickRate: number;
}

interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

interface DisconnectedPlayer {
  userId: string;
  symbol: PlayerSymbol;
  disconnectedAtTick: number;
}

interface PlayerStatsData {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  lastMatchAt: number;
}
```

## Match Handler Lifecycle

The Nakama authoritative match is implemented as a TypeScript module split across multiple files in `nakama/modules/`. The lifecycle functions are:

### `matchInit(ctx, logger, nk, params)`

Called once when the match is created (via RPC or matchmaker).

- Initialize empty 3x3 board
- Parse `params` for `mode` ("classic" or "timed", defaults to "classic")
- Set `status: "waiting"`, `currentPlayer: "X"` (X always goes first)
- Initialize timers if `mode === "timed"`: `{ X: 30, O: 30, lastMoveAt: 0, timeLimit: 30 }`
- Set tick rate: **10 ticks/second** for timed mode, **5 ticks/second** for classic
- Store `originalTickRate` for restoration after grace period
- Return initial state with label `JSON.stringify({ mode, status: "waiting" })`

```
State after matchInit:
{
  board: [["", "", ""], ["", "", ""], ["", "", ""]],
  currentPlayer: "X",
  players: { X: null, O: null },
  usernames: {},
  presenceMap: {},
  winner: "",
  moveCount: 0,
  status: "waiting",
  timers: null (classic) | { X: 30, O: 30, ... } (timed),
  disconnected: null,
  originalTickRate: 5 (classic) | 10 (timed)
}
```

### `matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata)`

Called when a player tries to join. Return `{ accept }` or `{ reject }`.

Validation (reject if any):

| Condition                                    | Rejection Reason           |
| -------------------------------------------- | -------------------------- |
| `status === "finished"`                      | "Game is already finished" |
| Player already in match AND not reconnecting | "Already in this match"    |
| Both slots taken AND not reconnecting        | "Match is full"            |

**Reconnection detection:** `state.disconnected !== null && state.disconnected.userId === presence.userId`

### `matchJoin(ctx, logger, nk, dispatcher, tick, state, presences)`

Called after a player successfully joins. Handles two paths:

**New player:**

1. Add to `presenceMap` and store username
2. Assign to first open slot (X first, then O)
3. When both slots are filled:
   - Set `status: "playing"`, `startedAt: tick`
   - Update match label to `{ mode, status: "playing" }`
   - Send individual `OP_GAME_START` to each player with their `assignedSymbol`
   - Broadcast initial `OP_STATE_UPDATE`

**Reconnecting player:**

1. Restore `presenceMap` and `usernames` from stored data
2. Clear `state.disconnected = null`
3. Send `OP_GAME_START` only to reconnecting player (full state sync)
4. Broadcast `OP_STATE_UPDATE` to all
5. Notify opponent with `OP_OPPONENT_RECONNECTED`

```
State after both players join:
{
  board: [["", "", ""], ["", "", ""], ["", "", ""]],
  currentPlayer: "X",
  players: { X: "user_id_a", O: "user_id_b" },
  status: "playing",
  startedAt: <tick>,
  ...
}
```

### `matchLoop(ctx, logger, nk, dispatcher, tick, state, messages)`

Called every tick. The core game loop with three phases:

#### Phase 1: Reconnection Grace Period Check

```typescript
if (state.disconnected !== null && state.status === "playing") {
  const elapsedSeconds =
    (tick - state.disconnected.disconnectedAtTick) / activeTickRate;
  if (elapsedSeconds >= 15) {
    // Forfeit: disconnected player loses
    state.winner = oppositeSymbol;
    state.status = "finished";
    submitMatchResult(nk, logger, state);
    broadcastGameOver(dispatcher, state, "forfeit");
    return { state };
  }
}
```

If 15 seconds pass without reconnect (`RECONNECT_GRACE_SECONDS = 15`), the disconnected player forfeits. The match stays in `"finished"` state for the remaining player to see the result.

#### Phase 2: Timer Countdown (timed mode only)

```typescript
if (state.mode === "timed" && state.status === "playing" && state.timers) {
  const elapsed = (tick - state.timers.lastMoveAt) / 10; // 10 tps → seconds
  state.timers[state.currentPlayer] -= elapsed;
  state.timers.lastMoveAt = tick;

  if (state.timers[state.currentPlayer] <= 0) {
    state.winner = state.currentPlayer === "X" ? "O" : "X";
    state.status = "finished";
    broadcastGameOver(dispatcher, state, "timeout");
    submitMatchResult(nk, logger, state);
    return { state };
  }
}
```

Each player starts with 30 seconds. Only the current player's clock counts down. If it hits zero, that player loses (reason: `"timeout"`).

#### Phase 3: Message Processing (Move Validation)

For each incoming message with `OP_MOVE`:

1. Parse JSON `{ row, col }` — send `OP_ERROR` if malformed
2. **Validate the move** (see Move Validation below)
3. If invalid → send `OP_ERROR` to sender only, skip
4. If valid → apply move, check win/draw, broadcast

### `matchLeave(ctx, logger, nk, dispatcher, tick, state, presences)`

Called when a player disconnects or leaves.

For each leaving presence:

1. Remove from `presenceMap`
2. Look up the player's symbol

**If status is `"playing"`:**

- If `state.disconnected` is already set (both players disconnecting): clear disconnected, match will be destroyed
- Otherwise: set `state.disconnected` with player info + current tick. Broadcast `OP_OPPONENT_LEFT` with `reason: "disconnected_temporary"`. Grace period begins.

**If status is `"waiting"`:**

- Free the player's slot (`players[symbol] = null`)
- Delete username

**If status is `"finished"`:**

- No action (match will clean up)

If all presences are gone (`presenceMap` empty), return `null` to destroy the match.

### `matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds)`

Called when the server is shutting down or match is being forcibly terminated.

- Broadcast `OP_MATCH_TERMINATED` to all players
- Return `null` to allow clean shutdown

### `matchSignal(ctx, logger, nk, dispatcher, tick, state, data)`

Required by the Nakama interface but unused. Returns `{ state }` unchanged.

## Move Validation Rules

All validation happens server-side in `matchLoop`. A move is rejected if ANY of these conditions are true:

| #   | Rule                                       | Error Message                |
| --- | ------------------------------------------ | ---------------------------- |
| 1   | Game is not in "playing" status            | "Game not in progress"       |
| 2   | Sender is not one of the assigned players  | "Not a player in this match" |
| 3   | It is not the sender's turn                | "Not your turn"              |
| 4   | Row index is out of bounds (< 0 or > 2)    | "Invalid row/col"            |
| 5   | Column index is out of bounds (< 0 or > 2) | "Invalid row/col"            |
| 6   | Cell is already occupied                   | "Cell already occupied"      |

If all checks pass, the move is applied:

```typescript
state.board[row][col] = state.currentPlayer;
state.moveCount++;
if (state.timers) state.timers.lastMoveAt = tick;
```

## Win / Draw Detection

After every valid move, check for terminal states.

### Win Check (8 possible lines)

```typescript
const WIN_LINES = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ], // row 0
  [
    [1, 0],
    [1, 1],
    [1, 2],
  ], // row 1
  [
    [2, 0],
    [2, 1],
    [2, 2],
  ], // row 2
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ], // col 0
  [
    [0, 1],
    [1, 1],
    [2, 1],
  ], // col 1
  [
    [0, 2],
    [1, 2],
    [2, 2],
  ], // col 2
  [
    [0, 0],
    [1, 1],
    [2, 2],
  ], // diagonal
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ], // anti-diagonal
];

function checkWinner(board: CellValue[][]): "" | PlayerSymbol {
  for (const line of WIN_LINES) {
    const va = board[line[0][0]][line[0][1]];
    const vb = board[line[1][0]][line[1][1]];
    const vc = board[line[2][0]][line[2][1]];
    if (va !== "" && va === vb && vb === vc) {
      return va;
    }
  }
  return "";
}
```

### Resolution

```typescript
const winner = checkWinner(state.board);
if (winner !== "") {
  state.winner = winner;
  state.status = "finished";
  broadcastGameOver(dispatcher, state, "win");
  submitMatchResult(nk, logger, state);
} else if (state.moveCount === 9) {
  state.winner = "draw";
  state.status = "finished";
  broadcastGameOver(dispatcher, state, "draw");
  submitMatchResult(nk, logger, state);
} else {
  state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
  broadcastState(dispatcher, state);
}
```

The winning line coordinates are included in the `OP_GAME_OVER` message so the client can highlight the winning cells.

## Timer-Based Mode

When `mode === "timed"`, additional rules apply:

### Configuration

| Setting           | Value                                      |
| ----------------- | ------------------------------------------ |
| Time per player   | 30 seconds                                 |
| Tick rate         | 10 ticks/second                            |
| Time limit source | `VITE_TIMER_SECONDS` env var (default: 30) |

### Timer Countdown

On every `matchLoop` tick:

```typescript
const elapsed = (tick - state.timers.lastMoveAt) / 10; // ticks to seconds
state.timers[state.currentPlayer] -= elapsed;
state.timers.lastMoveAt = tick;
```

Only the current player's clock ticks down. Timer data is included in every `OP_STATE_UPDATE` broadcast.

### Timeout

```typescript
if (state.timers[state.currentPlayer] <= 0) {
  state.winner = state.currentPlayer === "X" ? "O" : "X";
  state.status = "finished";
  broadcastGameOver(dispatcher, state, "timeout");
  submitMatchResult(nk, logger, state);
}
```

### Client Display

Server broadcasts timer values with every state update. Client interpolates locally for smooth countdown:

- Remaining > 10s: green
- 5s < Remaining <= 10s: amber
- Remaining <= 5s: red + pulse animation

## Reconnection & Grace Period

### Disconnect Detection

When a player disconnects during `"playing"`:

1. `matchLeave` stores a `DisconnectedPlayer` record with `disconnectedAtTick`
2. Broadcasts `OP_OPPONENT_LEFT` with `reason: "disconnected_temporary"` to the remaining player
3. The game continues running — the remaining player sees "Opponent disconnected" indicator

### Grace Period

| Setting         | Value                                           |
| --------------- | ----------------------------------------------- |
| Grace duration  | 15 seconds (`RECONNECT_GRACE_SECONDS`)          |
| Grace tick rate | Same as game mode (10 tps timed, 5 tps classic) |

Each tick, `matchLoop` checks elapsed time since disconnect. After 15 seconds without reconnect, the disconnected player forfeits.

### Reconnection

When a player reconnects (joins the match again):

1. `matchJoinAttempt` detects the reconnection via `state.disconnected.userId`
2. `matchJoin` restores the player's presence and clears the disconnect record
3. Sends `OP_GAME_START` to the reconnecting player (full state sync with assigned symbol)
4. Broadcasts `OP_STATE_UPDATE` to all players
5. Sends `OP_OPPONENT_RECONNECTED` to the opponent
6. Game resumes normally

### Both Players Disconnect

If `state.disconnected` is already set when the second player leaves, the disconnect record is cleared and the match will be destroyed (no winner declared).

## Stats & Leaderboard Updates

After every game end (win/draw/timeout/forfeit), `submitMatchResult()` runs automatically:

### Scoring

| Outcome | Points    | Stats Update                                     |
| ------- | --------- | ------------------------------------------------ |
| Win     | +3        | `wins++`, `currentStreak++`, update `bestStreak` |
| Loss    | +0        | `losses++`, `currentStreak = 0`                  |
| Draw    | +1 (both) | `draws++`, `currentStreak = 0` (both)            |

All players get `gamesPlayed++` and `lastMatchAt = now`.

### Storage

Stats are written to Nakama Storage at `collection: "player_stats"`, `key: "summary"`, per player. Each player's stats are written independently (one failure doesn't block the other).

### Leaderboard

After updating storage, leaderboard records are written via `nk.leaderboardRecordWrite()` with metadata: `{ wins, gamesPlayed, winRate }`. The leaderboard ID is `"tic-tac-toe-wins"` (descending, incremental operator).

The entire `submitMatchResult` is wrapped in try/catch to never crash the match loop.

## Module Structure

The game logic is split across files in `nakama/modules/`:

| File             | Purpose                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `index.ts`       | `InitModule` — registers match handler, RPCs, matchmaker callback, creates leaderboard                         |
| `constants.ts`   | Op codes, scoring values, grace period config, win lines                                                       |
| `types.ts`       | All TypeScript interfaces (GameState, PlayerStats, etc.)                                                       |
| `utils.ts`       | `createEmptyBoard`, `checkWinner`, `findWinningLine`, `symbolForUserId`, `broadcastState`, `broadcastGameOver` |
| `stats.ts`       | `readPlayerStats`, `writePlayerStats`, `defaultStats`, `submitMatchResult`                                     |
| `rpc.ts`         | `createPrivateMatch`, `submitScore` (legacy), `getPlayerStats`, `matchmakerMatched`                            |
| `match-init.ts`  | `matchInit` handler                                                                                            |
| `match-join.ts`  | `matchJoinAttempt` + `matchJoin` handlers (new player + reconnection)                                          |
| `match-loop.ts`  | `matchLoop` handler (grace period, timers, move validation, win/draw)                                          |
| `match-leave.ts` | `matchLeave`, `matchTerminate`, `matchSignal` handlers                                                         |

Files are explicitly ordered in `tsconfig.json` for correct concatenation (Nakama requires a single ES5 output file).

## Match Message Protocol

### Client → Server

| Op Code | Name | Data           | Description         |
| ------- | ---- | -------------- | ------------------- |
| 1       | MOVE | `{ row, col }` | Player makes a move |

### Server → Client

| Op Code | Name                 | Data                                                  | Description                                     |
| ------- | -------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| 10      | STATE_UPDATE         | `{ board, currentPlayer, moveCount, status, timers }` | Full state broadcast after each move            |
| 11      | GAME_START           | `{ players, mode, assignedSymbol }`                   | Game started (per-player, with assigned symbol) |
| 12      | GAME_OVER            | `{ winner, board, winningLine, reason }`              | Game ended (win/draw/timeout/forfeit)           |
| 13      | ERROR                | `{ message }`                                         | Move validation error (sent to mover only)      |
| 14      | OPPONENT_LEFT        | `{ winner, reason }`                                  | Opponent disconnected (temporary)               |
| 15      | MATCH_TERMINATED     | `{}`                                                  | Server shutting down match                      |
| 16      | OPPONENT_RECONNECTED | `{ reconnectedSymbol }`                               | Opponent reconnected within grace period        |
