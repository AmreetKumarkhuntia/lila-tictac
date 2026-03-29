import { useState, useEffect, useRef, useCallback } from "react";
import { useMatchmaker } from "@/hooks/useMatchmaker";
import { useUiStore } from "@/store/uiStore";
import Button from "@/components/Button";
import Input from "@/components/Input";
import TabGroup from "@/components/TabGroup";
import { XMarkIcon } from "@/components/icons";
import type { GameMode } from "@/types/game";
import type { PrivateMatchModalProps } from "@/types/components";

type Tab = "create" | "join";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "create", label: "Create" },
  { value: "join", label: "Join" },
];

const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "timed", label: "Timed (30s)" },
];

export default function PrivateMatchModal({
  isOpen,
  onClose,
}: PrivateMatchModalProps) {
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

  const handleTabChange = (next: Tab) => {
    setTab(next);
    if (next === "create") {
      setJoinInput("");
    } else {
      setCreatedMatchId(null);
      setWaitingForOpponent(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-match-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="private-match-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            Private Match
          </h2>
          <Button
            variant="icon"
            onClick={handleClose}
            aria-label="Close dialog"
            className="p-1"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-4">
          <TabGroup
            options={TAB_OPTIONS}
            value={tab}
            onChange={handleTabChange}
            size="sm"
          />
        </div>

        {tab === "create" && (
          <div>
            {!createdMatchId ? (
              <div>
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  Create a new match and share the ID with a friend.
                </p>
                <div className="mb-3">
                  <TabGroup
                    options={MODE_OPTIONS}
                    value={mode}
                    onChange={setMode}
                    size="sm"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  loading={isLoading}
                  loadingText="Creating..."
                  fullWidth
                >
                  Create Match
                </Button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Share this match ID with your friend:
                </p>
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdMatchId}
                    mono
                    inputSize="sm"
                    className="text-xs"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleCopy}
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
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
            <Input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="Paste match ID here"
              mono
              inputSize="sm"
              className="mb-3"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
            />
            <Button
              onClick={handleJoin}
              disabled={!joinInput.trim()}
              loading={isLoading}
              loadingText="Joining..."
              fullWidth
            >
              Join Match
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
