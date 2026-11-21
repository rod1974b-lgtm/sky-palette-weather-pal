// src/lib/weatherIcons.tsx
// FIXED — v2
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// The watercolorIcons mapping was SHUFFLED. The comments described the RIGHT weather,
// but the file paths pointed to the WRONG pictures. Examples from your real file:
//   01d Clear sky      -> 04d_overcast.png (showed overcast for clear sky)
//   02d Mostly clear  -> 11d_thunderstorm.png (showed thunderstorm for mostly clear)
//   09d Shower rain   -> 13d_snow.png (showed snow for rain)
//   10d Steady rain   -> 13d_snow.png (showed snow for rain)
//   10d_light Light rain -> 01d_clear_sky.png (showed clear sky for rain)
//   11d Thunderstorm  -> 10d_light_rain.png (showed light rain for thunderstorm)
//   13d Snow          -> 01n_clear_night.png (showed clear night for snow)
//   01n Clear night   -> 03d_scattered.png (showed day cloud for clear night)
//   10n Night rain    -> 03n_scattered_night.png (showed scattered for rain)
//   50d_fog Fog       -> 50d_dust.png (showed dust for fog)
//   50d_wind Wind     -> 11n_thunderstorm_night.png (showed night storm for wind)
//   50n Night fog     -> 50d_wind.png (showed wind for fog)
// WeatherView calls <WeatherIcon code={w.current.code} isDay={...} /> where code is a
// WMO number, so EVERY weather screen showed the wrong picture. Clear days looked
// cloudy, rainy days looked snowy, snowy days looked clear.
// FIX: Mapping now points each code to the file whose NAME matches it. Only files
// already referenced in your real file are used — no new file names invented.
// Where no exact file exists, the closest existing file is used and marked below:
//   - No 09d / 10d day shower file exists -> 10d_light_rain.png (closest day rain)
//   - No 50d_fog.png file exists -> 50d_mist.png (mist is closest to fog)
//   - No night fog/mist files exist -> 50d_mist.png (same picture, day file)
//   - No 10n_heavy night file exists -> 10n_rain_night.png (same night rain file)
// If you add real 09d.png / 50d_fog.png / 50n_fog.png files later, point those keys
// to them. Until then, the mappings below are the best correct ones with files you have.
// OTHER FIXES:
// 2. getWeatherIcon() hardcoded fallbacks were also wrong: drizzle fell back to
//    clear sky, fog fell back to dust, wind fell back to night thunderstorm, mist
//    fell back to broken clouds. FIX: Fallbacks now match the corrected mapping.
// 3. Day/night fallback used code.replace("n","d") / replace("d","n") which replaces
//    the FIRST n/d anywhere, not the day/night marker. For codes like "50n_mist" it
//    happened to work, but it is fragile. FIX: New toDayCode()/toNightCode() helpers
//    that only change the day/night marker (prefix before "_" or final letter).
// 4. fallbackIcons was missing 50d_smoke, 50n_mist, 10n_heavy. FIX: Added them so
//    emoji fallback never falls through to generic "⛅" for those codes.
// 5. wmoToIconCode() already covers all valid Open-Meteo WMO codes (0,1,2,3,45,48,
//    51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99). Default
//    clear is only for invalid codes, which never occur. Kept as-is, with a comment.
// KEPT AS-IS: WeatherIcon component props + behaviour, img onError -> emoji fallback,
// lazy loading, getWeatherIconWithFallback() shape { url, fallback }, all exports.
import { useState } from "react";

/**
 * Corrected mapping: each code -> the file whose NAME matches it.
 * Only files already in your repo (referenced in the old file) are used.
 * Comments marked [CLOSEST] mean no exact file exists, so the closest picture is used.
 */
