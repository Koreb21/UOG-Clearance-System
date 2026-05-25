import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { ThemeToggle } from "../components/ThemeToggle";
import { useToast } from "../components/ToastContext";
import { useAuth } from "../modules/auth/AuthContext";
import { campusCatalog, getCampusByCode } from "../modules/campus/catalog";

function CrestIcon() {
  return (
    <div className="role-navigator-crest">
      <span>UGClear</span>
    </div>
  );
}

function HeaderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="role-navigator-mini-icon">
      <path
        d="M12 3 2 8v2h20V8L12 3Zm-7 9h2v5H5v-5Zm4 0h2v5H9v-5Zm4 0h2v5h-2v-5Zm4 0h2v5h-2v-5ZM3 19h18v2H3v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

const studentHighlights = [
  "Create clearance requests",
  "Track departmental progress",
  "View liabilities and pay fees",
  "Access official QR certificate"
];

const staffHighlights = [
  "Review and approve student requests",
  "Issue liabilities and flag checks",
  "Campus-specific office workflows",
  "Administrative oversight"
];

const securityHighlights = [
  "Secure Authentication",
  "Campus-based Access",
  "Audit-tracked Approvals"
];

export function CampusLandingPage() {
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();
  const sessionReady = !authLoading;
  const mappedCampus = getCampusByCode(user?.campusId);
  const [tapCount, setTapCount] = useState(0);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const { showToast } = useToast();

  function getPortalLink(portal: "student" | "staff") {
    if (!user || !mappedCampus) {
      return `/login?portal=${portal}`;
    }

    if (portal === "student") {
      return user.role === "STUDENT" ? `/campus/${mappedCampus.slug}/student` : "/";
    }

    if (user.role === "FINANCE_OFFICER") {
      return `/campus/${mappedCampus.slug}/finance`;
    }

    if (user.role === "MAIN_REGISTRAR") {
      return `/campus/${mappedCampus.slug}/registrar`;
    }

    return user.role === "STUDENT" ? "/" : `/campus/${mappedCampus.slug}/staff`;
  }

  function handleSecretTap() {
    const nextCount = tapCount + 1;
    if (nextCount >= 5) {
      setTapCount(0);
      setShowAdminGate(true);
      return;
    }
    setTapCount(nextCount);
  }

  async function handleAdminGateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAdminSubmitting(true);
    try {
      await login(adminUsername.trim(), adminPassword);
      setShowAdminGate(false);
      navigate("/admin", { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to authenticate admin access.", "error");
    } finally {
      setAdminSubmitting(false);
    }
  }

  return (
    <div className="role-navigator-page">
      <header className="role-navigator-header">
        <div className="role-navigator-header-inner">
          <button
            type="button"
            className="role-navigator-header-brand"
            onClick={handleSecretTap}
            aria-label="UGClear secret admin trigger"
            title="Tap five times for admin gateway"
            style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
          >
            <CrestIcon />
            <span>UGClear</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <SessionControls density="compact" />
            <button type="button" className="role-navigator-header-action" aria-label="Portal navigation">
              <HeaderIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="role-navigator-main">
        <section className="role-navigator-hero">
          <h2>Choose Your Portal to Begin</h2>
          <p>
            Access is role-based and campus-specific to ensure institutional integrity
            and secure departure management.
          </p>
        </section>

        <section className="role-navigator-card-grid">
          <article className="role-navigator-card role-navigator-card-student">
            <div className="role-navigator-card-icon role-navigator-card-icon-student">
              <span>ST</span>
            </div>
            <h3>Student Portal</h3>
            <ul className="role-navigator-list">
              {studentHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="role-navigator-button role-navigator-button-student" to={getPortalLink("student")}>
              Continue as Student
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>

          <article className="role-navigator-card role-navigator-card-staff">
            <div className="role-navigator-card-icon role-navigator-card-icon-staff">
              <span>SF</span>
            </div>
            <h3>Staff Portal</h3>
            <ul className="role-navigator-list">
              {staffHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link className="role-navigator-button role-navigator-button-staff" to={getPortalLink("staff")}>
              Continue as Staff
              <span aria-hidden="true">+</span>
            </Link>
          </article>
        </section>

        <section className="role-navigator-campus-section">
          <div className="role-navigator-campus-copy">
            <span className="role-navigator-chip">Regional Infrastructure</span>
            <h3>Campus Awareness Section</h3>
            <p className="role-navigator-campus-quote">
              "One university system with campus-separated workflow boundaries."
            </p>

            <div className="role-navigator-campus-list">
              {campusCatalog.map((campus) => (
                <div className="role-navigator-campus-item" key={campus.code}>
                  <span className="role-navigator-campus-pin">•</span>
                  <div>
                    <strong>{campus.name}</strong>
                    <span>{campus.tagline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="role-navigator-map-card" aria-hidden="true">
            <div className="role-navigator-map-grid" />
            <div className="role-navigator-map-lines" />
          </div>
        </section>

        <section className="role-navigator-security">
          <p className="role-navigator-security-label">Institutional Security Protocols</p>
          <div className="role-navigator-security-grid">
            {securityHighlights.map((item) => (
              <article className="role-navigator-security-item" key={item}>
                <div className="role-navigator-security-icon">
                  <HeaderIcon />
                </div>
                <span>{item}</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="role-navigator-footer">
        <div className="role-navigator-footer-copy">
          <p>© 2026 UGClear · University of Gondar Clearance System. All rights reserved.</p>
        </div>
        <div className="role-navigator-footer-links">
          <a href="/">Security Policy</a>
          <a href="/">Campus Map</a>
          <a href="/">Privacy Support</a>
        </div>
      </footer>

      {showAdminGate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-gateway-title"
          className="role-navigator-admin-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(8, 15, 28, 0.68)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
        >
          <form
            onSubmit={handleAdminGateSubmit}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "1rem",
              display: "grid",
              gap: "0.75rem"
            }}
          >
            <h3 id="admin-gateway-title" style={{ margin: 0 }}>Admin Security Authentication</h3>
            <input
              value={adminUsername}
              onChange={(event) => setAdminUsername(event.target.value)}
              placeholder="Admin username"
              autoComplete="username"
              required
            />
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Admin password"
              autoComplete="current-password"
              required
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setShowAdminGate(false);
                  setAdminUsername("");
                  setAdminPassword("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={adminSubmitting || !sessionReady}>
                {adminSubmitting ? "Authenticating..." : "Open Admin Dashboard"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
