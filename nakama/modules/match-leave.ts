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
      continue;
    }

    logger.info("player %s (%s) left", presence.userId, leavingSymbol);

    if (gs.status === "playing") {
      if (gs.disconnected !== null) {
        // Both players disconnected — neither wins, just clean up
        gs.disconnected = null;
        logger.info("both players disconnected, match will be destroyed");
      } else {
        gs.disconnected = {
          userId: presence.userId,
          symbol: leavingSymbol,
          disconnectedAtTick: tick,
        };

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
