import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
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
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");
  const isVerified = payment.status === "VERIFIED" || payment.status === "PAID";

  // Build the QR payload that staff scanners will read
  useEffect(() => {
    const payload = JSON.stringify({
      v: 1,
      type: "UGCLEAR_PAYMENT",
      receipt: payment.receiptNumber ?? payment.txRef,
      txRef: payment.txRef,
      providerRef: payment.providerReference ?? null,
      studentId: student.studentId,
      studentName: fullName,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.provider,
      issuedAt: payment.receiptIssuedAt ?? payment.verifiedAt ?? new Date().toISOString(),
    });

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 200,
      color: { dark: "#001e40", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [payment, student, fullName]);

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=820,height=960");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Payment Receipt — ${payment.receiptNumber ?? payment.txRef}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Noto+Sans+Ethiopic:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;color:#0f172a;background:#fff;padding:28px}
    .receipt-wrap{max-width:680px;margin:0 auto;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;page-break-inside:avoid}
    .rh{background:linear-gradient(135deg,#001e40,#0f4c81);color:#fff;padding:24px 28px;display:flex;justify-content:space-between;align-items:flex-start}
    .rh-left p.eyebrow{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.65;margin-bottom:4px}
    .rh-left h2{font-size:20px;font-weight:900;letter-spacing:-.5px}
    .rh-left p.sub{font-size:11px;opacity:.55;margin-top:3px}
    .rh-right{text-align:right}
    .rh-right .label{font-size:9px;letter-spacing:1px;text-transform:uppercase;opacity:.6}
    .rh-right .num{font-size:13px;font-weight:900;font-family:monospace}
    .badge{display:inline-flex;align-items:center;gap:5px;margin-top:12px;padding:4px 10px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
    .badge-v{background:rgba(74,222,128,.2);color:#bbf7d0}
    .badge-p{background:rgba(250,204,21,.2);color:#fef08a}
    .section{padding:18px 28px;border-bottom:1px solid #f1f5f9}
    .section-title{font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-bottom:10px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}
    .info-item .lbl{font-size:9px;font-weight:700;text-transform:uppercase;color:#94a3b8;letter-spacing:.5px;display:block;margin-bottom:1px}
    .info-item .val{font-size:12px;font-weight:700;color:#0f172a}
    .info-item .val.mono{font-family:monospace}
    .amount-row{display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:#f8fafc}
    .amount-left .albl{font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8}
    .amount-left .asub{font-size:9px;color:#94a3b8;margin-top:2px}
    .amount-right .aval{font-size:28px;font-weight:900;color:#001e40;text-align:right}
    .amount-right .acur{font-size:10px;font-weight:700;color:#94a3b8;text-align:right}
    .qr-section{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-top:1px solid #f1f5f9;gap:20px}
    .qr-img{width:100px;height:100px;border:2px solid #e2e8f0;border-radius:8px;padding:4px;background:#fff;flex-shrink:0}
    .qr-text{flex:1}
    .qr-text .qt{font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px}
    .qr-text .qd{font-size:11px;color:#475569;line-height:1.5}
    .qr-text .qref{font-family:monospace;font-size:11px;font-weight:700;color:#001e40;margin-top:4px}
    .footer{padding:14px 28px;text-align:center;border-top:1px solid #f1f5f9}
    .footer p{font-size:9px;color:#94a3b8;line-height:1.5}
    .footer .status{font-size:10px;font-weight:700;margin-top:6px}
    .footer .gen{font-size:8px;color:#cbd5e1;margin-top:8px;letter-spacing:1px;text-transform:uppercase}
    @media print{body{padding:0}}
  </style>
</head>
<body>${content}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
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

        {/* ── Scrollable receipt body ────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <div ref={printRef} className="receipt-wrap">

            {/* Header */}
            <div className="rh">
              <div className="rh-left">
                <p className="eyebrow">University of Gondar</p>
                <h2>UGClear — {t("paymentReceipt")}</h2>
                <p className="sub">{campusName} · {t("financePayments")}</p>
                <div className={`badge ${isVerified ? "badge-v" : "badge-p"}`}>
                  {isVerified ? "✓ " + t("paymentVerified") : "⏳ " + t("pendingVerification")}
                </div>
              </div>
              <div className="rh-right">
                <p className="label">{t("receipt")} #</p>
                <p className="num">{payment.receiptNumber ?? payment.txRef}</p>
              </div>
            </div>

            {/* Student Info */}
            <div className="section">
              <p className="section-title">{t("studentInformation")}</p>
              <div className="info-grid">
                <div className="info-item">
                  <span className="lbl">{t("fullName")}</span>
                  <span className="val">{fullName}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("studentId")}</span>
                  <span className="val mono">{student.studentId}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("program")}</span>
                  <span className="val">{student.program ?? "—"}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("academicYear")}</span>
                  <span className="val">{student.academicYear ? `${t("year")} ${student.academicYear}` : "—"}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("email")}</span>
                  <span className="val" style={{ wordBreak: "break-all" }}>{student.email ?? "—"}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("campus")}</span>
                  <span className="val">{campusName}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="section">
              <p className="section-title">{t("paymentDetails")}</p>
              <div className="info-grid">
                <div className="info-item">
                  <span className="lbl">{t("transactionRef")}</span>
                  <span className="val mono">{payment.txRef}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("providerRef")}</span>
                  <span className="val">{payment.providerReference ?? "—"}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("paymentMethod")}</span>
                  <span className="val">{payment.provider === "CHAPA" ? "Chapa (Online)" : "Manual / Bank"}</span>
                </div>
                <div className="info-item">
                  <span className="lbl">{t("paymentDate")}</span>
                  <span className="val">{formatDate(payment.verifiedAt ?? payment.receiptIssuedAt)}</span>
                  {(payment.verifiedAt ?? payment.receiptIssuedAt) && (
                    <span className="val" style={{ fontSize: "10px", color: "#94a3b8" }}> {formatTime(payment.verifiedAt ?? payment.receiptIssuedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="amount-row">
              <div className="amount-left">
                <p className="albl">{t("totalPaid")}</p>
                <p className="asub">{t("incl")} · ETB</p>
              </div>
              <div className="amount-right">
                <p className="aval">{payment.amount.toFixed(2)}</p>
                <p className="acur">{payment.currency}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="qr-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px", borderTop: "1px solid #f1f5f9", gap: "20px" }}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Payment verification QR code"
                  className="qr-img"
                  style={{ width: "100px", height: "100px", border: "2px solid #e2e8f0", borderRadius: "8px", padding: "4px", background: "#fff", flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: "100px", height: "100px", border: "2px dashed #e2e8f0", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "9px", color: "#94a3b8" }}>…</span>
                </div>
              )}
              <div className="qr-text" style={{ flex: 1 }}>
                <p className="qt" style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>
                  {t("scanToVerify")}
                </p>
                <p className="qd" style={{ fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>
                  {t("scanToVerifyDesc")}
                </p>
                <p className="qref" style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 700, color: "#001e40", marginTop: "6px" }}>
                  {payment.receiptNumber ?? payment.txRef}
                </p>
                <p style={{ fontSize: "9px", color: "#94a3b8", marginTop: "3px", fontFamily: "monospace" }}>
                  {student.studentId}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="footer" style={{ padding: "14px 28px", textAlign: "center", borderTop: "1px solid #f1f5f9" }}>
              <p style={{ fontSize: "9px", color: "#94a3b8", lineHeight: 1.5 }}>{t("receiptFooter")}</p>
              <p className={`status`} style={{ fontSize: "10px", fontWeight: 700, marginTop: "6px", color: isVerified ? "#16a34a" : "#ca8a04" }}>
                {isVerified ? "✓ " + t("paymentVerified") : "⏳ " + t("pendingVerification")}
              </p>
              <p style={{ fontSize: "8px", color: "#cbd5e1", marginTop: "10px", letterSpacing: "1px", textTransform: "uppercase" }}>
                {t("generatedAt")}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
