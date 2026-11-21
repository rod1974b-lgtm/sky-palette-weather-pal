// src/routes/index.tsx
// FIXED — v3 — Rebuilt from the REAL pasted file, not the earlier invented App.tsx.
// This project has NO App.tsx. TanStack Start uses src/routes/index.tsx as the
// home page and src/routes/__root.tsx as the shell. Do NOT look for App.tsx.
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// BUG 1 — Dead PaymentModal (paidTierModal never set).
//   Pasted file defined paidTierModal + setPaidTierModal, but setPaidTierModal
//   was only ever called in onClose to set null. Nothing ever set it to a tier,
//   so <PaymentModal> never opened from this page. AppMenu.fixed.tsx already
//   owns PaymentModal, listens for "weather:open-payment-modal", and its header
//   says the dead duplicate in index.tsx must be removed. FIX: Deleted
//   paidTierModal state, PaymentModal import, and PaymentModal rendering here.
//   Do NOT add a second listener here or you get two modals. Single owner = AppMenu.
// BUG 2 — Duplicate processPaymentReturnParams bypassed monetization validation.
//   Pasted file defined its own local processPaymentReturnParams that returned
//   ANY string: ?tier=foobar -> "foobar", ?paid=false -> "false",
//   ?paid=cancelled -> "cancelled", all showed ThankYouModal. It ignored failure
//   signals (status=cancelled, paid=false), ignored tier aliases, ignored the
//   pending tier for ?paid=true with no tier. monetization.fixed.ts already has
//   processPaymentReturnParams that validates via resolveTierId/isValidTierId,
//   rejects failure signals, uses pending tier, and calls
//   saveThankYouBackgroundForever(). FIX: Deleted local duplicate, imported the
//   real one from @/lib/monetization. Cancelled payment no longer shows thank-you.
// BUG 3 — Race: stale fetch overwrote fresh fetch.
//   Pasted fetchWeatherForPlace had no request id / abort. If user quickly
//   selected Bangkok then Tokyo, the slower Bangkok fetch could finish last and
//   overwrite Tokyo weather while the header showed Tokyo. Same race in search
//   suggestions: slower "Bang" could overwrite "Bangkok" suggestions.
//   FIX: weatherRequestIdRef + searchRequestIdRef. Each load gets an id. If a
//   newer load started, the old one returns early and does NOT setWeather /
//   setSuggestions / setLoading. fetchWeather() already supports AbortSignal,
//   but request-id is simpler and matches the CityComparison fix.
// BUG 4 — Fetch failure left stale weather + stale alerts, header mismatched.
//   Pasted handleSelectPlace set place to the new city BEFORE fetch. If fetch
//   failed, place was the new city but weather + alerts were still the old
//   city's. User saw new city name with old city's temp, with no error.
//   FIX: Added fetchError state. On failure, set fetchError, do NOT keep
//   silently stale. Render shows an error banner above WeatherView when old
//   weather exists ("Could not load weather, showing last loaded" + Retry),
//   and a full error card with Retry when there is no weather at all (first
//   load failure used to show a blank page, no retry). Alerts are now derived
//   from weather (BUG 6), so they cannot stay stale after a language change.
// BUG 5 — Unit change via AppMenu dropdown did NOT refetch.
//   Pasted AppMenu onUnitChange only did setUnit + saveUnitPref, no fetch.
//   So picking °F in AppMenu changed the label to °F but temps stayed in °C.
//   The header toggle button (handleToggleUnit) DID refetch, so toggle worked,
//   dropdown did not. FIX: onUnitChange now also calls
//   fetchWeatherForPlace(place, newUnit). NOTE: It must NOT call saveUnitPref
//   — AppMenu.fixed.tsx handleUnitSelect already calls saveUnitPref(newUnit)
//   and its header says "index.tsx v3 must NOT save in its onUnitChange" or it
//   double-saves. handleToggleUnit DOES save because the header button
//   bypasses AppMenu. Keep that distinction.
// BUG 6 — Alerts: wind threshold unit-dependent, tags hardcoded English,
//   alerts went stale on language change, ids used Date.now().
//   Pasted: if (wind >= 45) regardless of unit. 45 km/h (metric) = 28 mph,
//   45 mph (imperial) = 72 km/h, very different severity. Tags "THUNDERSTORM" /
//   "HIGH WIND" / "EXTREME UV" hardcoded English. Alerts were generated at
//   fetch time with t() then stored, so changing language via LanguageSelector
//   left alerts in the old language until next fetch. Ids used Date.now(),
//   so every fetch looked like a new alert.
//   FIX: Wind is converted to km/h for the threshold:
//   windKmh = unit === "imperial" ? wind * 1.60934 : wind, then >= 45.
//   Tags now use t(): thunderstorm -> t("alert_thunderstorm_tag",
//   "SEVERE THUNDERSTORM WARNING"), wind/UV -> t("alert_advisory", "ADVISORY")
//   (no wind/UV tag key exists in locales, advisory is translated in all 14).
//   Alerts are now DERIVED via useMemo from [weather, unit, t, i18n.language],
//   not stored at fetch time, so language/unit change re-translates them.
//   Ids are stable: "alert-thunderstorm" / "alert-wind" / "alert-uv".
// BUG 7 — Sky gradient: snow + thunderstorm showed rain gradient, thunder/snow
//   gradients dead. Pasted liveSky: if code >= 51 rain-day, else if code >= 3
//   cloudy-day, else clear-day. Code 71-77 snow and 95+ thunderstorm are both
//   >= 51, so they got rain-day, never snow-day / thunder-day, even though
//   SKY_GRADIENTS has snow-day, thunder-day, etc. FIX: Check thunder first
//   (code >= 95), then snow (71-77, 85-86), then rain (51-67, 80-82), then
//   cloudy (2-3, 45-48), else clear. Day/night variants preserved.
// BUG 8 — Search dropdown stayed open on outside click, no race guard.
//   Pasted search had no onBlur, so clicking outside left the dropdown open.
//   FIX: Input onBlur closes dropdown after 150ms (delay lets suggestion
//   onClick fire first). Search now also uses searchRequestIdRef (BUG 3).
//   Raw fetch to Open-Meteo is KEPT with language=en on purpose — comment in
//   pasted file is correct: CITY_DICTIONARY keys are English, so passing th
//   would break getLocalizedCity(). Do NOT change to i18n.language.
// BUG 9 — Sky-theme event accepted object as string.
//   AppMenu.fixed.tsx sends "weather:sky-theme-change" with detail = string,
//   but also sends legacy "weather:sky-change" with detail = { sky: val }.
//   Pasted handler did setSkyPref(detail) with no type check, so an object
//   detail would set skyPref to an OBJECT and break sky rendering.
//   FIX: Handler now accepts string OR { sky: string }, ignores anything else.
// KEPT AS-IS: BANGKOK_DEFAULT (13.7563, 100.5018), FAVORITES key, YOUR_LOCATION
//   sentinel, isSamePlace (< 0.01), loadFavorites validation, SKY_GRADIENTS,
//   Route head meta, displayCity sentinel check, handleGPS Photon lang=en +
//   town/village fallback, search language=en, header/search/favorites/
//   comparison/WeatherView/footer/ThankYouModal layout, alert() for GPS errors.
//   NOTE: getLocalizedCity/Country take full i18n.language ("en-US") — NOT a bug.
//   placeLocalization.fixed.ts normalizeLang() does split("-")[0] internally.
//   NOTE: Footer line "My Weather Pal • Open-Meteo & RainViewer • 100% Private"
//   is brand + provider names, kept in English on purpose, like the H1 brand.
//   NOTE: fetchError message uses t("weather_load_failed", ...) with English
//   fallback — that key does not exist in locales yet, so it falls back to
//   English until a locale pass adds it. Retry button uses existing
//   t("btn_try_again", "Try again") which exists in all locales.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { applyPersistedLanguage } from "@/lib/i18n";
import {
  getLocalizedCity,
  getLocalizedCountry,
} from "@/lib/placeLocalization";
// FIXED BUG 2: Use the real validator from monetization, not a local duplicate.
import { processPaymentReturnParams } from "@/lib/monetization";

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

