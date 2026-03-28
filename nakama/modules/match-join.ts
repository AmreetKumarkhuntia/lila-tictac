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

  const isReconnecting = gs.disconnected !== null && gs.disconnected.userId === presence.userId;

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
