// src/components/AstronomyTracker.tsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Weather } from "@/lib/weather";
import {
  getMoonPhaseInfo,
  getSunArcInfo,
  getAstronomyTexts,
} from "@/lib/astronomy";

export interface AstronomyTrackerProps {
  weather?: Weather | null;
  onOpenGuide?: () => void;
}

export const AstronomyTracker: React.FC<AstronomyTrackerProps> = ({ weather, onOpenGuide }) => {
  const { i18n, t } = useTranslation();
  const lang = i18n.language || "en";
  const texts = useMemo(() => getAstronomyTexts(lang), [lang]);

  // Extract solar endpoints from weather
  const todayDaily = weather?.daily?.[0];
  const sunriseRaw = todayDaily?.sunrise || weather?.sun?.sunrise;
  const sunsetRaw = todayDaily?.sunset || weather?.sun?.sunset;
  const localTimeIso = weather?.hourly?.[0]?.time;
  const isDayFlag = weather?.current?.is_day;

  const sunInfo = useMemo(() => {
    return getSunArcInfo(sunriseRaw, sunsetRaw, localTimeIso, isDayFlag);
  }, [sunriseRaw, sunsetRaw, localTimeIso, isDayFlag]);

  const moonInfo = useMemo(() => {
    return getMoonPhaseInfo(new Date());
  }, []);

  // Compute curved SVG coordinates along a parabolic daylight arc
  // ViewBox: 0 0 320 130
  // Arc start: (30, 105), apex: (160, 25), end: (290, 105)
  const arcProgress = sunInfo.sunProgressPercent / 100;
  // Quadratic Bézier: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
  const p0 = { x: 30, y: 105 };
  const p1 = { x: 160, y: 18 };
  const p2 = { x: 290, y: 105 };

  const tVal = Math.max(0, Math.min(1, arcProgress));
  const sunX = Math.round((1 - tVal) * (1 - tVal) * p0.x + 2 * (1 - tVal) * tVal * p1.x + tVal * tVal * p2.x);
  const sunY = Math.round((1 - tVal) * (1 - tVal) * p0.y + 2 * (1 - tVal) * tVal * p1.y + tVal * tVal * p2.y);

  const phaseName = texts.phases[moonInfo.key] || moonInfo.key;

  return (
    <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {texts.celestial_tracker}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Live lighting badge */}
          {sunInfo.currentLightState === "golden_hour" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 animate-pulse">
              🌅 {texts.golden_hour} • {texts.active_now}
            </span>
          )}
          {sunInfo.currentLightState === "blue_hour" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 animate-pulse">
              🌌 {texts.blue_hour} • {texts.active_now}
            </span>
          )}
          {sunInfo.currentLightState === "daylight" && (
            <span className="text-[11px] font-semibold text-muted-foreground hidden sm:flex items-center gap-1">
              ☀️ {texts.daylight} ({sunInfo.daylightDurationStr})
            </span>
          )}
          {sunInfo.currentLightState === "night" && (
            <span className="text-[11px] font-semibold text-muted-foreground hidden sm:flex items-center gap-1">
              🌙 {texts.time_to_sunrise}: {sunInfo.timeUntilSunriseStr}
            </span>
          )}

          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[11px] font-bold text-primary hover:underline transition cursor-pointer"
            >
              📖 {t("trajectory_guide", "Trajectory Guide ↗")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Solar Parabolic Arc Card */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              ☀️ {texts.solar_path}
            </span>
            <span className="text-[11px]">
              {sunInfo.isDay
                ? `${texts.daylight_remaining}: ${sunInfo.daylightRemainingStr || "-"}`
                : `${texts.time_to_sunrise}: ${sunInfo.timeUntilSunriseStr || "-"}`}
            </span>
          </div>

          {/* SVG Daylight Arc */}
          <div className="relative w-full h-32 flex items-center justify-center my-1 select-none">
            <svg
              viewBox="0 0 320 130"
              className="w-full h-full overflow-visible"
              aria-label="Solar parabolic trajectory path"
            >
              <defs>
                <linearGradient id="solarArcGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#eab308" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.4" />
                </linearGradient>
                <radialGradient id="sunGlowGrad">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Baseline ground horizon */}
              <line
                x1="20"
                y1="105"
                x2="300"
                y2="105"
                stroke="currentColor"
                strokeDasharray="3 3"
                opacity="0.25"
              />

              {/* Parabolic Guide Path */}
              <path
                d="M 30,105 Q 160,18 290,105"
                fill="none"
                stroke="url(#solarArcGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Real-time Sun Position Marker */}
              {sunInfo.isDay && (
                <g transform={`translate(${sunX}, ${sunY})`}>
                  <circle r="14" fill="url(#sunGlowGrad)" className="animate-pulse" />
                  <circle r="6.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                </g>
              )}

              {/* Sunrise / Sunset Labels on Curve endpoints */}
              <text
                x="30"
                y="122"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="currentColor"
                opacity="0.8"
              >
                ↑{sunInfo.sunriseStr}
              </text>
              <text
                x="290"
                y="122"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="currentColor"
                opacity="0.8"
              >
                ↓{sunInfo.sunsetStr}
              </text>
            </svg>
          </div>

          {/* Golden & Blue Hour Micro-Badges */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/40 text-[11px]">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                📸 {texts.golden_hour}
              </span>
              <span className="font-bold text-foreground">
                {sunInfo.eveningGoldenHour.start}
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="font-semibold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                🌌 {texts.blue_hour}
              </span>
              <span className="font-bold text-foreground">
                {sunInfo.eveningBlueHour.start}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Moon Phase Card */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              🌙 {texts.lunar_phase}
            </span>
            <span className="font-semibold text-amber-400">
              {moonInfo.illumination}% {texts.illuminated}
            </span>
          </div>

          {/* Large Lunar Phase Graphic & Title */}
          <div className="flex items-center gap-4 py-2">
            <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-inner flex items-center justify-center text-4xl select-none shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-amber-200/10 to-transparent pointer-events-none" />
              <span>{moonInfo.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-extrabold text-foreground tracking-tight truncate">
                {phaseName}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {texts.moon_age}: <strong className="text-foreground">{moonInfo.ageDays}d</strong> / 29.5d
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {texts.next_full_moon}:{" "}
                <strong className="text-foreground">
                  {texts.in_days.replace("{{days}}", String(moonInfo.daysToFullMoon))}
                </strong>
              </div>
            </div>
          </div>

          {/* Magic Hours Schedule footer */}
          <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              ✨ {texts.magic_hours}
            </span>
            <span className="font-medium text-foreground">
              {texts.morning} {sunInfo.morningGoldenHour.start} • {texts.evening} {sunInfo.eveningGoldenHour.start}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AstronomyTracker;
