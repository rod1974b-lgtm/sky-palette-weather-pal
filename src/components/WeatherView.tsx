// src/components/WeatherView.tsx
// FULL REPLACEMENT - Keeps EVERYTHING from your pasted file, only fixes Save
// What changed vs your pasted file:
// 1. Import: removed downloadArtwork, shareArtwork from wallpaperStorage, now uses saveWallpaperToDownloads from saveWallpaper
// 2. handleDownloadHero: now calls saveWallpaperToDownloads with mode download, shows toast with result message
// 3. handleShareHero: now calls saveWallpaperToDownloads with mode share, shows toast with result message
// 4. Added saveToast state + toast UI below dual buttons
// What did NOT change:
// Hero layout, dimensions, styling, toolbar, conditions card, hourly, daily, what to wear, planner, radar, astronomy, modals - all identical to your pasted file

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
  isRefreshing,
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

  // Modals state
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTopic, setGuideTopic] = useState<GuideTopic>("all");
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalType, setForecastModalType] = useState<"hourly" | "daily">("hourly");
  const [forecastModalIndex, setForecastModalIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [activeOutfitTab, setActiveOutfitTab] = useState<"casual" | "business" | "outdoor">("casual");
  
  // Dual button loading states
  const [isDownloadingHero, setIsDownloadingHero] = useState(false);
  const [isSharingHero, setIsSharingHero] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Artwork resolution
  const [localWallpaper, setLocalWallpaper] = useState<string | null>(customBgUrl ?? null);

  useEffect(() => {
    if (customBgUrl) {
      setLocalWallpaper(customBgUrl);
    }
  }, [customBgUrl]);

  const displayBg = localWallpaper || customBgUrl;

  const handleApplyArtwork = async (url: string) => {
    setLocalWallpaper(url);
    onSelectBackground?.(url);
    onSelectBg?.(url);
  };

  const showSaveToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 5000);
  };

  const handleDownloadHero = async () => {
    if (!displayBg || isDownloadingHero) return;
    setIsDownloadingHero(true);
    try {
      const result = await saveWallpaperToDownloads(displayBg, `weather-pal-${w.place.name || "wallpaper"}`, { mode: "download" });
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
      const result = await saveWallpaperToDownloads(displayBg, `weather-pal-${w.place.name || "wallpaper"}`, { mode: "share" });
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

  // Outfit recommendations
  const outfitRec = useMemo(() => {
    const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
    const isRaining = (w.current.code >= 51 && w.current.code <= 67) || (w.current.code >= 80 && w.current.code <= 82);

    if (activeOutfitTab === "business") {
      if (tempC >= 28) return isRaining ? "Light linen suit, breathable dress shirt, umbrella" : "Breathable suit trousers, short-sleeve shirt";
      if (tempC >= 18) return "Standard business suit, light blazer";
      return "Wool suit, tailored trench coat, dress boots";
    }

    if (activeOutfitTab === "outdoor") {
      if (tempC >= 28) return isRaining ? "Waterproof shell jacket, trail shorts, quick-dry cap" : "UV-blocking athletic shirt, moisture-wicking shorts, sunglasses";
      if (tempC >= 18) return "Long-sleeve performance top, hiking pants, windbreaker";
      return "Thermal base layer, insulated fleece, windproof trousers";
    }

    if (tempC >= 28) return isRaining ? "Light tee, shorts, compact umbrella" : "Breathable t-shirt, shorts, sun hat";
    if (tempC >= 18) return "Casual jeans, light sweater or flannel";
    return "Heavy sweater, warm coat, scarf";
  }, [w.current.temp, w.current.code, unit, activeOutfitTab]);

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. SEVERE WEATHER ALERT BANNER */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-sm ${
                alt.severity === "alert"
                  ? "bg-destructive/15 border-destructive/40 text-destructive dark:text-red-400"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>⚠</span>
                <span>{alt.title}: {alt.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. TOP TOOLBAR CONTROLS */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => (onOpenAiGallery ? onOpenAiGallery() : setGalleryOpen(true))}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold transition border border-border/70 shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>🎨</span>
            <span>{t("gallery", "Art Gallery")}</span>
          </button>

          <button
            type="button"
            onClick={() => (onOpenPostcard ? onOpenPostcard() : setPostcardOpen(true))}
            className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold transition border border-border/70 shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
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
            className={`h-8 w-8 rounded-xl bg-card hover:bg-muted text-card-foreground text-xs font-bold transition border border-border/70 shadow-xs flex items-center justify-center shrink-0 cursor-pointer ${
              isRefreshing ? "opacity-60 animate-spin" : ""
            }`}
            title={t("refresh", "Refresh Weather")}
          >
            🔄
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

      {/* Save result toast - NEW, only addition below dual buttons */}
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
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={isFavorite ? t("remove_favorite", "Remove from favorites") : t("add_favorite", "Add to favorites")}
                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-base transition cursor-pointer border ${
                    isFavorite
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-500"
                      : "bg-muted border-border/50 text-muted-foreground hover:text-amber-500"
                  }`}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              {getConditionLabel(w.current.code, t)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openGuide("conditions")}
            className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition border border-border/50 cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>💡</span>
            <span>{t("label_unit_guide", "Explain Units")}</span>
          </button>
        </div>

        {/* Temperature & Watercolor Icon Display */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter">
              {Math.round(w.current.temp)}
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-muted-foreground">
              {tempUnit}
            </span>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <WeatherIcon
              code={w.current.code}
              isDay={w.current.is_day}
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
        </div>

        {/* 6 Key Weather Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-xs pt-2">
          <div
            onClick={() => openGuide("conditions")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              🌡 {t("feels_like", "Feels Like")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {Math.round(w.current.feels)}{tempUnit}
            </p>
          </div>

          <div
            onClick={() => openGuide("wind")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              💨 {t("wind", "Wind")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {Math.round(w.current.wind_speed)} {speedUnit}
            </p>
          </div>

          <div
            onClick={() => openGuide("humidity")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              💦 {t("humidity", "Humidity")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {w.current.humidity}%
            </p>
          </div>

          <div
            onClick={() => openGuide("uv")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              ☀ {t("uv_index", "UV Index")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {w.current.uvIndex ?? w.current.uv ?? 0} ({uvCategory(w.current.uvIndex ?? w.current.uv ?? 0, t)})
            </p>
          </div>

          <div
            onClick={() => openGuide("aqi")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              🍃 {t("aqi", "Air Quality")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {w.current.aqi !== undefined
                ? `AQI ${w.current.aqi} (${aqiCategory(w.current.aqi, t).label})`
                : "AQI --"}
            </p>
          </div>

          <div
            onClick={() => openGuide("pressure")}
            className="p-3 rounded-2xl bg-muted/40 border border-border/50 cursor-pointer hover:bg-muted/70 transition"
          >
            <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
              ⏲ {t("pressure", "Pressure")}
            </span>
            <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              {Math.round(w.current.pressure)} hPa
            </p>
          </div>
        </div>
      </section>

      {/* 5. HOURLY FORECAST HORIZONTAL SCROLLER */}
      {w.hourly && w.hourly.length > 0 && (
        <section className="p-4 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <span>⏱</span>
              <span>{t("tab_hourly", "Hourly Forecast")}</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">{t("tap_for_details", "Tap for breakdown")}</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {w.hourly.slice(0, 24).map((h, idx) => {
              const timeLabel = (() => {
                try {
                  const d = new Date(h.time);
                  return d.toLocaleTimeString([], { hour: "numeric" });
                } catch {
                  return h.time;
                }
              })();

              return (
                <button
                  key={h.time || idx}
                  type="button"
                  onClick={() => {
                    setForecastModalType("hourly");
                    setForecastModalIndex(idx);
                    setForecastModalOpen(true);
                  }}
                  className="flex-shrink-0 w-20 p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/80 border border-border/40 flex flex-col items-center justify-between gap-1.5 cursor-pointer active:scale-95 transition text-center"
                >
                  <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">{timeLabel}</span>
                  <div className="w-8 h-8 flex items-center justify-center my-0.5">
                    <WeatherIcon code={h.code} isDay={h.is_day} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm font-bold text-foreground">{Math.round(h.temp)}°</span>
                  <span className="text-[9px] text-muted-foreground text-center line-clamp-1">{getConditionLabel(h.code, t)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. 7-DAY FORECAST SECTION */}
      {w.daily && w.daily.length > 0 && (
        <section className="p-4 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
              <span>📅</span>
              <span>{t("tab_daily", "7-Day Outlook")}</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">{t("tap_for_details", "Tap for breakdown")}</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {w.daily.slice(0, 7).map((d, idx) => {
              const dayLabel = (() => {
                if (idx === 0) return t("today", "Today");
                if (idx === 1) return t("tomorrow", "Tomorrow");
                try {
                  const date = new Date(d.date + "T12:00:00");
                  return date.toLocaleDateString([], { weekday: "short" });
                } catch {
                  return d.date;
                }
              })();

              return (
                <button
                  key={d.date || idx}
                  type="button"
                  onClick={() => {
                    setForecastModalType("daily");
                    setForecastModalIndex(idx);
                    setForecastModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/70 border border-border/40 flex items-center justify-between gap-3 text-xs transition cursor-pointer active:scale-98"
                >
                  <span className="w-20 text-left font-bold text-foreground">{dayLabel}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                      <WeatherIcon code={d.code} isDay={1} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">{getConditionLabel(d.code, t)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono font-semibold">
                    <span className="text-foreground">{Math.round(d.max)}°</span>
                    <span className="text-muted-foreground">/ {Math.round(d.min)}°</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 7. WHAT TO WEAR TABBED SECTION */}
      <section className="p-4 rounded-3xl bg-card border border-border/70 shadow-sm text-card-foreground space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear")}</span>
          </h3>

          <div className="flex bg-muted/60 rounded-xl p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveOutfitTab("casual")}
              className={`px-2 py-1 rounded-lg transition ${
                activeOutfitTab === "casual" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              {t("tab_casual", "Casual")}
            </button>
            <button
              type="button"
              onClick={() => setActiveOutfitTab("business")}
              className={`px-2 py-1 rounded-lg transition ${
                activeOutfitTab === "business" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              {t("tab_business", "Business")}
            </button>
            <button
              type="button"
              onClick={() => setActiveOutfitTab("outdoor")}
              className={`px-2 py-1 rounded-lg transition ${
                activeOutfitTab === "outdoor" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
              }`}
            >
              {t("tab_outdoor", "Outdoor")}
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-foreground/90 font-medium py-1">{outfitRec}</p>
      </section>

      {/* 8. OUTDOOR ACTIVITY PLANNER */}
      <OutdoorActivityPlanner weather={w} unit={unit} />

      {/* 9. RAIN RADAR (Centered on city coordinates) */}
      <WeatherRadar weather={w} lat={w.place.lat} lon={w.place.lon} cityName={w.place.name} />

      {/* 10. SUN & MOON TRACKER */}
      <AstronomyTracker weather={w} />

      {/* MODALS */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          currentPlace={w.place}
          onApplyBackground={handleApplyArtwork}
        />
      )}

      {postcardOpen && (
        <WeatherPostcardModal
          isOpen={postcardOpen}
          onClose={() => setPostcardOpen(false)}
          weather={w}
          unit={unit}
          backgroundUrl={displayBg || ""}
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
          onTypeChange={(t) => setForecastModalType(t)}
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
