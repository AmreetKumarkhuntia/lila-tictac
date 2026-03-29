import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useMatchmaker } from "@/hooks/useMatchmaker";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import Button from "@/components/Button";
import TabGroup from "@/components/TabGroup";
import PrivateMatchModal from "@/sections/PrivateMatchModal";
import { SunIcon, MoonIcon } from "@/components/icons";
import type { GameMode } from "@/types/game";

const MODE_TABS: { value: GameMode; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "timed", label: "Timed (30s)" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useNakama();
  const { findMatch, cancelMatchmaking } = useMatchmaker();
  const { myStats, records, isLoading: leaderboardLoading } = useLeaderboard();
  const username = useAuthStore((s) => s.username);
  const { theme, toggleTheme } = useUiStore();
  const matchmakingStatus = useGameStore((s) => s.matchmakingStatus);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>("classic");

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  const handleQuickPlay = () => {
    if (matchmakingStatus === "searching") {
      cancelMatchmaking();
    } else {
      findMatch(selectedMode);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
        <Button
          variant="icon"
          onClick={toggleTheme}
          className="absolute right-4 top-4"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </Button>

        <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>
        <p className="mb-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Welcome,{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {username}
          </span>
        </p>

        {/* Stats summary bar */}
        {myStats && (
          <div className="mb-8 flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              W: {myStats.wins}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-rose-500 dark:text-rose-400">
              L: {myStats.losses}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-gray-500 dark:text-gray-400">
              D: {myStats.draws}
            </span>
          </div>
        )}
        {!myStats && !leaderboardLoading && <div className="mb-8" />}
        {!myStats && leaderboardLoading && (
          <div className="mb-8 flex justify-center">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500 dark:border-gray-600 dark:border-t-gray-400" />
          </div>
        )}

        <div className="space-y-3">
          <TabGroup
            options={MODE_TABS}
            value={selectedMode}
            onChange={setSelectedMode}
            disabled={matchmakingStatus !== "idle"}
          />

          <Button
            onClick={handleQuickPlay}
            disabled={matchmakingStatus === "matched"}
            fullWidth
            size="lg"
            loading={matchmakingStatus === "searching"}
            loadingText="Cancel Search"
            className={
              matchmakingStatus === "searching"
                ? "bg-red-500 hover:bg-red-600"
                : ""
            }
          >
            {matchmakingStatus === "matched" ? "Match Found!" : "Quick Play"}
          </Button>

          {matchmakingStatus === "searching" && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Searching for an opponent...
            </p>
          )}

          <Button
            variant="secondary"
            onClick={() => setShowPrivateModal(true)}
            disabled={matchmakingStatus !== "idle"}
            fullWidth
            size="lg"
          >
            Private Match
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/leaderboard")}
            fullWidth
            size="lg"
          >
            Leaderboard
          </Button>
        </div>

        {/* Top-3 leaderboard preview */}
        {records.length > 0 && (
          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Top Players
            </p>
            <div className="space-y-1.5">
              {records.slice(0, 3).map((r) => (
                <div
                  key={r.ownerId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-bold text-indigo-500 dark:text-indigo-400">
                      {r.rank}.
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {r.username}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {r.metadata.wins} win{r.metadata.wins !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="ghost" onClick={handleLogout} fullWidth size="sm">
            Log out
          </Button>
        </div>
      </div>

      <PrivateMatchModal
        isOpen={showPrivateModal}
        onClose={() => setShowPrivateModal(false)}
      />
    </div>
  );
}
