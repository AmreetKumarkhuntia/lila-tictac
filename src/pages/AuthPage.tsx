import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useUiStore } from "@/store/uiStore";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AuthMode } from "@/types/ui";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 8;

function validateUsername(value: string): string | null {
  if (value.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters`;
  }
  if (value.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return "Only letters, numbers, and underscores allowed";
  }
  return null;
}

function validateEmail(value: string): string | null {
  if (!value) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address";
  }
  return null;
}

function validatePassword(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

const TAB_CLASS = (active: boolean) =>
  `flex-1 rounded-lg py-2 text-sm font-semibold transition ${
    active
      ? "bg-indigo-600 text-white shadow"
      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
  }`;

export default function AuthPage() {
  const navigate = useNavigate();
  const { register, login, isAuthenticated } = useNakama();
  const { isLoading, error, setLoading, setError, clearError } = useUiStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setUsername("");
    setTouched({});
    clearError();
  };

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    resetForm();
    setMode(next);
  };

  const isRegister = mode === "register";

  const emailError = touched.email ? validateEmail(email) : null;
  const passwordError = touched.password ? validatePassword(password) : null;
  const usernameError =
    isRegister && touched.username ? validateUsername(username) : null;

  const canSubmit = isRegister
    ? !validateEmail(email) &&
      !validatePassword(password) &&
      !validateUsername(username)
    : !validateEmail(email) && !validatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const allTouched: Record<string, boolean> = isRegister
      ? { email: true, password: true, username: true }
      : { email: true, password: true };
    setTouched(allTouched);

    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const uErr = isRegister ? validateUsername(username) : null;
    const firstErr = eErr || pErr || uErr;
    if (firstErr) {
      setError(firstErr);
      return;
    }

    clearError();
    setLoading(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, username.trim());
      } else {
        await login(email.trim(), password);
      }
      navigate("/home", { replace: true });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>

        <div className="mx-auto mt-4 mb-6 flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={TAB_CLASS(mode === "login")}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={TAB_CLASS(mode === "register")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) clearError();
              }}
              onBlur={() => markTouched("email")}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              disabled={isLoading}
              className={inputClass}
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) clearError();
              }}
              onBlur={() => markTouched("password")}
              placeholder="Min 8 characters"
              autoComplete={isRegister ? "new-password" : "current-password"}
              disabled={isLoading}
              className={inputClass}
            />
            {passwordError && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          {isRegister && (
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300"
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
                onBlur={() => markTouched("username")}
                placeholder="e.g. player_one"
                autoComplete="username"
                disabled={isLoading}
                className={inputClass}
                maxLength={MAX_USERNAME_LENGTH}
              />
              {usernameError && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">
                  {usernameError}
                </p>
              )}
            </div>
          )}

          {error &&
            !emailError &&
            !passwordError &&
            !(isRegister && usernameError) && (
              <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
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
                {isRegister ? "Creating account..." : "Logging in..."}
              </>
            ) : isRegister ? (
              "Register"
            ) : (
              "Log in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
