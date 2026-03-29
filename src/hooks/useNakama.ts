import { useAuthStore } from "@/store/authStore";
import { nakamaClient } from "@/lib/nakama";

export function useNakama() {
  const { setSession, clearSession, isAuthenticated, session } = useAuthStore();

  const register = async (
    email: string,
    password: string,
    username: string,
  ) => {
    const newSession = await nakamaClient.authenticateEmail(
      email,
      password,
      true,
      username,
    );
    setSession(newSession, username);
  };

  const login = async (email: string, password: string) => {
    const newSession = await nakamaClient.authenticateEmail(
      email,
      password,
      false,
    );
    const username = newSession.username ?? "";
    setSession(newSession, username);
  };

  const logout = async () => {
    if (session) {
      try {
        await nakamaClient.sessionLogout(
          session,
          session.token,
          session.refresh_token,
        );
      } catch {
        // ignore — session may already be invalid
      }
    }
    clearSession();
  };

  return { register, login, logout, isAuthenticated, session };
}
