import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceStatus, PaymentRecord, StaffQueueItem, StudentSummary } from "../types";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(status: string) {
  if (status === "AWAITING_FINANCE") return "bg-amber-100 text-amber-800";
  if (status === "PAID_PENDING_DEPARTMENT_APPROVAL") return "bg-green-100 text-green-800";
  if (status === "FLAGGED") return "bg-red-100 text-red-800";
  return "bg-surface-container text-on-surface-variant";
}

export function FinanceQueuePage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { campusSlug } = useParams();
  const { user } = useAuth();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [queueItems, setQueueItems] = useState<StaffQueueItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [manualForm, setManualForm] = useState({ providerReference: "", note: "" });
  const [revokeCheckId, setRevokeCheckId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  async function reload() {
    if (!token) return;
    const [studentItems, queue] = await Promise.all([
      api.listStaffStudents(token),
      api.getFlaggedStudents(token)
    ]);
    setStudents(studentItems);
    setQueueItems(queue);
    return queue;
  }

  useEffect(() => {
    if (!token) return;
    reload()
      .then((queue) => {
        if (queue) {
          setSelectedRequestId((cur) => {
            if (cur && queue.some((item) => item.clearanceRequestId === cur)) return cur;
            return queue[0]?.clearanceRequestId ?? "";
          });
        }
      })
      .catch(() => undefined);
  }, [token]);

  const studentNameById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.studentId, `${s.firstName} ${s.lastName}`.trim()])),
    [students]
  );

  const filteredQueue = useMemo(
    () => queueItems.filter((item) =>
      `${studentNameById[item.studentId] ?? item.studentName} ${item.studentId} ${item.requestNumber}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [queueItems, search, studentNameById]
  );

  useEffect(() => {
    if (!filteredQueue.some((item) => item.clearanceRequestId === selectedRequestId)) {
      setSelectedRequestId(filteredQueue[0]?.clearanceRequestId ?? "");
    }
  }, [filteredQueue, selectedRequestId]);

  const selectedQueueItem = useMemo(
    () => queueItems.find((item) => item.clearanceRequestId === selectedRequestId) ?? null,
    [queueItems, selectedRequestId]
  );

  useEffect(() => {
    if (!token || !selectedRequestId || !selectedQueueItem) { setStatus(null); setPayments([]); return; }
    api.getVisibleStudentStatus(token, selectedQueueItem.studentId, selectedRequestId).then(setStatus).catch(() => undefined);
    api.listFinancePayments(token, selectedRequestId).then(setPayments).catch(() => undefined);
  }, [queueItems, selectedRequestId, token, selectedQueueItem]);

  const pendingLiabilities = useMemo(
    () => status?.liabilities.filter((item) => item.paymentRequired && !["PAID", "CLEARED", "WAIVED"].includes(item.status)) ?? [],
    [status]
  );

  const paidLiabilities = useMemo(
    () => status?.liabilities.filter((item) => item.paymentRequired && item.status === "PAID") ?? [],
    [status]
  );

  const isPaidPendingApproval = selectedQueueItem?.checkStatus === "PAID_PENDING_DEPARTMENT_APPROVAL";

  const selectedCheckId = useMemo(() => {
    if (!status || !selectedQueueItem) return null;
    const check = status.checks.find((c) => c.checkCode === selectedQueueItem.checkCode);
    return check?.id ?? null;
  }, [status, selectedQueueItem]);

  async function handleManualPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !status || pendingLiabilities.length === 0) return;
    try {
      await api.recordManualPayment(token, {
        clearanceRequestId: status.request.id,
        studentId: status.student.studentId,
        liabilityIds: pendingLiabilities.map((item) => item.id),
        providerReference: manualForm.providerReference,
        note: manualForm.note || undefined
      });
      const [nextStatus, nextPayments, nextQueue] = await Promise.all([
        api.getVisibleStudentStatus(token, status.student.studentId, status.request.id),
        api.listFinancePayments(token, status.request.id),
        api.getFlaggedStudents(token)
      ]);
      setStatus(nextStatus as ClearanceStatus);
      setPayments(nextPayments as PaymentRecord[]);
      setQueueItems(nextQueue);
      setManualForm({ providerReference: "", note: "" });
      showToast("Payment recorded. Receipt sent to department staff.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to record payment", "error");
    }
  }

  async function handleVerifyPayment(txRef: string) {
    if (!token) return;
    try {
      await api.verifyChapaPayment(token, txRef, { status: "SUCCESS", message: "Verified by finance portal" });
      if (selectedRequestId && selectedQueueItem) {
        const [nextStatus, nextPayments, nextQueue] = await Promise.all([
          api.getVisibleStudentStatus(token, selectedQueueItem.studentId, selectedRequestId),
          api.listFinancePayments(token, selectedRequestId),
          api.getFlaggedStudents(token)
        ]);
        setStatus(nextStatus as ClearanceStatus);
        setPayments(nextPayments as PaymentRecord[]);
        setQueueItems(nextQueue);
      }
      showToast("Payment verified. Student moved to department for final approval.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to verify payment", "error");
    }
  }

  async function handleRevokePayment() {
    if (!token || !revokeCheckId) return;
    setRevoking(true);
    try {
      await api.revokeFinanceApproval(token, revokeCheckId, revokeReason);
      const [nextStatus, nextPayments, nextQueue] = await Promise.all([
        selectedQueueItem ? api.getVisibleStudentStatus(token, selectedQueueItem.studentId, selectedRequestId) : Promise.resolve(null),
        selectedRequestId ? api.listFinancePayments(token, selectedRequestId) : Promise.resolve([]),
        api.getFlaggedStudents(token)
      ]);
      if (nextStatus) setStatus(nextStatus as ClearanceStatus);
      setPayments(nextPayments as PaymentRecord[]);
      setQueueItems(nextQueue);
      setRevokeCheckId(null);
      setRevokeReason("");
      showToast("Clearance progress stopped. Student returned to payment queue.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to revoke payment approval", "error");
    } finally {
      setRevoking(false);
    }
  }

  const receiptComment = useMemo(() => {
    if (!status || !selectedQueueItem) return null;
    const check = status.checks.find((c) => c.checkCode === selectedQueueItem.checkCode);
    if (check?.comment && check.comment.includes("Finance receipt")) return check.comment;
    return null;
  }, [status, selectedQueueItem]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-outline-variant/20 bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
        </div>
        <h1 className="text-base font-bold">{campus?.name ?? "Campus"} — Payment Queue</h1>
        <div className="ml-auto">
          <SessionControls density="compact" />
        </div>
      </header>

      {revokeCheckId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <h3 className="mb-1 text-lg font-bold text-error">Stop Clearance Progress</h3>
            <p className="mb-4 text-sm text-on-surface-variant">
              This will revert the student's payment status back to <strong>Awaiting Finance</strong> and liabilities back to unpaid. The department staff will no longer be able to clear this student until finance re-approves.
            </p>
            <label className="block mb-4">
              <span className="text-xs font-bold uppercase text-on-surface-variant">Reason (optional)</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2 text-sm"
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g., Payment not received, incorrect amount..."
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRevokeCheckId(null); setRevokeReason(""); }}
                className="flex-1 rounded-lg border border-outline-variant/40 py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevokePayment()}
                disabled={revoking}
                className="flex-1 rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-on-error disabled:opacity-50"
              >
                {revoking ? "Stopping…" : "Stop Progress"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Finance payment queue</h2>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-lg border-none bg-surface-container-high px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
              placeholder="Search by name, student ID, or request number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Select finance request"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="rounded-lg border-none bg-surface-container-high px-4 py-3 text-sm focus:ring-2 focus:ring-primary"
            >
              {filteredQueue.length === 0 && <option value="">— No items in queue —</option>}
              {filteredQueue.map((item) => (
                <option key={item.checkId} value={item.clearanceRequestId}>
                  {item.requestNumber} | {item.studentId} | {item.checkStatus}
                </option>
              ))}
            </select>
          </div>

          {status ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold">{status.student.firstName} {status.student.lastName}</h3>
                  <p className="text-sm text-on-surface-variant">{status.student.studentId} · {status.request.requestNumber}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadge(selectedQueueItem?.checkStatus ?? "")}`}>
                  {selectedQueueItem?.checkStatus ?? ""}
                </span>
              </div>

              {receiptComment && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-green-700 text-[18px]">receipt</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-green-700">Receipt issued to department staff</span>
                  </div>
                  <p className="text-sm text-green-800">{receiptComment}</p>
                </div>
              )}

              {isPaidPendingApproval && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-green-700 text-[20px]">check_circle</span>
                    <h4 className="font-bold text-green-800">Payment verified — Clearance in progress</h4>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    The student has paid and clearance has been forwarded to the department staff for final approval. You can stop this progress if the payment was made incorrectly.
                  </p>
                  {paidLiabilities.length > 0 && (
                    <ul className="mb-4 space-y-1">
                      {paidLiabilities.map((l) => (
                        <li key={l.id} className="flex items-center justify-between rounded-lg bg-green-100/60 px-3 py-1.5 text-sm">
                          <span className="font-semibold">{l.itemName}</span>
                          <span className="font-bold text-green-800">{l.amount.toFixed(2)} {l.currency} · PAID</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedCheckId && (
                    <button
                      type="button"
                      onClick={() => setRevokeCheckId(selectedCheckId)}
                      className="flex items-center gap-2 rounded-lg bg-error/10 border border-error/20 px-4 py-2 text-sm font-bold text-error hover:bg-error/20"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Stop Clearance Progress
                    </button>
                  )}
                </div>
              )}

              {!isPaidPendingApproval && (
                <>
                  <div>
                    <h4 className="mb-2 text-sm font-bold">Pending liabilities</h4>
                    {pendingLiabilities.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">No pending liabilities for this request.</p>
                    ) : (
                      <ul className="space-y-2">
                        {pendingLiabilities.map((item) => (
                          <li key={item.id} className="flex items-center justify-between rounded-lg bg-error-container/20 border border-error/10 px-3 py-2 text-sm">
                            <span className="font-semibold">{item.itemName}</span>
                            <span className="font-bold text-error">{item.amount.toFixed(2)} {item.currency} · {item.status}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-3 text-base font-bold">Record manual payment (bank slip / cash)</h4>
                    <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleManualPayment}>
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-on-surface-variant">Bank slip / Receipt number *</span>
                        <input
                          className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm"
                          value={manualForm.providerReference}
                          onChange={(e) => setManualForm((c) => ({ ...c, providerReference: e.target.value }))}
                          required
                          placeholder="e.g., RECEIPT-2024-001"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase text-on-surface-variant">Payment date / Note</span>
                        <input
                          className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm"
                          value={manualForm.note}
                          onChange={(e) => setManualForm((c) => ({ ...c, note: e.target.value }))}
                          placeholder="Date or additional notes"
                        />
                      </label>
                      <button
                        type="submit"
                        className="col-span-full rounded-lg bg-secondary py-2.5 font-bold text-on-secondary disabled:opacity-50"
                        disabled={pendingLiabilities.length === 0 || !manualForm.providerReference.trim()}
                      >
                        ✓ Record manual payment
                      </button>
                      {pendingLiabilities.length === 0 && (
                        <p className="col-span-full text-xs text-on-surface-variant">No pending payment liabilities for this student.</p>
                      )}
                    </form>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              {filteredQueue.length === 0
                ? "No students in the finance queue at this time."
                : "Choose a request from the finance queue above."}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-on-surface-variant">Payment records</h3>
          <div className="overflow-x-auto rounded-lg border border-outline-variant/20">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Tx ref</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Provider</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Amount</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Date</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Status</th>
                  <th className="px-3 py-2 text-xs font-bold uppercase text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-on-surface-variant">No payment records for this request.</td></tr>
                ) : payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-primary-fixed/10">
                    <td className="px-3 py-2">
                      <strong>{payment.txRef}</strong>
                      <div className="text-[10px] text-on-surface-variant">{payment.receiptNumber ?? "Receipt pending"}</div>
                    </td>
                    <td className="px-3 py-2">{payment.provider}</td>
                    <td className="px-3 py-2">{payment.amount} {payment.currency}</td>
                    <td className="px-3 py-2 text-xs text-on-surface-variant">{fmtDate(payment.verifiedAt ?? payment.receiptIssuedAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${payment.status === "SUCCESS" || payment.status === "VERIFIED" ? "bg-green-100 text-green-800" : "bg-secondary-container text-on-secondary-container"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {payment.status !== "SUCCESS" ? (
                        <button type="button" className="text-xs font-bold text-primary underline" onClick={() => void handleVerifyPayment(payment.txRef)}>Verify</button>
                      ) : "Verified ✓"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
