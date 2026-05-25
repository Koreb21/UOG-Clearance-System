import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { SessionControls } from "../components/SessionControls";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";

interface StudentOverview {
  request_id: string;
  request_number: string;
  student: {
    studentId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    program?: string;
  };
  status: string;
  submitted_at: string;
  progress_percentage: number;
  checks: Array<{ id: string; checkCode: string; status: string }>;
  has_certificate: boolean;
}

type GroupBy = "day" | "week" | "month";

function formatDate(val?: string | null) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ET", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateFull(val?: string | null) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ET", { year: "numeric", month: "long", day: "numeric" });
}

function groupKey(date: Date, groupBy: GroupBy): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (groupBy === "day") {
    return date.toISOString().slice(0, 10);
  }
  if (groupBy === "month") {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  const startOfYear = new Date(y, 0, 1);
  const week = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

function groupLabel(key: string, groupBy: GroupBy): string {
  if (groupBy === "day") {
    return formatDate(key);
  }
  if (groupBy === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-ET", { year: "numeric", month: "long" });
  }
  return key.replace("-", " ");
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function RegistrarAnalyticsPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);
  const printRef = useRef<HTMLDivElement>(null);

  const [allStudents, setAllStudents] = useState<StudentOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("month");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    api.listAllStudentClearances(token)
      .then(setAllStudents)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const certifiedStudents = useMemo(
    () => allStudents.filter((s) => s.has_certificate),
    [allStudents]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return certifiedStudents;
    return certifiedStudents.filter(
      (s) =>
        s.student.firstName.toLowerCase().includes(q) ||
        s.student.lastName.toLowerCase().includes(q) ||
        s.student.studentId.toLowerCase().includes(q) ||
        (s.student.program ?? "").toLowerCase().includes(q)
    );
  }, [certifiedStudents, searchQuery]);

  const groupedData = useMemo(() => {
    const map = new Map<string, number>();
    certifiedStudents.forEach((s) => {
      const date = new Date(s.submitted_at);
      const key = groupKey(date, groupBy);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
  }, [certifiedStudents, groupBy]);

  const maxGroupCount = useMemo(
    () => Math.max(...groupedData.map(([, c]) => c), 1),
    [groupedData]
  );

  const todayKey = groupKey(new Date(), groupBy);
  const todayCount = useMemo(
    () => groupedData.find(([k]) => k === todayKey)?.[1] ?? 0,
    [groupedData, todayKey]
  );

  function exportCsv() {
    const header = ["Student ID", "First Name", "Last Name", "Program", "Request Number", "Departments Cleared", "QR Issued (approx.)", "Status"];
    const rows = certifiedStudents.map((s) => [
      s.student.studentId,
      s.student.firstName,
      s.student.lastName,
      s.student.program ?? "",
      s.request_number,
      `${s.checks.filter((c) => c.status === "CLEARED").length}/${s.checks.length}`,
      formatDate(s.submitted_at),
      "QR Issued"
    ]);
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uog-clearance-qr-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const campusName = campus?.name ?? "University of Gondar";
    const generatedOn = new Date().toLocaleDateString("en-ET", { year: "numeric", month: "long", day: "numeric" });
    const rows = certifiedStudents.map((s) => `
      <tr>
        <td>${s.student.studentId}</td>
        <td>${s.student.firstName} ${s.student.lastName}</td>
        <td>${s.student.program ?? "—"}</td>
        <td>${s.request_number}</td>
        <td>${s.checks.filter((c) => c.status === "CLEARED").length}/${s.checks.length}</td>
        <td>${formatDateFull(s.submitted_at)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>UGClear QR Export – ${campusName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #191c1e; font-size: 13px; }
    h1 { color: #001e40; font-size: 22px; margin-bottom: 2px; }
    .meta { color: #43474f; font-size: 11px; margin-bottom: 24px; }
    .summary { display: flex; gap: 24px; margin-bottom: 28px; }
    .summary-card { border: 1px solid #c3c6d1; border-radius: 8px; padding: 12px 20px; background: #f2f4f7; min-width: 120px; }
    .summary-card .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #43474f; }
    .summary-card .value { font-size: 26px; font-weight: 900; color: #001e40; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead { background: #001e40; color: white; }
    th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    td { padding: 8px 12px; border-bottom: 1px solid #e6e8eb; font-size: 12px; }
    tr:nth-child(even) td { background: #f8f9fa; }
    .footer { margin-top: 32px; font-size: 10px; color: #9e9e9e; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Clearance QR Certificate Export</h1>
  <p class="meta">${campusName} &nbsp;|&nbsp; Generated on ${generatedOn}</p>
  <div class="summary">
    <div class="summary-card">
      <div class="label">Total QR Issued</div>
      <div class="value">${certifiedStudents.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Students</div>
      <div class="value">${allStudents.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Student ID</th><th>Full Name</th><th>Program</th><th>Request No.</th><th>Depts Cleared</th><th>QR Issued (approx.)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">University of Gondar Clearance System &nbsp;&bull;&nbsp; Confidential &nbsp;&bull;&nbsp; ${generatedOn}</p>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 600);
  }

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif] text-[#191c1e]">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton className="text-[#43474f] hover:bg-[#e6e8eb]" />
          <div className="w-px h-6 bg-[#c3c6d1]/50" />
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#2d6a4f] text-white">
            <span className="material-symbols-outlined text-lg">bar_chart</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#001e40]">Analytics & Exports</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#43474f] opacity-60">{campus?.name ?? "University of Gondar"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || certifiedStudents.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-[#c3c6d1] bg-white px-3 py-2 text-xs font-bold text-[#43474f] shadow-sm hover:bg-[#f2f4f7] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={loading || certifiedStudents.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#001e40] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#003366] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            Export PDF
          </button>
          <SessionControls density="compact" />
        </div>
      </header>

      <main className="pt-24 p-6 max-w-7xl mx-auto" ref={printRef}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#43474f] mb-2">Total QR Codes Issued</p>
            {loading ? <Skeleton className="h-10 w-20 mt-1" /> : (
              <h3 className="text-4xl font-black text-[#2d6a4f]">{certifiedStudents.length}</h3>
            )}
            <p className="text-[10px] mt-2 text-[#43474f] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">verified</span>
              Fully cleared all 5 departments
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#43474f] mb-2">Total Students on Record</p>
            {loading ? <Skeleton className="h-10 w-20 mt-1" /> : (
              <h3 className="text-4xl font-black text-[#001e40]">{allStudents.length}</h3>
            )}
            <p className="text-[10px] mt-2 text-[#43474f] font-bold">
              {allStudents.length > 0 ? `${Math.round((certifiedStudents.length / allStudents.length) * 100)}% completion rate` : "No data yet"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#43474f] mb-2">
              {groupBy === "day" ? "Today" : groupBy === "week" ? "This Week" : "This Month"}
            </p>
            {loading ? <Skeleton className="h-10 w-20 mt-1" /> : (
              <h3 className="text-4xl font-black text-[#7b5800]">{todayCount}</h3>
            )}
            <p className="text-[10px] mt-2 text-[#43474f] font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">qr_code_2</span>
              QR certificates issued
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#c3c6d1]/20 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#001e40]">QR Codes Generated Over Time</h2>
              <p className="text-[10px] text-[#43474f] mt-0.5">Grouped by {groupBy} based on clearance submission date</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-[#f2f4f7] p-1">
              {(["day", "week", "month"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize ${groupBy === g ? "bg-white shadow text-[#001e40]" : "text-[#43474f] hover:text-[#001e40]"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-end gap-3 h-40">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className={`flex-1 rounded-t-lg`} style={{ height: `${40 + Math.random() * 80}px` } as React.CSSProperties} />
                ))}
              </div>
            ) : groupedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#43474f]">
                <span className="material-symbols-outlined text-5xl opacity-20 mb-2">bar_chart</span>
                <p className="text-sm font-medium">No QR certificate data available yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-2 min-w-max" style={{ minHeight: "160px" }}>
                  {groupedData.map(([key, count]) => {
                    const heightPct = (count / maxGroupCount) * 140;
                    const isCurrentPeriod = key === todayKey;
                    return (
                      <div key={key} className="flex flex-col items-center gap-1 group" style={{ minWidth: "52px" }}>
                        <span className="text-[10px] font-black text-[#001e40] opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 cursor-default ${isCurrentPeriod ? "bg-[#2d6a4f]" : "bg-[#d5e3ff] group-hover:bg-[#003366]"}`}
                          style={{ height: `${Math.max(heightPct, 8)}px` }}
                          title={`${groupLabel(key, groupBy)}: ${count} QR code${count !== 1 ? "s" : ""}`}
                        />
                        <span className="text-[9px] text-[#43474f] text-center whitespace-nowrap max-w-[60px] truncate">
                          {groupLabel(key, groupBy)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#c3c6d1]/20 flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#001e40]">Students with Final QR Certificate</h2>
              <p className="text-[10px] text-[#43474f] mt-0.5">
                {filteredStudents.length} of {certifiedStudents.length} shown
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#43474f] text-[18px] pointer-events-none">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, ID or program…"
                  className="rounded-lg border border-[#c3c6d1] bg-[#f2f4f7] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366] w-56"
                />
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={loading || certifiedStudents.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-[#c3c6d1] bg-white px-3 py-2 text-xs font-bold text-[#43474f] shadow-sm hover:bg-[#f2f4f7] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">table_view</span>
                CSV
              </button>
              <button
                type="button"
                onClick={exportPdf}
                disabled={loading || certifiedStudents.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[#001e40] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#003366] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f4f7]">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">#</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Student</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Student ID</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Program</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Request No.</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Depts Cleared</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">QR Issued</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-[#43474f]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8eb]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-[#43474f]">
                      {certifiedStudents.length === 0 ? "No students have received a final QR certificate yet." : "No results match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const clearedCount = s.checks.filter((c) => c.status === "CLEARED").length;
                    return (
                      <tr key={s.request_id} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="px-4 py-3 text-[10px] font-bold text-[#43474f]">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f] text-[10px] font-black text-white">
                              {s.student.firstName[0]}{s.student.lastName[0]}
                            </div>
                            <p className="font-bold text-[#001e40]">{s.student.firstName} {s.student.lastName}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#43474f]">{s.student.studentId}</td>
                        <td className="px-4 py-3 text-xs text-[#43474f]">{s.student.program ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#001e40] font-bold">{s.request_number}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-[#e6e8eb] h-1.5 rounded-full">
                              <div className="h-full rounded-full bg-[#2d6a4f]" style={{ width: `${clearedCount / Math.max(s.checks.length, 1) * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-[#2d6a4f]">{clearedCount}/{s.checks.length}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#43474f]">{formatDate(s.submitted_at)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            QR Issued
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && certifiedStudents.length > 0 && (
            <div className="px-6 py-4 border-t border-[#c3c6d1]/20 flex items-center justify-between">
              <p className="text-[10px] text-[#43474f]">
                Showing <strong>{filteredStudents.length}</strong> certified student{filteredStudents.length !== 1 ? "s" : ""}
                {searchQuery ? ` matching "${searchQuery}"` : ""}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="flex items-center gap-1.5 rounded-lg border border-[#c3c6d1] bg-white px-4 py-2 text-xs font-bold text-[#43474f] shadow-sm hover:bg-[#f2f4f7] transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="flex items-center gap-1.5 rounded-lg bg-[#001e40] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#003366] transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
