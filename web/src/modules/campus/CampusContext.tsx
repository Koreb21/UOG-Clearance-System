import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { api } from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import type { Campus } from "../../types";

type CampusContextValue = {
  campuses: Campus[];
  loading: boolean;
};

const CampusContext = createContext<CampusContextValue | undefined>(undefined);

export function CampusProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setCampuses([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.listCampuses(token)
      .then((items) => {
        if (!cancelled) {
          setCampuses(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampuses([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      campuses,
      loading
    }),
    [campuses, loading]
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampuses() {
  const context = useContext(CampusContext);

  if (!context) {
    throw new Error("useCampuses must be used inside CampusProvider");
  }

  return context;
}
