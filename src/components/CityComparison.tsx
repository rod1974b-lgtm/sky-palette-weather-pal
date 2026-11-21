// src/components/CityComparison.tsx
// FIXED — v3 — Rebuilt from the REAL pasted file, not the earlier invented version.
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// BUG 1 — COMPARISON_I18N duplicated the locale files and bypassed t().
//   The file had its own 14-language table (~200 lines) with wording that had
//   already drifted from locales/*.json. Example: th compare_title in locales is
//   "เปรียบเทียบเมือง", but COMPARISON_I18N th title was "เปรียบเทียบสภาพอากาศหลายเมือง".
//   de compare_humidity in locales is "Luftfeuchtigkeit", but COMPARISON_I18N de was "Feuchte".
//   If you fixed a translation in locales/*.json, this component ignored it.
//   FIX: Deleted COMPARISON_I18N entirely. Now uses t("compare_*") with English
//   fallbacks. Single source of truth is locales/*.json. Verified: all 14 fixed
//   locale files have all 17 compare_* keys (compare_title, compare_subtitle,
//   compare_best_weather, compare_cleanest_air, compare_viewing_now, compare_view_city,
//   compare_no_favorites, compare_no_favorites_desc, compare_try_cities, compare_refresh,
//   compare_humidity, compare_wind, compare_feels, compare_high_low, compare_aqi,
//   compare_unavailable, compare_cities, compare_no_favorites, etc.). If you have NOT
//   yet copied the refixed locale files from the zip, this falls back to English.
//   Do NOT re-add COMPARISON_I18N.
// BUG 2 — "Best Weather" picked the FIRST clear city, not the best.
//   Old code: if (code <= 1 && !bestWeatherPlace) bestWeatherPlace = place.
//   So if Bangkok was clear (code 0) and Tokyo was also clear but 22C and
//   comfortable, Bangkok still won because it was first. Comment said "clearest
//   condition & comfortable temp" but code only checked code <= 1. If NO city
//   was clear, no badge showed at all, even though one city was relatively best
//   (e.g. cloudy vs rain). FIX: Score every city: code penalty (0-1 clear=0,
//   2=1, 3=2, fog 45/48=3, drizzle 51-57=4, rain/showers 61-67/80-82=5,
//   snow 71-77=6, thunderstorm 95+=7) + comfort penalty (|tempC - 22| / 5).
//   Lowest score wins. Now a cloudy-but-comfortable city can beat a clear-but-
//   38C city, and a best badge always shows when at least one city has weather.
// BUG 3 — "Cleanest Air" hid when all AQI >= 45, and no-data cities faked AQI 50.
//   Old code: isCleanestAir required lowestAqi < 45. If cleanest city had AQI 60,
//   no badge showed, even though it WAS cleanest among favorites. And for
//   cleanest calculation, old code used aqi ?? (pm25 ? pm25*3 : 50) — a city with
//   NO AQI and NO PM2.5 got a fake 50, so it could wrongly win "cleanest".
//   FIX: Cleanest is now relative — lowest real AQI wins, even if it is 60 or 120,
//   as long as it has data. No-data cities are skipped (Infinity), not 50.
//   PM2.5 estimate kept as Math.round(pm25 * 3) — same estimate as old code,
//   kept to avoid inventing a new formula. It is a rough estimate, not a real AQI.
// BUG 4 — Race: stale load overwrote fresh load.
//   Old loadAllWeather had no cancellation. If favorites or unit changed quickly,
//   or user hit Refresh then changed unit, the slower first Promise.all could
//   finish last and overwrite the newer entries with old-unit / old-favorites data.
//   FIX: requestIdRef. Each load gets an id. If a newer load started, the old
//   load returns early and does NOT setEntries / setIsRefreshing. Unmount also
//   invalidates in-flight loads via useEffect cleanup.
// BUG 5 — Keys and badge matching used name only.
//   Old key={place.name} and isBestWeather = bestPlace?.name === place.name.
//   Two favorites with the same name (e.g. two "Paris", two "Springfield") would
//   share a React key and both get the badge. FIX: Keys are now
//   `${name}-${lat.toFixed(4)}-${lon.toFixed(4)}`. Badge matching uses lat/lon
//   (within 0.1), not name. isCurrent now checks BOTH lat and lon (old code
//   checked lat only, so same-name + similar-lat but different-lon could false-positive).
// BUG 6 — 4 translation keys were dead, never shown.
//   COMPARISON_I18N had humidity, wind, highLow, aqi, but UI never used them.
//   Quick metrics showed only icons + values (💧 65%, 💨 12 km/h) with no labels,
//   feels line showed ↑↓ with no H/L label, AQI pill hardcoded "AQI".
//   FIX: Quick metrics now show labels: "💧 Humidity 65%", "💨 Wind 12 km/h".
//   Feels line now shows "{feels} • {highLow} ↑max ↓min". AQI pill now uses
//   t("compare_aqi"). aqiCategory now gets t, so its label is translated if shown.
// BUG 7 — Hardcoded English errors.
//   Old loadAllWeather set error: "Unavailable" (hardcoded) and UI showed
//   "Weather Unavailable" (hardcoded). German/Thai users saw English errors.
//   FIX: Both now use t("compare_unavailable", "Weather Unavailable").
// BUG 8 — Current-city button was still clickable.
//   Old button for the current city looked disabled (muted, cursor-default) but
//   had no disabled attribute, so clicking it still called onSelectPlace.
//   FIX: Added disabled={isCurrent}.
// BUG 9 — Duplicate favorites fetched twice.
//   If favorites had the same lat/lon twice, old code fetched it twice and showed
//   duplicate cards. FIX: Dedupe by lat/lon (toFixed(4)) before fetching.
// BUG 10 — Only one badge per city, hiding info.
//   Old badge bar: current ? Viewing : best ? Best : cleanest ? Cleanest : country.
//   A city that was BOTH best weather AND cleanest air showed only Best, hiding
//   Cleanest. FIX: Badge bar now shows ALL applicable badges (Viewing + Best +
//   Cleanest) in a flex-wrap row. Country shows only when no badge applies.
// KEPT AS-IS: SUGGESTED_CITIES coords (Bangkok 13.7563,100.5018; Tokyo 35.6762,139.6503;
//   Paris 48.8566,2.3522; London 51.5074,-0.1278; Chiang Mai 18.7883,98.9853 — all correct),
//   grid layout, card styling, refresh button, empty-state layout, WeatherIcon usage,
//   getLocalizedCity / getLocalizedCountry usage, fetchWeather usage.
// NOTE — Suggested cities only VIEW, they do NOT add to favorites.
//   Empty-state button calls onSelectPlace(c), which views the city. The user then
//   taps ❤ to add it to favorites. The locale key compare_try_cities still says
//   "Quick add popular cities:" in English — that wording lives in locales/*.json,
//   not here. In a future locale pass, change it to "Popular cities:" to match
//   the other languages (th "เมืองแนะนำ:", es "Ciudades populares:", etc.).
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type Place,
  type Weather,
  type WeatherUnit,
  fetchWeather,
  aqiCategory,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";

