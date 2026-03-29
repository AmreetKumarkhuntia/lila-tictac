import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatch";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { clearPersistedMatchId } from "@/hooks/useConnectionStatus";
import { nakamaClient } from "@/lib/nakama";
import { LEADERBOARD_ID } from "@/lib/constants";
import Board from "@/components/Board";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import PlayerCard from "@/sections/PlayerCard";
import GameResult from "@/sections/GameResult";
import type { PlayerStats } from "@/types/leaderboard";

export default function GamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { joinMatch, sendMove, leaveMatch } = useMatch();
  const joinAttempted = useRef(false);

  const storeMatchId = useGameStore((s) => s.matchId);
  const board = useGameStore((s) => s.board);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const mySymbol = useGameStore((s) => s.mySymbol);
  const players = useGameStore((s) => s.players);
  const winner = useGameStore((s) => s.winner);
  const status = useGameStore((s) => s.status);
  const winningLine = useGameStore((s) => s.winningLine);
  const mode = useGameStore((s) => s.mode);
  const timers = useGameStore((s) => s.timers);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const opponentDisconnected = useGameStore((s) => s.opponentDisconnected);
  const movePending = useGameStore((s) => s.movePending);

  const isLoading = useUiStore((s) => s.isLoading);
  const error = useUiStore((s) => s.error);
  const session = useAuthStore((s) => s.session);

  // Post-match stats
  const [postMatchStats, setPostMatchStats] = useState<PlayerStats | null>(
    null,
  );
  const [postMatchRank, setPostMatchRank] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const statsFetched = useRef(false);

  // Derived state
  const isMyTurn = currentPlayer === mySymbol && status === "playing";
  const isGameOver = status === "finished";
  const isWaiting = status === "waiting";

  // Fetch post-match stats once the game ends
  useEffect(() => {
    if (status !== "finished" || statsFetched.current || !session) return;
    statsFetched.current = true;
    setStatsLoading(true);

    (async () => {
      try {
        const [statsResult, aroundOwnerResult] = await Promise.all([
          nakamaClient.rpc(session, "get_player_stats", {}),
          nakamaClient.listLeaderboardRecordsAroundOwner(
            session,
            LEADERBOARD_ID,
            session.user_id!,
            1,
          ),
        ]);

        if (statsResult.payload) {
          setPostMatchStats(statsResult.payload as PlayerStats);
        }

        const ownerRecords = aroundOwnerResult.owner_records ?? [];
        if (ownerRecords[0]) {
          setPostMatchRank(ownerRecords[0].rank ?? null);
        }
      } catch (err) {
        console.error("Failed to fetch post-match stats:", err);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [status, session]);

  // Redirect to home if the match was terminated (storeMatchId becomes null
  // after the MATCH_TERMINATED handler resets the game store).
  useEffect(() => {
    if (joinAttempted.current && !storeMatchId && !isLoading && !error) {
      clearPersistedMatchId();
      navigate("/home", { replace: true });
    }
  }, [storeMatchId, isLoading, error, navigate]);

  // Redirect to home on join failure (error set during the join phase).
  useEffect(() => {
    if (error && !storeMatchId) {
      clearPersistedMatchId();
      navigate("/home", { replace: true });
    }
  }, [error, storeMatchId, navigate]);

  const opponentSymbol = mySymbol === "X" ? "O" : "X";

  const isTimed = mode === "timed" && timers !== null;
  const myTimer =
    isTimed && mySymbol
      ? { timeRemaining: timers[mySymbol], timeLimit: timers.timeLimit }
      : undefined;
  const opponentTimer = isTimed
    ? { timeRemaining: timers[opponentSymbol], timeLimit: timers.timeLimit }
    : undefined;

  // Join match on mount if not already joined (e.g. from matchmaker)
  useEffect(() => {
    if (!matchId) {
      navigate("/home", { replace: true });
      return;
    }

    // If the store already has this matchId, we came from matchmaker — already joined
    if (storeMatchId === matchId) {
      return;
    }

    // Prevent double-join in StrictMode
    if (joinAttempted.current) {
      return;
    }
    joinAttempted.current = true;

    joinMatch(matchId);
  }, [matchId, storeMatchId, joinMatch, navigate]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || isGameOver || movePending) return;
      useGameStore.getState().setMovePending(true);
      sendMove(row, col);
    },
    [isMyTurn, isGameOver, movePending, sendMove],
  );

  const handleLeave = useCallback(() => {
    leaveMatch();
    clearPersistedMatchId();
    navigate("/home", { replace: true });
  }, [leaveMatch, navigate]);

  let statusText: string;
  if (opponentDisconnected) {
    statusText = "Opponent disconnected — waiting for reconnect...";
  } else if (isWaiting) {
    statusText = "Waiting for opponent...";
  } else if (isGameOver) {
    statusText = "Game Over";
  } else if (isMyTurn) {
    statusText = "Your Turn";
  } else {
    statusText = "Opponent's Turn";
  }

  if (isLoading && !storeMatchId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Joining match...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="w-full max-w-sm space-y-4">
        <PlayerCard
          player={players[opponentSymbol]}
          symbol={opponentSymbol}
          isActive={currentPlayer === opponentSymbol && status === "playing"}
          isCurrentUser={false}
          timer={opponentTimer}
        />

        {/* Status bar — live region so screen readers announce changes */}
        <div className="text-center" aria-live="polite" aria-atomic="true">
          <p
            className={`text-sm font-semibold ${
              opponentDisconnected
                ? "animate-pulse text-amber-600 dark:text-amber-400"
                : isMyTurn
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isGameOver
                    ? "text-gray-500 dark:text-gray-400"
                    : isWaiting
                      ? "animate-pulse text-amber-600 dark:text-amber-400"
                      : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {statusText}
          </p>
        </div>

        <Board
          board={board}
          onCellClick={handleCellClick}
          winningLine={winningLine}
          disabled={
            !isMyTurn ||
            isGameOver ||
            isWaiting ||
            opponentDisconnected ||
            movePending
          }
        />

        {mySymbol && (
          <PlayerCard
            player={players[mySymbol]}
            symbol={mySymbol}
            isActive={isMyTurn}
            isCurrentUser={true}
            timer={myTimer}
          />
        )}

        {!isGameOver && (
          <Button
            variant="secondary"
            onClick={handleLeave}
            fullWidth
            size="sm"
          >
            Leave Match
          </Button>
        )}
      </div>

      {isGameOver && winner !== "" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="presentation"
        >
          <GameResult
            winner={winner}
            mySymbol={mySymbol}
            reason={gameOverReason ?? undefined}
            onLeave={handleLeave}
            stats={postMatchStats}
            rank={postMatchRank}
            statsLoading={statsLoading}
          />
        </div>
      )}
    </div>
  );
}
