import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { api, subscribeSessionInvalid } from "../../lib/api";
import { storage } from "../../lib/storage";
import type { AuthUser } from "../../types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function clearSession() {
  storage.clearToken();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => storage.getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  const loading = initializing || authBusy;

  // Keep React state in sync when any API call invalidates the bearer token (401).
  useEffect(() => {
    return subscribeSessionInvalid(() => {
      clearSession();
      setToken(null);
      setUser(null);
    });
  }, []);

  // Restore session from storage once on mount (no token dependency loop).
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = storage.getToken();
      if (!stored) {
        setToken(null);
        setUser(null);
        setInitializing(false);
        return;
      }

      const tokenAtStart = stored;
      setToken(tokenAtStart);

      try {
        const currentUser = await api.getCurrentUser(tokenAtStart);
        if (cancelled) {
          return;
        }
        // Another login may have replaced the token while we were in flight.
        if (storage.getToken() !== tokenAtStart) {
          return;
        }
        setUser(currentUser);
      } catch {
        if (cancelled) {
          return;
        }
        // Do not clear a newer session that replaced this one mid-flight.
        if (storage.getToken() === tokenAtStart) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      setAuthBusy(true);
      setUser(null);
      try {
        const response = await api.login(username, password);
        storage.setToken(response.accessToken);
        const currentUser = await api.getCurrentUser(response.accessToken);
        setToken(response.accessToken);
        setUser(currentUser);
      } catch (error) {
        clearSession();
        setToken(null);
        setUser(null);
        throw error;
      } finally {
        setAuthBusy(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
