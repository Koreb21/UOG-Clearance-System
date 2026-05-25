import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SessionControls } from "../components/SessionControls";
import { BackButton } from "../components/BackButton";
import { LanguageToggle } from "../components/LanguageToggle";
import { ThemeToggle } from "../components/ThemeToggle";
import { api, toApiUrl } from "../lib/api";
import { useAuth } from "../modules/auth/AuthContext";
import type { CampusCode } from "../modules/campus/catalog";
import { getCampusBySlug } from "../modules/campus/catalog";
import type { ClearanceRequest, ClearanceStatus } from "../types";

function initials(first?: string | null, last?: string | null, fallback?: string) {
  const a = first?.[0] ?? "";
  const b = last?.[0] ?? "";
  const pair = `${a}${b}`.toUpperCase();
  if (pair) return pair;
  return (fallback?.[0] ?? "S").toUpperCase();
}

function campusHeroGradient(code: CampusCode | undefined) {
  switch (code) {
    case "MARAKI": return "from-[#0d2834] to-[#1a4558]";
    case "FASIL": return "from-[#2a1a0d] to-[#4d3014]";
    default: return "from-primary to-primary-container";
  }
}

export function StudentDashboardPage() {
  const { token, user } = useAuth();
  const { campusSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCampus = getCampusBySlug(campusSlug);
  const campusCode = currentCampus?.code;
  const campusLabel = currentCampus?.name ?? t("campus");
  const heroGradient = campusHeroGradient(campusCode);

  const [requests, setRequests] = useState<ClearanceRequest[]>([]);
  const [status, setStatus] = useState<ClearanceStatus | null>(null);

  const loadRequests = useCallback(() => {
    if (!token) return;
    api.listStudentRequests(token)
      .then((items) => {
        setRequests(items);
        if (items[0]?.id) {
          api.getStudentStatus(token, items[0].id).then(setStatus).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [token]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const txRef = searchParams.get("tx_ref") ?? searchParams.get("trx_ref");
    if (paymentStatus || txRef) {
      setSearchParams(new URLSearchParams(), { replace: true });
      loadRequests();
    }
  }, []);

  const clearedChecks = status?.checks.filter((c) => c.status === "CLEARED").length ?? 0;
  const totalChecks = status?.checks.length ?? 0;
  const outstandingLiabilities = status?.liabilities.filter((item) => item.status !== "PAID" && item.status !== "CLEARED").length ?? 0;
  const requestProgress = totalChecks === 0 ? 0 : Math.round((clearedChecks / totalChecks) * 100);

  const displayName = status
    ? `${status.student.firstName} ${status.student.lastName}`.trim()
    : user?.username ?? t("students");
  const displayStudentId = status?.student.studentId ?? user?.studentId ?? "—";
  const programLine = status?.student.program
    ? `${status.student.program}${status.student.academicYear != null ? ` • ${t("year")} ${status.student.academicYear}` : ""}`
    : t("program");

  function go(path: string) { navigate(`/campus/${campusSlug}/student/${path}`); }

  const navCards = useMemo(() => [
    {
      path: "status",
      icon: "fact_check",
      label: t("clearanceStatusLabel"),
      desc: t("trackDepartmental"),
      color: "from-primary to-primary-container",
      badge: totalChecks ? t("clearedBadge", { cleared: clearedChecks, total: totalChecks }) : null
    },
    {
      path: "finance",
      icon: "account_balance_wallet",
      label: t("financePayments"),
      desc: t("viewLiabilities"),
      color: "from-secondary to-secondary-container",
      badge: outstandingLiabilities > 0
        ? (outstandingLiabilities === 1 ? t("outstandingLiability", { count: outstandingLiabilities }) : t("outstandingLiabilities", { count: outstandingLiabilities }))
        : t("allClear")
    },
    {
      path: "help",
      icon: "help_outline",
      label: t("inquiryCenter"),
      desc: t("sendMessages"),
      color: "from-[#4a5568] to-[#2d3748]",
      badge: null
    },
    {
      path: "settings",
      icon: "manage_accounts",
      label: t("profileSettingsLabel"),
      desc: t("updateYourProfile"),
      color: "from-[#2d6a4f] to-[#1b4332]",
      badge: null
    },
  ], [t, clearedChecks, totalChecks, outstandingLiabilities]);

  const bottomNavItems = useMemo(() => [
    { path: "", icon: "home", label: t("home") },
    { path: "status", icon: "fact_check", label: t("status") },
    { path: "finance", icon: "account_balance_wallet", label: t("finance") },
    { path: "help", icon: "help_outline", label: t("help") },
    { path: "settings", icon: "manage_accounts", label: t("settings") },
  ], [t]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-['Inter',sans-serif] antialiased pb-20 md:pb-12">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/20 bg-white/70 px-4 shadow-[0_12px_32px_-4px_rgba(0,30,64,0.08)] backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="h-5 w-px bg-outline-variant/40" />
          <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">{t("gondarClearanceSystem")}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <LanguageToggle />
          <div className="flex items-center gap-1 sm:gap-2">
            <SessionControls density="compact" />
          </div>
          <div className="flex items-center gap-2 border-l border-outline-variant/30 pl-3 sm:gap-3 sm:pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-none">{displayName}</p>
              <p className="text-xs text-on-surface-variant">{displayStudentId}</p>
            </div>
            {status?.student.hasProfileImage && status.student.profileImageUrl ? (
              <img alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary-fixed sm:h-10 sm:w-10" src={toApiUrl(status.student.profileImageUrl) ?? undefined} />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed-variant ring-2 ring-primary-fixed sm:h-10 sm:w-10">
                {initials(status?.student.firstName, status?.student.lastName, displayName)}
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col gap-2 overflow-y-auto bg-surface-container-low pb-8 pl-4 pr-4 pt-20 text-sm tracking-tight md:flex">
        <div className="mb-6 px-4">
          <h2 className="text-lg font-black text-primary">{t("studentPortal")}</h2>
          <p className="text-xs text-on-surface-variant">{t("ugclear")}</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-secondary">{campusLabel}</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button type="button" className="ml-2 flex w-full items-center gap-3 rounded-lg bg-white px-4 py-3 font-semibold text-primary-container shadow-sm">
            <span className="material-symbols-outlined">dashboard</span>{t("dashboard")}
          </button>
          {navCards.map((card) => (
            <button key={card.path} type="button" onClick={() => go(card.path)} className="ml-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-on-surface-variant transition-transform hover:translate-x-1 hover:bg-primary-fixed/10">
              <span className="material-symbols-outlined">{card.icon}</span>
              {card.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => go("status")}
          className="mx-2 mt-auto flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container py-3 px-4 font-bold text-on-primary shadow-lg shadow-primary/10"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {t("requestClearance")}
        </button>
      </aside>

      <main className="max-w-[1600px] px-4 pb-12 pt-6 sm:px-8 md:ml-64">
        <section className={`relative mb-8 overflow-hidden rounded-xl bg-gradient-to-r ${heroGradient} p-6 text-on-primary sm:p-8`}>
          <div className="relative z-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded bg-secondary-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container">{campusLabel}</span>
              <span className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] text-primary-fixed">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                {t("studentPortal")}
              </span>
            </div>
            <h1 className="mb-2 text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">
              {t("welcomeUser", { name: status?.student.firstName ?? user?.username ?? t("students") })}
            </h1>
            <p className="mb-1 text-sm text-primary-fixed/80">{programLine}</p>

            {status && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded bg-white/15 px-3 py-1.5 text-xs font-bold">
                  {totalChecks ? t("departmentsClearedCount", { cleared: clearedChecks, total: totalChecks }) : t("noActiveRequest")}
                </span>
                {outstandingLiabilities > 0 && (
                  <span className="rounded bg-error/80 px-3 py-1.5 text-xs font-bold text-white">
                    {outstandingLiabilities === 1
                      ? t("outstandingLiability", { count: outstandingLiabilities })
                      : t("outstandingLiabilities", { count: outstandingLiabilities })}
                  </span>
                )}
                {status.certificate && (
                  <span className="rounded bg-green-500/80 px-3 py-1.5 text-xs font-bold text-white">
                    {t("certificateReady")}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("currentRequest")}</span>
            <p className="mt-1 text-lg font-bold text-primary">{status?.request.requestNumber ?? "—"}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full bg-secondary transition-all" style={{ width: `${requestProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("departmentsCleared")}</span>
            <p className="mt-1 text-3xl font-black text-on-surface">{totalChecks ? `${clearedChecks} / ${totalChecks}` : "—"}</p>
          </div>
          <div className={`rounded-xl bg-surface-container-lowest p-5 shadow-sm ${outstandingLiabilities > 0 ? "border-l-4 border-error" : ""}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">{t("liabilitiesLabel")}</span>
            <p className={`mt-1 text-lg font-bold ${outstandingLiabilities > 0 ? "text-error" : "text-on-surface"}`}>
              {outstandingLiabilities > 0
                ? (outstandingLiabilities === 1 ? t("outstandingLiability", { count: outstandingLiabilities }) : t("outstandingLiabilities", { count: outstandingLiabilities }))
                : t("allClear")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-outline-variant/20 w-full">
          <h3 className="text-base font-bold text-on-surface mb-3">{t("departmentClearanceProgress")}</h3>
          {status?.checks && status.checks.length > 0 ? (
            <div className="space-y-2">
              {status.checks.map((check) => (
                <div key={check.id} className="flex items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3">
                  <span className={`material-symbols-outlined text-lg ${check.status === "CLEARED" ? "text-primary" : "text-outline"}`} style={check.status === "CLEARED" ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    {check.status === "CLEARED" ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span className="flex-1 text-sm font-medium text-on-surface">{check.checkCode.replace(/_/g, " ")}</span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${check.status === "CLEARED" ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {check.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-4 text-center">{t("noActiveRequestSidebar")}</p>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-outline-variant/30 bg-white/95 px-2 py-2 backdrop-blur-md md:hidden">
        {bottomNavItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => item.path ? go(item.path) : undefined}
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-bold text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
