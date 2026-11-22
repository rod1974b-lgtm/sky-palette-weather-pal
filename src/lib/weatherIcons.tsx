// src/lib/weatherIcons.tsx
import React from "react";

export interface WeatherIconProps {
  code: number;
  isDay?: number | boolean | undefined;
  className?: string;
  size?: number;
}

// Maps WMO weather code to the actual watercolor PNG files in /public/icons/watercolor/
const WMO_TO_ICON_FILE: Record<number, { day: string; night: string }> = {
  // Clear Sky
  0: { day: "01d_clear_sky.png", night: "01n_clear_night.png" },
  // Mainly Clear
  1: { day: "01d_clear_sky.png", night: "01n_clear_night.png" },
  // Partly Cloudy
  2: { day: "02d_few_clouds.png", night: "02n_few_clouds_night.png" },
  // Overcast
  3: { day: "04d_overcast.png", night: "04n_overcast_night.png" },
  // Fog & Depositing Rime Fog
  45: { day: "50d_fog.png", night: "50d_mist.png" },
  48: { day: "50d_fog.png", night: "50d_mist.png" },
  // Drizzle (light, moderate, dense)
  51: { day: "09d_drizzle.png", night: "09n_shower_night.png" },
  53: { day: "09d_drizzle.png", night: "09n_shower_night.png" },
  55: { day: "09d_drizzle.png", night: "09n_shower_night.png" },
  // Freezing Drizzle
  56: { day: "09d_drizzle.png", night: "09n_shower_night.png" },
  57: { day: "09d_drizzle.png", night: "09n_shower_night.png" },
  // Rain (slight, moderate, heavy)
  61: { day: "10d_light_rain.png", night: "10n_rain_night.png" },
  63: { day: "10d_light_rain.png", night: "10n_rain_night.png" },
  65: { day: "10d_heavy_rain.png", night: "10n_rain_night.png" },
  // Freezing Rain
  66: { day: "10d_light_rain.png", night: "10n_rain_night.png" },
  67: { day: "10d_heavy_rain.png", night: "10n_rain_night.png" },
  // Snow fall
  71: { day: "13d_snow.png", night: "13n_snow_night.png" },
  73: { day: "13d_snow.png", night: "13n_snow_night.png" },
  75: { day: "13d_snow.png", night: "13n_snow_night.png" },
  77: { day: "13d_snow.png", night: "13n_snow_night.png" },
  // Rain Showers
  80: { day: "09d_shower_rain.png", night: "09n_shower_night.png" },
  81: { day: "09d_shower_rain.png", night: "09n_shower_night.png" },
  82: { day: "10d_heavy_rain.png", night: "10n_rain_night.png" },
  // Snow Showers
  85: { day: "13d_snow.png", night: "13n_snow_night.png" },
  86: { day: "13d_snow.png", night: "13n_snow_night.png" },
  // Thunderstorm
  95: { day: "11d_thunderstorm.png", night: "11n_thunderstorm_night.png" },
  96: { day: "11d_thunderstorm.png", night: "11n_thunderstorm_night.png" },
  99: { day: "11d_thunderstorm.png", night: "11n_thunderstorm_night.png" },
};

const DEFAULT_FALLBACK_ICON = "01d_clear_sky.png";

export function getWmoIconPath(wmoCode: number, isDay: number | boolean = 1): string {
  const day = typeof isDay === "boolean" ? isDay : isDay === 1;
  const match = WMO_TO_ICON_FILE[wmoCode] || {
    day: "01d_clear_sky.png",
    night: "01n_clear_night.png",
  };
  const fileName = day ? match.day : match.night;
  return `/icons/watercolor/${fileName}`;
}

export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase().trim();
  const desc = (description || "").toLowerCase();
  const isNight = code.endsWith("n");

  if (code.includes("01")) return `/icons/watercolor/${isNight ? "01n_clear_night.png" : "01d_clear_sky.png"}`;
  if (code.includes("02")) return `/icons/watercolor/${isNight ? "02n_few_clouds_night.png" : "02d_few_clouds.png"}`;
  if (code.includes("03")) return `/icons/watercolor/${isNight ? "03n_scattered_night.png" : "03d_scattered.png"}`;
  if (code.includes("04")) return `/icons/watercolor/${isNight ? "04n_overcast_night.png" : "04d_overcast.png"}`;
  if (code.includes("09")) return `/icons/watercolor/${isNight ? "09n_shower_night.png" : "09d_shower_rain.png"}`;
  if (code.includes("10")) return `/icons/watercolor/${isNight ? "10n_rain_night.png" : "10d_light_rain.png"}`;
  if (code.includes("11")) return `/icons/watercolor/${isNight ? "11n_thunderstorm_night.png" : "11d_thunderstorm.png"}`;
  if (code.includes("13")) return `/icons/watercolor/${isNight ? "13n_snow_night.png" : "13d_snow.png"}`;
  if (code.includes("50")) return `/icons/watercolor/${isNight ? "50d_mist.png" : "50d_fog.png"}`;

  if (desc.includes("thunder") || desc.includes("storm")) {
    return `/icons/watercolor/${isNight ? "11n_thunderstorm_night.png" : "11d_thunderstorm.png"}`;
  }
  if (desc.includes("snow") || desc.includes("sleet") || desc.includes("ice")) {
    return `/icons/watercolor/${isNight ? "13n_snow_night.png" : "13d_snow.png"}`;
  }
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) {
    return `/icons/watercolor/${isNight ? "10n_rain_night.png" : "10d_light_rain.png"}`;
  }
  if (desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) {
    return `/icons/watercolor/${isNight ? "50d_mist.png" : "50d_fog.png"}`;
  }
  if (desc.includes("cloud") || desc.includes("overcast")) {
    return `/icons/watercolor/${isNight ? "04n_overcast_night.png" : "04d_overcast.png"}`;
  }

  return `/icons/watercolor/${isNight ? "01n_clear_night.png" : "01d_clear_sky.png"}`;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isDay = 1,
  className = "w-8 h-8",
  size,
}) => {
  const iconPath = getWmoIconPath(code, isDay);
  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <img
      src={iconPath}
      alt="Weather condition"
      className={`inline-block object-contain pointer-events-none select-none ${className}`}
      style={sizeStyle}
      loading="lazy"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.endsWith(DEFAULT_FALLBACK_ICON)) {
          target.src = `/icons/watercolor/${DEFAULT_FALLBACK_ICON}`;
        }
      }}
    />
  );
};
