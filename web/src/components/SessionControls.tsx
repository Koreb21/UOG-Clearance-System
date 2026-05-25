import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../modules/auth/AuthContext";

type SessionControlsProps = {
  density?: "compact" | "full";
  className?: string;
};

export function SessionControls({ density = "full", className = "" }: SessionControlsProps) {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  if (loading || !user) {
    return null;
  }

  function handleSignOutClick() {
    setShowConfirm(true);
  }

  function handleConfirmLogout() {
    setShowConfirm(false);
    logout();
    window.location.href = "/login";
  }

  function handleCancelLogout() {
    setShowConfirm(false);
  }

  const roleLabel = user.role.replace(/_/g, " ");

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-end gap-2 sm:gap-3 ${className}`.trim()}
        data-testid="session-controls"
      >
        {density === "full" ? (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-bold leading-tight text-slate-800">{user.username}</p>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {roleLabel}
            </p>
          </div>
        ) : (
          <span className="max-w-[140px] truncate text-xs font-bold text-slate-700 sm:max-w-[200px]">
            {user.username}
          </span>
        )}
        <button
          type="button"
          onClick={handleSignOutClick}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-teal-600/40 hover:bg-teal-50/80 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50"
        >
          <span className="material-symbols-outlined text-[18px] leading-none text-slate-600">logout</span>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelLogout}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <span className="material-symbols-outlined text-red-600">logout</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Sign out?</h3>
                <p className="text-xs text-slate-500">You will need to sign in again to continue.</p>
              </div>
            </div>
            <p className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                No, stay signed in
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
              >
                Yes, logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
