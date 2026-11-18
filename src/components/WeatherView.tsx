// src/components/WeatherView.tsx
import React, { useState, useEffect, useCallback } from "react";
import type { TFunction } from "i18next";
import {
  type Weather,
  type WeatherUnit,
  type Place,
  aqiCategory,
  describe,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";
import {
  type SavedItem,
  getWallpaperItem,
  setWallpaperItem,
  deleteWallpaperItem,
  getSavedArtworks,
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
  loading: boolean;
  onRefresh: () => void;
  isFav: boolean;
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
  56: { key: "wmo_56", fallback: "Light freezing drizzle" },
  57: { key: "wmo_57", fallback: "Dense freezing drizzle" },
  61: { key: "wmo_61", fallback: "Slight rain" },
  63: { key: "wmo_63", fallback: "Moderate rain" },
  65: { key: "wmo_65", fallback: "Heavy rain" },
  66: { key: "wmo_66", fallback: "Light freezing rain" },
  67: { key: "wmo_67", fallback: "Heavy freezing rain" },
  71: { key: "wmo_71", fallback: "Slight snow fall" },
  73: { key: "wmo_73", fallback: "Moderate snow fall" },
  75: { key: "wmo_75", fallback: "Heavy snow fall" },
  77: { key: "wmo_77", fallback: "Snow grains" },
  80: { key: "wmo_80", fallback: "Slight rain showers" },
  81: { key: "wmo_81", fallback: "Moderate rain showers" },
  82: { key: "wmo_82", fallback: "Violent rain showers" },
  85: { key: "wmo_85", fallback: "Slight snow showers" },
  86: { key: "wmo_86", fallback: "Heavy snow showers" },
  95: { key: "wmo_95", fallback: "Thunderstorm" },
  96: { key: "wmo_96", fallback: "Thunderstorm with slight hail" },
  99: { key: "wmo_99", fallback: "Thunderstorm with heavy hail" },
};

export function getConditionLabel(code: number, t: TFunction): string {
  const mapping = WMO_KEY_MAP[code];
  if (mapping) {
    return t(mapping.key, mapping.fallback);
  }
  return describe(code);
}

function getUvIndexInfo(uv: number, t: TFunction): { label: string; color: string } {
  if (uv <= 2) return { label: t("uv_low", "Low"), color: "text-emerald-500" };
  if (uv <= 5) return { label: t("uv_mod", "Moderate"), color: "text-amber-500" };
  if (uv <= 7) return { label: t("uv_high", "High"), color: "text-orange-500" };
  if (uv <= 10) return { label: t("uv_vhigh", "Very High"), color: "text-rose-500" };
  return { label: t("uv_ext", "Extreme"), color: "text-purple-600" };
}

function getAqiAdvisory(
  aqi: number | undefined,
  pm25: number | undefined,
  t: TFunction,
  lang: string
): { label: string; advice: string; color: string; bg: string } | null {
  if (aqi === undefined && pm25 === undefined) return null;
  const val = aqi ?? Math.round((pm25 ?? 0) * 2.5);

  if (val <= 50) {
    return {
      label: t("aqi_good", "Good"),
      advice: t("aqi_good_advice", lang === "th" ? "อากาศบริสุทธิ์ เหมาะกับการทำกิจกรรมกลางแจ้ง" : "Clean air. Perfect for outdoor sports and activities."),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    };
  }
  if (val <= 100) {
    return {
      label: t("aqi_moderate", "Moderate"),
      advice: t("aqi_mod_advice", lang === "th" ? "คุณภาพอากาศปานกลาง กลุ่มเสี่ยงควรระวัง" : "Acceptable. Sensitive individuals should consider limiting long exertion."),
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    };
  }
  if (val <= 150) {
    return {
      label: t("aqi_unhealthy_sensitive", "Unhealthy for Sensitive"),
      advice: t("aqi_sens_advice", lang === "th" ? "กลุ่มเสี่ยงควรสวมหน้ากาก N95 เมื่ออยู่กลางแจ้ง" : "Sensitive groups should wear an N95 mask outside."),
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/20",
    };
  }
  return {
    label: t("aqi_unhealthy", "Unhealthy"),
    advice: t("aqi_unhealthy_advice", lang === "th" ? "ฝุ่นละอองสูง ควรหลีกเลี่ยงกิจกรรมกลางแจ้งและสวมหน้ากาก" : "High pollution. Avoid outdoor exercise and wear an N95 mask."),
    color: "text-rose-500",
    bg: "bg-rose-500/10 border-rose-500/20",
  };
}

function degreesToCompass(deg: number | undefined, t: TFunction): string {
  if (deg === undefined || deg === null) return "";
  const val = Math.floor((deg / 22.5) + 0.5) % 16;
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const dir = dirs[val] ?? "N";
  return t(`dir_${dir.toLowerCase()}`, dir);
}

function formatHourlyTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
  } catch {
    return isoString;
  }
}

