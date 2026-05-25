import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { SessionControls } from "../components/SessionControls";
import { useToast } from "../components/ToastContext";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceRequest, ClearanceStatus, QrVerificationResponse } from "../types";

const CHECK_LABELS: Record<string, string> = {
  LIBRARY: "Library Service",
  PROCTOR: "Proctor / Dormitory",
  CAFE: "Cafeteria Service",
  DEPARTMENT_HEAD: "Department Head",
  STUDENT_DEAN: "Dean of Students",
};

function checkLabel(code: string) { return CHECK_LABELS[code] ?? code.replace(/_/g, " "); }

function statusColor(status: string) {
  switch (status) {
    case "CLEARED": return { bg: "bg-green-100", text: "text-green-700", label: "Approved" };
    case "FLAGGED": return { bg: "bg-red-100", text: "text-red-700", label: "Flagged" };
    case "FAILED": return { bg: "bg-red-100", text: "text-red-800", label: "Failed" };
    case "IN_REVIEW": return { bg: "bg-blue-100", text: "text-blue-700", label: "In Review" };
    case "AWAITING_FINANCE": return { bg: "bg-amber-100", text: "text-amber-700", label: "Awaiting Finance" };
    case "PAID_PENDING_DEPARTMENT_APPROVAL": return { bg: "bg-teal-100", text: "text-teal-700", label: "Paid – Pending Dept." };
    default: return { bg: "bg-gray-100", text: "text-gray-600", label: "Pending" };
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case "CLEARED": return "check_circle";
    case "FLAGGED": return "warning";
    case "FAILED": return "cancel";
    case "IN_REVIEW": return "visibility";
    case "AWAITING_FINANCE": return "payments";
    case "PAID_PENDING_DEPARTMENT_APPROVAL": return "receipt_long";
    default: return "hourglass_empty";
  }
}

