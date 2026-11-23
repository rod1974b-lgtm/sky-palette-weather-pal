// src/routes/index.tsx
// FIXED v5 — i18n: ticker tags, footer credit, and meta/og descriptions now translated.
//   - tag: t("alert_tag_*") + tagKey so WeatherAlertWatcher can re-translate on language change.
//   - footer: t("footer_credit")
//   - head(): i18n.t("meta_description" / "og_description") + live meta sync useEffect.
//   - All new keys are in locales/*.json (256 keys each). Brand title stays English by design.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchWeather,
  loadLastPlace,
  saveLastPlace,
  loadUnitPref,
  saveUnitPref,
  type Weather,
  type Place,
  type WeatherUnit,
} from "@/lib/weather";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AppMenu } from "@/components/AppMenu";
import { CityComparison } from "@/components/CityComparison";
import { ThankYouModal } from "@/components/ThankYouModal";
import i18nSingleton, { applyPersistedLanguage } from "@/lib/i18n";
// NOTE: i18nSingleton is the default export from @/lib/i18n, used in head() above (head runs outside React).
// Inside WeatherHomePage, `i18n` comes from useTranslation() — different variable, same instance.
import {
  getLocalizedCity,
  getLocalizedCountry,
} from "@/lib/placeLocalization";
import { processPaymentReturnParams } from "@/lib/monetization";
// SERVER CHECK PAUSED — see useEffect below. Do NOT re-add the promoCodes.server import
// until Supabase is actually set up, or the preview will fail to build (module not found)
// AND the check will delete real Party Pack unlocks (see below).

const BANGKOK_DEFAULT: Place = {
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

const FAVORITES_STORAGE_KEY = "weather:favorites:v1";
const YOUR_LOCATION_SENTINEL = "Your Location";

// ---------------------------------------------------------------------------
// Helpers — defined outside the component so they are not re-created
// on every render and cannot hit TDZ issues (isSamePlace was previously
// defined *after* handleToggleFavorite which used it).
// ---------------------------------------------------------------------------

function isSamePlace(a: Place, b: Place) {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
}

// processPaymentReturnParams is imported from @/lib/monetization — do NOT define a local copy.
// The local copy had different semantics (pure, no validation) and diverged from
// the real one (validates tier, saves unlock, dispatches thank-you event).

function loadFavorites(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape — a single corrupted entry used to poison the whole list.
    return parsed.filter(
      (p): p is Place =>
        !!p &&
        typeof p === "object" &&
        typeof (p as Place).name === "string" &&
        typeof (p as Place).lat === "number" &&
        typeof (p as Place).lon === "number" &&
        Number.isFinite((p as Place).lat) &&
        Number.isFinite((p as Place).lon)
    );
  } catch {
    return [];
  }
}

function saveFavorites(favs: Place[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs));
  } catch {}
}

const SKY_GRADIENTS: Record<string, string> = {
  "clear-day": "linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #9333ea 100%)",
  "clear-night": "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #31104b 100%)",
  "cloudy-day": "linear-gradient(135deg, #64748b 0%, #475569 50%, #334155 100%)",
  "cloudy-night": "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
  "rain-day": "linear-gradient(135deg, #0284c7 0%, #334155 60%, #1e293b 100%)",
  "rain-night": "linear-gradient(135deg, #0c4a6e 0%, #082f49 60%, #020617 100%)",
  "snow-day": "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 50%, #64748b 100%)",
  "snow-night": "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
  "thunder-day": "linear-gradient(135deg, #475569 0%, #3b0764 50%, #1e1b4b 100%)",
  "thunder-night": "linear-gradient(135deg, #18181b 0%, #2e1065 50%, #09090b 100%)",
  sunrise: "linear-gradient(135deg, #fb923c 0%, #ec4899 50%, #6366f1 100%)",
  sunset: "linear-gradient(135deg, #f97316 0%, #a855f7 50%, #312e81 100%)",
  aurora: "linear-gradient(135deg, #064e3b 0%, #0d9488 40%, #4338ca 80%, #701a75 100%)",
  day: "linear-gradient(135deg, #0284c7 0%, #3b82f6 50%, #6366f1 100%)",
  night: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #020617 100%)",
};

