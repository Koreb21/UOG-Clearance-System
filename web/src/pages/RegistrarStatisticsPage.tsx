import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { SessionControls } from "../components/SessionControls";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";

interface Statistics {
  total_requests: number;
  cleared_requests: number;
  clearance_percentage: number;
  most_common_bottleneck: string;
  bottleneck_count: number;
  pending_count: number;
  in_review_count: number;
  flagged_count: number;
}

interface StudentOverview {
  request_id: string;
  request_number: string;
  student: { studentId: string; firstName: string; lastName: string; program?: string };
  status: string;
  submitted_at: string;
  progress_percentage: number;
  checks: Array<{ id: string; checkCode: string; status: string }>;
  has_certificate: boolean;
}

const BOTTLENECK_LABELS: Record<string, string> = {
  LIBRARY: "Library", PROCTOR: "Proctor", CAFE: "Cafeteria", DEPARTMENT_HEAD: "Dept. Head", STUDENT_DEAN: "Dean of Students",
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

function formatDate(val?: string | null) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ET", { year: "numeric", month: "short", day: "numeric" });
}

export function RegistrarStatisticsPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [studentOverviews, setStudentOverviews] = useState<StudentOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.getRegistrarStatistics(token).then(setStatistics).catch(() => undefined),
      api.listAllStudentClearances(token).then(setStudentOverviews).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif] text-[#191c1e]">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton className="text-[#43474f] hover:bg-[#e6e8eb]" />
          <div className="w-px h-6 bg-[#c3c6d1]/50" />
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#003366] text-white">
            <span className="material-symbols-outlined text-lg">analytics</span>
          </div>
          <div>
            <h1 className="text-base font-black text-[#001e40]">Clearance Statistics</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#43474f] opacity-60">{campus?.name ?? "University of Gondar"}</p>
          </div>
        </div>
        <SessionControls density="compact" />
      </header>

      <main className="pt-24 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Total Requests</p>
            {loading ? <Skeleton className="h-10 w-20 mt-1" /> : <h3 className="text-4xl font-black text-[#001e40]">{statistics?.total_requests ?? 0}</h3>}
            <p className="text-[10px] mt-2 text-green-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">trending_up</span>This semester</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Cleared Requests</p>
            {loading ? <Skeleton className="h-10 w-24 mt-1" /> : (
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-[#001e40]">{statistics?.cleared_requests ?? 0}</h3>
                <span className="text-lg font-bold text-[#7b5800]">{statistics ? Math.round(statistics.clearance_percentage) : 0}%</span>
              </div>
            )}
            <div className="w-full bg-[#e6e8eb] h-1.5 rounded-full mt-3">
              <div className="bg-[#7b5800] h-full rounded-full" style={{ width: `${statistics?.clearance_percentage ?? 0}%` }} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Main Bottleneck</p>
            {loading ? <Skeleton className="h-8 w-32 mt-1" /> : (
              <h3 className="text-2xl font-black text-[#001e40] truncate">{BOTTLENECK_LABELS[statistics?.most_common_bottleneck ?? ""] ?? statistics?.most_common_bottleneck ?? "—"}</h3>
            )}
            {statistics && (
              <span className="mt-2 inline-block text-[10px] font-bold text-[#93000a] bg-[#ffdad6] px-2 py-0.5 rounded-full">{statistics.bottleneck_count} blocked</span>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm grid grid-cols-3 divide-x divide-[#c3c6d1]/30">
            <div className="flex flex-col items-center justify-center px-2">
              <p className="text-[10px] font-bold uppercase text-[#43474f]">Pending</p>
              {loading ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#001e40]">{statistics?.pending_count ?? 0}</p>}
            </div>
            <div className="flex flex-col items-center justify-center px-2">
              <p className="text-[10px] font-bold uppercase text-[#43474f]">Review</p>
              {loading ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#001e40]">{statistics?.in_review_count ?? 0}</p>}
            </div>
            <div className="flex flex-col items-center justify-center px-2">
              <p className="text-[10px] font-bold uppercase text-[#43474f]">Flagged</p>
              {loading ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#ba1a1a]">{statistics?.flagged_count ?? 0}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#c3c6d1]/20">
            <h2 className="text-lg font-bold text-[#001e40]">All Student Clearances</h2>
            <p className="text-xs text-[#43474f] mt-1">{studentOverviews.length} total students</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f4f7]">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Student</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Request</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Progress</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Submitted</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-[#43474f]">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8eb]">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                  ))
                ) : studentOverviews.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#43474f]">No student records found.</td></tr>
                ) : (
                  studentOverviews.map((overview) => (
                    <tr key={overview.request_id} className="hover:bg-[#f2f4f7]">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#001e40]">{overview.student.firstName} {overview.student.lastName}</p>
                        <p className="text-[10px] text-[#43474f] font-mono">{overview.student.studentId}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{overview.request_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#e6e8eb] h-1.5 rounded-full">
                            <div className="h-full rounded-full bg-[#7b5800]" style={{ width: `${overview.progress_percentage}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-[#43474f]">{overview.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${overview.status === "CLEARED" ? "bg-green-100 text-green-800" : overview.status === "IN_REVIEW" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                          {overview.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#43474f]">{formatDate(overview.submitted_at)}</td>
                      <td className="px-4 py-3">
                        {overview.has_certificate ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700"><span className="material-symbols-outlined text-sm">verified</span>Issued</span>
                        ) : (
                          <span className="text-xs text-[#43474f]">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
