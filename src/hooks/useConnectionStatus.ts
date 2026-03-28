import { useEffect, useRef } from "react";
import { getSocket, isSocketConnected, disconnectSocket } from "@/lib/nakama";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

const MATCH_ID_STORAGE_KEY = "activeMatchId";

/**
 * Persists the active matchId to sessionStorage so it survives page refreshes.
 */
export function persistMatchId(matchId: string | null) {
  if (matchId) {
    sessionStorage.setItem(MATCH_ID_STORAGE_KEY, matchId);
  } else {
    sessionStorage.removeItem(MATCH_ID_STORAGE_KEY);
  }
}

export function getPersistedMatchId(): string | null {
  return sessionStorage.getItem(MATCH_ID_STORAGE_KEY);
}

export function clearPersistedMatchId() {
  sessionStorage.removeItem(MATCH_ID_STORAGE_KEY);
}

/**
 * Hook that monitors browser online/offline events and shows toasts.
 * When connectivity is restored while in a game, it attempts to
 * reconnect the socket. Actual match re-join is handled by the
 * GamePage via its joinMatch flow + the persisted matchId.
 */
export function useConnectionStatus() {
  const session = useAuthStore((s) => s.session);
  const reconnecting = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      useUiStore.getState().addToast("Connection lost", "error");
    };

    const handleOnline = async () => {
      useUiStore.getState().addToast("Connection restored — reconnecting...", "info");

      if (!session || reconnecting.current) return;
      reconnecting.current = true;

      try {
        // If the socket is dead, disconnect it fully so getSocket creates a fresh one
        if (!isSocketConnected()) {
          disconnectSocket();
        }
        await getSocket(session);
      } catch (err) {
        console.error("Failed to reconnect socket:", err);
        useUiStore.getState().addToast("Reconnection failed", "error");
      } finally {
        reconnecting.current = false;
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [session]);
}
