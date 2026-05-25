import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { StudentSummary, PaymentRecord } from "../types";

type TabKey = "new" | "history";

const YEARS = ["1st", "2nd", "3rd", "4th", "5th"];

const CAMPUS_OPTIONS = [
  { value: "TEWODROS", label: "Atse Tewodros" },
  { value: "MARAKI", label: "Maraki" },
  { value: "FASIL", label: "Atse Fasil" },
];

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function generateTxId(): string {
  return "TXN-" + uid().slice(0, 6).toUpperCase();
}

function generateReceiptNumber(): string {
  return "RCP-" + uid().slice(0, 6).toUpperCase();
}

export function FinanceRecordPaymentPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const hash = window.location.hash;
    if (hash === "#history") return "history";
    return "new";
  });

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    studentFullName: "",
    studentId: "",
    yearOfStudy: "",
    department: "",
    campus: user?.campusId ?? "",
    amountPaid: "",
    paymentDate: todayInputValue(),
    referenceNumber: "",
  });

  const [liability, setLiability] = useState<{
    recordedBy: string;
    originalAmount: number;
    reason: string;
    liabilityId: string;
    clearanceRequestId: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    txId: string;
    receiptNumber: string;
    timestamp: string;
  } | null>(null);

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.listStaffStudents(token).then((data) => setStudents(data as StudentSummary[])).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token || activeTab !== "history") return;
    setHistoryLoading(true);
    api.listPaymentHistory(token, campus?.code)
      .then((data) => setPaymentHistory(data as PaymentRecord[]))
      .catch(() => undefined)
      .finally(() => setHistoryLoading(false));
  }, [token, activeTab, campus?.code]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return students.filter((s) => {
      const name = `${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.trim().toLowerCase();
      return name.includes(q) || s.studentId.toLowerCase().includes(q);
    }).slice(0, 6);
  }, [search, students]);

  async function lookupLiability(studentId: string, campusId: string) {
    if (!token) return;
    try {
      const allRequests = await api.listStaffQueue(token);
      const studentRequests = allRequests.filter((r) => r.studentId === studentId);
      if (studentRequests.length === 0) return;
      const mostRecent = studentRequests[studentRequests.length - 1];
      const status = await api.getVisibleStudentStatus(token, studentId, mostRecent.clearanceRequestId) as { request: { id: string }; liabilities: { id: string; itemName: string; amount: number; status: string; paymentRequired: boolean; departmentCheckCode: string }[] };
      const pending = status.liabilities.find((l) => l.paymentRequired && !["PAID", "CLEARED", "WAIVED"].includes(l.status));
      if (pending) {
        const recordedByName = pending.departmentCheckCode === "FINANCE" ? "Finance Office" : pending.departmentCheckCode;
        setLiability({
          recordedBy: recordedByName,
          originalAmount: pending.amount,
          reason: pending.itemName,
          liabilityId: pending.id,
          clearanceRequestId: status.request.id,
        });
      } else {
        setLiability(null);
      }
    } catch {
      setLiability(null);
    }
  }

  function selectStudent(s: StudentSummary) {
    const fullName = `${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.trim();
    setForm((prev) => ({
      ...prev,
      studentFullName: fullName,
      studentId: s.studentId,
      yearOfStudy: String(s.academicYear ?? ""),
      department: s.program ?? s.academicDepartmentId ?? "",
      campus: s.campusId,
    }));
    setSearch("");
    setShowSearchResults(false);
    if (token) lookupLiability(s.studentId, s.campusId);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const amount = Number(form.amountPaid);
    if (!amount || amount <= 0) {
      showToast("Amount paid must be greater than 0 ETB.", "error");
      return;
    }

    if (!form.studentFullName.trim() || !form.studentId.trim()) {
      showToast("Student full name and ID are required.", "error");
      return;
    }

    setLoading(true);
    const txId = generateTxId();
    const receiptNumber = generateReceiptNumber();
    const timestamp = new Date().toISOString();

    try {
      await api.recordStandalonePayment(token, {
        studentFullName: form.studentFullName.trim(),
        studentId: form.studentId.trim(),
        yearOfStudy: form.yearOfStudy,
        department: form.department.trim(),
        campusId: form.campus,
        amountPaid: amount,
        paymentDate: form.paymentDate,
        referenceNumber: form.referenceNumber.trim() || null,
        liabilityId: liability?.liabilityId ?? null,
        clearanceRequestId: liability?.clearanceRequestId ?? null,
        txId,
        receiptNumber,
        recordedBy: user?.username ?? "Finance Staff",
      });

      setReceiptData({ txId, receiptNumber, timestamp });
      setShowReceipt(true);
      showToast("Payment recorded successfully.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to record payment.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handlePrintReceipt() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(receiptHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  function receiptHtml(): string {
    if (!receiptData) return "";
    const d = new Date(receiptData.timestamp);
    const dateStr = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const campusLabel = CAMPUS_OPTIONS.find((c) => c.value === form.campus)?.label ?? form.campus;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Payment Receipt — UGClear</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: "Inter", -apple-system, sans-serif; margin: 0; padding: 40px; color: #1a202c; background: #fff; }
          .receipt { max-width: 700px; margin: 0 auto; border: 2px solid #001e40; padding: 32px; border-radius: 12px; }
          .header { text-align: center; border-bottom: 2px solid #001e40; padding-bottom: 20px; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 28px; color: #001e40; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #4a5568; text-transform: uppercase; letter-spacing: 1px; }
          .badge { display: inline-block; background: #001e40; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf2f7; }
          .row:last-child { border-bottom: none; }
          .label { font-size: 12px; text-transform: uppercase; color: #718096; font-weight: 600; letter-spacing: 0.5px; }
          .value { font-size: 15px; font-weight: 600; color: #1a202c; text-align: right; }
          .total { background: #f7fafc; padding: 16px; border-radius: 8px; margin-top: 20px; }
          .total .value { font-size: 22px; color: #001e40; }
          .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #a0aec0; }
          .stamp { margin-top: 24px; text-align: center; border: 1px dashed #cbd5e0; padding: 12px; border-radius: 8px; display: inline-block; }
          @media print { body { padding: 0; } .receipt { border: none; max-width: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>UGClear</h1>
            <p>University of Gondar — Official Payment Receipt</p>
            <div class="badge">PAID</div>
          </div>
          <div class="row"><span class="label">Transaction ID</span><span class="value">${receiptData.txId}</span></div>
          <div class="row"><span class="label">Receipt Number</span><span class="value">${receiptData.receiptNumber}</span></div>
          <div class="row"><span class="label">Date & Time</span><span class="value">${dateStr} · ${timeStr}</span></div>
          <div class="row"><span class="label">Student Name</span><span class="value">${form.studentFullName}</span></div>
          <div class="row"><span class="label">Student ID</span><span class="value">${form.studentId}</span></div>
          <div class="row"><span class="label">Year of Study</span><span class="value">${form.yearOfStudy || "—"}</span></div>
          <div class="row"><span class="label">Department / Program</span><span class="value">${form.department || "—"}</span></div>
          <div class="row"><span class="label">Campus</span><span class="value">${campusLabel}</span></div>
          <div class="row"><span class="label">Reference / Receipt No.</span><span class="value">${form.referenceNumber || "—"}</span></div>
          ${liability ? `
          <div style="margin-top:20px;padding-top:16px;border-top:2px solid #001e40;">
            <div class="row"><span class="label">Liability Recorded By</span><span class="value">${liability.recordedBy}</span></div>
            <div class="row"><span class="label">Original Liability Amount</span><span class="value">${liability.originalAmount.toLocaleString()} ETB</span></div>
            <div class="row"><span class="label">Reason / Notes</span><span class="value">${liability.reason}</span></div>
          </div>` : ""}
          <div class="total">
            <div class="row"><span class="label">Amount Paid</span><span class="value">${Number(form.amountPaid).toLocaleString()} ETB</span></div>
          </div>
          <div class="footer">
            <p>This is an official receipt generated by UGClear.</p>
            <p>For inquiries, contact the Finance Office at University of Gondar.</p>
          </div>
          <div style="text-align:center;margin-top:16px;">
            <div class="stamp">
              <p style="margin:0;font-size:11px;color:#718096;">Verified by <strong>${user?.username ?? "Finance Staff"}</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  function resetForm() {
    setForm({
      studentFullName: "",
      studentId: "",
      yearOfStudy: "",
      department: "",
      campus: user?.campusId ?? "",
      amountPaid: "",
      paymentDate: todayInputValue(),
      referenceNumber: "",
    });
    setLiability(null);
    setShowReceipt(false);
    setReceiptData(null);
  }

  function exportCSV() {
    const rows = paymentHistory.map((p) => ({
      "Student ID": p.studentId,
      "Transaction ID": p.txRef,
      "Receipt Number": p.receiptNumber ?? "",
      "Amount": p.amount,
      "Currency": p.currency,
      "Status": p.status,
      "Date": p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : "",
    }));
    if (rows.length === 0) { showToast("No data to export.", "error"); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String(r[h as keyof typeof r]).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported.", "success");
  }

  function exportPDF() {
    if (paymentHistory.length === 0) { showToast("No data to export.", "error"); return; }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = paymentHistory.map((p) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.studentId}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.txRef}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.receiptNumber ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.amount.toLocaleString()} ${p.currency}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.status}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #edf2f7;font-size:13px;font-family:Inter,sans-serif;">${p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : "—"}</td>
      </tr>
    `).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Payment History</title>
      <style>
        @page { margin: 15mm; }
        body { font-family: Inter, -apple-system, sans-serif; margin: 0; padding: 24px; color: #1a202c; background: #fff; }
        h1 { margin: 0 0 8px; font-size: 22px; color: #001e40; }
        p.meta { margin: 0 0 20px; font-size: 12px; color: #718096; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #718096; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 2px solid #001e40; }
        td { font-size: 13px; }
        .footer { margin-top: 24px; font-size: 11px; color: #a0aec0; text-align: center; }
      </style></head>
      <body>
        <h1>Manual Payment History</h1>
        <p class="meta">${campus?.name ?? "Campus"} — ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Student ID</th><th>Transaction ID</th><th>Receipt Number</th><th>Amount</th><th>Status</th><th>Date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer"><p>Generated by UGClear Finance Office</p></div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-16">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="w-px h-6 bg-outline-variant/40" />
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold tracking-tight">Manual Payment</h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Finance Office — {campus?.name ?? "Campus"}</p>
        </div>
        <SessionControls density="compact" />
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-surface-container-low p-1.5">
          {(["new", "history"] as TabKey[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                activeTab === t
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "new" ? "New Payment Entry" : "Payment History"}
            </button>
          ))}
        </div>

        {activeTab === "new" && (
        <>
        <div className="rounded-2xl bg-white shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="bg-gradient-to-r from-[#001e40] to-[#003a70] px-6 py-5">
            <h2 className="text-lg font-black tracking-tight text-white">New Payment Entry</h2>
            <p className="text-xs text-primary-fixed-dim mt-1">Record a manual payment and generate an official receipt.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Student search */}
            <div className="relative" ref={searchRef}>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Search Student</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearchResults(true); }}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Type student name or ID..."
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-high pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-outline-variant/30 bg-white shadow-lg overflow-hidden">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStudent(s)}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-high transition-colors flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary text-xs font-bold">
                        {s.firstName[0]}{s.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{s.firstName} {s.middleName ?? ""} {s.lastName}</p>
                        <p className="text-xs text-on-surface-variant">{s.studentId} · {s.program ?? "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.studentFullName}
                  onChange={(e) => setForm((p) => ({ ...p, studentFullName: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                  placeholder="Abebech Bekele"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Student ID *</label>
                <input
                  type="text"
                  required
                  value={form.studentId}
                  onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                  placeholder="UGR/001/24"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Year of Study *</label>
                <select
                  required
                  value={form.yearOfStudy}
                  onChange={(e) => setForm((p) => ({ ...p, yearOfStudy: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select year...</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y} Year</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Department / Program *</label>
                <input
                  type="text"
                  required
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                  placeholder="Computer Science"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Campus *</label>
                <select
                  required
                  value={form.campus}
                  onChange={(e) => setForm((p) => ({ ...p, campus: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select campus...</option>
                  {CAMPUS_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Amount Paid (ETB) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={0.01}
                  value={form.amountPaid}
                  onChange={(e) => setForm((p) => ({ ...p, amountPaid: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                  placeholder="500.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Reference / Receipt Number</label>
                <input
                  type="text"
                  value={form.referenceNumber}
                  onChange={(e) => setForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                  className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                  placeholder="Bank slip or receipt number"
                />
              </div>
            </div>

            {/* Liability auto-fill section */}
            {liability && (
              <div className="rounded-xl border border-primary/20 bg-primary-container/10 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-base">info</span>
                  <span className="text-sm font-bold text-primary">Linked Liability Found</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Recorded By</p>
                    <p className="text-sm font-semibold">{liability.recordedBy}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Original Amount</p>
                    <p className="text-sm font-semibold">{liability.originalAmount.toLocaleString()} ETB</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">Reason / Notes</p>
                    <p className="text-sm font-semibold">{liability.reason}</p>
                  </div>
                </div>
              </div>
            )}

            {!liability && form.studentId && (
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-base">info</span>
                  <span className="text-sm text-on-surface-variant">No pending liability found for this student. Payment will be recorded as a standalone transaction.</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                {loading ? "Recording..." : "Confirm Payment"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-high px-6 py-3 font-semibold text-on-surface transition-all hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                Cancel
              </button>
            </div>
          </form>
        </div>

        {showReceipt && receiptData && (
          <div className="mt-8 rounded-2xl bg-white shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-xl">receipt</span>
                <h3 className="text-base font-black tracking-tight text-white">Payment Receipt</h3>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">{receiptData.txId}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-xs text-on-surface-variant">Receipt Number</span><p className="font-semibold">{receiptData.receiptNumber}</p></div>
                <div><span className="text-xs text-on-surface-variant">Date</span><p className="font-semibold">{new Date(receiptData.timestamp).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p></div>
                <div><span className="text-xs text-on-surface-variant">Student</span><p className="font-semibold">{form.studentFullName}</p></div>
                <div><span className="text-xs text-on-surface-variant">Student ID</span><p className="font-semibold">{form.studentId}</p></div>
                <div><span className="text-xs text-on-surface-variant">Amount</span><p className="font-semibold text-primary">{Number(form.amountPaid).toLocaleString()} ETB</p></div>
                <div><span className="text-xs text-on-surface-variant">Reference</span><p className="font-semibold">{form.referenceNumber || "—"}</p></div>
              </div>
              {liability && (
                <div className="rounded-lg bg-surface-container-low p-3 text-sm space-y-1">
                  <p className="text-xs text-on-surface-variant">Linked Liability</p>
                  <p className="font-semibold">{liability.reason} — {liability.originalAmount.toLocaleString()} ETB (recorded by {liability.recordedBy})</p>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 font-semibold text-white shadow-lg shadow-green-700/20 transition-all hover:shadow-green-700/30"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Print / Download PDF
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-high px-5 py-2.5 font-semibold text-on-surface transition-all hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  Record Another Payment
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {activeTab === "history" && (
          <div className="rounded-2xl bg-white shadow-sm border border-outline-variant/20 overflow-hidden">
            <div className="bg-gradient-to-r from-[#001e40] to-[#003a70] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Payment History</h2>
                <p className="text-xs text-primary-fixed-dim mt-1">Recently recorded manual payments on {campus?.name ?? "this campus"}.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportPDF}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  PDF
                </button>
              </div>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="py-8 text-center text-sm text-on-surface-variant">Loading payment history…</div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-on-surface-variant">No manual payment records found for this campus.</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-outline-variant/20">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-container-low">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Student ID</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Transaction ID</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Receipt #</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Amount</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container">
                        {paymentHistory.map((p) => (
                          <tr key={p.id} className="hover:bg-primary-fixed/10">
                            <td className="px-4 py-3 font-mono text-xs">{p.studentId}</td>
                            <td className="px-4 py-3 text-xs">{p.txRef}</td>
                            <td className="px-4 py-3 text-xs">{p.receiptNumber ?? "—"}</td>
                            <td className="px-4 py-3 font-semibold">{p.amount.toLocaleString()} {p.currency}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                p.status === "SUCCESS" || p.status === "VERIFIED"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-secondary-container text-on-secondary-container"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-on-surface-variant">
                              {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
