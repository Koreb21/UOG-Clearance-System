import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
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

const BOTTLENECK_LABELS: Record<string, string> = {
  LIBRARY: "Library", PROCTOR: "Proctor", CAFE: "Cafeteria", DEPARTMENT_HEAD: "Dept. Head", STUDENT_DEAN: "Dean of Students",
};

function initials(name: string) { return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(); }

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} aria-hidden="true" />;
}

export function RegistrarDashboardPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoadingStats(true);
    api.getRegistrarStatistics(token)
      .then(setStatistics)
      .catch(() => undefined)
      .finally(() => setLoadingStats(false));
  }, [token]);

  function go(path: string) { navigate(`/campus/${campusSlug}/registrar/${path}`); }

  function confirmLogout() {
    setShowLogoutConfirm(false);
    logout();
    void navigate("/login", { replace: true });
  }

  const navCards = [
    { path: "queue", icon: "group", label: "Student Queue", desc: "Review student clearance requests and generate QR certificates", color: "from-[#001e40] to-[#003366]", badge: statistics ? `${statistics.total_requests - statistics.cleared_requests} pending` : null },
    { path: "statistics", icon: "analytics", label: "Statistics", desc: "Clearance rates, bottlenecks, and campus-wide progress overview", color: "from-[#7b5800] to-[#4a3000]", badge: statistics ? `${Math.round(statistics.clearance_percentage)}% cleared` : null },
    { path: "analytics", icon: "bar_chart", label: "Analytics & Exports", desc: "QR generation history, time-based reports, export to PDF or CSV", color: "from-[#2d6a4f] to-[#1b4332]", badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#f2f4f7] font-['Inter',sans-serif] text-[#191c1e]">
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-white/70 backdrop-blur-xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)]">
        <div className="flex items-center gap-4">
          <BackButton className="text-[#43474f] hover:bg-[#e6e8eb]" />
          <div className="w-px h-6 bg-[#c3c6d1]/50" />
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#003366] text-white">
            <span className="material-symbols-outlined">shield_person</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#001e40] tracking-tight">Registrar Management</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#43474f] opacity-60">{campus?.name ?? "University of Gondar"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 border-l border-[#c3c6d1]/30">
            <div className="text-right">
              <p className="text-sm font-bold text-[#191c1e]">{user?.username ?? "Registrar"}</p>
              <p className="text-[10px] text-[#43474f]">{user?.role?.replace(/_/g, " ") ?? "REGISTRAR"}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white font-bold text-sm ring-2 ring-[#d5e3ff]">
              {initials(user?.username ?? "RG")}
            </div>
          </div>
          <button type="button" onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#c3c6d1] bg-white/95 px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#43474f] shadow-sm hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all">
            <span className="material-symbols-outlined text-[18px] leading-none">logout</span>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <aside className="h-screen w-72 flex flex-col fixed left-0 top-0 pt-24 bg-[#f2f4f7] z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
            <div className="w-10 h-10 bg-[#003366] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1f477b]">Gondar Registry</p>
              <p className="text-[10px] text-[#43474f] font-medium">Clearance System</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col px-4 gap-2">
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#43474f]/50">Core Functions</div>
          <button type="button" onClick={() => go("queue")} className="flex items-center gap-4 px-4 py-3 text-[#43474f] rounded-lg hover:bg-white hover:text-[#001e40] hover:shadow-sm transition-all text-left">
            <span className="material-symbols-outlined">group</span>
            <span className="text-sm font-semibold">Student Queue</span>
          </button>
          <button type="button" onClick={() => go("statistics")} className="flex items-center gap-4 px-4 py-3 text-[#43474f] rounded-lg hover:bg-white hover:text-[#001e40] hover:shadow-sm transition-all text-left">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-sm font-semibold">Statistics</span>
          </button>
          <button type="button" onClick={() => go("analytics")} className="flex items-center gap-4 px-4 py-3 text-[#43474f] rounded-lg hover:bg-white hover:text-[#001e40] hover:shadow-sm transition-all text-left">
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="text-sm font-semibold">Analytics & Exports</span>
          </button>
          <div className="px-4 py-2 mt-2 text-[10px] font-bold uppercase tracking-widest text-[#43474f]/50">Communication</div>
          <button type="button" onClick={() => navigate(`/campus/${campusSlug}/messages`)} className="flex items-center gap-4 px-4 py-3 text-[#43474f] rounded-lg hover:bg-white hover:text-[#001e40] hover:shadow-sm transition-all text-left">
            <span className="material-symbols-outlined">chat</span>
            <span className="text-sm font-semibold">Messages</span>
          </button>
        </nav>
        <div className="mt-auto p-6">
          <div className="p-4 bg-[#001e40] text-white rounded-xl">
            <p className="text-xs font-bold mb-1">Clearance Protocol</p>
            <p className="text-[10px] opacity-70 leading-relaxed">
              Ensure all department signatures are verified before issuing QR credentials.
            </p>
          </div>
        </div>
      </aside>

      <main className="ml-72 pt-20 p-8 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Total Requests</p>
            {loadingStats ? <Skeleton className="h-10 w-20 mt-1" /> : <h3 className="text-4xl font-black text-[#001e40]">{statistics?.total_requests ?? 0}</h3>}
            <p className="text-[10px] mt-2 text-green-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs">trending_up</span>This semester</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Cleared Requests</p>
            {loadingStats ? <Skeleton className="h-10 w-24 mt-1" /> : (
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-[#001e40]">{statistics?.cleared_requests ?? 0}</h3>
                <span className="text-lg font-bold text-[#7b5800]">{statistics ? Math.round(statistics.clearance_percentage) : 0}%</span>
              </div>
            )}
            <div className="w-full bg-[#e6e8eb] h-1.5 rounded-full mt-3">
              <div className="bg-[#7b5800] h-full rounded-full transition-all duration-700" style={{ width: `${statistics?.clearance_percentage ?? 0}%` }} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] hover:-translate-y-0.5 transition-transform">
            <p className="text-xs font-bold uppercase tracking-wider text-[#43474f] mb-2">Main Bottleneck</p>
            {loadingStats ? <Skeleton className="h-8 w-32 mt-1" /> : (
              <h3 className="text-2xl font-black text-[#001e40] truncate">{BOTTLENECK_LABELS[statistics?.most_common_bottleneck ?? ""] ?? statistics?.most_common_bottleneck ?? "—"}</h3>
            )}
            {statistics && <span className="mt-2 inline-block text-[10px] font-bold text-[#93000a] bg-[#ffdad6] px-2 py-0.5 rounded-full">{statistics.bottleneck_count} blocked</span>}
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] grid grid-cols-3 divide-x divide-[#c3c6d1]/30 hover:-translate-y-0.5 transition-transform">
            <div className="flex flex-col items-center justify-center px-2"><p className="text-[10px] font-bold uppercase text-[#43474f]">Pending</p>{loadingStats ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#001e40]">{statistics?.pending_count ?? 0}</p>}</div>
            <div className="flex flex-col items-center justify-center px-2"><p className="text-[10px] font-bold uppercase text-[#43474f]">Review</p>{loadingStats ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#001e40]">{statistics?.in_review_count ?? 0}</p>}</div>
            <div className="flex flex-col items-center justify-center px-2"><p className="text-[10px] font-bold uppercase text-[#43474f]">Flagged</p>{loadingStats ? <Skeleton className="h-8 w-10 mt-1" /> : <p className="text-2xl font-black text-[#ba1a1a]">{statistics?.flagged_count ?? 0}</p>}</div>
          </div>
        </div>

        <h2 className="text-lg font-black text-[#001e40] mb-5">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {navCards.map((card) => (
            <button key={card.path} type="button" onClick={() => go(card.path)}
              className="group flex items-start gap-5 rounded-2xl bg-white p-7 shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] ring-1 ring-[#c3c6d1]/20 transition-all hover:-translate-y-0.5 hover:ring-[#d5e3ff] text-left">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-lg font-black text-[#001e40]">{card.label}</h3>
                  {card.badge && <span className="rounded-full bg-[#d5e3ff] px-2.5 py-0.5 text-[10px] font-bold text-[#001b3c]">{card.badge}</span>}
                </div>
                <p className="text-sm text-[#43474f]">{card.desc}</p>
              </div>
              <span className="material-symbols-outlined text-[#c3c6d1] group-hover:text-[#001e40] transition-colors mt-1">chevron_right</span>
            </button>
          ))}
        </div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <span className="material-symbols-outlined text-red-600">logout</span>
              </div>
              <div>
                <h3 className="text-base font-black text-[#001e40]">Sign out?</h3>
                <p className="text-xs text-[#43474f]">You will need to sign in again to continue.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-xl border-2 border-[#c3c6d1] py-3 text-sm font-bold text-[#43474f] transition hover:bg-[#f2f4f7]">Stay signed in</button>
              <button type="button" onClick={confirmLogout} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700">Yes, logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
