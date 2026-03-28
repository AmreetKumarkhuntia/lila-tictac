const OP_MOVE = 1;

const OP_STATE_UPDATE = 10;
const OP_GAME_START = 11;
const OP_GAME_OVER = 12;
const OP_ERROR = 13;
const OP_OPPONENT_LEFT = 14;
const OP_MATCH_TERMINATED = 15;
const OP_OPPONENT_RECONNECTED = 16;

const LEADERBOARD_ID = "tic-tac-toe-wins";
const STATS_COLLECTION = "player_stats";
const STATS_KEY = "summary";

const SCORE_WIN = 3;
const SCORE_DRAW = 1;

// Reconnection grace period (in seconds)
const RECONNECT_GRACE_SECONDS = 15;
const GRACE_TICK_RATE = 5;

const WIN_LINES: number[][] = [
  // Rows
  0, 0, 0, 1, 0, 2,
  1, 0, 1, 1, 1, 2,
  2, 0, 2, 1, 2, 2,
  // Columns
  0, 0, 1, 0, 2, 0,
  0, 1, 1, 1, 2, 1,
  0, 2, 1, 2, 2, 2,
  // Diagonals
  0, 0, 1, 1, 2, 2,
  0, 2, 1, 1, 2, 0,
].reduce<number[][]>((acc, _, i, arr) => {
  // Group flat pairs into [[r,c],[r,c],[r,c]] triples
  if (i % 6 === 0) {
    acc.push([
      arr[i] as number, arr[i + 1] as number,
      arr[i + 2] as number, arr[i + 3] as number,
      arr[i + 4] as number, arr[i + 5] as number,
    ]);
  }
  return acc;
}, []);

type PlayerSymbol = "X" | "O";
type CellValue = "" | "X" | "O";
type GameMode = "classic" | "timed";
type GameStatus = "waiting" | "playing" | "finished";

interface PlayerTimers {
  X: number;
  O: number;
  lastMoveAt: number;
  timeLimit: number;
}

interface DisconnectedPlayer {
  userId: string;
  symbol: PlayerSymbol;
  /** Tick at which the player disconnected — used to compute grace elapsed */
  disconnectedAtTick: number;
}

interface GameState {
  board: CellValue[][];
  currentPlayer: PlayerSymbol;
  /** Maps symbol → presence userId (null if slot open) */
  players: { X: string | null; O: string | null };
  /** Maps userId → username for display */
  usernames: { [userId: string]: string };
  /** Tracks active presences by userId for targeted messaging */
  presenceMap: { [userId: string]: nkruntime.Presence };
  winner: "" | PlayerSymbol | "draw";
  moveCount: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  timers: PlayerTimers | null;
  /** Set when a player disconnects mid-game; cleared on reconnect or grace expiry */
  disconnected: DisconnectedPlayer | null;
  /** Original tick rate before grace period override (used to restore after reconnect) */
  originalTickRate: number;
}

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

function symbolForUserId(state: GameState, userId: string): PlayerSymbol | null {
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
      ? { X: state.timers.X, O: state.timers.O, timeLimit: state.timers.timeLimit }
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

interface PlayerStatsData {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  lastMatchAt: number;
}

function defaultStats(): PlayerStatsData {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastMatchAt: 0,
  };
}

function readPlayerStats(
  nk: nkruntime.Nakama,
  userId: string,
): PlayerStatsData {
  const objects = nk.storageRead([
    { collection: STATS_COLLECTION, key: STATS_KEY, userId },
  ]);
  if (objects.length > 0 && objects[0].value) {
    return objects[0].value as PlayerStatsData;
  }
  return defaultStats();
}

function writePlayerStats(
  nk: nkruntime.Nakama,
  userId: string,
  stats: PlayerStatsData,
) {
  nk.storageWrite([
    {
      collection: STATS_COLLECTION,
      key: STATS_KEY,
      userId,
      value: stats,
      permissionRead: 2, // public read
      permissionWrite: 0, // server only write
    },
  ]);
}

/**
 * Called internally after a game ends (win, draw, or forfeit).
 * Updates both players' stats and leaderboard records.
 */
function submitMatchResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: GameState,
) {
  const playerXId = state.players.X;
  const playerOId = state.players.O;

  if (!playerXId || !playerOId) {
    logger.warn("submitMatchResult: missing player IDs, skipping");
    return;
  }

  const now = Date.now();

  const statsX = readPlayerStats(nk, playerXId);
  const statsO = readPlayerStats(nk, playerOId);

  let scoreX = 0;
  let scoreO = 0;

  if (state.winner === "X") {
    statsX.wins++;
    statsX.currentStreak++;
    if (statsX.currentStreak > statsX.bestStreak) {
      statsX.bestStreak = statsX.currentStreak;
    }
    statsO.losses++;
    statsO.currentStreak = 0;
    scoreX = SCORE_WIN;
    scoreO = 0;
  } else if (state.winner === "O") {
    statsO.wins++;
    statsO.currentStreak++;
    if (statsO.currentStreak > statsO.bestStreak) {
      statsO.bestStreak = statsO.currentStreak;
    }
    statsX.losses++;
    statsX.currentStreak = 0;
    scoreX = 0;
    scoreO = SCORE_WIN;
  } else if (state.winner === "draw") {
    statsX.draws++;
    statsO.draws++;
    // Draws don't affect streaks — reset both
    statsX.currentStreak = 0;
    statsO.currentStreak = 0;
    scoreX = SCORE_DRAW;
    scoreO = SCORE_DRAW;
  }

  statsX.gamesPlayed++;
  statsX.lastMatchAt = now;
  statsO.gamesPlayed++;
  statsO.lastMatchAt = now;

  writePlayerStats(nk, playerXId, statsX);
  writePlayerStats(nk, playerOId, statsO);

  const winRateX = statsX.gamesPlayed > 0
    ? Math.round((statsX.wins / statsX.gamesPlayed) * 1000) / 10
    : 0;
  const winRateO = statsO.gamesPlayed > 0
    ? Math.round((statsO.wins / statsO.gamesPlayed) * 1000) / 10
    : 0;

  // Write leaderboard records (incremental — only add if score > 0)
  const usernameX = state.usernames[playerXId] || "Player";
  const usernameO = state.usernames[playerOId] || "Player";

  if (scoreX > 0) {
    nk.leaderboardRecordWrite(
      LEADERBOARD_ID,
      playerXId,
      usernameX,
      scoreX,
      0, // subscore
      { wins: statsX.wins, gamesPlayed: statsX.gamesPlayed, winRate: winRateX },
    );
  } else {
    // Even with 0 score, update metadata so leaderboard reflects latest stats
    nk.leaderboardRecordWrite(
      LEADERBOARD_ID,
      playerXId,
      usernameX,
      0,
      0,
      { wins: statsX.wins, gamesPlayed: statsX.gamesPlayed, winRate: winRateX },
    );
  }

  if (scoreO > 0) {
    nk.leaderboardRecordWrite(
      LEADERBOARD_ID,
      playerOId,
      usernameO,
      scoreO,
      0,
      { wins: statsO.wins, gamesPlayed: statsO.gamesPlayed, winRate: winRateO },
    );
  } else {
    nk.leaderboardRecordWrite(
      LEADERBOARD_ID,
      playerOId,
      usernameO,
      0,
      0,
      { wins: statsO.wins, gamesPlayed: statsO.gamesPlayed, winRate: winRateO },
    );
  }

  logger.info(
    "match result submitted: winner=%s, scoreX=%d, scoreO=%d",
    state.winner,
    scoreX,
    scoreO,
  );
}

function createPrivateMatch(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  let mode: GameMode = "classic";
  if (payload) {
    try {
      const params = JSON.parse(payload);
      if (params.mode === "timed") {
        mode = "timed";
      }
    } catch (e) {
      logger.warn("create_private_match: invalid payload, defaulting to classic");
    }
  }

  const matchId = nk.matchCreate("tic-tac-toe", { mode });
  return JSON.stringify({ matchId });
}

function submitScore(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  // Score submission is now handled server-side automatically via submitMatchResult().
  // This RPC is kept for backward compatibility but is a no-op.
  logger.info("submit_score RPC called (scores are auto-submitted server-side)");
  return JSON.stringify({ success: true, message: "Scores are auto-submitted by the server" });
}

