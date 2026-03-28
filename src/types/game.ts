export type PlayerSymbol = "X" | "O";
export type CellValue = "" | "X" | "O";
export type GameMode = "classic" | "timed";
export type GameStatus = "waiting" | "playing" | "finished";

export interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

export interface GameState {
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

export interface PlayerInfo {
  userId: string;
  username: string;
}

export interface MoveMessage {
  row: number;
  col: number;
}

export interface StateUpdateMessage {
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  moveCount: number;
  status: GameStatus;
  timers: PlayerTimers | null;
}

export interface GameStartMessage {
  players: Record<PlayerSymbol, PlayerInfo>;
  mode: GameMode;
  assignedSymbol: PlayerSymbol;
}

export interface GameOverMessage {
  winner: "" | PlayerSymbol | "draw";
  board: CellValue[][];
  winningLine: [number, number][] | null;
  reason: "win" | "draw" | "timeout" | "forfeit";
}

export interface ErrorMessage {
  message: string;
}

export interface OpponentLeftMessage {
  winner: PlayerSymbol;
  reason: "disconnect";
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  winRate: number;
}
