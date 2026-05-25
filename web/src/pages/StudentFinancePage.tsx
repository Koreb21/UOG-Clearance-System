import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { LanguageToggle } from "../components/LanguageToggle";
import { PaymentReceiptModal } from "../components/PaymentReceiptModal";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceRequest, ClearanceStatus, PaymentRecord } from "../types";

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type PaymentModal = "choose" | "manual" | null;

export function StudentFinancePage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const campus = getCampusBySlug(campusSlug);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [paymentModal, setPaymentModal] = useState<PaymentModal>(null);
  const [manualRef, setManualRef] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("");
  const [receiptOpen, setReceiptOpen] = useState(false);

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
      .catch((e) => showToast(e instanceof Error ? e.message : t("unableToLoadRequests"), "error"));
  }, [token, showToast, t]);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setPaymentModal(null); setReceiptOpen(false); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Auto-select first receipt when payments load
  useEffect(() => {
    if (status?.payments.length && !selectedReceiptId) {
      setSelectedReceiptId(status.payments[0].id);
    }
  }, [status?.payments]);

  const payableLiabilities = useMemo(
    () => status?.liabilities.filter((item) => item.paymentRequired && item.status !== "PAID" && item.status !== "CLEARED" && item.status !== "WAIVED") ?? [],
    [status]
  );
  const totalDue = payableLiabilities.reduce((sum, item) => sum + item.amount, 0);
  const firstLiabilityHint = payableLiabilities[0]?.itemName ?? null;

  const selectedReceipt: PaymentRecord | undefined = useMemo(
    () => status?.payments.find((p) => p.id === selectedReceiptId),
    [status?.payments, selectedReceiptId]
  );

  async function handleChapaPayNow() {
    if (!token || !status || payableLiabilities.length === 0) return;
    setPaymentLoading(true);
    setPaymentModal(null);
    try {
      const response = await api.initiateChapaPayment(token, {
        clearanceRequestId: status.request.id,
        liabilityIds: payableLiabilities.map((item) => item.id)
      });
      window.location.assign(response.checkoutUrl);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("unableToStartPayment"), "error");
      setPaymentLoading(false);
    }
  }

  async function handleManualPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !status || !user?.studentId) return;
    setManualSubmitting(true);
    try {
      await api.recordManualPayment(token, {
        clearanceRequestId: status.request.id,
        studentId: user.studentId,
        liabilityIds: payableLiabilities.map((item) => item.id),
        providerReference: manualRef.trim(),
        note: manualNote.trim() || undefined
      });
      showToast(t("manualPaymentSuccess"), "success");
      setPaymentModal(null);
      setManualRef("");
      setManualNote("");
      loadRequests();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("manualPaymentError"), "error");
    } finally {
      setManualSubmitting(false);
    }
  }

  const campusName = campus?.name ?? t("campus");

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">{t("financePayments")}</span>
        <div className="ml-auto flex items-center gap-3">
          <LanguageToggle />
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">

        {/* Request selector */}
        {requests.length > 1 && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">{t("selectRequest")}</label>
            <select
              aria-label={t("selectRequest")}
              className="w-full max-w-sm rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm"
              value={selectedRequestId}
              onChange={(e) => { setSelectedRequestId(e.target.value); setSelectedReceiptId(""); }}
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>{r.requestNumber} — {r.status}</option>
              ))}
            </select>
          </div>
        )}

        {/* Unpaid liabilities banner */}
        {payableLiabilities.length > 0 && (
          <div className="overflow-hidden rounded-xl border-2 border-error/40 bg-gradient-to-r from-red-50 to-orange-50 shadow-lg">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error text-white shadow-lg shadow-error/30">
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                </div>
                <div>
                  <p className="text-base font-black text-error">{t("financeActionRequired")}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {t("unpaidLiabilitiesDesc", { count: payableLiabilities.length, total: totalDue.toFixed(2) })}
                    {firstLiabilityHint && <span> {t("firstLiability")}: <em>{firstLiabilityHint}</em>.</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                {/* Chapa button */}
                <button
                  type="button"
                  onClick={handleChapaPayNow}
                  disabled={paymentLoading}
                  className="flex items-center gap-2 rounded-full bg-error px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-error/30 transition-transform hover:scale-105 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                  {paymentLoading ? t("redirecting") : t("payOnline")}
                </button>
                {/* Manual payment button */}
                <button
                  type="button"
                  onClick={() => setPaymentModal("manual")}
                  disabled={paymentLoading}
                  className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                  {t("payOffline")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liabilities & payments card */}
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-on-surface">{t("liabilitiesAndPayments")}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">
              {(status?.liabilities.length ?? 0) + (status?.payments.length ?? 0)} {t("items")}
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
                        <p className="text-xs text-on-surface-variant">{item.description ?? item.status} · {campusName}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-lg font-black ${unpaid && item.paymentRequired ? "text-error" : ""}`}>{item.amount} {item.currency}</p>
                      <span className={`text-[10px] font-bold uppercase ${unpaid ? "text-error" : "text-on-surface-variant"}`}>{item.status}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-on-surface-variant">{t("noLiabilities")}</p>
            )}

            {/* Total due row */}
            <div className="flex flex-col gap-3 border-t border-surface-container-high pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-bold text-on-surface-variant">{t("totalDue")}</span>
                <strong className="ml-0 block text-lg text-primary sm:ml-2 sm:inline">{totalDue.toFixed(2)} ETB</strong>
              </div>
              {payableLiabilities.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleChapaPayNow}
                    disabled={paymentLoading}
                    className="rounded-full bg-error px-4 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {paymentLoading ? t("redirecting") : t("payOnline")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModal("manual")}
                    disabled={paymentLoading}
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    {t("payOffline")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Receipts section ──────────────────────────────────────────── */}
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
            <h3 className="text-lg font-black tracking-tight text-on-surface">{t("receipts")}</h3>
            {status?.payments.length ? (
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                {status.payments.length}
              </span>
            ) : null}
          </div>

          {!status?.payments.length ? (
            <p className="text-sm text-on-surface-variant">{t("noReceipts")}</p>
          ) : (
            <div className="space-y-4">
              {/* Dropdown to pick a receipt */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    {t("selectReceipt")}
                  </label>
                  <select
                    className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedReceiptId}
                    onChange={(e) => setSelectedReceiptId(e.target.value)}
                  >
                    {status.payments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.receiptNumber ?? p.txRef} — {p.amount.toFixed(2)} {p.currency} · {p.provider === "CHAPA" ? "Chapa" : "Manual"} · {p.status}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!selectedReceipt}
                  onClick={() => setReceiptOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  {t("viewReceipt")}
                </button>
              </div>

              {/* Receipt preview card */}
              {selectedReceipt && (
                <div
                  className="cursor-pointer overflow-hidden rounded-xl border border-outline-variant/20 bg-white shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => setReceiptOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setReceiptOpen(true)}
                  aria-label={t("viewReceipt")}
                >
                  {/* Coloured top bar */}
                  <div className={`h-1.5 w-full ${selectedReceipt.status === "VERIFIED" || selectedReceipt.status === "PAID" ? "bg-green-500" : "bg-amber-400"}`} />

                  <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: student info + receipt # */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-on-surface">
                          {[status.student.firstName, status.student.middleName, status.student.lastName].filter(Boolean).join(" ")}
                        </p>
                        <p className="text-xs text-on-surface-variant font-mono">{status.student.studentId}</p>
                        <p className="mt-1 text-[10px] text-outline">{status.student.program ?? campusName} · {formatDisplayDate(selectedReceipt.verifiedAt ?? selectedReceipt.receiptIssuedAt)}</p>
                      </div>
                    </div>

                    {/* Right: amount + receipt number */}
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-black text-primary">{selectedReceipt.amount.toFixed(2)} <span className="text-sm font-bold">{selectedReceipt.currency}</span></p>
                      <p className="text-[10px] font-mono text-on-surface-variant">{selectedReceipt.receiptNumber ?? selectedReceipt.txRef}</p>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${selectedReceipt.status === "VERIFIED" || selectedReceipt.status === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {selectedReceipt.status === "VERIFIED" || selectedReceipt.status === "PAID" ? "check_circle" : "pending"}
                        </span>
                        {selectedReceipt.status}
                      </span>
                    </div>
                  </div>

                  {/* Provider + method row */}
                  <div className="flex items-center gap-3 border-t border-slate-50 bg-slate-50/70 px-5 py-2.5">
                    <span className="material-symbols-outlined text-sm text-outline">account_balance</span>
                    <span className="text-xs text-on-surface-variant">{selectedReceipt.provider === "CHAPA" ? "Chapa (Online)" : "Manual / Bank"}</span>
                    {selectedReceipt.providerReference && (
                      <>
                        <span className="text-outline/40">·</span>
                        <span className="text-xs font-mono text-on-surface-variant">{selectedReceipt.providerReference}</span>
                      </>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-primary">
                      {t("viewReceipt")} <span className="material-symbols-outlined text-xs">chevron_right</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* ── Manual payment modal ───────────────────────────────────────── */}
      {paymentModal === "manual" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null); }}
        >
          <div ref={modalRef} className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 leading-tight">{t("manualPaymentTitle")}</h3>
                <p className="text-[11px] text-slate-500">{totalDue.toFixed(2)} ETB · {payableLiabilities.length} {t("items")}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleManualPayment} className="flex flex-col gap-4 p-6">
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                <span className="font-bold">ℹ️ </span>{t("manualPaymentDesc")}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("bankReference")} *</span>
                <input
                  type="text"
                  required
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder={t("bankReferencePlaceholder")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{t("optionalNote")}</span>
                <textarea
                  rows={2}
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder={t("optionalNotePlaceholder")}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 rounded-full border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting || !manualRef.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {manualSubmitting ? "…" : t("submitManualPayment")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Receipt viewer modal ───────────────────────────────────────── */}
      {receiptOpen && selectedReceipt && status?.student && (
        <PaymentReceiptModal
          payment={selectedReceipt}
          student={status.student}
          campusName={campusName}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  );
}
