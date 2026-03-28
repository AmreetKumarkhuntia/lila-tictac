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
  logger: nkruntime.Logger,
  userId: string,
  stats: PlayerStatsData,
): boolean {
  try {
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
    return true;
  } catch (e) {
    logger.error("failed to write stats for user %s: %s", userId, e);
    return false;
  }
}

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

  try {
    const now = Date.now();

    let statsX: PlayerStatsData;
    let statsO: PlayerStatsData;

    try {
      statsX = readPlayerStats(nk, playerXId);
    } catch (e) {
      logger.error("failed to read stats for X (%s): %s", playerXId, e);
      statsX = defaultStats();
    }

    try {
      statsO = readPlayerStats(nk, playerOId);
    } catch (e) {
      logger.error("failed to read stats for O (%s): %s", playerOId, e);
      statsO = defaultStats();
    }

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
      statsX.currentStreak = 0;
      statsO.currentStreak = 0;
      scoreX = SCORE_DRAW;
      scoreO = SCORE_DRAW;
    }

    statsX.gamesPlayed++;
    statsX.lastMatchAt = now;
    statsO.gamesPlayed++;
    statsO.lastMatchAt = now;

    // Write stats for each player independently so one failure doesn't block the other
    writePlayerStats(nk, logger, playerXId, statsX);
    writePlayerStats(nk, logger, playerOId, statsO);

    const winRateX = statsX.gamesPlayed > 0
      ? Math.round((statsX.wins / statsX.gamesPlayed) * 1000) / 10
      : 0;
    const winRateO = statsO.gamesPlayed > 0
      ? Math.round((statsO.wins / statsO.gamesPlayed) * 1000) / 10
      : 0;

    const usernameX = state.usernames[playerXId] || "Player";
    const usernameO = state.usernames[playerOId] || "Player";

    // Write leaderboard records independently
    try {
      nk.leaderboardRecordWrite(
        LEADERBOARD_ID,
        playerXId,
        usernameX,
        scoreX,
        0,
        { wins: statsX.wins, gamesPlayed: statsX.gamesPlayed, winRate: winRateX },
      );
    } catch (e) {
      logger.error("failed to write leaderboard for X (%s): %s", playerXId, e);
    }

    try {
      nk.leaderboardRecordWrite(
        LEADERBOARD_ID,
        playerOId,
        usernameO,
        scoreO,
        0,
        { wins: statsO.wins, gamesPlayed: statsO.gamesPlayed, winRate: winRateO },
      );
    } catch (e) {
      logger.error("failed to write leaderboard for O (%s): %s", playerOId, e);
    }

    logger.info(
      "match result submitted: winner=%s, scoreX=%d, scoreO=%d",
      state.winner,
      scoreX,
      scoreO,
    );
  } catch (e) {
    // Outer catch: ensure the match loop NEVER crashes from stats errors
    logger.error("submitMatchResult failed unexpectedly: %s", e);
  }
}
