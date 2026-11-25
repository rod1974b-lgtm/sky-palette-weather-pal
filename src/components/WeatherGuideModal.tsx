// src/components/WeatherGuideModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface WeatherGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeatherGuideModal({ open, onOpenChange }: WeatherGuideModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("all");

  const isThai = (i18n.language || "").startsWith("th");

  const GUIDE_TOPICS = [
    { id: "all", label: t("guide_all", isThai ? "ทั้งหมด" : "All Topics"), icon: "📚" },
    { id: "icons", label: t("guide_icons", isThai ? "ไอคอนสภาพอากาศ" : "Weather Icons"), icon: "🎨" },
    { id: "astronomy", label: t("guide_astronomy", isThai ? "ดวงอาทิตย์ & ดวงจันทร์" : "Sun & Moon Tracker"), icon: "✨" },
    { id: "uv", label: t("guide_uv", isThai ? "ดัชนี UV" : "UV Index"), icon: "☀" },
    { id: "aqi", label: t("guide_aqi", isThai ? "คุณภาพอากาศ" : "Air Quality"), icon: "🍃" },
    { id: "pressure", label: t("guide_pressure", isThai ? "ความกดอากาศ" : "Pressure"), icon: "🧭" },
    { id: "humidity", label: t("guide_humidity", isThai ? "ความชื้นสัมพัทธ์" : "Humidity"), icon: "💧" },
    { id: "wind", label: t("guide_wind", isThai ? "ลมและลมกระโชก" : "Wind"), icon: "💨" },
    { id: "conditions", label: t("guide_conditions", isThai ? "สภาพอากาศ" : "Conditions"), icon: "⛅" },
  ];

  const WEATHER_CONDITIONS = [
    { code: 0, day: true, icon: "☀", key: "clear_day", en: "Clear Sky (Day)", descEn: "Completely sunny with zero or minimal cloud coverage." },
    { code: 0, day: false, icon: "🌙", key: "clear_night", en: "Clear Sky (Night)", descEn: "Clear starry skies with excellent celestial visibility." },
    { code: 1, day: true, icon: "🌤", key: "mostly_clear_day", en: "Mostly Clear (Day)", descEn: "Mostly sunny with occasional light, high-altitude clouds." },
    { code: 1, day: false, icon: "🌤", key: "mostly_clear_night", en: "Mostly Clear (Night)", descEn: "Faint high clouds drifting across the night sky." },
    { code: 2, day: true, icon: "⛅", key: "partly_cloudy_day", en: "Partly Cloudy (Day)", descEn: "Sun and scattered cumulus clouds sharing the sky." },
    { code: 2, day: false, icon: "⛅", key: "partly_cloudy_night", en: "Partly Cloudy (Night)", descEn: "Passing cloud patches intermittently covering the moon." },
    { code: 3, day: true, icon: "☁", key: "overcast", en: "Overcast", descEn: "Dense blanket of gray clouds blocking all direct sunlight." },
    { code: 45, day: true, icon: "🌫", key: "foggy", en: "Fog & Mist", descEn: "Moisture-dense air reducing horizontal visibility below 1 km." },
    { code: 51, day: true, icon: "🌦", key: "drizzle", en: "Light Drizzle", descEn: "Fine mist-like water droplets floating in the air." },
    { code: 61, day: true, icon: "🌧", key: "rain_light", en: "Light Rain", descEn: "Steady gentle precipitation; umbrellas recommended." },
    { code: 63, day: true, icon: "🌧", key: "rain_moderate", en: "Moderate Rain", descEn: "Continual raindrops causing pooling water on streets." },
    { code: 65, day: true, icon: "🌧", key: "rain_heavy", en: "Heavy Rain", descEn: "Intense downpour significantly reducing driving visibility." },
    { code: 71, day: true, icon: "❄", key: "snow_light", en: "Light Snow", descEn: "Gentle snowflakes fluttering down; scenic conditions." },
    { code: 75, day: true, icon: "❄", key: "snow_heavy", en: "Heavy Snow", descEn: "Rapid snow accumulation creating hazardous travel." },
    { code: 80, day: true, icon: "🌦", key: "showers", en: "Passing Showers", descEn: "Sudden bursts of rain with rapid start and stop times." },
    { code: 95, day: true, icon: "⛈", key: "thunderstorm", en: "Thunderstorm", descEn: "Lightning, thunder, heavy rain, and sudden wind gusts." },
    { code: 96, day: true, icon: "⛈", key: "hail_storm", en: "Thunderstorm with Hail", descEn: "Severe storm accompanied by ice pellets; stay indoors." },
  ];

  const LUNAR_PHASES = [
    { phase: "New Moon", key: "phase_new_moon", icon: "🌑", descEn: "Dark moon; perfect night for stargazing and astronomy." },
    { phase: "Waxing Crescent", key: "phase_waxing_crescent", icon: "🌒", descEn: "Thin silver sliver glowing in the western evening sky." },
    { phase: "First Quarter", key: "phase_first_quarter", icon: "🌓", descEn: "Half moon illuminated on the right side." },
    { phase: "Waxing Gibbous", key: "phase_waxing_gibbous", icon: "🌔", descEn: "More than half lit, brightening as full moon nears." },
    { phase: "Full Moon", key: "phase_full_moon", icon: "🌕", descEn: "Entire surface bathed in bright, reflective sunlight." },
    { phase: "Waning Gibbous", key: "phase_waning_gibbous", icon: "🌖", descEn: "Light begins receding on the right side." },
    { phase: "Third Quarter", key: "phase_third_quarter", icon: "🌗", descEn: "Left half illuminated; rises around midnight." },
    { phase: "Waning Crescent", key: "phase_waning_crescent", icon: "🌘", descEn: "Delicate crescent rising just before dawn." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>{t("weather_guide_title", "Weather & Celestial Guide")}</DialogTitle>
          <DialogDescription>
            {t("weather_guide_subtitle", "Simple explanation of weather metrics, icons & celestial tracker")}
          </DialogDescription>
        </VisuallyHidden>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>📖</span>
                <span>{t("weather_guide_title", "Weather & Celestial Guide")}</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("weather_guide_subtitle", "Simple explanation of weather metrics, icons & celestial tracker")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Filter Topics */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
            {GUIDE_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTab(topic.id)}
                className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === topic.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/50"
                }`}
              >
                <span>{topic.icon}</span>
                <span>{topic.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENT SECTIONS */}
          <div className="space-y-6 text-xs text-foreground/90">
            {/* 1. WEATHER CONDITIONS */}
            {(activeTab === "all" || activeTab === "icons" || activeTab === "conditions") && (
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/70">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <span>🎨</span>
                  <span>{t("guide_common_conditions", "Common Weather Conditions")}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {WEATHER_CONDITIONS.map((cond, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-border/50 bg-background/50 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cond.icon}</span>
                        <span className="font-bold text-foreground">
                          {t(`cond_${cond.key}`, cond.en)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t(`cond_desc_${cond.key}`, cond.descEn)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SUN & MOON TRACKER */}
            {(activeTab === "all" || activeTab === "astronomy") && (
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/70">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <span>✨</span>
                  <span>{t("guide_astronomy", "Sun & Moon Tracker")}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/50">
                    <p className="font-bold text-foreground">🌅 {t("golden_hour", "Golden Hour")}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("golden_hour_desc", "Soft, warm sunlight before sunset and after sunrise; ideal for photography.")}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border/50 bg-background/50">
                    <p className="font-bold text-foreground">🌌 {t("blue_hour", "Blue Hour")}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("blue_hour_desc", "Deep twilight sky bathed in cobalt tones right before sunrise and after sunset.")}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="font-bold text-foreground mb-2">
                    🌙 {t("lunar_phases", "8 Moon Phases & Stargazing")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LUNAR_PHASES.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl border border-border/40 bg-background/40 text-center"
                      >
                        <span className="text-xl">{p.icon}</span>
                        <p className="font-semibold text-[11px] mt-1 text-foreground">
                          {t(p.key, p.phase)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. UV INDEX */}
            {(activeTab === "all" || activeTab === "uv") && (
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/70">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <span>☀</span>
                  <span>{t("guide_uv", "UV Index")}</span>
                </h3>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      0 – 2 ({t("uv_low", "Low")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("uv_low_desc", "Safe to be outside. No special sun protection required.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      3 – 5 ({t("uv_moderate", "Moderate")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("uv_mod_desc", "Wear sunglasses, hat, and apply SPF 30+ if outdoors for 30+ mins.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5">
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      6 – 7 ({t("uv_high", "High")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("uv_high_desc", "Skin burns in 20 minutes. Seek shade between 11 AM and 3 PM.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      8 – 11+ ({t("uv_very_high", "Very High & Extreme")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("uv_extreme_desc", "Skin burns in under 15 mins. Avoid direct midday sun completely.")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. AIR QUALITY */}
            {(activeTab === "all" || activeTab === "aqi") && (
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/70">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <span>🍃</span>
                  <span>{t("guide_aqi", "Air Quality (AQI) & PM2.5")}</span>
                </h3>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      0 – 50 ({t("aqi_good", "Good")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("aqi_good_desc", "Clean air. Great for outdoor running and open windows.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      51 – 100 ({t("aqi_moderate", "Moderate")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("aqi_mod_desc", "Acceptable. Sensitive people should limit prolonged heavy outdoor exertion.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5">
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      101 – 150 ({t("aqi_sensitive", "Unhealthy for Sensitive Groups")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("aqi_sens_desc", "Children, elderly, and asthmatics should wear an N95 mask outside.")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      151+ ({t("aqi_unhealthy", "Unhealthy")}):
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t("aqi_unhealthy_desc", "Close windows, run air purifiers, and wear an N95 mask outdoors.")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold hover:brightness-105 transition cursor-pointer"
            >
              {t("got_it", "Got It")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
