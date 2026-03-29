function createEmptyBoard(): CellValue[][] {
  return [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
}

function checkWinner(board: CellValue[][]): "" | PlayerSymbol {
  for (const line of WIN_LINES) {
    const va = board[line[0]][line[1]];
    const vb = board[line[2]][line[3]];
    const vc = board[line[4]][line[5]];
    if (va !== "" && va === vb && vb === vc) {
      return va as PlayerSymbol;
    }
  }
  return "";
}

function findWinningLine(board: CellValue[][]): [number, number][] | null {
  for (const line of WIN_LINES) {
    const va = board[line[0]][line[1]];
    const vb = board[line[2]][line[3]];
    const vc = board[line[4]][line[5]];
    if (va !== "" && va === vb && vb === vc) {
      return [
        [line[0], line[1]],
        [line[2], line[3]],
        [line[4], line[5]],
      ];
    }
  }
  return null;
}

function symbolForUserId(
  state: GameState,
  userId: string,
): PlayerSymbol | null {
  if (state.players.X === userId) return "X";
  if (state.players.O === userId) return "O";
  return null;
}

function broadcastState(
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState,
) {
  const data: string = JSON.stringify({
    board: state.board,
    currentPlayer: state.currentPlayer,
    moveCount: state.moveCount,
    status: state.status,
    timers: state.timers
      ? {
          X: state.timers.X,
          O: state.timers.O,
          timeLimit: state.timers.timeLimit,
        }
      : null,
    opponentDisconnected: state.disconnected !== null,
  });
  dispatcher.broadcastMessage(OP_STATE_UPDATE, data);
}

function broadcastGameOver(
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState,
  reason: "win" | "draw" | "timeout" | "forfeit",
) {
  const data = JSON.stringify({
    winner: state.winner,
    board: state.board,
    winningLine: findWinningLine(state.board),
    reason,
  });
  dispatcher.broadcastMessage(OP_GAME_OVER, data);
}
