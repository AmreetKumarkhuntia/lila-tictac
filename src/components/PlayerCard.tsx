import type { PlayerInfo, PlayerSymbol } from "@/types/game";
import TimerDisplay from "@/components/TimerDisplay";

interface PlayerCardProps {
  player: PlayerInfo | null;
  symbol: PlayerSymbol;
  isActive: boolean;
  isCurrentUser: boolean;
  /** Timer data — only provided when mode is "timed" */
  timer?: {
    timeRemaining: number;
    timeLimit: number;
  };
}

export default function PlayerCard({
  player,
  symbol,
  isActive,
  isCurrentUser,
  timer,
}: PlayerCardProps) {
  const symbolColor =
    symbol === "X"
      ? "bg-indigo-500 text-white"
      : "bg-rose-500 text-white";

  const activeRing = isActive
    ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 " +
      (symbol === "X"
        ? "ring-indigo-500 dark:ring-indigo-400"
        : "ring-rose-500 dark:ring-rose-400")
    : "";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3 transition-shadow dark:bg-gray-800 ${activeRing}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${symbolColor}`}
      >
        {symbol}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {player?.username ?? "Waiting..."}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isCurrentUser ? "You" : "Opponent"}
          {isActive && (
            <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              &middot; Turn
            </span>
          )}
        </p>
      </div>

      {timer && (
        <TimerDisplay
          timeRemaining={timer.timeRemaining}
          timeLimit={timer.timeLimit}
          isActive={isActive}
        />
      )}
    </div>
  );
}
