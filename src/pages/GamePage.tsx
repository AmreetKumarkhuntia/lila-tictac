import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMatch } from "@/hooks/useMatch";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import Board from "@/components/Board";
import PlayerCard from "@/components/PlayerCard";
import GameResult from "@/components/GameResult";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function GamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { joinMatch, sendMove, leaveMatch } = useMatch();
  const joinAttempted = useRef(false);

  // Game state selectors
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

  const isLoading = useUiStore((s) => s.isLoading);

  // Derived state
  const isMyTurn = currentPlayer === mySymbol && status === "playing";
  const isGameOver = status === "finished";
  const isWaiting = status === "waiting";

  // Determine opponent symbol
  const opponentSymbol = mySymbol === "X" ? "O" : "X";

  // Timer data for player cards (timed mode only)
  const isTimed = mode === "timed" && timers !== null;
  const myTimer = isTimed && mySymbol
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
      if (!isMyTurn || isGameOver) return;
      sendMove(row, col);
    },
    [isMyTurn, isGameOver, sendMove],
  );

  const handleLeave = useCallback(() => {
    leaveMatch();
    navigate("/home", { replace: true });
  }, [leaveMatch, navigate]);

  // Status text
  let statusText: string;
  if (isWaiting) {
    statusText = "Waiting for opponent...";
  } else if (isGameOver) {
    statusText = "Game Over";
  } else if (isMyTurn) {
    statusText = "Your Turn";
  } else {
    statusText = "Opponent's Turn";
  }

  // Loading state — joining match
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
        {/* Opponent card (top) */}
        <PlayerCard
          player={players[opponentSymbol]}
          symbol={opponentSymbol}
          isActive={currentPlayer === opponentSymbol && status === "playing"}
          isCurrentUser={false}
          timer={opponentTimer}
        />

        {/* Status bar */}
        <div className="text-center">
          <p
            className={`text-sm font-semibold ${
              isMyTurn
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

        {/* Board */}
        <Board
          board={board}
          onCellClick={handleCellClick}
          winningLine={winningLine}
          disabled={!isMyTurn || isGameOver || isWaiting}
        />

        {/* Current user card (bottom) */}
        {mySymbol && (
          <PlayerCard
            player={players[mySymbol]}
            symbol={mySymbol}
            isActive={isMyTurn}
            isCurrentUser={true}
            timer={myTimer}
          />
        )}

        {/* Leave match button */}
        {!isGameOver && (
          <button
            onClick={handleLeave}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
          >
            Leave Match
          </button>
        )}
      </div>

      {/* Game result overlay */}
      {isGameOver && winner !== "" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <GameResult
            winner={winner}
            mySymbol={mySymbol}
            reason={gameOverReason ?? undefined}
          />
        </div>
      )}
    </div>
  );
}
