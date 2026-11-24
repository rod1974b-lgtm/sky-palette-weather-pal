// src/lib/weatherSafe.ts
// V6 - NaN FIX - FREE, no new dependency
// Root cause: Ban Mai ... shows NaN°F, Feels like NaN°F, Humidity %, Hourly NaN°
// Math.round(undefined) = NaN. Math.round("31") works, Math.round(null) = 0, Math.round(undefined) = NaN.
// fetchWeather / Open-Meteo sometimes returns a different field name, a string, or undefined for one city.
// Example aliases: temp vs temperature vs temperature_2m, feels vs apparent_temperature,
// humidity vs relative_humidity_2m, wind_speed vs wind_speed_10m vs wind, uv vs uvIndex.
// Fix: pick first valid number from aliases, parse strings, never return NaN to UI. UI shows -- if truly missing.
// Also used by index.tsx to normalize right after fetch, so every child (WeatherView, modals, planner, radar) gets clean data.

export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-+]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function pickNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = toNum(v);
    if (n !== null) return n;
  }
  return null;
}

export function fmtTemp(v: number | null | undefined): string {
  const n = toNum(v);
  return n === null ? "--" : String(Math.round(n));
}

export function fmtInt(v: number | null | undefined): string {
  const n = toNum(v);
  return n === null ? "--" : String(Math.round(n));
}

export function fmtHumidity(v: number | null | undefined): string {
  const n = toNum(v);
  return n === null ? "--%" : `${Math.round(n)}%`;
}

// Normalize one Weather object. Keeps all other fields, only fixes numbers.
// unit: "metric" = °C, "imperial" = °F. If source gives temp_c while unit is imperial, convert once.
export function normalizeWeather<T extends any>(data: T, unit: string): T {
  try {
    const d: any = data as any;
    if (!d || !d.current) return data;
    const cur = d.current;
    const isImperial = unit === "imperial";

    // Temp: try temp, temperature, temperature_2m, temp_c, temp_f
    let temp = pickNum(cur.temp, cur.temperature, cur.temperature_2m, cur.temp_c, cur.temp_f);
    // If only temp_c / temp_f exists and unit differs, convert
    if (temp === null) {
      const c = toNum(cur.temp_c ?? cur.temperature_c);
      const f = toNum(cur.temp_f ?? cur.temperature_f);
      if (c !== null && isImperial) temp = (c * 9) / 5 + 32;
      else if (c !== null) temp = c;
      else if (f !== null && !isImperial) temp = ((f - 32) * 5) / 9;
      else if (f !== null) temp = f;
    }
    // Feels: feels, feels_like, apparent_temperature, apparentTemperature
    let feels = pickNum(
      cur.feels,
      cur.feels_like,
      cur.feelsLike,
      cur.apparent_temperature,
      cur.apparentTemperature,
      cur.feels_c,
      cur.feels_f
    );
    if (feels === null && temp !== null) feels = temp;
    // Humidity: humidity, relative_humidity, relative_humidity_2m
    const humidity = pickNum(
      cur.humidity,
      cur.relative_humidity,
      cur.relative_humidity_2m,
      cur.humidity_2m,
      cur.relativeHumidity
    );
    // Wind: wind_speed, wind, wind_speed_10m, windSpeed, wind_mph, wind_kmh
    const windSpeed = pickNum(
      cur.wind_speed,
      cur.wind,
      cur.wind_speed_10m,
      cur.windSpeed,
      cur.wind_speed_10,
      cur.wind_mph,
      cur.wind_kmh
    );
    // UV: uv, uvIndex, uv_index, uv_index_max
    const uv = pickNum(cur.uv, cur.uvIndex, cur.uv_index, cur.uvIndexMax, cur.uv_index_max);
    // AQI: aqi, air_quality, airQuality
    const aqi = pickNum(cur.aqi, cur.air_quality, cur.airQuality, cur.aqi_value);
    // Pressure: pressure, pressure_msl, pressure_msl_hpa
    const pressure = pickNum(cur.pressure, cur.pressure_msl, cur.pressure_msl_hpa, cur.pressure_hpa);
    // Code: code, weather_code, weathercode
    const code = pickNum(cur.code, cur.weather_code, cur.weathercode, cur.weatherCode) ?? cur.code ?? 0;
    // is_day: is_day, isDay, daytime
    const isDay = cur.is_day ?? cur.isDay ?? cur.daytime ?? 1;

    const fixedCurrent = {
      ...cur,
      temp: temp ?? cur.temp,
      feels: feels ?? cur.feels,
      humidity: humidity ?? cur.humidity,
      wind_speed: windSpeed ?? cur.wind_speed,
      wind: windSpeed ?? cur.wind,
      uv: uv ?? cur.uv,
      uvIndex: uv ?? cur.uvIndex,
      aqi: aqi ?? cur.aqi,
      pressure: pressure ?? cur.pressure,
      code,
      is_day: isDay,
    };

    // Hourly: temp / temperature aliases
    let fixedHourly = d.hourly;
    if (Array.isArray(d.hourly)) {
      fixedHourly = d.hourly.map((h: any) => {
        if (!h) return h;
        const ht = pickNum(h.temp, h.temperature, h.temperature_2m, h.temp_c, h.temp_f);
        return { ...h, temp: ht ?? h.temp, code: pickNum(h.code, h.weather_code, h.weathercode) ?? h.code };
      });
    }
    // Daily: max / min aliases
    let fixedDaily = d.daily;
    if (Array.isArray(d.daily)) {
      fixedDaily = d.daily.map((day: any) => {
        if (!day) return day;
        const mx = pickNum(day.max, day.temp_max, day.temperature_2m_max, day.max_temp, day.maximum);
        const mn = pickNum(day.min, day.temp_min, day.temperature_2m_min, day.min_temp, day.minimum);
        return {
          ...day,
          max: mx ?? day.max,
          min: mn ?? day.min,
          code: pickNum(day.code, day.weather_code, day.weathercode) ?? day.code,
        };
      });
    }

    return { ...d, current: fixedCurrent, hourly: fixedHourly, daily: fixedDaily } as T;
  } catch {
    return data;
  }
}
