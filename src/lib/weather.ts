// src/lib/weather.ts
export type Place = { name: string; country?: string; lat: number; lon: number };

export type WeatherUnit = "metric" | "imperial";

export type Weather = {
  place: Place;
  fetchedAt: number;
  unit: WeatherUnit;
  current: {
    temp: number;
    code: number;
    wind: number;
    wind_speed: number;
    wind_dir?: number;
    feels: number;
    humidity: number;
    uv: number;
    uvIndex: number;
    precipitation: number;
    pressure: number;
    vis: number; // visibility in km
    aqi?: number | undefined;       // US AQI (0-500)
    pm25?: number | undefined;      // PM2.5 in µg/m³
    pm10?: number | undefined;      // PM10 in µg/m³
    is_day?: number;
  };
  sun: {
    sunrise: string;
    sunset: string;
  };
  hourly: {
    time: string;
    temp: number;
    code: number;
    precipProb: number;
    pop: number;
    is_day?: number;
  }[];
  daily: {
    date: string;
    max: number;
    min: number;
    code: number;
    precipProbMax: number;
    pop: number;
    sunrise?: string;
    sunset?: string;
  }[];
};

const LEGACY_CACHE_KEY = "weather:last";
const UNIT_KEY = "weather:unit-pref";
const FAVORITES_KEY = "weather:favorites";
const CACHE_PREFIX = "weather:cache:v2:";

// Cache Time-To-Live Windows
const FRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes: serve instantly without network
const MAX_OFFLINE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours: keep available for offline

// In-flight deduplication registry
const inFlightRequests = new Map<string, Promise<Weather>>();

// In-memory geocoding search cache
const searchCache = new Map<string, { timestamp: number; results: Place[] }>();
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function loadUnitPref(): WeatherUnit {
  try {
    const saved = localStorage.getItem(UNIT_KEY);
    return saved === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveUnitPref(unit: WeatherUnit): void {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {}
}

export function loadFavorites(): Place[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((p) => p && typeof p.name === "string" && typeof p.lat === "number" && typeof p.lon === "number")
      : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: Place[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}

export function isSamePlace(a: Place, b: Place): boolean {
  return (
    (Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01) ||
    a.name === b.name
  );
}

export function isFavorite(favorites: Place[], place: Place): boolean {
  if (!Array.isArray(favorites) || !place) return false;
  return favorites.some((f) => isSamePlace(f, place));
}

function formatSunTime(iso?: string): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "--:--"
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function buildCacheKey(lat: number, lon: number, unit: WeatherUnit): string {
  return `${CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}_${unit}`;
}

function getCachedWeather(key: string): { weather: Weather; isFresh: boolean } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Weather;
    if (!parsed?.current || typeof parsed.fetchedAt !== "number") return null;

    const age = Date.now() - parsed.fetchedAt;
    if (age > MAX_OFFLINE_AGE_MS) return null;

    return {
      weather: parsed,
      isFresh: age < FRESH_TTL_MS,
    };
  } catch {
    return null;
  }
}

function setCachedWeather(key: string, weather: Weather): void {
  try {
    localStorage.setItem(key, JSON.stringify(weather));
    localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify(weather));
  } catch {}
}

/**
 * Robust fetch with exponential backoff for HTTP 429 and transient 5xx errors
 */
async function fetchWithRetry(url: string, retries = 2, delayMs = 600, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt) + Math.random() * 200));
          continue;
        }
      }
      return res;
    } catch (err: any) {
      if (err?.name === "AbortError" || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error("Network request failed after retries");
}

export async function searchCity(
  q: string,
  lang: string = "en",
  signal?: AbortSignal
): Promise<Place[]> {
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const cleanLang = ((lang || "en").split("-")[0] ?? "en").toLowerCase();
  const cacheKey = `${query}:${cleanLang}`;

  // Check in-memory search cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&format=json&language=${cleanLang}`,
    { signal }
  );

  if (!r.ok) throw new Error("Search failed");
  const j = await r.json();

  const results: Place[] = (j.results ?? []).map((x: any) => ({
    name: x.admin1 && x.admin1 !== x.name ? `${x.name}, ${x.admin1}` : x.name,
    country: x.country,
    lat: x.latitude,
    lon: x.longitude,
  }));

  // Store in search cache (clamp size to 40 entries)
  if (searchCache.size > 40) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(cacheKey, { timestamp: Date.now(), results });

  return results;
}