function initials(name: string) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(val?: string | null) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ET", { year: "numeric", month: "short", day: "numeric" });
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl text-sm font-bold ${type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
      <span className="material-symbols-outlined text-lg">{type === "success" ? "check_circle" : "error"}</span>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="ml-2 rounded-full p-0.5 hover:bg-white/20">
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function RegistrarQueuePage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);
  const { showToast } = useToast();

  const [queue, setQueue] = useState<ClearanceRequest[]>([]);
  const [studentOverviews, setStudentOverviews] = useState<Array<{ request_id: string; request_number: string; student: { studentId: string; firstName: string; lastName: string; program?: string }; status: string; submitted_at: string; progress_percentage: number; checks: Array<{ id: string; checkCode: string; status: string }>; has_certificate: boolean }>>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [verification, setVerification] = useState<QrVerificationResponse | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingQueue(true);
    Promise.all([
      api.listRegistrarQueue(token).then(setQueue).catch(() => undefined),
      api.listAllStudentClearances(token).then(setStudentOverviews).catch(() => undefined),
    ]).finally(() => setLoadingQueue(false));
  }, [token]);

  useEffect(() => {
    if (queue.length > 0 && !selectedRequestId) setSelectedRequestId(queue[0].id);
  }, [queue, selectedRequestId]);

  useEffect(() => {
    if (!token || !selectedRequestId) { setStatus(null); return; }
    const current = queue.find((item) => item.id === selectedRequestId);
    if (!current) return;
    setLoadingDetail(true);
    setVerification(null);
    api.getVisibleStudentStatus(token, current.studentId, current.id)
      .then(setStatus).catch(() => setStatus(null)).finally(() => setLoadingDetail(false));
  }, [queue, selectedRequestId, token]);

  const progressPct = useMemo(() => {
    if (!status?.checks.length) return 0;
    return Math.round((status.checks.filter((c) => c.status === "CLEARED").length / status.checks.length) * 100);
  }, [status?.checks]);

  const allChecksCleared = useMemo(() => {
    if (!status?.checks.length) return false;
    return status.checks.every((c) => c.status === "CLEARED");
  }, [status?.checks]);

  const certificateIssued = status?.certificate != null;

  const pendingDepts = useMemo(() => {
    if (!status?.checks) return [];
    return status.checks.filter((c) => c.status !== "CLEARED").map((c) => checkLabel(c.checkCode));
  }, [status?.checks]);

  function getOverview(requestId: string) { return studentOverviews.find((s) => s.request_id === requestId); }

  async function reloadDetail() {
    if (!token || !selectedRequestId) return;
    const current = queue.find((item) => item.id === selectedRequestId);
    if (!current) return;
    const next = await api.getVisibleStudentStatus(token, current.studentId, current.id);
    setStatus(next);
  }

  async function reloadQueue() {
    if (!token) return;
    const [nextQueue, nextOverviews] = await Promise.all([api.listRegistrarQueue(token), api.listAllStudentClearances(token)]);
    setQueue(nextQueue);
    setStudentOverviews(nextOverviews);
    return nextQueue;
  }

  async function handleCreateCertificate() {
    if (!token) return;
    setActionBusy("create");
    try {
      await api.generateCertificate(token, selectedRequestId);
      await reloadDetail();
      await reloadQueue();
      showToast("Certificate generated successfully!", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create certificate";
      showToast(msg, "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSendCertificate() {
    if (!token || !selectedRequestId) return;
    setActionBusy("send");
    try {
      await api.sendCertificateToStudent(token, selectedRequestId, "Your clearance certificate is ready. QR code verified and authenticated.");
      showToast("Certificate sent to student successfully!", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to send certificate", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleArchive() {
    if (!token || !selectedRequestId) return;
    setActionBusy("archive");
    try {
      await api.closeRequestByRegistrar(token, selectedRequestId);
      const nextQueue = (await reloadQueue()) ?? [];
      setSelectedRequestId((current) => {
        if (current && nextQueue.some((item) => item.id === current)) return current;
        return nextQueue[0]?.id ?? "";
      });
      setStatus(null);
      setVerification(null);
      showToast("Request archived successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to archive request", "error");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleVerifyQr() {
    if (!token || !status?.certificate) return;
    setActionBusy("verify");
    try {
      const response = await api.verifyQr(token, status.certificate.hash);
      setVerification(response);
      showToast(response.message, response.valid ? "success" : "error");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to verify QR", "error");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif] text-[#191c1e]">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton className="text-[#43474f] hover:bg-[#e6e8eb]" />
          <div className="w-px h-6 bg-[#c3c6d1]/50" />
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#003366] text-white">
            <span className="material-symbols-outlined text-lg">group</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#001e40]">Student Queue</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#43474f] opacity-60">{campus?.name ?? "University of Gondar"}</p>
          </div>
        </div>
        <SessionControls density="compact" />
      </header>

      <main className="pt-20 p-6 min-h-screen">
        <div className="grid grid-cols-12 gap-6" style={{ minHeight: "calc(100vh - 100px)" }}>
          <section className="col-span-12 lg:col-span-4 flex flex-col bg-[#f2f4f7] rounded-3xl overflow-hidden border border-[#c3c6d1]/30">
            <div className="p-5 bg-white border-b border-[#c3c6d1]/20 flex justify-between items-center">
              <h2 className="text-base font-bold text-[#001e40]">Active Queue</h2>
              <span className="text-[10px] px-2 py-1 bg-[#d5e3ff] text-[#001b3c] font-bold rounded-full">{queue.length} request{queue.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "70vh" }}>
              {loadingQueue ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full p-4 bg-white rounded-2xl space-y-2">
                    <Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-16" />
                  </div>
                ))
              ) : queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#43474f]">
                  <span className="material-symbols-outlined text-5xl opacity-30">assignment</span>
                  <p className="text-sm font-medium">No pending requests</p>
                </div>
              ) : (
                queue.map((request) => {
                  const overview = getOverview(request.id);
                  const isSelected = request.id === selectedRequestId;
                  const fullName = overview ? `${overview.student.firstName} ${overview.student.lastName}` : request.studentId;
                  const pct = overview?.progress_percentage ?? 0;
                  const hasCert = overview?.has_certificate ?? false;
                  const reqStatus = overview?.status ?? request.status;
                  let badgeBg = "bg-[#e6e8eb] text-[#43474f]";
                  if (reqStatus === "CLEARED") badgeBg = "bg-green-100 text-green-800";
                  else if (reqStatus === "IN_REVIEW") badgeBg = "bg-amber-100 text-amber-800";
                  else if (reqStatus === "FLAGGED") badgeBg = "bg-red-100 text-red-800";
                  return (
                    <button key={request.id} type="button" onClick={() => setSelectedRequestId(request.id)}
                      className={`w-full text-left p-4 rounded-2xl shadow-sm border-2 transition-all ${isSelected ? "border-[#d5e3ff] ring-2 ring-[#d5e3ff]/40 bg-white" : "border-transparent bg-white hover:border-[#fdc34d]"}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected ? "bg-[#003366] text-white" : "bg-[#e6e8eb] text-[#001e40]"}`}>{initials(fullName)}</div>
                        <span className={`text-[10px] px-2 py-0.5 font-bold rounded uppercase ${badgeBg}`}>{reqStatus.replace(/_/g, " ")}</span>
                      </div>
                      <p className={`text-sm font-bold ${isSelected ? "text-[#001e40]" : "text-[#191c1e]"}`}>{fullName}</p>
                      <p className="text-[10px] text-[#43474f] mb-2">ID: {request.studentId}</p>
                      <p className="text-[10px] text-[#43474f] mb-2 font-mono">{request.requestNumber}</p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-[#e6e8eb] h-1 rounded-full">
                            <div className="h-full rounded-full bg-[#7b5800] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] font-medium text-[#43474f]">{pct}% cleared</p>
                        </div>
                        {hasCert && <span className="material-symbols-outlined text-sm text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="col-span-12 lg:col-span-8 bg-white rounded-3xl p-8 flex flex-col shadow-sm border border-[#c3c6d1]/20">
            {loadingDetail ? (
              <div className="space-y-6">
                <div className="flex gap-6 items-start"><Skeleton className="w-24 h-24 rounded-2xl" /><div className="space-y-2 flex-1"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div></div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ) : !status ? (
              <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4 text-[#43474f]">
                <span className="material-symbols-outlined text-6xl opacity-20">assignment</span>
                <p className="text-sm font-medium">Select a request to view details</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-6 flex-1 min-w-0">
                    <div className="w-24 h-24 rounded-2xl bg-[#003366] flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
                      {initials(`${status.student.firstName} ${status.student.lastName}`)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h2 className="text-3xl font-black text-[#001e40] truncate">{status.student.firstName} {status.student.lastName}</h2>
                        {!allChecksCleared && <span className="bg-[#ffdad6] text-[#93000a] px-3 py-1 rounded-full text-[10px] font-bold uppercase">Pending Approvals</span>}
                        {allChecksCleared && !certificateIssued && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">Ready to Certify</span>}
                        {certificateIssued && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase">✓ Certified</span>}
                      </div>
                      <p className="text-[#43474f] font-medium text-sm">{status.student.program ?? "—"}</p>
                      <div className="flex flex-wrap gap-3 mt-3">
                        <div className="px-3 py-1.5 bg-[#eceef1] rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-sm">badge</span><span className="text-xs font-bold text-[#001e40]">{status.student.studentId}</span></div>
                        <div className="px-3 py-1.5 bg-[#eceef1] rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-sm">receipt_long</span><span className="text-xs font-bold text-[#001e40]">{status.request.requestNumber}</span></div>
                        <div className="px-3 py-1.5 bg-[#eceef1] rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-sm">calendar_month</span><span className="text-xs font-bold text-[#001e40]">{status.request.academicYearLabel}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#43474f]">Clearance Progress</span>
                    <span className="text-sm font-black text-[#001e40]">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-[#e6e8eb] h-3 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${progressPct === 100 ? "bg-green-600" : progressPct >= 70 ? "bg-[#7b5800]" : "bg-[#001e40]"}`} style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-[10px] text-[#43474f] mt-1">{status.checks.filter((c) => c.status === "CLEARED").length} of {status.checks.length} departments cleared</p>
                </div>

                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#43474f] mb-3">Staff Approvals</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {status.checks.map((check) => {
                      const s = statusColor(check.status);
                      const icon = statusIcon(check.status);
                      const isFlagged = check.status === "FLAGGED" || check.status === "FAILED";
                      return (
                        <div key={check.id} className={`p-4 rounded-2xl flex items-center justify-between transition-all ${check.status === "CLEARED" ? "bg-[#f2f4f7]" : isFlagged ? "bg-red-50 border-l-4 border-red-500" : "bg-[#f2f4f7] opacity-75"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.bg}`}>
                              <span className={`material-symbols-outlined text-sm ${s.text}`} style={check.status === "CLEARED" ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#001e40]">{checkLabel(check.checkCode)}</p>
                              {check.comment ? <p className={`text-[10px] ${isFlagged ? "text-red-700 font-medium" : "text-[#43474f]"}`}>{check.comment}</p> : <p className="text-[10px] text-[#43474f]">{check.reviewedAt ? `Reviewed ${formatDate(check.reviewedAt)}` : "Awaiting review"}</p>}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase ${s.text}`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!allChecksCleared && pendingDepts.length > 0 && (
                  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span className="material-symbols-outlined text-base mt-0.5 text-amber-600">info</span>
                    <p>Waiting for <strong>{pendingDepts.join(", ")}</strong> to approve before the Registrar can act.</p>
                  </div>
                )}

                {certificateIssued && status.certificate && (
                  <div className="mb-6 p-5 rounded-2xl bg-[#f2f4f7] border border-[#c3c6d1]/30">
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-44 h-44 rounded-xl border-2 border-dashed border-[#c3c6d1] bg-white p-3 flex items-center justify-center shadow-inner">
                          <img src={`data:image/png;base64,${status.certificate.base64Qr}`} alt="QR certificate" className="w-full h-full object-contain" />
                        </div>
                        <button type="button" onClick={() => void handleVerifyQr()} disabled={actionBusy === "verify"} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#1f477b] hover:text-[#001e40] disabled:opacity-50">
                          <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                          {actionBusy === "verify" ? "Verifying…" : "Verify QR"}
                        </button>
                        {verification && (
                          <p className={`text-[10px] font-bold text-center px-3 py-1 rounded-full ${verification.valid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {verification.valid ? "✓" : "✗"} {verification.message}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#43474f]">Certificate Details</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-[#43474f]">Certificate ID</p><p className="font-mono font-bold text-[#001e40]">{status.certificate.id.slice(0, 12)}…</p></div>
                          <div><p className="text-[#43474f]">Issued</p><p className="font-bold text-[#001e40]">{formatDate(status.certificate.generatedAt)}</p></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-3 pt-6 border-t border-[#c3c6d1]/20">
                  {allChecksCleared && !certificateIssued && (
                    <button type="button" onClick={() => void handleCreateCertificate()} disabled={actionBusy === "create"}
                      className="flex-1 h-14 bg-gradient-to-br from-[#001e40] to-[#003366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 shadow-lg">
                      <span className="material-symbols-outlined text-lg">qr_code_2</span>
                      {actionBusy === "create" ? "Generating…" : "Generate QR Certificate"}
                    </button>
                  )}
                  {certificateIssued && (
                    <button type="button" onClick={() => void handleSendCertificate()} disabled={actionBusy === "send"}
                      className="flex-1 h-14 bg-[#fdc34d] text-[#715000] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-50 shadow-lg">
                      <span className="material-symbols-outlined text-lg">mail</span>
                      {actionBusy === "send" ? "Sending…" : "Send to Student"}
                    </button>
                  )}
                  {!allChecksCleared && (
                    <button type="button" disabled className="flex-1 h-14 bg-gradient-to-br from-[#001e40] to-[#003366] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
                      <span className="material-symbols-outlined text-lg">qr_code_2</span>
                      Generate QR Certificate
                    </button>
                  )}
                  <button type="button" onClick={() => void handleArchive()} disabled={actionBusy === "archive"}
                    className="px-6 h-14 bg-[#eceef1] rounded-xl font-bold text-sm text-[#43474f] hover:bg-[#e6e8eb] disabled:opacity-50">
                    {actionBusy === "archive" ? "Archiving…" : "Archive"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

    </div>
  );
}
