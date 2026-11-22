// src/lib/weather.ts
export type TranslateFn = (key: string, fallback: string) => string;
function tr(t: TranslateFn | undefined, key: string, fallback: string): string {
  try {
    return t ? t(key, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export type Place = {
  name: string;
  country?: string;
  admin1?: string;
  lat: number;
  lon: number;
};

export type WeatherUnit = "metric" | "imperial";

export type Weather = {
  place: Place;
  fetchedAt: number;
  unit: WeatherUnit;
  isStale?: boolean;
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
    vis: number;
    aqi?: number | undefined;
    pm25?: number | undefined;
    pm10?: number | undefined;
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

export const BANGKOK_DEFAULT: Place = {
  name: "Bangkok",
  country: "Thailand",
  lat: 13.7563,
  lon: 100.5018,
};

const LEGACY_CACHE_KEY = "weather:last";
const UNIT_KEY = "weather:unit-pref";
const LAST_PLACE_KEY = "weather:last-place";
export const FAVORITES_KEY = "weather:favorites:v1";
const CACHE_PREFIX = "weather:cache:v2:";

const FRESH_TTL_MS = 10 * 60 * 1000;
const MAX_OFFLINE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20;

const inFlightRequests = new Map<string, Promise<Weather>>();
const searchCache = new Map<string, { timestamp: number; results: Place[] }>();
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;

function isFiniteLatLon(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function isValidPlace(p: unknown): p is Place {
  if (!p || typeof p !== "object") return false;
  const place = p as Partial<Place>;
  return (
    typeof place.name === "string" &&
    place.name.trim().length > 0 &&
    isFiniteLatLon(place.lat, place.lon) &&
    (place.country === undefined || typeof place.country === "string") &&
    (place.admin1 === undefined || typeof place.admin1 === "string")
  );
}

function normalizePlace(p: Place): Place {
  const out: Place = { name: p.name.trim(), lat: p.lat, lon: p.lon };
  if (typeof p.country === "string" && p.country) out.country = p.country;
  if (typeof p.admin1 === "string" && p.admin1) out.admin1 = p.admin1;
  return out;
}

export function loadUnitPref(): WeatherUnit {
  try {
    const saved = localStorage.getItem(UNIT_KEY);
    return saved === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveUnitPref(unit: WeatherUnit): void {
  if (unit !== "metric" && unit !== "imperial") return;
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {}
}

export function loadLastPlace(): Place | null {
  try {
    const raw = localStorage.getItem(LAST_PLACE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPlace(parsed)) return null;
    return normalizePlace(parsed as Place);
  } catch {
    return null;
  }
}

export function saveLastPlace(place: Place): void {
  if (!isValidPlace(place)) return;
  try {
    localStorage.setItem(LAST_PLACE_KEY, JSON.stringify(normalizePlace(place)));
  } catch {}
}

export function loadFavorites(): Place[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPlace).map((p) => normalizePlace(p as Place));
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: Place[]): void {
  try {
    const valid = Array.isArray(favorites)
      ? favorites.filter(isValidPlace).map((p) => normalizePlace(p as Place))
      : [];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(valid));
  } catch {}
}

export function isSamePlace(a: Place | null | undefined, b: Place | null | undefined): boolean {
  if (!a || !b) return false;
  if (!isFiniteLatLon(a.lat, a.lon) || !isFiniteLatLon(b.lat, b.lon)) return false;
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
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
  const rLat = Math.round(lat * 100) / 100;
  const rLon = Math.round(lon * 100) / 100;
  const normLat = Object.is(rLat, -0) ? 0 : rLat;
  const normLon = Object.is(rLon, -0) ? 0 : rLon;
  return `${CACHE_PREFIX}${normLat.toFixed(2)}_${normLon.toFixed(2)}_${unit}`;
}

function getCachedWeather(key: string): { weather: Weather; isFresh: boolean } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const w = parsed as Partial<Weather>;
    if (!w.current || typeof w.fetchedAt !== "number") return null;
    if (typeof w.current.temp !== "number" || !Number.isFinite(w.current.temp)) return null;
    if (!Array.isArray(w.hourly) || !Array.isArray(w.daily)) return null;
    if (!isValidPlace(w.place)) return null;

    const age = Date.now() - w.fetchedAt;
    if (age > MAX_OFFLINE_AGE_MS) return null;

    return {
      weather: w as Weather,
      isFresh: age < FRESH_TTL_MS,
    };
  } catch {
    return null;
  }
}

function evictOldCacheEntries(): void {
  try {
    const keys: { key: string; fetchedAt: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        let fetchedAt = 0;
        try {
          const raw = localStorage.getItem(k);
          if (raw) fetchedAt = (JSON.parse(raw) as Partial<Weather>).fetchedAt ?? 0;
        } catch {}
        keys.push({ key: k, fetchedAt });
      }
    }
    if (keys.length <= MAX_CACHE_ENTRIES) return;
    keys.sort((a, b) => a.fetchedAt - b.fetchedAt);
    const toDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
    for (const { key } of toDelete) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  } catch {}
}

function setCachedWeather(key: string, weather: Weather): void {
  try {
    const payload = JSON.stringify(weather);
    try {
      localStorage.setItem(key, payload);
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
        evictOldCacheEntries();
        try {
          localStorage.setItem(key, payload);
        } catch {}
      }
    }
    try {
      localStorage.setItem(LEGACY_CACHE_KEY, payload);
    } catch {}
  } catch {}
}

async function fetchWithRetry(
  url: string,
  retries = 2,
  delayMs = 600,
  signal?: AbortSignal
): Promise<Response> {
  const timeoutSignal =
    !signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(15000)
      : undefined;
  const effectiveSignal = signal ?? timeoutSignal;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (effectiveSignal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      const res = await fetch(url, { signal: effectiveSignal ?? null });
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt) + Math.random() * 200));
          continue;
        }
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (err instanceof Error && (err as Error & { name?: string }).name === "AbortError") throw err;
      if (attempt === retries) throw err;
      if (effectiveSignal?.aborted) throw err;
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

  void lang;
  const apiLang = "en";
  const cacheKey = `${query}:${apiLang}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
    return cached.results.map((p) => ({ ...p }));
  }

  const r = await fetchWithRetry(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&format=json&language=${apiLang}`,
    2,
    600,
    signal
  );

  if (!r.ok) throw new Error("Search failed");
  const j: unknown = await r.json();
  const resultsRaw = (j as { results?: unknown }).results;
  const resultsList = Array.isArray(resultsRaw) ? resultsRaw : [];

  const results: Place[] = resultsList
    .map((x) => {
      const rec = x as Record<string, unknown>;
      const name = typeof rec["name"] === "string" ? rec["name"] : "";
      const lat = rec["latitude"];
      const lon = rec["longitude"];
      if (!name || !isFiniteLatLon(lat, lon)) return null;
      const place: Place = {
        name,
        lat: lat as number,
        lon: lon as number,
      };
      if (typeof rec["country"] === "string" && rec["country"]) place.country = rec["country"] as string;
      if (typeof rec["admin1"] === "string" && rec["admin1"]) place.admin1 = rec["admin1"] as string;
      return place;
    })
    .filter((p): p is Place => p !== null);

  if (searchCache.size >= 40) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(cacheKey, {
    timestamp: Date.now(),
    results: results.map((p) => ({ ...p })),
  });

  return results.map((p) => ({ ...p }));
}

