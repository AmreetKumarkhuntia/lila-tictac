import { create } from "zustand";
import type { Session } from "@heroiclabs/nakama-js";

interface AuthState {
  session: Session | null;
  deviceId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  setSession: (session: Session, deviceId: string, username: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  deviceId: null,
  username: null,
  isAuthenticated: false,
  setSession: (session, deviceId, username) =>
    set({ session, deviceId, username, isAuthenticated: true }),
  clearSession: () =>
    set({ session: null, deviceId: null, username: null, isAuthenticated: false }),
}));
