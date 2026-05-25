import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { tokens } from "../theme/tokens";

export function ChangePasswordScreen() {
  const { token, completePasswordChange, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      completePasswordChange();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <LinearGradient colors={["#e8f5f2", tokens.surface]} style={styles.head}>
        <View style={styles.headIcon}>
          <Ionicons name="shield-checkmark" size={28} color={tokens.accent} />
        </View>
        <Text style={styles.eyebrow}>First login</Text>
        <Text style={styles.title}>Choose a secure password</Text>
        <Text style={styles.copy}>
          Replace the temporary password from the super admin before using the student portal.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={tokens.muted}
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="New password"
          placeholderTextColor={tokens.muted}
        />
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm new password"
          placeholderTextColor={tokens.muted}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.primaryButton, saving && styles.primaryDisabled]} onPress={handleSubmit} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? "Saving…" : "Save & continue"}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => void logout()}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  head: {
    borderRadius: tokens.radiusLg,
    padding: 22,
    gap: 10,
    marginBottom: 4
  },
  headIcon: {
    alignSelf: "flex-start",
    backgroundColor: tokens.surfaceElevated,
    borderRadius: 16,
    padding: 12,
    ...tokens.shadowSoft,
    shadowOpacity: 0.06
  },
  eyebrow: {
    color: tokens.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "800"
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    color: tokens.ink
  },
  copy: {
    color: tokens.muted,
    lineHeight: 22,
    fontSize: 15
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radiusLg,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(28,36,48,0.06)"
  },
  input: {
    backgroundColor: tokens.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "rgba(28,36,48,0.12)",
    fontSize: 16,
    color: tokens.ink
  },
  primaryButton: {
    backgroundColor: tokens.accent,
    paddingVertical: 16,
    borderRadius: tokens.radiusPill,
    alignItems: "center",
    marginTop: 4
  },
  primaryDisabled: { opacity: 0.75 },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "rgba(28,36,48,0.12)",
    borderRadius: tokens.radiusPill,
    paddingVertical: 14,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: tokens.ink,
    fontWeight: "700"
  },
  error: {
    color: tokens.dangerInk,
    backgroundColor: tokens.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14
  }
});
