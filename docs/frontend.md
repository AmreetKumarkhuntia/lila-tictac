# Frontend

## Tech Stack

| Library       | Version | Purpose                      |
| ------------- | ------- | ---------------------------- |
| React         | 19.x    | UI framework                 |
| TypeScript    | 5.x     | Type safety                  |
| Vite          | 6.x     | Build tool and dev server    |
| Tailwind CSS  | 4.x     | Utility-first styling        |
| Zustand       | 5.x     | Client-side state management |
| React Router  | 7.x     | Client-side routing          |
| Nakama JS SDK | 2.x     | Nakama client communication  |

## Routing

| Path             | Page            | Auth Required | Description                      |
| ---------------- | --------------- | ------------- | -------------------------------- |
| `/auth`          | AuthPage        | No            | Email/password login or register |
| `/home`          | HomePage        | Yes           | Lobby, matchmaking, stats        |
| `/game/:matchId` | GamePage        | Yes           | Active game board                |
| `/leaderboard`   | LeaderboardPage | Yes           | Global rankings + personal stats |

Catch-all routes redirect to `/auth`. Protected routes redirect to `/auth` if no valid session exists.

## Component Hierarchy

```
App
  SessionRestore (auth gate, session refresh)
    ConnectionGate (browser online/offline monitor)
      ErrorBoundary (catches render errors)
        Routes
          AuthPage
            TabGroup (Login / Register)
            Input (email, username, password)
            Button (submit)

          HomePage
            TabGroup (Classic / Timed mode selector)
            Button (Quick Play, Private Match, Leaderboard, Logout)
            PrivateMatchModal
            Leaderboard (top 3 preview)
            Theme toggle (Sun/Moon icons)

          GamePage
            PlayerCard (opponent)
            Board
              Cell (x9, X/O with scale-in animation)
            PlayerCard (current user)
            TimerDisplay (timed mode, with progress bar)
            GameResult (overlay modal)

          LeaderboardPage
            TabGroup (Global Rankings / My Stats)
            Leaderboard (full table via generic Table component)
            StatsPanel (6 StatCards: rank, win rate, wins, losses, draws, streaks)
      ToastContainer (fixed bottom-right)
```

## State Management (Zustand)

Three independent stores. No middleware or providers needed. Accessed via selectors (e.g., `useGameStore((s) => s.board)`) or `getState()` in non-React contexts.

### authStore

```typescript
interface AuthState {
  session: Session | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setSession: (session: Session, username: string) => void;
  clearSession: () => void;
  restoreSession: () => Promise<void>;
}
```

**Actions:**

- `setSession(session, username)` — Stores session in Zustand + persists to localStorage via `authStorage.saveAuth()`
- `clearSession()` — Clears Zustand state + localStorage + disconnects WebSocket socket
- `restoreSession()` — Called on app load. Reads stored tokens, checks expiry, refreshes if expired but refresh token is valid

### gameStore

```typescript
interface GameStoreState {
  matchId: string | null;
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  mySymbol: PlayerSymbol | null;
  players: Record<PlayerSymbol, PlayerInfo | null>;
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  timers: PlayerTimers | null;
  winningLine: WinningLine;
  gameOverReason: string | null;
  matchmakingStatus: MatchmakingStatus;
  matchmakingTicket: string | null;
  opponentDisconnected: boolean;
  movePending: boolean;
}
```

**Key actions:**

- `applyStateUpdate(data)` — Updates board, currentPlayer, moveCount, status, timers, opponentDisconnected from STATE_UPDATE message
- `setGameStart(data)` — Sets players, mode, mySymbol from GAME_START message
- `setGameOver(data)` — Sets winner, winningLine, gameOverReason from GAME_OVER message
- `resetGame()` — Resets all state to defaults
- `setMatchmakingStatus(status)` — Updates matchmaking state (idle/searching/matched)

**Derived state:** `isMyTurn` computed from `currentPlayer === mySymbol`

### uiStore

