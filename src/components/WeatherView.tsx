// src/components/WeatherView.tsx
import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Weather, WeatherUnit } from "@/lib/weather";
import { pickNum } from "@/lib/weatherSafe";
import { saveWallpaperToDownloads } from "@/lib/saveWallpaper";
import { WeatherIcon } from "@/lib/weatherIcons";
import AiGalleryModal from "./AiGalleryModal";
import WeatherPostcardModal from "./WeatherPostcardModal";
import { WeatherGuideModal, type GuideTopic } from "./WeatherGuideModal";
import { ForecastDetailModal } from "./ForecastDetailModal";
import { OutdoorActivityPlanner } from "./OutdoorActivityPlanner";
import { WeatherMascot } from "./WeatherMascot";
import { WeatherRadar } from "./WeatherRadar";
import { AstronomyTracker } from "./AstronomyTracker";
import { WeatherAlertWatcher } from "./WeatherAlertWatcher";

export interface TickerAlertItem {
  id: string;
  tag?: string;
  tagKey?: string;
  title: string;
  message?: string;
  desc?: string;
  severity: "info" | "warning" | "alert" | "disaster" | "danger" | "advisory" | "all-clear";
  isMock?: boolean;
}

export interface WeatherViewProps {
  weather: Weather;
  unit: "metric" | "imperial";
  onOpenAiGallery?: () => void;
  onOpenPostcard?: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string | null | undefined;
  onSelectBackground?: (url: string | null) => void;
}

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_mainly_clear", fallback: "Mainly clear" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_depositing_rime_fog", fallback: "Depositing rime fog" },
  51: { key: "cond_light_drizzle", fallback: "Light drizzle" },
  53: { key: "cond_moderate_drizzle", fallback: "Moderate drizzle" },
  55: { key: "cond_dense_drizzle", fallback: "Dense drizzle" },
  61: { key: "cond_slight_rain", fallback: "Slight rain" },
  63: { key: "cond_moderate_rain", fallback: "Moderate rain" },
  65: { key: "cond_heavy_rain", fallback: "Heavy rain" },
  71: { key: "cond_slight_snow", fallback: "Slight snow" },
  73: { key: "cond_moderate_snow", fallback: "Moderate snow" },
  75: { key: "cond_heavy_snow", fallback: "Heavy snow" },
  80: { key: "cond_slight_rain_showers", fallback: "Rain showers" },
  81: { key: "cond_moderate_rain_showers", fallback: "Moderate rain showers" },
  82: { key: "cond_violent_rain_showers", fallback: "Violent rain showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm_slight_hail", fallback: "Thunderstorm with slight hail" },
  99: { key: "cond_thunderstorm_heavy_hail", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number, t: TFunction): string {
  const match = WMO_KEY_MAP[code];
  if (match) {
    return t(match.key, match.fallback);
  }
  return t("cond_partly_cloudy", "Partly cloudy");
}

