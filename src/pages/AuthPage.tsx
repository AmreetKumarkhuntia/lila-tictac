import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useUiStore } from "@/store/uiStore";
import LoadingSpinner from "@/components/LoadingSpinner";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

function validateUsername(value: string): string | null {
  if (value.length < MIN_LENGTH) {
    return `Username must be at least ${MIN_LENGTH} characters`;
  }
  if (value.length > MAX_LENGTH) {
    return `Username must be at most ${MAX_LENGTH} characters`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return "Only letters, numbers, and underscores allowed";
  }
  return null;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { authenticate, isAuthenticated } = useNakama();
  const { isLoading, error, setLoading, setError, clearError } = useUiStore();

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);

  // Already authenticated — redirect to home
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const validationError = touched ? validateUsername(username) : null;
  const canSubmit = username.length >= MIN_LENGTH && !validateUsername(username);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const err = validateUsername(username);
    if (err) {
      setError(err);
      return;
    }

    clearError();
    setLoading(true);
    try {
      await authenticate(username.trim());
      navigate("/home", { replace: true });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>
        <p className="mb-8 text-center text-sm text-gray-400">
          Enter a username to start playing
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) clearError();
              }}
              onBlur={() => setTouched(true)}
              placeholder="e.g. player_one"
              autoComplete="username"
              autoFocus
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              maxLength={MAX_LENGTH}
            />
            {validationError && (
              <p className="mt-1 text-sm text-red-400">{validationError}</p>
            )}
          </div>

          {error && !validationError && (
            <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Connecting...
              </>
            ) : (
              "Play"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          A device ID is generated automatically.
          <br />
          Your session persists across reloads.
        </p>
      </div>
    </div>
  );
}
