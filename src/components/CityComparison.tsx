// src/components/CityComparison.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  type Place,
  type Weather,
  type WeatherUnit,
  fetchWeather,
  aqiCategory,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";

interface CityComparisonProps {
  favorites: Place[];
  currentPlace: Place;
  unit: WeatherUnit;
  onSelectPlace: (place: Place) => void;
}

interface CityWeatherEntry {
  place: Place;
  weather: Weather | null;
  loading: boolean;
  error?: string;
}

const COMPARISON_I18N: Record<
  string,
  {
    title: string;
    subtitle: string;
    bestWeather: string;
    cleanAir: string;
    activeCity: string;
    viewCity: string;
    noFavorites: string;
    noFavoritesDesc: string;
    tryCities: string;
    refreshAll: string;
    humidity: string;
    wind: string;
    feelsLike: string;
    highLow: string;
    aqi: string;
  }
> = {
  en: {
    title: "City Comparison Hub",
    subtitle: "Compare live weather & air quality across your favorite destinations",
    bestWeather: "☀️ Best Weather",
    cleanAir: "🍃 Cleanest Air",
    activeCity: "Viewing Now",
    viewCity: "View Weather",
    noFavorites: "No Favorite Cities Added Yet",
    noFavoritesDesc: "Tap the heart ❤️ on any city to compare live weather conditions side-by-side.",
    tryCities: "Quick add popular cities:",
    refreshAll: "Refresh Comparison",
    humidity: "Humidity",
    wind: "Wind",
    feelsLike: "Feels",
    highLow: "H / L",
    aqi: "AQI",
  },
  th: {
    title: "เปรียบเทียบสภาพอากาศหลายเมือง",
    subtitle: "เปรียบเทียบอุณหภูมิ อากาศ และฝุ่น PM2.5 ของเมืองโปรดในหน้าเดียว",
    bestWeather: "☀️ อากาศดีที่สุด",
    cleanAir: "🍃 อากาศบริสุทธิ์สุด",
    activeCity: "กำลังเปิดดู",
    viewCity: "ดูสภาพอากาศ",
    noFavorites: "ยังไม่ได้เพิ่มเมืองโปรด",
    noFavoritesDesc: "แตะปุ่มหัวใจ ❤️ ในเมืองต่างๆ เพื่อนำมาเปรียบเทียบสภาพอากาศแบบเคียงข้างกัน",
    tryCities: "เมืองแนะนำ:",
    refreshAll: "รีเฟรชข้อมูลเปรียบเทียบ",
    humidity: "ความชื้น",
    wind: "ลม",
    feelsLike: "รู้สึกเหมือน",
    highLow: "สูงสุด/ต่ำสุด",
    aqi: "ดัชนี AQI",
  },
  es: {
    title: "Comparador de Ciudades",
    subtitle: "Compara el clima y la calidad del aire en tus destinos favoritos",
    bestWeather: "☀️ Mejor Clima",
    cleanAir: "🍃 Aire Más Limpio",
    activeCity: "Viendo Ahora",
    viewCity: "Ver Clima",
    noFavorites: "Sin ciudades favoritas",
    noFavoritesDesc: "Toca el corazón ❤️ en cualquier ciudad para compararlas aquí.",
    tryCities: "Ciudades populares:",
    refreshAll: "Actualizar comparación",
    humidity: "Humedad",
    wind: "Viento",
    feelsLike: "Sensación",
    highLow: "Máx / Mín",
    aqi: "AQI",
  },
  ja: {
    title: "都市別お天気比較ハブ",
    subtitle: "お気に入りの都市の天気・気温・大気質を一目で比較",
    bestWeather: "☀️ ベストコンディション",
    cleanAir: "🍃 最も澄んだ空気",
    activeCity: "現在表示中",
    viewCity: "天気を表示",
    noFavorites: "お気に入り都市が未登録です",
    noFavoritesDesc: "各都市のハート ❤️ をタップしてここに追加・比較できます。",
    tryCities: "おすすめの都市:",
    refreshAll: "比較を更新",
    humidity: "湿度",
    wind: "風速",
    feelsLike: "体感",
    highLow: "最高 / 最低",
    aqi: "大気質 AQI",
  },
  zh: {
    title: "多城市天气对比",
    subtitle: "一屏对比所有收藏城市的气温、天气与空气质量",
    bestWeather: "☀️ 最佳天气",
    cleanAir: "🍃 空气最优",
    activeCity: "当前查看",
    viewCity: "查看天气",
    noFavorites: "暂无收藏城市",
    noFavoritesDesc: "点击任意城市上的爱心 ❤️ 即可在此进行横向对比。",
    tryCities: "热门城市推荐:",
    refreshAll: "刷新对比",
    humidity: "湿度",
    wind: "风速",
    feelsLike: "体感",
    highLow: "最高 / 最低",
    aqi: "空气 AQI",
  },
  hi: {
    title: "शहर मौसम तुलना हब",
    subtitle: "अपने पसंदीदा शहरों के मौसम और वायु गुणवत्ता की तुलना करें",
    bestWeather: "☀️ सबसे अच्छा मौसम",
    cleanAir: "🍃 सबसे स्वच्छ हवा",
    activeCity: "वर्तमान शहर",
    viewCity: "मौसम देखें",
    noFavorites: "कोई पसंदीदा शहर नहीं",
    noFavoritesDesc: "मौसम की तुलना करने के लिए दिल ❤️ पर टैप करें।",
    tryCities: "सुझाए गए शहर:",
    refreshAll: "तुलना ताज़ा करें",
    humidity: "नमी",
    wind: "हवा",
    feelsLike: "महसूस",
    highLow: "अधिकतम / न्यूनतम",
    aqi: "वायु AQI",
  },
  fr: {
    title: "Comparateur de Villes",
    subtitle: "Comparez la météo et la qualité de l'air de vos villes préférées",
    bestWeather: "☀️ Meilleure Météo",
    cleanAir: "🍃 Air le Plus Pur",
    activeCity: "Actuellement affiché",
    viewCity: "Voir la météo",
    noFavorites: "Aucune ville favorite",
    noFavoritesDesc: "Cliquez sur le cœur ❤️ pour ajouter des villes à comparer.",
    tryCities: "Villes suggérées :",
    refreshAll: "Actualiser",
    humidity: "Humidité",
    wind: "Vent",
    feelsLike: "Ressenti",
    highLow: "Max / Min",
    aqi: "IQA",
  },
  de: {
    title: "Städte-Vergleich",
    subtitle: "Wetter & Luftqualität deiner Lieblingsstädte im direkten Vergleich",
    bestWeather: "☀️ Bestes Wetter",
    cleanAir: "🍃 Sauberste Luft",
    activeCity: "Aktuell gewählt",
    viewCity: "Wetter anzeigen",
    noFavorites: "Keine Favoriten vorhanden",
    noFavoritesDesc: "Tippe auf das Herz ❤️, um Städte hier nebeneinander zu vergleichen.",
    tryCities: "Empfohlene Städte:",
    refreshAll: "Vergleich aktualisieren",
    humidity: "Feuchte",
    wind: "Wind",
    feelsLike: "Gefühlt",
    highLow: "Max / Min",
    aqi: "AQI",
  },
  pt: {
    title: "Comparador de Cidades",
    subtitle: "Compare o tempo e a qualidade do ar dos seus destinos favoritos",
    bestWeather: "☀️ Melhor Clima",
    cleanAir: "🍃 Ar Mais Puro",
    activeCity: "Exibindo Agora",
    viewCity: "Ver Clima",
    noFavorites: "Nenhuma cidade favorita",
    noFavoritesDesc: "Toque no coração ❤️ para adicionar cidades à comparação.",
    tryCities: "Cidades sugeridas:",
    refreshAll: "Atualizar comparação",
    humidity: "Umidade",
    wind: "Vento",
    feelsLike: "Sensação",
    highLow: "Máx / Mín",
    aqi: "AQI",
  },
  ru: {
    title: "Сравнение городов",
    subtitle: "Сравнивайте погоду и качество воздуха ваших любимых городов",
    bestWeather: "☀️ Лучшая погода",
    cleanAir: "🍃 Чистый воздух",
    activeCity: "Выбрано сейчас",
    viewCity: "Посмотреть",
    noFavorites: "Нет избранных городов",
    noFavoritesDesc: "Нажмите на сердечко ❤️ в карточке города, чтобы сравнить погоду.",
    tryCities: "Популярные города:",
    refreshAll: "Обновить сравнение",
    humidity: "Влажность",
    wind: "Ветер",
    feelsLike: "Ощущается",
    highLow: "Макс / Мин",
    aqi: "AQI",
  },
  ar: {
    title: "مقارنة مدن الطقس",
    subtitle: "قارن بين الطقس وجودة الهواء في وجهاتك المفضلة",
    bestWeather: "☀️ أفضل طقس",
    cleanAir: "🍃 أنقى هواء",
    activeCity: "معروض الآن",
    viewCity: "عرض الطقس",
    noFavorites: "لا توجد مدن مفضلة",
    noFavoritesDesc: "اضغط على القلب ❤️ لإضافة مدن للمقارنة هنا.",
    tryCities: "مدن مقترحة:",
    refreshAll: "تحديث المقارنة",
    humidity: "الرطوبة",
    wind: "الرياح",
    feelsLike: "المحسوسة",
    highLow: "عظمى / صغرى",
    aqi: "جودة الهواء",
  },
  ko: {
    title: "도시별 날씨 비교",
    subtitle: "즐겨찾는 도시들의 현재 날씨와 미세먼지를 한눈에 비교",
    bestWeather: "☀️ 가장 좋은 날씨",
    cleanAir: "🍃 가장 맑은 공기",
    activeCity: "현재 선택됨",
    viewCity: "날씨 보기",
    noFavorites: "즐겨찾기 도시가 없습니다",
    noFavoritesDesc: "도시에서 하트 ❤️를 눌러 이곳에 추가하고 비교해보세요.",
    tryCities: "추천 도시:",
    refreshAll: "비교 새로고침",
    humidity: "습도",
    wind: "바람",
    feelsLike: "체감",
    highLow: "최고 / 최저",
    aqi: "대기질 AQI",
  },
  id: {
    title: "Pusat Perbandingan Kota",
    subtitle: "Bandingkan cuaca & kualitas udara kota favorit Anda dalam satu layar",
    bestWeather: "☀️ Cuaca Terbaik",
    cleanAir: "🍃 Udara Terbersih",
    activeCity: "Sedang Dilihat",
    viewCity: "Lihat Cuaca",
    noFavorites: "Belum Ada Kota Favorit",
    noFavoritesDesc: "Ketuk tanda hati ❤️ di kota mana pun untuk membandingkan cuaca di sini.",
    tryCities: "Kota populer:",
    refreshAll: "Segarkan Perbandingan",
    humidity: "Kelembapan",
    wind: "Angin",
    feelsLike: "Terasa",
    highLow: "Maks / Min",
    aqi: "AQI",
  },
  vi: {
    title: "So Sánh Thời Tiết Các Thành Phố",
    subtitle: "So sánh thời tiết và chất lượng không khí giữa các thành phố yêu thích",
    bestWeather: "☀️ Thời Tiết Đẹp Nhất",
    cleanAir: "🍃 Không Khí Trong Lành",
    activeCity: "Đang Xem",
    viewCity: "Xem Thời Tiết",
    noFavorites: "Chưa có thành phố yêu thích",
    noFavoritesDesc: "Chạm vào biểu tượng trái tim ❤️ ở bất kỳ thành phố nào để so sánh tại đây.",
    tryCities: "Thành phố gợi ý:",
    refreshAll: "Làm mới so sánh",
    humidity: "Độ ẩm",
    wind: "Gió",
    feelsLike: "Cảm giác",
    highLow: "Cao / Thấp",
    aqi: "AQI",
  },
};

