import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import type { AuthUser } from "../../types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  completePasswordChange: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const savedToken = await storage.getToken();
        if (!savedToken) {
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        const currentUser = await api.getCurrentUser(savedToken);
        if (!cancelled) {
          setToken(savedToken);
          setUser({ ...currentUser, mustChangePassword: false });
          setMustChangePassword(false);
        }
      } catch {
        await storage.clearToken();
        await storage.clearDashboardCache();
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setMustChangePassword(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      mustChangePassword,
      async login(username: string, password: string) {
        const response = await api.login(username, password);
        await storage.setToken(response.accessToken);
        setToken(response.accessToken);
        try {
          const currentUser = await api.getCurrentUser(response.accessToken);
          setUser({ ...currentUser, mustChangePassword: response.mustChangePassword });
          setMustChangePassword(response.mustChangePassword);
        } catch (error) {
          await storage.clearToken();
          await storage.clearDashboardCache();
          setToken(null);
          setUser(null);
          setMustChangePassword(false);
          throw error;
        }
      },
      completePasswordChange() {
        setMustChangePassword(false);
        setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
      },
      async logout() {
        await storage.clearToken();
        await storage.clearDashboardCache();
        setToken(null);
        setUser(null);
        setMustChangePassword(false);
      }
    }),
    [loading, mustChangePassword, token, user]
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
