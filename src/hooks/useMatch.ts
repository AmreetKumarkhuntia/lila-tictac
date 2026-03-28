import { useRef, useCallback, useEffect } from "react";
import type { MatchData } from "@heroiclabs/nakama-js";
import { getSocket, disconnectSocket } from "@/lib/nakama";
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
        useGameStore.getState().setGameOver(data.winner, data.winningLine, data.reason);
        break;
      }

      case OP_CODE.ERROR: {
        const data: ErrorMessage = JSON.parse(payload);
        useUiStore.getState().addToast(data.message, "error");
        break;
      }

      case OP_CODE.OPPONENT_LEFT: {
        const data: OpponentLeftMessage = JSON.parse(payload);
        useGameStore.getState().setGameOver(data.winner, null, "forfeit");
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
        const socket = await getSocket(session);

        // Wire up match-specific event handlers
        socket.onmatchdata = handleMatchData;

        socket.ondisconnect = () => {
          console.warn("Socket disconnected");
          matchIdRef.current = null;
        };

        const match = await socket.joinMatch(matchId);

        matchIdRef.current = match.match_id;
        useGameStore.getState().setMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
      } catch (err) {
        console.error("Failed to join match:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Failed to join match",
        );
        matchIdRef.current = null;
      }
    },
    [session, handleMatchData],
  );

  const sendMove = useCallback(
    async (row: number, col: number) => {
      if (!session) return;

      const matchId = matchIdRef.current;
      if (!matchId) {
        console.error("Cannot send move: not connected to a match");
        return;
      }

      const socket = await getSocket(session);
      const data = JSON.stringify({ row, col });
      await socket.sendMatchState(matchId, OP_CODE.MOVE, data);
    },
    [session],
  );

  const leaveMatch = useCallback(async () => {
    const matchId = matchIdRef.current;

    if (session && matchId) {
      try {
        const socket = await getSocket(session);
        await socket.leaveMatch(matchId);
      } catch (err) {
        console.warn("Error leaving match:", err);
      }
    }

    // Disconnect the shared socket — we're done with this match session
    disconnectSocket();
    matchIdRef.current = null;
    useGameStore.getState().resetGame();
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const matchId = matchIdRef.current;

      if (matchId && session) {
        getSocket(session)
          .then((socket) => socket.leaveMatch(matchId))
          .catch(() => {});
      }

      disconnectSocket();
      matchIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    joinMatch,
    sendMove,
    leaveMatch,
  };
}
