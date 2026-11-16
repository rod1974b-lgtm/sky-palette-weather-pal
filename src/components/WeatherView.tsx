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
}

interface WeatherViewProps {
  weather?: Weather | null;
  w?: Weather | null;
  activeAlerts?: TickerAlertItem[];
  disasters?: TickerAlertItem[];
  unit: WeatherUnit;
  loading: boolean;
  onRefresh: () => void;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
  isFav?: boolean;
  onToggleFavorite?: () => void;
  onOpenAiGallery?: () => void;
  customBgUrl?: string | null;
}

type WearCategory = "casual" | "business" | "sports";

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_mainly_clear", fallback: "Mainly clear" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_depositing_rime_fog", fallback: "Depositing rime fog" },
  51: { key: "cond_drizzle_light", fallback: "Light drizzle" },
  53: { key: "cond_drizzle_mod", fallback: "Moderate drizzle" },
  55: { key: "cond_drizzle_dense", fallback: "Dense drizzle" },
  56: { key: "cond_freezing_drizzle_light", fallback: "Freezing drizzle (light)" },
  57: { key: "cond_freezing_drizzle_dense", fallback: "Freezing drizzle (dense)" },
  61: { key: "cond_rain_slight", fallback: "Slight rain" },
  63: { key: "cond_rain_mod", fallback: "Moderate rain" },
  65: { key: "cond_rain_heavy", fallback: "Heavy rain" },
  66: { key: "cond_freezing_rain_light", fallback: "Freezing rain (light)" },
  67: { key: "cond_freezing_rain_heavy", fallback: "Freezing rain (heavy)" },
  71: { key: "cond_snow_slight", fallback: "Slight snow" },
  73: { key: "cond_snow_mod", fallback: "Moderate snow" },
  75: { key: "cond_snow_heavy", fallback: "Heavy snow" },
  77: { key: "cond_snow_grains", fallback: "Snow grains" },
  80: { key: "cond_rain_showers_slight", fallback: "Slight rain showers" },
  81: { key: "cond_rain_showers_mod", fallback: "Moderate rain showers" },
  82: { key: "cond_rain_showers_violent", fallback: "Violent rain showers" },
  85: { key: "cond_snow_showers_slight", fallback: "Slight snow showers" },
  86: { key: "cond_snow_showers_heavy", fallback: "Heavy snow showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm_slight_hail", fallback: "Thunderstorm with slight hail" },
  99: { key: "cond_thunderstorm_heavy_hail", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number | undefined, t: TFunction): string {
  if (code === undefined || code === null) return t("cond_unknown", "Unknown");
  const mapping = WMO_KEY_MAP[code];
  if (!mapping) return t("cond_unknown", "Unknown");
  return t(mapping.key, mapping.fallback);
}

function formatHourlyTime(timeStr: string): string {
  if (!timeStr) return "";
  try {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString([], { hour: "numeric", hour12: true });
  } catch {
    return timeStr;
  }
}

function getDailyDayLabel(dateStr: string, idx: number, t: TFunction): string {
  if (idx === 0) return t("day_today", "Today");
  if (idx === 1) return t("day_tomorrow", "Tomorrow");
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dayNum = d.getDay();
      const keys = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"];
      const fallbacks = ["Sun", "Mon", "Wed", "Thu", "Fri", "Sat"];
      return t(keys[dayNum] ?? "day_sun", fallbacks[dayNum] ?? "Sun");
    }
  } catch {}
  return dateStr;
}

function getUvIndexInfo(uv: number | undefined, t: TFunction): { label: string; color: string } {
  const val = uv ?? 0;
  if (val <= 2) return { label: t("uv_low", "Low"), color: "text-emerald-500 dark:text-emerald-400" };
  if (val <= 5) return { label: t("uv_moderate", "Moderate"), color: "text-amber-500 dark:text-amber-400" };
  if (val <= 7) return { label: t("uv_high", "High"), color: "text-orange-500 dark:text-orange-400" };
  if (val <= 10) return { label: t("uv_very_high", "Very High"), color: "text-rose-500 dark:text-rose-400" };
  return { label: t("uv_extreme", "Extreme"), color: "text-purple-600 dark:text-purple-400 font-extrabold" };
}

