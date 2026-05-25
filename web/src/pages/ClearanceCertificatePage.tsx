import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { api, toApiUrl } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceStatus } from "../types";

function downloadQr(base64: string, requestNumber: string) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${base64}`;
  link.download = `uog-clearance-qr-${requestNumber}.png`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadAsPdf() {
  window.print();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ET", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

const CHECK_LABELS: Record<string, string> = {
  LIBRARY: "Library",
  PROCTOR: "Proctor / Dormitory",
  CAFE: "Cafe / Food Services",
  DEPARTMENT_HEAD: "Department Head",
  STUDENT_DEAN: "Dean of Students",
  FINANCE: "Finance Office",
  REGISTRAR: "Registrar"
};

function checkLabel(code: string) {
  return CHECK_LABELS[code] ?? code.replace(/_/g, " ");
}

export function ClearanceCertificatePage() {
  const { token, user } = useAuth();
  const { campusSlug, requestId } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug);

  const [status, setStatus] = useState<ClearanceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !requestId) return;
    setLoading(true);
    try {
      const result = await api.getStudentStatus(token, requestId);
      setStatus(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load clearance status");
    } finally {
      setLoading(false);
    }
  }, [token, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const allCleared = status?.checks.every((c) => c.status === "CLEARED") ?? false;
  const cert = status?.certificate ?? null;
  const student = status?.student ?? null;
  const request = status?.request ?? null;
  const displayName = student ? `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}` : user?.username ?? "Student";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          <p className="text-sm font-medium">Loading your certificate…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e8f5e9] font-['Inter',sans-serif] antialiased print:bg-white">
      {/* Header — hidden on print */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant/20 bg-white/80 px-4 backdrop-blur-xl shadow-sm print:hidden sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-primary-fixed/20 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back
          </button>
          <div className="h-5 w-px bg-outline-variant/40" />
          <span className="text-sm font-bold text-primary">Clearance Certificate</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadAsPdf}
            className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
            title="Opens browser print dialog — choose 'Save as PDF' to download"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            Save as PDF
          </button>
          {cert?.base64Qr && request?.requestNumber && (
            <button
              type="button"
              onClick={() => downloadQr(cert.base64Qr, request.requestNumber)}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Download QR
            </button>
          )}
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        {error && (
          <div className="mb-6 rounded-xl border border-error/30 bg-error-container/40 px-5 py-4 text-sm text-on-error-container">
            {error}
          </div>
        )}

        {/* Certificate Card */}
        <div
          id="clearance-certificate"
          className="relative overflow-hidden rounded-2xl bg-white shadow-2xl print:shadow-none print:rounded-none"
        >
          {/* Decorative header band */}
          <div className="relative bg-gradient-to-r from-[#001e40] to-[#003a70] px-8 py-8 text-white print:px-6 print:py-6">
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 size-36 rounded-full bg-secondary-container/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-secondary-container">verified</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed/70">
                    UGClear · University of Gondar
                  </p>
                  <p className="text-sm font-bold text-primary-fixed">{campus?.name ?? "Campus"} · Clearance System</p>
                </div>
              </div>
              <h1 className="mb-1 text-2xl font-black tracking-tight sm:text-3xl">
                {allCleared && cert ? "✓ Official Clearance Certificate" : "Clearance Status Report"}
              </h1>
              <p className="text-sm text-primary-fixed/70">
                {allCleared && cert
                  ? "This certificate confirms the student has successfully completed all departmental clearance requirements."
                  : "Clearance is not yet fully completed. All departments must approve."}
              </p>
            </div>
          </div>

          {/* Certificate body */}
          <div className="grid grid-cols-1 gap-8 p-8 print:p-6 md:grid-cols-2">
            {/* Left — Student info + checks */}
            <div className="space-y-6">
              {/* Student identity */}
              <div className="flex items-center gap-4">
                {student?.hasProfileImage && student.profileImageUrl ? (
                  <img
                    alt="Student"
                    src={toApiUrl(student.profileImageUrl) ?? undefined}
                    className="h-20 w-20 rounded-xl object-cover ring-4 ring-primary-fixed shadow"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary-fixed text-2xl font-black text-on-primary-fixed-variant ring-4 ring-primary-fixed/30">
                    {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black text-on-surface">{displayName}</h2>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    ID: {student?.studentId ?? "—"}
                  </p>
                  {student?.program && (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {student.program}{student.academicYear ? ` · Year ${student.academicYear}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* Request details */}
              <div className="rounded-xl bg-surface-container-low p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">Request Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-on-surface-variant">Request No.</p>
                    <p className="font-bold text-on-surface">{request?.requestNumber ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant">Type</p>
                    <p className="font-bold text-on-surface">{request?.requestType?.replace(/_/g, " ") ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant">Academic Year</p>
                    <p className="font-bold text-on-surface">{request?.academicYearLabel ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant">Semester</p>
                    <p className="font-bold text-on-surface">{request?.semester ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant">Submitted</p>
                    <p className="font-bold text-on-surface">{formatDate(request?.submittedAt)}</p>
                  </div>
                  {cert && (
                    <div>
                      <p className="text-on-surface-variant">Issued</p>
                      <p className="font-bold text-on-surface">{formatDate(cert.generatedAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Departmental checks */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-outline">Departmental Approval</p>
                <div className="space-y-2">
                  {status?.checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`material-symbols-outlined text-lg ${check.status === "CLEARED" ? "text-primary" : "text-outline"}`}
                          style={check.status === "CLEARED" ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {check.status === "CLEARED" ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span className="text-sm font-medium text-on-surface">{checkLabel(check.checkCode)}</span>
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        check.status === "CLEARED"
                          ? "bg-primary-fixed text-on-primary-fixed-variant"
                          : check.status === "FLAGGED" || check.status === "FAILED"
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — QR + status */}
            <div className="flex flex-col items-center gap-6">
              {/* QR or lock */}
              <div className="flex flex-col items-center gap-4 w-full">
                <div className={`relative flex aspect-square w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl border-2 p-4 shadow-md ${
                  cert ? "border-primary/30 bg-white" : "border-outline-variant/30 bg-surface-container-low"
                }`}>
                  {cert?.base64Qr ? (
                    <img
                      alt="Clearance QR Code"
                      src={`data:image/png;base64,${cert.base64Qr}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="material-symbols-outlined text-7xl text-outline/30">qr_code_2</span>
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">lock</span>
                        <p className="text-xs font-bold text-on-surface-variant px-6 text-center">
                          QR unlocks after all departments clear and Registrar issues the certificate
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {cert && (
                  <div className="w-full max-w-[280px] rounded-xl bg-primary-fixed/20 px-4 py-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary-fixed-variant/70 mb-1">Certificate Hash</p>
                    <p className="font-mono text-[10px] text-on-primary-fixed-variant break-all">{cert.hash.slice(0, 32)}…</p>
                  </div>
                )}
              </div>

              {/* Clearance status banner */}
              <div className={`w-full rounded-2xl p-5 text-center ${
                allCleared && cert
                  ? "bg-gradient-to-br from-primary to-primary-container text-on-primary"
                  : allCleared
                  ? "bg-secondary-container/40 text-on-secondary-container"
                  : "bg-surface-container text-on-surface-variant"
              }`}>
                <span className={`material-symbols-outlined text-4xl mb-2 block ${
                  allCleared && cert ? "text-on-primary" : allCleared ? "text-secondary" : "text-outline"
                }`} style={allCleared ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {allCleared && cert ? "verified" : allCleared ? "task_alt" : "pending"}
                </span>
                <p className="text-base font-black mb-1">
                  {allCleared && cert
                    ? "Fully Cleared"
                    : allCleared
                    ? "Awaiting Registrar Certification"
                    : "Clearance In Progress"}
                </p>
                <p className="text-xs opacity-80">
                  {allCleared && cert
                    ? "This QR code can be scanned to verify your clearance at any point."
                    : allCleared
                    ? "All departments approved. The Registrar will issue your certificate shortly."
                    : `${status?.checks.filter((c) => c.status === "CLEARED").length ?? 0} of ${status?.checks.length ?? 0} departments cleared.`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-col gap-2 print:hidden">
                {cert?.base64Qr && request?.requestNumber && (
                  <button
                    type="button"
                    onClick={() => downloadQr(cert.base64Qr, request.requestNumber)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download QR Certificate
                  </button>
                )}
                <button
                  type="button"
                  onClick={downloadAsPdf}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 py-3 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
                  title="Opens browser print dialog — choose 'Save as PDF'"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  Download as PDF
                </button>
              </div>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="border-t border-outline-variant/20 bg-surface-container-low px-8 py-4 print:px-6 print:bg-white">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] text-on-surface-variant">
                © {new Date().getFullYear()} UGClear · University of Gondar Clearance Management System
              </p>
              {cert && (
                <p className="text-[10px] font-mono text-on-surface-variant">
                  Cert ID: {cert.id.slice(0, 16)} · Issued: {cert.generatedAt.slice(0, 10)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Not cleared message */}
        {!allCleared && (
          <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary-container/10 p-5 text-center print:hidden">
            <span className="material-symbols-outlined text-3xl text-secondary mb-2 block">info</span>
            <p className="text-sm font-bold text-on-secondary-container mb-1">Clearance Not Yet Complete</p>
            <p className="text-xs text-on-secondary-container/80">
              You need all departments to mark your check as <strong>CLEARED</strong> before the Registrar can issue your official certificate.
              Check your inquiry center to follow up with pending offices.
            </p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-4 rounded-lg bg-secondary px-5 py-2 text-sm font-bold text-on-secondary hover:bg-secondary/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </main>

      <style>{`
        @media print {
          header, nav, footer, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          #clearance-certificate { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
