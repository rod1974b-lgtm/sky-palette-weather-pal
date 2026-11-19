// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  type Place,
  type WeatherUnit,
  getWeather,
  searchCity,
  reverseGeocode,
  getUnitPref,
  saveUnitPref,
  skyKey,
  SKY_GRADIENTS,
  getLocalizedCity,
  getLocalizedCountry,
} from "@/lib/weather";
import { WeatherView } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RootBeerThankYou } from "@/components/RootBeerThankYou_DEEPER_AMBER";
import { CityComparison } from "@/components/CityComparison";
import {
  getCustomBackground,
  isAdUnlocked,
} from "@/lib/aiWatercolorGenerator";
import { saveThankYouBackgroundForever } from "@/lib/monetization";
import type { TickerAlertItem } from "@/components/WeatherAlertWatcher";

export const Route = createFileRoute("/")({
  component: WeatherHomePage,
  head: () => ({
    meta: [
      { title: "My Weather Pal — Private Atmospheric Weather & Art" },
      {
        name: "description",
        content:
          "Private local weather with atmospheric art. No accounts, no trackers.",
      },
      { property: "og:title", content: "My Weather Pal" },
      {
        property: "og:description",
        content:
          "Private local weather with atmospheric art. No accounts, no trackers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const DEFAULT_PLACE: Place = {
  name: "Chiang Mai",
  country: "Thailand",
  lat: 18.7883,
  lon: 98.9853,
};

function isSamePlace(a: Place, b: Place): boolean {
  return Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lon - b.lon) < 0.05;
}

export function WeatherHomePage() {
  const { t, i18n } = useTranslation();

  // Unit of Measurement
  const [unit, setUnit] = useState<WeatherUnit>("metric");

  // Current Place & Weather Forecast
  const [place, setPlace] = useState<Place>(() => {
    try {
      const stored = localStorage.getItem("weather:last-place");
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_PLACE;
  });

  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search Bar Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Saved Favorite Places
  const [favorites, setFavorites] = useState<Place[]>(() => {
    try {
      const stored = localStorage.getItem("weather:favorites");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      DEFAULT_PLACE,
      { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
      { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
      { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
      { name: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
    ];
  });

  // Sky Theme Preference State
  const [skyPref, setSkyPref] = useState<string>(() => {
    try {
      return localStorage.getItem("weather:sky-pref") || "auto";
    } catch {
      return "auto";
    }
  });

  // Custom Wallpaper from Art Gallery
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(() => {
    try {
      return getCustomBackground(place.name);
    } catch {
      return null;
    }
  });

  // Post-Payment / Thank-You Overlay State
  const [purchasedTierId, setPurchasedTierId] = useState<string | null>(null);

  // Compare Cities View Toggle
  const [showComparison, setShowComparison] = useState(false);

  // Active Weather Alerts
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);

  // 1. Initial Preferences Loading
  useEffect(() => {
    setUnit(getUnitPref());
  }, []);

  // 2. Synchronize Custom Sky Theme Preference
  useEffect(() => {
    const handleSkyChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ sky: string }>;
      if (customEvent.detail?.sky) {
        setSkyPref(customEvent.detail.sky);
      }
    };
    window.addEventListener("weather:sky-change", handleSkyChange);
    return () => {
      window.removeEventListener("weather:sky-change", handleSkyChange);
    };
  }, []);

  // 3. Listen for Custom Thank-You Trigger Events
  useEffect(() => {
    const handleThankYou = (e: Event) => {
      const customEvent = e as CustomEvent<{ tierId: string }>;
      if (customEvent.detail?.tierId) {
        setPurchasedTierId(customEvent.detail.tierId);
      }
    };
    window.addEventListener("weather:trigger-tier-thankyou", handleThankYou);
    return () => {
      window.removeEventListener("weather:trigger-tier-thankyou", handleThankYou);
    };
  }, []);

  // 4. Handle External Payment Return URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paidParam = params.get("paid");
    if (paidParam === "rootbeer") {
      saveThankYouBackgroundForever("medium_root_beer_tier");
      setPurchasedTierId("medium_root_beer_tier");
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // 5. Fetch Weather Whenever Location or Units Change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getWeather(place, unit)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setLoading(false);
          try {
            setCustomBgUrl(getCustomBackground(place.name));
          } catch {}

          // Evaluate Active Weather Alerts
          const detectedAlerts: TickerAlertItem[] = [];
          if (data.current.code >= 95) {
            detectedAlerts.push({
              id: "severe-storm-warning",
              severity: "danger",
              headline: `${place.name}: Severe Thunderstorm Warning In Effect`,
              instruction: "Seek indoor shelter immediately. Stay clear of windows and tall trees.",
              source: "National Weather Hazards Center",
              effective: "Now",
            });
          } else if (data.current.code >= 65 && data.current.code <= 67) {
            detectedAlerts.push({
              id: "heavy-rain-advisory",
              severity: "warning",
              headline: `${place.name}: Heavy Rain & Flash Flood Watch`,
              instruction: "Avoid flooded low-lying areas and drive with extreme caution.",
              source: "Hydrological Meteorological Center",
              effective: "Now",
            });
          }
          setAlerts(detectedAlerts);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load weather forecast");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [place, unit]);

  // 6. Debounced City Autocomplete Search
  useEffect(() => {
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchCity(
          searchQuery.trim(),
          i18n.language || "en",
          controller.signal
        );
        setSuggestions(results);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, i18n.language]);

  const handleSelectPlace = (newPlace: Place) => {
    setPlace(newPlace);
    setSearchQuery("");
    setSuggestions([]);
    setIsSearching(false);
    try {
      localStorage.setItem("weather:last-place", JSON.stringify(newPlace));
    } catch {}
  };

  const handleToggleFavorite = () => {
    const isFav = favorites.some((f) => isSamePlace(f, place));
    let next: Place[];
    if (isFav) {
      next = favorites.filter((f) => !isSamePlace(f, place));
    } else {
      next = [place, ...favorites.slice(0, 7)];
    }
    setFavorites(next);
    try {
      localStorage.setItem("weather:favorites", JSON.stringify(next));
    } catch {}
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const detected = await reverseGeocode(lat, lon);
          if (detected) {
            handleSelectPlace(detected);
          } else {
            handleSelectPlace({
              name: "My Location",
              country: "",
              lat,
              lon,
            });
          }
        } catch {
          alert("Could not detect city name from your GPS coordinates");
          setLoading(false);
        }
      },
      () => {
        alert("GPS access was denied or timed out");
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleToggleUnit = () => {
    const nextUnit: WeatherUnit = unit === "metric" ? "imperial" : "metric";
    setUnit(nextUnit);
    saveUnitPref(nextUnit);
  };

  const handleSelectCustomBg = (bgUrl: string | null) => {
    setCustomBgUrl(bgUrl);
  };

  const liveSky = weather?.current
    ? skyKey(weather.current.code, weather.current.is_day ?? 1)
    : "day";

  const activeSky = skyPref !== "auto" ? skyPref : liveSky;
  const activeGradient =
    SKY_GRADIENTS[activeSky] ||
    SKY_GRADIENTS[liveSky] ||
    SKY_GRADIENTS["clear-day"] ||
    SKY_GRADIENTS["day"];

  const bgStyle =
    skyPref === "auto" && customBgUrl && isAdUnlocked()
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
      className="min-h-screen text-foreground transition-all duration-700 ease-in-out selection:bg-primary/20"
      style={bgStyle}
    >
      {/* Background Ambient Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-black/10 backdrop-blur-[0.5px]" />

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-4xl px-3.5 py-4 sm:px-6 sm:py-6 space-y-4">
        {/* Navigation / Header Bar — Mobile-Safe Layout */}
        <header className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <img
              src="/icons/weather_pal_1_512.png"
              alt="My Weather Pal"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl drop-shadow-sm shrink-0"
              loading="eager"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground drop-shadow-md truncate">
                My Weather Pal
              </h1>
              {/* High-Contrast Frosted Badge */}
              <div className="mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/85 dark:bg-black/60 backdrop-blur-md border border-white/25 text-[11px] sm:text-xs font-bold text-foreground shadow-xs max-w-full">
                <span className="text-[11px] shrink-0">📍</span>
                <span className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-[280px]">
                  {getLocalizedCity(place.name, i18n.language)}
                  {place.country ? `, ${getLocalizedCountry(place.country, i18n.language)}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Top-Header Language Pull-Down Selector */}
            <LanguageSelector variant="dropdown" />

            {/* Quick Unit Switcher */}
            <button
              type="button"
              onClick={handleToggleUnit}
              aria-label={t("switch_unit", "Switch between Celsius and Fahrenheit")}
              className="h-9 px-2.5 rounded-xl border border-white/20 bg-background/60 text-xs font-bold shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer shrink-0"
            >
              {unit === "metric" ? "°C" : "°F"}
            </button>

            {/* GPS Geolocation Button */}
            <button
              type="button"
              onClick={handleGPS}
              aria-label={t("use_current_location", "Use current GPS location")}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/20 bg-background/60 text-xs shadow-xs backdrop-blur-md hover:bg-background/80 transition cursor-pointer shrink-0"
              title={t("use_current_location", "Use GPS Location")}
            >
              📍
            </button>

            {/* Settings & Feature Drawer Menu */}
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
            <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md divide-y divide-border/40">
              {suggestions.map((s) => (
                <button
                  key={`${s.name}-${s.lat}-${s.lon}`}
                  type="button"
                  onClick={() => handleSelectPlace(s)}
                  className="w-full flex items-center justify-between p-2.5 text-left text-xs text-foreground hover:bg-muted/80 rounded-xl transition cursor-pointer"
                >
                  <span className="font-semibold text-foreground">
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

        {/* Multi-City Comparison Deck */}
        {showComparison && (
          <CityComparison
            favorites={favorites}
            unit={unit}
            onSelectCity={handleSelectPlace}
          />
        )}

        {/* Weather Forecast View or Skeleton Loader */}
        {loading && !weather ? (
          <div className="space-y-4">
            <div className="h-64 rounded-3xl bg-card/60 backdrop-blur-md animate-pulse border border-border/50" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-card/50 backdrop-blur-md animate-pulse border border-border/40" />
              ))}
            </div>
            <div className="h-40 rounded-2xl bg-card/50 backdrop-blur-md animate-pulse border border-border/40" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl border border-destructive/30 bg-destructive/10 backdrop-blur-md text-center space-y-2">
            <p className="text-sm font-bold text-destructive">⚠️ {error}</p>
            <button
              onClick={() => handleSelectPlace(place)}
              className="px-4 py-2 rounded-xl bg-destructive text-white text-xs font-semibold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              {t("try_again", "Try Again")}
            </button>
          </div>
        ) : weather ? (
          <WeatherView
            weather={weather}
            unit={unit}
            isFavorite={favorites.some((f) => isSamePlace(f, place))}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            customBgUrl={customBgUrl}
            activeAlerts={alerts}
          />
        ) : null}
      </main>

      {/* Footer Navigation */}
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

      {/* Root Beer Tier Thank-You Overlay — Centered with safe close button */}
      {purchasedTierId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md">
            <RootBeerThankYou
              tierId={purchasedTierId as any}
              onClose={() => setPurchasedTierId(null)}
            />
            <button
              onClick={() => setPurchasedTierId(null)}
              aria-label={t("close", "Close")}
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-zinc-700 hover:text-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg font-bold text-sm transition hover:scale-105 cursor-pointer z-10"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherHomePage;