function getOutfitRecommendation(temp: number, code: number, isMetric: boolean, t: TFunction): string {
  const cTemp = isMetric ? temp : ((temp - 32) * 5) / 9;

  if (code === 95 || code === 96 || code === 99) {
    return t("outfit_thunderstorm", "⛈️ Thunderstorms active: Stay indoors and avoid open outdoor areas.");
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return t("outfit_rain", "🌧️ Rain expected: Carry an umbrella or wear a waterproof jacket.");
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return t("outfit_snow", "❄️ Freezing snow: Wear a thermal coat, gloves, and insulated boots.");
  }
  if (cTemp >= 32) {
    return t("outfit_very_hot", "☀️ Very hot: Breathable cotton/linen, UV sunglasses, and stay hydrated.");
  }
  if (cTemp >= 24) {
    return t("outfit_warm", "👕 Warm & pleasant: T-shirt, shorts, and light summer clothes.");
  }
  if (cTemp >= 16) {
    return t("outfit_mild", "🧥 Mild weather: Light jacket, cardigan, or long-sleeve layers.");
  }
  if (cTemp >= 8) {
    return t("outfit_chilly", "🧣 Chilly: Warm sweater, windbreaker, and warm pants.");
  }
  return t("outfit_cold", "🧤 Cold: Heavy winter coat, thermal layers, and warm scarf.");
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  unit,
  onOpenAiGallery,
  onOpenPostcard,
  onRefresh,
  isRefreshing = false,
  isFavorite = false,
  onToggleFavorite,
  activeAlerts = [],
  customBgUrl,
  onSelectBackground,
}) => {
  const { t } = useTranslation();

  // Modal States
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [guideSelectedCode, setGuideSelectedCode] = useState<number | undefined>(undefined);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalTab, setForecastModalTab] = useState<"hourly" | "daily">("hourly");
  const [forecastInitialIndex, setForecastInitialIndex] = useState(0);

  // Toast State
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 3200);
  }, []);

  // Safe Metric Extraction
  const safeTemp = pickNum(w.current?.temp, w.current?.temperature_2m) ?? 25;
  const safeFeels = pickNum(w.current?.feels, w.current?.apparent_temperature) ?? safeTemp;
  const safeHumidity = pickNum(w.current?.humidity, w.current?.relative_humidity_2m) ?? 60;
  const safeWindSpeed = pickNum(w.current?.wind, w.current?.wind_speed, w.current?.wind_speed_10m) ?? 10;
  const safeUv = pickNum(w.current?.uv, w.current?.uv_index) ?? 3;
  const safeAqi = pickNum(w.current?.aqi, (w.current as any)?.air_quality_index) ?? 0;
  const safePressure = pickNum(w.current?.pressure, w.current?.surface_pressure) ?? 1013;
  const safeCode = pickNum(w.current?.code, (w.current as any)?.weather_code) ?? 0;

  const tempUnit = unit === "imperial" ? "°F" : "°C";
  const speedUnit = unit === "imperial" ? "mph" : "km/h";

  const outfitRec = useMemo(
    () => getOutfitRecommendation(safeTemp, safeCode, unit === "metric", t),
    [safeTemp, safeCode, unit, t]
  );

  const displayBg = customBgUrl || w.wallpaper_url;

  const handleSaveWallpaper = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await saveWallpaperToDownloads(displayBg, w.place?.name);
      if (res.ok) {
        showToast(t("wallpaper_saved_success", "Wallpaper saved to downloads!"), "success");
      } else {
        showToast(res.error || t("wallpaper_save_failed", "Failed to save wallpaper"), "error");
      }
    } catch {
      showToast(t("wallpaper_save_failed", "Failed to save wallpaper"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const openGuideFor = (topic: GuideTopic, code?: number) => {
    setGuideTopic(topic);
    setGuideSelectedCode(code);
    setGuideOpen(true);
  };

  const openHourlyDetail = (index: number) => {
    setForecastModalTab("hourly");
    setForecastInitialIndex(index);
    setForecastModalOpen(true);
  };

  const openDailyDetail = (index: number) => {
    setForecastModalTab("daily");
    setForecastInitialIndex(index);
    setForecastModalOpen(true);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-12 animate-in fade-in duration-300">
      {/* 1. SEVERE WEATHER ALERT WATCHER */}
      <WeatherAlertWatcher weather={w} />

      {/* 2. TOP TOOLBAR */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? t("remove_favorite", "Remove favorite") : t("add_favorite", "Add favorite")}
              className={`p-2 rounded-2xl transition border cursor-pointer ${
                isFavorite
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                  : "bg-card/70 hover:bg-card text-muted-foreground border-border/70"
              }`}
            >
              <span className="text-base">{isFavorite ? "★" : "☆"}</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={t("refresh", "Refresh forecast")}
              className="p-2 rounded-2xl bg-card/70 hover:bg-card text-card-foreground transition border border-border/70 cursor-pointer disabled:opacity-50"
            >
              <span className={`text-base block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Postcard Creator Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenPostcard) onOpenPostcard();
              else setPostcardOpen(true);
            }}
            className="px-3 py-1.5 rounded-2xl bg-card/80 hover:bg-card text-card-foreground text-xs font-semibold transition border border-border/70 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>💌</span>
            <span>{t("postcard", "Postcard")}</span>
          </button>

          {/* AI Gallery Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenAiGallery) onOpenAiGallery();
              else setGalleryOpen(true);
            }}
            className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <span>🎨</span>
            <span>{t("art_gallery", "AI Gallery")}</span>
          </button>
        </div>
      </div>

      {/* 3. CITY & LOCATION BANNER */}
      <div className="px-1 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>📍</span>
            <span>{w.place?.name || t("current_city", "Current City")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {w.place?.country || t("global_weather", "Live Weather")}
          </p>
        </div>
      </div>

      {/* 4. WALLPAPER ARTWORK CARD */}
      {displayBg && (
        <div className="relative rounded-3xl overflow-hidden border border-border/80 shadow-md bg-card/50">
          <img
            src={displayBg}
            alt={w.place?.name ? `${w.place.name} wallpaper` : "Weather wallpaper"}
            className="w-full h-48 sm:h-56 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <span className="text-xs font-bold drop-shadow-md">🎨 {t("watercolor_sky", "Watercolor Sky Artwork")}</span>
            <button
              type="button"
              onClick={handleSaveWallpaper}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isSaving ? t("saving", "Saving...") : t("save_wallpaper", "Save Wallpaper")}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. WEATHER METRICS OVERVIEW */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-border/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* CLICKABLE CURRENT WEATHER HERO ICON & CONDITION */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openGuideFor("icons", safeCode)}
              title={t("view_weather_explanation", "Tap to view weather explanation")}
              className="group relative cursor-pointer rounded-2xl p-1 transition-all hover:scale-105 hover:bg-muted/40 active:scale-95 focus:outline-none"
            >
              <WeatherIcon
                code={safeCode}
                isDay={Boolean(w.current?.is_day)}
                className="w-14 h-14 shrink-0 drop-shadow-sm transition-transform group-hover:drop-shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-xs">
                ℹ️
              </span>
            </button>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-baseline">
                {Math.round(safeTemp)}
                <span className="text-xl font-bold ml-0.5">{tempUnit}</span>
              </div>
              <button
                type="button"
                onClick={() => openGuideFor("icons", safeCode)}
                className="text-xs sm:text-sm font-medium text-muted-foreground capitalize hover:text-primary transition-colors cursor-pointer text-left block"
              >
                {getConditionLabel(safeCode, t)} ↗
              </button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">
              {t("feels_like", "Feels like")}{" "}
              <span className="font-bold text-foreground">
                {Math.round(safeFeels)}
                {tempUnit}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openGuideFor("all")}
              className="mt-1 text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition cursor-pointer"
            >
              📖 {t("label_unit_guide", "Weather Guide")}
            </button>
          </div>
        </div>

        {/* 4 Detail Badges - Each clickable to open Guide Modal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50 text-xs">
          <button
            type="button"
            onClick={() => openGuideFor("humidity")}
            className="p-2.5 rounded-2xl bg-background/60 hover:bg-background/80 transition border border-border/40 text-left cursor-pointer"
          >
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>💧</span> {t("humidity", "Humidity")}
            </div>
            <div className="text-sm font-bold mt-0.5">{safeHumidity}%</div>
          </button>

          <button
            type="button"
            onClick={() => openGuideFor("wind")}
            className="p-2.5 rounded-2xl bg-background/60 hover:bg-background/80 transition border border-border/40 text-left cursor-pointer"
          >
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>💨</span> {t("wind", "Wind")}
            </div>
            <div className="text-sm font-bold mt-0.5">
              {Math.round(safeWindSpeed)} {speedUnit}
            </div>
          </button>

          <button
            type="button"
            onClick={() => openGuideFor("uv")}
            className="p-2.5 rounded-2xl bg-background/60 hover:bg-background/80 transition border border-border/40 text-left cursor-pointer"
          >
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>☀️</span> {t("uv_index", "UV Index")}
            </div>
            <div className="text-sm font-bold mt-0.5">{safeUv}</div>
          </button>

          <button
            type="button"
            onClick={() => openGuideFor("aqi")}
            className="p-2.5 rounded-2xl bg-background/60 hover:bg-background/80 transition border border-border/40 text-left cursor-pointer"
          >
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>🍃</span> {t("air_quality", "Air Quality")}
            </div>
            <div className="text-sm font-bold mt-0.5">
              {safeAqi > 0 ? `${safeAqi} AQI` : `${Math.round(safePressure)} hPa`}
            </div>
          </button>
        </div>
      </section>

      {/* 6. WEATHER MASCOT BUDDIES */}
      <WeatherMascot weather={w} />

      {/* 7. HOURLY & 7-DAY FORECAST PREVIEWS (Clickable) */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3">
        {/* Hourly Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>⏱️</span>
            <span>{t("hourly_forecast", "Hourly Forecast")}</span>
          </h2>
          <button
            type="button"
            onClick={() => openHourlyDetail(0)}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {t("view_more", "View Details ↗")}
          </button>
        </div>

        {/* Hourly Strip (Clickable hour pills) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {w.hourly?.slice(0, 12).map((hr, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openHourlyDetail(idx)}
              className="p-2.5 rounded-2xl bg-card hover:bg-muted transition border border-border/70 text-center shrink-0 min-w-[68px] shadow-2xs cursor-pointer"
            >
              <div className="text-[11px] text-muted-foreground font-semibold">
                {hr.time ? new Date(hr.time).getHours() + ":00" : `${idx}h`}
              </div>
              <WeatherIcon code={hr.code ?? 0} isDay={true} className="w-6 h-6 mx-auto my-1 drop-shadow-xs" />
              <div className="text-xs font-extrabold">{Math.round(hr.temp ?? 0)}°</div>
            </button>
          ))}
        </div>

        {/* 7-Day Header */}
        <div className="flex items-center justify-between px-1 pt-2">
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>📅</span>
            <span>{t("seven_day_outlook", "7-Day Outlook")}</span>
          </h2>
          <button
            type="button"
            onClick={() => openDailyDetail(0)}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {t("view_more", "View Details ↗")}
          </button>
        </div>

        {/* Daily Preview (Clickable day rows) */}
        <div className="space-y-1.5">
          {w.daily?.slice(0, 7).map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => openDailyDetail(idx)}
              className="w-full p-3 rounded-2xl bg-card hover:bg-muted transition border border-border/70 flex items-center justify-between text-xs font-semibold shadow-2xs cursor-pointer text-left"
            >
              <div className="w-24 text-muted-foreground">
                {idx === 0 ? t("today", "Today") : idx === 1 ? t("tomorrow", "Tomorrow") : day.date}
              </div>
              <div className="flex items-center gap-2">
                <WeatherIcon code={day.code ?? 0} isDay={true} className="w-5 h-5 drop-shadow-xs" />
                <span className="text-[11px] text-muted-foreground font-normal hidden sm:inline">
                  {getConditionLabel(day.code, t)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground">{Math.round(day.max ?? 0)}°</span>
                <span className="text-muted-foreground font-normal">{Math.round(day.min ?? 0)}°</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 8. WHAT TO WEAR TODAY */}
      <section className="p-4 rounded-3xl bg-card border border-border/70 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>🧥</span>
          <span>{t("what_to_wear", "What to Wear Today")}</span>
        </h3>
        <p className="text-xs sm:text-sm text-foreground/90 font-medium py-1">{outfitRec}</p>
      </section>

      {/* 9. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 10. LIVE WEATHER & RAIN RADAR */}
      <WeatherRadar weather={w} lat={w.place.lat} lon={w.place.lon} cityName={w.place.name} />

      {/* 11. SUN & MOON ASTRONOMY TRACKER (WITH TRAJECTORY GUIDE TRIGGER) */}
      <AstronomyTracker weather={w} onOpenGuide={() => openGuideFor("astronomy")} />

      {/* MODALS */}
      <AiGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelectBackground={(url: string) => {
          if (onSelectBackground) onSelectBackground(url);
          setGalleryOpen(false);
        }}
        currentWeatherCode={safeCode}
        currentCity={w.place.name}
      />

      <WeatherPostcardModal
        isOpen={postcardOpen}
        onClose={() => setPostcardOpen(false)}
        weather={w}
        unit={unit}
        backgroundUrl={displayBg || ""}
      />

      <WeatherGuideModal
        isOpen={guideOpen}
        onClose={() => {
          setGuideOpen(false);
          setGuideSelectedCode(undefined);
        }}
        initialTopic={guideTopic}
        selectedWeatherCode={guideSelectedCode}
      />

      <ForecastDetailModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        weather={w}
        unit={unit}
        type={forecastModalTab}
        initialIndex={forecastInitialIndex}
        onTypeChange={(nextType) => setForecastModalTab(nextType)}
      />

      {/* 12. ZERO-DEPENDENCY TOAST NOTIFICATION */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-foreground text-background font-semibold text-xs sm:text-sm shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <span>{toastMsg.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default WeatherView;
