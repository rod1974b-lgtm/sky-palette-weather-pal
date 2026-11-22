// src/lib/weatherIcons.tsx
import React from "react";

export interface WeatherIconProps {
  code: number;
  isDay?: number | boolean;
  className?: string;
  size?: number;
}

const WMO_TO_ICON: Record<number, { day: string; night: string }> = {
  0: { day: "01d", night: "01n" },
  1: { day: "01d", night: "01n" },
  2: { day: "02d", night: "02n" },
  3: { day: "04d", night: "04n" },
  45: { day: "50d", night: "50n" },
  48: { day: "50d", night: "50n" },
  51: { day: "10d", night: "10n" },
  53: { day: "10d", night: "10n" },
  55: { day: "10d", night: "10n" },
  56: { day: "13d", night: "13n" },
  57: { day: "13d", night: "13n" },
  61: { day: "10d", night: "10n" },
  63: { day: "10d", night: "10n" },
  65: { day: "10d", night: "10n" },
  66: { day: "13d", night: "13n" },
  67: { day: "13d", night: "13n" },
  71: { day: "13d", night: "13n" },
  73: { day: "13d", night: "13n" },
  75: { day: "13d", night: "13n" },
  77: { day: "13d", night: "13n" },
  80: { day: "09d", night: "09n" },
  81: { day: "09d", night: "09n" },
  82: { day: "09d", night: "09n" },
  85: { day: "13d", night: "13n" },
  86: { day: "13d", night: "13n" },
  95: { day: "11d", night: "11n" },
  96: { day: "11d", night: "11n" },
  99: { day: "11d", night: "11n" },
};

const AVAILABLE_WATERCOLOR_ICONS = new Set([
  "01d", "01n",
  "02d", "02n",
  "03d", "03n",
  "04d", "04n",
  "09d", "09n",
  "10d", "10n",
  "11d", "11n",
  "13d", "13n",
  "50d", "50n",
  "02d_few", "02n_few",
  "03d_scattered", "03n_scattered",
  "04d_broken", "04n_broken",
  "09d_shower", "09n_shower",
  "10d_rain", "10n_rain",
  "11d_thunderstorm", "11n_thunderstorm",
  "13d_snow", "13n_snow",
  "50d_mist", "50n_mist",
]);

function toDayCode(code: string): string {
  if (code.includes("_")) {
    const parts = code.split("_");
    const prefix = parts[0] ?? "";
    const dayPrefix = prefix.replace(/n$/, "d");
    return [dayPrefix, ...parts.slice(1)].join("_");
  }
  return code.replace(/n$/, "d");
}

function toNightCode(code: string): string {
  if (code.includes("_")) {
    const parts = code.split("_");
    const prefix = parts[0] ?? "";
    const nightPrefix = prefix.replace(/d$/, "n");
    return [nightPrefix, ...parts.slice(1)].join("_");
  }
  return code.replace(/d$/, "n");
}

export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase();
  const desc = (description || "").toLowerCase();

  if (AVAILABLE_WATERCOLOR_ICONS.has(code)) {
    return `/icons/watercolor/${code}.png`;
  }

  const baseCode = code.replace(/([0-9]{2}[dn]).*/, "$1");
  if (AVAILABLE_WATERCOLOR_ICONS.has(baseCode)) {
    return `/icons/watercolor/${baseCode}.png`;
  }

  const isNight = code.endsWith("n");
  if (desc.includes("thunder") || desc.includes("storm")) {
    return `/icons/watercolor/${isNight ? "11n" : "11d"}.png`;
  }
  if (desc.includes("snow") || desc.includes("sleet") || desc.includes("hail") || desc.includes("ice")) {
    return `/icons/watercolor/${isNight ? "13n" : "13d"}.png`;
  }
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) {
    return `/icons/watercolor/${isNight ? "10n" : "10d"}.png`;
  }
  if (desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) {
    return `/icons/watercolor/${isNight ? "50n" : "50d"}.png`;
  }
  if (desc.includes("overcast") || desc.includes("cloud")) {
    return `/icons/watercolor/${isNight ? "04n" : "04d"}.png`;
  }

  return `/icons/watercolor/${isNight ? "01n" : "01d"}.png`;
}

export function getWmoIconPath(wmoCode: number, isDay: number | boolean = 1): string {
  const day = typeof isDay === "boolean" ? isDay : isDay === 1;
  const match = WMO_TO_ICON[wmoCode] || { day: "01d", night: "01n" };
  const baseKey = day ? match.day : match.night;
  return getWeatherIcon(baseKey);
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
        if (!target.src.endsWith("/01d.png")) {
          target.src = "/icons/watercolor/01d.png";
        }
      }}
    />
  );
};
