import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function PaymentsCompletePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 1200);

    return () => window.clearTimeout(handle);
  }, [navigate]);

  return (
    <div className="screen-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-md">
        <p className="eyebrow text-teal-800">Payment</p>
        <h1 className="text-balance text-2xl font-bold text-slate-900">Payment received</h1>
        <p className="muted-block mt-2 text-slate-600">
          Returning you to your dashboard.
        </p>
      </div>
    </div>
  );
}

