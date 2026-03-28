// ============================================================
// Component props interfaces.
// Centralised here so every component file stays focused on
// rendering logic rather than type definitions.
// ============================================================

import type { ReactNode } from "react";
import type {
  CellValue,
  PlayerInfo,
  PlayerSymbol,
  WinnerValue,
  WinningLine,
} from "@/types/game";
import type { LeaderboardRecord } from "@/types/leaderboard";

// --- Board & Cell -----------------------------------------------------------

export interface BoardProps {
  board: CellValue[][];
  onCellClick: (row: number, col: number) => void;
  winningLine: WinningLine;
  disabled: boolean;
}

export interface CellProps {
  value: CellValue;
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  disabled: boolean;
  isWinning: boolean;
}

// --- Game result dialog -----------------------------------------------------

export interface GameResultProps {
  winner: WinnerValue;
  mySymbol: PlayerSymbol | null;
  reason?: string;
  onLeave: () => void;
}

// --- Player card & timer ----------------------------------------------------

export interface PlayerCardProps {
  player: PlayerInfo | null;
  symbol: PlayerSymbol;
  isActive: boolean;
  isCurrentUser: boolean;
  /** Timer data — only provided when mode is "timed" */
  timer?: {
    timeRemaining: number;
    timeLimit: number;
  };
}

export interface TimerDisplayProps {
  timeRemaining: number;
  timeLimit: number;
  isActive: boolean;
}

// --- Leaderboard ------------------------------------------------------------

export interface LeaderboardProps {
  records: LeaderboardRecord[];
  currentUserId: string | null;
}

// --- Modals / dialogs -------------------------------------------------------

export interface PrivateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- App-level error boundary -----------------------------------------------

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
