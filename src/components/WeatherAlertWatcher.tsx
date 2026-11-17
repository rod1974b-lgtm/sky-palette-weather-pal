// src/components/WeatherAlertWatcher.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Weather, WeatherUnit } from "@/lib/weather";
import {
  WATCHER_EN,
  WATCHER_I18N,
  resolveAlertHeadline,
  type AlertDictionary,
} from "@/lib/alertTranslations";

export interface TickerAlertItem {
  id?: string;
  source?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  headline?: string;
  headlineTh?: string;
  headlineEn?: string;
  headlines?: Record<string, string>;
  text?: string;
  details?: string;
  area?: string;
  tag?: string;
  timeAgo?: string;
  timestamp?: number;
}

export interface WeatherAlertWatcherProps {
  weather: Weather;
  unit: WeatherUnit;
  activeAlerts?: TickerAlertItem[];
}

export interface DetectedHazard {
  id: string;
  type: "thunderstorm" | "wind" | "heat" | "cold" | "rain" | "air" | "official";
  severity: "danger" | "warning" | "advisory";
  icon: string;
  titleKey: string;
  descKey: string;
  adviceKey: string;
  metricValue?: string;
}

interface AlertWatcherConfig {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  notifyThunderstorm: boolean;
  notifyWind: boolean;
  notifyHeat: boolean;
  notifyCold: boolean;
  notifyRain: boolean;
  notifyAir: boolean;
}

const DEFAULT_CONFIG: AlertWatcherConfig = {
  soundEnabled: true,
  notificationsEnabled: false,
  notifyThunderstorm: true,
  notifyWind: true,
  notifyHeat: true,
  notifyCold: true,
  notifyRain: true,
  notifyAir: true,
};

const STORAGE_KEY_CONFIG = "weather:alert_watcher_config";
const STORAGE_KEY_LAST_NOTIFIED = "weather:alert_watcher_last_sent";

/**
 * Synthesizes an alert chime using Web Audio API (no external asset needed)
 */
function playAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const tones = [
      { freq: 587.33, start: 0, duration: 0.16 }, // D5
      { freq: 880.0, start: 0.18, duration: 0.28 }, // A5
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.2, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {}
}