// FIXED BUG 2: Local processPaymentReturnParams DELETED. Imported from
// @/lib/monetization above. Do NOT re-add a local version.

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

// FIXED BUG 6: Build alerts from weather + unit + t, derived on render.
// Do NOT store alerts at fetch time or they go stale on language change.
// Stable ids, not Date.now(). Wind threshold is in km/h, converted if imperial.
function buildAlerts(
  weather: Weather | null,
  unit: WeatherUnit,
  t: (key: string, fallback: string) => string
): TickerAlertItem[] {
  if (!weather?.current) return [];
  const { code, wind, uv } = weather.current;
  if (code >= 95) {
    return [
      {
        id: "alert-thunderstorm",
        severity: "disaster",
        tag: t("alert_thunderstorm_tag", "SEVERE THUNDERSTORM WARNING"),
        headline: t("alert_ts_title", "Severe Thunderstorm Warning"),
        desc: t(
          "alert_ts_desc",
          "Heavy lightning, sudden squalls, and flash downpours reported."
        ),
      },
    ];
  }
  // FIXED BUG 6: Convert mph -> km/h before comparing to 45 km/h threshold.
  const windKmh = unit === "imperial" ? wind * 1.60934 : wind;
  if (windKmh >= 45) {
    return [
      {
        id: "alert-wind",
        severity: "warning",
        tag: t("alert_advisory", "ADVISORY"),
        headline: t("alert_wind_title", "High Wind Advisory"),
        desc: t(
          "alert_wind_desc",
          "Gale-force gusts detected. Secure loose outdoor objects."
        ),
      },
    ];
  }
  if (uv >= 10) {
    return [
      {
        id: "alert-uv",
        severity: "warning",
        tag: t("alert_advisory", "ADVISORY"),
        headline: t("alert_uv_title", "Extreme UV Radiation"),
        desc: t(
          "alert_uv_desc",
          "UV Index is dangerous. Seek shade and use SPF 50+."
        ),
      },
    ];
  }
  return [];
}

