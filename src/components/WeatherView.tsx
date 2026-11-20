// src/components/WeatherView.tsx
import React, { useState, useEffect, useCallback } from "react";
import type { TFunction } from "i18next";
import {
  type Weather,
  type WeatherUnit,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import { getAllAvailableArtworks } from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";
import {
  getWallpaperItem,
  setWallpaperItem,
  migrateLegacyLocalStorage,
} from "@/lib/wallpaperStorage";
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
  onSelectBackground?: (url: string) => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string;
}

function getConditionLabel(code: number, t: TFunction): string {
  if (code === 0) return t("cond_clear", "Clear Sky");
  if (code === 1) return t("cond_mostly_clear", "Mainly Clear");
  if (code === 2) return t("cond_partly_cloudy", "Partly Cloudy");
  if (code === 3) return t("cond_overcast", "Overcast");
  if (code >= 45 && code <= 48) return t("cond_foggy", "Foggy");
  if (code >= 51 && code <= 55) return t("cond_drizzle", "Drizzle");
  if (code >= 61 && code <= 65) return t("cond_rain", "Rain");
  if (code >= 71 && code <= 77) return t("cond_snow", "Snow");
  if (code >= 80 && code <= 82) return t("cond_showers", "Rain Showers");
  if (code >= 95) return t("cond_thunderstorm", "Thunderstorm");
  return t("cond_clear", "Clear");
}

function getAirQualityCategory(pm25: number, t: TFunction): { label: string; color: string } {
  if (pm25 <= 12) return { label: t("aqi_good", "Good"), color: "text-emerald-500" };
  if (pm25 <= 35.4) return { label: t("aqi_moderate", "Moderate"), color: "text-amber-500" };
  if (pm25 <= 55.4) return { label: t("aqi_sensitive", "Unhealthy (Sensitive)"), color: "text-orange-500" };
  if (pm25 <= 150.4) return { label: t("aqi_unhealthy", "Unhealthy"), color: "text-red-500" };
  return { label: t("aqi_very_unhealthy", "Hazardous"), color: "text-purple-500" };
}

function getDayName(dateStr: string, t: TFunction): string {
  try {
    const d = new Date(dateStr);
    const dayIndex = d.getDay();
    const days = [
      t("day_sun", "Sun"),
      t("day_mon", "Mon"),
      t("day_tue", "Tue"),
      t("day_wed", "Wed"),
      t("day_thu", "Thu"),
      t("day_fri", "Fri"),
      t("day_sat", "Sat"),
    ];
    return days[dayIndex] || dateStr;
  } catch {
    return dateStr;
  }
}

