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
  if (session.username) {
    localStorage.setItem("nakamaUsername", session.username);
  }
}

function clearPersistedSession() {
  localStorage.removeItem("nakamaSession");
  localStorage.removeItem("nakamaRefreshToken");
  localStorage.removeItem("deviceId");
  localStorage.removeItem("nakamaUsername");
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

  const restore = async (): Promise<boolean> => {
    const token = localStorage.getItem("nakamaSession");
    const refreshToken = localStorage.getItem("nakamaRefreshToken");
    const deviceId = localStorage.getItem("deviceId");

    if (!token || !refreshToken || !deviceId) return false;

    try {
      let restoredSession = Session.restore(token, refreshToken);

      if (restoredSession.isexpired(Date.now() / 1000)) {
        try {
          restoredSession = await nakamaClient.sessionRefresh(restoredSession);
          persistSession(restoredSession, deviceId);
        } catch {
          // Refresh failed — session is truly expired
          clearPersistedSession();
          return false;
        }
      }

      const username =
        restoredSession.username ??
        localStorage.getItem("nakamaUsername") ??
        "";
      setSession(restoredSession, deviceId, username);
      return true;
    } catch {
      clearPersistedSession();
      return false;
    }
  };

  const logout = () => {
    clearPersistedSession();
    clearSession();
  };

  return { authenticate, restore, logout, isAuthenticated, session };
}
