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
      label: t("aqi_good", isThai ? "ดีมาก" : "Good"),
      advice: isThai
        ? "คุณภาพอากาศดีมาก เหมาะสำหรับทำกิจกรรมกลางแจ้งทุกประเภท"
        : "Air quality is satisfactory. Enjoy all outdoor activities freely.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    };
  }
  if (val <= 100) {
    return {
      label: t("aqi_moderate", isThai ? "ปานกลาง" : "Moderate"),
      advice: isThai
        ? "คุณภาพอากาศปานกลาง ผู้ที่มีภาวะภูมิแพ้ควรสังเกตอาการ"
        : "Air quality is acceptable. Sensitive individuals should consider limiting prolonged outdoor exertion.",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30",
    };
  }
  if (val <= 150) {
    return {
      label: t("aqi_unhealthy_sensitive", isThai ? "เริ่มมีผลต่อสุขภาพ" : "Unhealthy for Sensitive Groups"),
      advice: isThai
        ? "เริ่มมีผลกระทบต่อสุขภาพ กลุ่มเสี่ยงควรสวมหน้ากากอนามัย"
        : "Sensitive groups may experience health effects. General public less likely affected.",
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/30",
    };
  }
  return {
    label: t("aqi_unhealthy", isThai ? "มีผลต่อสุขภาพ" : "Unhealthy"),
    advice: isThai
      ? "มีผลต่อสุขภาพ ควรหลีกเลี่ยงกิจกรรมกลางแจ้งและสวมหน้ากาก N95"
      : "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion.",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
  };
}

