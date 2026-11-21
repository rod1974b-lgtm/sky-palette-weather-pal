// src/components/ForecastDetailModal.tsx
// FIXED — v2
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// BUG 1 — Condition was ALWAYS English. The modal used its own WMO_KEY_MAP with keys
//   like "wmo_0", "wmo_1", "wmo_61". Those keys DO NOT EXIST in any locale file —
//   not in the 256-key main files, not in any i18nExtra Part 1-4. Checked all 14
//   languages: 0 occurrences. So t("wmo_0", "Clear sky") always fell back to the
//   English fallback, in Thai, Japanese, German, everywhere. WeatherView does it
//   right: it uses cond_* keys (cond_clear, cond_rain, ...) which ARE translated.
//   FIX: Deleted WMO_KEY_MAP. Now uses describe(code, t) from @/lib/weather, which
//   uses the same cond_* keys as WeatherView. Same words, all 14 languages.
// BUG 2 — WMO_KEY_MAP was missing 5 codes: 56, 57 (freezing drizzle), 66, 67
//   (freezing rain), 77 (snow grains). Those 5 fell through to describe() WITHOUT
//   t, so they were also English-only. FIX: Gone with BUG 1 — describe(code, t)
//   handles all of them via cond_freezing_drizzle / cond_freezing_rain / cond_snow.
// BUG 3 — "Feels Like" was FAKED. Normalization did feels: h.temp. weather.ts
//   hourly has NO feels field — it only fetches temperature_2m, weather_code,
//   precipitation_probability, is_day. So the modal showed temp as "Feels Like",
//   e.g. 32°C feels like 32°C, even when real feels was 36°C. That is wrong.
//   FIX: Normalization no longer sets feels. UI only shows the Feels row when
//   the caller actually provides feels (propHourlyList). If weather.ts later adds
//   apparent_temperature to hourly, pass it through — do NOT set feels = temp.
// BUG 4 — Sunrise/sunset copied today's sun to ALL 7 days. Normalization did
//   sunrise: d.sunrise || weather.sun?.sunrise. weather.ts daily DOES have per-day
//   sunrise/sunset from the API. If one day was missing, it showed TODAY's sunrise
//   for Saturday. FIX: Use only d.sunrise / d.sunset per day. If missing, show
//   "--:--", never today's sun for another day.
// BUG 5 — Sunrise label used the WRONG key: t("sun", "Sunrise"). "sun" does not
//   exist in any locale, so it always showed English "Sunrise". FIX: t("sunrise",
//   "Sunrise") — sunrise IS in the main files, translated in all 14 languages.
// BUG 6 — Day name could be off by one in the Americas. new Date("2026-11-21")
//   is UTC midnight. getDay() in US timezones returns the PREVIOUS day. FIX:
//   Parse as new Date(date + "T12:00:00") — noon, so no timezone shift.
// BUG 7 — Background page still scrolled behind the modal. FIX: Lock body scroll
//   while open, restore on close (same pattern as other modals).
// IMPROVEMENT — Wind / humidity / UV were dropped and never shown. HourlyDetailItem
//   and DailyDetailItem already had windSpeed, windDir, humidity, uv, windMax,
//   rainSum, uvMax, but normalization dropped them and the grid never showed them.
//   FIX: Normalization now preserves them when the caller provides them, and the
//   grid shows them ONLY when they exist — no fake zeros, no invented data.
// KEPT AS-IS: Props, hourly/daily list shapes, prev/next + keyboard nav, title
//   time formatting, city + counter header, 2-column metrics grid, all other
//   locale keys (rain_chance, swipe_tip_*, prev, next, range, spread, tomorrow,
//   day_sun, fair — those DO exist in extras Part 3/4, so they keep working).
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
  onTypeChange?: (nextType: "hourly" | "daily") => void;
  hourlyList?: HourlyDetailItem[];
  dailyList?: DailyDetailItem[];
  unit: WeatherUnit;
  getConditionLabel?: (code: number) => string;
  getDayLabel?: (dateStr: string, idx: number) => string;
}

// FIXED BUG 6: Parse a YYYY-MM-DD date at noon, not UTC midnight, so getDay()
// does not shift to the previous day in the Americas.
function dayOfWeekForDate(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay();
}

