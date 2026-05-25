import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceStatus, StaffQueueItem, StudentSummary } from "../types";

export function FinanceLiabilityPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [queueItems, setQueueItems] = useState<StaffQueueItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [submittingLiability, setSubmittingLiability] = useState(false);
  const [liabilityForm, setLiabilityForm] = useState({ itemName: "", category: "Finance Fee", description: "", amount: "", paymentRequired: true });

  useEffect(() => {
    if (!token) return;
    Promise.all([api.listStaffStudents(token), api.getFlaggedStudents(token)])
      .then(([studentItems, queue]) => {
        setStudents(studentItems);
        setQueueItems(queue);
        setSelectedRequestId((cur) => {
          if (cur && queue.some((item) => item.clearanceRequestId === cur)) return cur;
          return queue[0]?.clearanceRequestId ?? "";
        });
      })
      .catch(() => undefined);
  }, [token]);

  const studentNameById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.studentId, `${s.firstName} ${s.lastName}`.trim()])),
    [students]
  );

  const selectedQueueItem = useMemo(
    () => queueItems.find((item) => item.clearanceRequestId === selectedRequestId) ?? null,
    [queueItems, selectedRequestId]
  );

  useEffect(() => {
    if (!token || !selectedRequestId || !selectedQueueItem) { setStatus(null); return; }
    api.getVisibleStudentStatus(token, selectedQueueItem.studentId, selectedRequestId).then(setStatus).catch(() => undefined);
  }, [selectedRequestId, token, selectedQueueItem]);

  const ledgerRows = useMemo(() => {
    const rows: { id: string; studentId: string; name: string; category: string; amount: string; payStatus: string }[] = [];
    for (const item of queueItems.slice(0, 12)) {
      rows.push({ id: `${item.checkId}-q`, studentId: item.studentId, name: studentNameById[item.studentId] ?? item.studentName, category: `Clearance · ${item.checkCode}`, amount: "—", payStatus: item.checkStatus });
    }
    if (status) {
      for (const liab of status.liabilities) {
        rows.push({ id: liab.id, studentId: status.student.studentId, name: `${status.student.firstName} ${status.student.lastName}`, category: liab.category ?? liab.itemName, amount: `${liab.amount.toFixed(2)} ${liab.currency}`, payStatus: liab.status });
      }
    }
    return rows.slice(0, 16);
  }, [queueItems, status, studentNameById]);

  async function handleCreateLiability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !status || !liabilityForm.itemName.trim()) return;
    setSubmittingLiability(true);
    try {
      await api.createLiability(token, {
        studentId: status.student.studentId,
        clearanceRequestId: status.request.id,
        departmentCheckCode: selectedQueueItem?.checkCode ?? "LIBRARY",
        itemName: liabilityForm.itemName.trim(),
        category: liabilityForm.category.trim() || "Finance Fee",
        description: liabilityForm.description.trim() || undefined,
        amount: parseFloat(liabilityForm.amount) || 0,
        paymentRequired: liabilityForm.paymentRequired
      });
      const nextStatus = await api.getVisibleStudentStatus(token, status.student.studentId, status.request.id);
      setStatus(nextStatus as ClearanceStatus);
      setLiabilityForm({ itemName: "", category: "Finance Fee", description: "", amount: "", paymentRequired: true });
      showToast("Liability added to student's record.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to add liability", "error");
    } finally {
      setSubmittingLiability(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-outline-variant/20 bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
        </div>
        <h1 className="text-base font-bold">{campus?.name ?? "Campus"} — Liability Ledger</h1>
        <div className="ml-auto">
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-on-primary-fixed-variant">Campus liabilities ledger</h2>
          </div>
          <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-low">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Student ID</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Name</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Category</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Amount</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {ledgerRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No ledger rows yet.</td></tr>
                  ) : ledgerRows.map((row) => (
                    <tr key={row.id} className="hover:bg-primary-fixed/10 cursor-pointer" onClick={() => {
                      const item = queueItems.find((q) => q.studentId === row.studentId);
                      if (item) setSelectedRequestId(item.clearanceRequestId);
                    }}>
                      <td className="px-4 py-3 font-mono text-xs">{row.studentId}</td>
                      <td className="px-4 py-3 font-semibold">{row.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{row.category}</td>
                      <td className="px-4 py-3 font-bold">{row.amount}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-on-primary-fixed-variant">{row.payStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold">Add liability to student</h2>
          <p className="mb-5 text-sm text-on-surface-variant">
            Select a student from the queue above, then add a financial obligation to their clearance request.
          </p>
          <div className="mb-4">
            <select
              aria-label="Select student request"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="rounded-lg border-none bg-surface-container-high px-4 py-3 text-sm focus:ring-2 focus:ring-primary w-full max-w-sm"
            >
              <option value="">— Select a student request —</option>
              {queueItems.map((item) => (
                <option key={item.checkId} value={item.clearanceRequestId}>
                  {item.requestNumber} | {studentNameById[item.studentId] ?? item.studentId}
                </option>
              ))}
            </select>
          </div>
          {status ? (
            <form onSubmit={handleCreateLiability} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Item name *</span>
                <input required value={liabilityForm.itemName} onChange={(e) => setLiabilityForm((c) => ({ ...c, itemName: e.target.value }))} className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" placeholder="e.g. Registration fee, Penalty" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</span>
                <input value={liabilityForm.category} onChange={(e) => setLiabilityForm((c) => ({ ...c, category: e.target.value }))} className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" placeholder="Finance Fee" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Description</span>
                <input value={liabilityForm.description} onChange={(e) => setLiabilityForm((c) => ({ ...c, description: e.target.value }))} className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" placeholder="Optional details" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Amount (ETB) *</span>
                <input required type="number" min="0" step="0.01" value={liabilityForm.amount} onChange={(e) => setLiabilityForm((c) => ({ ...c, amount: e.target.value }))} className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" placeholder="0.00" />
              </label>
              <label className="col-span-full flex items-center gap-2 text-sm text-on-surface-variant">
                <input type="checkbox" checked={liabilityForm.paymentRequired} onChange={(e) => setLiabilityForm((c) => ({ ...c, paymentRequired: e.target.checked }))} className="rounded text-primary" />
                Payment required (student must pay to proceed)
              </label>
              <div className="col-span-full">
                <button type="submit" disabled={submittingLiability || !liabilityForm.itemName.trim() || !liabilityForm.amount} className="rounded-lg bg-primary px-6 py-2.5 font-bold text-on-primary shadow-md disabled:opacity-50">
                  {submittingLiability ? "Adding…" : "Add liability"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-on-surface-variant">Select a student from the queue above to add a liability.</p>
          )}
        </div>
      </main>
    </div>
  );
}
