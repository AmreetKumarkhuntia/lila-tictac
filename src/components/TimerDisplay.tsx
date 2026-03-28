import { useState, useEffect, useRef } from "react";

interface TimerDisplayProps {
  /** Remaining seconds from the server */
  timeRemaining: number;
  /** Total time limit in seconds */
  timeLimit: number;
  /** Whether this player's clock is actively ticking */
  isActive: boolean;
}

function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TimerDisplay({
  timeRemaining,
  timeLimit,
  isActive,
}: TimerDisplayProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const lastServerTime = useRef(timeRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync to server value whenever it changes
  useEffect(() => {
    lastServerTime.current = timeRemaining;
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  // Client-side interpolation when active
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isActive && displayTime > 0) {
      const startedAt = performance.now();
      const startValue = lastServerTime.current;

      intervalRef.current = setInterval(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        const next = Math.max(0, startValue - elapsed);
        setDisplayTime(next);

        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Re-run when active status or server time changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeRemaining]);

  // Color coding based on remaining time
  let colorClass: string;
  let animateClass = "";

  if (displayTime > 10) {
    colorClass = "text-emerald-500 dark:text-emerald-400";
  } else if (displayTime > 5) {
    colorClass = "text-amber-500 dark:text-amber-400";
  } else {
    colorClass = "text-red-500 dark:text-red-400";
    if (isActive && displayTime > 0) {
      animateClass = "animate-pulse";
    }
  }

  // Progress bar width
  const progress = timeLimit > 0 ? Math.max(0, displayTime / timeLimit) : 0;

  // Progress bar color
  let barColor: string;
  if (displayTime > 10) {
    barColor = "bg-emerald-500";
  } else if (displayTime > 5) {
    barColor = "bg-amber-500";
  } else {
    barColor = "bg-red-500";
  }

  return (
    <div className="flex items-center gap-2">
      {/* Progress bar */}
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {/* Time text */}
      <span
        className={`font-mono text-sm font-bold tabular-nums ${colorClass} ${animateClass}`}
      >
        {formatTime(displayTime)}
      </span>
    </div>
  );
}
