import { create } from "zustand";
import type { GameStoreState, GameStoreActions } from "@/types/stores";
import { EMPTY_BOARD } from "@/lib/constants";

const initialState: GameStoreState = {
  matchId: null,
  board: EMPTY_BOARD.map((row) => [...row]),
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

export const useGameStore = create<GameStoreState & GameStoreActions>(
  (set) => ({
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
      set({
        players,
        mode,
        mySymbol,
        status: "playing",
        opponentDisconnected: false,
      }),
    setGameOver: (winner, winningLine, reason) =>
      set({ winner, winningLine, gameOverReason: reason, status: "finished" }),
    setMatchmakingStatus: (matchmakingStatus) => set({ matchmakingStatus }),
    setMatchmakingTicket: (matchmakingTicket) => set({ matchmakingTicket }),
    setOpponentDisconnected: (opponentDisconnected) =>
      set({ opponentDisconnected }),
    setMovePending: (movePending) => set({ movePending }),
    resetGame: () => set(initialState),
  }),
);
