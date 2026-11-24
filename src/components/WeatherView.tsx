// src/components/WeatherView.tsx
// Full Weather View component with exact aspect-16/9 sm:aspect-21/9 hero card and dual save buttons

import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type Weather,
  type WeatherUnit,
  describe,
  uvCategory,
  aqiCategory,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";
import { saveWallpaperToDownloads, isIOS } from "@/lib/saveWallpaper";
import { OutdoorActivityPlanner } from "@/components/OutdoorActivityPlanner";
import { WeatherRadar } from "@/components/WeatherRadar";
import { AstronomyTracker } from "@/components/AstronomyTracker";
import { WeatherPostcardModal } from "@/components/WeatherPostcardModal";
import { WeatherGuideModal, type GuideTopic } from "@/components/WeatherGuideModal";
import { ForecastDetailModal } from "@/components/ForecastDetailModal";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  tag: string;
  tagKey?: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "alert";
  isMock?: boolean;
}

export interface WeatherViewProps {
  weather: Weather;
  unit: WeatherUnit;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string | undefined;
  onSelectBackground?: (url: string) => void | Promise<void>;
  onSelectBg?: (url: string) => void | Promise<void>;
  onOpenAiGallery?: () => void;
  onOpenPostcard?: () => void;
}

function getConditionLabel(code: number, t: (k: string, fallback: string) => string): string {
  const res = describe(code, t);
  return typeof res === "string" ? res : res.label;
}

