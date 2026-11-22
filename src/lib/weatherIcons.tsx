// src/lib/weatherIcons.tsx
import React from "react";

export interface WeatherIconProps {
  code: number;
  isDay?: number | boolean | undefined;
  className?: string;
  size?: number;
}

/**
 * Visual verification of the actual artwork in /public/icons/watercolor/:
 * - 04d_overcast.png          -> Bright smiling yellow watercolor sun (Clear Sky Day)
 * - 03d_scattered.png         -> Golden crescent moon with twinkling stars (Clear Sky Night)
 * - 09d_shower_rain.png       -> Fluffy white cumulus clouds (Partly Cloudy Day)
 * - 10n_rain_night.png        -> Fluffy white clouds with crescent moon (Partly Cloudy Night)
 * - 02d_few_clouds.png        -> Dense dark gray overcast watercolor cloud (Overcast Day)
 * - 09n_shower_night.png      -> Dark overcast clouds with crescent moon (Overcast Night)
 * - 04d_broken.png            -> Wavy horizontal mist / fog bands (Fog / Mist Day)
 * - 50d_wind.png              -> Moon drifting behind mist layers (Fog / Mist Night)
 * - 01d_clear_sky.png         -> Fluffy cloud with gentle raindrops (Drizzle / Light Rain Day)
 * - 04n_broken_night.png      -> Night cloud with raindrops and crescent moon (Drizzle Night)
 * - 10d_heavy_rain.png        -> Dark cloud pouring heavy blue rain (Heavy Rain Day)
 * - 13d_snow.png              -> Dark cloud with steady rainfall (Moderate Rain / Showers Day)
 * - 03n_scattered_night.png   -> Dark rain cloud with rain and crescent moon (Rain Night)
 * - 01n_clear_night.png       -> Crystalline blue watercolor snowflake (Snow Day)
 * - 13n_snow_night.png        -> Snowflake beside crescent moon (Snow Night)
 * - 10d_light_rain.png        -> Dark storm cloud with bright yellow lightning bolt (Thunderstorm Day)
 * - 02n_few_clouds_night.png  -> Night storm cloud with lightning, rain, and moon (Thunderstorm Night)
 * - 11n_thunderstorm_night.png-> Breezy wind swirls blowing a cloud (Windy)
 * - 50d_tornado.png           -> Swirling tornado funnel (Tornado)
 * - 50d_haze_ratchaburi.png   -> Sun obscured by smog / atmospheric haze (Haze / PM2.5)
 */

const WMO_TO_ICON_FILE: Record<number, { day: string; night: string }> = {
  // 0: Clear sky
  0: { day: "04d_overcast.png", night: "03d_scattered.png" },
  // 1: Mainly clear
  1: { day: "04d_overcast.png", night: "03d_scattered.png" },
  // 2: Partly cloudy
  2: { day: "09d_shower_rain.png", night: "10n_rain_night.png" },
  // 3: Overcast (Proper dark cloud, NOT the sunny illustration)
  3: { day: "02d_few_clouds.png", night: "09n_shower_night.png" },

  // 45, 48: Fog & depositing rime fog
  45: { day: "04d_broken.png", night: "50d_wind.png" },
  48: { day: "04d_broken.png", night: "50d_wind.png" },

  // 51, 53, 55: Drizzle (light, moderate, dense)
  51: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },
  53: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },
  55: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },

  // 56, 57: Freezing drizzle
  56: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },
  57: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },

  // 61, 63: Rain (slight, moderate)
  61: { day: "01d_clear_sky.png", night: "04n_broken_night.png" },
  63: { day: "13d_snow.png", night: "03n_scattered_night.png" },
  // 65: Rain (heavy)
  65: { day: "10d_heavy_rain.png", night: "03n_scattered_night.png" },

  // 66, 67: Freezing rain
  66: { day: "13d_snow.png", night: "03n_scattered_night.png" },
  67: { day: "10d_heavy_rain.png", night: "03n_scattered_night.png" },

  // 71, 73, 75, 77: Snow fall
  71: { day: "01n_clear_night.png", night: "13n_snow_night.png" },
  73: { day: "01n_clear_night.png", night: "13n_snow_night.png" },
  75: { day: "01n_clear_night.png", night: "13n_snow_night.png" },
  77: { day: "01n_clear_night.png", night: "13n_snow_night.png" },

  // 80, 81: Rain showers (slight, moderate)
  80: { day: "13d_snow.png", night: "03n_scattered_night.png" },
  81: { day: "13d_snow.png", night: "03n_scattered_night.png" },
  // 82: Violent rain showers
  82: { day: "10d_heavy_rain.png", night: "03n_scattered_night.png" },

  // 85, 86: Snow showers
  85: { day: "01n_clear_night.png", night: "13n_snow_night.png" },
  86: { day: "01n_clear_night.png", night: "13n_snow_night.png" },

  // 95, 96, 99: Thunderstorms (slight, moderate, severe with hail)
  95: { day: "10d_light_rain.png", night: "02n_few_clouds_night.png" },
  96: { day: "10d_light_rain.png", night: "02n_few_clouds_night.png" },
  99: { day: "10d_light_rain.png", night: "02n_few_clouds_night.png" },
};

