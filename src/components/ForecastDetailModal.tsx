// src/components/ForecastDetailModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WeatherIcon } from "@/lib/weatherIcons";
import { type Weather, type WeatherUnit, describe } from "@/lib/weather";

export interface HourlyDetailItem {
  time: string;
  temp: number;
  feels?: number;
  code: number;
  pop: number;
  is_day?: number;
  windSpeed?: number;
  windDir?: number;
  humidity?: number;
  uv?: number;
}

export interface DailyDetailItem {
  date: string;
  max: number;
  min: number;
  code: number;
  pop: number;
  sunrise?: string;
  sunset?: string;
  uvMax?: number;
  rainSum?: number;
  windMax?: number;
}

export interface ForecastDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "hourly" | "daily";
  weather?: Weather | null;
  initialIndex?: number;
  selectedIndex?: number;
  onSelectIndex?: (idx: number) => void;
  hourlyList?: HourlyDetailItem[];
  dailyList?: DailyDetailItem[];
  unit: WeatherUnit;
  getConditionLabel?: (code: number) => string;
  getDayLabel?: (dateStr: string, idx: number) => string;
}

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

export const ForecastDetailModal: React.FC<ForecastDetailModalProps> = ({
  isOpen,
  onClose,
  type,
  weather,
  initialIndex,
  selectedIndex,
  onSelectIndex,
  hourlyList: propHourlyList,
  dailyList: propDailyList,
  unit,
  getConditionLabel,
  getDayLabel,
}) => {
  const { t } = useTranslation();

  // Normalize hourly items from either props or weather object
  const resolvedHourlyList = useMemo<HourlyDetailItem[]>(() => {
    if (propHourlyList && propHourlyList.length > 0) return propHourlyList;
    if (weather?.hourly && weather.hourly.length > 0) {
      return weather.hourly.slice(0, 24).map((h) => ({
        time: h.time,
        temp: h.temp,
        feels: h.temp,
        code: h.code,
        pop: h.pop ?? h.precipProb ?? 0,
        is_day: h.is_day ?? 1,
      }));
    }
    return [];
  }, [propHourlyList, weather]);

  // Normalize daily items from either props or weather object
  const resolvedDailyList = useMemo<DailyDetailItem[]>(() => {
    if (propDailyList && propDailyList.length > 0) return propDailyList;
    if (weather?.daily && weather.daily.length > 0) {
      return weather.daily.slice(0, 7).map((d) => ({
        date: d.date,
        max: d.max,
        min: d.min,
        code: d.code,
        pop: d.pop ?? d.precipProbMax ?? 0,
        sunrise: d.sunrise || weather.sun?.sunrise,
        sunset: d.sunset || weather.sun?.sunset,
      }));
    }
    return [];
  }, [propDailyList, weather]);

  const isHourly = type === "hourly";
  const totalItems = isHourly ? resolvedHourlyList.length : resolvedDailyList.length;

  const [internalIndex, setInternalIndex] = useState(
    initialIndex ?? selectedIndex ?? 0
  );

  useEffect(() => {
    const idx = initialIndex ?? selectedIndex ?? 0;
    if (idx >= 0 && idx < totalItems) {
      setInternalIndex(idx);
    } else {
      setInternalIndex(0);
    }
  }, [initialIndex, selectedIndex, totalItems, isOpen]);

  const currentIndex = Math.min(Math.max(0, internalIndex), Math.max(0, totalItems - 1));

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const nextIdx = currentIndex - 1;
      setInternalIndex(nextIdx);
      onSelectIndex?.(nextIdx);
    }
  }, [currentIndex, onSelectIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      const nextIdx = currentIndex + 1;
      setInternalIndex(nextIdx);
      onSelectIndex?.(nextIdx);
    }
  }, [currentIndex, totalItems, onSelectIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || totalItems === 0) return null;

  const tempUnitStr = unit === "imperial" ? "°F" : "°C";

  const hourlyItem = isHourly ? resolvedHourlyList[currentIndex] : null;
  const dailyItem = !isHourly ? resolvedDailyList[currentIndex] : null;

  const currentCode = (isHourly ? hourlyItem?.code : dailyItem?.code) ?? 0;

  // Resolve condition label with multilingual fallback
  let conditionFullText = "";
  if (getConditionLabel) {
    conditionFullText = getConditionLabel(currentCode);
  } else {
    const entry = WMO_KEY_MAP[currentCode];
    if (entry) {
      conditionFullText = t(entry.key, entry.fallback);
    } else {
      conditionFullText = describe(currentCode)?.label || t("fair", "Fair");
    }
  }

  // Format header time/date safely
  let titleTime = "";
  if (isHourly && hourlyItem) {
    if (currentIndex === 0) {
      titleTime = `${t("now", "Now")} (${hourlyItem.time.slice(11, 16) || hourlyItem.time})`;
    } else {
      try {
        const d = new Date(hourlyItem.time);
        if (!isNaN(d.getTime())) {
          titleTime = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        } else {
          titleTime = hourlyItem.time.slice(11, 16) || hourlyItem.time;
        }
      } catch {
        titleTime = hourlyItem.time;
      }
    }
  } else if (!isHourly && dailyItem) {
    if (getDayLabel) {
      titleTime = getDayLabel(dailyItem.date, currentIndex);
    } else {
      if (currentIndex === 0) titleTime = t("today", "Today");
      else if (currentIndex === 1) titleTime = t("tomorrow", "Tomorrow");
      else {
        try {
          const d = new Date(dailyItem.date);
          const day = d.getDay();
          const dayKeys = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"];
          const dayFallbacks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          titleTime = t(dayKeys[day] || "", dayFallbacks[day] || dailyItem.date);
        } catch {
          titleTime = dailyItem.date;
        }
      }
    }
  }

  const cityName = weather?.place?.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[92dvh] flex flex-col rounded-3xl border border-white/20 bg-card text-card-foreground shadow-2xl overflow-hidden p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
              {isHourly
                ? t("hourly_forecast", "Hourly Forecast")
                : t("daily_forecast", "7-Day Extended")}
            </span>
            {cityName && (
              <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                📍 {cityName}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {currentIndex + 1} / {totalItems}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition cursor-pointer"
            aria-label={t("close", "Close")}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain space-y-3.5 pr-0.5 pt-1">
          {/* Time / Day Heading */}
          <div className="text-center pt-1">
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {titleTime}
            </h3>
          </div>

          {/* Icon & Detailed Condition */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 border border-border/50 text-center space-y-2">
            <WeatherIcon
              code={currentCode}
              isDay={isHourly ? (hourlyItem?.is_day ?? 1) : 1}
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md"
            />

            <h4 className="text-base sm:text-lg font-extrabold text-foreground leading-snug px-2">
              {conditionFullText}
            </h4>

            {/* Temperature Highlight */}
            <div className="flex items-baseline gap-2 pt-1">
              {isHourly && hourlyItem && (
                <span className="text-3xl sm:text-4xl font-black text-foreground">
                  {Math.round(hourlyItem.temp)}{tempUnitStr}
                </span>
              )}

              {!isHourly && dailyItem && (
                <div className="flex items-center gap-3 text-2xl sm:text-3xl font-black">
                  <span className="text-foreground">{Math.round(dailyItem.max)}{tempUnitStr}</span>
                  <span className="text-muted-foreground font-normal text-lg">
                    / {Math.round(dailyItem.min)}{tempUnitStr}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Precipitation / Rain Probability */}
            <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">💧 {t("rain_chance", "Rain Chance")}</span>
              <span className="font-extrabold text-blue-500">
                {(isHourly ? hourlyItem?.pop : dailyItem?.pop) ?? 0}%
              </span>
            </div>

            {/* Hourly: Feels Like | Daily: Sunrise */}
            {isHourly && hourlyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌡️ {t("feels_like", "Feels Like")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(hourlyItem.feels ?? hourlyItem.temp)}{tempUnitStr}
                </span>
              </div>
            )}

            {!isHourly && dailyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌅 {t("sun", "Sunrise")}</span>
                <span className="font-bold text-foreground">
                  {dailyItem.sunrise ? dailyItem.sunrise.split("T")[1]?.slice(0, 5) || dailyItem.sunrise : "--:--"}
                </span>
              </div>
            )}

            {/* Daily: Sunset */}
            {!isHourly && dailyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌇 {t("sunset", "Sunset")}</span>
                <span className="font-bold text-foreground">
                  {dailyItem.sunset ? dailyItem.sunset.split("T")[1]?.slice(0, 5) || dailyItem.sunset : "--:--"}
                </span>
              </div>
            )}

            {/* Daily: Daily Range */}
            {!isHourly && dailyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">📊 {t("range", "Range")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(dailyItem.max - dailyItem.min)}° {t("spread", "spread")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Anchored Navigation Arrows */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50 shrink-0">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={handlePrev}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentIndex === 0
                ? "opacity-30 cursor-not-allowed bg-muted/40 text-muted-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            <span>‹</span>
            <span>{t("prev", "Previous")}</span>
          </button>

          <span className="text-[11px] text-muted-foreground font-medium">
            {isHourly ? t("swipe_tip_hours", "Browse hours") : t("swipe_tip_days", "Browse days")}
          </span>

          <button
            type="button"
            disabled={currentIndex >= totalItems - 1}
            onClick={handleNext}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentIndex >= totalItems - 1
                ? "opacity-30 cursor-not-allowed bg-muted/40 text-muted-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            <span>{t("next", "Next")}</span>
            <span>›</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForecastDetailModal;