// Format "2026-11-21T06:00:00" or "06:00" -> "06:00". Returns "--:--" if missing.
function formatSunTime(value: string | undefined): string {
  if (!value) return "--:--";
  const afterT = value.includes("T") ? value.split("T")[1] : value;
  if (!afterT) return value;
  return afterT.slice(0, 5) || value;
}

// Format hourly time "2026-11-21T14:00" -> "14:00". Falls back to the raw string.
function formatHourLabel(time: string): string {
  if (!time) return time;
  const sliced = time.slice(11, 16);
  if (sliced) return sliced;
  return time;
}

export const ForecastDetailModal: React.FC<ForecastDetailModalProps> = ({
  isOpen,
  onClose,
  type,
  weather,
  initialIndex,
  selectedIndex,
  onSelectIndex,
  onTypeChange,
  hourlyList: propHourlyList,
  dailyList: propDailyList,
  unit,
  getConditionLabel,
  getDayLabel,
}) => {
  const { t } = useTranslation();

  // Normalize hourly items from either props or weather object
  // FIXED BUG 3: Do NOT set feels = temp. weather.ts hourly has no feels field.
  // If the caller provides feels (propHourlyList), it is kept. Otherwise feels
  // stays undefined and the Feels row is hidden — never faked.
  // FIXED IMPROVEMENT: Preserve wind/humidity/uv when the caller provides them
  // (propHourlyList). weather.ts hourly does not provide them yet, so from
  // weather.hourly they stay undefined and their rows stay hidden.
  const resolvedHourlyList = useMemo<HourlyDetailItem[]>(() => {
    if (propHourlyList && propHourlyList.length > 0) return propHourlyList;
    if (weather?.hourly && weather.hourly.length > 0) {
      return weather.hourly.slice(0, 24).map((h) => {
        const extra = h as unknown as Partial<HourlyDetailItem>;
        const item: HourlyDetailItem = {
          time: h.time,
          temp: h.temp,
          code: h.code,
          pop: h.pop ?? h.precipProb ?? 0,
          is_day: h.is_day ?? 1,
        };
        // Only copy feels/wind/humidity/uv if the source actually has them.
        // Never set feels = temp, never set 0 as a fake value.
        if (typeof extra.feels === "number") item.feels = extra.feels;
        if (typeof extra.windSpeed === "number") item.windSpeed = extra.windSpeed;
        if (typeof extra.windDir === "number") item.windDir = extra.windDir;
        if (typeof extra.humidity === "number") item.humidity = extra.humidity;
        if (typeof extra.uv === "number") item.uv = extra.uv;
        return item;
      });
    }
    return [];
  }, [propHourlyList, weather]);

  // Normalize daily items from either props or weather object
  // FIXED BUG 4: Do NOT fall back to weather.sun?.sunrise/sunset. That is TODAY's
  // sun. Each day uses only its own d.sunrise / d.sunset. If missing, UI shows "--:--".
  // FIXED IMPROVEMENT: Preserve uvMax / rainSum / windMax when the caller provides
  // them (propDailyList or future weather.ts daily). Otherwise they stay undefined
  // and their rows stay hidden.
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

  const [internalIndex, setInternalIndex] = useState(
    initialIndex ?? selectedIndex ?? 0
  );

  // FIXED - Weather did not change when tapping a different hour/day:
  // The modal kept its own internalIndex and only synced on initialIndex.
  // When you opened a different hour/day, React reused the same modal
  // instance and internalIndex stayed on the old hour. Now it also resets
  // when type changes, and the parent forces a fresh modal with key= (see WeatherView).
  useEffect(() => {
    const idx = initialIndex ?? selectedIndex ?? 0;
    if (idx >= 0 && idx < totalItems) {
      setInternalIndex(idx);
    } else {
      setInternalIndex(0);
    }
  }, [initialIndex, selectedIndex, totalItems, isOpen, type]);

  // FIXED BUG 7: Lock background scroll while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

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
  const windUnitStr = unit === "imperial" ? "mph" : "km/h";
  const precipUnitStr = unit === "imperial" ? "in" : "mm";

  const hourlyItem = isHourly ? resolvedHourlyList[currentIndex] : null;
  const dailyItem = !isHourly ? resolvedDailyList[currentIndex] : null;

  const currentCode = (isHourly ? hourlyItem?.code : dailyItem?.code) ?? 0;

  // FIXED BUG 1 + BUG 2: Use describe(code, t) — same cond_* keys as WeatherView,
  // translated in all 14 languages. Do NOT use the old wmo_* keys (they do not exist).
  // If the parent passes getConditionLabel, it still wins (for custom labels).
  let conditionFullText = "";
  if (getConditionLabel) {
    conditionFullText = getConditionLabel(currentCode);
  } else {
    conditionFullText = describe(currentCode, (key: string, fallback: string) => t(key, fallback)).label;
  }

  // Format header time/date safely
  let titleTime = "";
  if (isHourly && hourlyItem) {
    if (currentIndex === 0) {
      titleTime = `${t("now", "Now")} (${formatHourLabel(hourlyItem.time)})`;
    } else {
      try {
        const d = new Date(hourlyItem.time);
        if (!isNaN(d.getTime())) {
          titleTime = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        } else {
          titleTime = formatHourLabel(hourlyItem.time);
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
          // FIXED BUG 6: Noon parse, not UTC midnight.
          const day = dayOfWeekForDate(dailyItem.date);
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

        {/* FIXED - Hourly / Daily switch inside the modal. Before, you had to
            close the modal to switch from Hourly to 7-Day. Now tap here. */}
        {onTypeChange && (
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 shrink-0 mt-3">
            {(["hourly", "daily"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  if (tab !== type) {
                    onTypeChange(tab);
                  }
                }}
                aria-pressed={type === tab}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  type === tab ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "hourly" ? t("hourly_forecast", "Hourly") : t("daily_forecast", "7-Day")}
              </button>
            ))}
          </div>
        )}

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

            {/* Hourly: Feels Like — ONLY when the caller actually provides feels.
                FIXED BUG 3: Never show temp as "Feels Like". */}
            {isHourly && hourlyItem && typeof hourlyItem.feels === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌡 {t("feels_like", "Feels Like")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(hourlyItem.feels)}{tempUnitStr}
                </span>
              </div>
            )}

            {/* Hourly: Wind — ONLY when provided. */}
            {isHourly && hourlyItem && typeof hourlyItem.windSpeed === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">💨 {t("wind", "Wind")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(hourlyItem.windSpeed)} {windUnitStr}
                </span>
              </div>
            )}

            {/* Hourly: Humidity — ONLY when provided. */}
            {isHourly && hourlyItem && typeof hourlyItem.humidity === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">💦 {t("humidity", "Humidity")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(hourlyItem.humidity)}%
                </span>
              </div>
            )}

            {/* Hourly: UV — ONLY when provided. */}
            {isHourly && hourlyItem && typeof hourlyItem.uv === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">☀️ {t("uv", "UV Index")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(hourlyItem.uv)}
                </span>
              </div>
            )}

            {/* Daily: Sunrise — FIXED BUG 5: key is "sunrise", not "sun". */}
            {!isHourly && dailyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌅 {t("sunrise", "Sunrise")}</span>
                <span className="font-bold text-foreground">
                  {formatSunTime(dailyItem.sunrise)}
                </span>
              </div>
            )}

            {/* Daily: Sunset */}
            {!isHourly && dailyItem && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌇 {t("sunset", "Sunset")}</span>
                <span className="font-bold text-foreground">
                  {formatSunTime(dailyItem.sunset)}
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

            {/* Daily: Wind Max — ONLY when provided. */}
            {!isHourly && dailyItem && typeof dailyItem.windMax === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">💨 {t("wind", "Wind")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(dailyItem.windMax)} {windUnitStr}
                </span>
              </div>
            )}

            {/* Daily: UV Max — ONLY when provided. */}
            {!isHourly && dailyItem && typeof dailyItem.uvMax === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">☀️ {t("uv", "UV Index")}</span>
                <span className="font-bold text-foreground">
                  {Math.round(dailyItem.uvMax)}
                </span>
              </div>
            )}

            {/* Daily: Precipitation total — ONLY when provided. */}
            {!isHourly && dailyItem && typeof dailyItem.rainSum === "number" && (
              <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">🌧 {t("precipitation", "Precipitation")}</span>
                <span className="font-bold text-foreground">
                  {dailyItem.rainSum} {precipUnitStr}
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
