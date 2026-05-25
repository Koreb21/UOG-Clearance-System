import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { LanguageToggle } from "../components/LanguageToggle";
import { ThemeToggle } from "../components/ThemeToggle";
import { VoiceInput } from "../components/VoiceInput";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../modules/auth/AuthContext";
import { api } from "../lib/api";

type CampusOption = {
  id: string;
  labelKey: string;
  title: string;
  descriptionKey: string;
  accentClass: string;
};

const campuses: CampusOption[] = [
  {
    id: "TEWODROS",
    labelKey: "campusAlpha",
    title: "Atse Tewodros",
    descriptionKey: "appliedSciencesAgriculture",
    accentClass: "portal-login-campus-accent-primary"
  },
  {
    id: "MARAKI",
    labelKey: "campusBeta",
    title: "Maraki",
    descriptionKey: "socialSciencesHumanities",
    accentClass: "portal-login-campus-accent-secondary"
  },
  {
    id: "FASIL",
    labelKey: "campusGamma",
    title: "Atse Fasil",
    descriptionKey: "mainAdminTechnicalHub",
    accentClass: "portal-login-campus-accent-primary"
  }
];

function UGClearLogoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-icon">
      <path
        d="M12 3 2 8v2h20V8L12 3Zm-7 9h2v5H5v-5Zm4 0h2v5H9v-5Zm4 0h2v5h-2v-5Zm4 0h2v5h-2v-5ZM3 19h18v2H3v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 17a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm1.34-6.3-.62.42c-.56.38-.72.63-.72 1.38h-2c0-1.34.3-2 1.6-2.9l.82-.56a1.6 1.6 0 1 0-2.42-1.38H8a4 4 0 1 1 5.34 3.78Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M12 2 5 5v6c0 5 3.4 9.7 7 11 3.6-1.3 7-6 7-11V5l-7-3Zm-1 13-3-3 1.4-1.4L11 12.2l3.6-3.6L16 10l-5 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowBackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path d="m14.7 17.3-5-5 5-5L13.3 6l-6 6 6 6 1.4-1.4Z" fill="currentColor" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M17 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.4A2.6 2.6 0 1 1 9.4 10 2.6 2.6 0 0 1 12 7.4ZM7 17c0-2 3.4-3.1 5-3.1s5 1.1 5 3.1v.5H7V17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 0V7a2 2 0 1 1 4 0v2h-4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        fill="currentColor"
        d="M12 5c-5.5 0-9.6 4.6-10 6.9.4 2.3 4.5 7.1 10 7.1s9.6-4.8 10-7.1C21.6 9.6 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
      />
      <path fill="currentColor" d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        fill="currentColor"
        d="M3.3 2.3 2 3.6l3.1 3.1C3.6 8.2 2.5 10 2 11.9c.4 2.3 4.5 7.1 10 7.1 2.2 0 4.1-.7 5.7-1.7l2.7 2.7 1.3-1.3L3.3 2.3ZM12 17c-4.2 0-7.6-3.5-8-5.1.3-1.1 1.2-2.6 2.7-3.9l2 2A4 4 0 0 0 14 15.3l2 2c-1.2.9-2.6 1.7-4 1.7Zm9.9-5.1c-.2.9-.9 2.2-2 3.4l-1.5-1.5c.6-.7 1-1.4 1.2-1.9-.3-1.6-3.8-5-8-5-.6 0-1.3.1-1.9.3L8 5.6c1.1-.4 2.4-.6 4-.6 5.5 0 9.6 4.6 9.9 6.9Z"
      />
    </svg>
  );
}

function LoginArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M10 17v-3H3v-4h7V7l5 5-5 5Zm7-12h2v14h-2V5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="portal-login-mini-icon">
      <path
        d="M11 7h2V5h-2v2Zm0 12h2v-8h-2v8Zm1-17a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ResetStep = "email" | "code" | "newpassword" | "done";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { login, logout, user, loading: authLoading } = useAuth();
  const sessionReady = !authLoading;
  const [selectedCampus, setSelectedCampus] = useState<CampusOption | null>(null);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [infoModal, setInfoModal] = useState<null | "privacy" | "terms" | "support" | "faq">(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordVisible, setAdminPasswordVisible] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Forgot password inline flow ──────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [resetPwVisible, setResetPwVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [showDebugOtp, setShowDebugOtp] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);

  const activeCampusName = useMemo(
    () => selectedCampus?.title ?? "Campus",
    [selectedCampus]
  );

  function startResendCountdown() {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function openForgot() {
    setShowForgot(true);
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setResetNewPw("");
    setResetConfirmPw("");
    setResetPwVisible(false);
    setResendCountdown(0);
    setDebugOtp(null);
    setShowDebugOtp(false);
    setRecipientEmail(null);
  }

  function closeForgot() {
    setShowForgot(false);
    setResetStep("email");
  }

  async function handleResetRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail);
      if (res._debug_otp) setDebugOtp(res._debug_otp);
      if (res.recipientEmail) setRecipientEmail(res.recipientEmail);
      setResetStep("code");
      showToast(`A verification code was sent to ${resetEmail}. Check your inbox and spam folder.`, "success");
      startResendCountdown();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send verification code. Please try again.", "error");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    try {
      await api.verifyResetCode(resetEmail, resetCode);
      setResetStep("newpassword");
      showToast("Code verified. Set your new password below.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Invalid or expired code. Please try again.", "error");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (resetNewPw !== resetConfirmPw) { showToast("Passwords do not match.", "error"); return; }
    if (resetNewPw.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; }
    setResetLoading(true);
    try {
      await api.resetPassword(resetEmail, resetCode, resetNewPw);
      setResetStep("done");
      showToast("Your password has been reset successfully. You can now sign in.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reset password. Please try again.", "error");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResendCode() {
    setResetLoading(true);
    try {
      const res = await api.requestPasswordReset(resetEmail);
      if (res._debug_otp) setDebugOtp(res._debug_otp);
      if (res.recipientEmail) setRecipientEmail(res.recipientEmail);
      showToast("A new verification code was sent to your email.", "success");
      startResendCountdown();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to resend code.", "error");
    } finally {
      setResetLoading(false);
    }
  }

  function handleAdminTap() {
    const nextCount = adminTapCount + 1;
    if (nextCount >= 5) {
      setAdminTapCount(0);
      setShowAdminGate(true);
      return;
    }
    setAdminTapCount(nextCount);
  }

  async function handleAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSubmitting(true);
    try {
      await login(adminUsername.trim(), adminPassword);
      setShowAdminGate(false);
      navigate("/admin", { replace: true });
    } catch (submissionError) {
      showToast(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to authenticate admin access.",
        "error"
      );
    } finally {
      setAdminSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(username.trim(), password, selectedCampus?.id ?? null);
      navigate("/");
    } catch (submissionError) {
      showToast(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to sign in",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const resetStepNumber = resetStep === "email" ? 1 : resetStep === "code" ? 2 : resetStep === "newpassword" ? 3 : 4;

  return (
    <div className="portal-login-page">
      <header className="portal-login-header">
        <div className="portal-login-header-inner">
          <button
            type="button"
            className="portal-login-header-brand"
            onClick={handleAdminTap}
            aria-label="UGClear admin gateway trigger"
            title="Tap five times for admin gateway"
          >
            <UGClearLogoIcon />
            <span className="font-black tracking-tight">UGClear</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <LanguageToggle />
            {user && sessionReady ? (
              <>
                <button
                  type="button"
                  className="portal-login-inline-link rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm"
                  onClick={() => navigate("/", { replace: true })}
                >
                  {t("dashboard")}
                </button>
                <SessionControls density="compact" />
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="portal-login-main">
        <div className="portal-login-backdrop">
          <div className="portal-login-backdrop-a" />
          <div className="portal-login-backdrop-b" />
        </div>

        <section className="portal-login-shell">
          <div className="portal-login-left">
            <div className="portal-login-left-overlay" />
            <div className="portal-login-left-city" />

            <div className="portal-login-left-copy">
              <div>
                <p className="portal-login-eyebrow">{t("digitalPortal")}</p>
                <h1>{t("institutionalClearance")}</h1>
              </div>
              <p>{t("officialPortalDescription")}</p>
            </div>

            <div className="portal-login-security">
              <div className="portal-login-security-icon">
                <ShieldIcon />
              </div>
              <div>
                <strong>{t("secureGateway")}</strong>
                <span>{t("authenticatedAccessOnly")}</span>
              </div>
            </div>
          </div>

          <div className="portal-login-right">
            {/* ── Forgot Password inline form ───────────────────────── */}
            {showForgot ? (
              <div className="portal-login-form-wrap">
                <div className="portal-login-form-head">
                  <button
                    type="button"
                    className="portal-login-back-button"
                    onClick={closeForgot}
                    aria-label="Back to sign in"
                  >
                    <ArrowBackIcon />
                  </button>
                  <div>
                    <h2>{t("resetPassword")}</h2>
                    <p>
                      {resetStep === "email" && t("enterYourEmail")}
                      {resetStep === "code" && t("enter6DigitCode")}
                      {resetStep === "newpassword" && t("chooseStrongPassword")}
                      {resetStep === "done" && t("passwordResetComplete")}
                    </p>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-1 mb-5">
                  {[
                    { n: 1, label: "Email" },
                    { n: 2, label: "Verify" },
                    { n: 3, label: "Password" }
                  ].map((s, i) => (
                    <div key={s.n} className="flex items-center gap-1 flex-1">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        s.n < resetStepNumber
                          ? "bg-green-600 text-white"
                          : s.n === resetStepNumber
                          ? "bg-[#001e40] text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}>
                        {s.n < resetStepNumber ? "✓" : s.n}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">{s.label}</span>
                      {i < 2 && <div className={`flex-1 h-0.5 ${s.n < resetStepNumber ? "bg-green-500" : "bg-slate-200"}`} />}
                    </div>
                  ))}
                </div>

                {resetStep === "done" ? (
                  <div className="flex flex-col gap-3 text-center">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <span className="material-symbols-outlined text-green-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">Your password has been reset. Sign in with your new password.</p>
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="portal-login-submit"
                    >
                      <span>{t("backToLogin")}</span>
                      <LoginArrowIcon />
                    </button>
                  </div>
                ) : resetStep === "email" ? (
                  <form onSubmit={handleResetRequestCode} className="portal-login-form">
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <BadgeIcon />
                        {t("universityEmail")}
                      </span>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="you@uog.edu.et"
                        required
                        autoFocus
                      />
                    </label>
                    <p className="text-xs text-slate-500 -mt-2">
                      {t("enterEmailForCode")}
                    </p>
                    <button
                      type="submit"
                      className="portal-login-submit"
                      disabled={resetLoading || !resetEmail}
                    >
                      <span>{resetLoading ? t("sendCode") + "…" : t("sendCode")}</span>
                      <LoginArrowIcon />
                    </button>
                  </form>
                ) : resetStep === "code" ? (
                  <form onSubmit={handleResetVerifyCode} className="portal-login-form">
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        6-Digit Verification Code
                      </span>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        required
                        autoFocus
                        style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5em", fontWeight: "bold" }}
                      />
                    </label>
                    <p className="text-xs text-slate-500 -mt-2">
                      Code sent to <strong>{resetEmail}</strong>. It expires in 60 minutes.
                    </p>
                    {debugOtp && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mb-1">Verification Code</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-blue-900 tracking-widest font-mono">{debugOtp}</span>
                        </div>
                        {recipientEmail && (
                          <p className="text-[10px] text-blue-600 mt-1">Sent to: <strong>{recipientEmail}</strong></p>
                        )}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="portal-login-submit"
                      disabled={resetLoading || resetCode.length !== 6}
                    >
                      <span>{resetLoading ? t("verifyCode") + "…" : t("verifyCode")}</span>
                      <LoginArrowIcon />
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCountdown > 0 || resetLoading}
                        className="portal-login-inline-link flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-xs font-bold disabled:opacity-50"
                      >
                        {resendCountdown > 0 ? `${t("resendCode")} ${resendCountdown}s` : t("resendCode")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetStep("email")}
                        className="flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-500 hover:border-slate-400"
                      >
                        {t("changeEmail")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSetPassword} className="portal-login-form">
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        {t("newPassword")}
                      </span>
                      <div style={{ position: "relative" }}>
                        <input
                          type={resetPwVisible ? "text" : "password"}
                          value={resetNewPw}
                          onChange={(e) => setResetNewPw(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          autoFocus
                          style={{ paddingRight: "44px" }}
                        />
                        <button
                          type="button"
                          onClick={() => setResetPwVisible((v) => !v)}
                          style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", padding: "6px", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", zIndex: 2 }}
                          aria-label={resetPwVisible ? "Hide password" : "Show password"}
                        >
                          {resetPwVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </label>
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        {t("confirmPassword")}
                      </span>
                      <input
                        type={resetPwVisible ? "text" : "password"}
                        value={resetConfirmPw}
                        onChange={(e) => setResetConfirmPw(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      className="portal-login-submit"
                      disabled={resetLoading || !resetNewPw || !resetConfirmPw}
                    >
                      <span>{resetLoading ? t("resetPassword") + "…" : t("resetPassword")}</span>
                      <LoginArrowIcon />
                    </button>
                  </form>
                )}
              </div>
            ) : !selectedCampus ? (
              <>
                <div className="portal-login-selection-head">
                  <h2>{t("selectCampus")}</h2>
                  <p>{t("choosePrimaryLocation")}</p>
                </div>

                <div className="portal-login-campus-grid">
                  {campuses.map((campus) => (
                    <button
                      key={campus.id}
                      type="button"
                      className={`portal-login-campus-card ${campus.accentClass}`}
                      onClick={() => setSelectedCampus(campus)}
                      disabled={!sessionReady}
                    >
                      <span className="portal-login-campus-label">{t(campus.labelKey)}</span>
                      <strong>{campus.title}</strong>
                      <p>{t(campus.descriptionKey)}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="portal-login-form-wrap">
                <div className="portal-login-form-head">
                  <button
                    type="button"
                    className="portal-login-back-button"
                    onClick={() => setSelectedCampus(null)}
                    aria-label="Back to campus selection"
                  >
                    <ArrowBackIcon />
                  </button>
                  <div>
                    <h2>{activeCampusName} Login</h2>
                    <p>Enter your university credentials to proceed.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="portal-login-form">
                  <label className="portal-login-field">
                    <span className="portal-login-field-label">
                      <BadgeIcon />
                      {t("idOrEmail")}
                    </span>
                    <div style={{ position: "relative" }}>
                      <input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder={t("usernamePlaceholder")}
                        required
                        style={{ paddingRight: "44px" }}
                      />
                      <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
                        <VoiceInput
                          onTranscript={(text) => setUsername((prev) => (prev ? prev + text : text))}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </label>

                  <label className="portal-login-field">
                    <span className="portal-login-field-row">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        {t("password")}
                      </span>
                    </span>
                    <div style={{ position: "relative" }}>
                      <input
                        type={passwordVisible ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        style={{ paddingRight: "80px" }}
                      />
                      <div style={{ position: "absolute", right: "38px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
                        <VoiceInput
                          onTranscript={(text) => { setPassword(text); setPasswordVisible(true); }}
                          disabled={submitting}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPasswordVisible((v) => !v)}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        title={passwordVisible ? "Hide password" : "Show password"}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          padding: "6px",
                          cursor: "pointer",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 2,
                          opacity: 0.8,
                          lineHeight: 0
                        }}
                      >
                        {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </label>

                  <button className="portal-login-submit" disabled={submitting || !sessionReady}>
                    <span>
                      {!sessionReady ? "Preparing session…" : submitting ? "Signing in..." : "Access Clearance Dashboard"}
                    </span>
                    <LoginArrowIcon />
                  </button>
                </form>

                {/* ── Forgot Password CTA ──────────────────────────────── */}
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#001e40]/10">
                        <LockIcon />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Forgot your password?</p>
                        <p className="text-xs text-slate-500">Reset it securely using your university email.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openForgot}
                      className="shrink-0 rounded-lg border border-[#001e40]/20 bg-[#001e40]/5 px-3 py-2 text-xs font-bold text-[#001e40] hover:bg-[#001e40]/10 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="portal-login-access-note">
                  <div className="portal-login-access-note-title">
                    <InfoIcon />
                    <span>Access Notice</span>
                  </div>
                  <p>
                    Accounts are provisioned per campus. Contact the Registrar&apos;s Office
                    if login fails.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="portal-login-footer">
        <div className="portal-login-footer-inner">
          <div className="portal-login-footer-copy">
            <p>{t("copyright")}</p>
            <span>{t("experienceDigital")}</span>
          </div>
          <div className="portal-login-footer-links">
            <button type="button" onClick={() => setInfoModal("privacy")} className="portal-login-footer-link">{t("privacy")}</button>
            <button type="button" onClick={() => setInfoModal("terms")} className="portal-login-footer-link">{t("terms")}</button>
            <button type="button" onClick={() => setInfoModal("support")} className="portal-login-footer-link">{t("support")}</button>
            <button type="button" onClick={() => setInfoModal("faq")} className="portal-login-footer-link">{t("faqs")}</button>
          </div>
        </div>
      </footer>

      {/* Help / FAQ Modal */}
      {showHelp ? (
        <div
          role="dialog"
          aria-modal="true"
          className="role-navigator-admin-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(8, 15, 28, 0.68)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "1rem",
              padding: "1.75rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Help & FAQ</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: "6px", color: "#64748b", borderRadius: "8px" }}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <details style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem 1rem" }} open>
                <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>How do I sign in?</summary>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                  1. Select your campus (Atse Tewodros, Maraki, or Atse Fasil).<br/>
                  2. Enter your university ID or email and password.<br/>
                  3. Click "Sign In" to access your dashboard.
                </p>
              </details>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem 1rem" }}>
                <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>Forgot your password?</summary>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                  Click the "Forgot password?" link below the password field. Enter your registered email, and we will send you a verification code to reset it.
                </p>
              </details>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem 1rem" }}>
                <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>Demo accounts for testing</summary>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                  <strong>Students:</strong> student1 / student123<br/>
                  <strong>Staff:</strong> librarian / staff123<br/>
                  <strong>Finance:</strong> finance / finance123<br/>
                  <strong>Registrar:</strong> registrar / reg123<br/>
                  <strong>Admin:</strong> admin / admin123
                </p>
              </details>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.75rem 1rem" }}>
                <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>Who do I contact for support?</summary>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                  For technical issues, contact the University of Gondar ICT office at <a href="mailto:ict@uog.edu.et" style={{ color: "#003366" }}>ict@uog.edu.et</a>. For clearance-related questions, reach out to the Registrar's Office.
                </p>
              </details>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Info Modals (Privacy / Terms / Support / FAQ) ─────────── */}
      {infoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="role-navigator-admin-backdrop"
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(8,15,28,0.68)", display: "grid", placeItems: "center", zIndex: 1000, padding: "1rem" }}
          onClick={() => setInfoModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "1rem", padding: "0", maxWidth: "560px", width: "100%", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Modal header */}
            <div style={{ background: "linear-gradient(135deg,#001e40 0%,#003366 100%)", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span className="material-symbols-outlined" style={{ color: "rgba(255,255,255,0.8)", fontSize: "22px" }}>
                  {infoModal === "privacy" ? "privacy_tip" : infoModal === "terms" ? "gavel" : infoModal === "support" ? "support_agent" : "quiz"}
                </span>
                <h3 style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: "1rem" }}>
                  {infoModal === "privacy" ? t("privacy") : infoModal === "terms" ? t("terms") : infoModal === "support" ? t("support") : t("faqs")}
                </h3>
              </div>
              <button type="button" onClick={() => setInfoModal(null)} style={{ background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", padding: "6px", color: "#fff", borderRadius: "8px", display: "flex", alignItems: "center" }} aria-label="Close">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>close</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

              {infoModal === "privacy" && (
                <>
                  <div style={{ background: "#f0f7ff", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: "4px solid #003366" }}>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e3a5f", fontWeight: 600 }}>University of Gondar — UGClear Data Privacy Notice</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#475569" }}>Effective January 2025 · Reviewed annually</p>
                  </div>
                  {[
                    { title: "What Information We Collect", body: "UGClear collects student identification details (ID number, name, program, department), academic enrolment records, administrative clearance status per office, financial liability records, and staff credentials necessary for role-based portal access. No sensitive personal data beyond academic and administrative scope is processed." },
                    { title: "How We Use Your Data", body: "Data is used exclusively to administer the institutional clearance process: verifying departmental approvals, tracking outstanding fines and liabilities, issuing digitally-signed clearance certificates, and enabling authorised staff to review student records in their assigned offices. Data is never sold or shared with external third parties." },
                    { title: "Data Storage & Security", body: "All records are stored on University of Gondar servers hosted within Ethiopia. Access is role-restricted and authenticated via JSON Web Tokens. Transmission is encrypted using TLS 1.3. Database backups are maintained with a 30-day retention period in accordance with the university's IT Security Policy." },
                    { title: "Your Rights", body: "Students and staff have the right to access their own records, request corrections to inaccurate data, and raise objections to specific processing activities. Requests should be directed to the University Registrar's Office or the ICT Directorate in writing." },
                    { title: "Data Retention", body: "Clearance records are retained for a minimum of five (5) years after graduation or separation, in compliance with Ethiopian higher education regulations. Financial liability records are retained for seven (7) years." },
                    { title: "Contact", body: "Data Protection queries: ict@uog.edu.et · University of Gondar, Gondar, Amhara Region, Ethiopia." },
                  ].map(s => (
                    <details key={s.title} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                      <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer", fontSize: "0.875rem" }}>{s.title}</summary>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>{s.body}</p>
                    </details>
                  ))}
                </>
              )}

              {infoModal === "terms" && (
                <>
                  <div style={{ background: "#f0f7ff", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: "4px solid #003366" }}>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e3a5f", fontWeight: 600 }}>UGClear Portal — Terms & Conditions of Use</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#475569" }}>Governing use of the University of Gondar Institutional Clearance System</p>
                  </div>
                  {[
                    { title: "1. Acceptance of Terms", body: "By accessing and using the UGClear portal, you agree to be bound by these Terms & Conditions and all applicable University of Gondar policies. If you do not agree, you must not use this system." },
                    { title: "2. Authorised Use", body: "This portal is exclusively for registered students, academic staff, administrative staff, and system administrators of the University of Gondar. Access credentials are personal and non-transferable. Sharing login credentials is strictly prohibited and may result in disciplinary action." },
                    { title: "3. Student Obligations", body: "Students must ensure all submitted information is accurate and complete. Providing false or misleading information to obtain clearance constitutes academic misconduct and will be referred to the university's disciplinary committee." },
                    { title: "4. Staff Obligations", body: "Staff members must process clearance requests in a timely manner, maintain confidentiality of student records, and only access records relevant to their assigned office. Unauthorised access to other departments' records is prohibited." },
                    { title: "5. Financial Liabilities", body: "All outstanding fines, fees, and liabilities must be settled before a clearance certificate can be issued. The university reserves the right to withhold transcripts, degrees, and certificates until all financial obligations are cleared." },
                    { title: "6. Clearance Certificate Validity", body: "Digital clearance certificates issued by UGClear are valid for the academic year specified. Certificates include a QR verification code. Tampering with or forging clearance documents is a criminal offence under Ethiopian law." },
                    { title: "7. System Availability", body: "The university endeavours to maintain portal availability but does not guarantee uninterrupted access. Scheduled maintenance windows will be communicated in advance. The university is not liable for losses arising from temporary unavailability." },
                    { title: "8. Governing Law", body: "These terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Disputes shall be resolved through the University of Gondar's internal dispute resolution procedures before referral to competent courts." },
                  ].map(s => (
                    <details key={s.title} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                      <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer", fontSize: "0.875rem" }}>{s.title}</summary>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>{s.body}</p>
                    </details>
                  ))}
                </>
              )}

              {infoModal === "support" && (
                <>
                  <div style={{ background: "#f0f7ff", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: "4px solid #003366" }}>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e3a5f", fontWeight: 600 }}>University of Gondar — UGClear Support</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#475569" }}>Available Sunday–Thursday, 08:00–17:00 EAT</p>
                  </div>
                  {[
                    { icon: "computer", label: "ICT Directorate (Technical Support)", lines: ["For login issues, account lockouts, portal errors, and technical problems.", "📧 ict@uog.edu.et", "📞 +251 58 114 1231  (ext. 2200)", "🏢 ICT Building, Main Campus, Gondar"] },
                    { icon: "school", label: "Registrar's Office (Clearance Queries)", lines: ["For clearance status, certificate issuance, and academic records.", "📧 registrar@uog.edu.et", "📞 +251 58 114 1231  (ext. 1100)", "🏢 Administration Block, Ground Floor"] },
                    { icon: "account_balance", label: "Finance Office (Fee & Liability Issues)", lines: ["For outstanding fines, payment confirmation, and fee disputes.", "📧 finance@uog.edu.et", "📞 +251 58 114 1231  (ext. 1300)", "🏢 Finance Block, Room 004"] },
                    { icon: "library_books", label: "Library (Library Clearance)", lines: ["For unreturned books, library fines, and library clearance.", "📧 library@uog.edu.et", "📞 +251 58 114 1231  (ext. 1500)", "🏢 Central Library Building"] },
                    { icon: "location_on", label: "University of Gondar", lines: ["P.O. Box 196, Gondar, Amhara Region, Ethiopia", "🌐 www.uog.edu.et"] },
                  ].map(s => (
                    <div key={s.label} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <div style={{ flexShrink: 0, width: "36px", height: "36px", borderRadius: "8px", background: "#e8f0fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ color: "#003366", fontSize: "20px" }}>{s.icon}</span>
                      </div>
                      <div>
                        <p style={{ margin: "0 0 0.375rem", fontWeight: 700, fontSize: "0.875rem", color: "#0f172a" }}>{s.label}</p>
                        {s.lines.map(l => <p key={l} style={{ margin: "0.1rem 0", fontSize: "0.8rem", color: "#475569" }}>{l}</p>)}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {infoModal === "faq" && (
                <>
                  <div style={{ background: "#f0f7ff", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: "4px solid #003366" }}>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e3a5f", fontWeight: 600 }}>Frequently Asked Questions — UGClear Portal</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#475569" }}>University of Gondar Institutional Clearance System</p>
                  </div>
                  {[
                    { q: "What is UGClear?", a: "UGClear is the University of Gondar's official digital institutional clearance portal. It replaces the manual paper-based clearance process, allowing students to apply for clearance online and enabling administrative offices to review and approve requests digitally from any campus location." },
                    { q: "Who needs institutional clearance?", a: "All graduating students, students taking leave of absence, students transferring to another institution, and employees separating from the university must obtain institutional clearance before academic documents (degree certificates, transcripts, etc.) can be released." },
                    { q: "How do I start my clearance application?", a: "Log in with your university ID and password on your campus portal. From your Student Dashboard, click 'Apply for Clearance' and submit the application. Your request will be sent to all required offices simultaneously." },
                    { q: "Which offices must approve my clearance?", a: "Typically: Library (no unreturned books), Proctor's Office (no disciplinary issues), Department Head (academic requirements met), Dean of Students (student affairs), Cafeteria (no outstanding dues), Finance Office (all fees paid), and the Registrar (final sign-off). The exact offices depend on your campus and programme." },
                    { q: "What happens if an office flags my request?", a: "If an office finds an issue (e.g. an outstanding fine or unreturned item), they will flag your request with a reason. You will see this on your dashboard. Resolve the issue with that office, then they can lift the flag and approve your clearance." },
                    { q: "How do I pay outstanding fines?", a: "Visit the Finance Office with your student ID and the fine details shown on your dashboard. Once payment is confirmed, the Finance Officer will update your status in the system. Keep your payment receipt until clearance is fully issued." },
                    { q: "How long does clearance take?", a: "Once submitted, most requests are processed within 3–5 working days, provided no outstanding issues exist. Complex cases involving fines or disciplinary reviews may take longer. You can track real-time status on your dashboard." },
                    { q: "How do I get my clearance certificate?", a: "Once all offices have approved your request, the Registrar will issue a digitally-signed PDF clearance certificate. It will appear on your Student Dashboard under 'My Clearance Certificate' and can be downloaded and printed at any time." },
                    { q: "Is my clearance certificate authentic?", a: "Yes. Each certificate contains a unique QR verification code that any institution or employer can scan to verify its authenticity directly through the UGClear verification portal at the University of Gondar website." },
                    { q: "I can't log in — what should I do?", a: "First, ensure you are selecting the correct campus before entering credentials. If you have forgotten your password, use the 'Forgot password?' link on the login form. For persistent issues, contact the ICT Directorate at ict@uog.edu.et or call ext. 2200." },
                  ].map(s => (
                    <details key={s.q} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.75rem 1rem" }}>
                      <summary style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer", fontSize: "0.875rem" }}>{s.q}</summary>
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>{s.a}</p>
                    </details>
                  ))}
                </>
              )}

            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e2e8f0", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "#f8fafc" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>© 2026 University of Gondar · UGClear</p>
              <button type="button" onClick={() => setInfoModal(null)} style={{ background: "#003366", color: "#fff", border: "none", borderRadius: "8px", padding: "0.5rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showAdminGate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-gateway-title"
          className="role-navigator-admin-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(8, 15, 28, 0.68)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
        >
          <form
            onSubmit={handleAdminSubmit}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "1rem",
              display: "grid",
              gap: "0.75rem"
            }}
          >
            <h3 id="admin-gateway-title" style={{ margin: 0 }}>Admin Security Authentication</h3>
            <input
              value={adminUsername}
              onChange={(event) => setAdminUsername(event.target.value)}
              placeholder="Admin username"
              autoComplete="username"
              required
            />
            <div style={{ position: "relative" }}>
              <input
                type={adminPasswordVisible ? "text" : "password"}
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Admin password"
                autoComplete="current-password"
                required
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                onClick={() => setAdminPasswordVisible((v) => !v)}
                aria-label={adminPasswordVisible ? "Hide admin password" : "Show admin password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  padding: "6px",
                  cursor: "pointer",
                  color: "#001e40",
                  opacity: 0.8
                }}
              >
                {adminPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowAdminGate(false);
                  setAdminUsername("");
                  setAdminPassword("");
                  setAdminPasswordVisible(false);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={adminSubmitting || !sessionReady}>
                {adminSubmitting ? "Authenticating..." : "Open Admin Dashboard"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
