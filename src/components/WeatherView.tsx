import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Weather } from "@/lib/weather";
import { pickNum } from "@/lib/weatherSafe";
import { saveWallpaperToDownloads } from "@/lib/saveWallpaper";
import { WeatherIcon } from "@/lib/weatherIcons";
import AiGalleryModal from "./AiGalleryModal";
import WeatherPostcardModal from "./WeatherPostcardModal";
import { WeatherGuideModal } from "./WeatherGuideModal";
import { ForecastDetailModal } from "./ForecastDetailModal";
import { OutdoorActivityPlanner } from "./OutdoorActivityPlanner";

export interface TickerAlertItem {
  id: string;
  tag?: string;
  tagKey?: string;
  title: string;
  message?: string;
  desc?: string;
  severity: "info" | "warning" | "alert";
  isMock?: boolean;
}

export interface WeatherViewProps {
  weather: Weather;
  unit: "metric" | "imperial";
  onOpenAiGallery?: () => void;
  onOpenPostcard?: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string | null | undefined;
  onSelectBackground?: (url: string | null) => void;
}


export interface WeatherViewProps {
  weather: Weather;
  unit: "metric" | "imperial";
  onOpenAiGallery?: () => void;
  onOpenPostcard?: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  activeAlerts?: TickerAlertItem[];
  customBgUrl?: string | null;
  onSelectBackground?: (url: string | null) => void;
}


