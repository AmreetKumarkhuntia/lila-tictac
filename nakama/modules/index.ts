function initModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
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
