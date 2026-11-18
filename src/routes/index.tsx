// src/routes/index.tsx
import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  type Place,
  type WeatherUnit,
  searchCity,
  getWeather,
  loadUnitPref,
  saveUnitPref,
  loadFavorites,
  saveFavorites,
  isSamePlace,
  isFavorite,
  skyKey,
} from "@/lib/weather";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RootBeerThankYou } from "@/components/RootBeerThankYou_DEEPER_AMBER";
import {
  isAdUnlocked,
  saveThankYouBackgroundForever,
} from "@/lib/monetization";
import { getTmdAlertsFn } from "@/lib/tmdAlerts.functions";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";
import { CityComparison } from "@/components/CityComparison";

export const Route = createFileRoute("/")({
  head: () => ({
    title: "My Weather Pal — Private, Art-Infused Forecasts",
    meta: [
      {
        name: "description",
        content:
          "Minimalist, account-free weather app featuring curated AI watercolor backgrounds and live meteorological advisories.",
      },
      { property: "og:title", content: "My Weather Pal — Private Weather" },
      {
        property: "og:description",
        content: "Hyperlocal weather forecasts paired with custom AI watercolor art.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULT_PLACE: Place = {
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

const LAST_PLACE_KEY = "weather:last-place";

const SKY_GRADIENTS: Record<string, string> = {
  "clear-day": "linear-gradient(180deg, oklch(0.78 0.1 248), oklch(0.9 0.055 232) 60%, oklch(0.97 0.025 205))",
  "day": "linear-gradient(180deg, oklch(0.78 0.1 248), oklch(0.9 0.055 232) 60%, oklch(0.97 0.025 205))",
  "clear-night": "linear-gradient(180deg, oklch(0.26 0.06 278), oklch(0.17 0.045 285))",
  "night": "linear-gradient(180deg, oklch(0.26 0.06 278), oklch(0.17 0.045 285))",
  "cloudy-day": "linear-gradient(180deg, oklch(0.8 0.03 248), oklch(0.92 0.02 250))",
  "cloudy": "linear-gradient(180deg, oklch(0.8 0.03 248), oklch(0.92 0.02 250))",
  "cloudy-night": "linear-gradient(180deg, oklch(0.24 0.04 265), oklch(0.15 0.03 268))",
  "fog": "linear-gradient(180deg, oklch(0.84 0.015 255), oklch(0.94 0.008 255))",
  "rain": "linear-gradient(180deg, oklch(0.66 0.07 252), oklch(0.82 0.035 248))",
  "snow": "linear-gradient(180deg, oklch(0.87 0.035 280), oklch(0.96 0.015 275))",
  "storm": "linear-gradient(180deg, oklch(0.56 0.06 268), oklch(0.72 0.04 262))",
  "sunset": "linear-gradient(180deg, oklch(0.68 0.16 38), oklch(0.75 0.12 60) 50%, oklch(0.88 0.08 85))",
};

function loadLastPlace(): Place | null {
  try {
    const raw = localStorage.getItem(LAST_PLACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number" && parsed.name) {
      return parsed as Place;
    }
  } catch {}
  return null;
}

function saveLastPlace(p: Place): void {
  try {
    localStorage.setItem(LAST_PLACE_KEY, JSON.stringify(p));
  } catch {}
}

function formatRelativeTime(timestamp: number, t: (k: string, fb: string) => string): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}${t("time_min_short", "m")} ${t("ago", "ago")}`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}${t("time_hr_short", "h")} ${t("ago", "ago")}`;
  return `${Math.floor(diffSec / 86400)}${t("time_day_short", "d")} ${t("ago", "ago")}`;
}

// Fetch USGS Significant Earthquakes (M4.5+ within 1,200km)
async function fetchUSGSEarthquakes(
  lat: number,
  lon: number,
  t: (k: string, fb: string) => string
): Promise<TickerAlertItem[]> {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    const quakes: TickerAlertItem[] = [];
    for (const f of data.features || []) {
      const [qLon, qLat] = f.geometry.coordinates;
      const mag = Number(f.properties?.mag ?? 0);
      const placeName = f.properties.place || t("unknown_location", "Unknown Location");
      const time = f.properties.time;

      const dLat = (lat - qLat) * 111;
      const dLon = (lon - qLon) * 111 * Math.cos((lat * Math.PI) / 180);
      const distKm = Math.sqrt(dLat * dLat + dLon * dLon);

      if (distKm < 1200) {
        quakes.push({
          id: `usgs-${f.id}`,
          title: `M${mag.toFixed(1)} ${t("alert_earthquake", "Earthquake")} (${placeName})`,
          severity: mag >= 6.0 ? "severe" : "moderate",
          urgency: "Immediate",
          event: "Earthquake",
          source: `USGS (${Math.round(distKm)} km ${t("away", "away")})`,
          updatedAt: time ? formatRelativeTime(time, t) : t("recent", "Recent"),
          url: f.properties.url,
        });
      }
    }
    return quakes;
  } catch {
    return [];
  }
}

// Fetch Thai Meteorological Department (TMD) advisories
async function fetchTMDWarnings(
  placeName: string,
  country: string,
  t: (k: string, fb: string) => string
): Promise<TickerAlertItem[]> {
  const isThai =
    country.toLowerCase().includes("thai") ||
    placeName.toLowerCase().includes("bangkok") ||
    placeName.toLowerCase().includes("chiang") ||
    placeName.toLowerCase().includes("phuket");

  if (!isThai) return [];

  try {
    const tmdRes = await getTmdAlertsFn({ data: {} });
    if (!tmdRes || !tmdRes.success || !tmdRes.alerts) return [];

    return tmdRes.alerts.slice(0, 3).map((a: any, idx: number) => ({
      id: `tmd-${idx}-${a.TitleEn || a.TitleTh}`,
      title: a.TitleEn || a.TitleTh,
      severity: "severe",
      urgency: "Expected",
      event: "Weather Advisory",
      source: "TMD",
      updatedAt: a.IssueDate ? a.IssueDate.substring(0, 10) : t("active", "Active"),
      url: "https://www.tmd.go.th/en",
    }));
  } catch {
    return [];
  }
}

// Weather Loading Skeleton Card
function WeatherSkeleton({ t }: { t: (k: string, fb: string) => string }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Hero Card Skeleton */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-card/60 p-6 md:p-8 backdrop-blur-md shadow-lg min-h-[260px] flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <div className="h-7 w-44 rounded-xl bg-muted/60" />
            <div className="h-4 w-28 rounded-lg bg-muted/50" />
          </div>
          <div className="h-10 w-24 rounded-full bg-muted/60" />
        </div>
        <div className="my-6 flex items-baseline gap-4">
          <div className="h-16 w-32 rounded-2xl bg-muted/70" />
          <div className="space-y-2">
            <div className="h-5 w-24 rounded-lg bg-muted/50" />
            <div className="h-4 w-36 rounded-lg bg-muted/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-md bg-muted/50" />
          <div className="h-6 w-20 rounded-md bg-muted/50" />
        </div>
      </div>

      {/* Hourly Forecast Bar Skeleton */}
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm">
        <div className="mb-3 h-4 w-32 rounded-md bg-muted/60" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[70px] flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/30">
              <div className="h-3 w-10 rounded bg-muted/50" />
              <div className="h-8 w-8 rounded-full bg-muted/60" />
              <div className="h-4 w-8 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-2">
            <div className="h-3 w-16 rounded bg-muted/50" />
            <div className="h-6 w-14 rounded bg-muted/70" />
            <div className="h-2.5 w-20 rounded bg-muted/40" />
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground pt-1">
        {t("loading_weather", "Loading live weather forecast...")}
      </div>
    </div>
  );
}

function Index() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Unit State (defaults to metric)
  const [unit, setUnit] = useState<WeatherUnit>("metric");

  // Place & Weather Data
  const [place, setPlace] = useState<Place>(() => {
    try {
      const saved = loadLastPlace();
      if (saved) return saved;
    } catch {}
    return DEFAULT_PLACE;
  });

  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search autocomplete & cancellation
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Favorites & Multi-City Comparison view toggle
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Alerts
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);

  // Background and Sky Theme
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);

  // Monetization & Ad Unlock state
  const [purchasedTierId, setPurchasedTierId] = useState<string | null>(null);

  // Always keep localStorage synchronized with current place
  useEffect(() => {
    if (place) {
      saveLastPlace(place);
    }
  }, [place]);

  // 1. Initial Preferences, Auto-Redirect Return & Listeners
  useEffect(() => {
    setUnit(loadUnitPref());
    setFavorites(loadFavorites());

    try {
      const savedBg = localStorage.getItem("weather:custom-bg");
      if (savedBg) setCustomBgUrl(savedBg);
    } catch {}

    // Check for Buy Me a Coffee return redirect (?paid=rootbeer)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paid = params.get("paid");
      if (paid === "rootbeer") {
        setPurchasedTierId("medium");
        saveThankYouBackgroundForever();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // 2. Fetch Forecast, Air Quality, and Live Regional Alerts
  const fetchAllWeatherData = async (
    targetPlace: Place,
    targetUnit: WeatherUnit,
    forceFresh: boolean = false
  ) => {
    setLoading(true);
    setError(null);

    try {
      const w = await getWeather(targetPlace, targetUnit, forceFresh);
      setWeather(w);

      // Concurrent retrieval of alerts from USGS, TMD, and local weather thresholds
      const [usgsAlerts, tmdAlerts] = await Promise.all([
        fetchUSGSEarthquakes(targetPlace.lat, targetPlace.lon, t),
        fetchTMDWarnings(targetPlace.name, targetPlace.country, t),
      ]);

      const consolidatedAlerts: TickerAlertItem[] = [...usgsAlerts, ...tmdAlerts];

      // Add severe meteorological warnings based on fetched Open-Meteo data
      if (w.current?.temp != null) {
        const temp = w.current.temp;
        const code = w.current.weather_code ?? 0;
        const isFahrenheit = targetUnit === "imperial";
        const tempCelsius = isFahrenheit ? ((temp - 32) * 5) / 9 : temp;

        if (tempCelsius >= 38) {
          consolidatedAlerts.push({
            id: `extreme-heat-${Date.now()}`,
            title: t("alert_extreme_heat", "Extreme Heat Warning — Stay Hydrated & Avoid Sun"),
            severity: "severe",
            urgency: "Immediate",
            event: "Excessive Heat",
            source: "Open-Meteo",
            updatedAt: t("now", "Now"),
          });
        } else if (tempCelsius <= -10) {
          consolidatedAlerts.push({
            id: `extreme-cold-${Date.now()}`,
            title: t("alert_extreme_cold", "Freeze Warning — Dangerous Wind Chill"),
            severity: "severe",
            urgency: "Immediate",
            event: "Extreme Cold",
            source: "Open-Meteo",
            updatedAt: t("now", "Now"),
          });
        }

        // Severe Thunderstorms & Hail codes
        if ([95, 96, 99].includes(code)) {
          consolidatedAlerts.push({
            id: `thunderstorm-warning-${Date.now()}`,
            title: t("alert_severe_storm", "Severe Thunderstorm Warning — Lightning & Heavy Rain"),
            severity: "severe",
            urgency: "Immediate",
            event: "Severe Thunderstorm",
            source: "Open-Meteo",
            updatedAt: t("now", "Now"),
          });
        }
      }

      setAlerts(consolidatedAlerts);
    } catch (err: any) {
      setError(
        err?.message ||
          t("error_fetch_failed", "Unable to load live weather. Please check your connection.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch when place or unit changes
  useEffect(() => {
    fetchAllWeatherData(place, unit);
  }, [place.lat, place.lon, unit]);

  // Periodic 10-Minute Auto-Refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAllWeatherData(place, unit, true);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(timer);
  }, [place, unit]);

  // Debounced Search Handling with Abort Cancellation
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchCity(query, controller.signal);
        setSuggestions(results);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  // Handle City Selection
  const handleSelectPlace = (selected: Place) => {
    setPlace(selected);
    setQuery("");
    setSuggestions([]);
  };

  // GPS Geolocation Handler with Photon Reverse Geocoding
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError(t("gps_not_supported", "GPS location is not supported on this device."));
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          // Photon Reverse Geocoding
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
            { signal: AbortSignal.timeout(4000) }
          );
          if (res.ok) {
            const data = await res.json();
            const feat = data?.features?.[0]?.properties;
            if (feat) {
              const name = feat.city || feat.town || feat.village || feat.name || t("my_location", "My Location");
              const country = feat.country || "";
              handleSelectPlace({ name, country, lat, lon });
              return;
            }
          }
        } catch {}

        // Fallback name if reverse geocoding fails
        handleSelectPlace({
          name: t("gps_coordinates", "GPS Location"),
          country: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          lat,
          lon,
        });
      },
      () => {
        setError(t("gps_denied", "GPS access was denied. Please search your city manually."));
        setLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // Toggle Units (Metric °C / Imperial °F)
  const handleToggleUnit = () => {
    const next: WeatherUnit = unit === "metric" ? "imperial" : "metric";
    setUnit(next);
    saveUnitPref(next);
  };

  // Favorites Management
  const handleToggleFavorite = () => {
    let next: Place[];
    if (isFavorite(favorites, place)) {
      next = favorites.filter((f) => !isSamePlace(f, place));
    } else {
      next = [...favorites, place];
    }
    setFavorites(next);
    saveFavorites(next);
  };

  // Custom Background Handlers
  const handleSelectCustomBg = (url: string | null) => {
    setCustomBgUrl(url);
    if (url) {
      localStorage.setItem("weather:custom-bg", url);
    } else {
      localStorage.removeItem("weather:custom-bg");
    }
  };

  // Dynamic Background Style
  const currentSky = weather ? skyKey(weather) : "day";
  const bgStyle =
    customBgUrl && isAdUnlocked()
      ? {
          backgroundImage: `url(${customBgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : {
          backgroundImage: SKY_GRADIENTS[currentSky] || SKY_GRADIENTS.day,
        };

  return (
    <div
      className="min-h-screen text-foreground transition-all duration-700 ease-in-out selection:bg-primary/20"
      style={bgStyle}
    >
      {/* Background Ambient Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-black/10 backdrop-blur-[0.5px]" />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-4xl px-3.5 py-4 sm:px-6 sm:py-6 space-y-4">
        {/* Navigation / Header Bar */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/weather_pal_1_512.png"
              alt="My Weather Pal"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl drop-shadow-sm shrink-0"
              loading="eager"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight drop-shadow-sm sm:text-xl">
                My Weather Pal
              </h1>
              <p className="text-[11px] font-medium text-muted-foreground/90">
                {getLocalizedCity(place.name, i18n.language)},{" "}
                {getLocalizedCountry(place.country, i18n.language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Top-Header Language Pull-Down Selector */}
            <LanguageSelector variant="dropdown" />

            {/* Quick Unit Switcher */}
            <button
              type="button"
              onClick={handleToggleUnit}
              aria-label={t("switch_unit", "Switch between Celsius and Fahrenheit")}
              className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-background/60 text-xs font-bold shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer"
            >
              {unit === "metric" ? "°C" : "°F"}
            </button>

            {/* GPS Geolocation Button */}
            <button
              type="button"
              onClick={handleGPS}
              aria-label={t("use_current_location", "Use current GPS location")}
              className="p-2 rounded-xl border border-white/20 bg-background/60 text-xs shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer"
              title={t("use_current_location", "Use GPS Location")}
            >
              📍
            </button>

            {/* Full Feature Drawer Menu */}
            <AppMenu
              currentPlace={place}
              favorites={favorites}
              onSelectPlace={handleSelectPlace}
              unit={unit}
              onUnitChange={(newUnit) => {
                setUnit(newUnit);
                saveUnitPref(newUnit);
              }}
              onToggleUnit={handleToggleUnit}
              onSelectBackground={handleSelectCustomBg}
            />
          </div>
        </header>

        {/* City Search Bar with Autocomplete Dropdown */}
        <div className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_placeholder", "Search city or airport...")}
              aria-label={t("search_city", "Search city or airport")}
              className="w-full rounded-2xl border border-white/25 bg-background/70 px-4 py-2.5 text-sm shadow-md backdrop-blur-md placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/50 transition"
            />
            {searching && (
              <div className="absolute right-3.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            {query && !searching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("clear_search", "Clear search")}
                className="absolute right-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
              {suggestions.map((s, idx) => (
                <button
                  key={`${s.name}-${s.lat}-${s.lon}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(s)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-accent/60 transition cursor-pointer"
                >
                  <span className="font-semibold">
                    {getLocalizedCity(s.name, i18n.language)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {getLocalizedCountry(s.country, i18n.language)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Favorites & Quick Switch Chips */}
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
                  className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md transition cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-white/20 bg-background/50 hover:bg-background/80"
                  }`}
                >
                  {getLocalizedCity(fav.name, i18n.language)}
                </button>
              );
            })}

            {/* Compare Cities Toggle Button */}
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
                ⚖️ {showComparison ? t("hide_comparison", "Hide Compare") : t("compare_cities", "Compare Cities")}
              </button>
            )}
          </div>
        )}

        {/* Multi-City Comparison Panel */}
        {showComparison && (
          <CityComparison
            favorites={favorites}
            currentPlace={place}
            unit={unit}
            onSelectPlace={(selected) => {
              handleSelectPlace(selected);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium text-destructive">
            ⚠️ {error}
          </div>
        )}

        {/* Weather View Section or Loading Skeleton */}
        {weather ? (
          <WeatherView
            weather={weather}
            activeAlerts={alerts}
            unit={unit}
            loading={loading}
            onRefresh={() => fetchAllWeatherData(place, unit, true)}
            isFav={isFavorite(favorites, place)}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            onOpenAiGallery={() => navigate({ to: "/gallery" })}
            customBgUrl={customBgUrl}
          />
        ) : loading ? (
          <WeatherSkeleton t={t} />
        ) : null}

        {/* Multi-City Comparison Hub Footer Card */}
        {!showComparison && favorites.length > 1 && (
          <CityComparison
            favorites={favorites}
            currentPlace={place}
            unit={unit}
            onSelectPlace={(selected) => {
              handleSelectPlace(selected);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>
          {t("weather_by", "Weather data by Open-Meteo • AI Watercolor Art")}
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/gallery" className="hover:underline font-medium">
            🎨 {t("art_gallery", "Art Gallery")}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">
            {t("privacy_policy", "Privacy Policy")}
          </Link>
        </div>
      </footer>

      {/* Root Beer Tier Thank-You Overlay */}
      {purchasedTierId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <RootBeerThankYou
              tierId={purchasedTierId as any}
              onClose={() => setPurchasedTierId(null)}
            />
            <button
              onClick={() => setPurchasedTierId(null)}
              aria-label={t("close", "Close")}
              className="absolute -top-3 -right-3 bg-white text-zinc-700 hover:text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold text-sm transition hover:scale-105 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Index;
