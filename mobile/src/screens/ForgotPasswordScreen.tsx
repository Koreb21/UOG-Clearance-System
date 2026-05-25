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
  ActivityIndicator,
} from "react-native";
import { api } from "../lib/api";
import { useTheme } from "../modules/theme/ThemeContext";

type Step = "email" | "code" | "password";

export function ForgotPasswordScreen() {
  const { tokens, mode } = useTheme();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDark = mode === "dark";

  async function handleRequestCode() {
    if (!email.trim()) { setError("Email is required"); return; }
    setError(null); setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setStep("code");
      setSuccessMessage("Verification code sent to your email!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally { setLoading(false); }
  }

  async function handleVerifyCode() {
    if (verificationCode.length !== 6) { setError("Verification code must be 6 digits"); return; }
    setError(null); setLoading(true);
    try {
      await api.verifyResetCode(email.trim(), verificationCode);
      setStep("password");
      setSuccessMessage("Code verified! Now set your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired verification code");
    } finally { setLoading(false); }
  }

  async function handleResetPassword() {
    if (!newPassword) { setError("New password is required"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setError(null); setLoading(true);
    try {
      await api.resetPassword(email.trim(), verificationCode, newPassword);
      setSuccessMessage("Password reset successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally { setLoading(false); }
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <LinearGradient
            colors={[isDark ? tokens.primaryContainer : "#0f766e", isDark ? "#1a3050" : "#0d5b55", isDark ? "#14161c" : "#1c2430"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerIcon}>
              <Ionicons name="lock-open" size={32} color="#fff" />
            </View>
            <Text style={styles.bannerEyebrow}>Password Reset</Text>
            <Text style={styles.bannerTitle}>Recover Your Account</Text>
            <Text style={styles.bannerSubtitle}>
              Step {step === "email" ? "1" : step === "code" ? "2" : "3"} of 3
            </Text>
          </LinearGradient>

          {successMessage && (
            <View style={[styles.successCard, {
              backgroundColor: isDark ? `${tokens.secondary}15` : "#ecfdf5",
              borderColor: isDark ? tokens.secondary : "#6ee7b7",
            }]}>
              <Ionicons name="checkmark-circle" size={24} color={tokens.secondary} />
              <Text style={[styles.successText, { color: isDark ? tokens.onSecondaryContainer : "#047857" }]}>{successMessage}</Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorCard, {
              backgroundColor: isDark ? `${tokens.error}18` : "#fef2f2",
              borderColor: isDark ? tokens.error : "#fca5a5",
            }]}>
              <Ionicons name="alert-circle" size={24} color={tokens.error} />
              <Text style={[styles.errorText, { color: isDark ? tokens.onErrorContainer : "#dc2626" }]}>{error}</Text>
            </View>
          )}

          <View style={[styles.formCard, {
            backgroundColor: isDark ? tokens.surfaceContainerLow : tokens.surfaceContainerLowest,
            borderColor: isDark ? tokens.outlineVariant : "rgba(0,0,0,0.06)",
          }]}>
            {step === "email" && (
              <>
                <Text style={[styles.formLabel, { color: tokens.onSurface }]}>Email Address</Text>
                <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
                  <MaterialIcons name="email" size={20} color={tokens.outline} />
                  <TextInput
                    style={[styles.input, { color: tokens.onSurface }]}
                    placeholder="Enter your email"
                    placeholderTextColor={tokens.onSurfaceVariant}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={[styles.hint, { color: tokens.onSurfaceVariant }]}>Enter the email associated with your account</Text>
              </>
            )}

            {step === "code" && (
              <>
                <Text style={[styles.formLabel, { color: tokens.onSurface }]}>Verification Code</Text>
                <TextInput
                  style={[styles.codeInput, {
                    backgroundColor: tokens.surfaceContainerLowest,
                    color: tokens.onSurface,
                    borderColor: tokens.outlineVariant,
                  }]}
                  placeholder="000000"
                  placeholderTextColor={tokens.onSurfaceVariant}
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={[styles.hint, { color: tokens.onSurfaceVariant }]}>Enter the 6-digit code sent to your email (expires in 10 minutes)</Text>
              </>
            )}

            {step === "password" && (
              <>
                <Text style={[styles.formLabel, { color: tokens.onSurface }]}>New Password</Text>
                <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
                  <MaterialIcons name="vpn-key" size={20} color={tokens.outline} />
                  <TextInput
                    style={[styles.input, { color: tokens.onSurface }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor={tokens.onSurfaceVariant}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    <MaterialIcons name={showPassword ? "visibility" : "visibility-off"} size={20} color={tokens.outline} />
                  </Pressable>
                </View>

                <Text style={[styles.formLabel, { color: tokens.onSurface }]}>Confirm Password</Text>
                <View style={[styles.inputRow, { backgroundColor: tokens.surfaceContainerLowest, borderColor: tokens.outlineVariant }]}>
                  <MaterialIcons name="vpn-key" size={20} color={tokens.outline} />
                  <TextInput
                    style={[styles.input, { color: tokens.onSurface }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={tokens.onSurfaceVariant}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </>
            )}
          </View>

          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, {
                backgroundColor: tokens.secondary,
                shadowColor: isDark ? "#000" : "#006a63",
                opacity: pressed || loading ? 0.85 : 1,
              }]}
              onPress={
                step === "email"
                  ? () => void handleRequestCode()
                  : step === "code"
                    ? () => void handleVerifyCode()
                    : () => void handleResetPassword()
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {step === "email" ? "Send Code" : step === "code" ? "Verify Code" : "Reset Password"}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
  banner: {
    borderRadius: 24, padding: 24, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  bannerIcon: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 16, padding: 12,
  },
  bannerEyebrow: { color: "rgba(255,255,255,0.85)", letterSpacing: 1, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  bannerTitle: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  bannerSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14, fontWeight: "500" },
  successCard: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    flexDirection: "row", gap: 12, alignItems: "center",
  },
  successText: { fontSize: 14, fontWeight: "500", flex: 1 },
  errorCard: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    flexDirection: "row", gap: 12, alignItems: "center",
  },
  errorText: { fontSize: 14, fontWeight: "500", flex: 1 },
  formCard: {
    borderRadius: 20, padding: 20, gap: 12,
    borderWidth: 1,
  },
  formLabel: { fontSize: 14, fontWeight: "600", marginBottom: -4 },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 9999, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  input: { flex: 1, fontSize: 16 },
  codeInput: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 18,
    fontSize: 32, letterSpacing: 12,
    textAlign: "center", fontWeight: "bold",
  },
  hint: { fontSize: 12, marginTop: -4 },
  buttonGroup: { gap: 12 },
  primaryBtn: {
    borderRadius: 16, height: 52,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
