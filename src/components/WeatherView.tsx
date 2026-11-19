// src/components/WeatherView.tsx
import React, { useState, useEffect, useCallback } from "react";
import type { TFunction } from "i18next";
import {
  type Weather,
  type WeatherUnit,
  describe,
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
  activeAlerts?: TickerAlertItem[];
  unit: WeatherUnit;
  loading?: boolean;
  onRefresh?: () => void;
  isFav?: boolean;
  isFavorite?: boolean;
  onToggleFavorite: () => void;
  onSelectBackground: (url: string | null) => void;
  onOpenAiGallery?: () => void;
  customBgUrl?: string | null;
}

type WearCategory = "business" | "casual" | "workout" | "evening";

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "wmo_0", fallback: "Clear sky" },
  1: { key: "wmo_1", fallback: "Mainly clear" },
  2: { key: "wmo_2", fallback: "Partly cloudy" },
  3: { key: "wmo_3", fallback: "Overcast" },
  45: { key: "wmo_45", fallback: "Fog" },
  48: { key: "wmo_48", fallback: "Depositing rime fog" },
  51: { key: "wmo_51", fallback: "Light drizzle" },
  53: { key: "wmo_53", fallback: "Moderate drizzle" },
  55: { key: "wmo_55", fallback: "Dense drizzle" },
  61: { key: "wmo_61", fallback: "Slight rain" },
  63: { key: "wmo_63", fallback: "Moderate rain" },
  65: { key: "wmo_65", fallback: "Heavy rain" },
  71: { key: "wmo_71", fallback: "Slight snowfall" },
  73: { key: "wmo_73", fallback: "Moderate snowfall" },
  75: { key: "wmo_75", fallback: "Heavy snowfall" },
  80: { key: "wmo_80", fallback: "Slight rain showers" },
  81: { key: "wmo_81", fallback: "Moderate rain showers" },
  82: { key: "wmo_82", fallback: "Violent rain showers" },
  85: { key: "wmo_85", fallback: "Slight snow showers" },
  86: { key: "wmo_86", fallback: "Heavy snow showers" },
  95: { key: "wmo_95", fallback: "Thunderstorm" },
  96: { key: "wmo_96", fallback: "Thunderstorm with slight hail" },
  99: { key: "wmo_99", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number | undefined, t: TFunction): string {
  if (code === undefined || code === null) return t("fair", "Fair");
  const entry = WMO_KEY_MAP[code];
  if (entry) {
    return t(entry.key, entry.fallback);
  }
  return describe(code)?.label || t("fair", "Fair");
}

function getDailyDayLabel(dateStr: string, idx: number, t: TFunction): string {
  if (idx === 0) return t("today", "Today");
  if (idx === 1) return t("tomorrow", "Tomorrow");
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    const dayKeys = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"];
    const dayFallbacks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const key = dayKeys[day];
    const fallback = dayFallbacks[day] ?? dateStr;
    return key ? t(key, fallback) : fallback;
  } catch {
    return dateStr;
  }
}

