import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { api } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import { getCampusByCode, getCampusBySlug } from "../modules/campus/catalog";
import type { StaffQueueItem } from "../types";

export function FinanceDashboardPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const campus = getCampusBySlug(campusSlug) ?? getCampusByCode(user?.campusId ?? null);

  const [flaggedItems, setFlaggedItems] = useState<StaffQueueItem[]>([]);
  const [loadingFlagged, setLoadingFlagged] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoadingFlagged(true);
    api.getFlaggedStudents(token, campus?.code)
      .then(setFlaggedItems)
      .catch(() => undefined)
      .finally(() => setLoadingFlagged(false));
  }, [token, campus?.code]);

  function go(path: string) { navigate(`/campus/${campusSlug}/finance/${path}`); }

  const navCards = [
    {
      path: "queue",
      icon: "verified_user",
      label: "Payment Queue",
      desc: "Verify Chapa payments and record manual bank slip / cash payments",
      badge: null,
      color: "from-[#001e40] to-[#003366]",
    },
    {
      path: "manual-payment",
      icon: "payments",
      label: "Manual Payment",
      desc: "Record standalone cash / bank payments and generate official receipts",
      badge: null,
      color: "from-green-700 to-green-500",
    },
    {
      path: "liabilities",
      icon: "receipt_long",
      label: "Liability Ledger",
      desc: "View campus liabilities and add financial obligations to student records",
      badge: null,
      color: "from-secondary to-secondary-container",
    },
    {
      path: "inquiries",
      icon: "forum",
      label: "Student Inquiries",
      desc: "Read and reply to inquiries submitted by students",
      badge: null,
      color: "from-[#4a5568] to-[#2d3748]",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div className="w-px h-6 bg-outline-variant/40" />
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-fixed text-primary">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">{campus?.name ?? "Campus"} — Finance Office</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Financial reconciliation workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm font-semibold text-on-surface-variant sm:block">{user?.username}</p>
            <SessionControls density="compact" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
        <section className="mb-8">
          <div
            className="relative min-h-[180px] overflow-hidden rounded-xl px-6 py-8 text-white md:px-10"
            style={{ background: "linear-gradient(135deg, #001e40 0%, #003366 100%)" }}
          >
            <div className="relative z-10 max-w-2xl">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-secondary-fixed">Administrative terminal</span>
              <h2 className="mb-3 text-3xl font-black tracking-tight md:text-4xl">Finance reconciliation workspace</h2>
              <p className="mb-5 text-sm text-primary-fixed-dim">
                Queues and liabilities scoped to <strong>{campus?.name ?? "your assigned campus"}</strong>.
                Verify payments, manage liabilities, and respond to student inquiries.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => go("queue")} className="flex items-center gap-2 rounded-lg bg-secondary-container px-5 py-2.5 font-bold text-on-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  Payment Queue
                </button>
                <button type="button" onClick={() => go("liabilities")} className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 font-bold text-white backdrop-blur-sm">
                  Liability Ledger
                </button>
                <button type="button" onClick={() => go("inquiries")} className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 font-bold text-white backdrop-blur-sm">
                  Inquiries
                </button>
                <button type="button" onClick={() => navigate(`/campus/${campusSlug}/messages`)} className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 font-bold text-white backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  Messages
                </button>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-secondary-container/10 blur-3xl" />
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Students Flagged by Staff</h2>
              <p className="text-sm text-on-surface-variant">
                Students with liabilities awaiting finance action on {campus?.name ?? "this campus"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-container text-error">
              <span className="material-symbols-outlined text-[20px]">flag</span>
            </div>
          </div>

          {loadingFlagged ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">Loading flagged students…</div>
          ) : flaggedItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-on-surface-variant">
              No students currently flagged by staff for finance action.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-outline-variant/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Student ID</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Name</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Request #</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Flagged By</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {flaggedItems.map((item) => (
                      <tr key={item.checkId} className="hover:bg-primary-fixed/10">
                        <td className="px-4 py-3 font-mono text-xs">{item.studentId}</td>
                        <td className="px-4 py-3 font-semibold">{item.studentName}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{item.requestNumber}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{item.checkCode}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.checkStatus === "AWAITING_FINANCE"
                              ? "bg-error-container text-error"
                              : item.checkStatus === "PAID_PENDING_DEPARTMENT_APPROVAL"
                              ? "bg-green-100 text-green-800"
                              : "bg-secondary-container text-on-secondary-container"
                          }`}>
                            {item.checkStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/campus/${campusSlug}/finance/queue`, { state: { selectedRequestId: item.clearanceRequestId } })}
                            className="text-xs font-bold text-primary underline"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {navCards.map((card) => (
            <button
              key={card.path}
              type="button"
              onClick={() => go(card.path)}
              className="group flex items-start gap-4 rounded-2xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-outline-variant/20 transition-all hover:ring-primary/20 hover:shadow-md text-left"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
                <span className="material-symbols-outlined text-[22px]">{card.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-base font-black text-on-surface">{card.label}</h3>
                  {card.badge && (
                    <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-on-error">{card.badge}</span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant">{card.desc}</p>
              </div>
              <span className="material-symbols-outlined text-outline/50 group-hover:text-primary transition-colors mt-0.5">chevron_right</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-outline-variant/20 bg-surface-container-lowest/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl justify-center gap-1 px-2 pb-3 pt-2">
          {[
            { label: "Dashboard", icon: "dashboard", action: () => undefined },
            { label: "Queue", icon: "groups", action: () => go("queue") },
            { label: "Manual", icon: "payments", action: () => go("manual-payment") },
            { label: "Liabilities", icon: "receipt_long", action: () => go("liabilities") },
            { label: "Inquiries", icon: "forum", action: () => go("inquiries") },
          ].map((item) => (
            <button key={item.label} type="button" onClick={item.action} className="flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-on-surface-variant transition-colors hover:text-primary">
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
