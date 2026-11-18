// src/components/LanguageSelector.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export type LanguageSelectorVariant = "dropdown" | "compact" | "full";

export const LANGUAGES = [
  { code: "en", flag: "🇺🇸", name: "English", native: "English" },
  { code: "th", flag: "🇹🇭", name: "Thai", native: "ไทย" },
  { code: "es", flag: "🇪🇸", name: "Spanish", native: "Español" },
  { code: "ja", flag: "🇯🇵", name: "Japanese", native: "日本語" },
  { code: "zh", flag: "🇨🇳", name: "Chinese", native: "中文" },
  { code: "hi", flag: "🇮🇳", name: "Hindi", native: "हिन्दी" },
  { code: "fr", flag: "🇫🇷", name: "French", native: "Français" },
  { code: "de", flag: "🇩🇪", name: "German", native: "Deutsch" },
  { code: "pt", flag: "🇧🇷", name: "Portuguese", native: "Português" },
  { code: "ru", flag: "🇷🇺", name: "Russian", native: "Русский" },
  { code: "ar", flag: "🇸🇦", name: "Arabic", native: "العربية" },
  { code: "ko", flag: "🇰🇷", name: "Korean", native: "한국어" },
  { code: "id", flag: "🇮🇩", name: "Indonesian", native: "Indonesia" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese", native: "Tiếng Việt" },
];

export function LanguageSelector({
  variant = "dropdown",
}: {
  variant?: LanguageSelectorVariant;
}) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => i18n?.language || "en");
  const ref = useRef<HTMLDivElement>(null);

  // Sync state if language changes elsewhere
  useEffect(() => {
    if (i18n?.language) {
      setCurrentLang(i18n.language);
    }
  }, [i18n?.language]);

  // Listen for custom language events
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setCurrentLang(detail);
    };
    window.addEventListener("weather:lang-change", handleSync);
    return () => window.removeEventListener("weather:lang-change", handleSync);
  }, []);

  // Desktop outside-click & escape listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleChange = async (code: string) => {
    try {
      setCurrentLang(code);
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(code);
      }
      localStorage.setItem("weather:lang", code);
      localStorage.setItem("app_language", code);
      localStorage.setItem("i18nextLng", code);
      if (typeof document !== "undefined") {
        document.documentElement.lang = code;
        document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
      }
      window.dispatchEvent(new CustomEvent("weather:lang-change", { detail: code }));
    } catch (e) {
      console.error("Language switch error:", e);
    } finally {
      setIsOpen(false);
    }
  };

  const current =
    LANGUAGES.find((l) => l.code === currentLang || currentLang.startsWith(l.code + "-")) ||
    LANGUAGES[0]!;

  // Dropdown pull-down variant for top header
  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Language: ${current.native}`}
        title={`${current.native} (${current.name})`}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/20 bg-background/60 text-xs font-semibold shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer text-foreground"
      >
        <span className="text-base leading-none select-none">{current.flag}</span>
        <span className="hidden sm:inline font-medium text-xs truncate max-w-[65px]">
          {current.native}
        </span>
        <span className="text-[10px] text-muted-foreground select-none">▾</span>
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-11 z-50 w-[calc(100vw-24px)] sm:w-64 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1 flex items-center justify-between">
            <span>🌐 Languages</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
            {LANGUAGES.map((lang) => {
              const active = current.code === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleChange(lang.code)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-card-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-base leading-none select-none">{lang.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{lang.native}</div>
                    <div
                      className={`truncate text-[10px] ${
                        active ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {lang.name}
                    </div>
                  </div>
                  {active && <span className="text-xs font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
