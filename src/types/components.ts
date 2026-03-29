// ============================================================
// Component props interfaces.
// Centralised here so every component file stays focused on
// rendering logic rather than type definitions.
// ============================================================

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import type {
  CellValue,
  PlayerInfo,
  PlayerSymbol,
  WinnerValue,
  WinningLine,
} from "@/types/game";
import type { LeaderboardRecord, PlayerStats } from "@/types/leaderboard";

// --- Button -----------------------------------------------------------------

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
}

// --- Input ------------------------------------------------------------------

export type InputSize = "sm" | "md";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  mono?: boolean;
  inputSize?: InputSize;
}

// --- TabGroup ---------------------------------------------------------------

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export interface TabGroupProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

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
  /** Updated player stats fetched after game over */
  stats?: PlayerStats | null;
  /** Player's global rank */
  rank?: number | null;
  /** Whether stats are currently loading */
  statsLoading?: boolean;
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
