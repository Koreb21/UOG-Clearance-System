import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { useTheme } from "../modules/theme/ThemeContext";

export function ChangePasswordScreen() {
  const { token, completePasswordChange, logout } = useAuth();
  const { tokens, mode } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDark = mode === "dark";

  async function handleSubmit() {
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => completePasswordChange(), 800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <View style={[styles.successCard, {
          backgroundColor: isDark ? tokens.surfaceContainerLow : tokens.surfaceContainerLowest,
          ...tokens.shadowSoft,
        }]}>
          <MaterialIcons name="check-circle" size={48} color={tokens.secondary} />
          <Text style={[styles.successTitle, { color: tokens.onSurface }]}>Password Updated</Text>
          <Text style={[styles.successBody, { color: tokens.onSurfaceVariant }]}>
            Your password has been changed successfully. Taking you back to the app…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <LinearGradient colors={[isDark ? tokens.primaryContainer : "#000511", isDark ? "#001e40" : "#006a63"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.appBar, { paddingTop: Platform.OS === "ios" ? 44 : 0 }]}
      >
        <View style={styles.appBarLeft}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="school" size={20} color="#fff" />
          </View>
          <Text style={styles.appBarTitle}>Secure Access</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.eyebrow, { color: tokens.secondary }]}>First login</Text>
          <Text style={[styles.title, { color: tokens.onSurface }]}>Choose a secure password</Text>
          <Text style={[styles.copy, { color: tokens.onSurfaceVariant }]}>
            Replace the temporary password from the super admin before using the student portal.
          </Text>

          <View style={[styles.card, {
            backgroundColor: isDark ? tokens.surfaceContainerLow : tokens.surfaceContainerLowest,
            borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.06)",
            ...tokens.shadowSoft,
          }]}>
            <View style={styles.headIcon}>
              <Ionicons name="shield-checkmark" size={28} color={tokens.secondary} />
            </View>

            <Text style={[styles.fieldLabel, { color: tokens.onSurfaceVariant }]}>Current Password</Text>
            <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
              <MaterialIcons name="lock" size={20} color={tokens.outline} />
              <TextInput
                style={[styles.input, { color: tokens.onSurface }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Current password"
                placeholderTextColor={tokens.onSurfaceVariant}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: tokens.onSurfaceVariant }]}>New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
              <MaterialIcons name="vpn-key" size={20} color={tokens.outline} />
              <TextInput
                style={[styles.input, { color: tokens.onSurface }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 8 characters"
                placeholderTextColor={tokens.onSurfaceVariant}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: tokens.onSurfaceVariant }]}>Confirm New Password</Text>
            <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
              <MaterialIcons name="vpn-key" size={20} color={tokens.outline} />
              <TextInput
                style={[styles.input, { color: tokens.onSurface }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor={tokens.onSurfaceVariant}
              />
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: tokens.errorContainer }]}>
                <MaterialIcons name="error-outline" size={16} color={tokens.onErrorContainer} />
                <Text style={[styles.errorText, { color: tokens.onErrorContainer }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, {
                backgroundColor: tokens.secondary,
                shadowColor: isDark ? "#000" : "#006a63",
                opacity: pressed || saving ? 0.85 : 1,
              }]}
              onPress={() => void handleSubmit()}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save & Continue"}</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, {
                borderColor: tokens.outlineVariant,
                backgroundColor: isDark ? "transparent" : "transparent",
                opacity: pressed ? 0.7 : 1,
              }]}
              onPress={() => void logout()}
            >
              <Text style={[styles.secondaryBtnText, { color: tokens.onSurface }]}>Sign out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appBar: {
    height: Platform.OS === "ios" ? 88 : 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  appBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  appBarTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  successCard: {
    borderRadius: 24, padding: 30,
    alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
  },
  successTitle: { fontSize: 22, fontWeight: "800" },
  successBody: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28, paddingBottom: 60, gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 30, fontWeight: "800", marginBottom: 6 },
  copy: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  card: {
    borderRadius: 24, padding: 24, gap: 12,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 8,
  },
  headIcon: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 16, padding: 12,
  },
  fieldLabel: { fontSize: 12, fontWeight: "500", marginBottom: -4 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 9999, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 15 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10,
  },
  errorText: { fontSize: 13, flex: 1, fontWeight: "600" },
  primaryBtn: {
    borderRadius: 9999, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 9999, height: 48,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: "700" },
});