const SUGGESTED_CITIES: Place[] = [
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853 },
];

export const CityComparison: React.FC<CityComparisonProps> = ({
  favorites,
  currentPlace,
  unit,
  onSelectPlace,
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().split("-")[0] || "en";
  const texts = COMPARISON_I18N[lang] || COMPARISON_I18N.en;

  const [entries, setEntries] = useState<CityWeatherEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load weather for all favorites
  const loadAllWeather = async (placesToLoad: Place[], force = false) => {
    setIsRefreshing(true);
    const initial = placesToLoad.map((p) => ({
      place: p,
      weather: null,
      loading: true,
    }));
    setEntries(initial);

    const updated = await Promise.all(
      placesToLoad.map(async (p) => {
        try {
          const w = await fetchWeather(p, unit, force);
          return { place: p, weather: w, loading: false };
        } catch {
          return { place: p, weather: null, loading: false, error: "Unavailable" };
        }
      })
    );

    setEntries(updated);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (favorites.length > 0) {
      loadAllWeather(favorites);
    } else {
      setEntries([]);
    }
  }, [favorites, unit]);

  // Identify Best Weather (clearest condition & comfortable temp) & Cleanest Air
  let bestWeatherPlace: Place | null = null;
  let cleanestAirPlace: Place | null = null;
  let lowestAqi = Infinity;

  entries.forEach((e) => {
    if (!e.weather) return;
    const code = e.weather.current.code;
    const aqi = e.weather.current.aqi ?? (e.weather.current.pm25 ? e.weather.current.pm25 * 3 : 50);

    // Clearest condition (code 0: clear sky, 1: mainly clear)
    if (code <= 1 && !bestWeatherPlace) {
      bestWeatherPlace = e.place;
    }

    if (aqi < lowestAqi) {
      lowestAqi = aqi;
      cleanestAirPlace = e.place;
    }
  });

  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? "mph" : "km/h";

  if (favorites.length === 0) {
    return (
      <section className="p-5 rounded-3xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-sm font-bold text-foreground">{texts.title}</h3>
            <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
          </div>
        </div>

        <div className="py-6 px-4 rounded-2xl bg-muted/30 border border-border/40 text-center space-y-2">
          <span className="text-3xl block">❤️</span>
          <h4 className="text-xs font-bold text-foreground">{texts.noFavorites}</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            {texts.noFavoritesDesc}
          </p>

          <div className="pt-3">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-2">
              {texts.tryCities}
            </span>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTED_CITIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onSelectPlace(c)}
                  className="px-2.5 py-1 rounded-full text-xs bg-card border border-border/60 hover:bg-muted font-medium text-foreground transition cursor-pointer active:scale-95"
                >
                  📍 {getLocalizedCity(c.name, lang)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">{texts.title}</h3>
            <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAllWeather(favorites, true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer active:scale-95 disabled:opacity-50"
          title={texts.refreshAll}
        >
          <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
          <span className="hidden sm:inline">{texts.refreshAll}</span>
        </button>
      </div>

      {/* Comparison Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map(({ place, weather, loading, error }) => {
          const isCurrent =
            place.name.toLowerCase() === currentPlace.name.toLowerCase() &&
            Math.abs(place.lat - currentPlace.lat) < 0.1;

          const isBestWeather = bestWeatherPlace?.name === place.name;
          const isCleanestAir = cleanestAirPlace?.name === place.name && lowestAqi < 45;

          const localizedCity = getLocalizedCity(place.name, lang);
          const localizedCountry = getLocalizedCountry(place.country, lang);

          if (loading) {
            return (
              <div
                key={place.name}
                className="p-4 rounded-2xl bg-muted/20 border border-border/40 animate-pulse flex flex-col justify-between min-h-[160px]"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-muted/60 rounded-sm w-3/4" />
                  <div className="h-3 bg-muted/40 rounded-sm w-1/2" />
                </div>
                <div className="h-10 bg-muted/50 rounded-xl mt-4" />
              </div>
            );
          }

          if (!weather) {
            return (
              <div
                key={place.name}
                className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-center flex flex-col items-center justify-center min-h-[160px]"
              >
                <span className="text-xl mb-1">⚠️</span>
                <span className="text-xs font-bold text-foreground">{localizedCity}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {error || "Weather Unavailable"}
                </span>
              </div>
            );
          }

          const temp = Math.round(weather.current.temp);
          const feelsLike = Math.round(weather.current.apparent_temperature ?? weather.current.temp);
          const todayDaily = weather.daily[0];
          const maxTemp = todayDaily ? Math.round(todayDaily.max) : temp;
          const minTemp = todayDaily ? Math.round(todayDaily.min) : temp;
          const humidity = weather.current.humidity ?? "--";
          const windSpeed = Math.round(weather.current.wind_speed ?? 0);

          const aqiVal = weather.current.aqi ?? (weather.current.pm25 ? Math.round(weather.current.pm25 * 3) : undefined);
          const aqiCat = aqiVal !== undefined ? aqiCategory(aqiVal) : null;

          return (
            <div
              key={place.name}
              className={`relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                isCurrent
                  ? "bg-primary/5 border-primary/40 shadow-xs"
                  : "bg-card/70 border-border/50 hover:border-border hover:bg-card"
              }`}
            >
              {/* Badges Bar */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {isCurrent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                    ✓ {texts.activeCity}
                  </span>
                ) : isBestWeather ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {texts.bestWeather}
                  </span>
                ) : isCleanestAir ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {texts.cleanAir}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                    {localizedCountry}
                  </span>
                )}

                {/* AQI Pill */}
                {aqiVal !== undefined && aqiCat && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${aqiCat.color} ${aqiCat.bg}`}
                    title={`AQI ${aqiVal}`}
                  >
                    AQI {aqiVal}
                  </span>
                )}
              </div>

              {/* City Title & Main Temperature */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-base font-black text-foreground tracking-tight leading-snug">
                    {localizedCity}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {texts.feelsLike} {feelsLike}{tempUnitStr} • ↑{maxTemp}° ↓{minTemp}°
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <WeatherIcon
                    code={weather.current.code}
                    isDay={weather.current.is_day}
                    className="w-9 h-9 shrink-0 drop-shadow-xs"
                  />
                  <div className="text-2xl font-black text-foreground">
                    {temp}
                    <span className="text-xs font-semibold text-primary ml-0.5">
                      {tempUnitStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border/40 text-[11px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>💧</span>
                  <span className="font-semibold text-foreground">{humidity}%</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>💨</span>
                  <span className="font-semibold text-foreground">
                    {windSpeed} {speedUnitStr}
                  </span>
                </div>
              </div>

              {/* 1-Tap Switcher Button */}
              <button
                type="button"
                onClick={() => onSelectPlace(place)}
                className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 text-center ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                }`}
              >
                {isCurrent ? texts.activeCity : texts.viewCity}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CityComparison;
