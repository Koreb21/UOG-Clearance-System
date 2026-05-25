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

  async function reload() {
    if (!token) return;
    const [studentItems, queue] = await Promise.all([api.listStaffStudents(token), api.listStaffQueue(token)]);
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
        api.listStaffQueue(token)
      ]);
      setStatus(nextStatus as ClearanceStatus);
      setPayments(nextPayments as PaymentRecord[]);
      setQueueItems(nextQueue);
      setManualForm({ providerReference: "", note: "" });
      showToast("Payment recorded successfully.", "success");
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
          api.listStaffQueue(token)
        ]);
        setStatus(nextStatus as ClearanceStatus);
        setPayments(nextPayments as PaymentRecord[]);
        setQueueItems(nextQueue);
      }
      showToast("Payment verified.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to verify payment", "error");
    }
  }

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
              </div>

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
                    <input className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" value={manualForm.providerReference} onChange={(e) => setManualForm((c) => ({ ...c, providerReference: e.target.value }))} required placeholder="e.g., RECEIPT-2024-001" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-on-surface-variant">Payment date / Note</span>
                    <input className="mt-1 w-full rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm" value={manualForm.note} onChange={(e) => setManualForm((c) => ({ ...c, note: e.target.value }))} placeholder="Date or additional notes" />
                  </label>
                  <button type="submit" className="col-span-full rounded-lg bg-secondary py-2.5 font-bold text-on-secondary disabled:opacity-50" disabled={pendingLiabilities.length === 0 || !manualForm.providerReference.trim()}>
                    ✓ Record manual payment
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Choose a request from the finance queue above.</p>
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
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${payment.status === "SUCCESS" || payment.status === "VERIFIED" ? "bg-green-100 text-green-800" : "bg-secondary-container text-on-secondary-container"}`}>{payment.status}</span>
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
