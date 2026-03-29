import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { nakamaClient, getSocket, disconnectSocket } from "@/lib/nakama";
import { handleMatchData } from "@/lib/matchDataHandler";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import type { GameMode } from "@/types/game";
import { MatchmakerMatched } from "@heroiclabs/nakama-js";

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

  const findMatch = useCallback(
    async (mode: GameMode) => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return;
      }

      const { matchmakingStatus, matchId } = useGameStore.getState();
      if (matchmakingStatus === "searching") {
        return;
      }

      if (matchId) {
        useUiStore.getState().addToast("You're already in a match", "error");
        return;
      }

      console.log("[matchmaker] findMatch started", {
        mode,
        userId: session.user_id,
      });
      useGameStore.getState().setMatchmakingStatus("searching");
      useUiStore.getState().clearError();

      try {
        const socket = await getSocket(session);
        console.log("[matchmaker] socket connected");

        // Wire up the matched callback before adding the ticket
        socket.onmatchmakermatched = async (matched: MatchmakerMatched) => {
          console.log("[matchmaker] onmatchmakermatched fired", {
            match_id: matched.match_id,
            token: matched.token,
            users: matched.users?.length,
            self: matched.self,
          });

          useGameStore.getState().setMatchmakingStatus("matched");
          useGameStore.getState().setMatchmakingTicket(null);

          if (!matched.match_id) {
            console.error(
              "[matchmaker] no match_id in matched response",
              matched,
            );
            useUiStore.getState().setError("Matchmaker returned no match ID");
            useGameStore.getState().setMatchmakingStatus("idle");
            return;
          }

          try {
            // Wire the match-data handler BEFORE joining so that the
            // GAME_START message the server sends immediately on join
            // is captured (fixes the Quick Play symbol-assignment race).
            socket.onmatchdata = handleMatchData;

            console.log("[matchmaker] joining match", matched.match_id);
            const match = await socket.joinMatch(matched.match_id);
            console.log(
              "[matchmaker] joined match successfully",
              match.match_id,
            );
            useGameStore.getState().setMatchId(match.match_id);
            navigate(`/game/${match.match_id}`);
          } catch (err) {
            console.error("[matchmaker] failed to join matched game:", err);
            useUiStore
              .getState()
              .setError(
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

        console.log("[matchmaker] ticket added", {
          ticket: ticket.ticket,
          mode,
        });
        useGameStore.getState().setMatchmakingTicket(ticket.ticket);
      } catch (err) {
        console.error("[matchmaker] failed to start matchmaking:", err);
        useUiStore
          .getState()
          .setError(
            err instanceof Error ? err.message : "Failed to start matchmaking",
          );
        useGameStore.getState().setMatchmakingStatus("idle");
      }
    },
    [session, navigate],
  );

  const cancelMatchmaking = useCallback(async () => {
    if (!session) return;

    const { matchmakingTicket } = useGameStore.getState();
    console.log("[matchmaker] cancelling", { ticket: matchmakingTicket });

    if (matchmakingTicket) {
      try {
        const socket = await getSocket(session);
        await socket.removeMatchmaker(matchmakingTicket);
        // Clear the matched callback to prevent stale matches from firing
        socket.onmatchmakermatched = () => {};
      } catch (err) {
        console.warn("[matchmaker] error removing ticket:", err);
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

        const payload =
          typeof response.payload === "string"
            ? JSON.parse(response.payload)
            : response.payload;

        useUiStore.getState().setLoading(false);
        return (payload as Record<string, string>).matchId ?? null;
      } catch (err) {
        console.error("Failed to create private match:", err);
        useUiStore
          .getState()
          .setError(
            err instanceof Error
              ? err.message
              : "Failed to create private match",
          );
        useUiStore.getState().setLoading(false);
        return null;
      }
    },
    [session],
  );

  const joinPrivateMatch = useCallback(
    async (matchId: string) => {
      if (!session) {
        useUiStore.getState().setError("Not authenticated");
        return;
      }

      const { matchId: currentMatchId } = useGameStore.getState();
      if (currentMatchId) {
        useUiStore.getState().addToast("You're already in a match", "error");
        return;
      }

      useUiStore.getState().setLoading(true);

      try {
        const socket = await getSocket(session);

        socket.onmatchdata = handleMatchData;

        const match = await socket.joinMatch(matchId);

        useGameStore.getState().setMatchId(match.match_id);
        useUiStore.getState().setLoading(false);
        navigate(`/game/${match.match_id}`);
      } catch (err) {
        console.error("Failed to join private match:", err);
        useUiStore
          .getState()
          .setError(
            err instanceof Error
              ? err.message
              : "Invalid match ID or match is full",
          );
        useUiStore.getState().setLoading(false);
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

        socket.onmatchdata = handleMatchData;

        const match = await socket.joinMatch(matchId);
        useGameStore.getState().setMatchId(match.match_id);
        return match.match_id;
      } catch (err) {
        console.error("Failed to join created match:", err);
        useUiStore
          .getState()
          .setError(
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
