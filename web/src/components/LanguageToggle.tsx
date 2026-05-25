import { useTranslation } from "react-i18next";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = i18n.language.startsWith("am") ? "am" : "en";

  const switchLang = () => {
    const next = current === "en" ? "am" : "en";
    void i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={switchLang}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all ${className}`}
      title={t("language")}
      aria-label={t("language")}
    >
      <span className="material-symbols-outlined text-sm">translate</span>
      <span className="font-mono tracking-wider">{current === "en" ? "EN" : "አማ"}</span>
      <span className="hidden text-[10px] text-outline sm:inline">
        {current === "en" ? t("english") : t("amharic")}
      </span>
    </button>
  );
}
