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
  customBgUrl?: string;
  onSelectBackground: (url: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  skyKey?: string;
}

type WearCategory = "casual" | "exercise" | "work" | "evening";

function getConditionLabel(code: number, t: TFunction): string {
  if (code === 0) return t("forecast_clear_sky", "Clear Sky");
  if (code === 1) return t("forecast_mainly_clear", "Mainly Clear");
  if (code === 2) return t("forecast_partly_cloudy", "Partly Cloudy");
  if (code === 3) return t("forecast_overcast", "Overcast");
  if (code >= 45 && code <= 48) return t("forecast_foggy", "Foggy");
  if (code >= 51 && code <= 55) return t("forecast_drizzle", "Drizzle");
  if (code >= 61 && code <= 65) return t("forecast_rain", "Rain");
  if (code >= 71 && code <= 77) return t("forecast_snow", "Snow");
  if (code >= 80 && code <= 82) return t("forecast_showers", "Showers");
  if (code >= 85 && code <= 86) return t("forecast_snow_showers", "Snow Showers");
  if (code >= 95 && code <= 99) return t("forecast_thunderstorm", "Thunderstorm");
  return t("forecast_variable", "Variable");
}

function getDailyDayLabel(dateStr: string, idx: number, t: TFunction): string {
  if (idx === 0) return t("forecast_today", "Today");
  if (idx === 1) return t("forecast_tomorrow", "Tomorrow");
  try {
    const d = new Date(dateStr);
    const days = [
      t("day_sunday", "Sun"),
      t("day_monday", "Mon"),
      t("day_tuesday", "Tue"),
      t("day_wednesday", "Wed"),
      t("day_thursday", "Thu"),
      t("day_friday", "Fri"),
      t("day_saturday", "Sat"),
    ];
    return days[d.getDay()] || dateStr;
  } catch {
    return dateStr;
  }
}

