export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  winRate: number;
}

export interface LeaderboardRecord {
  ownerId: string;
  username: string;
  score: number;
  rank: number;
  metadata: {
    wins: number;
    gamesPlayed: number;
    winRate: number;
  };
}
