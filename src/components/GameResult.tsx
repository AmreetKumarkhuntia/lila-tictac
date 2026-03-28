import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { GameResultProps } from "@/types/components";

export default function GameResult({
  winner,
  mySymbol,
  reason,
}: GameResultProps) {
  const navigate = useNavigate();
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

  if (reason === "timeout") {
    if (winner === mySymbol) {
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
  } else if (winner === "draw") {
    heading = "It's a Draw!";
    subtext = "Well played by both sides.";
    headingColor = "text-gray-600 dark:text-gray-300";
  } else if (winner === mySymbol) {
    heading = "You Win!";
    subtext = "Congratulations!";
    headingColor = "text-emerald-500 dark:text-emerald-400";
  } else {
    heading = "You Lose";
    subtext = "Better luck next time.";
    headingColor = "text-rose-500 dark:text-rose-400";
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-heading"
      className="animate-[fadeIn_200ms_ease-out] rounded-2xl bg-white/95 p-8 text-center shadow-2xl backdrop-blur-sm dark:bg-gray-900/95"
    >
      <h2 id="game-result-heading" className={`mb-2 text-3xl font-bold ${headingColor}`}>{heading}</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {subtext}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => navigate("/home")}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
        >
          Play Again
        </button>
        <button
          onClick={() => navigate("/home")}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
