import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className = "", label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary-fixed/20 active:scale-95 ${className}`}
      aria-label="Go back"
    >
      <span className="material-symbols-outlined text-[20px] leading-none">arrow_back</span>
      <span>{label}</span>
    </button>
  );
}