export async function fetchWeather(
  place: Place,
  unit: WeatherUnit = "metric",
  forceRefresh = false,
  signal?: AbortSignal
): Promise<Weather> {
  const safePlace: Place = isValidPlace(place) ? normalizePlace(place) : { ...BANGKOK_DEFAULT };
  const safeLat = safePlace.lat;
  const safeLon = safePlace.lon;

  const cacheKey = buildCacheKey(safeLat, safeLon, unit);

  if (!forceRefresh) {
    const cachedEntry = getCachedWeather(cacheKey);
    if (cachedEntry && cachedEntry.isFresh) {
      return { ...cachedEntry.weather, place: safePlace, isStale: false };
    }
  }

  const existingInFlight = inFlightRequests.get(cacheKey);
  if (existingInFlight && !forceRefresh) {
    return existingInFlight;
  }

  let fetchPromise: Promise<Weather>;
  fetchPromise = (async (): Promise<Weather> => {
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

    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${safeLat}&longitude=${safeLon}&current=us_aqi,pm2_5,pm10`;

    try {
      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetchWithRetry(weatherUrl, 2, 600, signal).then((r) => {
          if (!r.ok) throw new Error("Weather request failed");
          return r.json() as Promise<Record<string, unknown>>;
        }),
        fetchWithRetry(aqiUrl, 2, 600, signal).then((r) => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : null)),
      ]);

      if (weatherRes.status === "rejected") {
        throw new Error("Weather request failed");
      }

      const j = weatherRes.value as {
        current?: Record<string, unknown>;
        hourly?: { time?: string[]; temperature_2m?: number[]; weather_code?: number[]; precipitation_probability?: number[]; is_day?: number[] };
        daily?: {
          time?: string[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
          weather_code?: number[];
          precipitation_probability_max?: number[];
          sunrise?: string[];
          sunset?: string[];
        };
      };

      let aqi: number | undefined;
      let pm25: number | undefined;
      let pm10: number | undefined;

      if (aqiRes.status === "fulfilled" && aqiRes.value) {
        const curAqi = (aqiRes.value as { current?: Record<string, unknown> }).current;
        if (curAqi && typeof curAqi["us_aqi"] === "number" && !isNaN(curAqi["us_aqi"] as number)) {
          aqi = Math.round(curAqi["us_aqi"] as number);
        }
        if (curAqi && typeof curAqi["pm2_5"] === "number" && !isNaN(curAqi["pm2_5"] as number)) {
          pm25 = Math.round((curAqi["pm2_5"] as number) * 10) / 10;
        }
        if (curAqi && typeof curAqi["pm10"] === "number" && !isNaN(curAqi["pm10"] as number)) {
          pm10 = Math.round((curAqi["pm10"] as number) * 10) / 10;
        }
      }

      const current = j.current ?? {};
      const hourlyData = j.hourly ?? {};
      const dailyData = j.daily ?? {};

      const currentHourIso =
        typeof current["time"] === "string" ? (current["time"] as string).slice(0, 13) + ":00" : "";
      const hourlyTimes = Array.isArray(hourlyData.time) ? hourlyData.time : [];
      let startIdx = currentHourIso ? hourlyTimes.findIndex((t) => t >= currentHourIso) : 0;
      if (startIdx === -1) startIdx = Math.max(0, hourlyTimes.length - 1);
      if (startIdx < 0) startIdx = 0;

      const totalHours = hourlyTimes.length;
      const count = Math.min(24, Math.max(0, totalHours - startIdx));
      const hourly: Weather["hourly"] = [];

      for (let idx = 0; idx < count; idx++) {
        const dataIdx = startIdx + idx;
        const prob = hourlyData.precipitation_probability?.[dataIdx] ?? 0;
        hourly.push({
          time: hourlyTimes[dataIdx] ?? "",
          temp:
            idx === 0 && typeof current["temperature_2m"] === "number"
              ? (current["temperature_2m"] as number)
              : hourlyData.temperature_2m?.[dataIdx] ?? 0,
          code:
            idx === 0 && typeof current["weather_code"] === "number"
              ? (current["weather_code"] as number)
              : hourlyData.weather_code?.[dataIdx] ?? 0,
          precipProb: prob,
          pop: prob,
          is_day:
            idx === 0 && typeof current["is_day"] === "number"
              ? (current["is_day"] as number)
              : hourlyData.is_day?.[dataIdx] ?? 1,
        });
      }

      const sunrise = formatSunTime(dailyData.sunrise?.[0]);
      const sunset = formatSunTime(dailyData.sunset?.[0]);

      const windSpeed = typeof current["wind_speed_10m"] === "number" ? (current["wind_speed_10m"] as number) : 0;
      const uvVal = typeof current["uv_index"] === "number" ? (current["uv_index"] as number) : 0;
      const visibilityKm =
        typeof current["visibility"] === "number" ? (current["visibility"] as number) / 1000 : 10;
      const pressureHpa =
        typeof current["surface_pressure"] === "number" ? (current["surface_pressure"] as number) : 1013;

      const w: Weather = {
        place: safePlace,
        fetchedAt: Date.now(),
        unit,
        isStale: false,
        current: {
          temp: typeof current["temperature_2m"] === "number" ? (current["temperature_2m"] as number) : 0,
          feels:
            typeof current["apparent_temperature"] === "number"
              ? (current["apparent_temperature"] as number)
              : typeof current["temperature_2m"] === "number"
                ? (current["temperature_2m"] as number)
                : 0,
          code: typeof current["weather_code"] === "number" ? (current["weather_code"] as number) : 0,
          wind: windSpeed,
          wind_speed: windSpeed,
          wind_dir: typeof current["wind_direction_10m"] === "number" ? (current["wind_direction_10m"] as number) : 0,
          humidity: typeof current["relative_humidity_2m"] === "number" ? (current["relative_humidity_2m"] as number) : 0,
          uv: uvVal,
          uvIndex: Math.round(uvVal),
          precipitation: typeof current["precipitation"] === "number" ? (current["precipitation"] as number) : 0,
          pressure: pressureHpa,
          vis: visibilityKm,
          aqi,
          pm25,
          pm10,
          is_day: typeof current["is_day"] === "number" ? (current["is_day"] as number) : 1,
        },
        sun: { sunrise, sunset },
        hourly,
        daily: (dailyData.time ?? []).map((d: string, i: number) => {
          const pop = dailyData.precipitation_probability_max?.[i] ?? 0;
          const item: Weather["daily"][number] = {
            date: d,
            max: dailyData.temperature_2m_max?.[i] ?? 0,
            min: dailyData.temperature_2m_min?.[i] ?? 0,
            code: dailyData.weather_code?.[i] ?? 0,
            precipProbMax: pop,
            pop,
          };
          const sr = dailyData.sunrise?.[i];
          if (sr) item.sunrise = formatSunTime(sr);
          const ss = dailyData.sunset?.[i];
          if (ss) item.sunset = formatSunTime(ss);
          return item;
        }),
      };

      setCachedWeather(cacheKey, w);
      return w;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (err instanceof Error && (err as Error & { name?: string }).name === "AbortError") throw err;
      if (signal?.aborted) throw err;

      const cached = getCachedWeather(cacheKey);
      if (cached?.weather?.current) {
        return { ...cached.weather, place: safePlace, isStale: true };
      }

      try {
        const legacyRaw = localStorage.getItem(LEGACY_CACHE_KEY);
        if (legacyRaw) {
          const parsed: unknown = JSON.parse(legacyRaw);
          if (
            parsed &&
            typeof parsed === "object" &&
            (parsed as Partial<Weather>).current &&
            isValidPlace((parsed as Partial<Weather>).place) &&
            isSamePlace((parsed as Weather).place, safePlace)
          ) {
            return { ...(parsed as Weather), place: safePlace, isStale: true };
          }
        }
      } catch {}

      throw err;
    } finally {
      if (inFlightRequests.get(cacheKey) === fetchPromise) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export const getWeather = fetchWeather;

export function describe(code: number, t?: TranslateFn): { label: string; icon: string; labelKey: string } {
  if (code === 0) return { label: tr(t, "cond_clear", "Clear Sky"), icon: "☀", labelKey: "cond_clear" };
  if (code === 1) return { label: tr(t, "cond_mostly_clear", "Mostly Clear"), icon: "🌤", labelKey: "cond_mostly_clear" };
  if (code === 2) return { label: tr(t, "cond_partly_cloudy", "Partly Cloudy"), icon: "⛅", labelKey: "cond_partly_cloudy" };
  if (code === 3) return { label: tr(t, "cond_overcast", "Overcast"), icon: "☁", labelKey: "cond_overcast" };
  if (code === 45 || code === 48) return { label: tr(t, "cond_foggy", "Foggy"), icon: "🌫", labelKey: "cond_foggy" };
  if (code === 56 || code === 57) return { label: tr(t, "cond_freezing_drizzle", "Freezing Drizzle"), icon: "🌦", labelKey: "cond_freezing_drizzle" };
  if (code >= 51 && code <= 55) return { label: tr(t, "cond_drizzle", "Drizzle"), icon: "🌦", labelKey: "cond_drizzle" };
  if (code === 66 || code === 67) return { label: tr(t, "cond_freezing_rain", "Freezing Rain"), icon: "🌧", labelKey: "cond_freezing_rain" };
  if (code === 61 || code === 63 || code === 65) return { label: tr(t, "cond_rain", "Rain"), icon: "🌧", labelKey: "cond_rain" };
  if (code === 71 || code === 73 || code === 75 || code === 76 || code === 77) return { label: tr(t, "cond_snow", "Snow"), icon: "🌨", labelKey: "cond_snow" };
  if (code === 80 || code === 81 || code === 82) return { label: tr(t, "cond_showers", "Rain Showers"), icon: "🌧", labelKey: "cond_showers" };
  if (code === 85 || code === 86) return { label: tr(t, "cond_snow_showers", "Snow Showers"), icon: "🌨", labelKey: "cond_snow_showers" };
  if (code === 95 || code === 96 || code === 99) return { label: tr(t, "cond_thunderstorm", "Thunderstorm"), icon: "⛈", labelKey: "cond_thunderstorm" };
  return { label: tr(t, "cond_unknown", "Unknown"), icon: "🌡", labelKey: "cond_unknown" };
}

export function uvCategory(uv: number, t?: TranslateFn): string {
  if (!Number.isFinite(uv) || uv < 0) return tr(t, "uv_low", "Low");
  if (uv <= 2) return tr(t, "uv_low", "Low");
  if (uv <= 5) return tr(t, "uv_moderate", "Moderate");
  if (uv <= 7) return tr(t, "uv_high", "High");
  if (uv <= 10) return tr(t, "uv_very_high", "Very High");
  return tr(t, "uv_extreme", "Extreme");
}

export function aqiCategory(aqi: number, t?: TranslateFn): {
  label: string;
  color: string;
  bg: string;
  level: "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
} {
  if (!Number.isFinite(aqi) || aqi < 0) {
    return {
      label: tr(t, "aqi_good", "Good"),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      level: "good",
    };
  }
  if (aqi <= 50) {
    return {
      label: tr(t, "aqi_good", "Good"),
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      level: "good",
    };
  }
  if (aqi <= 100) {
    return {
      label: tr(t, "aqi_moderate", "Moderate"),
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30",
      level: "moderate",
    };
  }
  if (aqi <= 150) {
    return {
      label: tr(t, "aqi_sensitive", "Unhealthy for Sensitive Groups"),
      color: "text-orange-500",
      bg: "bg-orange-500/10 border-orange-500/30",
      level: "sensitive",
    };
  }
  if (aqi <= 200) {
    return {
      label: tr(t, "aqi_unhealthy", "Unhealthy"),
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/30",
      level: "unhealthy",
    };
  }
  if (aqi <= 300) {
    return {
      label: tr(t, "aqi_very_unhealthy", "Very Unhealthy"),
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/30",
      level: "very_unhealthy",
    };
  }
  return {
    label: tr(t, "aqi_hazardous", "Hazardous"),
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
  if (code === 2 || code === 3) return night ? "cloudy-night" : "cloudy-day";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || code === 80 || code === 81 || code === 82) return "rain";
  if (code === 71 || code === 73 || code === 75 || code === 76 || code === 77 || code === 85 || code === 86) return "snow";
  return "storm";
}

export function getWeatherAlert(w: Weather, t?: TranslateFn): { icon: string; message: string; severity: "info" | "warning" } | null {
  if (w.current.code >= 95) {
    return { icon: "⛈", message: tr(t, "alert_thunderstorm_warning", "Severe thunderstorm warning in this area."), severity: "warning" };
  }
  if ((w.current.code >= 51 && w.current.code <= 67) || (w.current.code >= 80 && w.current.code <= 82)) {
    return { icon: "🌧", message: tr(t, "alert_rain_slick", "Rain currently falling. Roads may be slick."), severity: "info" };
  }
  if ((w.current.code >= 71 && w.current.code <= 77) || w.current.code === 85 || w.current.code === 86) {
    return { icon: "🌨", message: tr(t, "alert_snow_slick", "Snow currently falling. Roads may be slick."), severity: "info" };
  }
  return null;
}
