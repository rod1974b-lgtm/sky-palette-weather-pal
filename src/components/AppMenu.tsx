// src/components/AppMenu.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { WeatherUnit } from "@/lib/weather";
import { saveUnitPref } from "@/lib/weather";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  isValidTierId,
} from "@/lib/monetization";
import { PaymentModal } from "./PaymentModal";

interface AppMenuProps {
  unit: WeatherUnit;
  onUnitChange?: (unit: WeatherUnit) => void;
  onToggleUnit?: () => void;
  // NOTE: Previous version declared onOpenAiGallery, currentPlace,
  // favorites, onSelectPlace, onSelectBackground — but never used them.
  // Parent (index.tsx) passed favorites / onSelectPlace / onSelectBackground,
  // AppMenu ignored them all. Dead props removed. If a future menu needs
  // favorites quick-jump or background picking, add it here intentionally
  // with UI, don't re-add dead props.
}

// [STRIPPED 77 bytes] Sky pref — canonical key / event / values
// index.tsx reads `weather:sky-theme` and listens for
// `weather:sky-theme-change` with detail = string ("rain-day").
// AppMenu previously wrote `weather:sky-pref` and dispatched
// `weather:sky-change` with detail = { sky: val }.
// Result: sky dropdown did NOTHING on the home page — index never saw it,
// and on reload the two components restored different values.
// Canonical: key = "weather:sky-theme", event = "weather:sky-theme-change",
// detail = string. Legacy key/event are migrated/dispatched for compat.
// [STRIPPED 75 bytes]
const SKY_PREF_KEY = "weather:sky-theme";
const LEGACY_SKY_PREF_KEY = "weather:sky-pref";
const FONT_SIZE_KEY = "weather:font-size";

// Values that exist in index.tsx SKY_GRADIENTS (plus "auto").
// Old AppMenu values "cloudy" / "rain" are NOT gradient keys —
// SKY_GRADIENTS has "cloudy-day" / "rain-day", so those options were dead.
const SKY_VALUES = new Set([
  "auto",
  "clear-day",
  "clear-night",
  "cloudy-day",
  "cloudy-night",
  "rain-day",
  "rain-night",
  "snow-day",
  "snow-night",
  "thunder-day",
  "thunder-night",
  "sunrise",
  "sunset",
  "aurora",
  "day",
  "night",
]);

const LEGACY_SKY_MAP: Record<string, string> = {
  cloudy: "cloudy-day",
  rain: "rain-day",
  clear_day: "clear-day",
  clear_night: "clear-night",
  cloudy_day: "cloudy-day",
  cloudy_night: "cloudy-night",
};

function normalizeSkyPref(raw: unknown): string {
  if (typeof raw !== "string") return "auto";
  const trimmed = raw.trim();
  if (LEGACY_SKY_MAP[trimmed]) return LEGACY_SKY_MAP[trimmed];
  return SKY_VALUES.has(trimmed) ? trimmed : "auto";
}

function readInitialSkyPref(): string {
  if (typeof window === "undefined") return "auto";
  try {
    // Canonical key first, legacy key as fallback (migrates old users).
    const canonical = window.localStorage.getItem(SKY_PREF_KEY);
    if (canonical) return normalizeSkyPref(canonical);
    const legacy = window.localStorage.getItem(LEGACY_SKY_PREF_KEY);
    if (legacy) {
      const normalized = normalizeSkyPref(legacy);
      // Migrate: write canonical, delete legacy so they can't diverge again.
      try {
        window.localStorage.setItem(SKY_PREF_KEY, normalized);
        window.localStorage.removeItem(LEGACY_SKY_PREF_KEY);
      } catch {}
      return normalized;
    }
  } catch {}
  return "auto";
}

const FONT_VALUES = new Set(["100%", "115%", "130%"]);

function readInitialFontSize(): string {
  if (typeof window === "undefined") return "100%";
  try {
    const stored = window.localStorage.getItem(FONT_SIZE_KEY) || "100%";
    return FONT_VALUES.has(stored) ? stored : "100%";
  } catch {
    return "100%";
  }
}

