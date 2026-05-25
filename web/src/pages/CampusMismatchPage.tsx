import { Link, useParams } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";
import { getCampusBySlug } from "../modules/campus/catalog";

export function CampusMismatchPage() {
  const { campusSlug } = useParams();
  const campus = getCampusBySlug(campusSlug);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 px-4 py-10">
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-end">
        <SessionControls density="full" />
      </header>
      <div className="screen-center mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-md">
        <div className="not-found-card border-0 bg-transparent p-0 shadow-none">
          <p className="eyebrow text-teal-800">Campus access</p>
          <h1 className="text-balance text-2xl font-bold text-slate-900">
            {campus?.name ?? "That campus"} is not the portal assigned to this account.
          </h1>
          <p className="muted-block text-slate-600">
            Open the portal that matches the campus on your account, sign out and use another user, or return to the
            campus selector.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link className="primary-button link-button text-center" to="/campuses">
              Campus selector
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
              to="/login"
            >
              Sign in again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
