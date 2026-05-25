import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentRecord, StudentIdentity } from "../types";

interface Props {
  payment: PaymentRecord;
  student: StudentIdentity;
  campusName: string;
  onClose: () => void;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function PaymentReceiptModal({ payment, student, campusName, onClose }: Props) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  const isVerified = payment.status === "VERIFIED" || payment.status === "PAID";

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Payment Receipt — ${payment.receiptNumber ?? payment.txRef}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Noto+Sans+Ethiopic:wght@400;700&display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; color: #0f172a; background: #fff; padding: 32px; }
          .receipt-wrap { max-width: 680px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
          .receipt-header { background: linear-gradient(135deg, #001e40, #0f4c81); color: #fff; padding: 28px 32px; }
          .receipt-header h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
          .receipt-header p { font-size: 12px; opacity: 0.75; margin-top: 4px; }
          .receipt-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; padding: 5px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
          .badge-verified { background: #bbf7d0; color: #14532d; }
          .badge-pending { background: #fef9c3; color: #713f12; }
          .section { padding: 20px 32px; border-bottom: 1px solid #f1f5f9; }
          .section-title { font-size: 10px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .info-item label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
          .info-item span { font-size: 13px; font-weight: 600; color: #0f172a; }
          .amount-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 32px; background: #f8fafc; }
          .amount-label { font-size: 13px; font-weight: 700; color: #475569; }
          .amount-value { font-size: 28px; font-weight: 900; color: #001e40; }
          .footer { padding: 20px 32px; text-align: center; font-size: 10px; color: #94a3b8; }
          .watermark { font-size: 11px; color: ${isVerified ? "#16a34a" : "#ca8a04"}; font-weight: 700; margin-top: 8px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
            <span className="text-sm font-black text-slate-800">{t("paymentReceipt")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              {t("printReceipt")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable receipt body */}
        <div className="overflow-y-auto flex-1">
          <div ref={printRef} className="receipt-wrap">
            {/* Header */}
            <div className="receipt-header" style={{ background: "linear-gradient(135deg, #001e40, #0f4c81)", color: "#fff", padding: "24px 28px" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">UNIVERSITY OF GONDAR</p>
                  <h2 className="text-lg font-black tracking-tight">UGClear — {t("paymentReceipt")}</h2>
                  <p className="text-xs opacity-60 mt-0.5">{campusName} · {t("financePayments")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] opacity-60 uppercase tracking-widest">{t("receipt")} #</p>
                  <p className="text-sm font-black font-mono">{payment.receiptNumber ?? payment.txRef}</p>
                </div>
              </div>
              <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${isVerified ? "bg-green-400/20 text-green-200" : "bg-yellow-400/20 text-yellow-200"}`}>
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{isVerified ? "verified" : "pending"}</span>
                {payment.status}
              </div>
            </div>

            {/* Student Info */}
            <div className="border-b border-slate-100 px-7 py-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("studentInformation")}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("fullName")}</p>
                  <p className="text-sm font-bold text-slate-800">{fullName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("studentId")}</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{student.studentId}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("program")}</p>
                  <p className="text-sm font-bold text-slate-800">{student.program ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("academicYear")}</p>
                  <p className="text-sm font-bold text-slate-800">{student.academicYear ? `${t("year")} ${student.academicYear}` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("email")}</p>
                  <p className="text-sm font-bold text-slate-800 break-all">{student.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("campus")}</p>
                  <p className="text-sm font-bold text-slate-800">{campusName}</p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-b border-slate-100 px-7 py-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("paymentDetails")}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("transactionRef")}</p>
                  <p className="text-sm font-bold text-slate-800 font-mono">{payment.txRef}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("providerRef")}</p>
                  <p className="text-sm font-bold text-slate-800">{payment.providerReference ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("paymentMethod")}</p>
                  <p className="text-sm font-bold text-slate-800">{payment.provider === "CHAPA" ? "Chapa (Online)" : "Manual / Bank"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("paymentDate")}</p>
                  <p className="text-sm font-bold text-slate-800">{formatDate(payment.verifiedAt ?? payment.receiptIssuedAt)}</p>
                  {(payment.verifiedAt ?? payment.receiptIssuedAt) && (
                    <p className="text-[10px] text-slate-400">{formatTime(payment.verifiedAt ?? payment.receiptIssuedAt)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between bg-slate-50 px-7 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("totalPaid")}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t("incl")} ETB</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-primary">{payment.amount.toFixed(2)}</p>
                <p className="text-xs font-bold text-slate-400">{payment.currency}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-5 text-center">
              <p className="text-[10px] text-slate-400">{t("receiptFooter")}</p>
              <p className={`mt-1 text-[11px] font-black ${isVerified ? "text-green-600" : "text-amber-600"}`}>
                {isVerified ? "✓ " + t("paymentVerified") : "⏳ " + t("pendingVerification")}
              </p>
              <p className="mt-3 text-[9px] text-slate-300 uppercase tracking-widest">
                {t("generatedAt")}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
