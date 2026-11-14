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
    aqi?: number | undefined;
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

const CACHE_KEY = "weather:last";
const UNIT_KEY = "weather:unit-pref";
const FAVORITES_KEY = "weather:favorites";

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

export async function searchCity(q: string, lang: string = "en"): Promise<Place[]> {
  if (!q.trim()) return [];
  const cleanLang = ((lang || "en").split("-")[0] ?? "en").toLowerCase();
  const r = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&format=json&language=${cleanLang}`,
  );
  if (!r.ok) throw new Error("Search failed");
  const j = await r.json();
  return (j.results ?? []).map((x: any) => ({
    name: x.admin1 && x.admin1 !== x.name ? `${x.name}, ${x.admin1}` : x.name,
    country: x.country,
    lat: x.latitude,
    lon: x.longitude,
  }));
}

export async function fetchWeather(place: Place, unit: WeatherUnit = "metric"): Promise<Weather> {
  const safeLat = typeof place?.lat === "number" && !isNaN(place.lat) ? place.lat : 13.7563;
  const safeLon = typeof place?.lon === "number" && !isNaN(place.lon) ? place.lon : 100.5018;

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

  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${safeLat}&longitude=${safeLon}&current=us_aqi`;

  try {
    const [weatherRes, aqiRes] = await Promise.allSettled([
      fetch(weatherUrl).then((r) => {
        if (!r.ok) throw new Error("Weather request failed");
        return r.json();
      }),
      fetch(aqiUrl).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (weatherRes.status === "rejected") {
      throw new Error("Weather request failed");
    }

    const j = weatherRes.value;
    let aqi: number | undefined;
    if (aqiRes.status === "fulfilled" && aqiRes.value?.current?.us_aqi !== undefined) {
      aqi = Math.round(aqiRes.value.current.us_aqi);
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

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(w));
    } catch {}

    return w;
  } catch (err) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Weather;
        if (parsed?.current && parsed?.place) {
          return { ...parsed, place };
        }
      }
    } catch {}
    throw err;
  }
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

export function aqiCategory(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "text-emerald-500" };
  if (aqi <= 100) return { label: "Moderate", color: "text-yellow-500" };
  if (aqi <= 150) return { label: "Unhealthy for Sensitive Groups", color: "text-orange-500" };
  if (aqi <= 200) return { label: "Unhealthy", color: "text-red-500" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "text-purple-500" };
  return { label: "Hazardous", color: "text-rose-900" };
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
