import { useCallback } from "react";
import { getSocket, disconnectSocket } from "@/lib/nakama";
import { handleMatchData } from "@/lib/matchDataHandler";
import { persistMatchId, clearPersistedMatchId } from "@/hooks/useConnectionStatus";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { OP_CODE } from "@/lib/constants";

export function useMatch() {
  const session = useAuthStore((s) => s.session);

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

        console.log("[match] joining match", matchId);
        const match = await socket.joinMatch(matchId);
        console.log("[match] joined successfully", match.match_id);

        useGameStore.getState().setMatchId(match.match_id);
        persistMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
      } catch (err) {
        console.error("Failed to join match:", err);
        const message = err instanceof Error ? err.message : "Failed to join match";
        useUiStore.getState().setError(message);
        useUiStore.getState().setLoading(false);
        clearPersistedMatchId();
      }
    },
    [session],
  );

  const sendMove = useCallback(
    async (row: number, col: number) => {
      if (!session) return;

      const matchId = useGameStore.getState().matchId;
      if (!matchId) {
        console.error("Cannot send move: no matchId in store");
        return;
      }

      const socket = await getSocket(session);
      const data = JSON.stringify({ row, col });
      await socket.sendMatchState(matchId, OP_CODE.MOVE, data);
    },
    [session],
  );

  const leaveMatch = useCallback(async () => {
    const matchId = useGameStore.getState().matchId;

    if (session && matchId) {
      try {
        const socket = await getSocket(session);
        await socket.leaveMatch(matchId);
      } catch (err) {
        console.warn("Error leaving match:", err);
      }
    }

    disconnectSocket();
    clearPersistedMatchId();
    useGameStore.getState().resetGame();
  }, [session]);

  return {
    joinMatch,
    sendMove,
    leaveMatch,
  };
}
