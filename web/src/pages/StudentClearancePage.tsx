import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { LanguageToggle } from "../components/LanguageToggle";
import { useToast } from "../components/ToastContext";
import { api, toApiUrl } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceCheck, ClearanceRequest, ClearanceStatus } from "../types";

function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(first?: string | null, last?: string | null, fallback?: string) {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  if (pair) return pair;
  return (fallback?.[0] ?? "S").toUpperCase();
}

function downloadCertificateQr(base64Qr: string, requestNumber: string) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64Qr}`;
  link.download = `uog-clearance-qr-${requestNumber}.png`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function checkToneClasses(status: ClearanceCheck["status"]) {
  switch (status) {
    case "CLEARED":
      return { dot: "bg-primary-container border-primary-container", badge: "bg-primary-fixed text-on-primary-fixed-variant", icon: "text-on-primary", iconName: "check" as const, iconFill: true };
    case "FLAGGED":
    case "FAILED":
      return { dot: "bg-error-container border-error-container", badge: "bg-error text-on-error", icon: "text-error", iconName: "report_problem" as const, iconFill: false };
    case "AWAITING_FINANCE":
    case "PAID_PENDING_DEPARTMENT_APPROVAL":
      return { dot: "bg-secondary-fixed border-secondary-fixed", badge: "bg-secondary-container text-on-secondary-container", icon: "text-on-secondary-fixed-variant", iconName: "payments" as const, iconFill: false };
    case "IN_REVIEW":
      return { dot: "bg-secondary-fixed border-secondary-fixed", badge: "bg-secondary-container text-on-secondary-container", icon: "text-on-secondary-fixed-variant", iconName: "sync" as const, iconFill: false };
    default:
      return { dot: "bg-surface-container-lowest border-outline-variant", badge: "bg-surface-container-high text-outline", icon: "text-outline", iconName: "hourglass_empty" as const, iconFill: false };
  }
}

export function StudentClearancePage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const campus = getCampusBySlug(campusSlug);
  const { showToast } = useToast();

  const CHECK_META = useMemo(() => ({
    LIBRARY: { label: t("checkLibrary"), subtitle: t("checkSubLibrary"), icon: "menu_book" },
    PROCTOR: { label: t("checkProctor"), subtitle: t("checkSubProctor"), icon: "bed" },
    CAFE: { label: t("checkCafe"), subtitle: t("checkSubCafe"), icon: "restaurant" },
    DEPARTMENT_HEAD: { label: t("checkDepartmentHead"), subtitle: t("checkSubDepartmentHead"), icon: "school" },
    STUDENT_DEAN: { label: t("checkStudentDean"), subtitle: t("checkSubStudentDean"), icon: "groups" },
  }), [t]);

  function checkMeta(code: string) {
    return CHECK_META[code as keyof typeof CHECK_META] ?? { label: code.replace(/_/g, " "), subtitle: t("departmentalClearance"), icon: "apartment" };
  }

  function requestCardTitle(r: ClearanceRequest) {
    const typeLabel = r.requestType === "FINAL" ? t("finalClearance") : r.requestType === "WITHDRAWAL" ? t("withdrawal") : t("semesterClearance");
    return `${typeLabel} • ${r.academicYearLabel}`;
  }

  function requestCardSubtitle(r: ClearanceRequest) {
    return `${r.semester} · ${r.requestType.replace(/_/g, " ")}`;
  }

  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [form, setForm] = useState({
    semester: "Semester 2",
    academicYearLabel: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    requestType: "FINAL" as "SEMESTER" | "FINAL" | "WITHDRAWAL"
  });

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
      .catch((e) => showToast(e instanceof Error ? e.message : "Unable to load requests", "error"));
  }, [token, showToast]);

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
    api.getStudentStatus(token, selectedRequestId)
      .then(setStatus)
      .catch((e) => showToast(e instanceof Error ? e.message : "Unable to load clearance status", "error"));
  }, [selectedRequestId, token]);

  const clearedChecks = status?.checks.filter((c) => c.status === "CLEARED").length ?? 0;
  const totalChecks = status?.checks.length ?? 0;
  const requestProgress = totalChecks === 0 ? 0 : Math.round((clearedChecks / totalChecks) * 100);

  const displayName = status
    ? `${status.student.firstName} ${status.student.lastName}`.trim()
    : user?.username ?? t("students");
  const programLine = status?.student.program
    ? `${status.student.program}${status.student.academicYear != null ? ` • ${t("year")} ${status.student.academicYear}` : ""}`
    : t("program");

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      const created = await api.createStudentRequest(token, form);
      setRequests((cur) => [created, ...cur]);
      setSelectedRequestId(created.id);
      setShowCreatePanel(false);
      showToast(t("clearanceCreated"), "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to create clearance request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-20">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-outline-variant/20 bg-white/70 px-4 shadow-sm backdrop-blur-xl sm:px-8">
        <BackButton />
        <div className="h-5 w-px bg-outline-variant/40" />
        <span className="text-base font-bold tracking-tight text-primary">{t("clearanceStatusLabel")}</span>
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setShowCreatePanel(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            {t("newRequest")}
          </button>
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("request")}</span>
            <p className="mt-1 text-sm font-bold text-primary">{status?.request.requestNumber ?? "—"}</p>
            <p className="text-xs text-on-surface-variant">{status?.request.status ?? t("noActiveRequestShort")}</p>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("clearedLabel")}</span>
            <p className="mt-1 text-2xl font-black text-on-surface">{totalChecks ? `${clearedChecks}/${totalChecks}` : "—"}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-secondary transition-all" style={{ width: `${requestProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("certificateLabel")}</span>
            <p className={`mt-1 text-sm font-bold ${status?.certificate ? "text-primary" : "text-on-surface-variant"}`}>
              {status?.certificate ? t("ready") : t("locked")}
            </p>
            <p className="text-xs text-on-surface-variant">{status?.certificate ? t("downloadBelow") : t("clearAllDepartments")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t("clearanceRequests")}</h3>
              <button type="button" className="text-xs font-bold text-primary underline" onClick={loadRequests}>{t("refresh")}</button>
            </div>
            {requests.length === 0 ? (
              <p className="rounded-xl bg-surface-container-lowest p-5 text-sm text-on-surface-variant shadow-sm">{t("noClearanceRequests")}</p>
            ) : (
              requests.map((request) => {
                const active = request.id === selectedRequestId;
                const done = request.status === "CLEARED";
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-xl p-5 text-left shadow-sm ring-2 transition-all ${active ? "bg-white ring-primary/10" : "bg-surface-container-low opacity-90 ring-transparent hover:opacity-100"} ${done ? "opacity-80" : ""}`}
                  >
                    <div className="mb-3 flex justify-between">
                      <span className={`rounded px-2 py-1 text-xs font-black ${done ? "text-on-surface-variant" : "bg-primary-fixed text-on-primary-fixed"}`}>
                        {done ? t("completed") : t("active")}
                      </span>
                      <span className="text-xs text-on-surface-variant">{formatDisplayDate(request.submittedAt)}</span>
                    </div>
                    <h4 className="mb-1 font-bold text-on-surface">{requestCardTitle(request)}</h4>
                    <p className="mb-3 text-xs text-on-surface-variant">{requestCardSubtitle(request)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface-variant">{request.status}</span>
                      <span className="text-xs font-bold text-primary">{active ? t("selectedLabel") : t("viewDetails")}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm lg:col-span-8">
            <div className="flex flex-col gap-4 border-b border-surface-container-high p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {status?.student.hasProfileImage && status.student.profileImageUrl ? (
                  <img alt="" className="h-16 w-16 rounded-xl object-cover ring-4 ring-surface-container-low" src={toApiUrl(status.student.profileImageUrl) ?? undefined} />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-fixed text-lg font-black text-on-primary-fixed-variant ring-4 ring-surface-container-low">
                    {initials(status?.student.firstName, status?.student.lastName, displayName)}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black tracking-tight text-on-surface">{displayName}</h2>
                  <p className="text-sm font-bold text-on-primary-fixed-variant">{programLine}</p>
                  <p className="mt-1 font-mono text-xs text-on-surface-variant">ID: {status?.student.studentId ?? "—"}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-outline">{t("requestStatus")}</p>
                <p className="text-lg font-bold text-secondary">{status?.request.status ?? "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 md:grid-cols-2">
              <div>
                <h4 className="mb-6 text-xs font-black uppercase tracking-widest text-on-primary-fixed-variant">{t("departmentalProgress")}</h4>
                {!status ? (
                  <p className="text-sm text-on-surface-variant">{t("selectRequestToView")}</p>
                ) : (
                  <div className="relative space-y-6 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-0.5 before:bg-surface-container-high">
                    {status.checks.map((check) => {
                      const meta = checkMeta(check.checkCode);
                      const tone = checkToneClasses(check.status);
                      return (
                        <div key={check.id} className="relative pl-10">
                          <div className={`absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 ${tone.dot}`}>
                            <span className={`material-symbols-outlined text-[14px] ${tone.icon}`} style={tone.iconFill ? { fontVariationSettings: "'FILL' 0, 'wght' 700" } : undefined}>
                              {tone.iconName}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-on-surface">{meta.label}</p>
                              <p className="text-xs text-on-surface-variant">{meta.subtitle}</p>
                              {check.comment && (
                                <p className={`mt-1 text-xs ${check.status === "FLAGGED" || check.status === "FAILED" ? "font-medium text-error" : "text-on-surface-variant"}`}>
                                  {check.comment}
                                </p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}>{check.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-6 rounded-2xl border border-secondary/20 bg-secondary-container/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined">qr_code_2</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-secondary-container">
                      {status?.certificate ? t("digitalCertificate") : t("certificateLocked")}
                    </h4>
                    <p className="mt-1 text-xs text-on-secondary-container/80">
                      {status?.certificate
                        ? t("qrReady")
                        : t("qrLockedDesc", { count: totalChecks || t("departmentalClearance") })}
                    </p>
                  </div>
                </div>
                <div className="relative flex aspect-square w-full max-w-[200px] items-center justify-center overflow-hidden rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm">
                  {status?.certificate ? (
                    <img alt="Clearance QR" className="h-full w-full object-contain p-2" src={`data:image/png;base64,${status.certificate.base64Qr}`} />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[100px] text-outline/20">qr_code_2</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/5 backdrop-blur-[2px]">
                        <span className="material-symbols-outlined text-4xl text-primary">lock</span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!status?.certificate}
                  onClick={() => {
                    if (status?.certificate?.base64Qr && status.request.requestNumber) {
                      downloadCertificateQr(status.certificate.base64Qr, status.request.requestNumber);
                    }
                  }}
                  className="w-full max-w-[200px] rounded-lg border border-outline-variant bg-white py-2 text-xs font-bold text-on-surface shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("downloadCertificate")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (campusSlug && selectedRequestId) navigate(`/campus/${campusSlug}/student/certificate/${selectedRequestId}`);
                  }}
                  disabled={!selectedRequestId}
                  className="w-full max-w-[200px] rounded-lg border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary shadow-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/20 transition-colors"
                >
                  {t("viewFullCertificate")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showCreatePanel && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreatePanel(false)} />
          <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-container px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-on-primary">{t("newClearanceRequest")}</h3>
                  <p className="text-xs text-primary-fixed/80 mt-0.5">{t("allDeptNotified")}</p>
                </div>
                <button type="button" onClick={() => setShowCreatePanel(false)} className="rounded-full p-2 bg-white/10 hover:bg-white/20 transition-colors" aria-label={t("cancel")}>
                  <span className="material-symbols-outlined text-on-primary">close</span>
                </button>
              </div>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">{t("requestType")}</label>
                <select aria-label={t("requestType")} className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium focus:ring-2 focus:ring-primary" value={form.requestType} onChange={(e) => setForm((c) => ({ ...c, requestType: e.target.value as typeof form.requestType }))}>
                  <option value="FINAL">{t("finalClearanceEmoji")}</option>
                  <option value="SEMESTER">{t("semesterClearanceEmoji")}</option>
                  <option value="WITHDRAWAL">{t("withdrawalEmoji")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">{t("semester")}</label>
                  <select aria-label={t("semester")} className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium" value={form.semester} onChange={(e) => setForm((c) => ({ ...c, semester: e.target.value }))}>
                    <option>{t("semester1")}</option>
                    <option>{t("semester2")}</option>
                    <option>{t("summer")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">{t("academicYear")}</label>
                  <input className="w-full rounded-xl border-none bg-surface-container-high p-3 text-sm font-medium" value={form.academicYearLabel} onChange={(e) => setForm((c) => ({ ...c, academicYearLabel: e.target.value }))} required placeholder="e.g. 2024/2025" />
                </div>
              </div>
              <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  <span className="material-symbols-outlined text-base text-primary">groups</span>
                  {t("officesWillReview")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CHECK_META).map(([code, meta]) => (
                    <div key={code} className="flex items-center gap-2 rounded-lg bg-white p-2.5 text-[11px] font-semibold text-on-surface-variant shadow-sm border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[14px] text-primary shrink-0">{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreatePanel(false)} className="flex-1 rounded-xl border-2 border-outline-variant py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">{t("cancel")}</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {submitting ? t("creating") : t("submitRequest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
