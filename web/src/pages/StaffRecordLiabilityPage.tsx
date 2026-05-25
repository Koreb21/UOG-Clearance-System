import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";

const API = "/api/v1";

const ROLE_TO_CHECK: Record<string, string> = {
  LIBRARIAN: "LIBRARY",
  PROCTOR: "PROCTOR",
  CAFE_STAFF: "CAFE",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  STUDENT_DEAN: "STUDENT_DEAN",
};

const ROLE_LABELS: Record<string, { title: string; itemLabel: string; categoryLabel: string; descLabel: string; categories: string[] }> = {
  LIBRARIAN: { title: "Library Liability", itemLabel: "Book / Resource Title", categoryLabel: "Category", descLabel: "Observation Notes", categories: ["Overdue Return", "Lost Book", "Damaged Material", "Unpaid Fine", "Other"] },
  PROCTOR: { title: "Proctor / Dorm Liability", itemLabel: "Item / Incident", categoryLabel: "Category", descLabel: "Observation Notes", categories: ["Property Damage", "Unpaid Dorm Fee", "Misconduct", "Other"] },
  CAFE_STAFF: { title: "Cafeteria Liability", itemLabel: "Item / Service", categoryLabel: "Category", descLabel: "Observation Notes", categories: ["Unpaid Meal", "Property Damage", "Other"] },
  DEPARTMENT_HEAD: { title: "Department Liability", itemLabel: "Item / Obligation", categoryLabel: "Category", descLabel: "Observation Notes", categories: ["Lab Equipment", "Course Material", "Outstanding Exam", "Other"] },
  STUDENT_DEAN: { title: "Dean of Students Liability", itemLabel: "Item / Issue", categoryLabel: "Category", descLabel: "Observation Notes", categories: ["Disciplinary Fine", "Unpaid Fee", "Community Service", "Other"] },
};

interface Student { id: string; studentId: string; firstName: string; lastName: string; program: string | null; }
interface ClearanceRequest { id: string; requestNumber: string; status: string; submittedAt: string; }

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ET", { year: "numeric", month: "short", day: "numeric" });
}

