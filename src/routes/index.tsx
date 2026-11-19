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
  loadUnitPref,
  saveUnitPref,
  skyKey,
  isSamePlace,
} from "@/lib/weather";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";
import { WeatherView, type TickerAlertItem } from "@/components/WeatherView";
import { AppMenu } from "@/components/AppMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RootBeerThankYou } from "@/components/RootBeerThankYou_DEEPER_AMBER";
import { CityComparison } from "@/components/CityComparison";
import { isAdUnlocked, saveThankYouBackgroundForever } from "@/lib/monetization";
import { getWallpaperItem } from "@/lib/wallpaperStorage";

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

const SKY_GRADIENTS: Record<string, string> = {
  "clear-day": "linear-gradient(180deg, oklch(0.78 0.1 248), oklch(0.9 0.055 232) 60%, oklch(0.97 0.025 205))",
  day: "linear-gradient(180deg, oklch(0.78 0.1 248), oklch(0.9 0.055 232) 60%, oklch(0.97 0.025 205))",
  clear_day: "linear-gradient(180deg, oklch(0.78 0.1 248), oklch(0.9 0.055 232) 60%, oklch(0.97 0.025 205))",
  "clear-night": "linear-gradient(180deg, oklch(0.26 0.06 278), oklch(0.17 0.045 285))",
  night: "linear-gradient(180deg, oklch(0.26 0.06 278), oklch(0.17 0.045 285))",
  "cloudy-day": "linear-gradient(180deg, oklch(0.8 0.03 248), oklch(0.92 0.02 250))",
  cloudy: "linear-gradient(180deg, oklch(0.8 0.03 248), oklch(0.92 0.02 250))",
  "cloudy-night": "linear-gradient(180deg, oklch(0.24 0.04 265), oklch(0.15 0.03 268))",
  fog: "linear-gradient(180deg, oklch(0.84 0.015 255), oklch(0.94 0.008 255))",
  rain: "linear-gradient(180deg, oklch(0.66 0.07 252), oklch(0.82 0.035 248))",
  snow: "linear-gradient(180deg, oklch(0.87 0.035 280), oklch(0.96 0.015 275))",
  storm: "linear-gradient(180deg, oklch(0.56 0.06 268), oklch(0.72 0.04 262))",
  sunset: "linear-gradient(180deg, oklch(0.68 0.16 38), oklch(0.75 0.12 60) 50%, oklch(0.88 0.08 85))",
};

export function WeatherHomePage() {
  const { t, i18n } = useTranslation();

  const [unit, setUnit] = useState<WeatherUnit>("metric");
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

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

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

  const [skyPref, setSkyPref] = useState<string>(() => {
    try {
      return localStorage.getItem("weather:sky-pref") || "auto";
    } catch {
      return "auto";
    }
  });

  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null);
  const [purchasedTierId, setPurchasedTierId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [alerts, setAlerts] = useState<TickerAlertItem[]>([]);

  useEffect(() => {
    setUnit(loadUnitPref());
  }, []);

  useEffect(() => {
    getWallpaperItem(place.name)
      .then((saved) => {
        if (saved) setCustomBgUrl(saved);
      })
      .catch(() => {});
  }, [place.name]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "rootbeer") {
      saveThankYouBackgroundForever("medium_root_beer_tier");
      setPurchasedTierId("medium_root_beer_tier");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchWeatherForPlace = (targetPlace: Place, targetUnit: WeatherUnit) => {
    setLoading(true);
    setError(null);

    getWeather(targetPlace, targetUnit)
      .then((data) => {
        setWeather(data);
        setLoading(false);

        const detectedAlerts: TickerAlertItem[] = [];
        if (data.current.code >= 95) {
          detectedAlerts.push({
            id: "severe-storm-warning",
            severity: "danger",
            headline: `${targetPlace.name}: Severe Thunderstorm Warning In Effect`,
            source: "National Weather Hazards Center",
          });
        } else if (data.current.code >= 65 && data.current.code <= 67) {
          detectedAlerts.push({
            id: "heavy-rain-advisory",
            severity: "warning",
            headline: `${targetPlace.name}: Heavy Rain & Flash Flood Watch`,
            source: "Hydrological Meteorological Center",
          });
        }
        setAlerts(detectedAlerts);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load weather forecast");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWeatherForPlace(place, unit);
  }, [place, unit]);

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
          const res = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`
          );
          if (res.ok) {
            const data = await res.json();
            const feat = data?.features?.[0];
            const name = feat?.properties?.city || feat?.properties?.name || "Current Location";
            const country = feat?.properties?.country || "";
            handleSelectPlace({ name, country, lat, lon });
          } else {
            handleSelectPlace({ name: "Current Location", lat, lon });
          }
        } catch {
          handleSelectPlace({ name: "Current Location", lat: pos.coords.latitude, lon: pos.coords.longitude });
        } finally {
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
      <div className="fixed inset-0 pointer-events-none bg-black/10 backdrop-blur-[0.5px]" />

      <main className="relative z-10 mx-auto max-w-4xl px-3 py-3.5 sm:px-6 sm:py-6 space-y-3.5 sm:space-y-4">
        {/* Navigation / Header Bar */}
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Title & App Icon */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
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

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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

          {/* Current City Pin Badge - Dedicated line, never cut off */}
          <div className="flex items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/85 dark:bg-black/60 backdrop-blur-md border border-white/25 text-xs font-bold text-foreground shadow-xs max-w-full">
              <span className="text-xs shrink-0">📍</span>
              <span className="font-semibold break-words">
                {getLocalizedCity(place.name, i18n.language)}
                {place.country ? `, ${getLocalizedCountry(place.country, i18n.language)}` : ""}
              </span>
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
            <div className="h-40 rounded-2xl bg-card/50 backdrop-blur-md animate-pulse border border-border/40" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl border border-destructive/30 bg-destructive/10 backdrop-blur-md text-center space-y-2">
            <p className="text-sm font-bold text-destructive">⚠️ {error}</p>
            <button
              onClick={() => fetchWeatherForPlace(place, unit)}
              className="px-4 py-2 rounded-xl bg-destructive text-white text-xs font-semibold shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              {t("try_again", "Try Again")}
            </button>
          </div>
        ) : weather ? (
          <WeatherView
            weather={weather}
            unit={unit}
            loading={loading}
            onRefresh={() => fetchWeatherForPlace(place, unit)}
            isFav={favorites.some((f) => isSamePlace(f, place))}
            onToggleFavorite={handleToggleFavorite}
            onSelectBackground={handleSelectCustomBg}
            customBgUrl={customBgUrl}
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
