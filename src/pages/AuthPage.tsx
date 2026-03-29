import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useNakama } from "@/hooks/useNakama";
import { useUiStore } from "@/store/uiStore";
import Button from "@/components/Button";
import Input from "@/components/Input";
import TabGroup from "@/components/TabGroup";
import { AuthMode } from "@/types/ui";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 8;

const AUTH_TABS: { value: AuthMode; label: string }[] = [
  { value: "login", label: "Log in" },
  { value: "register", label: "Register" },
];

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
          Tic-Tac-Toe
        </h1>

        <div className="mx-auto mt-4 mb-6">
          <TabGroup
            options={AUTH_TABS}
            value={mode}
            onChange={switchMode}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email"
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
            error={emailError}
          />

          <Input
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) clearError();
            }}
            onBlur={() => markTouched("password")}
            placeholder="Min 8 characters"
            autoComplete={isRegister ? "new-password" : "current-password"}
            disabled={isLoading}
            error={passwordError}
          />

          {isRegister && (
            <Input
              id="username"
              type="text"
              label="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) clearError();
              }}
              onBlur={() => markTouched("username")}
              placeholder="e.g. player_one"
              autoComplete="username"
              disabled={isLoading}
              maxLength={MAX_USERNAME_LENGTH}
              error={usernameError}
            />
          )}

          {error &&
            !emailError &&
            !passwordError &&
            !(isRegister && usernameError) && (
              <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

          <Button
            type="submit"
            disabled={!canSubmit || isLoading}
            fullWidth
            size="lg"
            loading={isLoading}
            loadingText={isRegister ? "Creating account..." : "Logging in..."}
          >
            {isRegister ? "Register" : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
