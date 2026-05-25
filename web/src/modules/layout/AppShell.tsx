import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { SessionControls } from "../../components/SessionControls";
import { useAuth } from "../auth/AuthContext";
import { getCampusBySlug } from "../campus/catalog";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { campusSlug } = useParams();
  const currentCampus = getCampusBySlug(campusSlug);

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div>
          <p className="eyebrow">UGClear</p>
          <h1 className="brand-title">Clearance System</h1>
          <p className="brand-copy">Administrative clearance management platform</p>
        </div>

        <div className="rail-card">
          <p className="rail-label">Signed In As</p>
          <strong>{user?.username}</strong>
          <span>{user?.role?.split("_").join(" ") ?? ""}</span>
          <span>{user?.campusId ?? "Global access"}</span>
        </div>

        <div className="rail-session">
          <SessionControls density="full" className="rail-session-inner" />
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  );
}