export const watercolorIcons: Record<string, string> = {
  // Day — clear / clouds
  "01d": "/icons/watercolor/01d_clear_sky.png",
  "02d": "/icons/watercolor/02d_few_clouds.png",
  "03d": "/icons/watercolor/03d_scattered.png",
  "04d_broken": "/icons/watercolor/04d_broken.png",
  "04d": "/icons/watercolor/04d_overcast.png",
  // Day — rain / drizzle / shower
  // [CLOSEST] No 09d drizzle/shower day file exists — light rain is the closest day rain picture.
  "09d_drizzle": "/icons/watercolor/10d_light_rain.png",
  "09d": "/icons/watercolor/10d_light_rain.png",
  "10d_light": "/icons/watercolor/10d_light_rain.png",
  // [CLOSEST] No 10d moderate file exists — light rain is the closest day rain picture.
  "10d": "/icons/watercolor/10d_light_rain.png",
  "10d_heavy": "/icons/watercolor/10d_heavy_rain.png",
  "11d": "/icons/watercolor/11d_thunderstorm.png",
  "13d": "/icons/watercolor/13d_snow.png",

  // Night — clear / clouds
  "01n": "/icons/watercolor/01n_clear_night.png",
  "02n": "/icons/watercolor/02n_few_clouds_night.png",
  "03n": "/icons/watercolor/03n_scattered_night.png",
  "04n_broken": "/icons/watercolor/04n_broken_night.png",
  "04n": "/icons/watercolor/04n_overcast_night.png",
  // Night — rain / drizzle / shower
  // [CLOSEST] No 09n drizzle night file exists — shower night is the closest night rain picture.
  "09n_drizzle": "/icons/watercolor/09n_shower_night.png",
  "09n": "/icons/watercolor/09n_shower_night.png",
  "10n": "/icons/watercolor/10n_rain_night.png",
  // [CLOSEST] No 10n_heavy night file exists — same night rain picture.
  "10n_heavy": "/icons/watercolor/10n_rain_night.png",
  "11n": "/icons/watercolor/11n_thunderstorm_night.png",
  "13n": "/icons/watercolor/13n_snow_night.png",

  // Atmosphere & Conditions
  "50d": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_mist": "/icons/watercolor/50d_mist.png",
  // [CLOSEST] No 50d_fog.png file exists — mist is the closest picture (both white haze).
  "50d_fog": "/icons/watercolor/50d_mist.png",
  "50d_haze": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_dust": "/icons/watercolor/50d_dust.png",
  "50d_smoke": "/icons/watercolor/50d_haze_ratchaburi.png",
  "50d_tornado": "/icons/watercolor/50d_tornado.png",
  "50d_wind": "/icons/watercolor/50d_wind.png",
  // [CLOSEST] No 50n night mist/fog files exist — day mist picture is the closest.
  "50n": "/icons/watercolor/50d_mist.png",
  "50n_mist": "/icons/watercolor/50d_mist.png",
  "50n_fog": "/icons/watercolor/50d_mist.png",
};

export const fallbackIcons: Record<string, string> = {
  "01d": "☀",
  "01n": "🌙",
  "02d": "🌤",
  "02n": "🌙☁",
  "03d": "⛅",
  "03n": "🌙☁",
  "04d": "☁",
  "04d_broken": "🌥",
  "04n": "☁",
  "04n_broken": "🌙☁",
  "09d": "🌧",
  "09d_drizzle": "🌦",
  "09n": "🌧",
  "09n_drizzle": "🌧",
  "10d": "🌧",
  "10d_light": "🌦",
  "10d_heavy": "⛈",
  "10n": "🌧",
  // FIXED #4: was missing — added so heavy night rain never falls through to generic.
  "10n_heavy": "🌧",
  "11d": "⛈",
  "11n": "⛈",
  "13d": "❄",
  "13n": "❄",
  "50d": "🌫",
  "50d_fog": "🌁",
  "50d_mist": "🌫",
  "50d_haze": "🌫",
  "50d_dust": "🌪",
  "50d_tornado": "🌪",
  "50d_wind": "💨",
  // FIXED #4: was missing — added.
  "50d_smoke": "🌫",
  "50n": "🌫",
  "50n_fog": "🌁",
  // FIXED #4: was missing — added.
  "50n_mist": "🌫",
};

