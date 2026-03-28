// ============================================================
// Hook return-type interfaces.
// Centralised here so hook files stay focused on logic.
// ============================================================

import type { LeaderboardRecord, PlayerStats } from "@/types/leaderboard";

export interface UseLeaderboardReturn {
  records: LeaderboardRecord[];
  myStats: PlayerStats | null;
  myRank: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
