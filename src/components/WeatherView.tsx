// src/components/WeatherView.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { TFunction } from "i18next";
import { type Weather, type WeatherUnit } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import { getAllAvailableArtworks } from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";
import { getWallpaperItem, setWallpaperItem, migrateLegacyLocalStorage } from "@/lib/wallpaperStorage";
import { WeatherMascot } from "@/components/WeatherMascot";
import { AstronomyTracker } from "@/components/AstronomyTracker";
import { WeatherRadar } from "@/components/WeatherRadar";
import { WeatherPostcardModal } from "@/components/WeatherPostcardModal";
import { OutdoorActivityPlanner } from "@/components/OutdoorActivityPlanner";
import { WeatherAlertWatcher } from "@/components/WeatherAlertWatcher";
import { WeatherGuideModal, type GuideTopic } from "@/components/WeatherGuideModal";
import { ForecastDetailModal } from "@/components/ForecastDetailModal";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";

export interface TickerAlertItem {
  id: string;
  text?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  tag?: string;
  tagKey?: string;
  category?: string;
  source?: string;
  headline?: string;
  headlineTh?: string;
  headlineEn?: string;
  urgency?: string;
  timeAgo?: string;
  updatedAt?: string;
  title?: string;
  desc?: string;
  url?: string;
  event?: string;
}

export interface WeatherViewProps {
  weather: Weather;
  unit: WeatherUnit;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onSelectBackground?: (url: string | null) => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string | undefined;
}

function getConditionLabel(code: number, t: TFunction): string {
  if (code === 0) return t("cond_clear", "Clear Sky");
  if (code === 1) return t("cond_mostly_clear", "Mainly Clear");
  if (code === 2) return t("cond_partly_cloudy", "Partly Cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code >= 45 && code <= 48) return t("cond_foggy", "Foggy");
  if (code >= 51 && code <= 55) return t("cond_drizzle", "Drizzle");
  if (code === 56 || code === 57) return t("cond_freezing_drizzle", "Freezing Drizzle");
  if (code >= 61 && code <= 65) return t("cond_rain", "Rain");
  if (code === 66 || code === 67) return t("cond_freezing_rain", "Freezing Rain");
  if (code >= 71 && code <= 77) return t("cond_snow", "Snow");
  if (code >= 80 && code <= 82) return t("cond_showers", "Rain Showers");
  if (code === 85 || code === 86) return t("cond_snow_showers", "Snow Showers");
  if (code >= 95) return t("cond_thunderstorm", "Thunderstorm");
  return t("cond_clear", "Clear");
}

function getAirQualityInfo(
  aqi: number | undefined,
  pm25: number | undefined,
  t: TFunction,
): { label: string; color: string; display: string } | null {
  if (typeof aqi === "number" && Number.isFinite(aqi)) {
    if (aqi <= 50) return { label: t("aqi_good", "Good"), color: "text-emerald-500", display: String(Math.round(aqi)) };
    if (aqi <= 100) return { label: t("aqi_moderate", "Moderate"), color: "text-amber-500", display: String(Math.round(aqi)) };
    if (aqi <= 150) return { label: t("aqi_sensitive", "Unhealthy (Sensitive)"), color: "text-orange-500", display: String(Math.round(aqi)) };
    if (aqi <= 200) return { label: t("aqi_unhealthy", "Unhealthy"), color: "text-red-500", display: String(Math.round(aqi)) };
    if (aqi <= 300) return { label: t("aqi_very_unhealthy", "Very Unhealthy"), color: "text-purple-500", display: String(Math.round(aqi)) };
    return { label: t("aqi_hazardous", "Hazardous"), color: "text-purple-700", display: String(Math.round(aqi)) };
  }
  if (typeof pm25 === "number" && Number.isFinite(pm25)) {
    const v = Math.round(pm25);
    if (v <= 12) return { label: t("aqi_good", "Good"), color: "text-emerald-500", display: String(v) };
    if (v <= 35.4) return { label: t("aqi_moderate", "Moderate"), color: "text-amber-500", display: String(v) };
    if (v <= 55.4) return { label: t("aqi_sensitive", "Unhealthy (Sensitive)"), color: "text-orange-500", display: String(v) };
    if (v <= 150.4) return { label: t("aqi_unhealthy", "Unhealthy"), color: "text-red-500", display: String(v) };
    if (v <= 250.4) return { label: t("aqi_very_unhealthy", "Very Unhealthy"), color: "text-purple-500", display: String(v) };
    return { label: t("aqi_hazardous", "Hazardous"), color: "text-purple-700", display: String(v) };
  }
  return null;
}

function getDayName(dateStr: string, t: TFunction): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return dateStr;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(month) || !Number.isFinite(d)) return dateStr;
  const dayIndex = new Date(y, month - 1, d).getDay();
  const keys = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"] as const;
  const fallbacks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const key = keys[dayIndex] ?? "day_sun";
  const fallback = fallbacks[dayIndex] ?? dateStr;
  return t(key, fallback);
}

