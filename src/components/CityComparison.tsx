// src/components/CityComparison.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { type Weather, type WeatherUnit, describe } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";

export interface CityComparisonProps {
  currentWeather: Weather;
  unit: WeatherUnit;
}

export const CityComparison: React.FC<CityComparisonProps> = ({ currentWeather, unit }) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const isMetric = unit === "metric";
  const tempUnitStr = isMetric ? "°C" : "°F";
  const windUnitStr = isMetric ? "km/h" : "mph";

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 rounded-3xl bg-card border border-border/70 shadow-xs hover:bg-muted/30 transition text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🏙</span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{t("city_comparison_title", "City Comparison")}</h3>
            <p className="text-xs text-muted-foreground">{t("city_comparison_desc", "Compare current city to global hubs")}</p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="mt-3 p-4 rounded-3xl bg-card border border-border/70 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/40">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{t("current_city", "Current City")}</span>
              <h4 className="text-base font-black text-foreground">{currentWeather.place.name}</h4>
              <p className="text-xs text-muted-foreground">
                {describe(currentWeather.current.code, (k, fb) => t(k, fb)).label} • {Math.round(currentWeather.current.wind_speed)} {windUnitStr}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WeatherIcon
                code={currentWeather.current.code}
                isDay={currentWeather.current.is_day ?? 1}
                className="w-10 h-10 drop-shadow-xs"
              />
              <span className="text-2xl font-black text-foreground">
                {Math.round(currentWeather.current.temp)}{tempUnitStr}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
