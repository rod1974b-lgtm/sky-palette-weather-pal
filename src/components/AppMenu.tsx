// src/components/AppMenu.tsx
import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { WeatherUnit, Place } from "@/lib/weather";
import { saveUnitPref } from "@/lib/weather";
import { ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE } from "@/lib/monetization";
import { PaymentModal } from "./PaymentModal";

interface AppMenuProps {
  unit: WeatherUnit;
  onUnitChange?: (unit: WeatherUnit) => void;
  onToggleUnit?: () => void;
  onOpenAiGallery?: () => void;
  currentPlace?: Place;
  favorites?: Place[];
  onSelectPlace?: (p: Place) => void;
  onSelectBackground?: (url: string | null) => void;
}

export function AppMenu({
  unit,
  onUnitChange,
  onToggleUnit,
}: AppMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [skyPref, setSkyPref] = useState("auto");
  const [fontSize, setFontSize] = useState("100%");
  const [showTiers, setShowTiers] = useState(false);
  const [paymentTierId, setPaymentTierId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic sky presets with translations
  const skyOptions = [
    { value: "auto", label: t("sky_auto", "Auto (weather)") },
    { value: "day", label: t("sky_clear_day", "Clear Day") },
    { value: "night", label: t("sky_clear_night", "Clear Night") },
    { value: "cloudy", label: t("sky_cloudy_day", "Overcast / Cloudy") },
    { value: "rain", label: t("sky_rain", "Rain / Storm") },
    { value: "sunset", label: t("sunset", "Sunset Glow") },
  ];

  // Dynamic font size options with translations
  const fontSizes = [
    { value: "100%", label: t("font_normal", "Normal (100%)") },
    { value: "115%", label: t("font_large", "Large (115%)") },
    { value: "130%", label: t("font_xlarge", "Huge (130%)") },
  ];

  // Restore saved preferences
  useEffect(() => {
    try {
      const storedSky = localStorage.getItem("weather:sky-pref") || "auto";
      setSkyPref(storedSky);

      const storedFont = localStorage.getItem("weather:font-size") || "100%";
      setFontSize(storedFont);
      document.documentElement.style.fontSize = storedFont;
    } catch {}
  }, []);

  // Listen for global open-payment-modal events (from Gallery, headers, etc.)
  useEffect(() => {
    const handleOpenPaymentEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tierId: string }>;
      if (customEvent.detail?.tierId) {
        setPaymentTierId(customEvent.detail.tierId);
        setOpen(false);
      }
    };
    window.addEventListener("weather:open-payment-modal", handleOpenPaymentEvent);
    return () => {
      window.removeEventListener("weather:open-payment-modal", handleOpenPaymentEvent);
    };
  }, []);

  // Reliable mobile outside-tap listener
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  const handleUnitSelect = (newUnit: WeatherUnit) => {
    if (onUnitChange) {
      onUnitChange(newUnit);
    } else if (onToggleUnit && newUnit !== unit) {
      onToggleUnit();
    }
    saveUnitPref(newUnit);
  };

  const handleSkyChange = (val: string) => {
    setSkyPref(val);
    try {
      localStorage.setItem("weather:sky-pref", val);
      window.dispatchEvent(
        new CustomEvent("weather:sky-change", { detail: { sky: val } })
      );
    } catch {}
  };

  const handleFontChange = (val: string) => {
    setFontSize(val);
    try {
      localStorage.setItem("weather:font-size", val);
      document.documentElement.style.fontSize = val;
    } catch {}
  };

  const handleSelectTier = (tierId: string) => {
    setPaymentTierId(tierId);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t("settings", "Settings")}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-background/60 text-foreground shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer"
      >
        <span className="text-base select-none">⚙️</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[300px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-sm font-bold text-foreground">
              {t("settings", "Settings")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground text-sm cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          {/* Root Beer Support / Gratitude Tiers */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-amber-900/10 p-2.5 space-y-2">
            <button
              type="button"
              onClick={() => setShowTiers((prev) => !prev)}
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
                      <div className="text-xs font-semibold text-foreground truncate">
                        {tier.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {tier.bonus.label}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                      {tier.displayPrice}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Units Selection - Fixed & Synchronized */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("units", "Units")}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleUnitSelect("metric")}
                className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
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
                className={`py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  unit === "imperial"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                °F • {t("imperial", "US")}
              </button>
            </div>
          </div>

          {/* Sky background */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {t("sky_background", "Sky Background")}
            </label>
            <select
              value={skyPref}
              onChange={(e) => handleSkyChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {skyOptions.map((s) => (
                <option key={s.value} value={s.value} className="bg-card text-foreground">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font size */}
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
                  className={`py-1.5 text-xs rounded-lg transition cursor-pointer ${
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

          {/* Footer actions: Unified Art Gallery & Privacy links */}
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

      {/* Payment Selection Modal */}
      {paymentTierId && (
        <PaymentModal
          tierId={paymentTierId}
          onClose={() => setPaymentTierId(null)}
        />
      )}
    </div>
  );
}

export default AppMenu;