// FIXED BUG 7: Thunder first, then snow, then rain, then cloudy, else clear.
// Old code checked code >= 51 first, so snow (71-77) + thunder (95+) both
// got rain-day and snow-day / thunder-day were dead.
function getLiveSkyKey(weather: Weather | null): string {
  if (!weather?.current) return "day";
  const code = weather.current.code;
  const isDay = weather.current.is_day;
  if (code >= 95) return isDay ? "thunder-day" : "thunder-night";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return isDay ? "snow-day" : "snow-night";
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return isDay ? "rain-day" : "rain-night";
  }
  if (code >= 3 || code === 45 || code === 48) {
    return isDay ? "cloudy-day" : "cloudy-night";
  }
  return isDay ? "clear-day" : "clear-night";
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
  head: () => ({
    meta: [
      { title: "My Weather Pal — Private Atmospheric Weather & Art" },
      {
        name: "description",
        content:
          "Private local weather with fluid watercolor art, severe weather alerts, rain radar, and outfit advice. No ads, no trackers.",
      },
      {
        property: "og:title",
        content: "My Weather Pal — Private Atmospheric Weather & Art",
      },
      {
        property: "og:description",
        content:
          "Live weather forecasts, watercolor wallpapers, outdoor activity planner, and sun/moon tracker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
  // FIXED BUG 4: Show fetch failures instead of silently keeping stale weather.
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIXED BUG 3: Request ids — stale loads are ignored.
  const weatherRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);

  // Monetization modals — FIXED BUG 1: paidTierModal DELETED.
  // PaymentModal is owned by AppMenu. Do NOT re-add it here.
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
      // FIXED BUG 3: Each load gets an id. Stale loads return early.
      const requestId = ++weatherRequestIdRef.current;
      setLoading(true);
      setFetchError(null);
      try {
        const data = await fetchWeather(p, u);
        if (weatherRequestIdRef.current !== requestId) return;
        setWeather(data);
        saveLastPlace(p);
        setFetchError(null);
        // FIXED BUG 6: Alerts are NOT set here anymore. They are derived
        // from [weather, unit, t] via useMemo below, so language change
        // re-translates them without a refetch.
      } catch (e) {
        if (weatherRequestIdRef.current !== requestId) return;
        console.error("Failed to fetch weather:", e);
        // FIXED BUG 4: Surface the failure. Keep old weather (if any) but
        // show the banner below so the user knows it is stale.
        setFetchError(
          t("weather_load_failed", "Could not load weather. Please try again.")
        );
      } finally {
        if (weatherRequestIdRef.current === requestId) setLoading(false);
      }
    },
    [t]
  );

  // FIXED BUG 6: Alerts derived, not stored. Recomputes on weather / unit /
  // language change, so LanguageSelector change re-translates them.
  const alerts: TickerAlertItem[] = useMemo(
    () => buildAlerts(weather, unit, t as unknown as (key: string, fallback: string) => string),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weather, unit, t, i18n.language]
  );

  // Initialize from storage
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
      if (savedSky) setSkyPref(savedSky);
      const savedHero = localStorage.getItem("weather:custom-hero-art");
      if (savedHero) setCustomBgUrl(savedHero);
    } catch {}

    fetchWeatherForPlace(initialPlace, savedUnit);
    // Only on mount — fetchWeatherForPlace is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to cross-component sky theme events
  useEffect(() => {
    const handleSkyChange = (e: Event) => {
      // FIXED BUG 9: Accept string OR { sky: string }. Old code did
      // setSkyPref(detail) with no check, so an object detail set skyPref
      // to an OBJECT and broke sky rendering.
      const detail = (e as CustomEvent).detail;
      const sky =
        typeof detail === "string" ? detail : detail?.sky;
      if (typeof sky === "string" && sky) setSkyPref(sky);
    };
    window.addEventListener("weather:sky-theme-change", handleSkyChange);
    return () => window.removeEventListener("weather:sky-theme-change", handleSkyChange);
  }, []);

  // Listen for background changes
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

    // 1. Process URL return parameters (?paid=..., ?tier=..., ?unlocked=...)
    // FIXED BUG 2: Imported validator from monetization. It rejects
    // ?paid=false / ?paid=cancelled / ?tier=foobar, resolves aliases, uses
    // pending tier for ?paid=true with no tier, and unlocks via
    // saveThankYouBackgroundForever(). Local duplicate deleted.
    const unlockedTier = processPaymentReturnParams(window.location.search);
    if (unlockedTier) {
      setThankYouTier(unlockedTier);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Listen for in-app code redemption or purchase completions
    const handleTriggerThankYou = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tierId;
      if (tier) setThankYouTier(tier);
    };

    window.addEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);
    return () => {
      window.removeEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);
    };
  }, []);

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
    // Header button bypasses AppMenu, so it DOES save here.
    // AppMenu path (handleUnitChangeFromMenu below) must NOT save —
    // AppMenu already saves in handleUnitSelect.
    saveUnitPref(nextUnit);
    if (place) {
      fetchWeatherForPlace(place, nextUnit);
    }
  };

  // FIXED BUG 5: AppMenu dropdown path. Must refetch, must NOT save
  // (AppMenu already saves). Old code only setUnit + saved, no fetch,
  // so label changed to °F but temps stayed in °C.
  const handleUnitChangeFromMenu = useCallback(
    (newUnit: WeatherUnit) => {
      if (newUnit === unit) return;
      setUnit(newUnit);
      // Do NOT call saveUnitPref here — AppMenu does it.
      fetchWeatherForPlace(place, newUnit);
    },
    [unit, place, fetchWeatherForPlace]
  );

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
      // FIXED BUG 3: Request id — slower "Bang" must not overwrite "Bangkok".
      const myId = ++searchRequestIdRef.current;
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
          if (searchRequestIdRef.current !== myId) return;
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
        if (searchRequestIdRef.current === myId) setSuggestions([]);
      } finally {
        if (searchRequestIdRef.current === myId) setSearchLoading(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Determine active sky gradient or custom background
  // FIXED BUG 7: Uses getLiveSkyKey() — thunder / snow now get their own
  // gradients instead of rain-day.
  const liveSky = getLiveSkyKey(weather);

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

              <AppMenu
                currentPlace={place}
                favorites={favorites}
                onSelectPlace={handleSelectPlace}
                unit={unit}
                // FIXED BUG 5: Refetches, does NOT save (AppMenu saves).
                onUnitChange={handleUnitChangeFromMenu}
                onToggleUnit={handleToggleUnit}
                onSelectBackground={handleSelectCustomBg}
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
              // FIXED BUG 8: Close dropdown on outside click. 150ms delay
              // lets suggestion onClick fire before we hide the list.
              onBlur={() => {
                setTimeout(() => setIsSearching(false), 150);
              }}
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

        {/* Fetch error banner — FIXED BUG 4: Shows when old weather is stale. */}
        {fetchError && weather && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-foreground">
            <span>{fetchError}</span>
            <button
              type="button"
              onClick={() => fetchWeatherForPlace(place, unit)}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer active:scale-95"
            >
              {t("btn_try_again", "Try again")}
            </button>
          </div>
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
        ) : !loading && fetchError && !weather ? (
          // FIXED BUG 4: First-load failure used to show a blank page.
          <div className="p-6 rounded-3xl bg-card/70 border border-border/50 text-center space-y-3">
            <span className="text-3xl block">⚠</span>
            <p className="text-sm font-bold text-foreground">{fetchError}</p>
            <button
              type="button"
              onClick={() => fetchWeatherForPlace(place, unit)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer active:scale-95"
            >
              {t("btn_try_again", "Try again")}
            </button>
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
        <p>My Weather Pal • Open-Meteo & RainViewer • 100% Private</p>
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

      {/* FIXED BUG 1: PaymentModal DELETED — owned by AppMenu. Do NOT re-add. */}

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
