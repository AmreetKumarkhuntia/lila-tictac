# Frontend

## Tech Stack

| Library       | Version | Purpose                      |
| ------------- | ------- | ---------------------------- |
| React         | 18.x    | UI framework                 |
| TypeScript    | 5.x     | Type safety                  |
| Vite          | 5.x     | Build tool and dev server    |
| Tailwind CSS  | 3.x     | Utility-first styling        |
| Zustand       | 4.x     | Client-side state management |
| React Router  | 6.x     | Client-side routing          |
| Nakama JS SDK | 2.x     | Nakama client communication  |

## Routing

| Path             | Page            | Auth Required | Description                 |
| ---------------- | --------------- | ------------- | --------------------------- |
| `/`              | AuthPage        | No            | Username entry / auto-login |
| `/home`          | HomePage        | Yes           | Lobby, matchmaking, stats   |
| `/game/:matchId` | GamePage        | Yes           | Active game board           |
| `/leaderboard`   | LeaderboardPage | Yes           | Global rankings             |

Route protection: redirect to `/` if no valid session exists.

## Component Hierarchy

```
App
├── AuthPage
│   └── UsernameForm
│
├── HomePage
│   ├── PlayerStatsCard
│   ├── QuickPlayButton (Classic)
│   ├── QuickPlayButton (Timed)
│   ├── CreatePrivateGame
│   ├── JoinPrivateGame
│   └── LeaderboardPreview (top 5)
│
├── GamePage
│   ├── PlayerCard (opponent, top)
│   ├── Board
│   │   ├── Cell (x9)
│   │   └── WinLine (overlay)
│   ├── PlayerCard (current user, bottom)
│   ├── MatchStatusBar
│   ├── TimerDisplay (timed mode only)
│   ├── GameResult (overlay)
│   └── MatchmakingOverlay (while searching)
│
└── LeaderboardPage
    ├── LeaderboardTable
    └── BackButton
```

## State Management (Zustand)

### authStore

```typescript
interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => void;
}
```

**Actions:**

- `login(username)` — Authenticate via Nakama device ID, update username
- `restoreSession()` — Load session from localStorage, refresh if expired
- `logout()` — Clear session, redirect to auth

### gameStore

```typescript
interface GameState {
  matchId: string | null;
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  mySymbol: PlayerSymbol | null;
  opponentUsername: string | null;
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  status: GameStatus;
  mode: GameMode;
  timers: PlayerTimers | null;
  isMyTurn: boolean;
  winningLine: [number, number][] | null;

  joinMatch: (matchId: string) => Promise<void>;
  makeMove: (row: number, col: number) => void;
  leaveMatch: () => void;
  resetGame: () => void;

  // Internal
  _handleStateUpdate: (data: any) => void;
  _handleGameOver: (data: any) => void;
  _handleOpponentLeft: (data: any) => void;
}
```

**Derived state:**

- `isMyTurn` — computed from `currentPlayer === mySymbol`

### uiStore

```typescript
interface UIState {
  isMatchmaking: boolean;
  matchmakingMode: GameMode | null;
  isConnecting: boolean;
  toasts: Toast[];

  setMatchmaking: (active: boolean, mode?: GameMode) => void;
  setConnecting: (connecting: boolean) => void;
  addToast: (message: string, type: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}
```

## Custom Hooks

### `useNakama()`

Initializes and provides the Nakama client and socket connection.

```typescript
function useNakama() {
  // Lazy-initialize Nakama client from env vars
  // Create WebSocket connection on auth
  // Return { client, socket, session }
}
```

- Reads config from `import.meta.env`
- Creates `Client` singleton
- Manages `Socket` lifecycle (connect, disconnect, reconnect)

### `useMatch(matchId)`

Manages a single match connection.

```typescript
function useMatch(matchId: string) {
  // Join match on mount
  // Listen for match data messages
  // Route messages to gameStore handlers
  // Clean up on unmount
  // Return { match, isConnected, error }
}
```

Message routing:

- Op 10 (STATE_UPDATE) → `gameStore._handleStateUpdate`
- Op 12 (GAME_OVER) → `gameStore._handleGameOver`
- Op 14 (OPPONENT_LEFT) → `gameStore._handleOpponentLeft`
- Op 13 (ERROR) → show toast via `uiStore.addToast`

### `useMatchmaker()`

Handles matchmaking ticket lifecycle.

```typescript
function useMatchmaker() {
  // Add matchmaker ticket
  // Listen for matchmaker_matched
  // On matched → navigate to /game/:matchId
  // Cancel ticket on cleanup or manual cancel
  // Return { findGame, cancelSearch, isSearching }
}
```

### `useLeaderboard()`

Fetches and paginates leaderboard data.

```typescript
function useLeaderboard() {
  // Fetch leaderboard records from Nakama
  // Pagination support (cursor-based)
  // Return { records, isLoading, loadMore, myRank }
}
```

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
│   ┌───────────────┐ │
│   │  Username     │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │   Enter →     │ │
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
│  ┌─────────────────┐│
│  │  ⚡ Classic Play ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │  ⏱️ Timed (30s)  ││
│  └─────────────────┘│
├─────────────────────┤
│  ┌─────────────────┐│
│  │ Create Room     ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ Join Room       ││
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
Cell component calls gameStore.makeMove(row, col)
      │
      ▼
gameStore sends match data message via socket.sendMatchData(matchId, 1, { row, col })
      │
      ▼
Disable board (isMyTurn = false)
      │
      ▼
Server validates + updates state
      │
      ▼
Server broadcasts STATE_UPDATE (op 10)
      │
      ▼
useMatch hook receives message
      │
      ▼
gameStore._handleStateUpdate(data)
      │
      ▼
Board re-renders with new state, isMyTurn updates
```

## Animations

| Element             | Animation                                    | Trigger                     |
| ------------------- | -------------------------------------------- | --------------------------- |
| X/O placement       | Scale in (0 → 1, 150ms)                      | New symbol appears on board |
| Win line            | Draw line across winning cells (300ms)       | GAME_OVER with winningLine  |
| Game result overlay | Fade in + slide up (200ms)                   | Game finishes               |
| Timer urgency       | Color transition + pulse                     | Timer < 5s                  |
| Matchmaking         | Pulsing dots animation                       | Searching for opponent      |
| Cell hover          | Background color shift (touch: active state) | Hover / touch               |

## Error Handling

- **Network errors:** Toast notification with "Connection lost. Reconnecting..."
- **Move rejected:** Toast with server error message
- **Session expired:** Redirect to auth page with toast
- **Match not found:** Toast "Match no longer exists" + redirect to home
- **Socket disconnect:** Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
