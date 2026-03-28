// ============================================================
// Server-side type definitions for tic-tac-toe match handler.
// These types are intentionally independent from the frontend
// types in src/types/ — the two codebases will be segregated.
// ============================================================

type PlayerSymbol = "X" | "O";
type CellValue = "" | "X" | "O";
type GameMode = "classic" | "timed";
type GameStatus = "waiting" | "playing" | "finished";

interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

interface DisconnectedPlayer {
  userId: string;
  symbol: PlayerSymbol;
  /** Tick at which the player disconnected — used to compute grace elapsed */
  disconnectedAtTick: number;
}

interface GameState {
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  /** Maps symbol -> presence userId (null if slot open) */
  players: { X: string | null; O: string | null };
  /** Maps userId -> username for display */
  usernames: { [userId: string]: string };
  /** Tracks active presences by userId for targeted messaging */
  presenceMap: { [userId: string]: nkruntime.Presence };
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  timers: PlayerTimers | null;
  /** Set when a player disconnects mid-game; cleared on reconnect or grace expiry */
  disconnected: DisconnectedPlayer | null;
  /** Original tick rate before grace period override (used to restore after reconnect) */
  originalTickRate: number;
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
