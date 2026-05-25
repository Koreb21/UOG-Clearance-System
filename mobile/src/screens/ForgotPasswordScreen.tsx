import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { ScreenContainer } from "../components/ScreenContainer";
import { api } from "../lib/api";
import { tokens } from "../theme/tokens";

type Step = "email" | "code" | "password";

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRequestCode() {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.requestPasswordReset(email.trim());
      setStep("code");
      setSuccessMessage("Verification code sent to your email!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (verificationCode.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.verifyResetCode(email.trim(), verificationCode);
      setStep("password");
      setSuccessMessage("Code verified! Now set your new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired verification code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.resetPassword(email.trim(), verificationCode, newPassword);
      setSuccessMessage("Password reset successfully! Going back to login...");
      setTimeout(() => {
        navigation.navigate("Login" as never);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "code") {
      setStep("email");
      setVerificationCode("");
    } else if (step === "password") {
      setStep("code");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      navigation.navigate("Login" as never);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <LinearGradient
            colors={["#0f766e", "#0d5b55", "#1c2430"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
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
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={24} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formCard}>
            {step === "email" && (
              <>
                <Text style={styles.formLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={tokens.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>Enter the email associated with your account</Text>
              </>
            )}

            {step === "code" && (
              <>
                <Text style={styles.formLabel}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={tokens.muted}
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={styles.hint}>Enter the 6-digit code sent to your email (expires in 10 minutes)</Text>
              </>
            )}

            {step === "password" && (
              <>
                <Text style={styles.formLabel}>New Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={tokens.muted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color={tokens.muted}
                    />
                  </Pressable>
                </View>

                <Text style={styles.formLabel}>Confirm Password</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={tokens.muted}
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
              style={[
                styles.primaryButton,
                loading && styles.buttonDisabled
              ]}
              onPress={
                step === "email"
                  ? handleRequestCode
                  : step === "code"
                  ? handleVerifyCode
                  : handleResetPassword
              }
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {step === "email"
                    ? "Send Code"
                    : step === "code"
                    ? "Verify Code"
                    : "Reset Password"}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={handleBack}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  banner: {
    borderRadius: tokens.radiusLg,
    padding: 24,
    gap: 10,
    marginBottom: 16,
    ...tokens.shadowSoft
  },
  bannerIcon: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 12
  },
  bannerEyebrow: {
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "500"
  },
  successCard: {
    backgroundColor: "#ecfdf5",
    borderColor: "#6ee7b7",
    borderWidth: 1,
    borderRadius: tokens.radiusMd,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  successText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "500",
    flex: 1
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
    borderWidth: 1,
    borderRadius: tokens.radiusMd,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "500",
    flex: 1
  },
  formCard: {
    backgroundColor: "#f9fafb",
    borderRadius: tokens.radiusMd,
    padding: 20,
    marginBottom: 24
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: tokens.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 12
  },
  codeInput: {
    fontSize: 32,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 12
  },
  passwordInputWrapper: {
    position: "relative",
    marginBottom: 16
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 12
  },
  hint: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 16
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: tokens.radiusMd,
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: tokens.radiusMd,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff"
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "600"
  }
});