interface CityComparisonProps {
  favorites: Place[];
  currentPlace: Place;
  unit: WeatherUnit;
  onSelectPlace: (place: Place) => void;
}

interface CityWeatherEntry {
  place: Place;
  weather: Weather | null;
  loading: boolean;
  error?: string;
}

// FIXED BUG 1: COMPARISON_I18N deleted. Texts come from locales/*.json via t().
// Fallbacks are the English values, so missing keys show English, not blank.
function useComparisonTexts(t: (key: string, fallback: string) => string) {
  return {
    title: t("compare_title", "City Comparison Hub"),
    subtitle: t("compare_subtitle", "Compare live weather & air quality across your favorite destinations"),
    bestWeather: t("compare_best_weather", "☀ Best Weather"),
    cleanAir: t("compare_cleanest_air", "🍃 Cleanest Air"),
    activeCity: t("compare_viewing_now", "Viewing Now"),
    viewCity: t("compare_view_city", "View Weather"),
    noFavorites: t("compare_no_favorites", "No Favorite Cities Added Yet"),
    noFavoritesDesc: t(
      "compare_no_favorites_desc",
      "Tap the heart ❤ on any city to compare live weather conditions side-by-side."
    ),
    tryCities: t("compare_try_cities", "Quick add popular cities:"),
    refreshAll: t("compare_refresh", "Refresh Comparison"),
    humidity: t("compare_humidity", "Humidity"),
    wind: t("compare_wind", "Wind"),
    feelsLike: t("compare_feels", "Feels"),
    highLow: t("compare_high_low", "H / L"),
    aqi: t("compare_aqi", "AQI"),
    unavailable: t("compare_unavailable", "Weather Unavailable"),
  };
}