const DEFAULT_FALLBACK_ICON = "04d_overcast.png"; // Smiling sun fallback

export function getWmoIconPath(wmoCode: number, isDay: number | boolean = 1): string {
  const day = typeof isDay === "boolean" ? isDay : isDay === 1;
  const match = WMO_TO_ICON_FILE[wmoCode] || {
    day: "04d_overcast.png",
    night: "03d_scattered.png",
  };
  const fileName = day ? match.day : match.night;
  return `/icons/watercolor/${fileName}`;
}

export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase().trim();
  const desc = (description || "").toLowerCase();
  const isNight = code.endsWith("n");

  if (desc.includes("thunder") || desc.includes("storm")) {
    return `/icons/watercolor/${isNight ? "02n_few_clouds_night.png" : "10d_light_rain.png"}`;
  }
  if (desc.includes("snow") || desc.includes("sleet") || desc.includes("ice") || desc.includes("blizzard")) {
    return `/icons/watercolor/${isNight ? "13n_snow_night.png" : "01n_clear_night.png"}`;
  }
  if (desc.includes("heavy rain") || desc.includes("downpour") || desc.includes("violent")) {
    return `/icons/watercolor/${isNight ? "03n_scattered_night.png" : "10d_heavy_rain.png"}`;
  }
  if (desc.includes("rain") || desc.includes("drizzle") || desc.includes("shower")) {
    return `/icons/watercolor/${isNight ? "04n_broken_night.png" : "01d_clear_sky.png"}`;
  }
  if (desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) {
    return `/icons/watercolor/${isNight ? "50d_wind.png" : "04d_broken.png"}`;
  }
  if (desc.includes("overcast")) {
    return `/icons/watercolor/${isNight ? "09n_shower_night.png" : "02d_few_clouds.png"}`;
  }
  if (desc.includes("cloud") || desc.includes("partly")) {
    return `/icons/watercolor/${isNight ? "10n_rain_night.png" : "09d_shower_rain.png"}`;
  }

  // Fallbacks by OpenWeather code pattern
  if (code.startsWith("11")) return `/icons/watercolor/${isNight ? "02n_few_clouds_night.png" : "10d_light_rain.png"}`;
  if (code.startsWith("13")) return `/icons/watercolor/${isNight ? "13n_snow_night.png" : "01n_clear_night.png"}`;
  if (code.startsWith("10")) return `/icons/watercolor/${isNight ? "03n_scattered_night.png" : "10d_heavy_rain.png"}`;
  if (code.startsWith("09")) return `/icons/watercolor/${isNight ? "04n_broken_night.png" : "01d_clear_sky.png"}`;
  if (code.startsWith("50")) return `/icons/watercolor/${isNight ? "50d_wind.png" : "04d_broken.png"}`;
  if (code.startsWith("04")) return `/icons/watercolor/${isNight ? "09n_shower_night.png" : "02d_few_clouds.png"}`;
  if (code.startsWith("02") || code.startsWith("03")) return `/icons/watercolor/${isNight ? "10n_rain_night.png" : "09d_shower_rain.png"}`;

  return `/icons/watercolor/${isNight ? "03d_scattered.png" : "04d_overcast.png"}`;
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

export default WeatherIcon;
