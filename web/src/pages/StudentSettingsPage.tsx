import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { LanguageToggle } from "../components/LanguageToggle";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";

export function StudentSettingsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [profileForm, setProfileForm] = useState({ email: user?.email ?? "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSubmitting, setPwSubmitting] = useState(false);

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (!profileForm.email.trim()) { showToast(t("emailRequired"), "error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) { showToast(t("enterValidEmail"), "error"); return; }
    setProfileSubmitting(true);
    try {
      await api.updateMyProfile(token, { email: profileForm.email.trim() });
      showToast(t("emailUpdated"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("emailUpdateFailed"), "error");
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (pwForm.next.length < 8) { showToast(t("passwordMin8Chars"), "error"); return; }
    if (pwForm.next !== pwForm.confirm) { showToast(t("passwordsDoNotMatch"), "error"); return; }
    setPwSubmitting(true);
    try {
      await api.changePassword(token, pwForm.current, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      showToast(t("passwordChanged"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("passwordChangeFailed"), "error");
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">{t("profileSettingsLabel")}</span>
        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-8 space-y-8">
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <span className="material-symbols-outlined">edit</span>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-on-surface">{t("updateProfileTitle")}</h3>
              <p className="text-xs text-on-surface-variant">{t("updateProfileDesc")}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">{t("email")}</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm((c) => ({ ...c, email: e.target.value }))}
                className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary"
                placeholder="your.email@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
            >
              {profileSubmitting ? t("saving") : t("saveChanges")}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <span className="material-symbols-outlined">lock_reset</span>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-on-surface">{t("changePassword")}</h3>
              <p className="text-xs text-on-surface-variant">{t("changePasswordDesc")}</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">{t("currentPassword")}</label>
              <input type="password" required value={pwForm.current} onChange={(e) => setPwForm((c) => ({ ...c, current: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder={t("currentPassword")} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                {t("newPassword")} <span className="text-error">{t("minChars")}</span>
              </label>
              <input type="password" required minLength={8} value={pwForm.next} onChange={(e) => setPwForm((c) => ({ ...c, next: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder={t("atLeast8Chars")} />
              {pwForm.next.length > 0 && pwForm.next.length < 8 && (
                <p className="mt-1 text-xs text-error">{t("passwordMin8")}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">{t("confirmNewPassword")}</label>
              <input type="password" required value={pwForm.confirm} onChange={(e) => setPwForm((c) => ({ ...c, confirm: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder={t("repeatNewPassword")} />
              {pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm && (
                <p className="mt-1 text-xs text-error">{t("passwordsNoMatch")}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pwSubmitting || pwForm.next.length < 8 || pwForm.next !== pwForm.confirm}
              className="w-full rounded-lg bg-primary py-3 font-bold text-on-primary shadow-md transition-all disabled:opacity-50 hover:bg-primary-container hover:text-on-primary-container"
            >
              {pwSubmitting ? t("updating") : t("updatePassword")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
