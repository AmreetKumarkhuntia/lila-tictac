import { create } from "zustand";
import type {
  CellValue,
  PlayerSymbol,
  GameStatus,
  GameMode,
  PlayerTimers,
  PlayerInfo,
  StateUpdateMessage,
} from "@/types/game";
import { EMPTY_BOARD } from "@/lib/constants";

export type MatchmakingStatus = "idle" | "searching" | "matched";

interface GameStoreState {
  matchId: string | null;
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  mySymbol: PlayerSymbol | null;
  players: Record<PlayerSymbol, PlayerInfo | null>;
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  timers: PlayerTimers | null;
  winningLine: [number, number][] | null;
  matchmakingStatus: MatchmakingStatus;
  matchmakingTicket: string | null;
}

interface GameStoreActions {
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
    winner: "" | PlayerSymbol | "draw",
    winningLine: [number, number][] | null,
  ) => void;
  setMatchmakingStatus: (status: MatchmakingStatus) => void;
  setMatchmakingTicket: (ticket: string | null) => void;
  resetGame: () => void;
}

const initialState: GameStoreState = {
  matchId: null,
  board: EMPTY_BOARD.map((row) => [...row]) as CellValue[][],
  currentPlayer: "X",
  mySymbol: null,
  players: { X: null, O: null },
  winner: "",
  moveCount: 0,
  mode: "classic",
  status: "waiting",
  timers: null,
  winningLine: null,
  matchmakingStatus: "idle",
  matchmakingTicket: null,
};

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  ...initialState,
  setMatchId: (matchId) => set({ matchId }),
  setBoard: (board) => set({ board }),
  setMySymbol: (mySymbol) => set({ mySymbol }),
  setStatus: (status) => set({ status }),
  applyStateUpdate: (data) =>
    set({
      board: data.board,
      currentPlayer: data.currentPlayer,
      moveCount: data.moveCount,
      status: data.status,
      timers: data.timers,
    }),
  setGameStart: (players, mode, mySymbol) =>
    set({ players, mode, mySymbol, status: "playing" }),
  setGameOver: (winner, winningLine) =>
    set({ winner, winningLine, status: "finished" }),
  setMatchmakingStatus: (matchmakingStatus) => set({ matchmakingStatus }),
  setMatchmakingTicket: (matchmakingTicket) => set({ matchmakingTicket }),
  resetGame: () => set(initialState),
}));
