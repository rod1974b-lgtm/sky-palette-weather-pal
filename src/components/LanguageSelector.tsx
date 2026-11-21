// src/components/LanguageSelector.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLangCode } from "@/lib/i18n";
import type { SupportedLang } from "@/lib/i18n";

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
  // FIX: Old native was "Indonesia" (the country name in English).
  // Native name for the language is "Bahasa Indonesia".
  { code: "id", flag: "🇮🇩", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "vi", flag: "🇻🇳", name: "Vietnamese", native: "Tiếng Việt" },
] as const;

// Accepts every shape callers have used for language events:
//   detail = "th" (string)
//   detail = "th-TH" (BCP-47, normalized to "th")
//   detail = { lang: "th" } / { code: "th" } / { lng: "th" } / { language: "th" }
// Returns null for invalid / unsupported codes — caller must ignore, not set state.
function resolveLangFromDetail(detail: unknown): SupportedLang | null {
  if (typeof detail === "string") {
    return normalizeLangCode(detail);
  }
  if (detail && typeof detail === "object") {
    const rec = detail as Record<string, unknown>;
    const candidate = rec["lang"] ?? rec["code"] ?? rec["lng"] ?? rec["language"];
    if (typeof candidate === "string") {
      return normalizeLangCode(candidate);
    }
  }
  return null;
}

export function LanguageSelector({ variant = "dropdown" }: { variant?: LanguageSelectorVariant }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // FIX: Old init was `i18n?.language || "en"` — if i18n.language was
  // "th-TH", state became "th-TH" (not normalized), and later code had to
  // handle both "th" and "th-TH" via startsWith. Now always normalized to base.
  const [currentLang, setCurrentLang] = useState<SupportedLang>(() => {
    return normalizeLangCode(i18n?.language) ?? "en";
  });
  const ref = useRef<HTMLDivElement>(null);

  // Sync state if language changes elsewhere (e.g. another selector, i18n init).
  // FIX: Old effect did setCurrentLang(i18n.language) raw — "th-TH" leaked
  // into state. Now normalized. Dep is the string itself, not the object.
  useEffect(() => {
    const normalized = normalizeLangCode(i18n?.language);
    if (normalized) {
      setCurrentLang((prev) => (prev === normalized ? prev : normalized));
    }
  }, [i18n?.language]);

  // Listen for custom language events from non-React code.
  // FIX: Old handler did `if (detail) setCurrentLang(detail)` — no validation.
  // If detail was an object, setCurrentLang(object) made
  // `currentLang.startsWith` crash (object has no startsWith). If detail was
  // "xx", state became invalid and the UI fell back to English while state
  // stayed "xx". Now only valid normalized codes are accepted.
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const normalized = resolveLangFromDetail(detail);
      if (!normalized) return;
      setCurrentLang((prev) => (prev === normalized ? prev : normalized));
    };
    window.addEventListener("weather:lang-change", handleSync);
    return () => window.removeEventListener("weather:lang-change", handleSync);
  }, []);

  // Outside-click & escape — only when the dropdown is open (and only for
  // dropdown/compact variants; "full" renders an inline grid, no dropdown).
  useEffect(() => {
    if (!isOpen || variant === "full") return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, variant]);

  const handleChange = async (code: string) => {
    // FIX: Old code accepted any string — handleChange("xx") set state to
    // "xx", called changeLanguage("xx"), and wrote "xx" to 3 localStorage keys.
    // Now invalid codes are ignored entirely.
    const normalized = normalizeLangCode(code);
    if (!normalized) return;
    // No-op if already selected — don't re-init i18next or re-dispatch.
    if (normalized === currentLang) {
      setIsOpen(false);
      return;
    }
    try {
      // FIX: Old code setCurrentLang(code) OPTIMISTICALLY before awaiting
      // changeLanguage, then wrote 3 localStorage keys + DOM lang/dir manually.
      // On failure, UI showed the new lang while i18n never changed, and
      // storage/DOM diverged. Also it wrote a dead key "app_language" that
      // i18n.ts never reads (it reads "weather:lang" + "i18nextLng").
      // Now: single owner is i18n.ts — its languageChanged handler persists
      // normalized "weather:lang" + sets <html lang/dir>. This component only
      // calls changeLanguage() and updates its own state AFTER success.
      // No manual localStorage / document writes here.
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(normalized);
      }
      setCurrentLang(normalized);
      // Notify non-React listeners (vanilla JS, other tabs' manual handlers).
      // i18n's own languageChanged already updated storage/DOM.
      window.dispatchEvent(new CustomEvent("weather:lang-change", { detail: normalized }));
    } catch (e) {
      console.error("Language switch error:", e);
      // Do NOT leave optimistic state — sync effect will restore correct lang.
    } finally {
      setIsOpen(false);
    }
  };

  // currentLang is always a normalized base code now, so lookup is exact.
  // Fallback to English if somehow invalid (defensive, should not happen).
  const current =
    LANGUAGES.find((l) => l.code === currentLang) ?? LANGUAGES[0]!;

  // --- "full" variant: inline grid, no dropdown ---
  // FIX: Old code accepted variant but ignored it — all variants rendered
  // the same dropdown. Now "full" renders an always-visible grid for
  // settings / onboarding pages.
  if (variant === "full") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1" role="listbox" aria-label={t("languages", "Languages")}>
        {LANGUAGES.map((lang) => {
          const active = current.code === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => void handleChange(lang.code)}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-card-foreground hover:bg-muted"
              }`}
            >
              <span className="text-base leading-none select-none shrink-0">{lang.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{lang.native}</div>
                <div className={`truncate text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {lang.name}
                </div>
              </div>
              {active && <span className="text-xs font-bold shrink-0">✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // --- "dropdown" / "compact" variants ---
  // compact: flag-only button (no native text even on desktop).
  // dropdown: flag + native text on sm+ (original behaviour).
  const showNativeText = variant !== "compact";

  return (
    <div className="relative inline-block text-left shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={`Language: ${current.native}`}
        title={`${current.native} (${current.name})`}
        className="flex h-9 items-center gap-1 px-2.5 rounded-xl border border-white/20 bg-background/60 text-xs font-semibold shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer text-foreground shrink-0"
      >
        <span className="text-base leading-none select-none">{current.flag}</span>
        {showNativeText && (
          <span className="hidden sm:inline font-medium text-xs truncate max-w-[65px]">{current.native}</span>
        )}
        <span className="text-[10px] text-muted-foreground select-none">▾</span>
      </button>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      {/* Dropdown Menu — Centered with safe margins on mobile */}
      {isOpen && (
        <div
          id="language-selector-menu"
          role="menu"
          aria-label={t("languages", "Languages")}
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-11 z-50 w-auto sm:w-64 max-h-[75dvh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1.5 flex items-center justify-between">
            {/* FIX: Old header was hardcoded English "🌐 Languages" — Thai users
                saw English here even when the rest of the UI was Thai. */}
            <span>🌐 {t("languages", "Languages")}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("close", "Close")}
              className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md hover:bg-muted"
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
                  role="menuitem"
                  aria-selected={active}
                  onClick={() => void handleChange(lang.code)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition cursor-pointer ${
                    active ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-card-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-base leading-none select-none shrink-0">{lang.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{lang.native}</div>
                    <div className={`truncate text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {lang.name}
                    </div>
                  </div>
                  {active && <span className="text-xs font-bold shrink-0">✓</span>}
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
