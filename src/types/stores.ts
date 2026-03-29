// ============================================================
// Zustand store interfaces.
// Centralised here so store files stay focused on
// implementation (initial state + action logic).
// ============================================================

import type { Session } from "@heroiclabs/nakama-js";
import type {
  CellValue,
  GameMode,
  GameStatus,
  MatchmakingStatus,
  PlayerInfo,
  PlayerSymbol,
  PlayerTimers,
  WinnerValue,
  WinningLine,
} from "@/types/game";
import type { Theme, Toast, ToastType } from "@/types/ui";
import type { StateUpdateMessage } from "@/types/protocol";

// --- Game store -------------------------------------------------------------

export interface GameStoreState {
  matchId: string | null;
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  mySymbol: PlayerSymbol | null;
  players: Record<PlayerSymbol, PlayerInfo | null>;
  winner: WinnerValue;
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

export interface GameStoreActions {
  setMatchId: (matchId: string) => void;
  setBoard: (board: CellValue[][]) => void;
  setMySymbol: (symbol: PlayerSymbol) => void;
  setStatus: (status: GameStatus) => void;
  applyStateUpdate: (data: StateUpdateMessage) => void;
  setGameStart: (
    players: Record<PlayerSymbol, PlayerInfo>,
    mode: GameMode,
    mySymbol: PlayerSymbol,
  ) => void;
  setGameOver: (
    winner: WinnerValue,
    winningLine: WinningLine,
    reason: string | null,
  ) => void;
  setMatchmakingStatus: (status: MatchmakingStatus) => void;
  setMatchmakingTicket: (ticket: string | null) => void;
  setOpponentDisconnected: (disconnected: boolean) => void;
  setMovePending: (pending: boolean) => void;
  resetGame: () => void;
}

// --- UI store ---------------------------------------------------------------

export interface UiState {
  isLoading: boolean;
  error: string | null;
  theme: Theme;
  toasts: Toast[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

// --- Auth store -------------------------------------------------------------

export interface AuthState {
  session: Session | null;
  username: string | null;
  isAuthenticated: boolean;
  setSession: (session: Session, username: string) => void;
  clearSession: () => void;
}