export async function fetchWeather(
  place: Place,
  unit: WeatherUnit = "metric",
  forceRefresh = false
): Promise<Weather> {
  const safeLat = typeof place?.lat === "number" && !isNaN(place.lat) ? place.lat : 13.7563;
  const safeLon = typeof place?.lon === "number" && !isNaN(place.lon) ? place.lon : 100.5018;

  const cacheKey = buildCacheKey(safeLat, safeLon, unit);

  // 1. Instant Cache Return if not force-refreshed and data is fresh (< 10 min)
  if (!forceRefresh) {
    const cachedEntry = getCachedWeather(cacheKey);
    if (cachedEntry && cachedEntry.isFresh) {
      return { ...cachedEntry.weather, place };
    }
  }

  // 2. In-flight promise deduplication (prevent concurrent twin calls)
  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight && !forceRefresh) {
    return existingInFlight;
  }

  const fetchPromise = (async () => {
    const tempUnit = unit === "imperial" ? "fahrenheit" : "celsius";
    const windUnit = unit === "imperial" ? "mph" : "kmh";
    const precipUnit = unit === "imperial" ? "inch" : "mm";

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index,precipitation,is_day,surface_pressure,visibility` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
      `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}` +
      `&timezone=auto&forecast_days=7`;

    // Fetch AQI, PM2.5, and PM10 simultaneously
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${safeLat}&longitude=${safeLon}&current=us_aqi,pm2_5,pm10`;

    try {
      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetchWithRetry(weatherUrl).then((r) => {
          if (!r.ok) throw new Error("Weather request failed");
          return r.json();
        }),
        fetchWithRetry(aqiUrl).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (weatherRes.status === "rejected") {
        throw new Error("Weather request failed");
      }

      const j = weatherRes.value;
      let aqi: number | undefined;
      let pm25: number | undefined;
      let pm10: number | undefined;

      if (aqiRes.status === "fulfilled" && aqiRes.value?.current) {
        const curAqi = aqiRes.value.current;
        if (typeof curAqi.us_aqi === "number" && !isNaN(curAqi.us_aqi)) {
          aqi = Math.round(curAqi.us_aqi);
        }
        if (typeof curAqi.pm2_5 === "number" && !isNaN(curAqi.pm2_5)) {
          pm25 = Math.round(curAqi.pm2_5 * 10) / 10;
        }
        if (typeof curAqi.pm10 === "number" && !isNaN(curAqi.pm10)) {
          pm10 = Math.round(curAqi.pm10 * 10) / 10;
        }
      }

      const currentHourIso = j.current?.time ? j.current.time.slice(0, 13) + ":00" : "";
      let startIdx = j.hourly?.time?.findIndex((t: string) => t >= currentHourIso) ?? 0;
      if (startIdx === -1) startIdx = 0;

      const totalHours = j.hourly?.time?.length ?? 0;
      const count = Math.min(24, Math.max(0, totalHours - startIdx));
      const hourly = [];

      for (let idx = 0; idx < count; idx++) {
        const dataIdx = startIdx + idx;
        const prob = j.hourly.precipitation_probability?.[dataIdx] ?? 0;
        hourly.push({
          time: j.hourly.time[dataIdx],
          temp: idx === 0 && j.current?.temperature_2m !== undefined ? j.current.temperature_2m : j.hourly.temperature_2m[dataIdx],
          code: idx === 0 && j.current?.weather_code !== undefined ? j.current.weather_code : j.hourly.weather_code[dataIdx],
          precipProb: prob,
          pop: prob,
          is_day: idx === 0 && j.current?.is_day !== undefined ? j.current.is_day : (j.hourly.is_day?.[dataIdx] ?? 1),
        });
      }

      const sunrise = formatSunTime(j.daily?.sunrise?.[0]);
      const sunset = formatSunTime(j.daily?.sunset?.[0]);

      const windSpeed = j.current?.wind_speed_10m ?? 0;
      const uvVal = j.current?.uv_index ?? 0;
      const visibilityKm = typeof j.current?.visibility === "number" ? j.current.visibility / 1000 : 10;
      const pressureHpa = typeof j.current?.surface_pressure === "number" ? j.current.surface_pressure : 1013;

      const w: Weather = {
        place,
        fetchedAt: Date.now(),
        unit,
        current: {
          temp: j.current?.temperature_2m ?? 0,
          feels: j.current?.apparent_temperature ?? j.current?.temperature_2m ?? 0,
          code: j.current?.weather_code ?? 0,
          wind: windSpeed,
          wind_speed: windSpeed,
          wind_dir: j.current?.wind_direction_10m ?? 0,
          humidity: j.current?.relative_humidity_2m ?? 0,
          uv: uvVal,
          uvIndex: Math.round(uvVal),
          precipitation: j.current?.precipitation ?? 0,
          pressure: pressureHpa,
          vis: visibilityKm,
          aqi,
          pm25,
          pm10,
          is_day: j.current?.is_day ?? 1,
        },
        sun: { sunrise, sunset },
        hourly,
        daily: (j.daily?.time ?? []).map((d: string, i: number) => {
          const pop = j.daily.precipitation_probability_max?.[i] ?? 0;
          return {
            date: d,
            max: j.daily.temperature_2m_max[i],
            min: j.daily.temperature_2m_min[i],
            code: j.daily.weather_code[i],
            precipProbMax: pop,
            pop,
            sunrise: j.daily.sunrise?.[i],
            sunset: j.daily.sunset?.[i],
          };
        }),
      };

      setCachedWeather(cacheKey, w);
      return w;
    } catch (err) {
      // 3. Fallback to location-specific cached forecast on network or rate-limit error
      const cached = getCachedWeather(cacheKey);
      if (cached?.weather?.current) {
        return { ...cached.weather, place };
      }

      // Legacy fallback
      try {
        const legacyRaw = localStorage.getItem(LEGACY_CACHE_KEY);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw) as Weather;
          if (parsed?.current && isSamePlace(parsed.place, place)) {
            return { ...parsed, place };
          }
        }
      } catch {}

      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export const getWeather = fetchWeather;

