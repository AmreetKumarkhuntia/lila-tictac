import type { CellValue } from "@/types/game";

export const OP_CODE = {
  MOVE: 1,
  STATE_UPDATE: 10,
  GAME_START: 11,
  GAME_OVER: 12,
  ERROR: 13,
  OPPONENT_LEFT: 14,
  MATCH_TERMINATED: 15,
  OPPONENT_RECONNECTED: 16,
} as const;

export const WIN_LINES: [number, number][][] = [
  [[0, 0], [0, 1], [0, 2]],
  [[1, 0], [1, 1], [1, 2]],
  [[2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

export const EMPTY_BOARD: CellValue[][] = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

export const LEADERBOARD_ID = "tic-tac-toe-wins";
export const DEFAULT_TIME_LIMIT = 30;