export function WeatherView({
  weather: w,
  unit,
  onRefresh,
  isRefreshing = false,
  isFavorite = false,
  onToggleFavorite,
  activeAlerts = [],
  customBgUrl,
  onSelectBackground,
  onSelectBg,
  onOpenAiGallery,
  onOpenPostcard,
}: WeatherViewProps) {
  const { t, i18n } = useTranslation();

  const [aiGalleryOpen, setAiGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("units");

  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);

  const [localCustomBg, setLocalCustomBg] = useState<string | null>(null);

  const [isDownloadingHero, setIsDownloadingHero] = useState(false);
  const [isSharingHero, setIsSharingHero] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cityKey = w.place?.name
        ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}`
        : null;
      const storedForCity = cityKey ? localStorage.getItem(cityKey) : null;
      const storedHero = localStorage.getItem("weather:custom-hero-art");
      const storedCurrent = localStorage.getItem("weather:custom-bg:current");
      setLocalCustomBg(storedForCity || storedHero || storedCurrent || null);
    } catch {
      setLocalCustomBg(null);
    }
  }, [w.place?.name]);

  const displayBg = useMemo(() => {
    return customBgUrl || localCustomBg || null;
  }, [customBgUrl, localCustomBg]);

  const handleOpenAiGallery = () => {
    if (onOpenAiGallery) onOpenAiGallery();
    else setAiGalleryOpen(true);
  };

  const handleOpenPostcard = () => {
    if (onOpenPostcard) onOpenPostcard();
    else setPostcardOpen(true);
  };

  const handleApplyArt = (url: string) => {
    setLocalCustomBg(url);
    if (onSelectBackground) onSelectBackground(url);
    else if (onSelectBg) onSelectBg(url);
  };

  const showSaveToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 5000);
  };

  const handleDownloadHero = async () => {
    if (!displayBg || isDownloadingHero) return;
    setIsDownloadingHero(true);
    try {
      const result = await saveWallpaperToDownloads(
        displayBg,
        `weather-pal-${w.place.name || "wallpaper"}`,
        { mode: "download" }
      );
      showSaveToast(result.message);
    } catch {
      showSaveToast("Could not save. Long-press the image to Save Image.");
    } finally {
      setTimeout(() => {
        setIsDownloadingHero(false);
      }, 1200);
    }
  };

  const handleShareHero = async () => {
    if (!displayBg || isSharingHero) return;
    setIsSharingHero(true);
    try {
      const result = await saveWallpaperToDownloads(
        displayBg,
        `weather-pal-${w.place.name || "wallpaper"}`,
        { mode: "share" }
      );
      showSaveToast(result.message);
    } catch {
      showSaveToast("Could not save. Long-press the image to Save Image.");
    } finally {
      setTimeout(() => {
        setIsSharingHero(false);
      }, 1200);
    }
  };

  const openGuide = (topic: GuideTopic) => {
    setGuideTopic(topic);
    setGuideOpen(true);
  };

  const tempUnit = unit === "imperial" ? "°F" : "°C";
  const speedUnit = unit === "imperial" ? "mph" : "km/h";

  const conditionDesc = useMemo(
    () => describe(w.current.weather_code, t),
    [w.current.weather_code, t]
  );
  const conditionLabel =
    typeof conditionDesc === "string" ? conditionDesc : conditionDesc.label;

  const uvCat = useMemo(() => uvCategory(w.current.uv, t), [w.current.uv, t]);
  const aqiCat = useMemo(
    () => (w.current.aqi !== undefined ? aqiCategory(w.current.aqi, t) : null),
    [w.current.aqi, t]
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* 1. SEVERE WEATHER WATCHER */}
      {activeAlerts && activeAlerts.length > 0 && (
        <section aria-label="Active Weather Alerts" className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 sm:p-4 rounded-2xl border flex items-start gap-3 shadow-xs ${
                alert.severity === "alert"
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
                  : alert.severity === "warning"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300"
              }`}
            >
              <span className="text-xl shrink-0">
                {alert.severity === "alert" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/60">
                    {alert.tagKey ? t(alert.tagKey, alert.tag) : alert.tag}
                  </span>
                  <h3 className="font-bold text-sm truncate">{alert.title}</h3>
                </div>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 2. HERO CONTROLS TOOLBAR */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAiGallery}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold border border-border/70 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <span>🎨</span>
            <span>{t("art_gallery", "Art Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPostcard}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold border border-border/70 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <span>💌</span>
            <span>{t("postcard", "Postcard")}</span>
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold border border-border/70 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title={t("refresh", "Refresh")}
          >
            <span className={isRefreshing ? "animate-spin inline-block" : ""}>🔄</span>
            <span className="hidden sm:inline">{t("refresh", "Refresh")}</span>
          </button>
        )}
      </div>

      {/* 3. HERO WALLPAPER CARD */}
      <section className="relative w-full aspect-16/9 sm:aspect-21/9 rounded-3xl overflow-hidden border border-border/60 shadow-md bg-muted select-none">
        {displayBg ? (
          <img
            src={displayBg}
            alt={w.place.name}
            className="w-full h-full object-cover object-center transition-all duration-700 ease-out"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-400 via-indigo-500 to-purple-600" />
        )}
      </section>

      {/* DUAL BUTTONS: Direct Download + Share / Save to Gallery */}
      {displayBg && (
        <div className="flex justify-end items-center gap-2 px-1 -mt-2">
          {/* Button 1: Save directly to Downloads folder */}
          <button
            type="button"
            onClick={handleDownloadHero}
            disabled={isDownloadingHero}
            className={`px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold border border-border/70 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isDownloadingHero ? "opacity-75 cursor-wait" : ""
            }`}
            title="Download directly to your device"
          >
            <span>{isDownloadingHero ? "⏳" : "💾"}</span>
            <span>
              {isDownloadingHero
                ? t("toast_downloading", "Downloading...")
                : t("btn_save_to_downloads", "Save to Downloads")}
            </span>
          </button>

          {/* Button 2: Save to Photo Gallery / Open Share Sheet */}
          <button
            type="button"
            onClick={handleShareHero}
            disabled={isSharingHero}
            className={`px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold border border-border/70 shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              isSharingHero ? "opacity-75 cursor-wait" : ""
            }`}
            title="Open phone share / save to photo gallery"
          >
            <span>{isSharingHero ? "⏳" : "📤"}</span>
            <span>
              {isSharingHero
                ? t("toast_downloading", "Opening...")
                : t("btn_save_to_gallery", "Save to Gallery")}
            </span>
          </button>
        </div>
      )}

      {/* Save result toast below dual buttons */}
      {displayBg && saveToast && (
        <div className="mx-1 -mt-1 bg-card border border-border/70 text-card-foreground text-xs font-medium px-3 py-2.5 rounded-xl shadow-sm text-center">
          {saveToast}
        </div>
      )}
      {displayBg && !saveToast && (
        <p className="mx-1 -mt-2 text-[11px] text-muted-foreground text-right">
          {isIOS()
            ? "iPhone: Save opens Share sheet, then Save Image or Save to Files."
            : "Android / Desktop: Saves to Downloads. If a new tab opens, long-press to Download image."}
        </p>
      )}

      {/* 4. CURRENT WEATHER CONDITIONS & METRICS */}
      <section className="p-4 sm:p-6 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex flex-wrap items-center gap-2">
              <span className="truncate">{getLocalizedCity(w.place.name, i18n.language)}</span>
              {w.place.country && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold shrink-0">
                  {getLocalizedCountry(w.place.country, i18n.language)}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold capitalize text-muted-foreground">
                {conditionLabel}
              </span>
              <button
                type="button"
                onClick={() => openGuide("icons")}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                ℹ️
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WeatherIcon
              code={w.current.weather_code}
              isDay={w.current.is_day}
              className="w-14 h-14 shrink-0 drop-shadow-sm"
            />
            <div className="text-right">
              <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                {Math.round(w.current.temperature)}
                <span className="text-xl sm:text-2xl font-bold ml-0.5">{tempUnit}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                {t("feels_like", "Feels like")} {Math.round(w.current.apparent_temperature)}
                {tempUnit}
              </div>
            </div>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/50">
          <div
            onClick={() => openGuide("units")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{t("humidity", "Humidity")}</span>
              <span>💧</span>
            </div>
            <div className="text-lg font-bold mt-0.5">{w.current.relative_humidity}%</div>
          </div>

          <div
            onClick={() => openGuide("units")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{t("wind", "Wind")}</span>
              <span>💨</span>
            </div>
            <div className="text-lg font-bold mt-0.5">
              {Math.round(w.current.wind_speed)} {speedUnit}
            </div>
          </div>

          <div
            onClick={() => openGuide("uv")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{t("uv_index", "UV Index")}</span>
              <span>☀️</span>
            </div>
            <div className="text-lg font-bold mt-0.5">
              {Math.round(w.current.uv)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({typeof uvCat === "string" ? uvCat : uvCat?.label})
              </span>
            </div>
          </div>

          <div
            onClick={() => openGuide("aqi")}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 transition cursor-pointer"
          >
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{t("aqi", "AQI")}</span>
              <span>🍃</span>
            </div>
            <div className="text-lg font-bold mt-0.5">
              {w.current.aqi !== undefined ? Math.round(w.current.aqi) : "N/A"}{" "}
              {aqiCat && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({typeof aqiCat === "string" ? aqiCat : aqiCat?.label})
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOURLY FORECAST TICKER */}
      {w.hourly && w.hourly.length > 0 && (
        <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>⏱️</span>
              <span>{t("hourly_forecast", "Hourly Forecast")}</span>
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {t("next_24_hours", "Next 24 Hours")}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {w.hourly.slice(0, 24).map((hour, idx) => {
              const hourLabel = new Date(hour.time).toLocaleTimeString(i18n.language, {
                hour: "numeric",
                hour12: true,
              });
              return (
                <button
                  type="button"
                  key={hour.time}
                  onClick={() => {
                    setForecastModalType("hourly");
                    setForecastModalIndex(idx);
                    setForecastModalOpen(true);
                  }}
                  className="flex-shrink-0 flex flex-col items-center justify-between p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/70 border border-border/40 transition active:scale-95 cursor-pointer min-w-[70px] text-center"
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{hourLabel}</span>
                  <WeatherIcon
                    code={hour.weather_code}
                    isDay={hour.is_day}
                    className="w-8 h-8 my-1.5 drop-shadow-xs"
                  />
                  <span className="text-sm font-bold">
                    {Math.round(hour.temperature)}°
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. 7-DAY FORECAST */}
      {w.daily && w.daily.length > 0 && (
        <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
            <span>📅</span>
            <span>{t("7_day_forecast", "7-Day Forecast")}</span>
          </h3>

          <div className="space-y-1.5">
            {w.daily.map((day, idx) => {
              const dateObj = new Date(day.date + "T00:00:00");
              const dayName =
                idx === 0
                  ? t("today", "Today")
                  : dateObj.toLocaleDateString(i18n.language, { weekday: "short" });
              const dateStr = dateObj.toLocaleDateString(i18n.language, {
                month: "numeric",
                day: "numeric",
              });
              const dayCondition = getConditionLabel(day.weather_code, t);

              return (
                <button
                  type="button"
                  key={day.date}
                  onClick={() => {
                    setForecastModalType("daily");
                    setForecastModalIndex(idx);
                    setForecastModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-border/40 transition active:scale-[0.99] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <WeatherIcon
                      code={day.weather_code}
                      isDay={true}
                      className="w-7 h-7 shrink-0 drop-shadow-xs"
                    />
                    <div>
                      <div className="text-sm font-bold leading-none">{dayName}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</div>
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground truncate hidden sm:block max-w-[160px]">
                    {dayCondition}
                  </span>

                  <div className="flex items-center gap-3 text-right">
                    <span className="text-sm font-bold">
                      {Math.round(day.temperature_max)}°
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground min-w-[28px]">
                      {Math.round(day.temperature_min)}°
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} />

      {/* 8. WEATHER RADAR */}
      <WeatherRadar
        lat={w.place.lat}
        lon={w.place.lon}
        cityName={w.place.name}
        weather={w}
      />

      {/* 9. ASTRONOMY & CELESTIAL TRACKER */}
      <AstronomyTracker
        weather={w}
        onOpenGlossary={() => openGuide("astronomy")}
      />

      {/* MODALS */}
      {aiGalleryOpen && (
        <AiGalleryModal
          isOpen={aiGalleryOpen}
          onClose={() => setAiGalleryOpen(false)}
          currentPlace={w.place}
          city={w.place?.name}
          onSelectWallpaper={handleApplyArt}
        />
      )}

      {postcardOpen && (
        <WeatherPostcardModal
          isOpen={postcardOpen}
          onClose={() => setPostcardOpen(false)}
          weather={w}
          customBgUrl={displayBg || undefined}
        />
      )}

      {guideOpen && (
        <WeatherGuideModal
          isOpen={guideOpen}
          onClose={() => setGuideOpen(false)}
          initialTopic={guideTopic}
        />
      )}

      {forecastModalOpen && (
        <ForecastDetailModal
          isOpen={forecastModalOpen}
          onClose={() => setForecastModalOpen(false)}
          type={forecastModalType}
          onTypeChange={(tp) => setForecastModalType(tp)}
          weather={w}
          selectedIndex={forecastModalIndex}
          onSelectIndex={(idx) => setForecastModalIndex(idx)}
          unit={unit}
          getConditionLabel={(code) => getConditionLabel(code, t)}
        />
      )}
    </div>
  );
}