export const WeatherAlertWatcher: React.FC<WeatherAlertWatcherProps> = ({
  weather,
  unit,
  activeAlerts = [],
}) => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2).toLowerCase();

  // Merge English base with current language dictionary from alertTranslations.ts
  const dict = useMemo<AlertDictionary>(
    () => ({ ...WATCHER_EN, ...(WATCHER_I18N[lang] ?? {}) }),
    [lang]
  );

  const tLocal = useCallback(
    (key: string, fallback: string): string => {
      // Check standard i18next first, fallback to alert dictionary, then fallback string
      const i18nVal = t(key);
      if (i18nVal && i18nVal !== key) return i18nVal;

      const val = (dict as unknown as Record<string, string | undefined>)[key];
      return val || fallback;
    },
    [dict, t]
  );

  // Settings configuration state
  const [config, setConfig] = useState<AlertWatcherConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const updateConfig = (patch: Partial<AlertWatcherConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const detectedHazards = useMemo<DetectedHazard[]>(() => {
    const list: DetectedHazard[] = [];
    if (!weather?.current) return list;

    const { temp, code, wind_speed, feels, aqi, pm25, precipitation } = weather.current;

    const tempC = unit === "imperial" ? ((temp - 32) * 5) / 9 : temp;
    const feelsC = unit === "imperial" ? ((feels - 32) * 5) / 9 : feels;
    const windKmh = unit === "imperial" ? wind_speed * 1.60934 : wind_speed;

    // 1. Severe Thunderstorm
    if (config.notifyThunderstorm && (code === 95 || code === 96 || code === 99)) {
      list.push({
        id: "thunderstorm",
        type: "thunderstorm",
        severity: "danger",
        icon: "⚡",
        titleKey: "hazard_thunderstorm_title",
        descKey: "hazard_thunderstorm_desc",
        adviceKey: "hazard_thunderstorm_advice",
        metricValue: `${t("weather_code", "Code")} ${code}`,
      });
    }

    // 2. Gale-Force Wind
    if (config.notifyWind && windKmh >= 45) {
      list.push({
        id: "wind",
        type: "wind",
        severity: windKmh >= 65 ? "danger" : "warning",
        icon: "💨",
        titleKey: "hazard_wind_title",
        descKey: "hazard_wind_desc",
        adviceKey: "hazard_wind_advice",
        metricValue: `${Math.round(windKmh)} km/h`,
      });
    }

    // 3. Extreme Heatwave
    if (config.notifyHeat && (feelsC >= 39 || tempC >= 38)) {
      list.push({
        id: "heat",
        type: "heat",
        severity: feelsC >= 43 ? "danger" : "warning",
        icon: "🌡️",
        titleKey: "hazard_heat_title",
        descKey: "hazard_heat_desc",
        adviceKey: "hazard_heat_advice",
        metricValue:
          unit === "imperial"
            ? `${Math.round(feels)}°F ${t("feels_like_short", "Feels")}`
            : `${Math.round(feelsC)}°C ${t("feels_like_short", "Feels")}`,
      });
    }

    // 4. Freezing Cold
    if (config.notifyCold && tempC <= 0) {
      list.push({
        id: "cold",
        type: "cold",
        severity: tempC <= -10 ? "danger" : "warning",
        icon: "❄️",
        titleKey: "hazard_cold_title",
        descKey: "hazard_cold_desc",
        adviceKey: "hazard_cold_advice",
        metricValue: unit === "imperial" ? `${Math.round(temp)}°F` : `${Math.round(tempC)}°C`,
      });
    }

    // 5. Torrential Rain & Flash Floods
    if (config.notifyRain && (precipitation >= 15 || code === 65 || code === 82)) {
      list.push({
        id: "rain",
        type: "rain",
        severity: precipitation >= 25 ? "danger" : "warning",
        icon: "🌧️",
        titleKey: "hazard_rain_title",
        descKey: "hazard_rain_desc",
        adviceKey: "hazard_rain_advice",
        metricValue: `${precipitation.toFixed(1)} mm/h`,
      });
    }

    // 6. Hazardous Air Quality (AQI / PM2.5)
    const dangerousAqi = typeof aqi === "number" && aqi > 150;
    const dangerousPm25 = typeof pm25 === "number" && pm25 > 55.4;
    if (config.notifyAir && (dangerousAqi || dangerousPm25)) {
      list.push({
        id: "air",
        type: "air",
        severity: (aqi && aqi > 200) || (pm25 && pm25 > 150) ? "danger" : "warning",
        icon: "😷",
        titleKey: "hazard_air_title",
        descKey: "hazard_air_desc",
        adviceKey: "hazard_air_advice",
        metricValue: pm25 ? `${Math.round(pm25)} µg/m³` : `AQI ${aqi}`,
      });
    }

    // 7. Active Official Disaster & TMD Bulletins (Multilingual Translation)
    activeAlerts.forEach((alert, idx) => {
      if (alert.severity === "danger" || alert.severity === "disaster" || alert.severity === "warning") {
        const translatedHeadline = resolveAlertHeadline(alert, lang);
        const resolvedHeadline =
          translatedHeadline ||
          alert.headline ||
          alert.text ||
          tLocal("hazard_official_desc", "Official weather bulletin active");

        list.push({
          id: `official-${alert.id || idx}`,
          type: "official",
          severity: "danger",
          icon: "🚨",
          titleKey: alert.tag || "hazard_official_title",
          descKey: resolvedHeadline,
          adviceKey: alert.details || "hazard_official_advice",
          metricValue: alert.area || alert.source || t("official_alert_badge", "Official Alert"),
        });
      }
    });

    return list;
  }, [weather, unit, config, activeAlerts, lang, tLocal, t]);

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        updateConfig({ notificationsEnabled: true });
        triggerNotification(
          tLocal("test_toast_title", "Severe Weather Watcher Active"),
          tLocal("test_toast_desc", "This is a test notification with synthesized alert chime. Stay safe!")
        );
      }
    } catch {}
  };

  const triggerNotification = useCallback((title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "my-weather-pal-alert",
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (detectedHazards.length === 0) return;
    try {
      const lastSentRaw = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);
      const lastSent = lastSentRaw ? parseInt(lastSentRaw, 10) : 0;
      const now = Date.now();

      if (now - lastSent > 30 * 60 * 1000) {
        if (config.soundEnabled) playAlertChime();
        if (config.notificationsEnabled && notificationPermission === "granted") {
          const topHazard = detectedHazards[0];
          if (topHazard) {
            const title = tLocal(topHazard.titleKey, topHazard.titleKey);
            const body = tLocal(topHazard.adviceKey, topHazard.adviceKey);
            triggerNotification(title, body);
          }
        }
        localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, now.toString());
      }
    } catch {}
  }, [detectedHazards, config, notificationPermission, tLocal, triggerNotification]);

  const handleTestAlert = () => {
    if (config.soundEnabled) playAlertChime();
    const testTitle = tLocal("test_toast_title", "Severe Weather Watcher Active");
    const testDesc = tLocal(
      "test_toast_desc",
      "This is a test notification with synthesized alert chime. Stay safe!"
    );

    setToastMessage({ title: testTitle, desc: testDesc });
    setTimeout(() => setToastMessage(null), 4500);

    if (config.notificationsEnabled && notificationPermission === "granted") {
      triggerNotification(testTitle, testDesc);
    }
  };

  const hasHazards = detectedHazards.length > 0;
  const cityName = weather?.place?.name || t("current_location", "Current Location");

  return (
    <section
      aria-label={t("alert_watcher_aria", "Severe Weather Alert Watcher")}
      className="relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card/95 p-4 sm:p-6 shadow-xl backdrop-blur-lg transition-all duration-300"
    >
      {/* Test Notification Banner Toast */}
      {toastMessage && (
        <div className="absolute top-3 left-3 right-3 z-30 flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/20 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-2xl">🔔</span>
          <div className="flex-1 text-sm">
            <p className="font-bold text-foreground text-base leading-tight">{toastMessage.title}</p>
            <p className="text-foreground/90 font-medium mt-1 leading-snug">{toastMessage.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-foreground hover:bg-background/40 font-bold text-lg px-2 py-0.5 rounded-lg"
            aria-label={t("close", "Close")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b-2 border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-md border-2 ${
              hasHazards
                ? "bg-amber-500/25 text-amber-500 border-amber-500 animate-pulse"
                : "bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50"
            }`}
          >
            {hasHazards ? "⚠️" : "🛡️"}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                {tLocal("title", "Severe Weather Watcher & Alerts")}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-bold border-2 shadow-sm ${
                  hasHazards
                    ? "bg-destructive text-destructive-foreground border-destructive/50"
                    : "bg-emerald-600 text-white border-emerald-600/50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasHazards ? "bg-white animate-ping" : "bg-white"
                  }`}
                />
                {hasHazards
                  ? `${detectedHazards.length} ${tLocal("shield_hazards_found", "Hazards Detected")}`
                  : tLocal("shield_all_clear", "All Clear")}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground/80 mt-1">
              {tLocal("monitoring_city", "Monitoring")}:{" "}
              <span className="font-black text-foreground">{cityName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all shadow-xs ${
              config.soundEnabled
                ? "bg-primary/20 border-primary text-primary hover:bg-primary/30"
                : "bg-muted border-border text-foreground/70 hover:bg-muted/80"
            }`}
            title={config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}
            aria-label={config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}
          >
            <span className="text-base">{config.soundEnabled ? "🔊" : "🔇"}</span>
            <span>{config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}</span>
          </button>

          {/* Web Push Permission Toggle */}
          {notificationPermission !== "granted" ? (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-amber-950 border-2 border-amber-600 hover:bg-amber-400 transition-all shadow-xs"
              aria-label={tLocal("notify_permission_cta", "Enable Notifications")}
            >
              <span className="text-base">🔔</span>
              <span>{tLocal("notify_permission_cta", "Enable Notifications")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateConfig({ notificationsEnabled: !config.notificationsEnabled })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all shadow-xs ${
                config.notificationsEnabled
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-muted border-border text-foreground/70"
              }`}
              aria-label={tLocal("notify_enabled", "Active")}
            >
              <span className="text-base">🔔</span>
              <span>{tLocal("notify_enabled", "Active")}</span>
            </button>
          )}

          {/* Test Chime & Alert Button */}
          <button
            type="button"
            onClick={handleTestAlert}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-card hover:bg-muted border-2 border-border text-foreground transition-all shadow-xs"
            title={tLocal("test_btn", "Test Alert & Chime")}
            aria-label={tLocal("test_btn", "Test Alert & Chime")}
          >
            <span className="text-base">▶️</span>
            <span>{tLocal("test_btn", "Test Alert")}</span>
          </button>

          {/* Settings Cog */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="inline-flex items-center justify-center p-2 rounded-xl text-sm font-bold bg-card hover:bg-muted border-2 border-border text-foreground transition-all shadow-xs"
            title={tLocal("settings_btn", "Alert Settings")}
            aria-label={tLocal("settings_btn", "Alert Settings")}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Active Hazards Cards */}
      <div className="mt-4 space-y-3">
        {hasHazards ? (
          detectedHazards.map((hazard) => {
            const title = tLocal(hazard.titleKey, hazard.titleKey);
            const desc = tLocal(hazard.descKey, hazard.descKey);
            const advice = tLocal(hazard.adviceKey, hazard.adviceKey);

            return (
              <div
                key={hazard.id}
                className={`relative rounded-2xl border-2 p-4 sm:p-5 shadow-md transition-all ${
                  hazard.severity === "danger"
                    ? "bg-destructive/15 dark:bg-destructive/25 border-destructive text-foreground"
                    : "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500 text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl sm:text-4xl shrink-0 mt-0.5">{hazard.icon}</span>
                    <div>
                      <h4 className="text-base sm:text-lg font-black leading-tight text-foreground">
                        {title}
                      </h4>
                      <p className="text-sm sm:text-base font-semibold text-foreground/90 mt-1 leading-snug">
                        {desc}
                      </p>
                    </div>
                  </div>
                  {hazard.metricValue && (
                    <span className="shrink-0 rounded-xl bg-background px-3 py-1 text-xs sm:text-sm font-black text-foreground border-2 border-border shadow-xs">
                      {hazard.metricValue}
                    </span>
                  )}
                </div>

                {/* High Contrast Advice Callout */}
                <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-background/95 dark:bg-background/90 p-3.5 sm:p-4 text-sm sm:text-base font-semibold text-foreground border-2 border-border shadow-xs">
                  <span className="text-xl sm:text-2xl shrink-0 text-amber-500">💡</span>
                  <p className="flex-1 leading-relaxed text-foreground font-medium">{advice}</p>
                </div>
              </div>
            );
          })
        ) : (
          /* High-Contrast "All Clear" State */
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-2xl border-2 border-emerald-600/50 bg-emerald-500/15 dark:bg-emerald-950/40 p-4 sm:p-5 shadow-xs text-foreground">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl shadow-md">
              ✓
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100">
                {tLocal("shield_all_clear", "All Clear — Conditions are safe")}
              </h4>
              <p className="text-sm sm:text-base font-semibold text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed mt-1">
                {tLocal(
                  "subtitle",
                  "Real-time monitoring for sudden storms, gale winds, heatwaves & hazardous air"
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel Drawer */}
      {settingsOpen && (
        <div className="mt-4 rounded-2xl border-2 border-border bg-card p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b-2 border-border/50 pb-3 mb-3.5">
            <h4 className="text-base sm:text-lg font-black text-foreground">
              {tLocal("settings_title", "Severe Weather Notification Preferences")}
            </h4>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs sm:text-sm font-bold text-foreground px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border"
              aria-label={t("done", "Done")}
            >
              {tLocal("close", "Done")}
            </button>
          </div>

          <div className="space-y-3.5 text-sm">
            {/* Audio Chime toggle */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-background cursor-pointer transition-colors">
              <div>
                <p className="font-bold text-foreground text-sm sm:text-base">
                  {tLocal("settings_sound_label", "Play Synthesized Audio Chime")}
                </p>
                <p className="text-foreground/75 font-medium text-xs sm:text-sm mt-0.5">
                  {tLocal(
                    "settings_sound_sub",
                    "Gentle two-tone chime when hazardous weather breaches safety thresholds"
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => updateConfig({ soundEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </label>

            {/* Web Push toggle */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-background cursor-pointer transition-colors">
              <div>
                <p className="font-bold text-foreground text-sm sm:text-base">
                  {tLocal("settings_push_label", "Browser & Mobile Push Notifications")}
                </p>
                <p className="text-foreground/75 font-medium text-xs sm:text-sm mt-0.5">
                  {tLocal(
                    "settings_push_sub",
                    "Receive instant alert banners even when viewing other tabs"
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificationsEnabled}
                onChange={(e) => updateConfig({ notificationsEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </label>

            {/* Individual Hazard Toggles */}
            <div className="border-t-2 border-border/50 pt-3.5">
              <p className="font-black text-foreground text-sm sm:text-base mb-2.5">
                {tLocal("settings_types_title", "Monitored Hazard Types")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    key: "notifyThunderstorm",
                    labelKey: "settings_storm_label",
                    defaultLabel: "Thunderstorms & Lightning",
                    icon: "⚡",
                  },
                  {
                    key: "notifyWind",
                    labelKey: "settings_wind_label",
                    defaultLabel: "Gale Winds (> 45 km/h)",
                    icon: "💨",
                  },
                  {
                    key: "notifyHeat",
                    labelKey: "settings_heat_label",
                    defaultLabel: "Extreme Heatwaves (> 38°C)",
                    icon: "🌡️",
                  },
                  {
                    key: "notifyCold",
                    labelKey: "settings_cold_label",
                    defaultLabel: "Freezing Cold (≤ 0°C)",
                    icon: "❄️",
                  },
                  {
                    key: "notifyRain",
                    labelKey: "settings_rain_label",
                    defaultLabel: "Torrential Rain & Floods",
                    icon: "🌧️",
                  },
                  {
                    key: "notifyAir",
                    labelKey: "settings_air_label",
                    defaultLabel: "Hazardous PM2.5 (AQI > 150)",
                    icon: "😷",
                  },
                ].map(({ key, labelKey, defaultLabel, icon }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-2.5 rounded-xl bg-background/80 p-3 border-2 border-border/70 cursor-pointer hover:bg-background transition-colors"
                  >
                    <span className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                      <span className="text-base">{icon}</span>
                      <span>{tLocal(labelKey, defaultLabel)}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(config[key as keyof AlertWatcherConfig])}
                      onChange={(e) => updateConfig({ [key]: e.target.checked })}
                      className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