function getAqiAdvice(val: number, t: TFunction, lang: string): {
  label: string;
  advice: string;
  color: string;
  bg: string;
} {
  const isThai = lang?.startsWith("th");

  if (val <= 50) {
    return {
      label: isThai ? "คุณภาพอากาศดีมาก" : t("aqi_good", "Good Air Quality"),
      advice: isThai
        ? "เหมาะสำหรับกิจกรรมกลางแจ้งทุกชนิด อากาศบริสุทธิ์สดชื่น"
        : t("aqi_good_adv", "Ideal for all outdoor activities. Air quality is healthy."),
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800",
    };
  }
  if (val <= 100) {
    return {
      label: isThai ? "ปานกลาง" : t("aqi_mod", "Moderate Air"),
      advice: isThai
        ? "บุคคลที่ไวต่อมลพิษควรระวังหากทำกิจกรรมกลางแจ้งนานๆ"
        : t("aqi_mod_adv", "Acceptable air quality; sensitive groups should take care."),
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800",
    };
  }
  if (val <= 150) {
    return {
      label: isThai ? "เริ่มมีผลต่อสุขภาพ" : t("aqi_unhealthy_sens", "Unhealthy for Sensitive"),
      advice: isThai
        ? "กลุ่มเสี่ยงควรลดเวลาทำกิจกรรมกลางแจ้ง และสวมหน้ากากอนามัย"
        : t("aqi_sens_adv", "Sensitive groups should reduce prolonged outdoor exertion."),
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800",
    };
  }
  return {
    label: isThai ? "มีผลต่อสุขภาพ" : t("aqi_unhealthy", "Unhealthy Air"),
    advice: isThai
      ? "ทุกคนควรหลีกเลี่ยงกิจกรรมกลางแจ้งที่ใช้แรงมาก สวมหน้ากาก N95"
      : t("aqi_unhealthy_adv", "Everyone should wear masks and avoid outdoor exertion."),
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800",
  };
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  activeAlerts,
  unit,
  loading = false,
  onRefresh,
  isFav,
  isFavorite,
  onToggleFavorite,
  onSelectBackground,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const isFavorited = isFavorite ?? isFav ?? false;

  const [currentBgUrl, setCurrentBgUrl] = useState<string>("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);
  const [activeWearTab, setActiveWearTab] = useState<WearCategory>("casual");

  useEffect(() => {
    migrateLegacyLocalStorage();
  }, []);

  const loadActiveBackground = useCallback(async () => {
    if (customBgUrl) {
      setCurrentBgUrl(customBgUrl);
      return;
    }
    const saved = await getWallpaperItem(w.place.name);
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

  const openHourlyDetail = (idx: number) => {
    setForecastModalType("hourly");
    setForecastModalIndex(idx);
    setForecastModalOpen(true);
  };

  const openDailyDetail = (idx: number) => {
    setForecastModalType("daily");
    setForecastModalIndex(idx);
    setForecastModalOpen(true);
  };

  const tempVal = Math.round(w.current.temp);
  const feelsLikeVal = Math.round(w.current.feels);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? "mph" : "km/h";

  const highTemp = w.daily[0]?.max !== undefined ? Math.round(w.daily[0].max) : tempVal;
  const lowTemp = w.daily[0]?.min !== undefined ? Math.round(w.daily[0].min) : tempVal;

  const aqiVal = w.current.aqi ?? (w.current.pm25 ? Math.round(w.current.pm25 * 3.5) : null);
  const aqiAdvisoryInfo = aqiVal ? getAqiAdvice(aqiVal, t, lang) : null;

  const wearRecommendations: Record<WearCategory, { title: string; outfit: string; icon: string }> = {
    casual: {
      title: t("wear_casual", "Casual Everyday"),
      outfit: tempVal > 28
        ? t("wear_casual_hot", "Light cotton t-shirt, shorts, and breathable sneakers. UV sunglasses recommended.")
        : tempVal > 20
        ? t("wear_casual_warm", "Comfortable t-shirt or polo with chinos or jeans.")
        : t("wear_casual_cool", "Sweater or long sleeve with denim and light jacket."),
      icon: "👕",
    },
    business: {
      title: t("wear_business", "Smart / Office"),
      outfit: tempVal > 28
        ? t("wear_biz_hot", "Breathable linen shirt, tailored lightweight trousers.")
        : tempVal > 20
        ? t("wear_biz_mild", "Pressed button-down, blazer, and comfortable dress shoes.")
        : t("wear_biz_cool", "Tailored suit jacket, warm knit or dress shirt, and wool trousers."),
      icon: "💼",
    },
    workout: {
      title: t("wear_workout", "Active / Workout"),
      outfit: tempVal > 28
        ? t("wear_active_hot", "Moisture-wicking singlet, running shorts, and bring plenty of water.")
        : t("wear_active_cool", "Running tights, light windbreaker, and thermal socks."),
      icon: "🏃",
    },
    evening: {
      title: t("wear_evening", "Evening Out"),
      outfit: tempVal < 22
        ? t("wear_eve_cool", "Layered outfit with light trench coat or wool sweater.")
        : t("wear_eve_warm", "Relaxed evening shirt, light dress, or comfortable casual layers."),
      icon: "✨",
    },
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full pb-8">
      {/* 1. SEVERE WEATHER ALERT WATCHER */}
      <WeatherAlertWatcher
        weather={w}
        unit={unit}
        activeAlerts={activeAlerts}
      />

      {/* 2. LOCKED ACTION TOOLBAR (OUTSIDE & ABOVE HERO CARD) */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-2xl bg-card/90 dark:bg-card/95 border border-border/80 shadow-md backdrop-blur-md">
        {/* Left Actions: Artwork, Refresh, and Favorite */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleNextArtwork}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-bold border border-border/60 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            title={t("next_art", "Next Artwork")}
          >
            <span className="text-sm">🖼️</span>
            <span className="text-xs font-semibold">{t("next_art", "Next")}</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={`h-9 w-9 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-bold border border-border/60 shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center ${
                loading ? "animate-spin" : ""
              }`}
              title={t("refresh", "Refresh Weather")}
            >
              🔄
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`h-9 w-9 rounded-xl bg-muted/80 hover:bg-muted text-base font-bold border border-border/60 shadow-2xs transition active:scale-95 cursor-pointer flex items-center justify-center ${
              isFavorited ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
            }`}
            title={isFavorited ? t("fav_saved", "Favorited") : t("fav_add", "Add Favorite")}
          >
            {isFavorited ? "★" : "☆"}
          </button>
        </div>

        {/* Right Actions: Gallery & Postcard */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted/80 hover:bg-muted text-foreground text-xs font-bold border border-border/60 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm">🎨</span>
            <span className="text-xs font-semibold">{t("gallery", "Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostcardOpen(true)}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm">💌</span>
            <span className="text-xs font-bold">{t("postcard_btn", "Postcard")}</span>
          </button>
        </div>
      </div>

      {/* 3. ARTWORK HERO CARD (100% CLEAR OF ALL BUTTONS) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-slate-900/40 aspect-[16/10] sm:aspect-[16/9] min-h-[220px] sm:min-h-[300px] w-full">
        {displayBg ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${displayBg})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600" />
        )}
      </section>

      {/* 4. CURRENT WEATHER CONDITIONS & METRICS */}
      <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-4">
        {/* City Title and Status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {w.place.name}
              </h2>
              {w.place.country && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                  {w.place.country}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold text-muted-foreground capitalize">
                {getConditionLabel(w.current.code, t)}
              </p>
              <button
                type="button"
                onClick={() => openGuide("icons")}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                ({t("glossary", "Glossary")})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openGuide("all")}
            className="px-3 py-1.5 rounded-xl border border-border/70 bg-secondary/80 hover:bg-secondary text-secondary-foreground text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>📖</span>
            <span className="hidden sm:inline">{t("weather_guide", "Weather Guide")}</span>
          </button>
        </div>

        {/* Big Temperature & Weather Icon Display */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Current Condition Watercolor Icon */}
            <div className="w-14 h-14 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center drop-shadow-md">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.is_day ?? 1}
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
              />
            </div>

            {/* Temperature Value */}
            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">
              {tempVal}
              <span className="text-2xl sm:text-3xl font-bold text-muted-foreground ml-1">
                {tempUnitStr}
              </span>
            </div>
          </div>

          {/* Feels Like & High/Low */}
          <div className="space-y-0.5 text-xs sm:text-sm font-semibold text-muted-foreground text-right sm:text-left">
            <p>
              {t("feels_like", "Feels like")}: <span className="text-foreground font-bold">{feelsLikeVal}{tempUnitStr}</span>
            </p>
            <p>
              {t("high_low", "High / Low")}:{" "}
              <span className="text-foreground font-bold">
                {highTemp}° / {lowTemp}°
              </span>
            </p>
          </div>
        </div>

        {/* Primary Weather Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {/* Humidity */}
          <button
            type="button"
            onClick={() => openGuide("humidity")}
            className="p-3 rounded-2xl bg-muted/50 hover:bg-muted/80 border border-border/50 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
              <span>💧 {t("humidity", "Humidity")}</span>
              <span className="text-[10px] text-primary">ℹ️</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {w.current.humidity !== undefined ? `${w.current.humidity}%` : "--"}
            </div>
          </button>

          {/* Wind */}
          <button
            type="button"
            onClick={() => openGuide("wind")}
            className="p-3 rounded-2xl bg-muted/50 hover:bg-muted/80 border border-border/50 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
              <span>💨 {t("wind", "Wind")}</span>
              <span className="text-[10px] text-primary">ℹ️</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {w.current.wind !== undefined ? `${Math.round(w.current.wind)} ${speedUnitStr}` : "--"}
            </div>
          </button>

          {/* UV Index */}
          <button
            type="button"
            onClick={() => openGuide("uv")}
            className="p-3 rounded-2xl bg-muted/50 hover:bg-muted/80 border border-border/50 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
              <span>☀️ {t("uv_index", "UV Index")}</span>
              <span className="text-[10px] text-primary">ℹ️</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {w.current.uv !== undefined ? Math.round(w.current.uv) : "--"}
            </div>
          </button>

          {/* Air Quality (AQI) */}
          <button
            type="button"
            onClick={() => openGuide("aqi")}
            className="p-3 rounded-2xl bg-muted/50 hover:bg-muted/80 border border-border/50 text-left transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
              <span>🍃 {t("aqi", "Air Quality")}</span>
              <span className="text-[10px] text-primary">ℹ️</span>
            </div>
            <div className="text-lg font-bold text-foreground">
              {aqiVal !== null ? `${aqiVal} AQI` : "--"}
            </div>
          </button>
        </div>

        {/* Air Quality Health Advisory Banner */}
        {aqiAdvisoryInfo && (
          <div className={`p-3.5 rounded-2xl border ${aqiAdvisoryInfo.bg} flex items-start gap-3`}>
            <span className="text-xl shrink-0 mt-0.5">😷</span>
            <div className="space-y-0.5">
              <p className={`text-xs font-bold ${aqiAdvisoryInfo.color}`}>
                {aqiAdvisoryInfo.label}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {aqiAdvisoryInfo.advice}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5. WEATHER PAL MASCOT COMPANION */}
      <WeatherMascot weather={w} />

      {/* 6. HOURLY FORECAST SCROLLER */}
      {w.hourly && w.hourly.length > 0 && (
        <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground flex items-center gap-2">
              <span>⏱️</span>
              <span>{t("hourly_forecast", "Hourly Forecast")}</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {t("tap_for_details", "Tap for details")}
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
            {w.hourly.slice(0, 24).map((h, idx) => (
              <button
                key={`${h.time}-${idx}`}
                type="button"
                onClick={() => openHourlyDetail(idx)}
                className="flex-shrink-0 w-20 p-2.5 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/50 text-center transition cursor-pointer snap-start flex flex-col items-center gap-1.5"
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {idx === 0 ? t("now", "Now") : h.time.slice(11, 16)}
                </span>
                <div className="w-8 h-8 flex items-center justify-center my-0.5">
                  <WeatherIcon code={h.code} isDay={h.is_day ?? 1} className="w-7 h-7 object-contain" />
                </div>
                <span className="text-sm font-black text-foreground">
                  {Math.round(h.temp)}°
                </span>
                {h.pop !== undefined && h.pop > 10 && (
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    💧{h.pop}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 7. 7-DAY EXTENDED FORECAST */}
      {w.daily && w.daily.length > 0 && (
        <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground flex items-center gap-2">
              <span>📅</span>
              <span>{t("extended_forecast", "7-Day Forecast")}</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              {t("tap_for_details", "Tap for details")}
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {w.daily.slice(0, 7).map((d, idx) => (
              <button
                key={`${d.date}-${idx}`}
                type="button"
                onClick={() => openDailyDetail(idx)}
                className="w-full py-3 px-2 flex items-center justify-between gap-3 text-left hover:bg-muted/40 rounded-xl transition cursor-pointer"
              >
                <div className="w-24 text-xs font-bold text-foreground">
                  {getDailyDayLabel(d.date, idx, t)}
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                    <WeatherIcon code={d.code} isDay={1} className="w-6 h-6 object-contain" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {getConditionLabel(d.code, t)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                  {d.pop !== undefined && d.pop > 15 && (
                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                      💧{d.pop}%
                    </span>
                  )}
                  <span className="text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground font-normal">{Math.round(d.min)}°</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 8. WHAT TO WEAR ADVICE */}
      <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
        <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground flex items-center gap-2">
          <span>👔</span>
          <span>{t("what_to_wear", "What to Wear")}</span>
        </h3>

        {/* Category Tabs */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-muted/60">
          {(["casual", "business", "workout", "evening"] as WearCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveWearTab(cat)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer capitalize ${
                activeWearTab === cat
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {wearRecommendations[cat].icon} {wearRecommendations[cat].title.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Selected Outfit Card */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>{wearRecommendations[activeWearTab].icon}</span>
            <span>{wearRecommendations[activeWearTab].title}</span>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {wearRecommendations[activeWearTab].outfit}
          </p>
        </div>
      </section>

      {/* 9. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner
        weather={w}
        unit={unit}
      />

      {/* 10. RAINVIEWER LIVE RADAR */}
      <WeatherRadar
        lat={w.place.lat}
        lon={w.place.lon}
        cityName={w.place.name}
      />

      {/* 11. SUN & MOON ASTRONOMY TRACKER */}
      <AstronomyTracker
        lat={w.place.lat}
        lon={w.place.lon}
      />

      {/* MODALS */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          currentCity={w.place.name}
          currentWeatherCode={w.current.code}
          onApplyBackground={(url) => {
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
          lat={w.place.lat}
          lon={w.place.lon}
        />
      )}

      {forecastModalOpen && w && (
        <ForecastDetailModal
          isOpen={forecastModalOpen}
          onClose={() => setForecastModalOpen(false)}
          weather={w}
          unit={unit}
          type={forecastModalType}
          initialIndex={forecastModalIndex}
          getConditionLabel={(code) => getConditionLabel(code, t)}
          getDayLabel={(dateStr, idx) => getDailyDayLabel(dateStr, idx, t)}
        />
      )}
    </div>
  );
};

export default WeatherView;