export function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  return { label: "Thunderstorm", icon: "⛈️" };
}

export function uvCategory(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

export function aqiCategory(aqi: number): {
  label: string;
  color: string;
  bg: string;
  level: "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
} {
  if (aqi <= 50) {
    return {
      label: "Good",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      level: "good",
    };
  }
  if (aqi <= 100) {
    return {
      label: "Moderate",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30",
      level: "moderate",
    };
  }
  if (aqi <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/30",
      level: "sensitive",
    };
  }
  if (aqi <= 200) {
    return {
      label: "Unhealthy",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/30",
      level: "unhealthy",
    };
  }
  if (aqi <= 300) {
    return {
      label: "Very Unhealthy",
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/30",
      level: "very_unhealthy",
    };
  }
  return {
    label: "Hazardous",
    color: "text-rose-900 dark:text-rose-400",
    bg: "bg-rose-950/25 border-rose-900/40",
    level: "hazardous",
  };
}

export type SkyKey =
  | "clear-day"
  | "clear-night"
  | "cloudy-day"
  | "cloudy-night"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

export function skyKey(code: number, isDay: number = 1): SkyKey {
  const night = isDay === 0;
  if (code === 0 || code === 1) return night ? "clear-night" : "clear-day";
  if (code <= 3) return night ? "cloudy-night" : "cloudy-day";
  if (code <= 48) return "fog";
  if (code <= 67 || (code >= 80 && code <= 82)) return "rain";
  if (code <= 77 || code === 85 || code === 86) return "snow";
  return "storm";
}

export function getWeatherAlert(w: Weather): { icon: string; message: string; severity: "info" | "warning" } | null {
  if (w.current.code >= 95) {
    return { icon: "⛈️", message: "Severe thunderstorm warning in this area.", severity: "warning" };
  }
  if (w.current.code >= 51 && w.current.code <= 82) {
    return { icon: "🌧️", message: "Rain currently falling. Roads may be slick.", severity: "info" };
  }
  return null;
}
