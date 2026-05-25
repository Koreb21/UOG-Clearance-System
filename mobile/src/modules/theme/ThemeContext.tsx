import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { darkTokens, lightTokens, type TokenSet } from "../../theme/tokens";

const THEME_KEY = "ugc_theme_mode";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  tokens: TokenSet;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((val) => {
        if (val === "dark" || val === "light") setModeState(val);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(THEME_KEY, m).catch(() => {});
  };

  const toggle = () => setMode(mode === "light" ? "dark" : "light");

  const tokens = mode === "dark" ? darkTokens : lightTokens;

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, tokens, toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
