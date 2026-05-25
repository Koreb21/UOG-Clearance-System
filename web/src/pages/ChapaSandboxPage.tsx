import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";

export function ChapaSandboxPage() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const txRef = searchParams.get("tx_ref") ?? "";
  const amount = searchParams.get("amount") ?? "0";
  const currency = searchParams.get("currency") ?? "ETB";
  const studentName = searchParams.get("name") ?? "Student";
  const returnUrl = searchParams.get("return_url") ?? "/";

  const [step, setStep] = useState<"form" | "processing" | "done" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  useEffect(() => {
    if (!txRef) {
      window.location.replace("/");
    }
  }, [txRef]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setErrorMsg("Session expired. Please log in again."); setStep("error"); return; }
    setStep("processing");
    try {
      await new Promise((r) => setTimeout(r, 1800));
      await api.verifyChapaPayment(token, txRef, {
        status: "success",
        providerReference: "CHAPA-SANDBOX-" + txRef.slice(-6),
      });
      setStep("done");
      await new Promise((r) => setTimeout(r, 1200));
      window.location.assign(returnUrl + (returnUrl.includes("?") ? "&" : "?") + "payment=success&tx_ref=" + encodeURIComponent(txRef));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setStep("error");
    }
  }

  function handleCancel() {
    window.location.assign(returnUrl + (returnUrl.includes("?") ? "&" : "?") + "payment=cancelled&tx_ref=" + encodeURIComponent(txRef));
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center px-4 py-10 font-sans">
      <div className="w-full max-w-sm">

        {/* Chapa header */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b82f6]">
              <span className="text-lg font-black text-white">C</span>
            </div>
            <span className="text-2xl font-black text-[#1e3a5f]">Chapa</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">Sandbox</span>
          </div>
          <p className="text-xs text-slate-500">Secure Payment Gateway — Test Environment</p>
        </div>

        {/* Payment summary */}
        <div className="mb-4 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">You are paying</p>
          <p className="text-3xl font-black text-[#1e3a5f]">
            {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="ml-1 text-base font-bold text-slate-500">{currency}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            to <span className="font-semibold text-slate-700">University of Gondar</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Payer: {studentName}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-300">{txRef}</p>
        </div>

        {/* Form */}
        {step === "form" && (
          <form onSubmit={handlePay} className="rounded-2xl bg-white px-5 py-5 shadow-sm space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Card Details (Test Mode)</p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Card Number</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                placeholder="4242 4242 4242 4242"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-0.5 text-[10px] text-slate-400">Use any card number in test mode</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#3b82f6] py-3 text-sm font-black text-white shadow-md hover:bg-[#2563eb] transition-colors"
            >
              Pay {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel and go back
            </button>
          </form>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-5 py-10 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-base font-black text-slate-700">Processing Payment…</p>
            <p className="text-xs text-slate-400">Please do not close this window</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-5 py-10 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-black text-green-700">Payment Successful!</p>
            <p className="text-xs text-slate-400">Redirecting you back…</p>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-5 py-10 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-base font-black text-red-700">Payment Failed</p>
            <p className="text-sm text-slate-500 text-center">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-[10px] text-slate-400">
          🔒 This is a Chapa sandbox environment. No real charges are made.
        </p>
      </div>
    </div>
  );
}