const SUGGESTED_CITIES: Place[] = [
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853 },
];

// FIXED BUG 5: Same place = same lat/lon within 0.1, not just same name.
function isSamePlace(a: Place, b: Place): boolean {
  return Math.abs(a.lat - b.lat) < 0.1 && Math.abs(a.lon - b.lon) < 0.1;
}

// FIXED BUG 5: Stable key — name + lat + lon. Two "Paris" no longer share a key.
function placeKey(p: Place): string {
  return `${p.name}-${p.lat.toFixed(4)}-${p.lon.toFixed(4)}`;
}

// FIXED BUG 2: Score = code penalty + comfort penalty. Lower is better.
function weatherScore(code: number, tempC: number): number {
  let codePenalty: number;
  if (code <= 1) codePenalty = 0; // clear / mainly clear
  else if (code === 2) codePenalty = 1; // partly cloudy
  else if (code === 3) codePenalty = 2; // overcast
  else if (code === 45 || code === 48) codePenalty = 3; // fog
  else if (code >= 51 && code <= 57) codePenalty = 4; // drizzle
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) codePenalty = 5; // rain / showers
  else if (code >= 71 && code <= 77) codePenalty = 6; // snow
  else if (code >= 95) codePenalty = 7; // thunderstorm
  else codePenalty = 3; // unknown code
  const comfortPenalty = Math.abs(tempC - 22) / 5; // 22C is ideal; 5C off = 1 point
  return codePenalty + comfortPenalty;
}

// FIXED BUG 3: Real AQI, or PM2.5*3 estimate (same estimate as old code), or undefined.
// No-data cities return undefined and are skipped for Cleanest Air — not fake 50.
function estimatedAqi(weather: Weather | null): number | undefined {
  if (!weather?.current) return undefined;
  const aqi = weather.current.aqi;
  if (typeof aqi === "number" && Number.isFinite(aqi)) return aqi;
  const pm25 = weather.current.pm25;
  if (typeof pm25 === "number" && Number.isFinite(pm25)) return Math.round(pm25 * 3);
  return undefined;
}