function formatHourLabel(timeStr: string, locale: string | undefined): string {
  const m = /T(\d{2}):(\d{2})/.exec(timeStr);
  if (!m) return timeStr;
  const hour = Number(m[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return timeStr;
  try {
    return new Date(2000, 0, 1, hour, 0).toLocaleTimeString(locale || undefined, { hour: "numeric" });
  } catch {
    return `${hour}:00`;
  }
}

function isRainyCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function isSnowyCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

export function WeatherView({
  weather,
  unit,
  onRefresh,
  isRefreshing,
  isFavorite = false,
  onToggleFavorite,
  onSelectBackground = () => {},
  activeAlerts = [],
  customBgUrl,
}: WeatherViewProps) {
  const { t, i18n } = useTranslation();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);

  const [clothingFilter, setClothingFilter] = useState<"all" | "casual" | "active" | "formal">("all");
  const [currentBgUrl, setCurrentBgUrl] = useState<string>("");

  const w = weather;
  const isMetric = unit === "metric";
  const tempUnit = isMetric ? "°C" : "°F";
  const windUnit = isMetric ? "km/h" : "mph";

  useEffect(() => {
    try {
      migrateLegacyLocalStorage();
    } catch {}
  }, []);

  const bgRequestRef = useRef(0);
  const loadActiveBackground = useCallback(async () => {
    const requestId = ++bgRequestRef.current;
    const placeName = w.place.name;
    try {
      const perCity =
        (await getWallpaperItem(placeName)) ||
        (await getWallpaperItem(`weather:custom-bg:${placeName.toLowerCase().trim()}`)) ||
        (await getWallpaperItem("weather:custom-bg:current"));
      if (bgRequestRef.current !== requestId) return;
      if (perCity) {
        setCurrentBgUrl(perCity);
        return;
      }
      if (customBgUrl) {
        setCurrentBgUrl(customBgUrl);
        return;
      }
      const artworks = getAllAvailableArtworks(placeName, w.current.code);
      if (bgRequestRef.current !== requestId) return;
      setCurrentBgUrl(artworks[0] || "");
    } catch {
      if (bgRequestRef.current !== requestId) return;
      try {
        const artworks = getAllAvailableArtworks(placeName, w.current.code);
        setCurrentBgUrl(artworks[0] || "");
      } catch {
        setCurrentBgUrl("");
      }
    }
  }, [w.place.name, w.current.code, customBgUrl]);

  useEffect(() => {
    void loadActiveBackground();
  }, [loadActiveBackground]);

  const fallbackArtworks = useMemo(
    () => getAllAvailableArtworks(w.place.name, w.current.code),
    [w.place.name, w.current.code],
  );
  const displayBg = currentBgUrl || fallbackArtworks[0] || "";
  const canCycleArtwork = fallbackArtworks.length > 1;

  const handleNextArtwork = async () => {
    const artworks = getAllAvailableArtworks(w.place.name, w.current.code);
    if (!artworks || artworks.length <= 1) return;
    const curIdx = artworks.indexOf(displayBg);
    const nextIdx = (curIdx + 1) % artworks.length;
    const nextUrl = artworks[nextIdx] || artworks[0]!;
    setCurrentBgUrl(nextUrl);
    try {
      await setWallpaperItem(w.place.name, nextUrl);
    } catch (e) {
      console.error("Failed to save wallpaper:", e);
    }
  };

  const handleApplyArtwork = async (url: string) => {
    setCurrentBgUrl(url);
    onSelectBackground(url);
    try {
      await setWallpaperItem(w.place.name, url);
    } catch (e) {
      console.error("Failed to save wallpaper:", e);
    }
  };

  const openGuide = (topic: GuideTopic = "all") => {
    setGuideTopic(topic);
    setGuideOpen(true);
  };

  const openForecastDetail = (type: "hourly" | "daily", index: number) => {
    setForecastModalType(type);
    setForecastModalIndex(index);
    setForecastModalOpen(true);
  };

  const uvVal = Math.round(w.current?.uvIndex ?? w.current?.uv ?? 0);
  const humidityVal = w.current?.humidity ?? 0;
  const windVal = Math.round(w.current?.wind_speed ?? w.current?.wind ?? 0);
  const pressureVal = Math.round(w.current?.pressure ?? 1013);
  const visibilityKm = w.current?.vis ?? 10;
  const visibilityVal = isMetric ? Math.round(visibilityKm) : Math.round(visibilityKm * 0.621371);
  const visibilityUnit = isMetric ? "km" : "mi";
  const aqiInfo = getAirQualityInfo(w.current?.aqi, w.current?.pm25, t);

  const currentTempC = isMetric ? w.current.temp : ((w.current.temp - 32) * 5) / 9;
  const isRainy = isRainyCode(w.current.code);
  const isSnowy = isSnowyCode(w.current.code);

  const topTitle =
    clothingFilter === "active"
      ? currentTempC > 26
        ? t("wear_active_light", "Light Athletic Tee & Shorts")
        : currentTempC > 18
          ? t("wear_active_layer", "Breathable Active Layers")
          : currentTempC > 10
            ? t("wear_active_jacket", "Insulated Training Jacket")
            : t("wear_active_heavy", "Thermal Training Layers")
      : clothingFilter === "formal"
        ? currentTempC > 26
          ? t("wear_formal_light", "Linen Suit / Light Blazer")
          : currentTempC > 18
            ? t("wear_formal_layer", "Smart Layered Casual")
            : currentTempC > 10
              ? t("wear_formal_jacket", "Wool Coat & Tailored Layers")
              : t("wear_formal_heavy", "Heavy Overcoat & Suit Layers")
        : currentTempC > 26
          ? t("wear_breathable", "Light & Breathable Clothing")
          : currentTempC > 18
            ? t("wear_layer", "Comfortable Light Layers")
            : currentTempC > 10
              ? t("wear_jacket", "Warm Jacket & Sweater")
              : t("wear_heavy_coat", "Heavy Winter Coat & Thermals");

  const topDesc =
    currentTempC > 26
      ? t("wear_desc_hot", "Cotton tees, linen shirts, or shorts keep you cool.")
      : t("wear_desc_cool", "A light cardigan or windbreaker is advised.");

  const accessoryTitle = isSnowy
    ? t("wear_snow_gear", "Snow Boots & Warm Gloves")
    : isRainy
      ? t("wear_umbrella", "Umbrella & Waterproof Footwear")
      : uvVal > 5
        ? t("wear_sun_protect", "Sun Hat & UV Sunglasses")
        : t("wear_comfortable", "Comfortable Walking Shoes");
  const accessoryDesc = isSnowy
    ? t("wear_desc_snow", "Snow detected. Wear insulated, waterproof footwear.")
    : isRainy
      ? t("wear_desc_rain", "Wet conditions detected. Pack a compact umbrella.")
      : t("wear_desc_sun", "Protect skin and eyes during peak midday sunlight.");
  const accessoryIcon = isSnowy ? "🧤" : isRainy ? "☂" : uvVal > 5 ? "🧢" : "🕶";

  return (
    <div className="w-full space-y-5">
      {w.isStale && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2" role="status">
          <span>📶</span>
          <span>{t("offline_cached", "Offline — showing cached weather. Pull to refresh when back online.")}</span>
        </div>
      )}

      {/* 1. SEVERE WEATHER ALERT WATCHER & LIVE TICKER */}
      <WeatherAlertWatcher weather={w} unit={unit} activeAlerts={activeAlerts} />

      {/* 2. ARTWORK & QUICK CONTROLS TOOLBAR */}
      <section className="p-3 sm:p-4 rounded-2xl bg-card/90 border border-border/80 shadow-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleNextArtwork()}
              disabled={!canCycleArtwork}
              title={canCycleArtwork ? t("btn_change_artwork", "Next Artwork") : t("single_artwork", "Only one artwork available")}
              className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🖼</span>
              <span>{t("btn_change_artwork", "Next Artwork")}</span>
            </button>

            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="h-9 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-bold hover:brightness-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🎨</span>
              <span>{t("gallery_title", "AI Studio & Slots")}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={t("refresh_weather", "Refresh Weather")}
                className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-border/50 disabled:opacity-50"
              >
                <span className={`text-sm ${isRefreshing ? "animate-spin inline-block" : ""}`}>🔄</span>
                <span className="hidden sm:inline text-xs">{t("refresh", "Refresh")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPostcardOpen(true)}
              className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-border/50"
            >
              <span>📮</span>
              <span className="hidden sm:inline text-xs">{t("nav_postcard", "Postcard")}</span>
            </button>

            <button
              type="button"
              onClick={() => openGuide("all")}
              className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-border/50"
            >
              <span>📖</span>
              <span className="text-xs">{t("guide_button", "Guide")}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. HERO WALLPAPER CARD */}
      <section className="relative w-full aspect-16/9 sm:aspect-21/9 rounded-3xl overflow-hidden border border-border/60 shadow-md bg-muted select-none">
        {displayBg ? (
          <img src={displayBg} alt={w.place.name} className="w-full h-full object-cover object-center transition-all duration-700 ease-out" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600" />
        )}
      </section>

      {/* 4. CURRENT WEATHER CONDITIONS & METRICS */}
      <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{getLocalizedCity(w.place.name, i18n.language)}</span>
              {w.place.country && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                  {getLocalizedCountry(w.place.country, i18n.language)}
                </span>
              )}
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? t("remove_favorite", "Remove from favorites") : t("add_favorite", "Add to favorites")}
                  aria-pressed={isFavorite}
                  title={isFavorite ? t("remove_favorite", "Remove from favorites") : t("add_favorite", "Add to favorites")}
                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-base transition cursor-pointer border ${
                    isFavorite ? "bg-amber-500/20 border-amber-500/50 text-amber-500" : "bg-muted border-border/50 text-muted-foreground hover:text-amber-500"
                  }`}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">{getConditionLabel(w.current.code, t)}</p>
          </div>

          <button
            type="button"
            onClick={() => openGuide("all")}
            className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition border border-border/50 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>💡</span>
            <span>{t("label_unit_guide", "Explain Units")}</span>
          </button>
        </div>

        <div className="flex items-center justify-between py-2 border-y border-border/40">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">{Math.round(w.current.temp)}</span>
            <span className="text-xl sm:text-2xl font-semibold text-muted-foreground">{tempUnit}</span>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <WeatherIcon code={w.current.code} isDay={w.current.is_day ?? 1} className="w-full h-full drop-shadow-md" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <button type="button" onClick={() => openGuide("humidity")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_humidity", "Humidity")}</span>
              <span>💧</span>
            </div>
            <span className="text-lg font-bold text-foreground">{humidityVal}%</span>
          </button>

          <button type="button" onClick={() => openGuide("wind")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_wind", "Wind")}</span>
              <span>💨</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {windVal} <span className="text-xs font-normal">{windUnit}</span>
            </span>
          </button>

          <button type="button" onClick={() => openGuide("uv")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_uv", "UV Index")}</span>
              <span>☀</span>
            </div>
            <span className="text-lg font-bold text-foreground">{uvVal}</span>
          </button>

          <button type="button" onClick={() => openGuide("aqi")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_aqi", "Air Quality")}</span>
              <span>🍃</span>
            </div>
            <div className="flex items-baseline gap-1">
              {aqiInfo ? (
                <>
                  <span className="text-lg font-bold text-foreground">{aqiInfo.display}</span>
                  <span className={`text-[10px] font-bold ${aqiInfo.color}`}>{aqiInfo.label}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-muted-foreground">—</span>
              )}
            </div>
          </button>

          <button type="button" onClick={() => openGuide("pressure")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_pressure", "Pressure")}</span>
              <span>⏱</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {pressureVal} <span className="text-xs font-normal">hPa</span>
            </span>
          </button>

          <button type="button" onClick={() => openGuide("conditions")} className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_visibility", "Visibility")}</span>
              <span>👁</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {visibilityVal} <span className="text-xs font-normal">{visibilityUnit}</span>
            </span>
          </button>
        </div>
      </section>

      {/* 5. WEATHER MASCOT BUDDIES */}
      <WeatherMascot weather={w} />

      {/* 6. HOURLY FORECAST */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>⏱</span>
            <span>{t("hourly_forecast", "Hourly Forecast (Tap for Details)")}</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">{t("hours_24", "24 Hours")}</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {(w.hourly || []).slice(0, 24).map((h, idx) => {
            const timeLabel = formatHourLabel(h.time, i18n.language || undefined);
            return (
              <button
                key={h.time || idx}
                type="button"
                onClick={() => openForecastDetail("hourly", idx)}
                className="flex-shrink-0 w-20 p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/80 border border-border/40 flex flex-col items-center justify-between gap-1.5 cursor-pointer active:scale-95 transition text-center"
              >
                <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">{timeLabel}</span>
                <div className="w-8 h-8 flex items-center justify-center my-0.5">
                  <WeatherIcon code={h.code} isDay={h.is_day ?? 1} className="w-full h-full" />
                </div>
                <span className="text-sm font-bold text-foreground">{Math.round(h.temp)}°</span>
                <span className="text-[9px] text-muted-foreground text-center line-clamp-1">{getConditionLabel(h.code, t)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY EXTENDED FORECAST */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>📅</span>
            <span>{t("daily_forecast", "7-Day Extended Forecast")}</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">{t("tap_any_day", "Tap any day for details")}</span>
        </div>

        <div className="space-y-1.5">
          {(w.daily || []).map((d, idx) => (
            <button
              key={d.date || idx}
              type="button"
              onClick={() => openForecastDetail("daily", idx)}
              className="w-full flex items-center justify-between p-2.5 sm:px-4 rounded-2xl bg-muted/20 hover:bg-muted/60 border border-border/30 transition cursor-pointer active:scale-[0.98] text-left"
            >
              <div className="w-14 sm:w-20 font-bold text-sm text-foreground">{idx === 0 ? t("today", "Today") : getDayName(d.date, t)}</div>
              <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                  <WeatherIcon code={d.code} isDay={1} className="w-full h-full" />
                </div>
                <span className="text-xs text-muted-foreground truncate">{getConditionLabel(d.code, t)}</span>
              </div>
              <div className="text-xs font-semibold text-sky-500 w-12 text-center">
                {(d.precipProbMax ?? d.pop ?? 0) > 0 ? `${Math.round(d.precipProbMax ?? d.pop ?? 0)}%` : ""}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold justify-end w-20 text-right">
                <span className="text-foreground">{Math.round(d.max)}°</span>
                <span className="text-muted-foreground font-normal">{Math.round(d.min)}°</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 8. WHAT TO WEAR */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear Today")}</span>
          </h3>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
            {(["all", "casual", "active", "formal"] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setClothingFilter(filterKey)}
                aria-pressed={clothingFilter === filterKey}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                  clothingFilter === filterKey ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`filter_${filterKey}`, filterKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3">
            <span className="text-2xl">🧥</span>
            <div>
              <span className="text-xs font-bold text-foreground block">{topTitle}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{topDesc}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3">
            <span className="text-2xl">{accessoryIcon}</span>
            <div>
              <span className="text-xs font-bold text-foreground block">{accessoryTitle}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{accessoryDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 10. RAIN RADAR (Loads centered on active coordinates, no city button) */}
      <WeatherRadar weather={w} lat={w.place.lat} lon={w.place.lon} cityName={w.place.name} />

      {/* 11. SUN & MOON TRACKER */}
      <AstronomyTracker lat={w.place.lat} lon={w.place.lon} />

      {/* MODALS */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          currentPlace={w.place}
          onApplyBackground={handleApplyArtwork}
        />
      )}

      {postcardOpen && (
        <WeatherPostcardModal
          isOpen={postcardOpen}
          onClose={() => setPostcardOpen(false)}
          weather={w}
          unit={unit}
          backgroundUrl={displayBg}
        />
      )}

      {guideOpen && (
        <WeatherGuideModal
          isOpen={guideOpen}
          onClose={() => setGuideOpen(false)}
          initialTopic={guideTopic}
        />
      )}

      {forecastModalOpen && (
        <ForecastDetailModal
          key={`${forecastModalType}-${forecastModalIndex}-${w.place.name}`}
          isOpen={forecastModalOpen}
          onClose={() => setForecastModalOpen(false)}
          weather={w}
          unit={unit}
          type={forecastModalType}
          initialIndex={forecastModalIndex}
          onTypeChange={(nextType) => setForecastModalType(nextType)}
        />
      )}
    </div>
  );
}
