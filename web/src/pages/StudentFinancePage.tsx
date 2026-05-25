import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceRequest, ClearanceStatus } from "../types";

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StudentFinancePage() {
  const { token } = useAuth();
  const { campusSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const campus = getCampusBySlug(campusSlug);
  const { showToast } = useToast();

  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadRequests = useCallback(() => {
    if (!token) return;
    api.listStudentRequests(token)
      .then((items) => {
        setRequests(items);
        setSelectedRequestId((current) => {
          if (current && items.some((r) => r.id === current)) return current;
          return items[0]?.id ?? "";
        });
      })
      .catch((e) => showToast(e instanceof Error ? e.message : "Unable to load requests", "error"));
  }, [token, showToast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const txRef = searchParams.get("tx_ref") ?? searchParams.get("trx_ref");
    if (paymentStatus || txRef) {
      setSearchParams(new URLSearchParams(), { replace: true });
      loadRequests();
    }
  }, []);

  useEffect(() => {
    if (!token || !selectedRequestId) { setStatus(null); return; }
    api.getStudentStatus(token, selectedRequestId).then(setStatus).catch(() => setStatus(null));
  }, [selectedRequestId, token]);

  const payableLiabilities = useMemo(
    () => status?.liabilities.filter((item) => item.paymentRequired && item.status !== "PAID" && item.status !== "CLEARED" && item.status !== "WAIVED") ?? [],
    [status]
  );
  const totalDue = payableLiabilities.reduce((sum, item) => sum + item.amount, 0);
  const firstLiabilityHint = payableLiabilities[0]?.itemName ?? null;

  async function handlePayNow() {
    if (!token || !status || payableLiabilities.length === 0) return;
    setPaymentLoading(true);
    try {
      const response = await api.initiateChapaPayment(token, {
        clearanceRequestId: status.request.id,
        liabilityIds: payableLiabilities.map((item) => item.id)
      });
      window.location.assign(response.checkoutUrl);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to start payment", "error");
      setPaymentLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">Finance & Payments</span>
        <div className="ml-auto">
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {requests.length > 1 && (
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Select Request</label>
            <select
              aria-label="Select clearance request"
              className="w-full max-w-sm rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm"
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>{r.requestNumber} — {r.status}</option>
              ))}
            </select>
          </div>
        )}

        {payableLiabilities.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border-2 border-error/40 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error text-white shadow-lg shadow-error/30">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                </div>
                <div>
                  <p className="text-base font-black text-error">Finance action required</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    You have <strong>{payableLiabilities.length} unpaid {payableLiabilities.length === 1 ? "liability" : "liabilities"}</strong> totalling{" "}
                    <strong className="text-error">{totalDue.toFixed(2)} ETB</strong>.
                    {firstLiabilityHint && <span> First: <em>{firstLiabilityHint}</em>.</span>}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={paymentLoading}
                className="flex items-center gap-2 rounded-full bg-error px-6 py-3 font-black text-white shadow-xl shadow-error/30 transition-transform hover:scale-105 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                {paymentLoading ? "Redirecting…" : `Pay ${totalDue.toFixed(2)} ETB via Chapa`}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-on-surface">Liabilities &amp; payments</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">
              {(status?.liabilities.length ?? 0) + (status?.payments.length ?? 0)} items
            </span>
          </div>
          <div className="space-y-4">
            {status?.liabilities.length ? (
              status.liabilities.map((item) => {
                const unpaid = item.status !== "PAID" && item.status !== "CLEARED" && item.status !== "WAIVED";
                return (
                  <div key={item.id} className={`flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between ${unpaid && item.paymentRequired ? "border border-error/10 bg-error-container/20" : "bg-surface-container-low"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${unpaid && item.paymentRequired ? "bg-error-container text-error" : "bg-surface-container-high text-outline"}`}>
                        <span className="material-symbols-outlined">receipt</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.itemName}</p>
                        <p className="text-xs text-on-surface-variant">{item.description ?? item.status} · {campus?.name ?? "Campus"}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-lg font-black ${unpaid && item.paymentRequired ? "text-error" : ""}`}>
                        {item.amount} {item.currency}
                      </p>
                      <span className={`text-[10px] font-bold uppercase ${unpaid ? "text-error" : "text-on-surface-variant"}`}>{item.status}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-on-surface-variant">No liabilities for this request.</p>
            )}

            <div className="flex flex-col gap-3 border-t border-surface-container-high pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-bold text-on-surface-variant">Total due (payable)</span>
                <strong className="ml-0 block text-lg text-primary sm:ml-2 sm:inline">{totalDue.toFixed(2)} ETB</strong>
              </div>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={paymentLoading || payableLiabilities.length === 0}
                className="rounded-full bg-error px-5 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {paymentLoading ? "Redirecting…" : "Pay now"}
              </button>
            </div>

            <div className="border-t border-surface-container-high pt-6">
              <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-outline">Payment history</h4>
              {status?.payments.length ? (
                <div className="space-y-3">
                  {status.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg p-3 bg-surface-container-low">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">receipt_long</span>
                        <div>
                          <p className="text-sm font-bold">{p.provider}</p>
                          <p className="text-[10px] text-on-surface-variant">{p.txRef} · {formatDisplayDate(p.verifiedAt)}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded bg-primary-fixed px-2 py-1 text-[10px] font-bold text-on-primary-fixed-variant">
                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">No payments recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
