import { useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const navigate = useNavigate();
  const { logout } = useNakama();
  const username = useAuthStore((s) => s.username);

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-1 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>
        <p className="mb-8 text-center text-sm text-gray-400">
          Welcome, <span className="font-semibold text-white">{username}</span>
        </p>

        <div className="space-y-3">
          <button
            disabled
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white opacity-50 cursor-not-allowed"
            title="Coming in Phase 4"
          >
            Quick Play
          </button>

          <button
            disabled
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-semibold text-white opacity-50 cursor-not-allowed"
            title="Coming in Phase 4"
          >
            Create Private Match
          </button>

          <button
            onClick={() => navigate("/leaderboard")}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-semibold text-white transition hover:bg-gray-700"
          >
            Leaderboard
          </button>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-red-400"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
