import { useEffect, useRef } from "react";
import type { GameResultProps } from "@/types/components";
import { SCORE_WIN, SCORE_DRAW } from "@/lib/constants";

export default function GameResult({
  winner,
  mySymbol,
  reason,
  onLeave,
  stats,
  rank,
  statsLoading,
}: GameResultProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const firstBtn = el.querySelector<HTMLElement>("button");
    firstBtn?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !el) return;

      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  let heading: string;
  let subtext: string;
  let headingColor: string;

  const isWin = winner === mySymbol;
  const isDraw = winner === "draw";

  if (reason === "timeout") {
    if (isWin) {
      heading = "Time's Up!";
      subtext = "Your opponent ran out of time. You win!";
      headingColor = "text-amber-500 dark:text-amber-400";
    } else {
      heading = "Time's Up!";
      subtext = "You ran out of time.";
      headingColor = "text-rose-500 dark:text-rose-400";
    }
  } else if (reason === "forfeit") {
    heading = "Opponent Left";
    subtext = "You win by forfeit!";
    headingColor = "text-amber-500 dark:text-amber-400";
  } else if (isDraw) {
    heading = "It's a Draw!";
    subtext = "Well played by both sides.";
    headingColor = "text-gray-600 dark:text-gray-300";
  } else if (isWin) {
    heading = "You Win!";
    subtext = "Congratulations!";
    headingColor = "text-emerald-500 dark:text-emerald-400";
  } else {
    heading = "You Lose";
    subtext = "Better luck next time.";
    headingColor = "text-rose-500 dark:text-rose-400";
  }

  const scoreEarned = isWin || reason === "forfeit"
    ? SCORE_WIN
    : isDraw
      ? SCORE_DRAW
      : 0;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-heading"
      className="animate-[fadeIn_200ms_ease-out] rounded-2xl bg-white/95 p-8 text-center shadow-2xl backdrop-blur-sm dark:bg-gray-900/95"
    >
      <h2 id="game-result-heading" className={`mb-2 text-3xl font-bold ${headingColor}`}>{heading}</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {subtext}
      </p>

      {/* Score earned badge */}
      <div className="mb-4">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          scoreEarned > 0
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        }`}>
          +{scoreEarned} point{scoreEarned !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Post-match stats */}
      {statsLoading && (
        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500 dark:border-gray-600 dark:border-t-gray-400" />
          Loading stats...
        </div>
      )}

      {stats && !statsLoading && (
        <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.wins}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Wins</p>
            </div>
            <div>
              <p className="text-lg font-bold text-rose-500 dark:text-rose-400">{stats.losses}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Losses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-500 dark:text-gray-300">{stats.draws}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">Draws</p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-4 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {stats.currentStreak > 0 && (
              <span>Streak: <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.currentStreak}</span></span>
            )}
            {rank != null && (
              <span>Rank: <span className="font-semibold text-indigo-600 dark:text-indigo-400">#{rank}</span></span>
            )}
            {stats.winRate > 0 && (
              <span>Win rate: <span className="font-semibold">{stats.winRate}%</span></span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onLeave}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
        >
          Play Again
        </button>
        <button
          onClick={onLeave}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
