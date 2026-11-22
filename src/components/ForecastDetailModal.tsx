// src/components/ForecastDetailModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WeatherIcon } from "@/lib/weatherIcons";
import { type Weather, type WeatherUnit, describe } from "@/lib/weather";

export interface HourlyDetailItem {
  time: string;
  temp: number;
  feels?: number | undefined;
  code: number;
  pop: number;
  is_day?: number | undefined;
  windSpeed?: number | undefined;
  windDir?: number | undefined;
  humidity?: number | undefined;
  uv?: number | undefined;
}

export interface DailyDetailItem {
  date: string;
  max: number;
  min: number;
  code: number;
  pop: number;
  sunrise?: string | undefined;
  sunset?: string | undefined;
  uvMax?: number | undefined;
  rainSum?: number | undefined;
  windMax?: number | undefined;
}

export interface ForecastDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "hourly" | "daily";
  weather?: Weather | null;
  initialIndex?: number;
  selectedIndex?: number;
  onSelectIndex?: (idx: number) => void;
  onTypeChange?: (nextType: "hourly" | "daily") => void;
  hourlyList?: HourlyDetailItem[];
  dailyList?: DailyDetailItem[];
  unit: WeatherUnit;
  getConditionLabel?: (code: number) => string;
  getDayLabel?: (dateStr: string, idx: number) => string;
}

