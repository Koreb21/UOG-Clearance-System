import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import type { ClearanceStatus, Inquiry } from "../types";

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const CHECK_META: Record<string, string> = {
  LIBRARY: "Library",
  PROCTOR: "Proctor / Dormitory",
  CAFE: "Cafe / Food Services",
  DEPARTMENT_HEAD: "Department Head",
  STUDENT_DEAN: "Dean of Students",
};

export function StudentHelpPage() {
  const { token } = useAuth();
  const { campusSlug } = useParams();
  const { showToast } = useToast();

  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ targetCheckCode: "LIBRARY", subject: "", message: "" });

  useEffect(() => {
    if (!token) return;
    api.listStudentRequests(token)
      .then((items) => {
        const id = items[0]?.id ?? "";
        setSelectedRequestId(id);
      })
      .catch(() => undefined);
    api.listStudentInquiries(token).then(setInquiries).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedRequestId) { setStatus(null); return; }
    api.getStudentStatus(token, selectedRequestId)
      .then((next) => {
        setStatus(next);
        setInquiryForm((cur) => ({ ...cur, targetCheckCode: next.checks[0]?.checkCode ?? cur.targetCheckCode }));
      })
      .catch(() => setStatus(null));
  }, [selectedRequestId, token]);

  const currentInquiries = useMemo(
    () => inquiries.filter((i) => i.clearanceRequestId === status?.request.id),
    [inquiries, status?.request.id]
  );

  async function handleCreateInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !status) return;
    setSubmittingInquiry(true);
    const body = inquiryForm.subject.trim()
      ? `${inquiryForm.subject.trim()}\n\n${inquiryForm.message.trim()}`
      : inquiryForm.message.trim();
    try {
      const created = await api.createStudentInquiry(token, {
        clearanceRequestId: status.request.id,
        targetCheckCode: inquiryForm.targetCheckCode,
        message: body
      });
      setInquiries((cur) => [created, ...cur]);
      setInquiryForm((cur) => ({ ...cur, subject: "", message: "" }));
      showToast("Inquiry sent successfully.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to send inquiry", "error");
    } finally {
      setSubmittingInquiry(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">Inquiry Center</span>
        <div className="ml-auto">
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-on-surface">Inquiry Center</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-outline">{currentInquiries.length} messages</span>
          </div>

          <div className="no-scrollbar mb-6 max-h-[300px] overflow-y-auto rounded-xl bg-surface-container-low p-4">
            <div className="space-y-4">
              {currentInquiries.length === 0 ? (
                <p className="text-center text-xs text-on-surface-variant">No messages for this request yet. Send an inquiry below.</p>
              ) : (
                currentInquiries.map((item) => (
                  <div key={item.id} className="space-y-3 border-b border-outline-variant/20 pb-4 last:border-0">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[10px] font-bold text-outline">
                        You · {formatDisplayDate(item.createdAt)} → {CHECK_META[item.targetCheckCode] ?? item.targetCheckCode}
                      </span>
                      <div className="max-w-[85%] rounded-xl rounded-tl-none bg-white p-3 text-xs text-on-surface-variant shadow-sm">{item.message}</div>
                    </div>
                    {item.response ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-primary">
                          {CHECK_META[item.targetCheckCode] ?? item.targetCheckCode}
                          {item.respondedAt ? ` · ${formatDisplayDate(item.respondedAt)}` : ""}
                        </span>
                        <div className="max-w-[85%] rounded-xl rounded-tr-none bg-primary-container p-3 text-xs text-on-primary shadow-sm">{item.response}</div>
                      </div>
                    ) : (
                      <p className="text-end text-[10px] text-on-surface-variant">Awaiting reply…</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleCreateInquiry} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <select
                aria-label="Target office for inquiry"
                className="rounded-lg border-none bg-surface-container-high p-3 text-xs font-bold text-on-surface"
                value={inquiryForm.targetCheckCode}
                onChange={(e) => setInquiryForm((c) => ({ ...c, targetCheckCode: e.target.value }))}
              >
                {status?.checks
                  ? status.checks.map((check) => (
                      <option key={check.id} value={check.checkCode}>
                        {CHECK_META[check.checkCode] ?? check.checkCode}
                      </option>
                    ))
                  : Object.entries(CHECK_META).map(([code, label]) => (
                      <option key={code} value={code}>{label}</option>
                    ))
                }
              </select>
              <input
                className="rounded-lg border-none bg-surface-container-high p-3 text-xs"
                placeholder="Subject (optional)"
                value={inquiryForm.subject}
                onChange={(e) => setInquiryForm((c) => ({ ...c, subject: e.target.value }))}
              />
            </div>
            <div className="relative">
              <textarea
                className="min-h-[100px] w-full rounded-lg border-none bg-surface-container-high p-4 text-xs focus:ring-2 focus:ring-primary/20"
                placeholder="Message the office about a flag or delay…"
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm((c) => ({ ...c, message: e.target.value }))}
                required
                rows={4}
              />
              <button
                type="submit"
                disabled={submittingInquiry}
                className="absolute bottom-4 right-4 flex items-center justify-center rounded-lg bg-primary p-2 text-on-primary shadow-lg shadow-primary/20 disabled:opacity-50"
                aria-label="Send"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}
