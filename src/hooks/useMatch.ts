import { useRef, useCallback, useEffect } from "react";
import type { MatchData } from "@heroiclabs/nakama-js";
import { getSocket, disconnectSocket } from "@/lib/nakama";
import { persistMatchId, clearPersistedMatchId } from "@/hooks/useConnectionStatus";
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
  OpponentReconnectedMessage,
} from "@/types/protocol";

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
      console.error("[match] failed to decode match data");
      return;
    }

    console.log("[match] received opCode=%d payload=%s", opCode, payload.slice(0, 200));

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
        if (data.reason === "disconnected_temporary") {
          // Opponent disconnected but may reconnect — show waiting state
          useGameStore.getState().setOpponentDisconnected(true);
          useUiStore.getState().addToast("Opponent disconnected — waiting for reconnect...", "info");
        } else {
          // Permanent disconnect / forfeit
          useGameStore.getState().setGameOver(data.winner, null, "forfeit");
        }
        break;
      }

      case OP_CODE.OPPONENT_RECONNECTED: {
        JSON.parse(payload) as OpponentReconnectedMessage;
        useGameStore.getState().setOpponentDisconnected(false);
        useUiStore.getState().addToast("Opponent reconnected!", "success");
        break;
      }

      case OP_CODE.MATCH_TERMINATED: {
        useGameStore.getState().resetGame();
        useUiStore.getState().addToast("Match terminated by server", "error");
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

        socket.onmatchdata = handleMatchData;

        socket.ondisconnect = () => {
          console.warn("[match] socket disconnected");
          matchIdRef.current = null;
        };

        console.log("[match] joining match", matchId);
        const match = await socket.joinMatch(matchId);
        console.log("[match] joined successfully", match.match_id);

        matchIdRef.current = match.match_id;
        useGameStore.getState().setMatchId(match.match_id);
        persistMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
      } catch (err) {
        console.error("Failed to join match:", err);
        const message = err instanceof Error ? err.message : "Failed to join match";
        useUiStore.getState().setError(message);
        useUiStore.getState().setLoading(false);
        matchIdRef.current = null;
        clearPersistedMatchId();
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
    clearPersistedMatchId();
    useGameStore.getState().resetGame();
  }, [session]);

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
      clearPersistedMatchId();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    joinMatch,
    sendMove,
    leaveMatch,
  };
}
