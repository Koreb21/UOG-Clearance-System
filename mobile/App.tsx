import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/modules/auth/AuthContext";
import { ThemeProvider, useTheme } from "./src/modules/theme/ThemeContext";
import { RootApp } from "./src/RootApp";

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <RootApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
