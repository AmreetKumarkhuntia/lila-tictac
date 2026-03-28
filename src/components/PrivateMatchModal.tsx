import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchmaker } from "@/hooks/useMatchmaker";
import { useUiStore } from "@/store/uiStore";
import type { GameMode } from "@/types/game";
import type { PrivateMatchModalProps } from "@/types/components";

type Tab = "create" | "join";

export default function PrivateMatchModal({ isOpen, onClose }: PrivateMatchModalProps) {
  const [tab, setTab] = useState<Tab>("create");
  const [mode, setMode] = useState<GameMode>("classic");
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);

  const { createAndJoinPrivateMatch, joinPrivateMatch } = useMatchmaker();
  const isLoading = useUiStore((s) => s.isLoading);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: trap Tab/Shift+Tab inside the modal and handle Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);

    requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    const matchId = await createAndJoinPrivateMatch(mode);
    if (matchId) {
      setCreatedMatchId(matchId);
      setWaitingForOpponent(true);
    }
  };

  const handleCopy = async () => {
    if (!createdMatchId) return;
    try {
      await navigator.clipboard.writeText(createdMatchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in the input
      console.warn("Clipboard API not available");
    }
  };

  const handleJoin = async () => {
    const trimmed = joinInput.trim();
    if (!trimmed) return;
    await joinPrivateMatch(trimmed);
  };

  const handleClose = () => {
    setCreatedMatchId(null);
    setJoinInput("");
    setCopied(false);
    setWaitingForOpponent(false);
    setMode("classic");
    setTab("create");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-match-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 id="private-match-title" className="text-lg font-bold text-gray-900 dark:text-white">
            Private Match
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => {
              setTab("create");
              setJoinInput("");
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "create"
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Create
          </button>
          <button
            onClick={() => {
              setTab("join");
              setCreatedMatchId(null);
              setWaitingForOpponent(false);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "join"
                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Join
          </button>
        </div>

        {tab === "create" && (
          <div>
            {!createdMatchId ? (
              <div>
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  Create a new match and share the ID with a friend.
                </p>
                <div className="mb-3 flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setMode("classic")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      mode === "classic"
                        ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    Classic
                  </button>
                  <button
                    onClick={() => setMode("timed")}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      mode === "timed"
                        ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    Timed (30s)
                  </button>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Creating..." : "Create Match"}
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Share this match ID with your friend:
                </p>
                <div className="mb-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={createdMatchId}
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                {waitingForOpponent && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Waiting for opponent...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "join" && (
          <div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Enter the match ID shared by your friend.
            </p>
            <input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Paste match ID here"
              className="mb-3 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <button
              onClick={handleJoin}
              disabled={isLoading || !joinInput.trim()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Joining..." : "Join Match"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
