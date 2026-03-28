export type PlayerSymbol = "X" | "O";
export type CellValue = "" | "X" | "O";
export type GameMode = "classic" | "timed";
export type GameStatus = "waiting" | "playing" | "finished";
export type MatchmakingStatus = "idle" | "searching" | "matched";

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
  opponentDisconnected?: boolean;
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
  winner: PlayerSymbol | "";
  reason: "disconnect" | "disconnected_temporary";
}

export interface OpponentReconnectedMessage {
  reconnectedSymbol: PlayerSymbol;
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

export interface LeaderboardRecord {
  ownerId: string;
  username: string;
  score: number;
  rank: number;
  metadata: {
    wins: number;
    gamesPlayed: number;
    winRate: number;
  };
}
