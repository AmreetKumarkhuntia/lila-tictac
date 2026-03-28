import { create } from "zustand";
import type {
  CellValue,
  PlayerSymbol,
  GameStatus,
  GameMode,
  MatchmakingStatus,
  PlayerTimers,
  PlayerInfo,
  StateUpdateMessage,
} from "@/types/game";
import { EMPTY_BOARD } from "@/lib/constants";

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
  gameOverReason: string | null;
  matchmakingStatus: MatchmakingStatus;
  matchmakingTicket: string | null;
  opponentDisconnected: boolean;
  movePending: boolean;
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
    reason: string | null,
  ) => void;
  setMatchmakingStatus: (status: MatchmakingStatus) => void;
  setMatchmakingTicket: (ticket: string | null) => void;
  setOpponentDisconnected: (disconnected: boolean) => void;
  setMovePending: (pending: boolean) => void;
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
  gameOverReason: null,
  matchmakingStatus: "idle",
  matchmakingTicket: null,
  opponentDisconnected: false,
  movePending: false,
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
      opponentDisconnected: data.opponentDisconnected ?? false,
      movePending: false,
    }),
  setGameStart: (players, mode, mySymbol) =>
    set({ players, mode, mySymbol, status: "playing", opponentDisconnected: false }),
  setGameOver: (winner, winningLine, reason) =>
    set({ winner, winningLine, gameOverReason: reason, status: "finished" }),
  setMatchmakingStatus: (matchmakingStatus) => set({ matchmakingStatus }),
  setMatchmakingTicket: (matchmakingTicket) => set({ matchmakingTicket }),
  setOpponentDisconnected: (opponentDisconnected) => set({ opponentDisconnected }),
  setMovePending: (movePending) => set({ movePending }),
  resetGame: () => set(initialState),
}));
