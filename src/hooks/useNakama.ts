import { useAuthStore } from "@/store/authStore";
import { nakamaClient } from "@/lib/nakama";
import { Session } from "@heroiclabs/nakama-js";

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

function persistSession(session: Session, deviceId: string) {
  localStorage.setItem("nakamaSession", session.token);
  localStorage.setItem("nakamaRefreshToken", session.refresh_token);
  localStorage.setItem("deviceId", deviceId);
}

function restoreSession(): { session: Session; deviceId: string } | null {
  const token = localStorage.getItem("nakamaSession");
  const refreshToken = localStorage.getItem("nakamaRefreshToken");
  const deviceId = localStorage.getItem("deviceId");
  if (!token || !refreshToken || !deviceId) return null;
  try {
    const session = Session.restore(token, refreshToken);
    if (session.isexpired(Date.now() / 1000)) return null;
    return { session, deviceId };
  } catch {
    return null;
  }
}

export function useNakama() {
  const { setSession, clearSession, isAuthenticated, session } = useAuthStore();

  const authenticate = async (username: string) => {
    const deviceId = getOrCreateDeviceId();
    const newSession = await nakamaClient.authenticateDevice(
      deviceId,
      true,
      username,
    );
    persistSession(newSession, deviceId);
    setSession(newSession, deviceId, username);
  };

  const restore = () => {
    const restored = restoreSession();
    if (restored) {
      setSession(
        restored.session,
        restored.deviceId,
        restored.session.username ?? "",
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("nakamaSession");
    localStorage.removeItem("nakamaRefreshToken");
    localStorage.removeItem("deviceId");
    clearSession();
  };

  return { authenticate, restore, logout, isAuthenticated, session };
}