function getHourlyTimeLabel(timeStr: string, idx: number, t: TFunction): string {
  if (idx === 0) return t("forecast_now", "Now");
  try {
    const parts = timeStr.split("T");
    if (parts[1]) {
      return parts[1].slice(0, 5);
    }
    return timeStr.slice(-5);
  } catch {
    return timeStr;
  }
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  activeAlerts = [],
  unit,
  customBgUrl,
  onSelectBackground,
  onRefresh,
  isRefreshing = false,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { t } = useTranslation();
  const [currentBgUrl, setCurrentBgUrl] = useState<string>(customBgUrl || "");
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

  // Listen to live background change events from AiGalleryModal or /gallery
  useEffect(() => {
    const handleBgChange = (e: any) => {
      const url = e?.detail?.url;
      if (url) {
        setCurrentBgUrl(url);
      }
    };
    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => window.removeEventListener("weather:custom-bg-change", handleBgChange);
  }, []);

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

  const wearRecommendations: Record<WearCategory, { icon: string; title: string; outfit: string; accessories: string; advice: string }> = {
    casual: {
      icon: "👕",
      title: t("wear_casual_title", "Casual Everyday"),
      outfit:
        tempVal >= 28
          ? t("wear_casual_hot", "Light cotton t-shirt, breathable shorts, or a breezy linen shirt.")
          : tempVal >= 18
          ? t("wear_casual_warm", "Comfortable cotton tee, light jeans or chinos, and walking sneakers.")
          : tempVal >= 10
          ? t("wear_casual_cool", "Long-sleeve sweatshirt, warm knit pullover, and comfortable jeans.")
          : t("wear_casual_cold", "Thermal inner layer, heavy wool sweater, thick trousers, and insulated coat."),
      accessories:
        w.current.code >= 51 && w.current.code <= 82
          ? t("wear_acc_rain", "Windproof umbrella, waterproof footwear, water-repellent jacket.")
          : w.current.uv >= 6
          ? t("wear_acc_sun", "UV-blocking sunglasses, broad-brim sun hat, SPF 50+ sunscreen.")
          : t("wear_acc_mild", "Light cap, everyday canvas bag, sunglasses."),
      advice:
        w.current.aqi && w.current.aqi > 100
          ? t("wear_advice_aqi", "Air quality is sensitive. Wear an N95/KF94 mask outdoors.")
          : t("wear_advice_general", "Stay hydrated and check the hourly trend before extended walks."),
    },
    exercise: {
      icon: "🏃",
      title: t("wear_exercise_title", "Running & Sport"),
      outfit:
        tempVal >= 26
          ? t("wear_sport_hot", "Moisture-wicking sleeveless tank, ultra-light running shorts.")
          : tempVal >= 15
          ? t("wear_sport_mild", "Short-sleeve tech running tee, fitted athletic tights or shorts.")
          : t("wear_sport_cold", "Thermal compression base layer, windproof running jacket, running tights."),
      accessories: t("wear_sport_acc", "Sweatband, polarized running sunglasses, hydration flask."),
      advice:
        tempVal > 30 || (w.current.aqi && w.current.aqi > 150)
          ? t("wear_sport_warning", "Caution: High heat or air index. Prefer indoor gyms or dawn workouts.")
          : t("wear_sport_good", "Great running weather! Warm up well before sprinting."),
    },
    work: {
      icon: "💼",
      title: t("wear_work_title", "Work & Formal"),
      outfit:
        tempVal >= 25
          ? t("wear_biz_hot", "Crisp short-sleeve linen or light cotton dress shirt, tailored trousers.")
          : tempVal >= 15
          ? t("wear_biz_mild", "Classic button-down shirt, breathable tailored blazer, dark dress pants.")
          : t("wear_biz_cool", "Long-sleeve dress shirt, warm wool blazer or cashmere sweater, tailored suit coat."),
      accessories: t("wear_biz_acc", "Leather dress shoes, structured briefcase, compact travel umbrella."),
      advice: t("wear_biz_advice", "Indoor AC can be chilly. Bring a lightweight blazer or cardigan."),
    },
    evening: {
      icon: "🌙",
      title: t("wear_evening_title", "Evening & Dining"),
      outfit:
        tempVal >= 24
          ? t("wear_night_warm", "Smart polo or stylish silk blouse, chinos, clean designer sneakers.")
          : tempVal >= 14
          ? t("wear_night_mild", "Textured knit crewneck, suede or denim overshirt, dark denim pants.")
          : t("wear_night_cold", "Thick knit turtleneck, tailored wool overcoat, leather Chelsea boots."),
      accessories: t("wear_night_acc", "Evening watch, lightweight scarf, stylish compact umbrella."),
      advice: t("wear_night_advice", "Evening temperatures drop 3-5°C after twilight. Keep an outer layer handy."),
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* 1. SEVERE WEATHER ALERT WATCHER */}
      <WeatherAlertWatcher
        weather={w}
        unit={unit}
        activeAlerts={activeAlerts}
      />

      {/* 2. FROSTED ACTION TOOLBAR (LOCKED SAFELY ABOVE THE HERO CARD) */}
      <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-card/85 backdrop-blur-md border border-border shadow-xs">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={handleNextArtwork}
            title={t("next_artwork", "Next Artwork")}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-border/50"
          >
            <span className="text-sm">🎨</span>
            <span className="hidden sm:inline text-xs">{t("next_art", "Next Art")}</span>
          </button>

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

          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFavorite ? t("remove_fav", "Favorited") : t("add_fav", "Add Favorite")}
              className={`h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5 border ${
                isFavorite
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500 font-bold"
                  : "bg-muted hover:bg-muted/80 text-foreground border-border/50"
              }`}
            >
              <span className="text-sm">{isFavorite ? "⭐" : "☆"}</span>
              <span className="hidden sm:inline text-xs">{isFavorite ? t("saved", "Saved") : t("favorite", "Favorite")}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            title={t("ai_gallery_title", "AI Scene Gallery")}
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold border border-primary/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-sm">🖼️</span>
            <span className="text-xs font-bold">{t("gallery_btn", "Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostcardOpen(true)}
            title={t("share_postcard", "Create Weather Postcard")}
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
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{w.place.name}</span>
              {w.place.country && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                  {w.place.country}
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
            <span>📖</span>
            <span className="hidden sm:inline">{t("guide_btn", "Weather Guide")}</span>
          </button>
        </div>

        {/* Temperature, Icon, and High/Low */}
        <div className="flex items-center justify-between gap-4 py-2 border-y border-border/40">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-6xl font-black tracking-tighter">
              {tempVal}{tempUnitStr}
            </span>
            <div className="inline-flex items-center justify-center shrink-0">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.is_day ? 1 : 0}
                className="w-12 h-12 sm:w-16 sm:h-16 drop-shadow-md"
              />
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="text-xs sm:text-sm font-semibold text-muted-foreground">
              {t("feels_like", "Feels like")} <span className="text-foreground font-bold">{feelsLikeVal}{tempUnitStr}</span>
            </div>
            {w.daily && w.daily[0] && (
              <div className="text-xs font-medium text-muted-foreground">
                <span className="text-rose-500 font-bold">↑{Math.round(w.daily[0].max)}{tempUnitStr}</span>
                {" "}/{" "}
                <span className="text-sky-500 font-bold">↓{Math.round(w.daily[0].min)}{tempUnitStr}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric Grid Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => openGuide("humidity")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition text-left border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
              <span>{t("humidity", "Humidity")}</span>
              <span>💧</span>
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {Math.round(w.current.humidity)}%
            </div>
          </button>

          <button
            type="button"
            onClick={() => openGuide("wind")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition text-left border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
              <span>{t("wind", "Wind")}</span>
              <span>💨</span>
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {Math.round(w.current.wind)} <span className="text-xs font-normal">{speedUnitStr}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openGuide("uv")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition text-left border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
              <span>{t("uv_index", "UV Index")}</span>
              <span>☀️</span>
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {Math.round(w.current.uv)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => openGuide("aqi")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition text-left border border-border/40 cursor-pointer"
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold mb-1">
              <span>{t("air_quality", "Air Quality")}</span>
              <span>🍃</span>
            </div>
            <div className="text-base sm:text-lg font-black text-foreground">
              {w.current.aqi ? Math.round(w.current.aqi) : "—"}
            </div>
          </button>
        </div>

        {/* AQI Warning banner */}
        {w.current.aqi && w.current.aqi > 100 && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">😷</span>
              <span>{t("aqi_elevated_warning", "Elevated air pollution levels. Sensitive individuals should wear a mask outdoors.")}</span>
            </div>
            <button
              type="button"
              onClick={() => openGuide("aqi")}
              className="text-[11px] font-bold underline shrink-0 cursor-pointer"
            >
              {t("learn_more", "Learn More")}
            </button>
          </div>
        )}
      </section>

      {/* 5. WEATHER MASCOT BUDDY */}
      <WeatherMascot weather={w} />

      {/* 6. HOURLY FORECAST (TAP ANY CARD FOR EXPANDED DETAIL) */}
      {w.hourly && w.hourly.length > 0 && (
        <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <span>⏱️</span>
              <span>{t("hourly_forecast", "Hourly Forecast")}</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {t("tap_for_details", "Tap for details")}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
            {w.hourly.slice(0, 24).map((h, idx) => (
              <button
                key={h.time || idx}
                type="button"
                onClick={() => openHourlyDetail(idx)}
                className="shrink-0 w-16 p-2.5 rounded-2xl bg-muted/40 hover:bg-muted/80 transition text-center border border-border/40 cursor-pointer active:scale-95 space-y-1.5"
              >
                <div className="text-[11px] font-semibold text-muted-foreground truncate">
                  {getHourlyTimeLabel(h.time, idx, t)}
                </div>
                <div className="flex justify-center py-0.5">
                  <WeatherIcon
                    code={h.code}
                    isDay={h.is_day ? 1 : 0}
                    className="w-6 h-6"
                  />
                </div>
                <div className="text-xs font-black text-foreground">
                  {Math.round(h.temp)}{tempUnitStr}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 7. 7-DAY EXTENDED FORECAST (TAP ANY ROW FOR EXPANDED DETAIL) */}
      {w.daily && w.daily.length > 0 && (
        <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <span>📅</span>
              <span>{t("seven_day_forecast", "7-Day Forecast")}</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {t("tap_for_details", "Tap for details")}
            </span>
          </div>

          <div className="divide-y divide-border/40">
            {w.daily.map((d, idx) => (
              <button
                key={d.date || idx}
                type="button"
                onClick={() => openDailyDetail(idx)}
                className="w-full py-2.5 px-2 flex items-center justify-between hover:bg-muted/40 rounded-xl transition cursor-pointer text-left"
              >
                <div className="w-24 text-xs font-bold text-foreground">
                  {getDailyDayLabel(d.date, idx, t)}
                </div>

                <div className="flex items-center gap-2 flex-1 px-2">
                  <WeatherIcon code={d.code} isDay={1} className="w-5 h-5 shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {getConditionLabel(d.code, t)}
                  </span>
                </div>

                <div className="text-right text-xs font-semibold whitespace-nowrap">
                  <span className="text-rose-500 font-bold">{Math.round(d.max)}{tempUnitStr}</span>
                  {" "}
                  <span className="text-muted-foreground font-normal">/</span>
                  {" "}
                  <span className="text-sky-500 font-bold">{Math.round(d.min)}{tempUnitStr}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 8. WHAT TO WEAR ADVICE TABS */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
        <h3 className="text-sm font-black flex items-center gap-1.5">
          <span>👔</span>
          <span>{t("what_to_wear", "What to Wear")}</span>
        </h3>

        {/* Category Tabs */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border/40">
          {(["casual", "exercise", "work", "evening"] as WearCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveWearTab(cat)}
              className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer capitalize min-w-0 truncate ${
                activeWearTab === cat
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {wearRecommendations[cat].icon} <span className="truncate">{wearRecommendations[cat].title.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Box */}
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2 text-xs">
          <div>
            <span className="font-bold text-foreground mr-1.5">{t("outfit", "Outfit:")}</span>
            <span className="text-muted-foreground">{wearRecommendations[activeWearTab].outfit}</span>
          </div>
          <div>
            <span className="font-bold text-foreground mr-1.5">{t("accessories", "Accessories:")}</span>
            <span className="text-muted-foreground">{wearRecommendations[activeWearTab].accessories}</span>
          </div>
          <div className="pt-1 text-[11px] text-primary font-medium flex items-center gap-1">
            <span>💡</span>
            <span>{wearRecommendations[activeWearTab].advice}</span>
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
