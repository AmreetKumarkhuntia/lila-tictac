// Core game primitives
export type PlayerSymbol = "X" | "O";
export type CellValue = "" | "X" | "O";
export type GameMode = "classic" | "timed";
export type GameStatus = "waiting" | "playing" | "finished";
export type MatchmakingStatus = "idle" | "searching" | "matched";

// Derived convenience types (eliminate inline repetition)
export type WinnerValue = "" | PlayerSymbol | "draw";
export type WinningLine = [number, number][] | null;

export interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

export interface PlayerInfo {
  userId: string;
  username: string;
}

// Full frontend game state shape.
// Note: currently unused — Zustand GameStoreState is the active state shape.
// Kept for reference and potential future use.
export interface GameState {
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  players: Record<PlayerSymbol, string | null>;
  winner: WinnerValue;
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  timers: PlayerTimers | null;
}