export const WeatherView: React.FC<WeatherViewProps> = ({
  weather: w,
  unit,
  onOpenAiGallery,
  onOpenPostcard,
  onRefresh,
  isRefreshing = false,
  customBgUrl,
  onSelectBackground,
}) => {
  const { t } = useTranslation();

  // Internal modal fallbacks if parent does not provide handlers
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [postcardOpen, setPostcardOpen] = useState(false);

  // Weather Guide Modal
  const [guideOpen, setGuideOpen] = useState(false);

  // Forecast Detail Modal
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [forecastModalTab, setForecastModalTab] = useState<"hourly" | "daily">("hourly");

  // Outfit recommendations tab: "casual" | "business" | "outdoor"
  const [activeOutfitTab, setActiveOutfitTab] = useState<"casual" | "business" | "outdoor">("casual");

  // Save Wallpaper loading state
  const [isSaving, setIsSaving] = useState(false);

  // Safe fallback values
  const safeTemp = pickNum(w.current?.temperature_2m, w.current?.temperature, 0);
  const safeFeels = pickNum(w.current?.apparent_temperature, w.current?.apparentTemperature, safeTemp);
  const safeHumidity = pickNum(w.current?.relative_humidity_2m, w.current?.relativeHumidity, 0);
  const safeWindSpeed = pickNum(w.current?.wind_speed_10m, w.current?.windSpeed, 0);
  const safeUv = pickNum(w.current?.uv_index, w.current?.uvIndex, 0);
  const safeAqi = pickNum(w.airQuality?.usAqi, w.airQuality?.pm2_5, 0);
  const safePressure = pickNum(w.current?.surface_pressure, w.current?.pressure_msl, 1013);
  const safeCode = pickNum(w.current?.weather_code, w.current?.weatherCode, 0);

  // Priority: Prop customBgUrl > Weather Default Background
  const displayBg = customBgUrl !== undefined ? customBgUrl : w.background_image;

  // Single Save Wallpaper Handler
  const handleSaveWallpaper = async () => {
    if (!displayBg) {
      toast.error(t("no_wallpaper_to_save", "No wallpaper currently applied"));
      return;
    }
    setIsSaving(true);
    try {
      const fileName = `weather-pal-${w.place.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}.png`;
      const result = await saveWallpaperToDownloads(displayBg, fileName);
      if (result.ok) {
        toast.success(result.message || t("wallpaper_saved_success", "Wallpaper saved to device!"));
      } else {
        toast.error(result.message || t("wallpaper_save_failed", "Could not save wallpaper"));
      }
    } catch {
      toast.error(t("wallpaper_save_failed", "Could not save wallpaper"));
    } finally {
      setIsSaving(false);
    }
  };

  // Weather severe alerts
  const activeAlerts = useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; severity: "warning" | "alert" }> = [];
    if (safeCode === 95 || safeCode === 96 || safeCode === 99) {
      list.push({
        id: "thunderstorm",
        title: t("alert_ts_title", "Thunderstorm Warning"),
        desc: t("alert_ts_desc", "Severe electrical storms detected in your immediate area."),
        severity: "alert",
      });
    }
    if (safeWindSpeed > 45) {
      list.push({
        id: "wind",
        title: t("alert_wind_title", "High Wind Advisory"),
        desc: t("alert_wind_desc", "Gale-force gusts exceeding safe outdoor thresholds."),
        severity: "warning",
      });
    }
    if (safeUv >= 8) {
      list.push({
        id: "uv",
        title: t("alert_uv_title", "Extreme UV Radiation"),
        desc: t("alert_uv_desc", "Intense solar radiation. Apply SPF 50+ and seek shade."),
        severity: "warning",
      });
    }
    return list;
  }, [safeCode, safeWindSpeed, safeUv, t]);

  const tempUnit = unit === "imperial" ? "°F" : "°C";
  const speedUnit = unit === "imperial" ? "mph" : "km/h";

  // Outfit recommendations: fully localized across all 14 languages with t() lookup
  const outfitRec = useMemo(() => {
    const rawTemp = safeTemp ?? 22;
    const tempC = unit === "imperial" ? ((rawTemp - 32) * 5) / 9 : rawTemp;
    const codeNum = safeCode;
    const isRaining = (codeNum >= 51 && codeNum <= 67) || (codeNum >= 80 && codeNum <= 82);

    if (activeOutfitTab === "business") {
      if (tempC >= 28) {
        return isRaining
          ? t("outfit_biz_hot_rain", "Light linen suit, breathable dress shirt, umbrella")
          : t("outfit_biz_hot_clear", "Breathable suit trousers, short-sleeve shirt");
      }
      if (tempC >= 18) {
        return t("outfit_biz_mild", "Standard business suit, light blazer");
      }
      return t("outfit_biz_cold", "Wool suit, tailored trench coat, dress boots");
    }

    if (activeOutfitTab === "outdoor") {
      if (tempC >= 28) {
        return isRaining
          ? t("outfit_outdoor_hot_rain", "Waterproof shell jacket, trail shorts, quick-dry cap")
          : t("outfit_outdoor_hot_clear", "UV-blocking athletic shirt, moisture-wicking shorts, sunglasses");
      }
      if (tempC >= 18) {
        return t("outfit_outdoor_mild", "Long-sleeve performance top, hiking pants, windbreaker");
      }
      return t("outfit_outdoor_cold", "Thermal base layer, insulated fleece, windproof trousers");
    }

    // Default: casual
    if (tempC >= 28) {
      return isRaining
        ? t("outfit_casual_hot_rain", "Light tee, shorts, compact umbrella")
        : t("outfit_casual_hot_clear", "Breathable t-shirt, shorts, sun hat");
    }
    if (tempC >= 18) {
      return t("outfit_casual_mild", "Casual jeans, light sweater or flannel");
    }
    return t("outfit_casual_cold", "Heavy sweater, warm coat, scarf");
  }, [safeTemp, safeCode, unit, activeOutfitTab, t]);

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. SEVERE WEATHER ALERT BANNER */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-xs ${
                alt.severity === "alert"
                  ? "bg-destructive/15 border-destructive/40 text-destructive dark:text-red-400"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base sm:text-lg">⚠️</span>
                <div>
                  <div className="font-bold">{alt.title}</div>
                  <div className="text-[11px] sm:text-xs opacity-90 font-normal">{alt.desc}</div>
                </div>
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
            <span>{t("art_gallery", "Art Gallery")}</span>
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
          <div className="w-full h-full bg-gradient-to-tr from-sky-400 to-indigo-500 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
      </section>

      {/* 4. SAVE WALLPAPER BUTTON */}
      {displayBg && (
        <div className="w-full px-1">
          <button
            type="button"
            onClick={handleSaveWallpaper}
            disabled={isSaving}
            className="w-full py-2.5 px-4 rounded-2xl bg-card hover:bg-muted text-card-foreground text-xs sm:text-sm font-bold transition border border-border/80 shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span>💾</span>
            <span>{isSaving ? t("saving", "Saving...") : t("save_wallpaper", "Save Wallpaper")}</span>
          </button>
        </div>
      )}

      {/* 5. WEATHER METRICS OVERVIEW */}
      <section className="p-4 sm:p-5 rounded-3xl bg-card/90 backdrop-blur-md border border-border/70 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WeatherIcon code={safeCode} isDay={Boolean(w.current?.is_day)} className="w-14 h-14 shrink-0 drop-shadow-sm" />
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-baseline">
                {Math.round(safeTemp)}
                <span className="text-xl font-bold ml-0.5">{tempUnit}</span>
              </div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground capitalize">
                {w.current?.condition || t("weather", "Weather")}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">
              {t("feels_like", "Feels like")}{" "}
              <span className="font-bold text-foreground">
                {Math.round(safeFeels)}
                {tempUnit}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="mt-1 text-[11px] font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition cursor-pointer"
            >
              📖 {t("label_unit_guide", "Weather Guide")}
            </button>
          </div>
        </div>

        {/* 4 Detail Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50 text-xs">
          <div className="p-2.5 rounded-2xl bg-background/60 border border-border/40">
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>💧</span> {t("humidity", "Humidity")}
            </div>
            <div className="text-sm font-bold mt-0.5">{safeHumidity}%</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-background/60 border border-border/40">
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>💨</span> {t("wind", "Wind")}
            </div>
            <div className="text-sm font-bold mt-0.5">
              {Math.round(safeWindSpeed)} {speedUnit}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-background/60 border border-border/40">
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>☀️</span> {t("uv_index", "UV Index")}
            </div>
            <div className="text-sm font-bold mt-0.5">{safeUv}</div>
          </div>

          <div className="p-2.5 rounded-2xl bg-background/60 border border-border/40">
            <div className="text-muted-foreground font-medium flex items-center gap-1">
              <span>🍃</span> {t("air_quality", "Air Quality")}
            </div>
            <div className="text-sm font-bold mt-0.5">
              {safeAqi > 0 ? `${safeAqi} AQI` : `${Math.round(safePressure)} hPa`}
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOURLY & 7-DAY FORECAST PREVIEWS */}
      <section className="space-y-3">
        {/* Hourly Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>⏱️</span>
            <span>{t("hourly_forecast", "Hourly Forecast")}</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setForecastModalTab("hourly");
              setForecastModalOpen(true);
            }}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {t("see_all", "See Details")} →
          </button>
        </div>

        {/* Hourly Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {w.hourly?.slice(0, 12).map((hr, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-2xl bg-card border border-border/70 text-center shrink-0 min-w-[68px] shadow-2xs"
            >
              <div className="text-[11px] text-muted-foreground font-semibold">
                {hr.time ? new Date(hr.time).getHours() + ":00" : `${idx}h`}
              </div>
              <WeatherIcon code={hr.weather_code ?? 0} isDay={true} className="w-6 h-6 mx-auto my-1 drop-shadow-xs" />
              <div className="text-xs font-extrabold">{Math.round(hr.temperature_2m ?? 0)}°</div>
            </div>
          ))}
        </div>

        {/* 7-Day Header */}
        <div className="flex items-center justify-between px-1 pt-2">
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>📅</span>
            <span>{t("seven_day_outlook", "7-Day Outlook")}</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setForecastModalTab("daily");
              setForecastModalOpen(true);
            }}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {t("see_all", "See Details")} →
          </button>
        </div>

        {/* Daily Preview (3 days compact) */}
        <div className="space-y-1.5">
          {w.daily?.slice(0, 3).map((day, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-card border border-border/70 flex items-center justify-between text-xs font-semibold shadow-2xs"
            >
              <div className="w-24 text-muted-foreground">
                {idx === 0 ? t("today", "Today") : idx === 1 ? t("tomorrow", "Tomorrow") : day.date}
              </div>
              <div className="flex items-center gap-2">
                <WeatherIcon code={day.weather_code ?? 0} isDay={true} className="w-5 h-5 drop-shadow-xs" />
                <span className="text-[11px] text-muted-foreground font-normal hidden sm:inline">
                  {day.condition}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-foreground">{Math.round(day.temperature_2m_max ?? 0)}°</span>
                <span className="text-muted-foreground font-normal">{Math.round(day.temperature_2m_min ?? 0)}°</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WHAT TO WEAR TODAY */}
      <section className="p-4 rounded-3xl bg-card border border-border/70 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
            <span>👕</span>
            <span>{t("what_to_wear", "What to Wear Today")}</span>
          </h2>

          <div className="flex items-center gap-1 bg-muted/80 p-0.5 rounded-xl text-[11px] font-bold">
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

      {/* MODALS */}
      <AiGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        activeWallpaper={displayBg || undefined}
        onSelectWallpaper={(url) => {
          if (onSelectBackground) onSelectBackground(url);
          setGalleryOpen(false);
        }}
        currentWeatherCode={safeCode}
        currentCity={w.place.name}
      />

      <WeatherPostcardModal
        isOpen={postcardOpen}
        onClose={() => setPostcardOpen(false)}
        weather={w}
        unit={unit}
        backgroundImage={displayBg || undefined}
      />

      <WeatherGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
      />

      <ForecastDetailModal
        isOpen={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        weather={w}
        unit={unit}
        initialTab={forecastModalTab}
      />
    </div>
  );
};

export default WeatherView;
