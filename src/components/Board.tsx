import type { WinningLine } from "@/types/game";
import type { BoardProps } from "@/types/components";
import Cell from "./Cell";

function isCellWinning(
  row: number,
  col: number,
  winningLine: WinningLine,
): boolean {
  if (!winningLine) return false;
  return winningLine.some(([r, c]) => r === row && c === col);
}

export default function Board({
  board,
  onCellClick,
  winningLine,
  disabled,
}: BoardProps) {
  return (
    <div className="mx-auto w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[400px]">
      <div
        role="grid"
        aria-label="Tic-Tac-Toe board"
        className="grid grid-cols-3 gap-2 rounded-xl bg-gray-200 p-2 dark:bg-gray-800"
      >
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <Cell
              key={`${rowIdx}-${colIdx}`}
              value={cell}
              row={rowIdx}
              col={colIdx}
              onClick={onCellClick}
              disabled={disabled}
              isWinning={isCellWinning(rowIdx, colIdx, winningLine)}
            />
          )),
        )}
      </div>
    </div>
  );
}