export function StaffRecordLiabilityPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug);

  const staffRole = user?.role ?? "";
  const checkCode = ROLE_TO_CHECK[staffRole] ?? "";
  const config = ROLE_LABELS[staffRole] ?? ROLE_LABELS["LIBRARIAN"];

  // Pre-fill from URL params
  const [selectedStudentId, setSelectedStudentId] = useState(searchParams.get("studentId") ?? "");
  const [selectedRequestId, setSelectedRequestId] = useState(searchParams.get("requestId") ?? "");

  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Liability form state
  const [form, setForm] = useState({ itemName: "", category: "", description: "", amount: "", paymentRequired: false });
  // Decision state
  const [decision, setDecision] = useState({ status: "CLEARED", comment: "" });

  // Load students
  useEffect(() => {
    if (!token) return;
    setLoadingStudents(true);
    fetch(`${API}/staff/students`, { headers: authHeaders(token) })
      .then((r) => r.json()).then(setStudents).catch(() => undefined).finally(() => setLoadingStudents(false));
  }, [token]);

  // Load requests when student changes
  const loadRequests = useCallback(async () => {
    if (!token || !selectedStudentId) { setRequests([]); return; }
    setLoadingRequests(true);
    try {
      const r = await fetch(`${API}/staff/clearance-requests?studentId=${encodeURIComponent(selectedStudentId)}`, { headers: authHeaders(token) });
      const data = await r.json();
      setRequests(data);
      if (!selectedRequestId && data[0]?.id) setSelectedRequestId(data[0].id);
    } catch {/* */}
    setLoadingRequests(false);
  }, [token, selectedStudentId, selectedRequestId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleSubmitLiability(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedStudentId || !selectedRequestId || !form.itemName.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch(`${API}/staff/liabilities`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          studentId: selectedStudentId,
          clearanceRequestId: selectedRequestId,
          departmentCheckCode: checkCode,
          itemName: form.itemName,
          category: form.category || undefined,
          description: form.description || undefined,
          amount: parseFloat(form.amount) || 0,
          paymentRequired: form.paymentRequired,
        }),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message ?? "Failed to record liability."); }
      setFeedback({ ok: true, msg: "Liability recorded successfully." });
      setForm({ itemName: "", category: "", description: "", amount: "", paymentRequired: false });
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : "Failed to record liability." });
    }
    setSubmitting(false);
  }

  async function handleSubmitDecision(statusOverride?: string) {
    if (!token || !selectedRequestId) return;
    // Find the check ID for this student/request
    setSubmittingDecision(true);
    setDecisionFeedback(null);
    try {
      const clearanceRes = await fetch(`${API}/staff/clearance?studentId=${encodeURIComponent(selectedStudentId)}&clearanceRequestId=${encodeURIComponent(selectedRequestId)}`, { headers: authHeaders(token) });
      const clearanceData = await clearanceRes.json();
      const check = clearanceData.checks?.find((c: { checkCode: string; id: string }) => c.checkCode === checkCode);
      if (!check) throw new Error("No check found for your department.");
      const finalStatus = statusOverride ?? decision.status;
      const r = await fetch(`${API}/staff/checks/${check.id}/review`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ status: finalStatus, comment: decision.comment }),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message ?? "Failed."); }
      setDecisionFeedback({ ok: true, msg: finalStatus === "CLEARED" ? "Student approved for clearance." : "Student flagged for finance." });
    } catch (err) {
      setDecisionFeedback({ ok: false, msg: err instanceof Error ? err.message : "Failed to submit decision." });
    }
    setSubmittingDecision(false);
  }

  const selectedStudent = students.find((s) => s.studentId === selectedStudentId);

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif]">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#c3c6d1]/30 bg-white/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-5 w-px bg-[#c3c6d1]/40" />
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#003366] text-white">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#001e40]">Record Liability</h1>
            <p className="text-[10px] text-[#43474f]">{campus?.name ?? "Campus"} · {config.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/campus/${campusSlug}/messages`)}
          className="flex items-center gap-1.5 rounded-xl border border-[#c3c6d1] bg-white px-3 py-2 text-xs font-bold text-[#43474f] hover:bg-[#f2f4f7] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span className="hidden sm:inline">Messages</span>
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Student & Request selection */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#43474f]">Select Student & Request</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => { setSelectedStudentId(e.target.value); setSelectedRequestId(""); setRequests([]); }}
                className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
              >
                <option value="">Select student…</option>
                {loadingStudents ? <option disabled>Loading…</option> : students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>{s.studentId} — {s.firstName} {s.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Clearance Request</label>
              <select
                value={selectedRequestId}
                onChange={(e) => setSelectedRequestId(e.target.value)}
                disabled={!selectedStudentId || loadingRequests}
                className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none disabled:opacity-50"
              >
                <option value="">{loadingRequests ? "Loading…" : "Select request…"}</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>{r.requestNumber} — {formatDate(r.submittedAt)} ({r.status})</option>
                ))}
              </select>
            </div>
          </div>
          {selectedStudent && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f2f4f7] px-4 py-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[#003366] font-bold text-white text-sm">
                {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-bold text-[#001e40]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                <p className="text-[10px] text-[#43474f]">{selectedStudent.studentId} · {selectedStudent.program ?? "—"}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Liability Form */}
          <form onSubmit={handleSubmitLiability} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-[#001e40]">{config.title}</h2>

            {feedback && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${feedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                <span className="material-symbols-outlined text-base">{feedback.ok ? "check_circle" : "error"}</span>
                {feedback.msg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">{config.itemLabel}</label>
                <input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} required disabled={!selectedRequestId} placeholder={config.itemLabel} className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none disabled:opacity-50" />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">{config.categoryLabel}</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} disabled={!selectedRequestId} className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none disabled:opacity-50">
                  <option value="">Select category…</option>
                  {config.categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">{config.descLabel}</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={!selectedRequestId} rows={3} placeholder="Add notes about this liability…" className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none resize-none disabled:opacity-50" />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Amount (ETB)</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} disabled={!selectedRequestId} placeholder="0.00" className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none disabled:opacity-50" />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#c3c6d1]/30 px-4 py-3">
                <input type="checkbox" checked={form.paymentRequired} onChange={(e) => setForm((f) => ({ ...f, paymentRequired: e.target.checked }))} disabled={!selectedRequestId} className="rounded text-[#003366] focus:ring-[#003366]" />
                <div>
                  <p className="text-sm font-semibold text-[#001e40]">Payment required</p>
                  <p className="text-[10px] text-[#43474f]">Routes this liability to the Finance office for payment processing</p>
                </div>
              </label>

              <button type="submit" disabled={!selectedRequestId || submitting || !form.itemName.trim()} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#002244] transition-colors disabled:opacity-50">
                {submitting ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                {submitting ? "Saving…" : "Record Liability"}
              </button>
            </div>
          </form>

          {/* Final Decision */}
          <div className="rounded-2xl bg-white p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-base font-bold text-[#001e40]">Final Decision</h2>
            <p className="text-xs text-[#43474f]">After reviewing the student's records, submit your approval or flag them for finance if payment is needed.</p>

            {decisionFeedback && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${decisionFeedback.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                <span className="material-symbols-outlined text-base">{decisionFeedback.ok ? "check_circle" : "error"}</span>
                {decisionFeedback.msg}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Status</label>
              <select value={decision.status} onChange={(e) => setDecision((d) => ({ ...d, status: e.target.value }))} disabled={!selectedRequestId} className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none disabled:opacity-50">
                <option value="CLEARED">Cleared</option>
                <option value="FLAGGED">Flagged (Pending)</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="AWAITING_FINANCE">Awaiting Finance</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Notes</label>
              <textarea value={decision.comment} onChange={(e) => setDecision((d) => ({ ...d, comment: e.target.value }))} disabled={!selectedRequestId} rows={4} placeholder="Optional notes for this decision…" className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none resize-none disabled:opacity-50" />
            </div>

            <div className="mt-auto space-y-3">
              <button type="button" onClick={() => handleSubmitDecision("CLEARED")} disabled={!selectedRequestId || submittingDecision} className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50" style={{ background: "linear-gradient(135deg, #001e40 0%, #003366 100%)" }}>
                <span className="material-symbols-outlined text-[18px]">verified</span>
                Approve Clearance
              </button>
              <button type="button" onClick={() => handleSubmitDecision("FLAGGED")} disabled={!selectedRequestId || submittingDecision} className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">flag</span>
                Flag for Finance
              </button>
              <button type="button" onClick={() => void handleSubmitDecision()} disabled={!selectedRequestId || submittingDecision} className="w-full rounded-xl border-2 border-[#c3c6d1] py-2.5 text-xs font-bold text-[#43474f] hover:bg-[#f2f4f7] transition-colors disabled:opacity-50">
                {submittingDecision ? "Submitting…" : `Submit: ${decision.status.replace(/_/g, " ")}`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
