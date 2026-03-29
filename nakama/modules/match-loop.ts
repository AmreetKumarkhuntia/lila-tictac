const matchLoop: nkruntime.MatchLoopFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[],
): { state: nkruntime.MatchState } | null {
  const gs = state as GameState;

  if (gs.disconnected !== null && gs.status === "playing") {
    // Compute the tick rate that is actually active for this match.
    // During grace period for classic mode, we bump to GRACE_TICK_RATE.
    const activeTR = gs.mode === "timed" ? 10 : GRACE_TICK_RATE;
    const elapsedSeconds =
      (tick - gs.disconnected.disconnectedAtTick) / activeTR;

    if (elapsedSeconds >= RECONNECT_GRACE_SECONDS) {
      const leavingSymbol = gs.disconnected.symbol;
      const winnerSymbol: PlayerSymbol = leavingSymbol === "X" ? "O" : "X";
      gs.winner = winnerSymbol;
      gs.status = "finished";
      gs.finishedAt = Date.now();
      gs.disconnected = null;
      dispatcher.matchLabelUpdate(
        JSON.stringify({ mode: gs.mode, status: "finished" }),
      );

      dispatcher.broadcastMessage(
        OP_OPPONENT_LEFT,
        JSON.stringify({ winner: winnerSymbol, reason: "disconnect" }),
      );
      submitMatchResult(nk, logger, gs);
      logger.info(
        "grace period expired: %s forfeited, %s wins",
        leavingSymbol,
        winnerSymbol,
      );
      return { state: gs };
    }
  }

  if (gs.mode === "timed" && gs.status === "playing" && gs.timers) {
    const elapsed = (tick - gs.timers.lastMoveAt) / 10; // ticks -> seconds
    gs.timers[gs.currentPlayer] -= elapsed;
    gs.timers.lastMoveAt = tick;

    if (gs.timers[gs.currentPlayer] <= 0) {
      gs.timers[gs.currentPlayer] = 0;
      const opponent: PlayerSymbol = gs.currentPlayer === "X" ? "O" : "X";
      gs.winner = opponent;
      gs.status = "finished";
      gs.finishedAt = Date.now();
      dispatcher.matchLabelUpdate(
        JSON.stringify({ mode: gs.mode, status: "finished" }),
      );
      broadcastGameOver(dispatcher, gs, "timeout");
      submitMatchResult(nk, logger, gs);
      logger.info(
        "game over: %s timed out, %s wins",
        gs.currentPlayer,
        opponent,
      );
      return { state: gs };
    }
  }

  for (const message of messages) {
    if (message.opCode !== OP_MOVE) {
      logger.warn(
        "unknown op code %d from %s",
        message.opCode,
        message.sender.userId,
      );
      continue;
    }

    const senderId = message.sender.userId;
    const senderPresence = message.sender;

    let moveData: { row: number; col: number };
    try {
      moveData = JSON.parse(nk.binaryToString(message.data));
    } catch (e) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Invalid move data" }),
        [senderPresence],
      );
      continue;
    }

    const { row, col } = moveData;

    if (gs.status !== "playing") {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Game has not started yet" }),
        [senderPresence],
      );
      continue;
    }

    const senderSymbol = symbolForUserId(gs, senderId);
    if (senderSymbol === null) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "You are not a player in this game" }),
        [senderPresence],
      );
      continue;
    }

    if (senderSymbol !== gs.currentPlayer) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "It is not your turn" }),
        [senderPresence],
      );
      continue;
    }

    if (row < 0 || row > 2) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Invalid row" }),
        [senderPresence],
      );
      continue;
    }

    if (col < 0 || col > 2) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Invalid column" }),
        [senderPresence],
      );
      continue;
    }

    if (gs.board[row][col] !== "") {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Cell is already taken" }),
        [senderPresence],
      );
      continue;
    }

    gs.board[row][col] = gs.currentPlayer;
    gs.moveCount++;

    if (gs.timers) {
      gs.timers.lastMoveAt = tick;
    }

    const winner = checkWinner(gs.board);
    if (winner !== "") {
      gs.winner = winner;
      gs.status = "finished";
      gs.finishedAt = Date.now();
      dispatcher.matchLabelUpdate(
        JSON.stringify({ mode: gs.mode, status: "finished" }),
      );
      broadcastGameOver(dispatcher, gs, "win");
      submitMatchResult(nk, logger, gs);
      logger.info("game over: %s wins", winner);
    } else if (gs.moveCount === 9) {
      gs.winner = "draw";
      gs.status = "finished";
      gs.finishedAt = Date.now();
      dispatcher.matchLabelUpdate(
        JSON.stringify({ mode: gs.mode, status: "finished" }),
      );
      broadcastGameOver(dispatcher, gs, "draw");
      submitMatchResult(nk, logger, gs);
      logger.info("game over: draw");
    } else {
      gs.currentPlayer = gs.currentPlayer === "X" ? "O" : "X";
      broadcastState(dispatcher, gs);
    }
  }

  return { state: gs };
};
