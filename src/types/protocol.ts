import type {
  CellValue,
  PlayerSymbol,
  GameMode,
  GameStatus,
  PlayerTimers,
  PlayerInfo,
  WinnerValue,
  WinningLine,
} from "./game";

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
  winner: WinnerValue;
  board: CellValue[][];
  winningLine: WinningLine;
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
