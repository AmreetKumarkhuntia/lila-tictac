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
