import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useMatchmaker } from "@/hooks/useMatchmaker";
import { useAuthStore } from "@/store/authStore";
import { useGameStore } from "@/store/gameStore";
import { useUiStore } from "@/store/uiStore";
import PrivateMatchModal from "@/components/PrivateMatchModal";

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useNakama();
  const { findMatch, cancelMatchmaking } = useMatchmaker();
  const username = useAuthStore((s) => s.username);
  const { theme, toggleTheme } = useUiStore();
  const matchmakingStatus = useGameStore((s) => s.matchmakingStatus);
  const [showPrivateModal, setShowPrivateModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  const handleQuickPlay = () => {
    if (matchmakingStatus === "searching") {
      cancelMatchmaking();
    } else {
      findMatch("classic");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>
        <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Welcome,{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {username}
          </span>
        </p>

        <div className="space-y-3">
          {/* Quick Play */}
          <button
            onClick={handleQuickPlay}
            disabled={matchmakingStatus === "matched"}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition ${
              matchmakingStatus === "searching"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-indigo-600 hover:bg-indigo-700"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {matchmakingStatus === "searching" && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {matchmakingStatus === "searching"
              ? "Cancel Search"
              : matchmakingStatus === "matched"
                ? "Match Found!"
                : "Quick Play"}
          </button>

          {/* Searching indicator */}
          {matchmakingStatus === "searching" && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500">
              Searching for an opponent...
            </p>
          )}

          {/* Private Match */}
          <button
            onClick={() => setShowPrivateModal(true)}
            disabled={matchmakingStatus !== "idle"}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            Private Match
          </button>

          {/* Leaderboard */}
          <button
            onClick={() => navigate("/leaderboard")}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
          >
            Leaderboard
          </button>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-red-500 dark:hover:text-red-400"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Private Match Modal */}
      <PrivateMatchModal
        isOpen={showPrivateModal}
        onClose={() => setShowPrivateModal(false)}
      />
    </div>
  );
}
