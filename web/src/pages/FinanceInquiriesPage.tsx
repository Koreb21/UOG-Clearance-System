import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { Inquiry, StaffQueueItem } from "../types";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function FinanceInquiriesPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [queueItems, setQueueItems] = useState<StaffQueueItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  useEffect(() => {
    if (!token) return;
    api.listStaffQueue(token)
      .then((queue) => {
        setQueueItems(queue);
        setSelectedRequestId((cur) => {
          if (cur && queue.some((item) => item.clearanceRequestId === cur)) return cur;
          return queue[0]?.clearanceRequestId ?? "";
        });
      })
      .catch(() => undefined);
    api.listStaffInquiries(token).then(setInquiries).catch(() => undefined);
  }, [token]);

  const currentInquiries = useMemo(
    () => inquiries.filter((q) => q.clearanceRequestId === selectedRequestId),
    [inquiries, selectedRequestId]
  );

  async function handleReplyInquiry(inquiry: Inquiry) {
    if (!token || !replyDraft.trim()) return;
    setRespondingId(inquiry.id);
    try {
      const updated = await api.respondToInquiry(token, inquiry.id, { response: replyDraft.trim(), status: "ANSWERED" });
      setInquiries((cur) => cur.map((q) => (q.id === updated.id ? updated : q)));
      setReplyDraft("");
      showToast("Reply sent to student.", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to send reply", "error");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-12">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-outline-variant/20 bg-background/90 px-4 backdrop-blur-md sm:px-6">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary-fixed text-primary">
          <span className="material-symbols-outlined text-[18px]">forum</span>
        </div>
        <h1 className="text-base font-bold">{campus?.name ?? "Campus"} — Student Inquiries</h1>
        <div className="ml-auto">
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-4">
          <select
            aria-label="Select student request"
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className="rounded-lg border-none bg-surface-container-high px-4 py-3 text-sm focus:ring-2 focus:ring-primary w-full max-w-sm"
          >
            <option value="">— Select a request to view inquiries —</option>
            {queueItems.map((item) => (
              <option key={item.checkId} value={item.clearanceRequestId}>
                {item.requestNumber} | {item.studentId}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold">Student inquiries</h2>
          <p className="mb-5 text-sm text-on-surface-variant">
            Reply to inquiries submitted by the selected student.
            {currentInquiries.length > 0 && <span className="ml-2 rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white">{currentInquiries.length} open</span>}
          </p>
          {currentInquiries.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No inquiries for this request.</p>
          ) : (
            <div className="space-y-6">
              {currentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-on-surface-variant">
                      {inquiry.targetCheckCode} Office{inquiry.respondedAt ? ` · ${fmtDate(inquiry.respondedAt)}` : ""}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${inquiry.status === "ANSWERED" ? "bg-green-100 text-green-800" : "bg-secondary-container text-on-secondary-container"}`}>{inquiry.status}</span>
                  </div>
                  <p className="mb-3 text-sm text-on-surface">{inquiry.message}</p>
                  {inquiry.response && (
                    <div className="mb-3 rounded-lg bg-primary-fixed/20 p-3 text-sm">
                      <span className="text-xs font-bold text-primary">Your reply: </span>
                      {inquiry.response}
                    </div>
                  )}
                  {inquiry.status !== "ANSWERED" && (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border-none bg-surface-container-high px-3 py-2 text-sm"
                        placeholder="Type your reply…"
                        value={respondingId === inquiry.id ? replyDraft : ""}
                        onFocus={() => setRespondingId(inquiry.id)}
                        onChange={(e) => setReplyDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={respondingId !== inquiry.id || !replyDraft.trim()}
                        onClick={() => void handleReplyInquiry(inquiry)}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
