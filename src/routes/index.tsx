// src/routes/index.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { PaymentModal } from "@/components/PaymentModal";
import { ThankYouModal } from "@/components/ThankYouModal";
import { saveThankYouBackgroundForever } from "@/lib/monetization";
import { applyPersistedLanguage } from "@/lib/i18n";
import {
  getLocalizedCity,
  getLocalizedCountry,
} from "@/lib/placeLocalization";

const BANGKOK_DEFAULT: Place = {
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

const FAVORITES_STORAGE_KEY = "weather:favorites:v1";

function loadFavorites(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  const navigate = useNavigate();

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
  const searchTimeoutRef = useRef<any>(null);

  // Monetization modals
  const [paidTierModal, setPaidTierModal] = useState<string | null>(null);
  const [thankYouTier, setThankYouTier] = useState<string | null>(null);

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
  }, []);

  // Listen to cross-component sky theme events
  useEffect(() => {
    const handleSkyChange = (e: any) => {
      const sky = e?.detail;
      if (sky) setSkyPref(sky);
    };
    window.addEventListener("weather:sky-theme-change", handleSkyChange);
    return () => window.removeEventListener("weather:sky-theme-change", handleSkyChange);
  }, []);

  // Listen to background changes
  useEffect(() => {
    const handleBgChange = (e: any) => {
      const url = e?.detail?.url;
      if (url) setCustomBgUrl(url);
    };
    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => window.removeEventListener("weather:custom-bg-change", handleBgChange);
  }, []);

    // Listen for payment return URL params and instant tier unlock events
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Process URL return parameters (?paid=..., ?tier=..., ?unlocked=...)
    const unlockedTier = processPaymentReturnParams(window.location.search);
    if (unlockedTier) {
      setThankYouTier(unlockedTier);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 2. Listen for in-app code redemption or purchase completions
    const handleTriggerThankYou = (e: any) => {
      const tier = e?.detail?.tierId;
      if (tier) setThankYouTier(tier);
    };

    window.addEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);
    return () => {
      window.removeEventListener("weather:trigger-tier-thankyou", handleTriggerThankYou);
    };
  }, []);

  const fetchWeatherForPlace = async (p: Place, u: WeatherUnit) => {
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
          severity: "disaster",
          tag: "THUNDERSTORM",
          headline: t("alert_ts_title", "Severe Thunderstorm Warning"),
          desc: t("alert_ts_desc", "Heavy lightning, sudden squalls, and flash downpours reported."),
        });
      } else if (data.current.wind >= 45) {
        activeAlertList.push({
          id: `wind-${Date.now()}`,
          severity: "warning",
          tag: "HIGH WIND",
          headline: t("alert_wind_title", "High Wind Advisory"),
          desc: t("alert_wind_desc", "Gale-force gusts detected. Secure loose outdoor objects."),
        });
      } else if (data.current.uv >= 10) {
        activeAlertList.push({
          id: `uv-${Date.now()}`,
          severity: "warning",
          tag: "EXTREME UV",
          headline: t("alert_uv_title", "Extreme UV Radiation"),
          desc: t("alert_uv_desc", "UV Index is dangerous. Seek shade and use SPF 50+."),
        });
      }
      setAlerts(activeAlertList);
    } catch (e) {
      console.error("Failed to fetch weather:", e);
    } finally {
      setLoading(false);
    }
  };

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

  const isSamePlace = (a: Place, b: Place) => {
    return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
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
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let placeName = "Your Location";
        let countryName = "";

        try {
          const resp = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`
          );
          if (resp.ok) {
            const data = await resp.json();
            const feat = data.features?.[0];
            if (feat?.properties) {
              placeName =
                feat.properties.city ||
                feat.properties.name ||
                feat.properties.county ||
                "Your Location";
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
        alert("Could not retrieve GPS coordinates. Please ensure location permissions are granted.");
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
                {getLocalizedCity(place.name, i18n.language)}
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
                onUnitChange={(newUnit) => {
                  setUnit(newUnit);
                  saveUnitPref(newUnit);
                }}
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
                    {getLocalizedCity(s.name, i18n.language)}
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

      {/* Root Beer / Payment Modal */}
      {paidTierModal && (
        <PaymentModal
          tierId={paidTierModal}
          onClose={() => setPaidTierModal(null)}
        />
      )}

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