export const Route = createFileRoute("/")({
  component: WeatherHomePage,
  head: () => {
    // FIXED i18n: head() runs outside React, so useTranslation() cannot be used here.
    // Use the i18n singleton directly. Title stays "My Weather Pal" (brand name, intentionally
    // English in all locales). Descriptions now use meta_description / og_description (256 keys).
    // Note: TanStack re-runs head() on navigation, not on language change alone — the in-app
    // UI (footer, alerts, etc.) updates instantly on language change; meta updates on next nav.
    // The live meta sync useEffect in WeatherHomePage below covers in-app language switches.
    const { t } = i18nSingleton;
    return {
      meta: [
        { title: "My Weather Pal — Private Atmospheric Weather & Art" },
        {
          name: "description",
          content: t(
            "meta_description",
            "Private local weather with fluid watercolor art, severe weather alerts, rain radar, and outfit advice. No ads, no trackers."
          ),
        },
        {
          property: "og:title",
          content: "My Weather Pal — Private Atmospheric Weather & Art",
        },
        {
          property: "og:description",
          content: t(
            "og_description",
            "Live weather forecasts, watercolor wallpapers, outdoor activity planner, and sun/moon tracker."
          ),
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

export function WeatherHomePage() {
  const { t, i18n } = useTranslation();

  const [place, setPlace] = useState<Place>(BANGKOK_DEFAULT);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unit, setUnit] = useState<WeatherUnit>("metric");
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [skyPref, setSkyPref] = useState<string>("auto");
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Monetization modals
  const [thankYouTier, setThankYouTier] = useState<string | null>(null);

  // Display helper: "Your Location" is a sentinel, not a real city name.
  // It must go through i18n, NOT getLocalizedCity(), which only knows
  // English city names from CITY_DICTIONARY.
  const displayCity = useCallback(
    (name: string) => {
      if (name === YOUR_LOCATION_SENTINEL) return t("your_location", "Your Location");
      return getLocalizedCity(name, i18n.language);
    },
    [i18n.language, t]
  );

  const fetchWeatherForPlace = useCallback(
    async (p: Place, u: WeatherUnit) => {
      setLoading(true);
      try {
        const data = await fetchWeather(p, u);
        setWeather(data);
        saveLastPlace(p);

               // Generate active hazard alerts
        const activeAlertList: TickerAlertItem[] = [];
        if (data.current.code >= 95) {
          activeAlertList.push({
            id: `ts-${Date.now()}`,
            severity: "alert",
            tag: t("alert_tag_thunderstorm", "THUNDERSTORM"),
            tagKey: "alert_tag_thunderstorm",
            title: t("alert_ts_title", "Severe Thunderstorm Warning"),
            message: t("alert_ts_desc", "Heavy lightning, sudden squalls, and flash downpours reported."),
          });
        } else if (data.current.wind >= 45) {
          activeAlertList.push({
            id: `wind-${Date.now()}`,
            severity: "warning",
            tag: t("alert_tag_high_wind", "HIGH WIND"),
            tagKey: "alert_tag_high_wind",
            title: t("alert_wind_title", "High Wind Advisory"),
            message: t("alert_wind_desc", "Gale-force gusts detected. Secure loose outdoor objects."),
          });
        } else if (data.current.uv >= 10) {
          activeAlertList.push({
            id: `uv-${Date.now()}`,
            severity: "warning",
            tag: t("alert_tag_extreme_uv", "EXTREME UV"),
            tagKey: "alert_tag_extreme_uv",
            title: t("alert_uv_title", "Extreme UV Radiation"),
            message: t("alert_uv_desc", "UV Index is dangerous. Seek shade and use SPF 50+."),
          });
        }
        setAlerts(activeAlertList);

  // Initialize from storage
  // FIXED i18n: keep <meta name="description"> in sync when language changes in-app.
  // head() above only re-runs on navigation, so update the live DOM here too.
  useEffect(() => {
    try {
      const el = document.querySelector('meta[name="description"]');
      if (el) el.setAttribute("content", t("meta_description", "Private local weather with fluid watercolor art, severe weather alerts, rain radar, and outfit advice. No ads, no trackers."));
      const og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute("content", t("og_description", "Live weather forecasts, watercolor wallpapers, outdoor activity planner, and sun/moon tracker."));
    } catch {}
  }, [t, i18n.language]);

  useEffect(() => {
    applyPersistedLanguage();

    const savedUnit = loadUnitPref();
    setUnit(savedUnit);

    const savedFavs = loadFavorites();
    setFavorites(savedFavs);

    const last = loadLastPlace();
    const initialPlace = last || BANGKOK_DEFAULT;
    setPlace(initialPlace);

    try {
      const savedSky = localStorage.getItem("weather:sky-theme");
      // Validate — a tampered value like "hacked" would make SKY_GRADIENTS
      // lookup miss and fall back silently. Only known keys allowed.
      // Also migrates legacy "weather:sky-pref" if canonical is missing.
      const VALID = new Set(["auto","clear-day","clear-night","cloudy-day","cloudy-night","rain-day","rain-night","snow-day","snow-night","thunder-day","thunder-night","sunrise","sunset","aurora","day","night"]);
      const legacySky = !savedSky ? localStorage.getItem("weather:sky-pref") : null;
      const rawSky = savedSky || legacySky;
      if (rawSky) {
        const mapped = rawSky === "cloudy" ? "cloudy-day" : rawSky === "rain" ? "rain-day" : rawSky;
        if (VALID.has(mapped)) setSkyPref(mapped);
        if (legacySky && !savedSky) {
          try { localStorage.setItem("weather:sky-theme", mapped); localStorage.removeItem("weather:sky-pref"); } catch {}
        }
      }
      const savedHero = localStorage.getItem("weather:custom-hero-art");
      if (savedHero) setCustomBgUrl(savedHero);
    } catch {}

    fetchWeatherForPlace(initialPlace, savedUnit);
    // Only on mount — fetchWeatherForPlace is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to cross-component sky theme events
  // FIX: AppMenu previously dispatched detail = { sky: val } while this
  // handler did setSkyPref(detail) — setting skyPref to an OBJECT.
  // Now accepts string ("rain-day") or { sky: "rain-day" }, and validates
  // against known gradient keys + "auto". Also handles the legacy
  // "weather:sky-change" event name for any old dispatchers.
  useEffect(() => {
    const VALID_SKY = new Set([
      "auto", "clear-day", "clear-night", "cloudy-day", "cloudy-night",
      "rain-day", "rain-night", "snow-day", "snow-night",
      "thunder-day", "thunder-night", "sunrise", "sunset", "aurora",
      "day", "night",
    ]);
    const LEGACY_MAP: Record<string, string> = { cloudy: "cloudy-day", rain: "rain-day" };
    const handleSkyChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const raw = typeof detail === "string" ? detail : detail?.sky;
      if (typeof raw !== "string") return;
      const normalized = LEGACY_MAP[raw] ?? raw;
      if (VALID_SKY.has(normalized)) setSkyPref(normalized);
    };
    window.addEventListener("weather:sky-theme-change", handleSkyChange);
    window.addEventListener("weather:sky-change", handleSkyChange);
    return () => {
      window.removeEventListener("weather:sky-theme-change", handleSkyChange);
      window.removeEventListener("weather:sky-change", handleSkyChange);
    };
  }, []);

  // Listen to background changes
  useEffect(() => {
    const handleBgChange = (e: Event) => {
      const url = (e as CustomEvent).detail?.url;
      if (url) setCustomBgUrl(url);
    };
    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => window.removeEventListener("weather:custom-bg-change", handleBgChange);
  }, []);

  // Listen for payment return URL params and instant tier unlock events
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Register listener FIRST.
    // processPaymentReturnParams() -> saveThankYouBackgroundForever() dispatches
    // "weather:trigger-tier-thankyou" synchronously. If we called it before
    // adding the listener (old order), that event was lost and only the
    // direct setThankYouTier below showed the modal.
    const handleTriggerThankYou = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tierId;
      if (tier) setThankYouTier(tier);
    };
    window.addEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);

    // 2. Process URL return parameters (?paid=..., ?tier=..., ?unlocked=...)
    // This is the REAL function from @/lib/monetization: it validates the
    // tier (no free unlock on ?paid=false), saves the unlock, and dispatches
    // the event above. We still set state directly as well — idempotent —
    // so the modal shows even if the event path changes.
    const unlockedTier = processPaymentReturnParams(window.location.search);
    if (unlockedTier) {
      setThankYouTier(unlockedTier);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      window.removeEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);
    };
  }, []);

  // SERVER ENTITLEMENT CHECK — PAUSED. Do NOT re-enable until Supabase is set up.
  // FIXED — Preview would not load + would delete real unlocks:
  // 1) This file imported checkEntitlementFromServer + getDeviceId from
  //    @/lib/promoCodes.server, but that file was PAUSED and was NOT copied
  //    to the repo. Vite fails with "Failed to resolve import" and the whole
  //    app shows blank. The server file is not part of the current rebuild.
  // 2) Even if the file DID exist, checkEntitlementFromServer() returns
  //    false when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing
  //    (which they are, because the server is not set up yet). The old code
  //    treated that false as "server says NO" and DELETED the Party Pack
  //    local unlock on every load. That would wipe real unlocks.
  // So this effect now does NOTHING. Local unlocks stay. When the server
  // is really ready, re-add the import + the check, and only delete a local
  // unlock when the server was actually reachable AND said NO.
  // (No code runs here on purpose.)

  const handleSelectPlace = (newPlace: Place) => {
    setPlace(newPlace);
    setSearchQuery("");
    setSuggestions([]);
    setIsSearching(false);
    fetchWeatherForPlace(newPlace, unit);
  };

  const handleToggleUnit = () => {
    const nextUnit: WeatherUnit = unit === "metric" ? "imperial" : "metric";
    setUnit(nextUnit);
    saveUnitPref(nextUnit);
    if (place) {
      fetchWeatherForPlace(place, nextUnit);
    }
  };

  const handleToggleFavorite = () => {
    const isFav = favorites.some((f) => isSamePlace(f, place));
    let next: Place[];
    if (isFav) {
      next = favorites.filter((f) => !isSamePlace(f, place));
    } else {
      next = [...favorites, place];
    }
    setFavorites(next);
    saveFavorites(next);
  };

  const handleSelectCustomBg = (url: string | null) => {
    setCustomBgUrl(url);
    try {
      if (url) localStorage.setItem("weather:custom-hero-art", url);
      else localStorage.removeItem("weather:custom-hero-art");
    } catch {}
  };

  // GPS geolocation with reverse geocoding via Photon
  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert(t("geolocation_unsupported", "Geolocation is not supported by your browser."));
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let placeName = YOUR_LOCATION_SENTINEL;
        let countryName = "";

        try {
          // FIX: Force Photon to return English names with &lang=en.
          // Without this Photon returns the local name (e.g. "ราชบุรี"),
          // which getLocalizedCity() cannot map — CITY_DICTIONARY keys
          // are English ("ratchaburi") — so the header would stay Thai
          // even when the UI language is English, and vice-versa.
          const resp = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=en`
          );
          if (resp.ok) {
            const data = await resp.json();
            const feat = data.features?.[0];
            if (feat?.properties) {
              // FIX: Photon uses town / village for smaller places, not just city.
              // Ratchaburi town, for example, can come back as `town`.
              placeName =
                feat.properties.city ||
                feat.properties.town ||
                feat.properties.village ||
                feat.properties.name ||
                feat.properties.county ||
                feat.properties.state ||
                YOUR_LOCATION_SENTINEL;
              countryName = feat.properties.country || "";
            }
          }
        } catch {}

        const userPlace: Place = {
          name: placeName,
          country: countryName,
          lat,
          lon,
        };
        handleSelectPlace(userPlace);
      },
      () => {
        setLoading(false);
        alert(t("gps_failed", "Could not retrieve GPS coordinates. Please ensure location permissions are granted."));
      },
      { timeout: 10000 }
    );
  };

  // Debounced search autocomplete
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setSearchLoading(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // NOTE: Keep language=en on purpose. Open-Meteo must return English
        // names because CITY_DICTIONARY keys are English. If we passed
        // i18n.language here, e.g. th, getLocalizedCity("กรุงเทพมหานคร")
        // would not match "bangkok" and localization would silently fail.
        const resp = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            searchQuery.trim()
          )}&count=6&language=en&format=json`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.results) {
            const parsed: Place[] = data.results.map((r: any) => ({
              name: r.name,
              country: r.country || "",
              lat: r.latitude,
              lon: r.longitude,
            }));
            setSuggestions(parsed);
          } else {
            setSuggestions([]);
          }
        }
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Determine active sky gradient or custom background
  const liveSky = weather
    ? weather.current.is_day
      ? weather.current.code >= 51
        ? "rain-day"
        : weather.current.code >= 3
        ? "cloudy-day"
        : "clear-day"
      : weather.current.code >= 51
      ? "rain-night"
      : weather.current.code >= 3
      ? "cloudy-night"
      : "clear-night"
    : "day";

  const activeSky = skyPref !== "auto" ? skyPref : liveSky;
  const activeGradient =
    SKY_GRADIENTS[activeSky] ||
    SKY_GRADIENTS[liveSky] ||
    SKY_GRADIENTS["clear-day"] ||
    SKY_GRADIENTS["day"];

  const bgStyle =
    skyPref === "auto" && customBgUrl
      ? {
          backgroundImage: `url(${customBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : {
          backgroundImage: activeGradient,
        };

  return (
    <div
      className="min-h-screen text-foreground transition-all duration-700 relative pb-16"
      style={bgStyle}
    >
      <div className="fixed inset-0 pointer-events-none bg-black/10 backdrop-blur-[0.5px]" />

      <main className="relative z-10 mx-auto max-w-4xl px-3 py-3.5 sm:px-6 sm:py-6 space-y-3.5 sm:space-y-4">
        {/* Navigation / Header Bar */}
        <header className="space-y-2.5">
          {/* Level 1: App Icon and Title Alone */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <img
              src="/icons/weather_pal_1_512.png"
              alt="My Weather Pal"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl drop-shadow-sm shrink-0"
              loading="eager"
            />
            <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground drop-shadow-md whitespace-nowrap">
              My Weather Pal
            </h1>
          </div>

          {/* Level 2: Moved Down - Current City Pin Badge (Left) & Quick Actions (Right) */}
          <div className="flex items-center justify-between gap-2">
            {/* Current City Pin Badge (Mobile-Safe with Truncate) */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 dark:bg-black/60 backdrop-blur-md border border-white/25 text-xs font-bold text-foreground shadow-xs min-w-0 max-w-[58%] sm:max-w-md">
              <span className="text-xs shrink-0">📍</span>
              <span className="font-semibold truncate">
                {displayCity(place.name)}
                {place.country ? `, ${getLocalizedCountry(place.country, i18n.language)}` : ""}
              </span>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              <LanguageSelector variant="dropdown" />

              <button
                type="button"
                onClick={handleToggleUnit}
                aria-label={t("switch_unit", "Switch between Celsius and Fahrenheit")}
                className="h-9 px-2.5 rounded-xl border border-white/20 bg-background/60 text-xs font-bold shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer shrink-0"
              >
                {unit === "metric" ? "°C" : "°F"}
              </button>

              <button
                type="button"
                onClick={handleGPS}
                aria-label={t("use_current_location", "Use current GPS location")}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/20 bg-background/60 text-xs shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer shrink-0"
                title={t("use_current_location", "Use GPS Location")}
              >
                📍
              </button>

              {/* AppMenu owns PaymentModal + unit saving. Do NOT pass
                  currentPlace/favorites/onSelectPlace/onSelectBackground —
                  AppMenu never used them (dead props). Do NOT save unit
                  here — AppMenu already calls saveUnitPref(). */}
              <AppMenu
                unit={unit}
                onUnitChange={(newUnit) => {
                  setUnit(newUnit);
                }}
                onToggleUnit={handleToggleUnit}
              />
            </div>
          </div>
        </header>

        {/* City Search Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-muted-foreground text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              placeholder={t("search_city", "Search any city in the world...")}
              className="w-full rounded-2xl border border-white/20 bg-background/70 pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium shadow-xs backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/60 text-foreground placeholder:text-muted-foreground"
            />
            {searchLoading && (
              <div className="absolute right-3.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            {searchQuery && !searchLoading && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearching && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl z-50 divide-y divide-border/40 overflow-hidden max-h-64 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.name}-${s.lat}-${s.lon}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(s)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/70 transition flex items-center justify-between text-xs sm:text-sm cursor-pointer"
                >
                  <div className="font-semibold text-foreground">
                    {displayCity(s.name)}
                    {s.country && (
                      <span className="ml-1.5 text-muted-foreground text-xs font-normal">
                        ({getLocalizedCountry(s.country, i18n.language)})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Favorites & Compare Toggle */}
        {favorites.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground/90 uppercase tracking-wider">
              {t("favorites", "Favorites")}:
            </span>
            {favorites.map((fav) => {
              const active = isSamePlace(fav, place);
              return (
                <button
                  key={`${fav.name}-${fav.lat}-${fav.lon}`}
                  type="button"
                  onClick={() => handleSelectPlace(fav)}
                  title={fav.country ? `${fav.name}, ${fav.country}` : fav.name}
                  className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md transition cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-white/20 bg-background/50 hover:bg-background/80"
                  }`}
                >
                  {displayCity(fav.name)}
                </button>
              );
            })}

            {favorites.length > 1 && (
              <button
                type="button"
                onClick={() => setShowComparison(!showComparison)}
                className={`ml-auto text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-md border border-white/20 transition cursor-pointer ${
                  showComparison
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-background/50 hover:bg-background/80 text-muted-foreground"
                }`}
              >
                ⚖ {showComparison ? t("hide_comparison", "Hide Compare") : t("compare_cities", "Compare Cities")}
              </button>
            )}
          </div>
        )}

        {/* Multi-City Comparison Deck */}
        {showComparison && (
          <CityComparison
            favorites={favorites}
            currentPlace={place}
            unit={unit}
            onSelectPlace={handleSelectPlace}
          />
        )}

        {/* Main Weather View */}
        {loading && !weather ? (
          <div className="space-y-4">
            <div className="h-64 rounded-3xl bg-card/60 backdrop-blur-md animate-pulse border border-border/50" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-card/50 backdrop-blur-md animate-pulse border border-border/40" />
              ))}
            </div>
          </div>
        ) : weather ? (
          <WeatherView
            weather={weather}
            unit={unit}
            onRefresh={() => fetchWeatherForPlace(place, unit)}
            isRefreshing={loading}
            isFavorite={favorites.some((f) => isSamePlace(f, place))}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            customBgUrl={customBgUrl || undefined}
            activeAlerts={alerts}
          />
        ) : null}
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground/80 space-y-2">
        <p>{t("footer_credit", "My Weather Pal • Open-Meteo & RainViewer • 100% Private")}</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/gallery" className="hover:underline">
            {t("art_gallery", "Art Gallery")}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </div>
      </footer>

      {/* Thank You / Redemption Unlock Modal
          NOTE: PaymentModal is owned by AppMenu (single owner). The old
          index.tsx duplicate used paidTierModal state that was never set,
          so its PaymentModal could never open — dead code removed. */}
      {/* Thank You / Redemption Unlock Modal */}
      {thankYouTier && (
        <ThankYouModal
          tier={thankYouTier}
          onClose={() => setThankYouTier(null)}
        />
      )}
    </div>
  );
}

export default WeatherHomePage;
