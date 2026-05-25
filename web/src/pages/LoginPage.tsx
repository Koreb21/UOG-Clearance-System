import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { useAuth } from "../modules/auth/AuthContext";
import { api } from "../lib/api";

type CampusOption = {
  id: string;
  label: string;
  title: string;
  description: string;
  accentClass: string;
};

const campuses: CampusOption[] = [
  {
    id: "TEWODROS",
    label: "Campus Alpha",
    title: "Atse Tewodros",
    description: "Applied Sciences & Agriculture.",
    accentClass: "portal-login-campus-accent-primary"
  },
  {
    id: "MARAKI",
    label: "Campus Beta",
    title: "Maraki",
    description: "Social Sciences & Humanities.",
    accentClass: "portal-login-campus-accent-secondary"
  },
  {
    id: "FASIL",
    label: "Campus Gamma",
    title: "Atse Fasil",
    description: "Main Admin & Technical Hub.",
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
  const { login, user, loading: authLoading } = useAuth();
  const sessionReady = !authLoading;
  const [selectedCampus, setSelectedCampus] = useState<CampusOption | null>(null);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordVisible, setAdminPasswordVisible] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Forgot password inline flow ──────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [resetPwVisible, setResetPwVisible] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

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
    setResetError(null);
    setResetSuccess(null);
    setResendCountdown(0);
  }

  function closeForgot() {
    setShowForgot(false);
    setResetStep("email");
    setResetError(null);
    setResetSuccess(null);
  }

  async function handleResetRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      await api.requestPasswordReset(resetEmail);
      setResetStep("code");
      setResetSuccess(`A verification code was sent to ${resetEmail}. Check your inbox and spam folder.`);
      startResendCountdown();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send verification code. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      await api.verifyResetCode(resetEmail, resetCode);
      setResetStep("newpassword");
      setResetSuccess("Code verified. Set your new password below.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Invalid or expired code. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    if (resetNewPw !== resetConfirmPw) { setResetError("Passwords do not match."); return; }
    if (resetNewPw.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    setResetLoading(true);
    try {
      await api.resetPassword(resetEmail, resetCode, resetNewPw);
      setResetStep("done");
      setResetSuccess("Your password has been reset successfully. You can now sign in.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResendCode() {
    setResetError(null);
    setResetLoading(true);
    try {
      await api.requestPasswordReset(resetEmail);
      setResetSuccess("A new verification code was sent to your email.");
      startResendCountdown();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResetLoading(false);
    }
  }

  function handleAdminTap() {
    const nextCount = adminTapCount + 1;
    if (nextCount >= 5) {
      setAdminTapCount(0);
      setShowAdminGate(true);
      setAdminError(null);
      return;
    }
    setAdminTapCount(nextCount);
  }

  async function handleAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSubmitting(true);
    setAdminError(null);
    try {
      await login(adminUsername.trim(), adminPassword);
      setShowAdminGate(false);
      navigate("/admin", { replace: true });
    } catch (submissionError) {
      setAdminError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to authenticate admin access."
      );
    } finally {
      setAdminSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password, selectedCampus?.id ?? null);
      navigate("/");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to sign in"
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
            {user && sessionReady ? (
              <>
                <button
                  type="button"
                  className="portal-login-inline-link rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm"
                  onClick={() => navigate("/", { replace: true })}
                >
                  Portal home
                </button>
                <SessionControls density="compact" />
              </>
            ) : null}
            <button type="button" className="portal-login-help-button" aria-label="Help">
              <HelpIcon />
            </button>
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
                <p className="portal-login-eyebrow">Digital Portal</p>
                <h1>Institutional Clearance.</h1>
              </div>
              <p>
                Official administrative clearance portal for University of Gondar students and staff.
              </p>
            </div>

            <div className="portal-login-security">
              <div className="portal-login-security-icon">
                <ShieldIcon />
              </div>
              <div>
                <strong>Secure Gateway</strong>
                <span>Authenticated access only</span>
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
                    <h2>Reset Password</h2>
                    <p>
                      {resetStep === "email" && "Enter your email to receive a verification code."}
                      {resetStep === "code" && "Enter the 6-digit code sent to your email."}
                      {resetStep === "newpassword" && "Choose a strong new password."}
                      {resetStep === "done" && "Password reset complete."}
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

                {resetSuccess && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <span className="material-symbols-outlined text-green-600 text-base mt-0.5">check_circle</span>
                    <p className="text-sm text-green-700">{resetSuccess}</p>
                  </div>
                )}
                {resetError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <span className="material-symbols-outlined text-red-600 text-base mt-0.5">error</span>
                    <p className="text-sm text-red-700">{resetError}</p>
                  </div>
                )}

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
                      <span>Back to Sign In</span>
                      <LoginArrowIcon />
                    </button>
                  </div>
                ) : resetStep === "email" ? (
                  <form onSubmit={handleResetRequestCode} className="portal-login-form">
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <BadgeIcon />
                        University Email Address
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
                      Enter the email address associated with your UGClear account. We'll send you a one-time verification code.
                    </p>
                    <button
                      type="submit"
                      className="portal-login-submit"
                      disabled={resetLoading || !resetEmail}
                    >
                      <span>{resetLoading ? "Sending code…" : "Send Verification Code"}</span>
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
                      Code sent to <strong>{resetEmail}</strong>. It expires in 10 minutes.
                    </p>
                    <button
                      type="submit"
                      className="portal-login-submit"
                      disabled={resetLoading || resetCode.length !== 6}
                    >
                      <span>{resetLoading ? "Verifying…" : "Verify Code"}</span>
                      <LoginArrowIcon />
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCountdown > 0 || resetLoading}
                        className="portal-login-inline-link flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-xs font-bold disabled:opacity-50"
                      >
                        {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetStep("email")}
                        className="flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-500 hover:border-slate-400"
                      >
                        Change Email
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSetPassword} className="portal-login-form">
                    <label className="portal-login-field">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        New Password
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
                        Confirm New Password
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
                      <span>{resetLoading ? "Resetting password…" : "Reset Password"}</span>
                      <LoginArrowIcon />
                    </button>
                  </form>
                )}
              </div>
            ) : !selectedCampus ? (
              <>
                <div className="portal-login-selection-head">
                  <h2>Select Your Campus</h2>
                  <p>Choose your primary location to begin the clearance process.</p>
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
                      <span className="portal-login-campus-label">{campus.label}</span>
                      <strong>{campus.title}</strong>
                      <p>{campus.description}</p>
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
                      ID or University Email
                    </span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="e.g. UGR/1234/15"
                      required
                    />
                  </label>

                  <label className="portal-login-field">
                    <span className="portal-login-field-row">
                      <span className="portal-login-field-label">
                        <LockIcon />
                        Password
                      </span>
                    </span>
                    <div style={{ position: "relative" }}>
                      <input
                        type={passwordVisible ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                        style={{ paddingRight: "44px" }}
                      />
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

                  {error ? <p className="error-text">{error}</p> : null}

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
            <p>&copy; 2026 UGClear · University of Gondar.</p>
            <span>Excellence Through Digital Transformation</span>
          </div>
          <div className="portal-login-footer-links">
            <a href="/">Privacy</a>
            <a href="/">Terms</a>
            <a href="/">Support</a>
          </div>
        </div>
      </footer>

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
            {adminError ? <p className="error-text">{adminError}</p> : null}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowAdminGate(false);
                  setAdminUsername("");
                  setAdminPassword("");
                  setAdminPasswordVisible(false);
                  setAdminError(null);
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
