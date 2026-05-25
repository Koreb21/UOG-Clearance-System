import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/modules/auth/AuthContext";
import { RootApp } from "./src/RootApp";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootApp />
    </AuthProvider>
  );
}