export const CityComparison: React.FC<CityComparisonProps> = ({
  favorites,
  currentPlace,
  unit,
  onSelectPlace,
}) => {
  const { t, i18n } = useTranslation();
  const texts = useComparisonTexts(t);
  const lang = i18n.language?.toLowerCase().split("-")[0] || "en";

  const [entries, setEntries] = useState<CityWeatherEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // FIXED BUG 4: Request id — stale loads are ignored.
  const requestIdRef = useRef(0);

  // Load weather for all favorites
  const loadAllWeather = async (placesToLoad: Place[], force = false) => {
    const requestId = ++requestIdRef.current;

    // FIXED BUG 9: Dedupe by lat/lon before fetching.
    const seen = new Map<string, Place>();
    for (const p of placesToLoad) {
      const k = `${p.lat.toFixed(4)}|${p.lon.toFixed(4)}`;
      if (!seen.has(k)) seen.set(k, p);
    }
    const deduped = [...seen.values()];

    setIsRefreshing(true);
    const initial = deduped.map((p) => ({
      place: p,
      weather: null,
      loading: true,
    }));
    setEntries(initial);

    const updated = await Promise.all(
      deduped.map(async (p) => {
        try {
          const w = await fetchWeather(p, unit, force);
          return { place: p, weather: w, loading: false };
        } catch {
          // FIXED BUG 7: Translated error, not hardcoded "Unavailable".
          return { place: p, weather: null, loading: false, error: texts.unavailable };
        }
      })
    );

    // FIXED BUG 4: If a newer load started, ignore this stale result.
    if (requestIdRef.current !== requestId) return;
    setEntries(updated);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (favorites.length > 0) {
      loadAllWeather(favorites);
    } else {
      setEntries([]);
    }
    // FIXED BUG 4: Invalidate in-flight loads on unmount / favorites change.
    return () => {
      requestIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, unit]);

  // Identify Best Weather (lowest score) & Cleanest Air (lowest real AQI)
  let bestWeatherPlace: Place | null = null;
  let bestScore = Infinity;
  let cleanestAirPlace: Place | null = null;
  let lowestAqi = Infinity;

  entries.forEach((e) => {
    if (!e.weather?.current) return;

    // FIXED BUG 2: Score, not first-clear.
    const tempC =
      unit === "imperial"
        ? ((e.weather.current.temp - 32) * 5) / 9
        : e.weather.current.temp;
    const score = weatherScore(e.weather.current.code, tempC);
    if (score < bestScore) {
      bestScore = score;
      bestWeatherPlace = e.place;
    }

    // FIXED BUG 3: Lowest REAL AQI wins, even if >= 45. No-data skipped.
    const aqi = estimatedAqi(e.weather);
    if (aqi !== undefined && aqi < lowestAqi) {
      lowestAqi = aqi;
      cleanestAirPlace = e.place;
    }
  });

  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? "mph" : "km/h";

  if (favorites.length === 0) {
    return (
      <section className="p-5 rounded-3xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{texts.title}</h3>
            <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
          </div>
        </div>

        <div className="py-6 px-4 rounded-2xl bg-muted/30 border border-border/40 text-center space-y-2">
          <span className="text-3xl block">❤</span>
          <h4 className="text-xs font-bold text-foreground">{texts.noFavorites}</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {texts.noFavoritesDesc}
          </p>

          <div className="pt-3">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
              {texts.tryCities}
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTED_CITIES.map((c) => (
                <button
                  key={placeKey(c)}
                  type="button"
                  // NOTE: This only VIEWS the city. User then taps ❤ to add it to favorites.
                  onClick={() => onSelectPlace(c)}
                  title={getLocalizedCity(c.name, lang)}
                  className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 hover:bg-muted font-medium text-foreground transition cursor-pointer active:scale-95"
                >
                  📍 {getLocalizedCity(c.name, lang)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">{texts.title}</h3>
            <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAllWeather(favorites, true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer active:scale-95 disabled:opacity-50"
          title={texts.refreshAll}
        >
          <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
          <span className="hidden sm:inline">{texts.refreshAll}</span>
        </button>
      </div>

      {/* Comparison Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map(({ place, weather, loading, error }) => {
          // FIXED BUG 5: Check BOTH lat and lon, not lat only.
          const isCurrent = isSamePlace(place, currentPlace);

          // FIXED BUG 5: Badge matching by lat/lon, not name.
          const isBestWeather = bestWeatherPlace ? isSamePlace(bestWeatherPlace, place) : false;
          const isCleanestAir = cleanestAirPlace ? isSamePlace(cleanestAirPlace, place) : false;

          const localizedCity = getLocalizedCity(place.name, lang);
          const localizedCountry = getLocalizedCountry(place.country, lang);

          if (loading) {
            return (
              <div
                key={placeKey(place)}
                className="p-4 rounded-2xl bg-muted/20 border border-border/40 animate-pulse flex flex-col justify-between min-h-[160px]"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-muted/60 rounded-sm w-3/4" />
                  <div className="h-3 bg-muted/40 rounded-sm w-1/2" />
                </div>
                <div className="h-10 bg-muted/50 rounded-xl mt-4" />
              </div>
            );
          }

          if (!weather?.current) {
            return (
              <div
                key={placeKey(place)}
                className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-center flex flex-col items-center justify-center min-h-[160px]"
              >
                <span className="text-xl mb-1">⚠</span>
                <span className="text-xs font-bold text-foreground">{localizedCity}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {/* FIXED BUG 7: Translated, not hardcoded "Weather Unavailable". */}
                  {error || texts.unavailable}
                </span>
              </div>
            );
          }

          const temp = Math.round(weather.current.temp);
          const feelsLike = Math.round(weather.current.feels ?? weather.current.temp);
          const todayDaily = weather.daily[0];
          const maxTemp = todayDaily ? Math.round(todayDaily.max) : temp;
          const minTemp = todayDaily ? Math.round(todayDaily.min) : temp;
          const humidity = weather.current.humidity ?? "--";
          const windSpeed = Math.round(weather.current.wind_speed ?? 0);

          // FIXED BUG 3: Consistent AQI estimate — same pm25*3 as cleanest calculation.
          const aqiVal = estimatedAqi(weather);
          // FIXED BUG 6: Pass t so aqiCategory label is translated if shown.
          const aqiCat = aqiVal !== undefined ? aqiCategory(aqiVal, t) : null;

          return (
            <div
              key={placeKey(place)}
              className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                isCurrent
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : "bg-card/70 border-border/50 hover:border-border hover:bg-card"
              }`}
            >
              {/* Badges Bar — FIXED BUG 10: Show ALL applicable badges, not just one. */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                      ✓ {texts.activeCity}
                    </span>
                  )}
                  {isBestWeather && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {texts.bestWeather}
                    </span>
                  )}
                  {isCleanestAir && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {texts.cleanAir}
                    </span>
                  )}
                  {!isCurrent && !isBestWeather && !isCleanestAir && (
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                      {localizedCountry}
                    </span>
                  )}
                </div>

                {/* AQI Pill */}
                {aqiVal !== undefined && aqiCat && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${aqiCat.color} ${aqiCat.bg}`}
                    title={`${texts.aqi} ${aqiVal}`}
                  >
                    {/* FIXED BUG 6: Use translated AQI label, not hardcoded "AQI". */}
                    {texts.aqi} {aqiVal}
                  </span>
                )}
              </div>

              {/* City Title & Main Temperature */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-black text-foreground tracking-tight leading-snug">
                    {localizedCity}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {/* FIXED BUG 6: Show H/L label, not just arrows. */}
                    {texts.feelsLike} {feelsLike}{tempUnitStr} • {texts.highLow} ↑{maxTemp}° ↓{minTemp}°
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <WeatherIcon
                    code={weather.current.code}
                    isDay={weather.current.is_day}
                    className="w-9 h-9 shrink-0 drop-shadow-xs"
                  />
                  <div className="text-2xl font-black text-foreground">
                    {temp}
                    <span className="text-xs font-semibold text-primary ml-0.5">
                      {tempUnitStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Metrics — FIXED BUG 6: Show Humidity / Wind labels, not just icons. */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/40 text-[11px]">
                <div className="flex items-center gap-1 text-muted-foreground" title={texts.humidity}>
                  <span>💧</span>
                  <span>{texts.humidity}</span>
                  <span className="font-semibold text-foreground">{humidity}%</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground" title={texts.wind}>
                  <span>💨</span>
                  <span>{texts.wind}</span>
                  <span className="font-semibold text-foreground">
                    {windSpeed} {speedUnitStr}
                  </span>
                </div>
              </div>

              {/* 1-Tap Switcher Button */}
              <button
                type="button"
                onClick={() => onSelectPlace(place)}
                // FIXED BUG 8: Actually disabled for current city, not just styled as disabled.
                disabled={isCurrent}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 text-center ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                }`}
              >
                {isCurrent ? texts.activeCity : texts.viewCity}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CityComparison;
