import { create } from "zustand";
import { Session } from "@heroiclabs/nakama-js";
import { nakamaClient, disconnectSocket } from "@/lib/nakama";
import { saveAuth, loadAuth, clearAuth } from "@/lib/authStorage";
import type { AuthState } from "@/types/stores";

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  username: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session, username) => {
    saveAuth(session, username);
    set({ session, username, isAuthenticated: true });
  },

  clearSession: () => {
    clearAuth();
    disconnectSocket();
    set({ session: null, username: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const stored = loadAuth();
      if (!stored) {
        set({ isLoading: false });
        return;
      }

      const session = Session.restore(stored.authToken, stored.refreshToken);

      if (session.isexpired(Date.now() / 1000)) {
        if (session.isrefreshexpired(Date.now() / 1000)) {
          clearAuth();
          set({
            session: null,
            username: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        try {
          const refreshed = await nakamaClient.sessionRefresh(session);
          saveAuth(refreshed, stored.username);
          set({
            session: refreshed,
            username: stored.username || refreshed.username || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          clearAuth();
          set({
            session: null,
            username: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
        return;
      }

      set({
        session,
        username: stored.username || session.username || null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      clearAuth();
      set({
        session: null,
        username: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