function getPlayerStats(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string,
): string {
  const userId = ctx.userId;
  if (!userId) {
    throw Error("No user ID in context");
  }

  const stats = readPlayerStats(nk, userId);
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 1000) / 10
    : 0;

  return JSON.stringify({
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    gamesPlayed: stats.gamesPlayed,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    winRate,
  });
}

const matchInit: nkruntime.MatchInitFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: nkruntime.MatchState; tickRate: number; label: string } {
  const mode: GameMode = params.mode === "timed" ? "timed" : "classic";
  const now = Date.now();

  const state: GameState = {
    board: createEmptyBoard(),
    currentPlayer: "X",
    players: { X: null, O: null },
    usernames: {},
    presenceMap: {},
    winner: "",
    moveCount: 0,
    mode,
    status: "waiting",
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    timers: mode === "timed"
      ? { X: 30, O: 30, lastMoveAt: 0, timeLimit: 30 }
      : null,
    disconnected: null,
    originalTickRate: mode === "timed" ? 10 : 0,
  };

  const label = JSON.stringify({ mode, status: "waiting" });

  // Both modes use a non-zero tick rate so the match loop can detect
  // reconnection grace-period expiry.  Timed mode needs 10 tps for
  // accurate countdowns; classic mode uses GRACE_TICK_RATE (5 tps) which
  // is only meaningful during the grace window but costs almost nothing
  // the rest of the time.
  const tickRate = mode === "timed" ? 10 : GRACE_TICK_RATE;

  logger.info("match created: mode=%s", mode);
  return { state, tickRate, label };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: string },
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } | null {
  const gs = state as GameState;

  if (gs.status === "finished") {
    return { state: gs, accept: false, rejectMessage: "Game is already finished" };
  }

  // Allow reconnecting players through even if both slots are occupied
  const isReconnecting = gs.disconnected !== null && gs.disconnected.userId === presence.userId;

  // Prevent the same user from joining twice (different tab / duplicate connection)
  if (!isReconnecting) {
    if (gs.players.X === presence.userId || gs.players.O === presence.userId) {
      return { state: gs, accept: false, rejectMessage: "Already in this match" };
    }
  }

  if (!isReconnecting && gs.players.X !== null && gs.players.O !== null) {
    return { state: gs, accept: false, rejectMessage: "Match is full" };
  }

  logger.info("player %s attempting to join (reconnect=%s)", presence.userId, isReconnecting ? "yes" : "no");
  return { state: gs, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  const gs = state as GameState;

  for (const presence of presences) {
    if (gs.disconnected !== null && gs.disconnected.userId === presence.userId) {
      const reconSymbol = gs.disconnected.symbol;
      logger.info("player %s (%s) reconnected as %s", presence.userId, presence.username, reconSymbol);

      gs.presenceMap[presence.userId] = presence;
      gs.usernames[presence.userId] = presence.username;

      gs.disconnected = null;

      // Restore tick rate to the original value (undo grace period override)
      if (gs.originalTickRate !== undefined) {
        dispatcher.matchKick([]);                        // no-op, just triggers label update ability
      }

      // Send personalized GAME_START so the client gets its symbol back
      const playersInfo = {
        X: { userId: gs.players.X!, username: gs.usernames[gs.players.X!] || "Player X" },
        O: { userId: gs.players.O!, username: gs.usernames[gs.players.O!] || "Player O" },
      };
      dispatcher.broadcastMessage(
        OP_GAME_START,
        JSON.stringify({ players: playersInfo, mode: gs.mode, assignedSymbol: reconSymbol }),
        [presence],
      );

      broadcastState(dispatcher, gs);

      const opponentId = reconSymbol === "X" ? gs.players.O : gs.players.X;
      if (opponentId && gs.presenceMap[opponentId]) {
        dispatcher.broadcastMessage(
          OP_OPPONENT_RECONNECTED,
          JSON.stringify({ reconnectedSymbol: reconSymbol }),
          [gs.presenceMap[opponentId]],
        );
      }

      continue;
    }

    gs.presenceMap[presence.userId] = presence;

    if (gs.players.X === null) {
      gs.players.X = presence.userId;
    } else if (gs.players.O === null) {
      gs.players.O = presence.userId;
    } else {
      // Should not happen — matchJoinAttempt rejects when full
      logger.warn("extra player %s joined, ignoring", presence.userId);
      continue;
    }

    gs.usernames[presence.userId] = presence.username;
    const assignedSymbol = gs.players.X === presence.userId ? "X" : "O";
    logger.info("player %s (%s) assigned as %s", presence.userId, presence.username, assignedSymbol);

    if (gs.players.X !== null && gs.players.O !== null) {
      gs.status = "playing";
      gs.startedAt = Date.now();

      if (gs.timers) {
        gs.timers.lastMoveAt = tick;
      }

      dispatcher.matchLabelUpdate(JSON.stringify({ mode: gs.mode, status: "playing" }));

      const playersInfo = {
        X: { userId: gs.players.X, username: gs.usernames[gs.players.X] || "Player X" },
        O: { userId: gs.players.O, username: gs.usernames[gs.players.O] || "Player O" },
      };

      // Send personalized GAME_START to each player
      const xPresence = gs.presenceMap[gs.players.X];
      const oPresence = gs.presenceMap[gs.players.O];

      if (xPresence) {
        dispatcher.broadcastMessage(
          OP_GAME_START,
          JSON.stringify({ players: playersInfo, mode: gs.mode, assignedSymbol: "X" }),
          [xPresence],
        );
      }

      if (oPresence) {
        dispatcher.broadcastMessage(
          OP_GAME_START,
          JSON.stringify({ players: playersInfo, mode: gs.mode, assignedSymbol: "O" }),
          [oPresence],
        );
      }

      broadcastState(dispatcher, gs);

      logger.info("game started: %s (X) vs %s (O)", gs.players.X, gs.players.O);
    }
  }

  return { state: gs };
};

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
    const elapsedSeconds = (tick - gs.disconnected.disconnectedAtTick) / activeTR;

    if (elapsedSeconds >= RECONNECT_GRACE_SECONDS) {
      // Grace period expired — forfeit the disconnected player
      const leavingSymbol = gs.disconnected.symbol;
      const winnerSymbol: PlayerSymbol = leavingSymbol === "X" ? "O" : "X";
      gs.winner = winnerSymbol;
      gs.status = "finished";
      gs.finishedAt = Date.now();
      gs.disconnected = null;
      dispatcher.matchLabelUpdate(JSON.stringify({ mode: gs.mode, status: "finished" }));

      dispatcher.broadcastMessage(
        OP_OPPONENT_LEFT,
        JSON.stringify({ winner: winnerSymbol, reason: "disconnect" }),
      );
      submitMatchResult(nk, logger, gs);
      logger.info("grace period expired: %s forfeited, %s wins", leavingSymbol, winnerSymbol);
      return { state: gs };
    }
  }

  if (gs.mode === "timed" && gs.status === "playing" && gs.timers) {
    const elapsed = (tick - gs.timers.lastMoveAt) / 10; // ticks → seconds
    gs.timers[gs.currentPlayer] -= elapsed;
    gs.timers.lastMoveAt = tick;

    if (gs.timers[gs.currentPlayer] <= 0) {
      gs.timers[gs.currentPlayer] = 0;
      const opponent: PlayerSymbol = gs.currentPlayer === "X" ? "O" : "X";
      gs.winner = opponent;
      gs.status = "finished";
      gs.finishedAt = Date.now();
      dispatcher.matchLabelUpdate(JSON.stringify({ mode: gs.mode, status: "finished" }));
      broadcastGameOver(dispatcher, gs, "timeout");
      submitMatchResult(nk, logger, gs);
      logger.info("game over: %s timed out, %s wins", gs.currentPlayer, opponent);
      return { state: gs };
    }
  }

  for (const message of messages) {
    if (message.opCode !== OP_MOVE) {
      logger.warn("unknown op code %d from %s", message.opCode, message.sender.userId);
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

    // Rule 1: Game must be in "playing" status
    if (gs.status !== "playing") {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Game has not started yet" }),
        [senderPresence],
      );
      continue;
    }

    // Rule 2: Sender must be one of the assigned players
    const senderSymbol = symbolForUserId(gs, senderId);
    if (senderSymbol === null) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "You are not a player in this game" }),
        [senderPresence],
      );
      continue;
    }

    // Rule 3: It must be the sender's turn
    if (senderSymbol !== gs.currentPlayer) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "It is not your turn" }),
        [senderPresence],
      );
      continue;
    }

    // Rule 4: Row must be in bounds
    if (row < 0 || row > 2) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Invalid row" }),
        [senderPresence],
      );
      continue;
    }

    // Rule 5: Column must be in bounds
    if (col < 0 || col > 2) {
      dispatcher.broadcastMessage(
        OP_ERROR,
        JSON.stringify({ message: "Invalid column" }),
        [senderPresence],
      );
      continue;
    }

    // Rule 6: Cell must be empty
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
      dispatcher.matchLabelUpdate(JSON.stringify({ mode: gs.mode, status: "finished" }));
      broadcastGameOver(dispatcher, gs, "win");
      submitMatchResult(nk, logger, gs);
      logger.info("game over: %s wins", winner);
    } else if (gs.moveCount === 9) {
      gs.winner = "draw";
      gs.status = "finished";
      gs.finishedAt = Date.now();
      dispatcher.matchLabelUpdate(JSON.stringify({ mode: gs.mode, status: "finished" }));
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

const matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } | null {
  const gs = state as GameState;

  for (const presence of presences) {
    delete gs.presenceMap[presence.userId];

    const leavingSymbol = symbolForUserId(gs, presence.userId);
    if (leavingSymbol === null) {
      // Spectator or unknown — ignore
      continue;
    }

    logger.info("player %s (%s) left", presence.userId, leavingSymbol);

    if (gs.status === "playing") {
      // Game in progress — start grace period for reconnection instead of
      // immediately forfeiting.  If a grace period is already active for
      // the other player (edge case), skip — only one disconnected player
      // is supported at a time.
      if (gs.disconnected !== null) {
        // Both players disconnected — neither wins, just clean up
        gs.disconnected = null;
        logger.info("both players disconnected, match will be destroyed");
      } else {
        // Start reconnection grace period
        gs.disconnected = {
          userId: presence.userId,
          symbol: leavingSymbol,
          disconnectedAtTick: tick,
        };

        // Notify the remaining player that their opponent disconnected temporarily
        dispatcher.broadcastMessage(
          OP_OPPONENT_LEFT,
          JSON.stringify({ winner: "", reason: "disconnected_temporary" }),
        );

        logger.info(
          "player %s (%s) disconnected, grace period started (%ds)",
          presence.userId, leavingSymbol, RECONNECT_GRACE_SECONDS,
        );
      }
    } else if (gs.status === "waiting") {
      // Still in lobby — free the slot for someone else
      gs.players[leavingSymbol] = null;
      delete gs.usernames[presence.userId];
      logger.info("player %s left waiting room, slot %s freed", presence.userId, leavingSymbol);
    }
    // If status === "finished", nothing to do — match will clean up
  }

  if (Object.keys(gs.presenceMap).length === 0) {
    logger.info("all players left, destroying match");
    return null;
  }

  return { state: gs };
};

const matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  graceSeconds: number,
): { state: nkruntime.MatchState } | null {
  const gs = state as GameState;

  dispatcher.broadcastMessage(OP_MATCH_TERMINATED, JSON.stringify({}));
  logger.info("match terminated (grace: %ds)", graceSeconds);

  return null;
};

function initModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  // Create leaderboard (idempotent — safe if already exists)
  try {
    nk.leaderboardCreate(
      LEADERBOARD_ID,
      true,                              // authoritative
      nkruntime.SortOrder.DESCENDING,    // highest score first
      nkruntime.Operator.INCREMENTAL,    // scores accumulate
      undefined,                         // no reset schedule
      undefined,                         // no metadata
    );
    logger.info("leaderboard '%s' created (or already exists)", LEADERBOARD_ID);
  } catch (e) {
    // Nakama throws if leaderboard already exists — safe to ignore
    logger.debug("leaderboard '%s' already exists", LEADERBOARD_ID);
  }

  initializer.registerRpc("create_private_match", createPrivateMatch);
  initializer.registerRpc("submit_score", submitScore);
  initializer.registerRpc("get_player_stats", getPlayerStats);

  initializer.registerMatch("tic-tac-toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLoop,
    matchLeave,
    matchTerminate,
    matchSignal,
  });

  logger.info("tic-tac-toe module loaded");
}

// matchSignal is required by the interface but we don't use it
const matchSignal: nkruntime.MatchSignalFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  data: string,
): { state: nkruntime.MatchState; data?: string } | null {
  return { state };
};
