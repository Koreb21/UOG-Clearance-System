import { useState } from "react";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";

export function StudentSettingsPage() {
  const { token, user } = useAuth();

  const [profileForm, setProfileForm] = useState({ email: user?.email ?? "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (!profileForm.email.trim()) { setProfileFeedback({ ok: false, msg: "Email is required." }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) { setProfileFeedback({ ok: false, msg: "Please enter a valid email address." }); return; }
    setProfileSubmitting(true);
    setProfileFeedback(null);
    try {
      await api.updateMyProfile(token, { email: profileForm.email.trim() });
      setProfileFeedback({ ok: true, msg: "Email updated successfully." });
    } catch (e) {
      setProfileFeedback({ ok: false, msg: e instanceof Error ? e.message : "Failed to update email." });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    if (pwForm.next.length < 8) { setPwFeedback({ ok: false, msg: "New password must be at least 8 characters." }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwFeedback({ ok: false, msg: "New passwords do not match." }); return; }
    setPwSubmitting(true);
    setPwFeedback(null);
    try {
      await api.changePassword(token, pwForm.current, pwForm.next);
      setPwForm({ current: "", next: "", confirm: "" });
      setPwFeedback({ ok: true, msg: "Password changed successfully." });
    } catch (e) {
      setPwFeedback({ ok: false, msg: e instanceof Error ? e.message : "Failed to change password." });
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">Profile &amp; Settings</span>
        <div className="ml-auto">
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
              <h3 className="text-lg font-black tracking-tight text-on-surface">Update Profile</h3>
              <p className="text-xs text-on-surface-variant">Update your email address and profile information.</p>
            </div>
          </div>

          {profileFeedback && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${profileFeedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              <span className="material-symbols-outlined text-base">{profileFeedback.ok ? "check_circle" : "error"}</span>
              {profileFeedback.msg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email Address</label>
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
              {profileSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <span className="material-symbols-outlined">lock_reset</span>
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-on-surface">Change Password</h3>
              <p className="text-xs text-on-surface-variant">Update your login password. Minimum 8 characters required.</p>
            </div>
          </div>

          {pwFeedback && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${pwFeedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              <span className="material-symbols-outlined text-base">{pwFeedback.ok ? "check_circle" : "error"}</span>
              {pwFeedback.msg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Current Password</label>
              <input type="password" required value={pwForm.current} onChange={(e) => setPwForm((c) => ({ ...c, current: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Your current password" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">New Password <span className="text-error">(min 8 chars)</span></label>
              <input type="password" required minLength={8} value={pwForm.next} onChange={(e) => setPwForm((c) => ({ ...c, next: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="At least 8 characters" />
              {pwForm.next.length > 0 && pwForm.next.length < 8 && (
                <p className="mt-1 text-xs text-error">Password must be at least 8 characters.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Confirm New Password</label>
              <input type="password" required value={pwForm.confirm} onChange={(e) => setPwForm((c) => ({ ...c, confirm: e.target.value }))} className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Repeat new password" />
              {pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm && (
                <p className="mt-1 text-xs text-error">Passwords do not match.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pwSubmitting || pwForm.next.length < 8 || pwForm.next !== pwForm.confirm}
              className="w-full rounded-lg bg-primary py-3 font-bold text-on-primary shadow-md transition-all disabled:opacity-50 hover:bg-primary-container hover:text-on-primary-container"
            >
              {pwSubmitting ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
