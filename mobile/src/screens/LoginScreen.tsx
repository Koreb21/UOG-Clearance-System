import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../modules/auth/AuthContext";
import { useTheme } from "../modules/theme/ThemeContext";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

const campuses = [
  { code: "MK", name: "Maraki Campus", note: "Social Sciences, Law, and Management", bg: "#d9efe9", text: "#0b4f4a" },
  { code: "AT", name: "Atse Tewodros", note: "Natural Sciences and Technology", bg: "#f8dfd2", text: "#7c2d12" },
  { code: "AF", name: "Atse Fasil", note: "College of Agriculture and Veterinary", bg: "#dbe8ff", text: "#1e3a8a" },
];

export function LoginScreen() {
  const { login } = useAuth();
  const { tokens, mode } = useTheme();
  const [selected, setSelected] = useState("MK");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) return <ForgotPasswordScreen />;

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  const isDark = mode === "dark";

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      {/* Top App Bar */}
      <LinearGradient colors={[tokens.primaryContainer, isDark ? "#001e40" : "#006a63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.appBar}>
        <View style={styles.appBarLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={20} color="#fff" />
          </View>
          <Text style={styles.appBarTitle}>Clearance Portal</Text>
        </View>
        <MaterialIcons name="account-circle" size={28} color="#fff" />
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={[styles.eyebrow, { color: tokens.secondary }]}>University of Gondar</Text>
          <Text style={[styles.pageTitle, { color: tokens.primary }]}>Student Clearance</Text>
          <Text style={[styles.pageSubtitle, { color: tokens.onSurfaceVariant }]}>
            Select your primary campus to begin the administrative clearance process.
          </Text>

          {/* Campus Cards */}
          <View style={styles.campusList}>
            {campuses.map((c) => {
              const active = selected === c.code;
              return (
                <Pressable
                  key={c.code}
                  style={[styles.campusCard, {
                    backgroundColor: tokens.surfaceContainerLowest,
                    borderColor: active ? tokens.secondary : "rgba(128,128,128,0.08)",
                    borderWidth: active ? 2 : 1,
                    shadowColor: isDark ? "#000" : "#000",
                  }]}
                  onPress={() => setSelected(c.code)}
                >
                  <View style={[styles.campusBadge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.campusBadgeText, { color: c.text }]}>{c.code}</Text>
                  </View>
                  <View style={styles.campusCopy}>
                    <Text style={[styles.campusName, { color: tokens.primary }]}>{c.name}</Text>
                    <Text style={[styles.campusNote, { color: tokens.onSurfaceVariant }]}>{c.note}</Text>
                  </View>
                  {active && (
                    <MaterialIcons name="check-circle" size={22} color={tokens.secondary} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Sign-in Card */}
          <View style={[styles.signInCard, {
            backgroundColor: isDark ? "rgba(20,22,28,0.9)" : "rgba(255,255,255,0.72)",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
          }]}>
            <View style={styles.lockWatermark}>
              <MaterialIcons name="lock" size={100} color={isDark ? "rgba(255,255,255,0.04)" : tokens.onSurface} />
            </View>
            <Text style={[styles.secureEyebrow, { color: tokens.onSurfaceVariant }]}>Secure access</Text>
            <Text style={[styles.signInTitle, { color: tokens.primary }]}>Sign in</Text>

            {/* Student ID */}
            <Text style={[styles.fieldLabel, { color: tokens.onSurfaceVariant }]}>Student ID</Text>
            <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
              <MaterialIcons name="person" size={20} color={tokens.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: tokens.onSurface }]}
                placeholder="e.g. UGR/123/14"
                placeholderTextColor={tokens.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {/* Password */}
            <View style={styles.passwordHeader}>
              <Text style={[styles.fieldLabel, { color: tokens.onSurfaceVariant }]}>Password</Text>
              <Pressable onPress={() => setShowForgot(true)}>
                <Text style={[styles.forgotLink, { color: tokens.secondary }]}>Forgot password?</Text>
              </Pressable>
            </View>
            <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
              <MaterialIcons name="lock" size={20} color={tokens.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1, color: tokens.onSurface }]}
                placeholder="••••••••"
                placeholderTextColor={tokens.onSurfaceVariant}
                secureTextEntry={!passwordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeBtn}>
                <MaterialIcons
                  name={passwordVisible ? "visibility" : "visibility-off"}
                  size={20}
                  color={tokens.outline}
                />
              </Pressable>
            </View>

            {error ? <Text style={[styles.errorText, { backgroundColor: tokens.errorContainer, color: tokens.onErrorContainer }]}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.continueBtn, {
                backgroundColor: tokens.secondary,
                shadowColor: isDark ? "#000" : "#006a63",
              }, (pressed || submitting) && { opacity: 0.8 }]}
              onPress={() => void handleLogin()}
              disabled={submitting}
            >
              <Text style={styles.continueBtnText}>{submitting ? "Signing in…" : "Continue"}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: tokens.surfaceContainerLow, borderTopColor: tokens.outlineVariant }]}>
        {[
          { label: "Overview", icon: "dashboard", active: true },
          { label: "Payments", icon: "payments", active: false },
          { label: "Inquiries", icon: "help-outline", active: false },
          { label: "Certificate", icon: "verified", active: false },
        ].map((tab) => (
          <View key={tab.label} style={[styles.navTab, tab.active && { backgroundColor: tokens.secondaryContainer }]}>
            <MaterialIcons
              name={tab.icon as any}
              size={22}
              color={tab.active ? tokens.onSecondaryContainer : tokens.onSurfaceVariant}
            />
            <Text style={[styles.navLabel, tab.active && { color: tokens.onSecondaryContainer, fontWeight: "700" }]}>{tab.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 44 : 0,
  },
  appBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  appBarTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 100, gap: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 30, fontWeight: "800", marginBottom: 6 },
  pageSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  campusList: { gap: 12, marginBottom: 24 },
  campusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  campusBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  campusBadgeText: { fontSize: 16, fontWeight: "900" },
  campusCopy: { flex: 1, gap: 3 },
  campusName: { fontSize: 16, fontWeight: "800" },
  campusNote: { fontSize: 12, lineHeight: 17 },
  signInCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 8,
  },
  lockWatermark: { position: "absolute", top: 0, right: 10, opacity: 0.04 },
  secureEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  signInTitle: { fontSize: 30, fontWeight: "900", marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: -4 },
  passwordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forgotLink: { fontSize: 12, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  inputIcon: {},
  input: { flex: 1, fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorText: {
    fontSize: 13,
    padding: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  continueBtn: {
    borderRadius: 9999,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 12,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 2,
  },
  navLabel: { fontSize: 11, fontWeight: "500" },
});