function degreesToCompass(deg: number, t: TFunction): string {
  const directions = [
    { key: "wind_n", fb: "N" },
    { key: "wind_ne", fb: "NE" },
    { key: "wind_e", fb: "E" },
    { key: "wind_se", fb: "SE" },
    { key: "wind_s", fb: "S" },
    { key: "wind_sw", fb: "SW" },
    { key: "wind_w", fb: "W" },
    { key: "wind_nw", fb: "NW" },
  ];
  const idx = Math.round(deg / 45) % 8;
  const target = directions[idx] || directions[0]!;
  return t(target.key, target.fb);
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  activeAlerts = [],
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

  const isFavorited = isFav ?? isFavorite ?? false;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [currentBgUrl, setCurrentBgUrl] = useState<string | null>(null);
  const [activeWearTab, setActiveWearTab] = useState<WearCategory>("casual");

  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");

  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);

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
        : t("wear_biz_mild", "Pressed button-down, blazer, and comfortable dress shoes."),
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

      {/* 2. ARTWORK HERO CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-slate-900/40 text-white min-h-[260px] sm:min-h-[300px] flex flex-col justify-between">
        {displayBg ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
            style={{ backgroundImage: `url(${displayBg})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

        {/* Top Controls */}
        <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/40 backdrop-blur-md border border-white/20 text-white shadow-xs">
              📍 {w.place.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNextArtwork}
              className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              title={t("next_art", "Next Artwork")}
            >
              <span>🖼️</span>
              <span className="hidden sm:inline">{t("next_art", "Next")}</span>
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className={`p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs shadow-sm transition active:scale-95 cursor-pointer ${
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
              className={`p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-xs shadow-sm transition active:scale-95 cursor-pointer ${
                isFavorited ? "text-amber-400" : "text-white"
              }`}
              title={isFavorited ? t("fav_saved", "Favorited") : t("fav_add", "Add Favorite")}
            >
              {isFavorited ? "★" : "☆"}
            </button>
          </div>
        </div>

        {/* Bottom Floating Bar */}
        <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="px-3.5 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>🎨</span>
            <span>{t("gallery", "Art Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostcardOpen(true)}
            className="px-3.5 py-2 rounded-full bg-primary/80 hover:bg-primary backdrop-blur-md border border-white/30 text-primary-foreground text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>💌</span>
            <span>{t("postcard_btn", "Share Postcard")}</span>
          </button>
        </div>
      </section>

      {/* 3. CURRENT WEATHER CONDITIONS & METRICS */}
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
                onClick={() => openGuide("conditions")}
                className="text-[11px] text-primary hover:underline ml-1 cursor-pointer"
                title={t("explain_conditions", "Explain weather condition")}
              >
                ({t("what_means", "what does this mean?")})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openGuide("all")}
              className="px-2.5 py-1.5 rounded-xl border border-border/70 bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer flex items-center gap-1 shadow-xs"
              title={t("guide_tooltip", "Explain weather numbers & terms in simple words")}
            >
              <span>ℹ️</span>
              <span className="hidden sm:inline">{t("guide", "Guide")}</span>
            </button>

            <div className="shrink-0 p-1 rounded-2xl bg-muted/40 border border-border/50 shadow-xs">
              <WeatherMascot weather={w} />
            </div>
          </div>
        </div>

        {/* Hero Weather Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3.5">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground">
              {tempVal}
              <span className="text-2xl sm:text-3xl font-light text-muted-foreground ml-0.5">
                {tempUnitStr}
              </span>
            </span>

            <div className="space-y-0.5 text-xs">
              <p className="text-muted-foreground">
                {t("feels_like", "Feels like")}{" "}
                <span className="font-bold text-foreground">
                  {feelsLikeVal}{tempUnitStr}
                </span>
              </p>
              <p className="font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">↑{highTemp}°</span>{" "}
                <span className="text-sky-600 dark:text-sky-400 font-extrabold">↓{lowTemp}°</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0 ml-auto sm:ml-0 p-2 rounded-xl bg-card border border-border/60 shadow-xs">
            <WeatherIcon
              code={w.current.code}
              isDay={w.current.is_day ?? 1}
              className="w-12 h-12 sm:w-14 sm:h-14"
            />
            <span className="text-[10px] text-muted-foreground font-medium mt-1">
              {w.current.is_day === 0 ? t("night", "Night") : t("day", "Day")}
            </span>
          </div>
        </div>

        {/* Interactive Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => openGuide("wind")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>💨 {t("wind", "Wind")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.wind)} {speedUnitStr}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {degreesToCompass(w.current.wind_dir, t)}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuide("humidity")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>💧 {t("humidity", "Humidity")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.current.humidity}%
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuide("pressure")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>🧭 {t("pressure", "Pressure")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.pressure)} hPa
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuide("conditions")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>👁️ {t("visibility", "Visibility")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {(w.current.vis / 1000).toFixed(1)} km
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuide("uv")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>☀️ {t("uv_index", "UV Index")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.current.uv.toFixed(1)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({w.current.uv > 7 ? t("uv_very_high", "Very High") : w.current.uv > 4 ? t("uv_moderate", "Moderate") : t("uv_low", "Low")})
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => openGuide("conditions")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>🌧️ {t("rain_chance", "Rain Chance")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.hourly[0]?.pop ?? 0}%
            </span>
          </button>
        </div>

        {/* Air Quality (AQI / PM2.5) Card */}
        {aqiAdvisoryInfo && (
          <button
            type="button"
            onClick={() => openGuide("aqi")}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${aqiAdvisoryInfo.bg}`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  🍃 {t("air_quality", "Air Quality")}:
                </span>
                <span className={`text-xs font-black uppercase ${aqiAdvisoryInfo.color}`}>
                  {aqiAdvisoryInfo.label} (AQI {aqiVal})
                </span>
              </div>
              <p className="text-xs text-foreground/80 font-medium">
                {aqiAdvisoryInfo.advice}
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground px-2 py-1 rounded-lg bg-card/60 shrink-0">
              {t("learn_more", "Guide ℹ️")}
            </span>
          </button>
        )}
      </section>

      {/* 4. ASTRONOMY SUN & MOON TRACKER */}
      <AstronomyTracker weather={w} />

      {/* 5. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 6. 24-HOUR HOURLY FORECAST */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🕒</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("hourly_forecast", "24-Hour Forecast")}
            </h3>
          </div>
          <span className="text-[11px] text-primary font-medium">
            {t("tap_for_details", "Tap for full details →")}
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {w.hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = h.time.includes("T")
              ? h.time.split("T")[1]?.slice(0, 5) ?? h.time
              : h.time.slice(11, 16);

            return (
              <button
                key={`hourly-${idx}`}
                type="button"
                onClick={() => openHourlyDetail(idx)}
                className="flex flex-col items-center justify-between p-2.5 rounded-2xl bg-muted/30 border border-border/40 min-w-[76px] sm:min-w-[82px] text-center shrink-0 snap-start space-y-1.5 transition hover:bg-muted/60 hover:border-primary/50 hover:scale-102 cursor-pointer"
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {idx === 0 ? t("hour_now", "Now") : timeLabel}
                </span>

                <WeatherIcon
                  code={h.code}
                  isDay={h.is_day ?? 1}
                  className="w-7 h-7 sm:w-8 sm:h-8"
                />

                <span className="text-xs font-bold text-foreground">
                  {Math.round(h.temp)}°
                </span>

                {h.pop > 0 && (
                  <span className="text-[10px] text-sky-500 font-semibold">
                    💧{h.pop}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Live Rain Radar */}
      <WeatherRadar weather={w} />

      {/* 7. 7-DAY EXTENDED FORECAST */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("seven_day_forecast", "7-Day Forecast")}
            </h3>
          </div>
          <span className="text-[11px] text-primary font-medium">
            {t("tap_for_details", "Tap for full details →")}
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {w.daily.map((d, idx) => {
            const dayLabel = getDailyDayLabel(d.date, idx, t);

            return (
              <button
                key={`daily-${idx}`}
                type="button"
                onClick={() => openDailyDetail(idx)}
                className="w-full py-2.5 px-2 rounded-xl flex items-center justify-between gap-3 text-xs text-left hover:bg-muted/40 transition cursor-pointer"
              >
                <span className="w-16 font-semibold text-foreground shrink-0">
                  {dayLabel}
                </span>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <WeatherIcon
                    code={d.code}
                    isDay={1}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="text-muted-foreground truncate font-medium">
                    {getConditionLabel(d.code, t)}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-bold">
                  <span className="text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground font-medium">
                    {Math.round(d.min)}°
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 8. WHAT TO WEAR RECOMMENDATIONS */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">👔</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("what_to_wear", "What to Wear")}
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50">
          {(["casual", "business", "workout", "evening"] as WearCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveWearTab(cat)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                activeWearTab === cat
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{wearRecommendations[cat].icon}</span>
              <span className="hidden sm:inline">{wearRecommendations[cat].title}</span>
            </button>
          ))}
        </div>

        <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1.5">
          <p className="font-bold text-foreground">
            {wearRecommendations[activeWearTab].title}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {wearRecommendations[activeWearTab].outfit}
          </p>
        </div>
      </section>

      {/* Weather Guide Modal */}
      <WeatherGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        initialTopic={guideTopic}
      />

      {/* Forecast Details Modal */}
      <ForecastDetailModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        type={forecastModalType}
        selectedIndex={forecastModalIndex}
        onSelectIndex={setForecastModalIndex}
        hourlyList={w.hourly.map((h) => ({
          time: h.time,
          temp: h.temp,
          feels: (h as any).feels ?? h.temp,
          code: h.code,
          pop: h.pop,
          is_day: h.is_day ?? 1,
          windSpeed: (h as any).wind_speed ?? (h as any).windSpeed,
          humidity: (h as any).humidity,
          uv: (h as any).uv,
        }))}
        dailyList={w.daily.map((d) => ({
          date: d.date,
          max: d.max,
          min: d.min,
          code: d.code,
          pop: d.pop,
          ...(d.sunrise ? { sunrise: d.sunrise } : {}),
          ...(d.sunset ? { sunset: d.sunset } : {}),
        }))}
        unit={unit}
        getConditionLabel={(code) => getConditionLabel(code, t)}
        getDayLabel={(dateStr, idx) => getDailyDayLabel(dateStr, idx, t)}
      />

      {/* AI Gallery Modal */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          city={w.place.name}
          onSelectBackground={onSelectBackground}
          onSelectBg={onSelectBackground}
        />
      )}

      {/* Weather Postcard Sharing Modal */}
      {postcardOpen && (
        <WeatherPostcardModal
          isOpen={postcardOpen}
          onClose={() => setPostcardOpen(false)}
          weather={w}
          unit={unit}
          backgroundUrl={displayBg}
        />
      )}
    </div>
  );
};
