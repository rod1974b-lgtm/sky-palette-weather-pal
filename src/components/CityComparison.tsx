// src/components/CityComparison.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  type Place,
  type Weather,
  type WeatherUnit,
  fetchWeather,
  aqiCategory,
  isSamePlace,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";

export interface CityComparisonProps {
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

const SUGGESTED_CITIES: Place[] = [
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853 },
];

function scoreWeather(w: Weather, unit: WeatherUnit): number {
  const code = w.current.code;
  let score: number;
  if (code === 0) score = 100;
  else if (code === 1) score = 90;
  else if (code === 2) score = 75;
  else if (code === 3) score = 60;
  else if (code >= 45 && code <= 48) score = 40;
  else if (code >= 51 && code <= 57) score = 30;
  else if (code >= 61 && code <= 67) score = 20;
  else if (code >= 71 && code <= 77) score = 20;
  else if (code >= 80 && code <= 82) score = 25;
  else if (code === 85 || code === 86) score = 20;
  else if (code >= 95) score = 10;
  else score = 50;

  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  if (tempC >= 18 && tempC <= 26) score += 20;
  else if (tempC >= 15 && tempC <= 30) score += 10;
  else if (tempC < 0 || tempC > 35) score -= 20;

  const humidity = w.current.humidity;
  if (typeof humidity === "number" && humidity > 80) score -= 10;
  const wind = w.current.wind_speed ?? w.current.wind;
  const windKmh = typeof wind === "number" ? (unit === "imperial" ? wind * 1.60934 : wind) : 0;
  if (windKmh > 40) score -= 10;

  return score;
}

export function CityComparison({ favorites, currentPlace, unit, onSelectPlace }: CityComparisonProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";

  const texts = {
    title: t("compare_title", "City Comparison Hub"),
    subtitle: t("compare_subtitle", "Compare live weather & air quality across your favorite destinations"),
    bestWeather: t("compare_best_weather", "☀ Best Weather"),
    cleanAir: t("compare_cleanest_air", "🍃 Cleanest Air"),
    activeCity: t("compare_viewing_now", "Viewing Now"),
    viewCity: t("compare_view_city", "View Weather"),
    noFavorites: t("compare_no_favorites", "No Favorite Cities Added Yet"),
    noFavoritesDesc: t(
      "compare_no_favorites_desc",
      "Tap the heart ❤ on any city to compare live weather conditions side-by-side.",
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

  const [entries, setEntries] = useState<CityWeatherEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAllWeather = useCallback(
    async (placesToLoad: Place[], force = false) => {
      const requestId = ++requestIdRef.current;
      setIsRefreshing(true);
      setEntries(placesToLoad.map((p) => ({ place: p, weather: null, loading: true })));

      const updated = await Promise.all(
        placesToLoad.map(async (p) => {
          try {
            const w = await fetchWeather(p, unit, force);
            return { place: p, weather: w, loading: false };
          } catch {
            return { place: p, weather: null, loading: false, error: texts.unavailable };
          }
        }),
      );

      if (requestIdRef.current !== requestId) return;
      if (!mountedRef.current) return;
      setEntries(updated);
      setIsRefreshing(false);
    },
    [unit, texts.unavailable],
  );

  useEffect(() => {
    if (favorites.length > 0) {
      void loadAllWeather(favorites);
    } else {
      setEntries([]);
    }
  }, [favorites, loadAllWeather]);

  let bestWeatherPlace: Place | null = null;
  let bestScore = -Infinity;
  let cleanestAirPlace: Place | null = null;
  let lowestAqi = Infinity;

  entries.forEach((e) => {
    if (!e.weather?.current) return;
    const score = scoreWeather(e.weather, unit);
    if (score > bestScore) {
      bestScore = score;
      bestWeatherPlace = e.place;
    }
    const aqi = e.weather.current.aqi;
    if (typeof aqi === "number" && Number.isFinite(aqi) && aqi < lowestAqi) {
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
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">{texts.noFavoritesDesc}</p>

          <div className="pt-3">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-2">{texts.tryCities}</span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTED_CITIES.map((c) => (
                <button
                  key={`${c.name}-${c.lat}-${c.lon}`}
                  type="button"
                  onClick={() => onSelectPlace(c)}
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
          onClick={() => void loadAllWeather(favorites, true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer active:scale-95 disabled:opacity-50"
          title={texts.refreshAll}
        >
          <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
          <span className="hidden sm:inline">{texts.refreshAll}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map(({ place, weather, loading, error }) => {
          const isCurrent = isSamePlace(place, currentPlace);
          const isBestWeather = bestWeatherPlace ? isSamePlace(bestWeatherPlace, place) : false;
          const isCleanestAir =
            cleanestAirPlace && isSamePlace(cleanestAirPlace, place) && Number.isFinite(lowestAqi) && lowestAqi <= 50;

          const localizedCity = getLocalizedCity(place.name, lang);
          const localizedCountry = getLocalizedCountry(place.country, lang);
          const key = `${place.name}-${place.lat}-${place.lon}`;

          if (loading) {
            return (
              <div
                key={key}
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
                key={key}
                className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-center flex flex-col items-center justify-center min-h-[160px]"
              >
                <span className="text-xl mb-1">⚠</span>
                <span className="text-xs font-bold text-foreground">{localizedCity}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{error || texts.unavailable}</span>
              </div>
            );
          }

          const temp = Math.round(weather.current.temp);
          const feelsLike = Math.round(weather.current.feels ?? weather.current.temp);
          const todayDaily = weather.daily?.[0];
          const maxTemp = todayDaily ? Math.round(todayDaily.max) : temp;
          const minTemp = todayDaily ? Math.round(todayDaily.min) : temp;
          const humidity: number | null =
            typeof weather.current.humidity === "number" && Number.isFinite(weather.current.humidity)
              ? weather.current.humidity
              : null;
          const windSpeed = Math.round(weather.current.wind_speed ?? 0);
          const aqiVal = weather.current.aqi;
          const aqiCat =
            typeof aqiVal === "number" && Number.isFinite(aqiVal) ? aqiCategory(aqiVal, t) : null;

          return (
            <div
              key={key}
              className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                isCurrent
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : "bg-card/70 border-border/50 hover:border-border hover:bg-card"
              }`}
            >
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

                {aqiVal !== undefined && aqiCat && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${aqiCat.color} ${aqiCat.bg}`}
                    title={`${texts.aqi} ${aqiVal} — ${aqiCat.label}`}
                  >
                    {texts.aqi} {aqiVal} • {aqiCat.label}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-black text-foreground tracking-tight leading-snug">{localizedCity}</h4>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {texts.feelsLike} {feelsLike}
                    {tempUnitStr} • ↑{maxTemp}° ↓{minTemp}°
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <WeatherIcon code={weather.current.code} isDay={weather.current.is_day ?? 1} className="w-9 h-9 shrink-0 drop-shadow-xs" />
                  <div className="text-2xl font-black text-foreground">
                    {temp}
                    <span className="text-xs font-semibold text-primary ml-0.5">{tempUnitStr}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/40 text-[11px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>💧</span>
                  <span className="font-semibold text-foreground">
                    {humidity !== null ? `${humidity}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>💨</span>
                  <span className="font-semibold text-foreground">
                    {windSpeed} {speedUnitStr}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectPlace(place)}
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
}

export default CityComparison;
