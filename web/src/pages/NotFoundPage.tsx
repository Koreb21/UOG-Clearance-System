import { Link } from "react-router-dom";
import { SessionControls } from "../components/SessionControls";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 px-4 py-10">
      <header className="mx-auto mb-8 flex max-w-3xl items-center justify-end">
        <SessionControls density="full" />
      </header>
      <div className="screen-center mx-auto max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-md">
        <div className="not-found-card border-0 bg-transparent p-0 shadow-none">
          <p className="eyebrow text-amber-900/80">404</p>
          <h1 className="text-2xl font-bold text-slate-900">That page is not in this portal yet.</h1>
          <p className="muted-block text-slate-600">The link may be broken or the route has not been published.</p>
          <Link className="primary-button link-button mt-4 inline-block text-center" to="/">
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