function getDailyDayLabel(dateStr: string, idx: number, t: TFunction): string {
  if (idx === 0) return t("day_today", "Today");
  if (idx === 1) return t("day_tomorrow", "Tomorrow");
  try {
    const d = new Date(dateStr + "T00:00:00");
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const key = `day_${dayNames[d.getDay()]}`;
    return t(key, d.toLocaleDateString([], { weekday: "short" }));
  } catch {
    return dateStr;
  }
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  activeAlerts = [],
  unit,
  loading,
  onRefresh,
  isFav,
  onToggleFavorite,
  onSelectBackground,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [activeWearTab, setActiveWearTab] = useState<WearCategory>("casual");
  const [disasters, setDisasters] = useState<TickerAlertItem[]>([]);

  // Modals for Explanations and Uncut Phone Forecasts
  const [guideOpen, setGuideOpen] = useState<boolean>(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [forecastModalOpen, setForecastModalOpen] = useState<boolean>(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState<number>(0);

  // Background artwork resolution
  const [currentBgUrl, setCurrentBgUrl] = useState<string | null>(null);

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
      setCurrentBgUrl(saved.url);
      return;
    }
    const fallback = getCityWeatherBackground(w.place.name, w.current.code);
    setCurrentBgUrl(fallback);
  }, [w.place.name, w.current.code, customBgUrl]);

  useEffect(() => {
    loadActiveBackground();
  }, [loadActiveBackground]);

  const displayBg = currentBgUrl || getCityWeatherBackground(w.place.name, w.current.code);

  const handleNextArtwork = async () => {
    const artworks = getAllAvailableArtworks(w.place.name, w.current.code);
    if (!artworks || artworks.length <= 1) return;
    const curIdx = artworks.indexOf(displayBg);
    const nextIdx = (curIdx + 1) % artworks.length;
    const nextUrl = artworks[nextIdx];
    setCurrentBgUrl(nextUrl);
    onSelectBackground(nextUrl);
    await setWallpaperItem({
      city: w.place.name,
      url: nextUrl,
      timestamp: Date.now(),
      title: `${w.place.name} Art`,
      source: "curated",
    });
  };

  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? "mph" : "km/h";
  const visUnitStr = unit === "imperial" ? "mi" : "km";
  const pressureUnitStr = unit === "imperial" ? "inHg" : "hPa";

  const currentConditionText = getConditionLabel(w.current.code, t);
  const feelsLikeVal = Math.round(w.current.feels ?? w.current.temp);
  const tempVal = Math.round(w.current.temp);
  const windCompass = degreesToCompass(w.current.wind_dir, t);
  const uvNum = typeof w.current.uv === "number" ? Math.round(w.current.uv) : 0;
  const uvInfo = getUvIndexInfo(uvNum, t);

  const todayDaily = w.daily && w.daily.length > 0 ? w.daily[0] : null;
  const highTemp = todayDaily ? Math.round(todayDaily.max) : tempVal;
  const lowTemp = todayDaily ? Math.round(todayDaily.min) : tempVal;
  const rainChanceVal = todayDaily ? Math.round(todayDaily.pop) : Math.round(w.hourly?.[0]?.precipProb ?? 0);

  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;

  const aqiVal = typeof w.current?.aqi === "number" ? Math.round(w.current.aqi) : undefined;
  const pm25Val = typeof w.current?.pm25 === "number" ? w.current.pm25 : undefined;
  const aqiAdvisoryInfo = getAqiAdvisory(aqiVal, pm25Val, t, lang);

  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;

  const wearRecommendations: Record<WearCategory, { title: string; outfit: string; icon: string }> = {
    business: {
      title: t("wear_cat_business", lang === "th" ? "ชุดทำงาน / สุภาพ" : "Work & Formal"),
      icon: "💼",
      outfit:
        tempC < 10
          ? t("wear_biz_cold", lang === "th" ? "เสื้อโค้ตผ้าวูลสูททางการ เสื้อเชิ้ตแขนยาว กางเกงสแล็ก" : "Tailored wool overcoat or blazer, dress shirt, and slacks.")
          : tempC < 22
          ? t("wear_biz_mild", lang === "th" ? "เสื้อเบลเซอร์ทำงาน เสื้อเชิ้ต หรือชุดเดรสสุภาพ" : "Structured blazer, breathable dress shirt, and lightweight trousers.")
          : t("wear_biz_warm", lang === "th" ? "เสื้อเชิ้ตผ้าลินิน/คอตตอนโปร่ง กางเกงสแล็กน้ำหนักเบา" : "Crisp lightweight cotton or linen dress shirt and slacks."),
    },
    casual: {
      title: t("wear_cat_casual", lang === "th" ? "ชุดลำลอง / ท่องเที่ยว" : "Casual & Travel"),
      icon: "👕",
      outfit:
        tempC < 10
          ? t("wear_cas_cold", lang === "th" ? "เสื้อฮู้ดหนา แจ็กเก็ตดาวน์ กางเกงยีนส์ ผ้าพันคอ" : "Heavy hoodie, insulated winter jacket, jeans, and warm beanie.")
          : tempC < 22
          ? t("wear_cas_mild", lang === "th" ? "เสื้อยืดสวมทับคาร์ดิแกนบาง หรือเสื้อเชิ้ตโอเวอร์ไซส์" : "Comfy tee paired with an overshirt or light cardigan.")
          : t("wear_cas_warm", lang === "th" ? "เสื้อยืดคอตตอนโปร่งสบาย กางเกงขาสั้นผ้าชิโน" : "Breathable cotton tee, light shorts, and comfortable sandals or sneakers."),
    },
    workout: {
      title: t("wear_cat_workout", lang === "th" ? "ออกกำลังกาย / วิ่ง" : "Sport & Running"),
      icon: "🏃",
      outfit:
        tempC < 10
          ? t("wear_run_cold", lang === "th" ? "เสื้อรัดกล้ามเนื้อแขนยาว กางเกงเลกกิ้ง ถุงมือวิ่ง" : "Thermal compression top, running tights, and light gloves.")
          : tempC < 22
          ? t("wear_run_mild", lang === "th" ? "เสื้อวิ่ง Dri-FIT แขนสั้น กางเกงขาสั้นวิ่ง" : "Moisture-wicking technical tee and athletic shorts.")
          : t("wear_run_warm", lang === "th" ? "เสื้อกล้ามวิ่งเบาบาง หมวกบังแดด กางเกงขาสั้น" : "Ultra-breathable singlet, running cap, and hydration pack."),
    },
    evening: {
      title: t("wear_cat_evening", lang === "th" ? "เที่ยวกลางคืน / ปาร์ตี้" : "Evening & Out"),
      icon: "✨",
      outfit:
        tempC < 14
          ? t("wear_eve_cold", lang === "th" ? "แจ็กเก็ตหนัง เสื้อไหมพรม กางเกงสแล็ก รองเท้าบูท" : "Fitted leather or tailored jacket, fine sweater, and boots.")
          : t("wear_eve_warm", lang === "th" ? "เสื้อเชิ้ตคิวบา กางเกงขายาวผ้าลินินทรงสวย" : "Relaxed camp-collar shirt, linen trousers, and loafers."),
    },
  };

  const openGuide = (targetTopic: GuideTopic = "all") => {
    setGuideTopic(targetTopic);
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full pb-8">
      {/* 1. SEVERE WEATHER ALERT WATCHER */}
      <WeatherAlertWatcher
        weather={w}
        alerts={alertsToDisplay}
        onRefreshWeather={onRefresh}
      />

      {/* 2. HERO CARD: UNOBSTRUCTED WALLPAPER WITH INTEGRATED CONTROLS */}
      <section className="relative overflow-hidden rounded-3xl border border-white/25 shadow-xl min-h-[360px] sm:min-h-[420px] flex flex-col justify-between transition-all duration-500">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${displayBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Top Floating Control Bar */}
        <div className="relative z-10 flex items-center justify-between p-3.5 sm:p-4">
          <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <span>🎨</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              {w.place.name} Art
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleNextArtwork}
              className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              title={t("next_art", "Next Artwork")}
            >
              <span>🖼️</span>
              <span className="hidden sm:inline">{t("next_art", "Next")}</span>
            </button>

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

            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-xs shadow-sm transition active:scale-95 cursor-pointer ${
                isFav ? "text-amber-400" : "text-white"
              }`}
              title={isFav ? t("fav_saved", "Favorited") : t("fav_add", "Add Favorite")}
            >
              {isFav ? "★" : "☆"}
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

            <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground/90">{currentConditionText}</span>
              <span>•</span>
              <span>
                {t("updated_just_now", "Updated")}{" "}
                {w.fetchedAt
                  ? new Date(w.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : t("recently", "recently")}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Simple Weather Guide Button */}
            <button
              type="button"
              onClick={() => openGuide("all")}
              className="px-2.5 py-1.5 rounded-xl border border-border/70 bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition cursor-pointer flex items-center gap-1 shadow-xs"
              title={t("guide_tooltip", "Explain weather numbers & terms in simple words")}
            >
              <span>ℹ️</span>
              <span className="hidden sm:inline">{t("guide", "Guide")}</span>
            </button>

            {/* Weather Mascot */}
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

            <div className="space-y-1 text-xs border-l border-border/60 pl-3.5">
              <p className="text-muted-foreground font-medium">
                {t("feels_like", "Feels like")}{" "}
                <span className="font-extrabold text-foreground">
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
            <span className="text-[11px] font-bold text-foreground text-center max-w-[120px] truncate mt-0.5">
              {currentConditionText}
            </span>
          </div>
        </div>

        {/* Interactive Metrics Grid — Tapping any card opens the simple guide */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Wind Speed */}
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
              {Math.round(w.current.wind_speed ?? 0)} {speedUnitStr}{" "}
              {windCompass && <span className="text-xs font-normal text-muted-foreground">({windCompass})</span>}
            </span>
          </button>

          {/* Humidity */}
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
              {Math.round(w.current.humidity ?? 0)}%
            </span>
          </button>

          {/* Air Pressure */}
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
              {unit === "imperial" ? ((w.current.pressure ?? 1013) * 0.02953).toFixed(2) : Math.round(w.current.pressure ?? 1013)} {pressureUnitStr}
            </span>
          </button>

          {/* Visibility */}
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
              {typeof w.current.vis === "number" ? Math.round(unit === "imperial" ? w.current.vis * 0.621371 : w.current.vis) : "--"} {visUnitStr}
            </span>
          </button>

          {/* UV Index */}
          <button
            type="button"
            onClick={() => openGuide("uv")}
            className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/40 hover:border-primary/50 text-left flex flex-col justify-between transition cursor-pointer"
          >
            <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
              <span>☀️ {t("uv_index", "UV Index")}</span>
              <span className="text-[10px] text-muted-foreground/70">ℹ️</span>
            </span>
            <span className={`text-sm font-bold mt-1 ${uvInfo.color}`}>
              {uvNum} <span className="text-[11px] font-medium text-muted-foreground">({uvInfo.label})</span>
            </span>
          </button>

          {/* Rain Chance */}
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
              {rainChanceVal}%
            </span>
          </button>
        </div>

        {/* Air Quality Banner */}
        {aqiAdvisoryInfo && (
          <button
            type="button"
            onClick={() => openGuide("aqi")}
            className={`w-full p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${aqiAdvisoryInfo.bg}`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  🍃 {t("air_quality", "Air Quality")}:
                </span>
                <span className={`text-xs font-black ${aqiAdvisoryInfo.color}`}>
                  {aqiAdvisoryInfo.label} {aqiVal !== undefined ? `(AQI ${aqiVal})` : ""}
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

      {/* 4. ASTRONOMY & SUN/MOON TRACKER */}
      <AstronomyTracker weather={w} />

      {/* 5. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 6. 24-HOUR HOURLY FORECAST — TAP ANY CARD TO OPEN FULL DETAILS POPUP */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🕒</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("hourly_forecast", "24-Hour Forecast")}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {t("tap_to_view_details", "Tap any hour for full words 🔍")}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {w.hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = formatHourlyTime(h.time);
            const conditionStr = getConditionLabel(h.code, t);
            const hTemp = Math.round(h.temp);

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
                  className="w-7 h-7 my-1"
                />

                <span className="text-[10px] font-medium text-muted-foreground line-clamp-1 h-3.5 max-w-[70px]">
                  {conditionStr}
                </span>

                <span className="text-xs font-extrabold text-foreground">
                  {hTemp}{tempUnitStr}
                </span>

                {h.pop > 0 && (
                  <span className="text-[10px] font-semibold text-blue-500">
                    💧{h.pop}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Live Rain Radar & Precipitation Map */}
      <WeatherRadar weather={w} />

      {/* 7. 7-DAY EXTENDED FORECAST — TAP ANY ROW TO OPEN FULL DETAILS POPUP */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("seven_day_forecast", "7-Day Forecast")}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {t("tap_to_view_details", "Tap any day for full words 🔍")}
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {w.daily.slice(0, 7).map((d, idx) => {
            const dayLabel = getDailyDayLabel(d.date, idx, t);
            const dailyCondition = getConditionLabel(d.code, t);
            const dMax = Math.round(d.max);
            const dMin = Math.round(d.min);

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
                  <WeatherIcon code={d.code} isDay={1} className="w-6 h-6 shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {dailyCondition}
                  </span>
                </div>

                {d.pop > 0 && (
                  <span className="text-[11px] font-semibold text-blue-500 shrink-0">
                    💧{d.pop}%
                  </span>
                )}

                <div className="flex items-center gap-2 font-semibold text-right shrink-0">
                  <span className="text-foreground">{dMax}{tempUnitStr}</span>
                  <span className="text-muted-foreground font-normal">/ {dMin}{tempUnitStr}</span>
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

      {/* Simple Weather Guide Modal */}
      <WeatherGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        initialTopic={guideTopic}
      />

      {/* Hourly & 7-Day Untruncated Forecast Detail Modal */}
      <ForecastDetailModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        type={forecastModalType}
        selectedIndex={forecastModalIndex}
        onSelectIndex={setForecastModalIndex}
        hourlyList={w.hourly.map((h) => ({
          time: h.time,
          temp: h.temp,
          feels: h.feels,
          code: h.code,
          pop: h.pop,
          is_day: h.is_day,
          windSpeed: h.wind_speed,
          humidity: h.humidity,
          uv: h.uv,
        }))}
        dailyList={w.daily.map((d) => ({
          date: d.date,
          max: d.max,
          min: d.min,
          code: d.code,
          pop: d.pop,
          sunrise: d.sunrise,
          sunset: d.sunset,
        }))}
        unit={unit}
        getConditionLabel={(code) => getConditionLabel(code, t)}
        getDayLabel={(dateStr, idx) => getDailyDayLabel(dateStr, idx, t)}
      />

      {/* Embedded AI Gallery Modal */}
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

export default WeatherView;
