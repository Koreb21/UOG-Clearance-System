import { useState } from "react";
import { useToast } from "../../components/ToastContext";
import { api } from "../../lib/api";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "email" | "code" | "password";

// Icons for professional UI
function LockIcon() {
  return (
    <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg className="w-6 h-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between w-full">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex flex-col items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
              step < currentStep
                ? "bg-green-600 text-white"
                : step === currentStep
                  ? "bg-teal-600 text-white"
                  : "bg-gray-200 text-gray-500"
            }`}
          >
            {step < currentStep ? "✓" : step}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {step === 1 ? "Email" : step === 2 ? "Verify" : "Password"}
          </p>
          {step < 3 && (
            <div
              className={`h-1 w-12 mt-2 transition ${
                step < currentStep ? "bg-green-600" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  if (!isOpen) return null;

  function handleReset() {
    setStep("email");
    setEmail("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResendCountdown(0);
    onClose();
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.requestPasswordReset(email);
      setStep("code");
      showToast(
        `We've sent a verification code to ${email}. Check your inbox and spam folder.`,
        "success"
      );
      setResendCountdown(60);
      const countdown = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send verification code";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.verifyResetCode(email, verificationCode);
      setStep("password");
      showToast("Code verified successfully. Now set your new password.", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid or expired verification code";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(email, verificationCode, newPassword);
      showToast("Password reset successfully! Redirecting to login...", "success");
      setTimeout(() => handleReset(), 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reset password";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);

    try {
      await api.requestPasswordReset(email);
      showToast("Verification code resent to your email", "success");
      setResendCountdown(60);
      const countdown = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resend code";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  const stepNumber = step === "email" ? 1 : step === "code" ? 2 : 3;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <LockIcon />
            <h2 className="text-2xl font-bold text-white">Reset Your Password</h2>
          </div>
          <ProgressBar currentStep={stepNumber} />
        </div>

        {/* Content */}
        <div className="px-6 py-8">

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                    autoFocus
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter the email address associated with your account
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          )}

          {/* Step 2: Verification Code */}
          {step === "code" && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Verification Code
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Enter the 6-digit code sent to <strong>{email}</strong> (expires in 10 minutes)
                </p>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.slice(0, 6).toUpperCase())}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-3xl font-bold tracking-widest transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCountdown > 0 || loading}
                  className="flex-1 text-teal-600 hover:text-teal-700 disabled:text-gray-400 font-semibold py-2 border border-teal-200 hover:border-teal-400 disabled:border-gray-200 rounded-lg transition"
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="flex-1 text-gray-600 hover:text-gray-900 font-semibold py-2 border border-gray-300 rounded-lg transition"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700 font-semibold text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Password requirements:</strong> At least 6 characters, include uppercase, lowercase, numbers
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button
                type="button"
                onClick={() => setStep("code")}
                className="w-full text-gray-600 hover:text-gray-900 font-semibold py-2 border border-gray-300 rounded-lg transition"
              >
                Back
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleReset}
            className="text-gray-600 hover:text-gray-900 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
