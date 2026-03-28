import type { CellValue } from "@/types/game";

interface CellProps {
  value: CellValue;
  row: number;
  col: number;
  onClick: (row: number, col: number) => void;
  disabled: boolean;
  isWinning: boolean;
}

export default function Cell({
  value,
  row,
  col,
  onClick,
  disabled,
  isWinning,
}: CellProps) {
  const isEmpty = value === "";
  const isClickable = isEmpty && !disabled;

  function handleClick() {
    if (isClickable) {
      onClick(row, col);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  // Symbol styling
  const symbolClass =
    value === "X"
      ? "text-indigo-500 dark:text-indigo-400"
      : value === "O"
        ? "text-rose-500 dark:text-rose-400"
        : "";

  // Background styling
  const bgClass = isWinning
    ? value === "X"
      ? "bg-indigo-100 dark:bg-indigo-900/40"
      : "bg-rose-100 dark:bg-rose-900/40"
    : "bg-gray-100 dark:bg-gray-700";

  // Cursor styling
  const cursorClass = isClickable
    ? "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500"
    : "cursor-default";

  return (
    <div
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={`Cell ${row},${col}${value ? `: ${value}` : ""}`}
      aria-disabled={!isClickable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex aspect-square items-center justify-center rounded-lg text-4xl font-bold select-none transition-colors sm:text-5xl ${bgClass} ${cursorClass}`}
    >
      {value !== "" && (
        <span
          className={`inline-block animate-[scaleIn_150ms_ease-out] ${symbolClass}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
