import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { LanguageToggle } from "../components/LanguageToggle";
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

type PaymentModal = "choose" | "chapa" | "manual" | null;

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
      if (e.key === "Escape") setPaymentModal(null);
    }
    if (paymentModal) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [paymentModal]);

  const payableLiabilities = useMemo(
    () => status?.liabilities.filter((item) => item.paymentRequired && item.status !== "PAID" && item.status !== "CLEARED" && item.status !== "WAIVED") ?? [],
    [status]
  );
  const totalDue = payableLiabilities.reduce((sum, item) => sum + item.amount, 0);
  const firstLiabilityHint = payableLiabilities[0]?.itemName ?? null;

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

  function openPaymentChoice() {
    setPaymentModal("choose");
  }

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

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {requests.length > 1 && (
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">{t("selectRequest")}</label>
            <select
              aria-label={t("selectRequest")}
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
                  <p className="text-base font-black text-error">{t("financeActionRequired")}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {t("unpaidLiabilitiesDesc", { count: payableLiabilities.length, total: totalDue.toFixed(2) })}
                    {firstLiabilityHint && <span> {t("firstLiability")}: <em>{firstLiabilityHint}</em>.</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={openPaymentChoice}
                  disabled={paymentLoading}
                  className="flex items-center gap-2 rounded-full bg-error px-6 py-3 font-black text-white shadow-xl shadow-error/30 transition-transform hover:scale-105 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                  {paymentLoading ? t("redirecting") : t("payNow")}
                </button>
              </div>
            </div>
          </div>
        )}

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
                        <p className="text-xs text-on-surface-variant">{item.description ?? item.status} · {campus?.name ?? t("campus")}</p>
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
              <p className="text-sm text-on-surface-variant">{t("noLiabilities")}</p>
            )}

            <div className="flex flex-col gap-3 border-t border-surface-container-high pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-bold text-on-surface-variant">{t("totalDue")}</span>
                <strong className="ml-0 block text-lg text-primary sm:ml-2 sm:inline">{totalDue.toFixed(2)} ETB</strong>
              </div>
              {payableLiabilities.length > 0 && (
                <button
                  type="button"
                  onClick={openPaymentChoice}
                  disabled={paymentLoading}
                  className="rounded-full bg-error px-5 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {paymentLoading ? t("redirecting") : t("payNow")}
                </button>
              )}
            </div>

            <div className="border-t border-surface-container-high pt-6">
              <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-outline">{t("paymentHistory")}</h4>
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
                <p className="text-sm text-on-surface-variant">{t("noPaymentsYet")}</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Payment method chooser modal ──────────────────────────────────── */}
      {paymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentModal(null); }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {paymentModal === "choose" && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                  <h3 className="text-base font-black text-slate-800">{t("choosePaymentMethod")}</h3>
                  <button
                    type="button"
                    onClick={() => setPaymentModal(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                    aria-label="Close"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <div className="flex flex-col gap-3 p-6">
                  <p className="text-sm text-slate-500 -mt-1 mb-1">
                    {t("totalDue")}: <strong className="text-error">{totalDue.toFixed(2)} ETB</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleChapaPayNow}
                    disabled={paymentLoading}
                    className="flex items-center gap-3 rounded-xl border-2 border-error/20 bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4 text-left transition-all hover:border-error/50 hover:shadow-md disabled:opacity-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error text-white shadow shadow-error/30">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                    </div>
                    <div>
                      <p className="font-black text-error text-sm">{t("payOnline")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t("payViaChapa", { amount: totalDue.toFixed(2) })}</p>
                    </div>
                    <span className="material-symbols-outlined ml-auto text-outline text-lg">chevron_right</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentModal("manual")}
                    className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-4 text-left transition-all hover:border-slate-400 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm">{t("payOffline")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t("manualPaymentDesc")}</p>
                    </div>
                    <span className="material-symbols-outlined ml-auto text-outline text-lg">chevron_right</span>
                  </button>
                </div>
              </>
            )}

            {paymentModal === "manual" && (
              <>
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setPaymentModal("choose")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                    aria-label="Back"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
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
                      onClick={() => setPaymentModal("choose")}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