export function ForecastDetailModal({
  isOpen,
  onClose,
  type,
  weather,
  initialIndex = 0,
  selectedIndex,
  onSelectIndex,
  onTypeChange,
  hourlyList: propHourlyList,
  dailyList: propDailyList,
  unit,
  getConditionLabel,
  getDayLabel,
}: ForecastDetailModalProps) {
  const { t } = useTranslation();

  // Internal index state if uncontrolled
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

  const setActiveIndex = useCallback(
    (idx: number) => {
      setInternalIndex(idx);
      onSelectIndex?.(idx);
    },
    [onSelectIndex]
  );

  // Reset index when modal opens
  useEffect(() => {
    if (isOpen) {
      setInternalIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Normalize hourly items
  const resolvedHourlyList = useMemo<HourlyDetailItem[]>(() => {
    if (propHourlyList && propHourlyList.length > 0) return propHourlyList;
    if (weather?.hourly && weather.hourly.length > 0) {
      return weather.hourly.slice(0, 24).map((h) => ({
        time: h.time,
        temp: h.temp,
        code: h.code,
        pop: h.pop ?? h.precipProb ?? 0,
        is_day: h.is_day,
      }));
    }
    return [];
  }, [propHourlyList, weather]);

  // Normalize daily items with exactOptionalPropertyTypes compliance
  const resolvedDailyList = useMemo<DailyDetailItem[]>(() => {
    if (propDailyList && propDailyList.length > 0) return propDailyList;
    if (weather?.daily && weather.daily.length > 0) {
      return weather.daily.slice(0, 7).map((d) => {
        const extra = d as unknown as Partial<DailyDetailItem>;
        const item: DailyDetailItem = {
          date: d.date,
          max: d.max,
          min: d.min,
          code: d.code,
          pop: d.pop ?? d.precipProbMax ?? 0,
          sunrise: d.sunrise,
          sunset: d.sunset,
        };
        if (typeof extra.uvMax === "number") item.uvMax = extra.uvMax;
        if (typeof extra.rainSum === "number") item.rainSum = extra.rainSum;
        if (typeof extra.windMax === "number") item.windMax = extra.windMax;
        return item;
      });
    }
    return [];
  }, [propDailyList, weather]);

  const isHourly = type === "hourly";
  const totalItems = isHourly ? resolvedHourlyList.length : resolvedDailyList.length;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setActiveIndex(Math.max(0, activeIndex - 1));
      } else if (e.key === "ArrowRight") {
        setActiveIndex(Math.min(totalItems - 1, activeIndex + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, totalItems, onClose, setActiveIndex]);

  if (!isOpen || totalItems === 0) return null;

  const currentHourly = isHourly ? resolvedHourlyList[activeIndex] : null;
  const currentDaily = !isHourly ? resolvedDailyList[activeIndex] : null;

  const activeCode = isHourly ? currentHourly?.code ?? 0 : currentDaily?.code ?? 0;
  const conditionText = getConditionLabel ? getConditionLabel(activeCode) : describe(activeCode, t);

  // Time & date formatting
  const titleTime = isHourly
    ? (() => {
        if (!currentHourly) return "";
        try {
          const date = new Date(currentHourly.time);
          return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        } catch {
          return currentHourly.time;
        }
      })()
    : (() => {
        if (!currentDaily) return "";
        if (getDayLabel) return getDayLabel(currentDaily.date, activeIndex);
        try {
          const date = new Date(currentDaily.date + "T12:00:00");
          return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
        } catch {
          return currentDaily.date;
        }
      })();

  const tempUnit = unit === "imperial" ? "°F" : "°C";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl bg-card border border-border/80 p-5 sm:p-6 shadow-2xl text-card-foreground space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Mode Switcher */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {weather?.place?.name ?? t("forecast", "Forecast")}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isHourly ? t("hourly_forecast", "Hourly Breakdown") : t("daily_forecast", "7-Day Outlook")} •{" "}
                {activeIndex + 1} / {totalItems}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onTypeChange && (
              <button
                type="button"
                onClick={() => onTypeChange(isHourly ? "daily" : "hourly")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-muted hover:bg-muted/80 text-foreground transition"
              >
                {isHourly ? t("tab_daily", "7-Day") : t("tab_hourly", "Hourly")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition"
              aria-label={t("close", "Close")}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-primary tracking-wide uppercase">{titleTime}</span>
            <div className="text-3xl sm:text-4xl font-black mt-0.5 tracking-tight">
              {isHourly ? (
                <span>
                  {Math.round(currentHourly?.temp ?? 0)}
                  {tempUnit}
                </span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span>
                    {Math.round(currentDaily?.max ?? 0)}
                    {tempUnit}
                  </span>
                  <span className="text-lg sm:text-xl font-semibold text-muted-foreground">
                    / {Math.round(currentDaily?.min ?? 0)}
                    {tempUnit}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">{conditionText}</p>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <WeatherIcon
              code={activeCode}
              isDay={isHourly ? currentHourly?.is_day : 1}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Rain / POP */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
              💧 {t("rain_chance", "Precipitation")}
            </span>
            <p className="text-sm font-bold text-foreground mt-1">
              {isHourly ? currentHourly?.pop ?? 0 : currentDaily?.pop ?? 0}%
            </p>
          </div>

          {/* Feels Like (Hourly only, when caller provides it) */}
          {isHourly && typeof currentHourly?.feels === "number" && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                🌡 {t("feels_like", "Feels Like")}
              </span>
              <p className="text-sm font-bold text-foreground mt-1">
                {Math.round(currentHourly.feels)}
                {tempUnit}
              </p>
            </div>
          )}

          {/* Sunrise / Sunset (Daily only) */}
          {!isHourly && (
            <>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                  🌅 {t("sunrise", "Sunrise")}
                </span>
                <p className="text-sm font-bold text-foreground mt-1">{currentDaily?.sunrise || "--:--"}</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                  🌇 {t("sunset", "Sunset")}
                </span>
                <p className="text-sm font-bold text-foreground mt-1">{currentDaily?.sunset || "--:--"}</p>
              </div>
            </>
          )}

          {/* Humidity if present */}
          {isHourly && typeof currentHourly?.humidity === "number" && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                💦 {t("humidity", "Humidity")}
              </span>
              <p className="text-sm font-bold text-foreground mt-1">{currentHourly.humidity}%</p>
            </div>
          )}

          {/* Wind if present */}
          {isHourly && typeof currentHourly?.windSpeed === "number" && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                💨 {t("wind", "Wind")}
              </span>
              <p className="text-sm font-bold text-foreground mt-1">
                {Math.round(currentHourly.windSpeed)} {unit === "imperial" ? "mph" : "km/h"}
              </p>
            </div>
          )}
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          <button
            type="button"
            disabled={activeIndex <= 0}
            onClick={() => setActiveIndex(activeIndex - 1)}
            className="flex-1 py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition cursor-pointer"
          >
            ← {t("prev", "Previous")}
          </button>

          <span className="text-xs text-muted-foreground font-mono">
            {activeIndex + 1} / {totalItems}
          </span>

          <button
            type="button"
            disabled={activeIndex >= totalItems - 1}
            onClick={() => setActiveIndex(activeIndex + 1)}
            className="flex-1 py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition cursor-pointer"
          >
            {t("next", "Next")} →
          </button>
        </div>
      </div>
    </div>
  );
}