// Accepts every shape callers have used:
//   dispatch detail = "small_root_beer_tier" (string)
//   dispatch detail = { tierId: "..." }
//   dispatch detail = { tier: "..." }
function resolveTierIdFromEventDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    return isValidTierId(detail.trim()) ? detail.trim() : null;
  }
  if (detail && typeof detail === "object") {
    const rec = detail as Record<string, unknown>;
    const candidate = rec["tierId"] ?? rec["tier"];
    if (typeof candidate === "string" && isValidTierId(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

export function AppMenu({ unit, onUnitChange, onToggleUnit }: AppMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // FIX: Old code used useState("auto") / useState("100%") then restored
  // from localStorage in an effect — first render flashed the wrong pref.
  // Now initialised lazily from validated localStorage.
  const [skyPref, setSkyPref] = useState<string>(() => readInitialSkyPref());
  const [fontSize, setFontSize] = useState<string>(() => readInitialFontSize());
  const [showTiers, setShowTiers] = useState(false);
  const [paymentTierId, setPaymentTierId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sky presets — values MUST match index.tsx SKY_GRADIENTS keys.
  // Old values "cloudy" / "rain" were not gradient keys, so they did nothing.
  const skyOptions = [
    { value: "auto", label: t("sky_auto", "Auto (weather)") },
    { value: "clear-day", label: t("sky_clear_day", "Clear Day") },
    { value: "clear-night", label: t("sky_clear_night", "Clear Night") },
    { value: "cloudy-day", label: t("sky_cloudy_day", "Overcast / Cloudy") },
    { value: "rain-day", label: t("sky_rain", "Rain / Storm") },
    { value: "sunset", label: t("sunset", "Sunset Glow") },
    { value: "sunrise", label: t("sunrise", "Sunrise Glow") },
  ];

  const fontSizes = [
    { value: "100%", label: t("font_normal", "Normal (100%)") },
    { value: "115%", label: t("font_large", "Large (115%)") },
    { value: "130%", label: t("font_xlarge", "Huge (130%)") },
  ];

  // Apply font size to <html> whenever it changes (not just on mount).
  // Old code only applied it in the mount effect, so if state was restored
  // to a different value later, DOM and state could diverge.
  useEffect(() => {
    try {
      document.documentElement.style.fontSize = fontSize;
    } catch {}
  }, [fontSize]);

  // Listen for global open-payment-modal events (from Gallery, headers, etc.)
  // FIX: Old code accepted any truthy detail.tierId — "free_hack" would
  // render PaymentModal with an invalid tier. Now validates + accepts
  // string / {tierId} / {tier} shapes.
  // NOTE: This only works while AppMenu is mounted (home page). If Gallery
  // (a separate route with no AppMenu) dispatches this event, it is lost.
  // Long-term fix: own PaymentModal in the root layout, not in AppMenu.
  // For now AppMenu is the single owner on the home page — index.tsx's
  // dead duplicate PaymentModal (paidTierModal, never set) is removed.
  useEffect(() => {
    const handleOpenPaymentEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tierId = resolveTierIdFromEventDetail(detail);
      if (!tierId) return;
      setPaymentTierId(tierId);
      setOpen(false);
    };
    window.addEventListener("weather:open-payment-modal", handleOpenPaymentEvent);
    return () => {
      window.removeEventListener("weather:open-payment-modal", handleOpenPaymentEvent);
    };
  }, []);

  // Outside-tap + Escape to close. Backdrop (mobile) + document listener
  // (desktop) previously overlapped because backdrop was INSIDE menuRef —
  // document handler saw backdrop clicks as "inside" and never fired.
  // Now: document handler is the single source for outside-tap, backdrop is
  // just visual (its onClick is a fallback), and Escape also closes.
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleUnitSelect = (newUnit: WeatherUnit) => {
    // FIX: Old code called saveUnitPref() AND parent's onUnitChange()
    // which also called saveUnitPref() — double save. Now AppMenu is the
    // single saver. index.tsx v3 must NOT save in its onUnitChange.
    if (onUnitChange) {
      onUnitChange(newUnit);
    } else if (onToggleUnit && newUnit !== unit) {
      onToggleUnit();
    }
    saveUnitPref(newUnit);
  };

  const handleSkyChange = (val: string) => {
    const normalized = normalizeSkyPref(val);
    setSkyPref(normalized);
    try {
      localStorage.setItem(SKY_PREF_KEY, normalized);
      // Clean up legacy key so the two can't diverge again.
      try {
        localStorage.removeItem(LEGACY_SKY_PREF_KEY);
      } catch {}
      // Canonical event: detail = string (what index.tsx expects).
      // index.tsx old handler did `setSkyPref(detail)` — if detail was
      // { sky: val } it set skyPref to an OBJECT and broke sky rendering.
      // We send a string. index.tsx v3 also accepts object shape for compat.
      window.dispatchEvent(
        new CustomEvent("weather:sky-theme-change", { detail: normalized })
      );
      // Legacy event for any other listener still on the old name.
      window.dispatchEvent(
        new CustomEvent("weather:sky-change", { detail: { sky: normalized } })
      );
    } catch {}
  };

  const handleFontChange = (val: string) => {
    // FIX: Old code accepted any string and set document font-size to it —
    // a tampered localStorage value like "999%" broke layout. Now validated.
    if (!FONT_VALUES.has(val)) return;
    setFontSize(val);
    try {
      localStorage.setItem(FONT_SIZE_KEY, val);
      // DOM apply is in the fontSize effect above — don't duplicate here.
    } catch {}
  };

  const handleSelectTier = (tierId: string) => {
    // Tiers come from ROOT_BEER_TIERS, but validate anyway — a tampered
    // tier list or a future caller passing a bad id must not open
    // PaymentModal with an invalid tier.
    if (!isValidTierId(tierId)) return;
    setPaymentTierId(tierId);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={t("settings", "Settings")}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="app-menu-panel"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-background/60 text-foreground shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer shrink-0"
        >
          <span className="text-base select-none">⚙</span>
        </button>

        {/* Mobile Backdrop — visual only, outside-tap is handled by document listener */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        {open && (
          <div
            id="app-menu-panel"
            role="menu"
            aria-label={t("settings", "Settings")}
            className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-11 z-50 w-[calc(100vw-24px)] sm:w-[320px] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-sm font-bold text-foreground">{t("settings", "Settings")}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1 rounded-lg hover:bg-muted"
                aria-label={t("close", "Close")}
              >
                ✕
              </button>
            </div>

            {/* Root Beer Support / Gratitude Tiers */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-amber-900/10 p-2.5 space-y-2">
              <button
                type="button"
                onClick={() => setShowTiers((prev) => !prev)}
                aria-expanded={showTiers}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🍺</span>
                  <div>
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                      {t("buy_root_beer", "Buy Me a Root Beer")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {t("support_app_sub", "Support app & unlock bonus art")}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  {showTiers ? "▲" : "▼"}
                </span>
              </button>

              {showTiers && (
                <div className="space-y-1.5 pt-1.5 border-t border-amber-500/20">
                  {ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleSelectTier(tier.id)}
                      className="w-full text-left p-2 rounded-lg bg-card/80 hover:bg-amber-500/15 border border-border/80 hover:border-amber-500/40 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground truncate">{tier.name}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">{tier.bonus.label}</div>
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                        {tier.displayPrice}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Units Selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {t("units", "Units")}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUnitSelect("metric")}
                  className={`py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                    unit === "metric"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  °C • {t("metric", "Metric")}
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitSelect("imperial")}
                  className={`py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                    unit === "imperial"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  °F • {t("imperial", "US")}
                </button>
              </div>
            </div>

            {/* Sky Background Selection */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {t("sky_background", "Sky Background")}
              </label>
              <select
                value={skyPref}
                onChange={(e) => handleSkyChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {skyOptions.map((s) => (
                  <option key={s.value} value={s.value} className="bg-card text-foreground">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Size */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {t("font_size", "Text Size")}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {fontSizes.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => handleFontChange(f.value)}
                    className={`py-2 text-xs rounded-lg transition cursor-pointer ${
                      fontSize === f.value
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-border pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <Link
                  to="/gallery"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground underline underline-offset-2 font-medium"
                >
                  🎨 {t("art_gallery", "Art Gallery")}
                </Link>
                <Link
                  to="/privacy"
                  onClick={() => setOpen(false)}
                  className="hover:text-foreground underline underline-offset-2"
                >
                  {t("privacy_policy", "Privacy")}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium transition cursor-pointer"
              >
                {t("close", "Close")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Selection Modal — SIBLING of the menu, not a child.
          Old code rendered it INSIDE the menuRef div, so PaymentModal clicks
          were treated as "inside the menu" and the menu's outside-tap logic
          could not distinguish them. Now AppMenu is the single owner of
          PaymentModal on the home page. */}
      {paymentTierId && (
        <PaymentModal tierId={paymentTierId} onClose={() => setPaymentTierId(null)} />
      )}
    </>
  );
}

export default AppMenu;
