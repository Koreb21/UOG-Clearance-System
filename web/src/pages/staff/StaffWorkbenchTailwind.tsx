import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionControls } from "../../components/SessionControls";
import { BackButton } from "../../components/BackButton";
import { toApiUrl, api } from "../../lib/api";
import { campusCatalog } from "../../modules/campus/catalog";
import { useAuth } from "../../modules/auth/AuthContext";
import type { AuthUser, ClearanceCheck } from "../../types";
import { roleConfigs } from "./staffRoleConfig";
import { getStatusLabel, useStaffWorkspace } from "./useStaffWorkspace";

type CampusInfo = (typeof campusCatalog)[number];
type StaffRoleKey = keyof typeof roleConfigs;

// ── Status badge helpers ─────────────────────────────────────────────────────
function statusBadgeClass(status: string) {
  switch (status) {
    case "CLEARED": return "bg-primary-fixed text-on-primary-fixed-variant";
    case "FLAGGED":
    case "FAILED": return "bg-error-container text-on-error-container";
    case "AWAITING_FINANCE": return "bg-secondary-fixed text-on-secondary-fixed-variant";
    case "PAID_PENDING_DEPARTMENT_APPROVAL": return "bg-secondary-container/30 text-on-secondary-container";
    case "IN_REVIEW": return "bg-surface-container-high text-on-surface-variant";
    default: return "bg-surface-container-high text-on-surface";
  }
}

function hasActiveIssue(status: string) {
  return status === "FLAGGED" || status === "FAILED" || status === "AWAITING_FINANCE";
}

type Workspace = ReturnType<typeof useStaffWorkspace>;

type ClearanceQueueItem = {
  checkId: string;
  checkCode: string;
  checkStatus: string;
  clearanceRequestId: string;
  requestNumber: string;
  requestStatus: string;
  submittedAt: string;
  studentId: string;
  studentName: string;
  program: string | null;
  campusId: string;
  totalFines: number;
  unpaidCount: number;
  liabilityCount: number;
};

type Props = {
  campus: CampusInfo | undefined;
  roleConfig: (typeof roleConfigs)[StaffRoleKey];
  staffRole: StaffRoleKey;
  user: AuthUser | null;
  showProfileModal?: boolean;
  setShowProfileModal?: (show: boolean) => void;
  profileForm?: { email: string };
  setProfileForm?: (form: { email: string }) => void;
  profileSubmitting?: boolean;
  profileFeedback?: { ok: boolean; msg: string } | null;
  handleUpdateProfile?: (e: React.FormEvent<HTMLFormElement>) => void;
} & Workspace;

