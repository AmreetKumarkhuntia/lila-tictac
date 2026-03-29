import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthStore } from "@/store/authStore";
import Button from "@/components/Button";
import TabGroup from "@/components/TabGroup";
import Leaderboard from "@/sections/Leaderboard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ArrowLeftIcon, RefreshIcon } from "@/components/icons";
import type { PlayerStats } from "@/types/leaderboard";

type Tab = "rankings" | "stats";

const TABS: { value: Tab; label: string }[] = [
  { value: "rankings", label: "Global Rankings" },
  { value: "stats", label: "My Stats" },
];

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { records, myStats, myRank, isLoading, error, refresh } =
    useLeaderboard();
  const session = useAuthStore((s) => s.session);
  const [activeTab, setActiveTab] = useState<Tab>("rankings");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="icon"
            onClick={() => navigate("/home")}
            title="Back to Home"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <Button
            variant="icon"
            onClick={refresh}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshIcon
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <div className="mb-4">
          <TabGroup
            options={TABS}
            value={activeTab}
            onChange={setActiveTab}
          />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="mb-3 text-sm text-red-500">{error}</p>
              <Button onClick={refresh} size="sm">
                Retry
              </Button>
            </div>
          ) : activeTab === "rankings" ? (
            <div>
              <Leaderboard
                records={records}
                currentUserId={session?.user_id ?? null}
              />
              {myRank !== null && (
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Your rank:{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    #{myRank}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <StatsPanel stats={myStats} rank={myRank} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatsPanel({
  stats,
  rank,
}: {
  stats: PlayerStats | null;
  rank: number | null;
}) {
  if (!stats || stats.gamesPlayed === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No stats yet. Play a game to start tracking!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-6 py-2">
        {rank !== null && (
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              #{rank}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Global Rank
            </p>
          </div>
        )}
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.winRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Win Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Wins"
          value={stats.wins}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Losses"
          value={stats.losses}
          color="text-rose-600 dark:text-rose-400"
        />
        <StatCard
          label="Draws"
          value={stats.draws}
          color="text-gray-600 dark:text-gray-300"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Games"
          value={stats.gamesPlayed}
          color="text-gray-900 dark:text-white"
        />
        <StatCard
          label="Streak"
          value={stats.currentStreak}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="Best Streak"
          value={stats.bestStreak}
          color="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
