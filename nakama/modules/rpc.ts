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

function matchmakerMatched(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[],
): string {
  // Extract mode from the first matched user's string properties
  const mode = (matches[0]?.properties?.mode as string) ?? "classic";
  const matchId = nk.matchCreate("tic-tac-toe", { mode });
  logger.info(
    "matchmaker created match '%s' for mode '%s' (%d users)",
    matchId,
    mode,
    matches.length,
  );
  return matchId;
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
