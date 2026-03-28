import { useRef, useCallback, useEffect } from "react";
import type { Socket, MatchData } from "@heroiclabs/nakama-js";
import { nakamaClient } from "@/lib/nakama";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { OP_CODE } from "@/lib/constants";
import type {
  StateUpdateMessage,
  GameStartMessage,
  GameOverMessage,
  ErrorMessage,
  OpponentLeftMessage,
} from "@/types/game";

function decodeMatchData(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

export function useMatch() {
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);

  const session = useAuthStore((s) => s.session);

  const handleMatchData = useCallback((matchData: MatchData) => {
    const opCode = matchData.op_code;
    let payload: string;

    try {
      payload = decodeMatchData(matchData.data);
    } catch {
      console.error("Failed to decode match data");
      return;
    }

    switch (opCode) {
      case OP_CODE.STATE_UPDATE: {
        const data: StateUpdateMessage = JSON.parse(payload);
        useGameStore.getState().applyStateUpdate(data);
        break;
      }

      case OP_CODE.GAME_START: {
        const data: GameStartMessage = JSON.parse(payload);
        useGameStore.getState().setGameStart(
          data.players,
          data.mode,
          data.assignedSymbol,
        );
        break;
      }

      case OP_CODE.GAME_OVER: {
        const data: GameOverMessage = JSON.parse(payload);
        useGameStore.getState().setGameOver(data.winner, data.winningLine);
        break;
      }

      case OP_CODE.ERROR: {
        const data: ErrorMessage = JSON.parse(payload);
        useUiStore.getState().setError(data.message);
        break;
      }

      case OP_CODE.OPPONENT_LEFT: {
        const data: OpponentLeftMessage = JSON.parse(payload);
        useGameStore.getState().setGameOver(data.winner, null);
        break;
      }

      case OP_CODE.MATCH_TERMINATED: {
        useGameStore.getState().resetGame();
        break;
      }

      default:
        console.warn("Unknown match op code:", opCode);
    }
  }, []);

  const joinMatch = useCallback(
    async (matchId: string) => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return;
      }

      useUiStore.getState().setLoading(true);

      try {
        // Create socket if needed
        if (!socketRef.current) {
          const ssl =
            import.meta.env.VITE_NAKAMA_SSL === "true";
          socketRef.current = nakamaClient.createSocket(ssl, false);
        }

        const socket = socketRef.current;

        // Wire up event handlers before connecting
        socket.onmatchdata = handleMatchData;

        socket.ondisconnect = () => {
          console.warn("Socket disconnected");
          socketRef.current = null;
          matchIdRef.current = null;
        };

        // Connect and join
        await socket.connect(session, false);
        const match = await socket.joinMatch(matchId);

        matchIdRef.current = match.match_id;
        useGameStore.getState().setMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
      } catch (err) {
        console.error("Failed to join match:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Failed to join match",
        );
        socketRef.current = null;
        matchIdRef.current = null;
      }
    },
    [session, handleMatchData],
  );

  const sendMove = useCallback(
    async (row: number, col: number) => {
      const socket = socketRef.current;
      const matchId = matchIdRef.current;

      if (!socket || !matchId) {
        console.error("Cannot send move: not connected to a match");
        return;
      }

      const data = JSON.stringify({ row, col });
      await socket.sendMatchState(matchId, OP_CODE.MOVE, data);
    },
    [],
  );

  const leaveMatch = useCallback(async () => {
    const socket = socketRef.current;
    const matchId = matchIdRef.current;

    if (socket && matchId) {
      try {
        await socket.leaveMatch(matchId);
      } catch (err) {
        console.warn("Error leaving match:", err);
      }
    }

    if (socket) {
      socket.disconnect(false);
    }

    socketRef.current = null;
    matchIdRef.current = null;
    useGameStore.getState().resetGame();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const socket = socketRef.current;
      const matchId = matchIdRef.current;

      if (socket && matchId) {
        socket.leaveMatch(matchId).catch(() => {});
      }
      if (socket) {
        socket.disconnect(false);
      }

      socketRef.current = null;
      matchIdRef.current = null;
    };
  }, []);

  return {
    joinMatch,
    sendMove,
    leaveMatch,
    socket: socketRef,
  };
}
