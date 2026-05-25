import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ChangePasswordScreen } from "./screens/ChangePasswordScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NonStudentScreen } from "./screens/NonStudentScreen";
import { StudentHomeScreen } from "./screens/StudentHomeScreen";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { useAuth } from "./modules/auth/AuthContext";
import { useTheme } from "./modules/theme/ThemeContext";

export function RootApp() {
  const { loading, mustChangePassword, user } = useAuth();
  const { tokens } = useTheme();
  const [welcomed, setWelcomed] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: tokens.background, gap: 14 }}>
        <ActivityIndicator size="large" color={tokens.secondary} />
        <Text style={{ color: tokens.onSurfaceVariant, fontSize: 14, fontWeight: "500" }}>
          Loading student portal…
        </Text>
      </View>
    );
  }

  // Show welcome/splash once on first open (before login)
  if (!user && !welcomed) {
    return <WelcomeScreen onGetStarted={() => setWelcomed(true)} />;
  }

  if (!user) return <LoginScreen />;

  if (mustChangePassword) return <ChangePasswordScreen />;

  if (user.role !== "STUDENT") return <NonStudentScreen />;

  return <StudentHomeScreen />;
}