function degreesToCompass(deg: number | undefined, t: TFunction): string {
  if (deg === undefined || deg === null) return "";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const val = Math.floor((deg / 22.5) + 0.5) % 16;
  const dir = dirs[val] ?? "N";
  return t(`dir_${dir.toLowerCase()}`, dir);
}

function getAqiAdvisory(aqi: number | undefined, pm25: number | undefined, t: TFunction, lang: string) {
  const effectiveAqi = aqi !== undefined ? aqi : (pm25 ? Math.round(pm25 * 3) : undefined);
  if (effectiveAqi === undefined) return null;

  if (effectiveAqi <= 50) {
    return {
      label: t("aqi_good", lang === "th" ? "ดีมาก" : "Good"),
      advice: t("aqi_good_advice", lang === "th" ? "คุณภาพอากาศดี เหมาะสำหรับกิจกรรมกลางแจ้งทุกชนิด" : "Air quality is satisfactory; enjoy outdoor activities!"),
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
    };
  }
  if (effectiveAqi <= 100) {
    return {
      label: t("aqi_moderate", lang === "th" ? "ปานกลาง" : "Moderate"),
      advice: t("aqi_mod_advice", lang === "th" ? "คุณภาพอากาศปานกลาง ผู้แพ้ง่ายควรสังเกตอาการ" : "Acceptable quality; sensitive groups should consider limiting prolonged exertion."),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
    };
  }
  if (effectiveAqi <= 150) {
    return {
      label: t("aqi_sensitive", lang === "th" ? "เริ่มมีผลต่อสุขภาพ" : "Unhealthy for Sensitive"),
      advice: t("aqi_sens_advice", lang === "th" ? "เด็ก ผู้สูงอายุ และผู้มีโรคทางเดินหายใจควรลดการออกกำลังกายกลางแจ้ง" : "Children, seniors, and sensitive individuals should limit prolonged outdoor exertion."),
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/30",
    };
  }
  if (effectiveAqi <= 200) {
    return {
      label: t("aqi_unhealthy", lang === "th" ? "มีผลต่อสุขภาพ" : "Unhealthy"),
      advice: t("aqi_unhealthy_advice", lang === "th" ? "ทุกคนควรสวมหน้ากาก N95 เมื่ออยู่กลางแจ้ง และงดการออกกำลังกายหนัก" : "Everyone should wear an N95 mask outdoors, avoid prolonged exertion, and keep windows closed."),
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/30",
    };
  }
  return {
    label: t("aqi_hazardous", lang === "th" ? "อันตรายมาก" : "Hazardous"),
    advice: t("aqi_hazard_advice", lang === "th" ? "คำเตือนสุขภาพ: ควรสวมหน้ากาก N95 หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด และเปิดเครื่องฟอกอากาศ" : "Health alert: Wear an N95 mask outdoors, keep windows shut, and run air purifiers indoors."),
    color: "text-purple-600 dark:text-purple-400 font-extrabold",
    bg: "bg-purple-500/15 border-purple-500/40",
  };
}

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: weatherProp,
  activeAlerts = [],
  disasters = [],
  unit,
  loading,
  onRefresh,
  onSelectBg,
  onSelectBackground,
  isFav = false,
  onToggleFavorite,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const w = weatherProp || weather;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [activeWearCategory, setActiveWearCategory] = useState<WearCategory>("casual");

  // Artwork & Wallpaper Slot Cycling State
  const [displayBg, setDisplayBg] = useState<string>("");
  const [availableArtworks, setAvailableArtworks] = useState<string[]>([]);
  const [artIdx, setArtIdx] = useState<number>(0);
  const [artLoaded, setArtLoaded] = useState<boolean>(false);

  // Initialize DB migration once on mount
  useEffect(() => {
    migrateLegacyLocalStorage().catch(() => {});
  }, []);

  // Update wallpaper pool whenever place/weather changes
  const refreshWallpaperPool = useCallback(async () => {
    if (!w?.place?.name) return;
    const resolveFallbackBg = async (): Promise<string> => {
      const code = w.current?.code ?? 0;
      const res = await getCityWeatherBackground(
        w.place.name,
        describe(code).label,
        code,
        w.current?.temp ?? 0,
        undefined,
        w.place.country,
        w.place.lat,
        w.place.lon
      );
      return res.initialBg;
    };
    try {
      const [allDefaults, savedSlots] = await Promise.all([
        Promise.resolve(getAllAvailableArtworks(w.place.name, w.current?.code ?? 0, describe(w.current?.code ?? 0).label, w.place.country)),
        getSavedArtworks().catch(() => [] as SavedItem[]),
      ]);

      const pool: string[] = [];
      savedSlots.forEach((slot) => {
        if (slot.url && !pool.includes(slot.url)) {
          pool.push(slot.url);
        }
      });

      allDefaults.forEach((url) => {
        if (url && !pool.includes(url)) {
          pool.push(url);
        }
      });

      setAvailableArtworks(pool);

      const activeCustom = customBgUrl || (await getWallpaperItem("current_wallpaper"));
      if (activeCustom) {
        setDisplayBg(activeCustom);
      } else if (pool[0]) {
        setDisplayBg(pool[0]);
      } else {
        setDisplayBg(await resolveFallbackBg());
      }
      setArtLoaded(true);
    } catch {
      if (w?.place?.name) {
        setDisplayBg(await resolveFallbackBg().catch(() => ""));
      }
    }
  }, [w?.place?.name, w?.place?.country, w?.place?.lat, w?.place?.lon, w?.current?.code, w?.current?.temp, customBgUrl]);

  useEffect(() => {
    refreshWallpaperPool();
  }, [refreshWallpaperPool]);

  // Listen to cross-component wallpaper change events
  useEffect(() => {
    const handleWallpaperChanged = (e: CustomEvent<{ url: string }>) => {
      if (e.detail?.url) {
        setDisplayBg(e.detail.url);
        setArtLoaded(true);
      }
    };

    window.addEventListener("weather:wallpaper-changed" as any, handleWallpaperChanged as any);
    return () => {
      window.removeEventListener("weather:wallpaper-changed" as any, handleWallpaperChanged as any);
    };
  }, []);

  const handleSelectBackground = useCallback(
    async (url: string) => {
      setDisplayBg(url);
      setArtLoaded(true);
      try {
        await setWallpaperItem("current_wallpaper", url);
      } catch {}
      if (onSelectBg) onSelectBg(url);
      if (onSelectBackground) onSelectBackground(url);
    },
    [onSelectBg, onSelectBackground]
  );

  const cycleNextArtwork = useCallback(async () => {
    if (availableArtworks.length === 0) return;
    const nextIdx = (artIdx + 1) % availableArtworks.length;
    setArtIdx(nextIdx);
    const nextUrl = availableArtworks[nextIdx];
    if (!nextUrl) return;
    setDisplayBg(nextUrl);
    setArtLoaded(true);
    try {
      await setWallpaperItem("current_wallpaper", nextUrl);
    } catch {}
    if (onSelectBg) onSelectBg(nextUrl);
    if (onSelectBackground) onSelectBackground(nextUrl);
  }, [artIdx, availableArtworks, onSelectBg, onSelectBackground]);

  const openGalleryModal = useCallback(() => {
    if (onOpenAiGallery) {
      onOpenAiGallery();
    } else {
      setGalleryOpen(true);
    }
  }, [onOpenAiGallery]);

  if (loading && !w) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {t("loading_weather", "Loading latest weather forecast...")}
        </p>
      </div>
    );
  }

  if (!w || !w.current) {
    return (
      <div className="p-8 text-center rounded-2xl bg-card border border-border/80 shadow-xs max-w-lg mx-auto space-y-3">
        <span className="text-4xl">🌤️</span>
        <h3 className="text-base font-semibold text-foreground">
          {t("no_weather_title", "No Weather Data Available")}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("no_weather_desc", "Search for a city or use your current location pin above to explore live forecasts.")}
        </p>
      </div>
    );
  }

  // Unit display helpers
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

  // Daily High/Low and Rain Chance
  const todayDaily = w.daily && w.daily.length > 0 ? w.daily[0] : null;
  const highTemp = todayDaily ? Math.round(todayDaily.max) : tempVal;
  const lowTemp = todayDaily ? Math.round(todayDaily.min) : tempVal;
  const rainChanceVal = todayDaily ? Math.round(todayDaily.pop) : Math.round(w.hourly?.[0]?.precipProb ?? 0);

  // Sunrise / Sunset formatting
  let sunriseStr = "--:--";
  let sunsetStr = "--:--";
  if (todayDaily?.sunrise) {
    try {
      const parts = todayDaily.sunrise.split("T")[1];
      sunriseStr = parts ? parts.slice(0, 5) : todayDaily.sunrise;
    } catch {}
  }
  if (todayDaily?.sunset) {
    try {
      const parts = todayDaily.sunset.split("T")[1];
      sunsetStr = parts ? parts.slice(0, 5) : todayDaily.sunset;
    } catch {}
  }

  // Active Alerts combined for the interactive watcher
  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;

  // Air Quality & PM2.5 calculation
  const aqiVal = typeof w.current?.aqi === "number" ? Math.round(w.current.aqi) : undefined;
  const pm25Val = typeof w.current?.pm25 === "number" ? w.current.pm25 : undefined;
  const pm10Val = typeof w.current?.pm10 === "number" ? w.current.pm10 : undefined;
  const aqiCategoryInfo = aqiCategory(aqiVal ?? 0);
  const aqiAdvisoryInfo = getAqiAdvisory(aqiVal, pm25Val, t, lang) || {
    label: aqiCategoryInfo.label,
    advice: t("aqi_normal_advice", "Air quality is suitable for standard activities."),
    color: aqiCategoryInfo.color,
    bg: aqiCategoryInfo.bg,
  };

  // What to Wear Logic (Celsius baseline)
  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const rainExpected = rainChanceVal >= 40 || (w.current.code >= 51 && w.current.code <= 82);
  const isHotSunny = tempC >= 27 && uvNum >= 6;

  const locAccessory = {
    umbrella: t("wear_acc_umbrella", lang === "th" ? "ร่มกันฝน / เสื้อกันฝน" : "Sturdy compact umbrella or raincoat"),
    sunglasses: t("wear_acc_sunglasses", lang === "th" ? "แว่นกันแดด UV400 / ครีมกันแดด" : "UV400 sunglasses & SPF 50 sunscreen"),
    mask: t("wear_acc_mask", lang === "th" ? "หน้ากากอนามัยป้องกันฝุ่น N95" : "N95 particulate respirator mask"),
    windbreaker: t("wear_acc_windbreaker", lang === "th" ? "เสื้อกันลมมีฮู้ด" : "Windproof hooded shell"),
    lightJacket: t("wear_acc_light_jacket", lang === "th" ? "เสื้อคลุมหรือคาร์ดิแกนบาง" : "Light layer / cardigans for evening"),
  };

  const wearRecommendations: Record<WearCategory, { title: string; outfit: string; icon: string }> = {
    business: {
      title: t("wear_cat_business", lang === "th" ? "ชุดทำงาน / สุภาพ" : "Work & Formal"),
      icon: "💼",
      outfit:
        tempC < 10
          ? t("wear_biz_cold", lang === "th" ? "เสื้อโค้ตผ้าวูลสูททางการ เสื้อเชิ้ตแขนยาว กางเกงสแล็ก" : "Tailored wool overcoat or blazer, dress shirt, thermal undershirt, and slacks.")
          : tempC < 22
          ? t("wear_biz_mild", lang === "th" ? "เสื้อเบลเซอร์ทำงาน เสื้อเชิ้ต หรือชุดเดรสสุภาพ" : "Structured blazer or cardigan, breathable dress shirt, and lightweight trousers.")
          : t("wear_biz_warm", lang === "th" ? "เสื้อเชิ้ตผ้าลินิน/คอตตอนโปร่ง กางเกงสแล็กน้ำหนักเบา" : "Crisp lightweight cotton or linen dress shirt, lightweight slacks, and loafers."),
    },
    sports: {
      title: t("wear_cat_sports", lang === "th" ? "ออกกำลังกาย / กีฬา" : "Sports & Outdoor"),
      icon: "🏃",
      outfit:
        tempC < 10
          ? t("wear_sport_cold", lang === "th" ? "ชุดวิ่งแขนยาวแนบเนื้อ เสื้อกั๊กกันลม กางเกงเลกกิ้งขายาว" : "Thermal compression base layer, windproof running jacket, and running tights.")
          : tempC < 22
          ? t("wear_sport_mild", lang === "th" ? "เสื้อวิ่งระบายเหงื่อ กางเกงจ็อกเกอร์ หรือกางเกงขาสั้น" : "Light moisture-wicking tech tee or long sleeve with flexible running shorts.")
          : t("wear_sport_warm", lang === "th" ? "เสื้อกล้ามวิ่งหรือเสื้อยืดแห้งเร็ว กางเกงขาสั้นระบายอากาศ" : "Ultra-breathable singlet or quick-dry tee, running shorts, and anti-blister socks."),
    },
    casual: {
      title: t("wear_cat_casual", lang === "th" ? "ชุดลำลองทั่วไป" : "Daily Casual"),
      icon: "👕",
      outfit:
        tempC < 5
          ? t("wear_cas_freezing", lang === "th" ? "เสื้อแจ็กเก็ตดาวน์หนา เสื้อไหมพรม กางเกงขายาวผ้าหนา" : "Heavy down parka, thermal base layer, insulated trousers, and warm boots.")
          : tempC < 14
          ? t("wear_cas_cold", lang === "th" ? "เสื้อกันหนาว เสื้อฮู้ดดี้ หรือแจ็กเก็ตยีนส์ กางเกงขายาว" : "Warm hoodie or knit sweater paired with a denim jacket and full-length pants.")
          : tempC < 24
          ? t("wear_cas_mild", lang === "th" ? "เสื้อยืดคอตตอน สวมทับด้วยคาร์ดิแกนบาง หรือเสื้อเชิ้ตแขนสั้น" : "Classic cotton t-shirt paired with a light cardigan, overshirt, and chinos.")
          : tempC < 30
          ? t("wear_cas_warm", lang === "th" ? "เสื้อยืดเนื้อโปร่งสบาย กางเกงขาสั้น หรือกางเกงผ้าลินิน" : "Breathable airy cotton t-shirt, casual linen shorts or trousers, and walking sneakers.")
          : t("wear_cas_hot", lang === "th" ? "เสื้อผ้าฝ้ายเบาสบาย สีอ่อน ระบายอากาศได้ดีเยี่ยม" : "Comfortable casual tee or polo, relaxed jeans or breathable shorts, and sun protection."),
    },
  };

  const accessories: string[] = [];
  if (rainExpected) accessories.push(locAccessory.umbrella);
  if (isHotSunny) accessories.push(locAccessory.sunglasses);
  if (aqiVal !== undefined && aqiVal > 100) accessories.push(locAccessory.mask);
  if ((w.current.wind_speed ?? 0) >= 28) accessories.push(locAccessory.windbreaker);
  if (tempC >= 12 && tempC <= 18 && accessories.length < 2) accessories.push(locAccessory.lightJacket);

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full pb-8">
      {/* 1. REAL-TIME SEVERE WEATHER HAZARD WATCHER & NOTIFICATIONS */}
      <WeatherAlertWatcher
        weather={w}
        unit={unit}
        activeAlerts={alertsToDisplay}
      />

      {/* 2. ACTION CONTROLS BAR: NEXT ART -> AI GALLERY -> POSTCARD -> REFRESH -> FAVORITE */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-card border border-border/60 shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={cycleNextArtwork}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/70 hover:bg-muted text-foreground transition cursor-pointer active:scale-95"
            title={t("cycle_art_desc", "Cycle to next watercolor art or saved slot")}
          >
            <span>🎨</span>
            <span>{t("next_artwork", "Next Art")}</span>
          </button>

          <button
            type="button"
            onClick={openGalleryModal}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer active:scale-95 border border-primary/20"
            title={t("ai_gallery_slots", "AI Gallery & Wallpaper Slots")}
          >
            <span>🖼️</span>
            <span>{t("ai_gallery", "AI Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={() => setPostcardOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/70 hover:bg-muted text-foreground transition cursor-pointer active:scale-95"
            title={t("share_weather_postcard", "Create and share watercolor weather postcard")}
          >
            <span>💌</span>
            <span>{t("postcard", "Postcard")}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 text-xs font-medium rounded-xl hover:bg-muted text-foreground transition cursor-pointer active:scale-95 border border-border/40"
            title={t("refresh_forecast", "Refresh forecast")}
          >
            <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
          </button>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-2 text-xs font-medium rounded-xl transition cursor-pointer active:scale-95 border ${
                isFav
                  ? "bg-amber-500/20 text-amber-500 border-amber-500/40"
                  : "hover:bg-muted text-muted-foreground border-border/40"
              }`}
              title={isFav ? t("remove_fav", "Saved in favorites") : t("add_fav", "Add to favorites")}
            >
              <span>{isFav ? "⭐" : "☆"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN WATERCOLOR WEATHER HERO CARD */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md text-white min-h-[310px] sm:min-h-[350px] flex flex-col justify-between p-5 sm:p-6 transition-all bg-card">
        {/* Background Watercolor Art with subtle vignette */}
        {displayBg ? (
          <img
            src={displayBg}
            alt={w.place.name}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none ${
              artLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setArtLoaded(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500" />
        )}

        {/* Ambient Dark Overlay for sharp text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 pointer-events-none" />

        {/* Top Header: Location, Country, and Mascot Companion */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm">📍</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md truncate">
                {w.place.name}
              </h2>
              {w.place.country && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white/95 border border-white/20">
                  {w.place.country}
                </span>
              )}
            </div>

            <p className="text-xs text-white/80 font-medium mt-1 drop-shadow-sm flex items-center gap-2 flex-wrap">
              <span>{currentConditionText}</span>
              <span>•</span>
              <span>
                {t("updated_just_now", "Updated")} {w.fetchedAt ? new Date(w.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : t("recently", "recently")}
              </span>
            </p>
          </div>

          {/* Interactive Weather Mascot Companion */}
          <WeatherMascot weather={w} />
        </div>

        {/* Bottom Hero: Large Temperature, Icon, and High/Low */}
        <div className="relative z-10 pt-6">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-lg text-white">
                {tempVal}
                <span className="text-2xl sm:text-3xl font-light text-white/90">
                  {tempUnitStr}
                </span>
              </span>

              <div className="space-y-0.5 text-xs text-white/90 font-medium drop-shadow-sm border-l border-white/25 pl-3">
                <p>
                  {t("feels_like", "Feels like")}{" "}
                  <span className="font-bold text-white">
                    {feelsLikeVal}{tempUnitStr}
                  </span>
                </p>
                <p>
                  <span className="text-emerald-300 font-bold">↑{highTemp}°</span>{" "}
                  <span className="text-sky-300 font-bold">↓{lowTemp}°</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center shrink-0">
              <WeatherIcon
                code={w.current.code}
                isDay={w.current.is_day ?? 1}
                className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg"
              />
              <span className="text-[11px] font-bold text-white/90 text-center max-w-[110px] truncate mt-0.5 drop-shadow-sm">
                {currentConditionText}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CURRENT WEATHER CONDITIONS & METRICS GRID */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span>📊</span>
            <span>{t("current_conditions", "Current Conditions")}</span>
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {w.place.name}{w.place.country ? `, ${w.place.country}` : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Wind Speed & Direction */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💨 {t("wind", "Wind")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.wind_speed ?? 0)} {speedUnitStr}{" "}
              {windCompass && <span className="text-xs font-normal text-muted-foreground">({windCompass})</span>}
            </span>
          </div>

          {/* Humidity */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💧 {t("humidity", "Humidity")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.humidity ?? 0)}%
            </span>
          </div>

          {/* Air Pressure */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🧭 {t("pressure", "Pressure")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {unit === "imperial" ? ((w.current.pressure ?? 1013) * 0.02953).toFixed(2) : Math.round(w.current.pressure ?? 1013)} {pressureUnitStr}
            </span>
          </div>

          {/* Visibility */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              👁️ {t("visibility", "Visibility")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {typeof w.current.vis === "number" ? Math.round(unit === "imperial" ? w.current.vis * 0.621371 : w.current.vis) : "--"} {visUnitStr}
            </span>
          </div>

          {/* UV Index */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              ☀️ {t("uv_index", "UV Index")}
            </span>
            <span className={`text-sm font-bold mt-1 ${uvInfo.color}`}>
              {uvNum} <span className="text-[11px] font-medium text-muted-foreground">({uvInfo.label})</span>
            </span>
          </div>

          {/* Rain Chance */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌧️ {t("rain_chance", "Rain Chance")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {rainChanceVal}%
            </span>
          </div>

          {/* Sunrise / Sunset */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌅 {t("sun_times", "Sun Times")}
            </span>
            <span className="text-xs font-bold text-foreground mt-1">
              ↑{sunriseStr} ↓{sunsetStr}
            </span>
          </div>
        </div>

        {/* Live Air Quality & PM2.5 Health Impact Banner */}
        {(aqiVal !== undefined || pm25Val !== undefined) && (
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition mt-1.5 ${aqiCategoryInfo.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">🍃</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("air_quality", "Air Quality (AQI)")}
                  </span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${aqiCategoryInfo.color} ${aqiCategoryInfo.bg}`}>
                    {aqiVal !== undefined ? aqiVal : (pm25Val ? Math.round(pm25Val * 3) : "--")} • {aqiAdvisoryInfo.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {aqiAdvisoryInfo.advice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-3">
              {pm25Val !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">PM2.5</span>
                  <span className="font-bold text-foreground">
                    {pm25Val} <span className="text-[10px] font-normal text-muted-foreground">µg/m³</span>
                  </span>
                </div>
              )}
              {pm10Val !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">PM10</span>
                  <span className="font-bold text-foreground">
                    {pm10Val} <span className="text-[10px] font-normal text-muted-foreground">µg/m³</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sun Arc & Moon Phase Astronomy Tracker */}
      <AstronomyTracker weather={w} />

      {/* 5. WHAT TO WEAR TODAY */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">👔</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("what_to_wear", "What to Wear Today")}
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl self-start sm:self-auto">
            {(["casual", "business", "sports"] as WearCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveWearCategory(cat)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  activeWearCategory === cat
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{wearRecommendations[cat].icon}</span>
                <span>{wearRecommendations[cat].title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 flex items-start gap-3">
          <span className="text-2xl shrink-0 mt-0.5">
            {wearRecommendations[activeWearCategory].icon}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-primary block">
              {wearRecommendations[activeWearCategory].title}
            </span>
            <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
              {wearRecommendations[activeWearCategory].outfit}
            </p>
          </div>
        </div>

        {accessories.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
              🎒 {t("recommended_accessories", "Recommended Daily Accessories")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {accessories.map((acc, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium inline-flex items-center gap-1"
                >
                  <span>✨</span>
                  <span>{acc}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Smart Outdoor Activity & Lifestyle Planner */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 6. 24-HOUR HOURLY FORECAST WITH PRINTED CONDITIONS */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🕒</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("hourly_forecast", "24-Hour Forecast")}
          </h3>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {w.hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = formatHourlyTime(h.time);
            const conditionStr = getConditionLabel(h.code, t);
            const hTemp = Math.round(h.temp);

            return (
              <div
                key={`hourly-${idx}`}
                className="flex flex-col items-center justify-between p-2.5 rounded-2xl bg-muted/30 border border-border/40 min-w-[76px] sm:min-w-[82px] text-center shrink-0 snap-start space-y-1.5 transition hover:bg-muted/50"
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
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Live Rain Radar & Precipitation Map */}
      <WeatherRadar weather={w} />

      {/* 7. 7-DAY EXTENDED FORECAST WITH TRANSLATED LABELS */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("seven_day_forecast", "7-Day Forecast")}
          </h3>
        </div>

        <div className="divide-y divide-border/40">
          {w.daily.slice(0, 7).map((d, idx) => {
            const dayLabel = getDailyDayLabel(d.date, idx, t);
            const dailyCondition = getConditionLabel(d.code, t);
            const dMax = Math.round(d.max);
            const dMin = Math.round(d.min);

            return (
              <div
                key={`daily-${idx}`}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="w-16 font-semibold text-foreground">
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
              </div>
            );
          })}
        </div>
      </section>

      {/* Embedded AI Gallery Modal */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          city={w.place.name}
          onSelectBackground={handleSelectBackground}
          onSelectBg={handleSelectBackground}
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
