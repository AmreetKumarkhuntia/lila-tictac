import type { Session } from "@heroiclabs/nakama-js";

const STORAGE_KEY = "tictactoeKey";

interface StoredAuth {
  authToken: string;
  refreshToken: string;
  username: string;
}

export function saveAuth(session: Session, username: string): void {
  const data: StoredAuth = {
    authToken: session.token,
    refreshToken: session.refresh_token,
    username,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}