```typescript
interface UiState {
  isLoading: boolean;
  error: string | null;
  theme: "light" | "dark";
  toasts: Toast[];

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleTheme: () => void;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}
```

**Theme:** Persisted to localStorage. Applied eagerly on module load (adds/removes `dark` class on `<html>`) to prevent flash of wrong theme.

**Toasts:** Auto-dismissed after 4 seconds. `setError` also adds an error toast.

## Custom Hooks

### `useNakama()`

Thin wrapper around Nakama authentication.

```typescript
function useNakama() {
  return {
    register: (email, password, username) => ..., // authenticateEmail with create=true
    login: (email, password) => ...,              // authenticateEmail with create=false
    logout: () => ...,                             // sessionLogout + clearSession
    isAuthenticated: boolean,
    session: Session | null,
  };
}
```

### `useMatch()`

Manages in-match operations.

```typescript
function useMatch() {
  return {
    joinMatch: (matchId: string) => Promise<void>,
    sendMove: (row: number, col: number) => void,
    leaveMatch: () => void,
  };
}
```

- `joinMatch` — Connects socket, wires up `onmatchdata` to `handleMatchData()`, joins Nakama match
- `sendMove` — Sends JSON-encoded `{ row, col }` via `socket.sendMatchState` with op code 1
- `leaveMatch` — Resets gameStore, clears persisted match ID, leaves Nakama match, disconnects socket

### `useMatchmaker()`

Handles the full matchmaker lifecycle.

```typescript
function useMatchmaker() {
  return {
    findMatch: (mode: GameMode) => Promise<void>,
    cancelMatchmaking: () => Promise<void>,
    createPrivateMatch: (mode: GameMode) => Promise<string>,
    joinPrivateMatch: (matchId: string) => Promise<void>,
    createAndJoinPrivateMatch: (mode: GameMode) => Promise<void>,
  };
}
```

- `findMatch(mode)` — Connects socket, wires `onmatchmakermatched`, adds ticket with mode-based query, on match auto-joins and navigates to `/game/:id`
- `cancelMatchmaking()` — Removes the matchmaker ticket
- `createPrivateMatch(mode)` — Calls server RPC `create_private_match`
- `joinPrivateMatch(matchId)` — Joins existing match by ID
- `createAndJoinPrivateMatch(mode)` — Creates and joins atomically

### `useLeaderboard()`

Fetches leaderboard data on mount.

```typescript
function useLeaderboard() {
  return {
    records: LeaderboardRecord[],  // top 50 global
    myStats: PlayerStats | null,   // personal stats
    myRank: number | null,         // global rank
    isLoading: boolean,
    error: string | null,
    refresh: () => Promise<void>,
  };
}
```

Fetches three Nakama APIs in parallel: global leaderboard records, records around current player, and `get_player_stats` RPC.

### `useConnectionStatus()`

Monitors browser `online`/`offline` events.

- Shows toasts on connectivity changes
- On reconnect, attempts to re-establish Nakama WebSocket connection
- Provides `persistMatchId` / `getPersistedMatchId` / `clearPersistedMatchId` for sessionStorage-based match ID persistence

## Message Handling

Incoming WebSocket messages are handled by `lib/matchDataHandler.ts` — a plain function (not a hook) so it can be safely assigned to `socket.onmatchdata` from any context.

| Op Code | Name                 | Action                                     |
| ------- | -------------------- | ------------------------------------------ |
| 10      | STATE_UPDATE         | `gameStore.applyStateUpdate(data)`         |
| 11      | GAME_START           | `gameStore.setGameStart(data)`             |
| 12      | GAME_OVER            | `gameStore.setGameOver(data)`              |
| 13      | ERROR                | `uiStore.addToast(data.message, "error")`  |
| 14      | OPPONENT_LEFT        | Sets `opponentDisconnected`, shows toast   |
| 15      | MATCH_TERMINATED     | `gameStore.resetGame()`, redirects to home |
| 16      | OPPONENT_RECONNECTED | Clears `opponentDisconnected`, shows toast |

