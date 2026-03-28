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
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  timers: PlayerTimers | null;
}

interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

interface MoveMessage {
  row: number;
  col: number;
}

interface MatchMessage {
  op: number;
  data: string;
}
```

## Match Handler Lifecycle

The Nakama authoritative match is implemented as a TypeScript module with these lifecycle functions:

### `matchInit(ctx, logger, nk, params)`

Called once when the match is created.

- Initialize empty 3x3 board
- Parse `params` for `mode` ("classic" or "timed")
- Set `status: "waiting"`
- Initialize timers if `mode === "timed"`
- Return initial state and empty tick rate (0 = no ticking until game starts)

```
State after matchInit:
{
  board: [["", "", ""], ["", "", ""], ["", "", ""]],
  currentPlayer: "X",
  players: { X: null, O: null },
  winner: "",
  moveCount: 0,
  status: "waiting",
  ...
}
```

### `matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence, metadata)`

Called when a player tries to join. Return `{ accept }` or `{ reject }`.

Validation:
- If `state.players.X` and `state.players.O` are both assigned → **reject** (match full)
- If `state.status === "finished"` → **reject** (game already over)
- Otherwise → **accept**

### `matchJoin(ctx, logger, nk, dispatcher, tick, state, presences)`

Called after a player successfully joins.

For each joining presence:
1. If `state.players.X === null`, assign as X
2. Else if `state.players.O === null`, assign as O
3. If both players assigned, set `status: "playing"` and `startedAt: tick`
4. Broadcast current state to the new joiner
5. If game just started, broadcast `{ event: "game_start" }` to both players

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

Called every tick (when tick rate > 0). Processes all incoming messages.

For each message:
1. Parse `{ row, col }` from message data
2. **Validate the move** (see Move Validation below)
3. If invalid → send error to sender only, skip
4. If valid → apply move, check win/draw, broadcast updated state

For timed mode (runs on every tick):
1. Calculate elapsed time since last move (or game start)
2. Subtract elapsed from current player's remaining time
3. If remaining time <= 0 → auto-forfeit, set winner as opponent

### `matchLeave(ctx, logger, nk, dispatcher, tick, state, presences)`

Called when a player disconnects or leaves.

1. Identify which player left (X or O)
2. If `state.status === "playing"`:
   - Set `status: "finished"`, `winner: opponent_symbol`
   - Broadcast `{ event: "opponent_left", winner: opponent }` to remaining player
3. If `state.status === "waiting"`:
   - Remove player assignment, continue waiting for replacement
4. If both players gone → return `null` (destroy match)

### `matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds)`

Called when the server is shutting down or match is being forcibly terminated.

- Broadcast `{ event: "match_terminated" }` to all players
- Return `null` to allow clean shutdown

## Move Validation Rules

All validation happens server-side in `matchLoop`. A move is rejected if ANY of these conditions are true:

| # | Rule | Error Message |
|---|------|---------------|
| 1 | Game is not in "playing" status | "Game has not started yet" |
| 2 | Sender is not one of the assigned players | "You are not a player in this game" |
| 3 | It is not the sender's turn | "It is not your turn" |
| 4 | Row index is out of bounds (< 0 or > 2) | "Invalid row" |
| 5 | Column index is out of bounds (< 0 or > 2) | "Invalid column" |
| 6 | Cell is already occupied | "Cell is already taken" |

If all checks pass, the move is applied:

```typescript
state.board[row][col] = state.currentPlayer;
state.moveCount++;
state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
```

## Win / Draw Detection

After every valid move, check for terminal states.

### Win Check (8 possible lines)

```typescript
const WIN_LINES = [
  // Rows
  [[0,0], [0,1], [0,2]],
  [[1,0], [1,1], [1,2]],
  [[2,0], [2,1], [2,2]],
  // Columns
  [[0,0], [1,0], [2,0]],
  [[0,1], [1,1], [2,1]],
  [[0,2], [1,2], [2,2]],
  // Diagonals
  [[0,0], [1,1], [2,2]],
  [[0,2], [1,1], [2,0]],
];

function checkWinner(board: CellValue[][]): "" | PlayerSymbol {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const va = board[a[0]][a[1]];
    const vb = board[b[0]][b[1]];
    const vc = board[c[0]][c[1]];
    if (va !== "" && va === vb && vb === vc) {
      return va as PlayerSymbol;
    }
  }
  return "";
}
```

### Draw Check

If `winner === ""` and `moveCount === 9` → draw.

### Resolution

```typescript
const winner = checkWinner(state.board);
if (winner !== "") {
  state.winner = winner;
  state.status = "finished";
  state.finishedAt = tick;
} else if (state.moveCount === 9) {
  state.winner = "draw";
  state.status = "finished";
  state.finishedAt = tick;
}
```

On game finish, broadcast:
```json
{
  "event": "game_over",
  "winner": "X" | "O" | "draw",
  "board": [...],
  "winningLine": [[0,0], [0,1], [0,2]] | null
}
```

## Timer-Based Mode (Extension)

When `mode === "timed"`, additional rules apply:

### Timer Initialization

```typescript
timers: {
  X: 30,  // seconds remaining
  O: 30,  // seconds remaining
  lastMoveAt: tick,
  timeLimit: 30  // configured per match
}
```

### Tick Processing

On every `matchLoop` tick (tick rate: 10 ticks/second):

```typescript
if (state.mode === "timed" && state.status === "playing") {
  const elapsed = (tick - state.timers.lastMoveAt) / 10; // convert ticks to seconds
  state.timers[state.currentPlayer] -= elapsed;
  state.timers.lastMoveAt = tick;

  if (state.timers[state.currentPlayer] <= 0) {
    state.winner = state.currentPlayer === "X" ? "O" : "X";
    state.status = "finished";
    state.finishedAt = tick;
    // broadcast timeout event
  }
}
```

### Move Application Update

After a valid move in timed mode, reset the `lastMoveAt`:

```typescript
state.timers.lastMoveAt = tick;
```

### Client Timer Display

Server broadcasts timer values with every state update. Client displays countdown:
- Remaining > 10s: green
- 10s > Remaining > 5s: yellow
- Remaining <= 5s: red + pulse animation

## Match Message Protocol

### Client → Server

| Op Code | Name | Data | Description |
|---------|------|------|-------------|
| 1 | MOVE | `{ row, col }` | Player makes a move |

### Server → Client

| Op Code | Name | Data | Description |
|---------|------|------|-------------|
| 10 | STATE_UPDATE | `{ board, currentPlayer, moveCount, timers }` | Full state broadcast after each move |
| 11 | GAME_START | `{ players, mode }` | Game has started (2 players joined) |
| 12 | GAME_OVER | `{ winner, board, winningLine }` | Game ended (win/draw/timeout) |
| 13 | ERROR | `{ message }` | Move validation error (sent to mover only) |
| 14 | OPPONENT_LEFT | `{ winner }` | Opponent disconnected, remaining player wins |
| 15 | MATCH_TERMINATED | `{}` | Server shutting down match |