export function WeatherView({
  weather,
  unit,
  onRefresh,
  isRefreshing,
  onSelectBackground = () => {},
  activeAlerts = [],
  customBgUrl,
}: WeatherViewProps) {
  const { t, i18n } = useTranslation();

  // Modals state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);

  // Clothing filter tab: "all" | "casual" | "active" | "formal"
  const [clothingFilter, setClothingFilter] = useState<"all" | "casual" | "active" | "formal">("all");

  // Dynamic Wallpaper state
  const [currentBgUrl, setCurrentBgUrl] = useState<string>("");

  const w = weather;
  const tempUnit = unit === "celsius" ? "°C" : "°F";
  const windUnit = unit === "celsius" ? "km/h" : "mph";

  // Migrate legacy storage on mount
  useEffect(() => {
    migrateLegacyLocalStorage();
  }, []);

  // Sync wallpaper on location/weather change
  const loadActiveBackground = useCallback(async () => {
    if (customBgUrl) {
      setCurrentBgUrl(customBgUrl);
      return;
    }
    const cityKey = `weather:custom-bg:${w.place.name.toLowerCase().trim()}`;
    const saved =
      (await getWallpaperItem(cityKey)) ||
      (await getWallpaperItem(w.place.name)) ||
      (await getWallpaperItem("weather:custom-bg:current"));
    if (saved) {
      setCurrentBgUrl(saved);
      return;
    }
    const artworks = getAllAvailableArtworks(w.place.name, w.current.code);
    setCurrentBgUrl(artworks[0] || "");
  }, [w.place.name, w.current.code, customBgUrl]);

  useEffect(() => {
    loadActiveBackground();
  }, [loadActiveBackground]);

  const fallbackArtworks = getAllAvailableArtworks(w.place.name, w.current.code);
  const displayBg = currentBgUrl || fallbackArtworks[0] || "";

  const handleNextArtwork = async () => {
    const artworks = getAllAvailableArtworks(w.place.name, w.current.code);
    if (!artworks || artworks.length <= 1) return;
    const curIdx = artworks.indexOf(displayBg);
    const nextIdx = (curIdx + 1) % artworks.length;
    const nextUrl = artworks[nextIdx] || artworks[0]!;
    setCurrentBgUrl(nextUrl);
    onSelectBackground(nextUrl);
    await setWallpaperItem(w.place.name, nextUrl);
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

  // Safe metrics fallbacks
  const uvVal = w.current?.uvIndex ?? 0;
  const humidityVal = w.current?.humidity ?? 0;
  const windVal = Math.round(w.current?.windSpeed ?? 0);
  const pressureVal = Math.round(w.current?.pressure ?? 1013);
  const visibilityVal = Math.round((w.current?.visibility ?? 10000) / 1000);
  const pm25Val = Math.round(w.current?.airQuality?.pm25 ?? 0);
  const aqiInfo = getAirQualityCategory(pm25Val, t);

  // Clothing recommendations
  const currentTempC = unit === "celsius" ? w.current.temp : ((w.current.temp - 32) * 5) / 9;
  const isRainy = (w.current.code >= 51 && w.current.code <= 67) || (w.current.code >= 80 && w.current.code <= 99);

  return (
    <div className="w-full space-y-5">
      {/* 1. SEVERE WEATHER ALERT WATCHER & LIVE TICKER */}
      <WeatherAlertWatcher
        weather={w}
        activeAlerts={activeAlerts}
        onOpenPostcard={() => setPostcardOpen(true)}
      />

      {/* 2. ARTWORK & QUICK CONTROLS TOOLBAR (Outside & Above Hero Card) */}
      <section className="p-3 sm:p-4 rounded-2xl bg-card/90 border border-border/80 shadow-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Change Artwork & AI Studio */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNextArtwork}
              className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖼️</span>
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

          {/* Right: Refresh, Postcard & Weather Guide */}
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

      {/* 3. HERO WALLPAPER CARD (Pure visual canvas, no buttons overlaying the art) */}
      <section className="relative w-full aspect-16/9 sm:aspect-21/9 rounded-3xl overflow-hidden border border-border/60 shadow-md bg-muted select-none">
        {displayBg ? (
          <img
            src={displayBg}
            alt={w.place.name}
            className="w-full h-full object-cover object-center transition-all duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600" />
        )}
      </section>

      {/* 4. CURRENT WEATHER CONDITIONS & METRICS */}
      <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-4">
        {/* City Title and Status (Fully localized for all 14 languages) */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{getLocalizedCity(w.place.name, i18n.language)}</span>
              {w.place.country && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                  {getLocalizedCountry(w.place.country, i18n.language)}
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              {getConditionLabel(w.current.code, t)}
            </p>
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

        {/* Primary Temperature & Weather Icon Display */}
        <div className="flex items-center justify-between py-2 border-y border-border/40">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">
              {Math.round(w.current.temp)}
            </span>
            <span className="text-xl sm:text-2xl font-semibold text-muted-foreground">
              {tempUnit}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden xs:block">
              <span className="text-xs text-muted-foreground block">{t("feels_like", "Feels like")}</span>
              <span className="text-sm font-bold text-foreground">
                {Math.round(w.current.apparentTemp ?? w.current.temp)}{tempUnit}
              </span>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.isDay === 1 || (w.current as any).isDay === true}
                className="w-full h-full drop-shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Responsive Grid of Weather Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Humidity */}
          <div
            onClick={() => openGuide("humidity")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_humidity", "Humidity")}</span>
              <span>💧</span>
            </div>
            <span className="text-lg font-bold text-foreground">{humidityVal}%</span>
          </div>

          {/* Wind */}
          <div
            onClick={() => openGuide("wind")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_wind", "Wind")}</span>
              <span>💨</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {windVal} <span className="text-xs font-normal">{windUnit}</span>
            </span>
          </div>

          {/* UV Index */}
          <div
            onClick={() => openGuide("uv")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_uv", "UV Index")}</span>
              <span>☀️</span>
            </div>
            <span className="text-lg font-bold text-foreground">{uvVal}</span>
          </div>

          {/* Air Quality (PM2.5) */}
          <div
            onClick={() => openGuide("aqi")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_aqi", "PM2.5")}</span>
              <span>🍃</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-foreground">{pm25Val}</span>
              <span className={`text-[10px] font-bold ${aqiInfo.color}`}>{aqiInfo.label}</span>
            </div>
          </div>

          {/* Pressure */}
          <div
            onClick={() => openGuide("pressure")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_pressure", "Pressure")}</span>
              <span>⏱️</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {pressureVal} <span className="text-xs font-normal">hPa</span>
            </span>
          </div>

          {/* Visibility */}
          <div
            onClick={() => openGuide("visibility")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("metric_visibility", "Visibility")}</span>
              <span>👁️</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              {visibilityVal} <span className="text-xs font-normal">km</span>
            </span>
          </div>
        </div>
      </section>

      {/* 5. WEATHER MASCOT BUDDIES */}
      <WeatherMascot weather={w} />

      {/* 6. HOURLY FORECAST (Horizontal Scroll with Tap-for-Details) */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>⏱️</span>
            <span>{t("hourly_forecast", "Hourly Forecast (Tap for Details)")}</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">24 Hours</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {(w.hourly || []).slice(0, 24).map((h, idx) => {
            const timeLabel = new Date(h.time).toLocaleTimeString([], {
              hour: "numeric",
              hour12: true,
            });
            return (
              <div
                key={h.time || idx}
                onClick={() => openForecastDetail("hourly", idx)}
                className="flex-shrink-0 w-20 p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/80 border border-border/40 flex flex-col items-center justify-between gap-1.5 cursor-pointer active:scale-95 transition"
              >
                <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                  {timeLabel}
                </span>
                <div className="w-8 h-8 flex items-center justify-center my-0.5">
                  <WeatherIcon code={h.code} isDay={h.isDay} className="w-full h-full" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  {Math.round(h.temp)}°
                </span>
                <span className="text-[9px] text-muted-foreground text-center line-clamp-1">
                  {getConditionLabel(h.code, t)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY EXTENDED FORECAST (Tap-for-Details with Condition Words) */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>📅</span>
            <span>{t("daily_forecast", "7-Day Extended Forecast")}</span>
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">
            {t("tap_any_day", "Tap any day for details")}
          </span>
        </div>

        <div className="space-y-1.5">
          {(w.daily || []).map((d, idx) => (
            <div
              key={d.date || idx}
              onClick={() => openForecastDetail("daily", idx)}
              className="flex items-center justify-between p-2.5 sm:px-4 rounded-2xl bg-muted/20 hover:bg-muted/60 border border-border/30 transition cursor-pointer active:scale-98"
            >
              {/* Day Name */}
              <div className="w-14 sm:w-20 font-bold text-sm text-foreground">
                {idx === 0 ? t("today", "Today") : getDayName(d.date, t)}
              </div>

              {/* Icon & Written Condition Label */}
              <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
                <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                  <WeatherIcon code={d.code} isDay={true} className="w-full h-full" />
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {getConditionLabel(d.code, t)}
                </span>
              </div>

              {/* Rain Chance */}
              <div className="text-xs font-semibold text-sky-500 w-12 text-center">
                {(d.precipitationProbability ?? 0) > 0 ? `${d.precipitationProbability}%` : ""}
              </div>

              {/* Min/Max Temperature */}
              <div className="flex items-center gap-2 text-sm font-bold justify-end w-20 text-right">
                <span className="text-foreground">{Math.round(d.maxTemp)}°</span>
                <span className="text-muted-foreground font-normal">{Math.round(d.minTemp)}°</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. WHAT TO WEAR (Smart Clothing Recommendations with Activity Filters) */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear Today")}</span>
          </h3>

          {/* Activity Category Filter */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
            {(["all", "casual", "active", "formal"] as const).map((filterKey) => (
              <button
                key={filterKey}
                type="button"
                onClick={() => setClothingFilter(filterKey)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition ${
                  clothingFilter === filterKey
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`filter_${filterKey}`, filterKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Clothing Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {/* Top Recommendation */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3">
            <span className="text-2xl">🧥</span>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {currentTempC > 26
                  ? t("wear_breathable", "Light & Breathable Clothing")
                  : currentTempC > 18
                  ? t("wear_layer", "Comfortable Light Layers")
                  : currentTempC > 10
                  ? t("wear_jacket", "Warm Jacket & Sweater")
                  : t("wear_heavy_coat", "Heavy Winter Coat & Thermals")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {currentTempC > 24
                  ? t("wear_desc_hot", "Cotton tees, linen shirts, or shorts keep you cool.")
                  : t("wear_desc_cool", "A light cardigan or windbreaker is advised.")}
              </p>
            </div>
          </div>

          {/* Rain / Sun Accessories */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3">
            <span className="text-2xl">{isRainy ? "☂️" : uvVal > 5 ? "🧢" : "🕶️"}</span>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {isRainy
                  ? t("wear_umbrella", "Umbrella & Waterproof Footwear")
                  : uvVal > 5
                  ? t("wear_sun_protect", "Sun Hat & UV Sunglasses")
                  : t("wear_comfortable", "Comfortable Walking Shoes")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isRainy
                  ? t("wear_desc_rain", "Wet conditions detected. Pack a compact umbrella.")
                  : t("wear_desc_sun", "Protect skin and eyes during peak midday sunlight.")}
              </p>
            </div>
          </div>

          {/* Outfit Occasion Suggestion */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-start gap-3 sm:col-span-2 lg:col-span-1">
            <span className="text-2xl">
              {clothingFilter === "active" ? "👟" : clothingFilter === "formal" ? "👔" : "✨"}
            </span>
            <div>
              <span className="text-xs font-bold text-foreground block">
                {clothingFilter === "active"
                  ? t("wear_sports", "Moisture-Wicking Athletic Gear")
                  : clothingFilter === "formal"
                  ? t("wear_formal", "Tailored Suit or Smart Layered Casual")
                  : t("wear_daily", "Ideal All-Day Outfit")}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {clothingFilter === "active"
                  ? t("wear_desc_active", "Breathable fabrics optimized for outdoor movement.")
                  : clothingFilter === "formal"
                  ? t("wear_desc_formal", "Stay sharp and comfortable in climate-adjusted attire.")
                  : t("wear_desc_daily", "Balanced for comfort indoors and outside.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 10. LIVE WEATHER & RAIN RADAR */}
      <WeatherRadar
        weather={w}
        lat={w.place.lat}
        lon={w.place.lon}
        cityName={w.place.name}
      />

      {/* 11. SUN & MOON ASTRONOMY TRACKER */}
      <AstronomyTracker weather={w} />

      {/* MODALS */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          city={w.place.name}
          cityName={w.place.name}
          currentCity={w.place.name}
          country={w.place.country}
          weatherCode={w.current.code}
          currentWeatherCode={w.current.code}
          onApplyBackground={(url) => {
            setCurrentBgUrl(url);
            onSelectBackground(url);
            setWallpaperItem(w.place.name, url);
          }}
          onSelectBackground={(url) => {
            setCurrentBgUrl(url);
            onSelectBackground(url);
            setWallpaperItem(w.place.name, url);
          }}
          onApplyArtwork={(url) => {
            setCurrentBgUrl(url);
            onSelectBackground(url);
            setWallpaperItem(w.place.name, url);
          }}
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
          isOpen={forecastModalOpen}
          onClose={() => setForecastModalOpen(false)}
          weather={w}
          unit={unit}
          mode={forecastModalType}
          initialIndex={forecastModalIndex}
        />
      )}
    </div>
  );
}