export function StaffWorkbenchTailwind({
  campus, roleConfig, staffRole, user,
  queueItems, students, selectedStudentId, setSelectedStudentId,
  selectedRequestId, setSelectedRequestId,
  status, search, setSearch, error, setError,
  submittingLiability, submittingDecision, respondingInquiryId,
  replyDraft, setReplyDraft, decisionState, setDecisionState,
  liabilityState, setLiabilityState, relevantCheck, latestInquiry,
  verifiedPayment, currentLiabilities, unpaidOfficeTotal, requests,
  handleCreateLiability, handleSubmitDecision, handleReplyInquiry,
  activityItems, formatDateTime, scrollTo,
  showProfileModal = false, setShowProfileModal = () => {},
  profileForm = { email: "" }, setProfileForm = () => {},
  profileSubmitting = false, profileFeedback = null,
  handleUpdateProfile = (e) => { e.preventDefault(); }
}: Props) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { campusSlug } = useParams();
  const headerSubtitle = `${roleConfig.officeName} · ${roleConfig.roleBadge}`;

  const [activeTab, setActiveTab] = useState<"records" | "approvals">("approvals");
  const [clearanceQueue, setClearanceQueue] = useState<ClearanceQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);
  const [queueSearch, setQueueSearch] = useState("");

  const fetchClearanceQueue = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.listAllClearanceQueue(token);
      setClearanceQueue(result);
    } catch {
      // silently fail
    } finally {
      setLoadingQueue(false);
    }
  }, [token]);

  useEffect(() => { fetchClearanceQueue(); }, [fetchClearanceQueue]);

  async function handleQuickApprove(checkId: string, studentName: string) {
    if (!token) return;
    setApproving(checkId);
    setApproveError(null);
    setApproveSuccess(null);
    try {
      await api.quickApproveCheck(token, checkId);
      setApproveSuccess(`${studentName} has been approved.`);
      await fetchClearanceQueue();
      setTimeout(() => setApproveSuccess(null), 3000);
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Failed to approve.");
      setTimeout(() => setApproveError(null), 4000);
    } finally {
      setApproving(null);
    }
  }

  const filteredClearanceQueue = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    if (!q) return clearanceQueue;
    return clearanceQueue.filter(item =>
      item.studentName.toLowerCase().includes(q) ||
      item.studentId.toLowerCase().includes(q) ||
      (item.program ?? "").toLowerCase().includes(q)
    );
  }, [clearanceQueue, queueSearch]);

  const pendingCount = clearanceQueue.filter(i => i.checkStatus !== "CLEARED").length;
  const clearedCount = clearanceQueue.filter(i => i.checkStatus === "CLEARED").length;

  const statCards = useMemo(() => {
    const pending = queueItems.length;
    const roster = students.length;
    return [
      {
        label: "Awaiting my approval",
        value: `${pendingCount}`,
        hint: pendingCount ? "Students awaiting approval" : "All caught up",
        hintClass: pendingCount ? "text-yellow-300" : "text-secondary",
        icon: "pending_actions"
      },
      {
        label: "Campus roster",
        value: `${roster}`,
        hint: campus?.name ?? "Campus",
        hintClass: "text-primary-fixed-dim",
        icon: "groups"
      },
      {
        label: "Approved today",
        value: `${clearedCount}`,
        hint: "In my queue cleared",
        hintClass: "text-green-300",
        icon: "verified"
      }
    ];
  }, [campus?.name, pendingCount, clearedCount, queueItems.length, students.length]);

  const displayName = status
    ? `${status.student.firstName} ${status.student.lastName}`
    : selectedStudentId ? "Select a request" : "No student";
  const initials = status
    ? `${status.student.firstName.charAt(0)}${status.student.lastName.charAt(0)}`
    : "--";

  const activeFlags = currentLiabilities.filter(l => !["PAID", "CLEARED", "WAIVED"].includes(l.status));
  const hasFlaggedCheck = relevantCheck && hasActiveIssue(relevantCheck.status);
  const flagReason = hasFlaggedCheck && relevantCheck?.comment
    ? relevantCheck.comment
    : activeFlags.length > 0
      ? `${activeFlags.length} unresolved item${activeFlags.length > 1 ? "s" : ""}: ${activeFlags[0]?.itemName ?? "liability"}`
      : null;

  const allPastLiabilities = currentLiabilities;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background font-body text-on-surface">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-outline-variant/20 bg-background/70 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton />
          <div className="h-5 w-px shrink-0 bg-outline-variant/40" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-primary">{campus?.name ?? "Campus"}</h2>
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{headerSubtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SessionControls density="full" />
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex size-10 items-center justify-center rounded-full bg-primary-container text-on-primary hover:bg-primary-container/80 transition-colors"
            aria-label="Profile"
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 pb-24 md:p-8">
        {/* Hero */}
        <div
          className="relative overflow-hidden rounded-xl p-6 text-white shadow-xl md:p-8"
          style={{ background: "linear-gradient(135deg, #001e40 0%, #003366 100%)" }}
        >
          <div className="relative z-10">
            <h1 className="mb-2 font-display text-2xl font-bold md:text-4xl">{roleConfig.heroTitle}</h1>
            <p className="mb-6 max-w-2xl text-sm text-primary-fixed-dim md:text-base">{roleConfig.heroCopy}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statCards.map((card) => (
                <div key={card.label} className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-md md:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px] opacity-70">{card.icon}</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{card.label}</p>
                  </div>
                  <p className="font-display text-2xl font-bold md:text-3xl">{card.value}</p>
                  <div className={`mt-2 flex items-center text-xs ${card.hintClass}`}>
                    <span className="material-symbols-outlined mr-1 text-[14px]">insights</span>
                    <span>{card.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-secondary-container/10 blur-3xl" aria-hidden />
        </div>

        {error ? (
          <div className="rounded-lg border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
            {error}
            <button type="button" className="ml-2 font-bold underline" onClick={() => setError(null)}>Dismiss</button>
          </div>
        ) : null}

        {/* Approve / Dismiss banners */}
        {approveSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {approveSuccess}
          </div>
        )}
        {approveError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <span className="material-symbols-outlined">error</span>
            {approveError}
          </div>
        )}

        {/* ── Main Tab bar ──────────────────────────────────────────────── */}
        <div className="flex rounded-xl bg-surface-container-low p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === "approvals" ? "bg-white shadow text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">approval</span>
            Approval Queue
            {pendingCount > 0 && (
              <span className="rounded-full bg-error px-1.5 py-0.5 text-[9px] font-black text-white">{pendingCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("records")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === "records" ? "bg-white shadow text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Records
            {allPastLiabilities.length > 0 && (
              <span className="rounded-full bg-error px-1.5 py-0.5 text-[9px] font-black text-white">{allPastLiabilities.length}</span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB: APPROVAL QUEUE                                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Clearance Approval Queue</h3>
                <p className="text-xs text-on-surface-variant">
                  All students requesting clearance through your office — approve or review.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-[10px] font-bold text-on-primary-fixed-variant">
                  {pendingCount} pending
                </span>
                <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
                  {clearedCount} cleared
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                value={queueSearch}
                onChange={e => setQueueSearch(e.target.value)}
                placeholder="Search students by name, ID, or program…"
                className="w-full rounded-xl border-none bg-surface-container-lowest py-3 pl-10 pr-3 text-sm shadow-sm ring-1 ring-outline-variant/20 focus:ring-2 focus:ring-primary"
              />
            </div>

            {loadingQueue ? (
              <div className="flex items-center justify-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-3xl mr-3">progress_activity</span>
                Loading clearance queue…
              </div>
            ) : filteredClearanceQueue.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-container-low py-16 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">done_all</span>
                <p className="font-bold text-on-surface">No students in queue</p>
                <p className="text-sm text-on-surface-variant">
                  {queueSearch ? "No results match your search." : "All clearance requests have been processed."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClearanceQueue.map(item => {
                  const isCleared = item.checkStatus === "CLEARED";
                  const hasFine = item.unpaidCount > 0;
                  const isProcessing = approving === item.checkId;
                  const initials2 = item.studentName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={item.checkId}
                      className={`rounded-xl border p-4 transition-all ${
                        isCleared
                          ? "border-primary-fixed/40 bg-surface-container-low opacity-70"
                          : hasFine
                          ? "border-error/30 bg-red-50 shadow-sm"
                          : "border-outline-variant/20 bg-surface-container-lowest shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Student avatar + info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                            isCleared ? "bg-primary-fixed text-on-primary-fixed-variant" : hasFine ? "bg-error text-white" : "bg-surface-container-high text-primary"
                          }`}>
                            {isCleared
                              ? <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                              : initials2
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-on-surface truncate">{item.studentName}</p>
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(item.checkStatus)}`}>
                                {getStatusLabel(item.checkStatus)}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant">{item.studentId} · {item.program ?? "Unknown program"}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">tag</span>
                                {item.requestNumber}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                {new Date(item.submittedAt).toLocaleDateString("en-ET")}
                              </span>
                              {item.liabilityCount > 0 && (
                                <span className={`flex items-center gap-1 font-bold ${hasFine ? "text-error" : "text-on-surface-variant"}`}>
                                  <span className="material-symbols-outlined text-[12px]">payments</span>
                                  {item.totalFines.toFixed(2)} ETB · {item.unpaidCount} unpaid
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex shrink-0 items-center gap-2">
                          {!isCleared && (
                            <>
                              {/* Quick Approve button */}
                              <button
                                type="button"
                                disabled={isProcessing || hasFine}
                                onClick={() => handleQuickApprove(item.checkId, item.studentName)}
                                title={hasFine ? "Resolve all fines before approving" : "Approve this student's clearance"}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow transition-all ${
                                  hasFine
                                    ? "cursor-not-allowed bg-surface-container-high text-on-surface-variant opacity-50"
                                    : "bg-primary text-on-primary hover:brightness-110 active:scale-95"
                                } disabled:opacity-60`}
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                    <span className="hidden sm:inline">Approving…</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    <span>Approve</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}

                          {isCleared && (
                            <span className="flex items-center gap-1.5 rounded-xl bg-primary-fixed/30 px-4 py-2 text-xs font-bold text-on-primary-fixed-variant">
                              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                              Cleared
                            </span>
                          )}

                          {/* Full decision button */}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/campus/${campusSlug}/staff/record-liability?studentId=${item.studentId}&requestId=${item.clearanceRequestId}`)
                            }
                            className="flex size-9 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all"
                            title="Full decision"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB: RECORDS                                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === "records" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h5 className="text-sm font-bold text-on-surface">Student Records &amp; Fines History</h5>
                <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-on-primary-fixed-variant">{allPastLiabilities.length} total</span>
              </div>
              {!status ? (
                <p className="text-sm text-on-surface-variant">Select a student to view their records.</p>
              ) : allPastLiabilities.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl">assignment</span>
                  <p className="text-sm font-medium">No records found for this student</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPastLiabilities.map((rec) => {
                    const resolved = ["PAID", "CLEARED", "WAIVED"].includes(rec.status);
                    return (
                      <div key={rec.id} className={`rounded-xl p-4 border ${resolved ? "border-outline-variant/10 bg-surface-container-low" : "border-error/30 bg-red-50"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${resolved ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
                            <span className="material-symbols-outlined text-[22px]">{resolved ? "check_circle" : "report_problem"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-on-surface">{rec.itemName}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(rec.status)}`}>
                                {getStatusLabel(rec.status)}
                              </span>
                            </div>
                            {rec.description && <p className="mt-0.5 text-xs text-on-surface-variant">{rec.description}</p>}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">category</span>
                                {rec.category ?? rec.departmentCheckCode}
                              </span>
                              <span className={`flex items-center gap-1 font-bold ${rec.amount > 0 && !resolved ? "text-error" : ""}`}>
                                <span className="material-symbols-outlined text-[12px]">payments</span>
                                {rec.amount.toFixed(2)} {rec.currency}
                                {rec.paymentRequired && <span className="text-[9px] rounded bg-secondary-container px-1 py-0.5 ml-1">Payment req.</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {status && (
              <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-sm">
                <h5 className="mb-4 text-sm font-bold text-on-surface">All Clearance Checks</h5>
                <div className="space-y-2">
                  {status.checks.map((check) => {
                    const isFlagged = check.status === "FLAGGED" || check.status === "AWAITING_FINANCE" || check.status === "FAILED";
                    return (
                      <div key={check.id} className={`flex items-center justify-between rounded-lg px-4 py-3 ${isFlagged ? "border border-error/30 bg-red-50" : check.status === "CLEARED" ? "bg-surface-container-low" : "bg-surface-container-low opacity-70"}`}>
                        <div className="flex items-center gap-3">
                          {isFlagged ? (
                            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
                          ) : check.status === "CLEARED" ? (
                            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                          )}
                          <div>
                            <p className="text-sm font-bold text-on-surface">{check.checkCode.replace(/_/g, " ")}</p>
                            {check.comment && <p className={`text-[10px] ${isFlagged ? "text-error font-medium" : "text-on-surface-variant"}`}>{check.comment}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 ${statusBadgeClass(check.status)}`}>{getStatusLabel(check.status)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl gap-1 px-2 pb-3 pt-2">
          <button type="button" onClick={() => setActiveTab("approvals")} className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors ${activeTab === "approvals" ? "text-primary" : "text-on-surface-variant"}`}>
            <span className="relative">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: activeTab === "approvals" ? "'FILL' 1" : "'FILL' 0" }}>approval</span>
              {pendingCount > 0 && <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-error text-[8px] font-black text-white">{pendingCount}</span>}
            </span>
            <span className="text-[10px] font-medium">Approvals</span>
          </button>
          <button type="button" onClick={() => { if (selectedStudentId && selectedRequestId) { const found = queueItems.find(q => q.studentId === selectedStudentId); setFineModal({ studentId: selectedStudentId, studentName: found?.studentName ?? displayName, requestId: selectedRequestId, checkId: relevantCheck?.id ?? "" }); } else { setActiveTab("approvals"); } }} className="flex flex-1 flex-col items-center gap-1 py-1 text-error">
            <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            <span className="text-[10px] font-medium">Fine</span>
          </button>
          <button type="button" onClick={() => navigate(`/campus/${campusSlug}/messages`)} className="flex flex-1 flex-col items-center gap-1 py-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[24px]">chat</span>
            <span className="text-[10px] font-medium">Messages</span>
          </button>
          <button type="button" className="flex flex-1 flex-col items-center gap-1 py-1 text-on-surface-variant" onClick={() => setShowProfileModal(true)}>
            <span className="material-symbols-outlined text-[24px]">person</span>
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-xl sm:p-8 max-w-md w-full">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <span className="material-symbols-outlined">edit</span>
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-on-surface">Update Profile</h3>
                <p className="text-xs text-on-surface-variant">Update your email address</p>
              </div>
            </div>
            {profileFeedback && (
              <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${profileFeedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                <span className="material-symbols-outlined text-base">{profileFeedback.ok ? "check_circle" : "error"}</span>
                {profileFeedback.msg}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full rounded-lg border-none bg-surface-container-high p-3 text-sm focus:ring-2 focus:ring-primary"
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProfileModal(false)} disabled={profileSubmitting} className="flex-1 rounded-lg border-2 border-outline-variant px-4 py-3 font-semibold text-on-surface transition-all hover:border-primary hover:text-primary disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={profileSubmitting} className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-on-primary shadow-lg disabled:opacity-50">
                  {profileSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
