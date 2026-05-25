import { LinearGradient } from "expo-linear-gradient";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../modules/theme/ThemeContext";
import { useAuth } from "../modules/auth/AuthContext";

export function NonStudentScreen() {
  const { logout, user } = useAuth();
  const { tokens, mode } = useTheme();

  const isDark = mode === "dark";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.background }]}>
      <LinearGradient colors={isDark ? ["#0d0f14", tokens.background] : ["#e8f5f2", tokens.background]} style={styles.gradient}>
        <View style={[styles.card, {
          backgroundColor: isDark ? tokens.surfaceContainerLowest : tokens.surface,
          ...tokens.shadowSoft,
        }]}>
          <View style={[styles.iconWrap, { backgroundColor: tokens.secondaryContainer }]}>
            <Ionicons name="desktop-outline" size={42} color={tokens.onSecondaryContainer} />
          </View>
          <Text style={[styles.eyebrow, { color: tokens.secondary }]}>Staff & admin access</Text>
          <Text style={[styles.title, { color: tokens.onSurface }]}>Use the web dashboard</Text>
          <Text style={[styles.body, { color: tokens.onSurfaceVariant }]}>
            Signed in as <Text style={[styles.bold, { color: tokens.onSurface }]}>{user?.username}</Text> ({user?.role}). This mobile app is built for{" "}
            <Text style={[styles.bold, { color: tokens.onSurface }]}>students</Text> only — clearance tracking, payments, inquiries, and certificates.
          </Text>
          <Text style={[styles.hint, { color: tokens.onSurfaceVariant }]}>Open the React web app on a desktop browser for librarian, finance, registrar, and system admin workflows.</Text>
          <Pressable style={[styles.button, { backgroundColor: tokens.secondary }]} onPress={() => void logout()}>
            <Text style={styles.buttonLabel}>Sign out</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  gradient: { flex: 1, justifyContent: "center", padding: 22 },
  card: {
    borderRadius: 24,
    padding: 26,
    gap: 14,
  },
  iconWrap: {
    alignSelf: "flex-start",
    borderRadius: 18,
    padding: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontSize: 26, fontWeight: "900", lineHeight: 32 },
  body: { fontSize: 16, lineHeight: 24 },
  bold: { fontWeight: "700" },
  hint: { fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  button: {
    marginTop: 8,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonLabel: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
