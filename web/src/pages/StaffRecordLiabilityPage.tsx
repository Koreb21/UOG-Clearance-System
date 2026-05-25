import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";

const API = "/api/v1";

const ROLE_TO_CHECK: Record<string, string> = {
  LIBRARIAN: "LIBRARY",
  PROCTOR: "PROCTOR",
  CAFE_STAFF: "CAFE",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  STUDENT_DEAN: "STUDENT_DEAN",
};

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function StaffRecordLiabilityPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug);

  const staffRole = user?.role ?? "";
  const checkCode = ROLE_TO_CHECK[staffRole] ?? "";

  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    yearOfStudy: "",
    department: "",
    campus: campus?.name ?? "",
    amount: "",
    paymentDate: todayInputValue(),
  });

  const [submitting, setSubmitting] = useState(false);

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    const amount = parseFloat(form.amount);
    if (!form.fullName.trim() || !form.studentId.trim() || !form.yearOfStudy || !form.department.trim() || !form.campus || isNaN(amount) || amount <= 0 || !form.paymentDate) {
      showToast("Please fill in all required fields correctly. Amount must be greater than 0.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        studentId: form.studentId.trim(),
        departmentCheckCode: checkCode,
        itemName: "Recorded Fine",
        category: "Fine Payment",
        description: `Name: ${form.fullName.trim()}, Year: ${form.yearOfStudy}, Department: ${form.department.trim()}, Campus: ${form.campus}, Date: ${form.paymentDate}`,
        amount,
        paymentRequired: true,
      };

      const r = await fetch(`${API}/staff/liabilities`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message ?? "Failed to record fine.");
      }

      showToast("Fine successfully recorded.", "success");
      setTimeout(() => {
        navigate(`/campus/${campusSlug}/staff`);
      }, 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to record fine.", "error");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif]">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-[#c3c6d1]/30 bg-white/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-5 w-px bg-[#c3c6d1]/40" />
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#003366] text-white">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-[#001e40]">Record Fine</h1>
            <p className="text-[10px] text-[#43474f]">{campus?.name ?? "Campus"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/campus/${campusSlug}/messages`)}
          className="flex items-center gap-1.5 rounded-xl border border-[#c3c6d1] bg-white px-3 py-2 text-xs font-bold text-[#43474f] hover:bg-[#f2f4f7] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span className="hidden sm:inline">Messages</span>
        </button>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-[#001e40]">Student Fine Record</h2>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Student Full Name *</label>
            <input
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              required
              placeholder="e.g. Abebe Kebede"
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Student ID *</label>
            <input
              value={form.studentId}
              onChange={(e) => updateField("studentId", e.target.value)}
              required
              placeholder="e.g. UGR/12345/12"
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Year of Study *</label>
            <select
              value={form.yearOfStudy}
              onChange={(e) => updateField("yearOfStudy", e.target.value)}
              required
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            >
              <option value="">Select year…</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
              <option value="5th">5th Year</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Department / Program *</label>
            <input
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              required
              placeholder="e.g. Electrical Engineering"
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Campus *</label>
            <select
              value={form.campus}
              onChange={(e) => updateField("campus", e.target.value)}
              required
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            >
              <option value="">Select campus…</option>
              <option value="Maraki Campus">Maraki</option>
              <option value="Atse Tewodros Campus">Tewodros</option>
              <option value="Atse Fasil Campus">Fasil</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Amount Paid (ETB) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => updateField("amount", e.target.value)}
              required
              placeholder="0.00"
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#43474f]">Payment Date *</label>
            <input
              type="date"
              value={form.paymentDate}
              onChange={(e) => updateField("paymentDate", e.target.value)}
              required
              className="w-full rounded-xl border border-[#c3c6d1]/40 bg-[#f2f4f7] px-4 py-2.5 text-sm focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/campus/${campusSlug}/staff`)}
              className="flex-1 rounded-xl border-2 border-[#c3c6d1] py-3 text-sm font-bold text-[#43474f] hover:bg-[#f2f4f7] transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#003366] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#002244] transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : "CONFIRM RECORD"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
