import { LinearGradient } from "expo-linear-gradient";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../theme/tokens";
import { useAuth } from "../modules/auth/AuthContext";

export function NonStudentScreen() {
  const { logout, user } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#e8f5f2", tokens.canvas]} style={styles.gradient}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="desktop-outline" size={42} color={tokens.accent} />
          </View>
          <Text style={styles.eyebrow}>Staff & admin access</Text>
          <Text style={styles.title}>Use the web dashboard</Text>
          <Text style={styles.body}>
            Signed in as <Text style={styles.bold}>{user?.username}</Text> ({user?.role}). This mobile app is built for{" "}
            <Text style={styles.bold}>students</Text> only — clearance tracking, payments, inquiries, and certificates.
          </Text>
          <Text style={styles.hint}>Open the React web app on a desktop browser for librarian, finance, registrar, and system admin workflows.</Text>
          <Pressable style={styles.button} onPress={() => void logout()}>
            <Text style={styles.buttonLabel}>Sign out</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.canvas },
  gradient: { flex: 1, justifyContent: "center", padding: 22 },
  card: {
    backgroundColor: tokens.surfaceElevated,
    borderRadius: tokens.radiusLg,
    padding: 26,
    gap: 14,
    ...tokens.shadowSoft
  },
  iconWrap: {
    alignSelf: "flex-start",
    backgroundColor: tokens.accentMuted,
    borderRadius: 18,
    padding: 14
  },
  eyebrow: {
    color: tokens.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: { fontSize: 26, fontWeight: "900", color: tokens.ink, lineHeight: 32 },
  body: { color: tokens.muted, fontSize: 16, lineHeight: 24 },
  bold: { color: tokens.ink, fontWeight: "700" },
  hint: { color: tokens.muted, fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  button: {
    marginTop: 8,
    backgroundColor: tokens.accent,
    borderRadius: tokens.radiusPill,
    paddingVertical: 16,
    alignItems: "center"
  },
  buttonLabel: { color: "#fff", fontWeight: "800", fontSize: 16 }
});
