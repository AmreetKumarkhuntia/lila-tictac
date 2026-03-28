import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { nakamaClient, getSocket, disconnectSocket } from "@/lib/nakama";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import type { GameMode } from "@/types/game";

/**
 * useMatchmaker — manages the matchmaker ticket lifecycle for Quick Play.
 *
 * Flow:
 *  1. `findMatch(mode)` connects the shared socket, wires up `onmatchmakermatched`,
 *     and adds a matchmaker ticket with a mode-based query.
 *  2. When Nakama finds an opponent, `onmatchmakermatched` fires — we join the
 *     match and navigate to `/game/:matchId`.
 *  3. `cancelMatchmaking()` removes the ticket and resets state.
 */
export function useMatchmaker() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);

  /**
   * Start searching for an opponent via Nakama's matchmaker.
   */
  const findMatch = useCallback(
    async (mode: GameMode) => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return;
      }

      const { matchmakingStatus } = useGameStore.getState();
      if (matchmakingStatus === "searching") {
        return; // Already searching
      }

      useGameStore.getState().setMatchmakingStatus("searching");
      useUiStore.getState().clearError();

      try {
        const socket = await getSocket(session);

        // Wire up the matched callback before adding the ticket
        socket.onmatchmakermatched = async (matched) => {
          useGameStore.getState().setMatchmakingStatus("matched");
          useGameStore.getState().setMatchmakingTicket(null);

          if (!matched.match_id) {
            useUiStore.getState().setError("Matchmaker returned no match ID");
            useGameStore.getState().setMatchmakingStatus("idle");
            return;
          }

          try {
            // Join the match via the socket (handlers will be wired by useMatch
            // when the GamePage mounts — for now we just need the match ID)
            const match = await socket.joinMatch(matched.match_id);
            useGameStore.getState().setMatchId(match.match_id);
            navigate(`/game/${match.match_id}`);
          } catch (err) {
            console.error("Failed to join matched game:", err);
            useUiStore.getState().setError(
              err instanceof Error ? err.message : "Failed to join match",
            );
            useGameStore.getState().setMatchmakingStatus("idle");
          }
        };

        // Add matchmaker ticket
        // Query: match only players searching for the same game mode
        const ticket = await socket.addMatchmaker(
          `+properties.mode:${mode}`,
          2, // minCount
          2, // maxCount
          { mode }, // stringProperties
        );

        useGameStore.getState().setMatchmakingTicket(ticket.ticket);
      } catch (err) {
        console.error("Failed to start matchmaking:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Failed to start matchmaking",
        );
        useGameStore.getState().setMatchmakingStatus("idle");
      }
    },
    [session, navigate],
  );

  /**
   * Cancel an active matchmaking search.
   */
  const cancelMatchmaking = useCallback(async () => {
    if (!session) return;

    const { matchmakingTicket } = useGameStore.getState();

    if (matchmakingTicket) {
      try {
        const socket = await getSocket(session);
        await socket.removeMatchmaker(matchmakingTicket);
      } catch (err) {
        console.warn("Error removing matchmaker ticket:", err);
      }
    }

    useGameStore.getState().setMatchmakingStatus("idle");
    useGameStore.getState().setMatchmakingTicket(null);
  }, [session]);

  /**
   * Create a private match via the server RPC and return the match ID.
   * The caller is responsible for sharing this ID with the opponent.
   */
  const createPrivateMatch = useCallback(
    async (mode: GameMode): Promise<string | null> => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return null;
      }

      useUiStore.getState().setLoading(true);

      try {
        const response = await nakamaClient.rpc(
          session,
          "create_private_match",
          { mode },
        );

        const payload = typeof response.payload === "string"
          ? JSON.parse(response.payload)
          : response.payload;

        useUiStore.getState().setLoading(false);
        return (payload as Record<string, string>).matchId ?? null;
      } catch (err) {
        console.error("Failed to create private match:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Failed to create private match",
        );
        return null;
      }
    },
    [session],
  );

  /**
   * Join an existing match by ID (used for private matches).
   * Connects the shared socket and joins the match, then navigates to the game.
   */
  const joinPrivateMatch = useCallback(
    async (matchId: string) => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return;
      }

      useUiStore.getState().setLoading(true);

      try {
        const socket = await getSocket(session);
        const match = await socket.joinMatch(matchId);

        useGameStore.getState().setMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
        navigate(`/game/${match.match_id}`);
      } catch (err) {
        console.error("Failed to join private match:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Invalid match ID or match is full",
        );
      }
    },
    [session, navigate],
  );

  /**
   * Create a private match AND immediately join it, then navigate.
   * Returns the match ID so the caller can display it for sharing.
   */
  const createAndJoinPrivateMatch = useCallback(
    async (mode: GameMode): Promise<string | null> => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return null;
      }

      const matchId = await createPrivateMatch(mode);
      if (!matchId) return null;

      try {
        const socket = await getSocket(session);
        const match = await socket.joinMatch(matchId);
        useGameStore.getState().setMatchId(match.match_id);
        return match.match_id;
      } catch (err) {
        console.error("Failed to join created match:", err);
        useUiStore.getState().setError(
          err instanceof Error ? err.message : "Failed to join match",
        );
        disconnectSocket();
        return null;
      }
    },
    [session, createPrivateMatch],
  );

  return {
    findMatch,
    cancelMatchmaking,
    createPrivateMatch,
    joinPrivateMatch,
    createAndJoinPrivateMatch,
  };
}