// FIXED #3: Only change the day/night marker, not the first n/d anywhere.
// "01n" -> "01d", "50n_mist" -> "50d_mist", "04d_broken" -> "04n_broken".
function toDayCode(code: string): string {
  if (code.includes("_")) {
    const [prefix, ...rest] = code.split("_");
    const dayPrefix = prefix.replace(/n$/, "d");
    return [dayPrefix, ...rest].join("_");
  }
  return code.replace(/n$/, "d");
}

function toNightCode(code: string): string {
  if (code.includes("_")) {
    const [prefix, ...rest] = code.split("_");
    const nightPrefix = prefix.replace(/d$/, "n");
    return [nightPrefix, ...rest].join("_");
  }
  return code.replace(/d$/, "n");
}

export function getWeatherIcon(iconCode: string, description?: string): string {
  const code = (iconCode || "01d").toLowerCase();
  const desc = (description || "").toLowerCase();

  if (code.startsWith("10") && (desc.includes("heavy") || desc.includes("torrential") || desc.includes("downpour"))) {
    return watercolorIcons["10d_heavy"] ?? "/icons/watercolor/10d_heavy_rain.png";
  }

  if ((code.startsWith("09") || code.startsWith("10")) && desc.includes("drizzle")) {
    // FIXED #2: drizzle fallback was clear sky (wrong). Now light rain / shower night.
    const fallback = code.endsWith("n") ? watercolorIcons["09n_drizzle"] : watercolorIcons["09d_drizzle"];
    return fallback ?? watercolorIcons["09d_drizzle"] ?? "/icons/watercolor/10d_light_rain.png";
  }

  if (code.startsWith("50") || desc.includes("haze") || desc.includes("fog") || desc.includes("mist")) {
    // FIXED #2: mist fell back to broken clouds, fog fell back to dust, wind fell back to
    // night thunderstorm — all wrong. Now mist/fog -> mist, dust -> dust, wind -> wind.
    if (desc.includes("mist")) return (code.endsWith("n") ? watercolorIcons["50n_mist"] : watercolorIcons["50d_mist"]) ?? "/icons/watercolor/50d_mist.png";
    if (desc.includes("fog")) return (code.endsWith("n") ? watercolorIcons["50n_fog"] : watercolorIcons["50d_fog"]) ?? "/icons/watercolor/50d_mist.png";
    if (desc.includes("haze") || desc.includes("smog") || desc.includes("pm2.5")) return watercolorIcons["50d_haze"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
    if (desc.includes("dust") || desc.includes("sand")) return watercolorIcons["50d_dust"] ?? "/icons/watercolor/50d_dust.png";
    if (desc.includes("smoke")) return watercolorIcons["50d_smoke"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
    if (desc.includes("tornado")) return watercolorIcons["50d_tornado"] ?? "/icons/watercolor/50d_tornado.png";
    if (desc.includes("wind")) return watercolorIcons["50d_wind"] ?? "/icons/watercolor/50d_wind.png";
    return watercolorIcons["50d"] ?? "/icons/watercolor/50d_haze_ratchaburi.png";
  }

  const direct = watercolorIcons[code];
  if (direct) return direct;

  // FIXED #3: was code.replace("n","d") / replace("d","n") — first n/d anywhere. Now marker-only.
  const dayCode = toDayCode(code);
  const nightCode = toNightCode(code);
  return (
    watercolorIcons[dayCode] ??
    watercolorIcons[nightCode] ??
    watercolorIcons["01d"] ??
    "/icons/watercolor/01d_clear_sky.png"
  );
}

export function getWeatherIconWithFallback(iconCode: string, description?: string) {
  const url = getWeatherIcon(iconCode, description);
  const prefix = (iconCode || "").split("_")[0] || "01d";
  const fallback =
    fallbackIcons[iconCode] ||
    // FIXED #3: was iconCode.replace("n","d") — first n anywhere. Now marker-only.
    fallbackIcons[toDayCode(iconCode)] ||
    fallbackIcons[toNightCode(iconCode)] ||
    fallbackIcons[prefix] ||
    "⛅";
  return { url, fallback };
}

export function wmoToIconCode(
  wmoCode: number,
  isDay: number = 1
): { iconCode: string; desc: string } {
  const isNight = isDay === 0;

  switch (wmoCode) {
    case 0:
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear sky" };
    case 1:
      return { iconCode: isNight ? "02n" : "02d", desc: isNight ? "Mostly clear" : "Mainly clear" };
    case 2:
      return { iconCode: isNight ? "03n" : "03d", desc: "Partly cloudy" };
    case 3:
      return { iconCode: isNight ? "04n" : "04d", desc: "Overcast" };
    case 45:
      return { iconCode: isNight ? "50n_fog" : "50d_fog", desc: "Fog" };
    case 48:
      return { iconCode: isNight ? "50n_mist" : "50d_mist", desc: "Depositing rime fog" };
    case 51:
    case 53:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Drizzle" };
    case 55:
      return { iconCode: isNight ? "09n" : "09d", desc: "Dense drizzle" };
    case 56:
    case 57:
      return { iconCode: isNight ? "09n_drizzle" : "09d_drizzle", desc: "Freezing drizzle" };
    case 61:
      return { iconCode: isNight ? "10n" : "10d_light", desc: "Light rain" };
    case 63:
      return { iconCode: isNight ? "10n" : "10d", desc: "Moderate rain" };
    case 65:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Heavy rain" };
    case 66:
    case 67:
      return { iconCode: isNight ? "10n" : "10d_heavy", desc: "Freezing rain" };
    case 71:
    case 73:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow fall" };
    case 75:
    case 77:
      return { iconCode: isNight ? "13n" : "13d", desc: "Heavy snowfall" };
    case 80:
      return { iconCode: isNight ? "09n" : "09d", desc: "Rain showers" };
    case 81:
    case 82:
      return { iconCode: isNight ? "09n" : "10d_heavy", desc: "Heavy rain showers" };
    case 85:
    case 86:
      return { iconCode: isNight ? "13n" : "13d", desc: "Snow showers" };
    case 95:
      return { iconCode: isNight ? "11n" : "11d", desc: "Thunderstorm" };
    case 96:
    case 99:
      return { iconCode: isNight ? "11n" : "11d", desc: "Severe thunderstorm" };
    default:
      // Only for invalid codes — all valid Open-Meteo codes are covered above.
      return { iconCode: isNight ? "01n" : "01d", desc: isNight ? "Clear night" : "Clear" };
  }
}

export interface WeatherIconProps {
  code?: number | string;
  iconCode?: string;
  wmoCode?: number;
  isDay?: number | undefined;
  description?: string;
  className?: string;
  fallbackEmoji?: string;
}

export function WeatherIcon({
  code,
  iconCode,
  wmoCode,
  isDay = 1,
  description,
  className = "w-8 h-8",
  fallbackEmoji,
}: WeatherIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Accept code as number (WMO code) or string (iconCode)
  const effectiveWmo = wmoCode !== undefined ? wmoCode : (typeof code === "number" ? code : undefined);
  let resolvedCode = typeof code === "string" ? code : iconCode;
  let resolvedDesc = description;

  if (effectiveWmo !== undefined) {
    const mapped = wmoToIconCode(effectiveWmo, isDay);
    resolvedCode = mapped.iconCode;
    resolvedDesc = resolvedDesc || mapped.desc;
  }

  const { url, fallback } = getWeatherIconWithFallback(resolvedCode || "01d", resolvedDesc);
  const emoji = fallbackEmoji || fallback;

  if (imgFailed || !url) {
    return (
      <span className={`inline-flex items-center justify-center select-none text-2xl ${className}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={resolvedDesc || "weather icon"}
      className={`inline-block object-contain transition-opacity duration-200 select-none ${className}`}
      loading="lazy"
      onError={() => setImgFailed(true)}
    />
  );
}

export default WeatherIcon;
