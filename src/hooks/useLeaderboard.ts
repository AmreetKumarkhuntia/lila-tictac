import { useState, useCallback, useEffect } from "react";
import { nakamaClient } from "@/lib/nakama";
import { useAuthStore } from "@/store/authStore";
import { LEADERBOARD_ID } from "@/lib/constants";
import type { LeaderboardRecord, PlayerStats } from "@/types/leaderboard";
import type { UseLeaderboardReturn } from "@/types/hooks";

const DEFAULT_LIMIT = 50;

function mapRecord(raw: {
  owner_id?: string;
  username?: string;
  score?: number;
  rank?: number;
  metadata?: object;
}): LeaderboardRecord {
  const meta = (raw.metadata ?? {}) as {
    wins?: number;
    gamesPlayed?: number;
    winRate?: number;
  };
  return {
    ownerId: raw.owner_id ?? "",
    username: raw.username ?? "Unknown",
    score: raw.score ?? 0,
    rank: raw.rank ?? 0,
    metadata: {
      wins: meta.wins ?? 0,
      gamesPlayed: meta.gamesPlayed ?? 0,
      winRate: meta.winRate ?? 0,
    },
  };
}

export function useLeaderboard(): UseLeaderboardReturn {
  const session = useAuthStore((s) => s.session);

  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      const [globalResult, aroundOwnerResult, statsResult] = await Promise.all([
        nakamaClient.listLeaderboardRecords(
          session,
          LEADERBOARD_ID,
          undefined,
          DEFAULT_LIMIT,
        ),
        nakamaClient.listLeaderboardRecordsAroundOwner(
          session,
          LEADERBOARD_ID,
          session.user_id!,
          1,
        ),
        nakamaClient.rpc(session, "get_player_stats", {}),
      ]);

      const mappedRecords = (globalResult.records ?? []).map(mapRecord);
      setRecords(mappedRecords);

      const ownerRecords = aroundOwnerResult.owner_records ?? [];
      const myOwnerRecord = ownerRecords[0];
      if (myOwnerRecord) {
        setMyRank(myOwnerRecord.rank ?? null);
      } else {
        setMyRank(null);
      }

      if (statsResult.payload) {
        setMyStats(statsResult.payload as PlayerStats);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load leaderboard";
      setError(message);
      console.error("Leaderboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    records,
    myStats,
    myRank,
    isLoading,
    error,
    refresh: fetchLeaderboard,
  };
}