## Responsive Design

### Breakpoints

| Breakpoint       | Width          | Layout                              |
| ---------------- | -------------- | ----------------------------------- |
| Mobile (default) | 320px - 639px  | Single column, full-width board     |
| Tablet           | 640px - 1023px | Centered board with side margins    |
| Desktop          | 1024px+        | Centered board, max-width container |

### Mobile-First Approach

- Default styles target mobile
- Use `sm:`, `md:`, `lg:` prefixes to add tablet/desktop adjustments
- Board sizing:
  ```
  Mobile:  min-width: 280px, cell size: ~90px
  Tablet:  max-width: 360px, cell size: ~110px
  Desktop: max-width: 400px, cell size: ~120px
  ```

### Touch Targets

- Minimum touch target: 48px x 48px
- Cell tap area covers the entire cell
- Buttons: minimum height 44px
- Adequate spacing between interactive elements (8px minimum)

### Layout Per Page

**AuthPage:**

```
┌─────────────────────┐
│                     │
│                     │
│     Game Title      │
│                     │
│  [Login] [Register] │
│   ┌───────────────┐ │
│   │  Email        │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │  Username     │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │  Password     │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │   Login →     │ │
│   └───────────────┘ │
│                     │
└─────────────────────┘
```

**GamePage:**

```
┌─────────────────────┐
│  Opponent (X/O)     │
│  Timer: 25s         │
├─────────────────────┤
│  ┌───┬───┬───┐      │
│  │   │ X │   │      │
│  ├───┼───┼───┤      │
│  │ O │   │   │      │
│  ├───┼───┼───┤      │
│  │   │   │ X │      │
│  └───┴───┴───┘      │
├─────────────────────┤
│  Your Turn          │
│  Timer: 18s         │
└─────────────────────┘
```

**HomePage:**

```
┌─────────────────────┐
│  Welcome, Player    │
│  W: 5  L: 3  D: 1  │
├─────────────────────┤
│  [Classic] [Timed]  │
│  ┌─────────────────┐│
│  │  Quick Play     ││
│  └─────────────────┘│
├─────────────────────┤
│  ┌─────────────────┐│
│  │ Private Match   ││
│  └─────────────────┘│
├─────────────────────┤
│  Top Players        │
│  1. Alice (8 wins)  │
│  2. Bob (6 wins)    │
│  3. Carol (5 wins)  │
└─────────────────────┘
```

## Real-Time Update Flow

```
User taps cell
      │
      ▼
GamePage calls sendMove(row, col) from useMatch hook
      │
      ▼
socket.sendMatchState(matchId, OP_MOVE, { row, col })
      │
      ▼
Board disabled (movePending = true)
      │
      ▼
Server validates + updates state
      │
      ▼
Server broadcasts STATE_UPDATE (op 10)
      │
      ▼
handleMatchData receives message
      │
      ▼
gameStore.applyStateUpdate(data)
      │
      ▼
Board re-renders with new state, isMyTurn updates
```

## Animations

| Element             | Animation                                         | Trigger                     |
| ------------------- | ------------------------------------------------- | --------------------------- |
| X/O placement       | Scale in (0 → 1, 150ms)                           | New symbol appears on board |
| Winning cells       | Highlighted background color                      | GAME_OVER with winningLine  |
| Game result overlay | Fade in via `fadeIn` CSS animation                | Game finishes               |
| Timer urgency       | Color: green > 10s, amber 5-10s, red < 5s + pulse | Timer countdown             |
| Toast notifications | Fade in via `fadeIn` CSS animation                | Error/info/success event    |

## Error Handling

- **Network errors:** Toast notification + automatic WebSocket reconnect on browser `online` event
- **Move rejected:** Toast with server error message (op code 13)
- **Session expired:** Redirect to `/auth` with toast
- **Match not found:** Toast + redirect to `/home`
- **Socket disconnect:** Toast + reconnect on browser `online` event
- **Error boundary:** Catches render errors with fallback UI and "Return to Home" button
