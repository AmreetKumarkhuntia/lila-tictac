import { create } from "zustand";
import type { AuthState } from "@/types/stores";

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  username: null,
  isAuthenticated: false,
  setSession: (session, username) =>
    set({ session, username, isAuthenticated: true }),
  clearSession: () =>
    set({ session: null, username: null, isAuthenticated: false }),
}));
