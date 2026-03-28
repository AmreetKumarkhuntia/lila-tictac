import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthStore } from "@/store/authStore";
import Leaderboard from "@/components/Leaderboard";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { PlayerStats } from "@/types/leaderboard";

type Tab = "rankings" | "stats";

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
          <button
            onClick={() => navigate("/home")}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Back to Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.312a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm-10.624-2.85a5.5 5.5 0 019.201-2.466l.312.312H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.536a.75.75 0 00-1.5 0v2.034l-.312-.313A7 7 0 002.63 8.395a.75.75 0 001.45.39z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("rankings")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === "rankings"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Global Rankings
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === "stats"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            My Stats
          </button>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="mb-3 text-sm text-red-500">{error}</p>
              <button
                onClick={refresh}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Retry
              </button>
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
        <StatCard label="Wins" value={stats.wins} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Losses" value={stats.losses} color="text-rose-600 dark:text-rose-400" />
        <StatCard label="Draws" value={stats.draws} color="text-gray-600 dark:text-gray-300" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Games" value={stats.gamesPlayed} color="text-gray-900 dark:text-white" />
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
