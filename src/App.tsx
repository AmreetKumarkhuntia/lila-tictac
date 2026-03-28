import { useEffect, useState, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useNakama } from "@/hooks/useNakama";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import GamePage from "@/pages/GamePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import LoadingSpinner from "@/components/LoadingSpinner";
import ToastContainer from "@/components/ToastContainer";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Error Boundary — catches render-time crashes and shows a recovery UI
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 px-4 text-gray-900 dark:bg-gray-950 dark:text-white">
          <h1 className="text-2xl font-bold text-rose-500">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/home";
            }}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------

function SessionGate({ children }: { children: React.ReactNode }) {
  const { restore } = useNakama();
  const [restoring, setRestoring] = useState(true);

  // Monitor browser online/offline for connection toasts & socket reconnect
  useConnectionStatus();

  useEffect(() => {
    restore().finally(() => setRestoring(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (restoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <ErrorBoundary>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/game/:matchId"
              element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </ErrorBoundary>
        <ToastContainer />
      </SessionGate>
    </BrowserRouter>
  );
}
