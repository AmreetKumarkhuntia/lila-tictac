import { create } from "zustand";
import type { AuthState } from "@/types/stores";

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
