// src/components/WeatherView.tsx
import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { type Weather, type WeatherUnit, type Place } from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";

export interface TickerAlertItem {
  id: string;
  text?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  tag?: string;
  tagKey?: string;
  category?: string;
  source?: string;
  headline?: string;
  headlineTh?: string;
  headlineEn?: string;
  urgency?: string;
  timeAgo?: string;
}

interface WeatherViewProps {
  weather?: Weather | null;
  w?: Weather | null;
  activeAlerts?: TickerAlertItem[];
  disasters?: TickerAlertItem[];
  unit: WeatherUnit;
  loading: boolean;
  onRefresh: () => void;
  onSelectBg?: (url: string) => void;
  onSelectBackground?: (url: string) => void;
  isFav?: boolean;
  onToggleFavorite?: () => void;
  onOpenAiGallery?: () => void;
  customBgUrl?: string | null;
}

type WearCategory = "casual" | "business" | "sports";

const WMO_KEY_MAP: Record<number, { key: string; fallback: string }> = {
  0: { key: "cond_clear", fallback: "Clear sky" },
  1: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  2: { key: "cond_partly_cloudy", fallback: "Partly cloudy" },
  3: { key: "cond_overcast", fallback: "Overcast" },
  45: { key: "cond_fog", fallback: "Fog" },
  48: { key: "cond_fog", fallback: "Fog" },
  51: { key: "cond_drizzle", fallback: "Drizzle" },
  53: { key: "cond_drizzle", fallback: "Drizzle" },
  55: { key: "cond_drizzle", fallback: "Drizzle" },
  56: { key: "cond_drizzle", fallback: "Drizzle" },
  57: { key: "cond_drizzle", fallback: "Drizzle" },
  61: { key: "cond_rain", fallback: "Rain" },
  63: { key: "cond_rain", fallback: "Rain" },
  65: { key: "cond_rain", fallback: "Heavy rain" },
  66: { key: "cond_rain", fallback: "Freezing rain" },
  67: { key: "cond_rain", fallback: "Freezing rain" },
  71: { key: "cond_snow", fallback: "Snow" },
  73: { key: "cond_snow", fallback: "Snow" },
  75: { key: "cond_snow", fallback: "Heavy snow" },
  77: { key: "cond_snow", fallback: "Snow grains" },
  80: { key: "cond_shower", fallback: "Rain showers" },
  81: { key: "cond_shower", fallback: "Rain showers" },
  82: { key: "cond_shower", fallback: "Violent rain showers" },
  85: { key: "cond_snow", fallback: "Snow showers" },
  86: { key: "cond_snow", fallback: "Heavy snow showers" },
  95: { key: "cond_thunderstorm", fallback: "Thunderstorm" },
  96: { key: "cond_thunderstorm", fallback: "Thunderstorm with hail" },
  99: { key: "cond_thunderstorm", fallback: "Thunderstorm with heavy hail" },
};

function getConditionLabel(code: number, t: TFunction): string {
  const map = WMO_KEY_MAP[code];
  if (map) {
    return t(map.key, map.fallback);
  }
  return t("cond_partly_cloudy", "Partly cloudy");
}

function getHourlyTimeLabel(timeStr: string, index: number, t: TFunction): string {
  if (index === 0) return t("now", "Now");
  if (!timeStr) return "";
  try {
    const parts = timeStr.split("T")[1];
    if (parts) {
      return parts.slice(0, 5);
    }
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? timeStr : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return timeStr;
  }
}

function getDailyDayLabel(dateStr: string, index: number, t: TFunction): string {
  if (index === 0) return t("today", "Today");
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { weekday: "short" });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return dateStr;
  }
}

function getUvIndexLabel(uv: number, t: TFunction): { label: string; color: string } {
  if (uv < 3) return { label: t("uv_low", "Low"), color: "text-emerald-500" };
  if (uv < 6) return { label: t("uv_moderate", "Moderate"), color: "text-amber-500" };
  if (uv < 8) return { label: t("uv_high", "High"), color: "text-orange-500" };
  if (uv < 11) return { label: t("uv_very_high", "Very High"), color: "text-rose-500" };
  return { label: t("uv_extreme", "Extreme"), color: "text-purple-500" };
}

function getWindDirectionLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16] || "N";
}

const WEAR_CATEGORIES = {
  en: { casual: "Casual", business: "Office / Business", sports: "Athletic / Outdoor" },
  th: { casual: "ลำลอง / สบายๆ", business: "ทำงาน / สุภาพ", sports: "ออกกำลังกาย / ลุยๆ" },
  es: { casual: "Casual", business: "Oficina / Negocios", sports: "Deportivo / Aire libre" },
  ja: { casual: "カジュアル", business: "ビジネス", sports: "スポーツ" },
  zh: { casual: "休闲日常", business: "商务通勤", sports: "运动健身" },
  hi: { casual: "कैज़ुअल", business: "कार्यालय", sports: "खेलकूद" },
  fr: { casual: "Décontracté", business: "Professionnel", sports: "Sport" },
  de: { casual: "Freizeit", business: "Business", sports: "Sport" },
  pt: { casual: "Casual", business: "Trabalho", sports: "Esporte" },
  ru: { casual: "Повседневный", business: "Деловой", sports: "Спорт" },
  ar: { casual: "يومي", business: "عمل", sports: "رياضة" },
  ko: { casual: "캐주얼", business: "비즈니스", sports: "운동/스포츠" },
  id: { casual: "Santai", business: "Kantor", sports: "Olahraga" },
  vi: { casual: "Hàng ngày", business: "Công sở", sports: "Thể thao" },
};

const ACCESSORY_LABELS = {
  en: {
    umbrella: "Compact umbrella or raincoat",
    sunglasses: "UV-blocking sunglasses & sun hat",
    sunscreen: "Water-resistant SPF 50+ sunscreen",
    water: "Hydration flask or cold water",
    windbreaker: "Windproof shell jacket",
    heavyCoat: "Thermal insulated winter coat & gloves",
    lightJacket: "Light jacket or sweater for breezy air",
    warmBeanie: "Knit beanie, scarf & thermal socks",
  },
  th: {
    umbrella: "ร่มพับหรือเสื้อกันฝน",
    sunglasses: "แว่นกันแดด UV & หมวกปีกกว้าง",
    sunscreen: "ครีมกันแดดกันน้ำ SPF 50+",
    water: "กระบอกน้ำดื่มพกพาหรือน้ำเย็น",
    windbreaker: "เสื้อคลุมกันลมผ้าระบายอากาศ",
    heavyCoat: "เสื้อกันหนาวหนาพิเศษ & ถุงมือ",
    lightJacket: "เสื้อคลุมบางหรือสเวตเตอร์",
    warmBeanie: "หมวกไหมพรม ผ้าพันคอ & ถุงเท้าหนา",
  },
  es: {
    umbrella: "Paraguas compacto o impermeable",
    sunglasses: "Gafas de sol con filtro UV y sombrero",
    sunscreen: "Protector solar resistente al agua SPF 50+",
    water: "Botella de agua fresca",
    windbreaker: "Chaqueta cortavientos",
    heavyCoat: "Abrigo térmico de invierno y guantes",
    lightJacket: "Chaqueta ligera o suéter",
    warmBeanie: "Gorro de lana, bufanda y calcetines térmicos",
  },
  ja: {
    umbrella: "折りたたみ傘またはレインコート",
    sunglasses: "UVカットサングラス＆帽子",
    sunscreen: "ウォータープルーフ日焼け止め SPF50+",
    water: "水分補給ボトルまたは冷たい水",
    windbreaker: "防風ウィンドブレーカー",
    heavyCoat: "厚手の防寒コート＆手袋",
    lightJacket: "薄手のジャケットやカーディガン",
    warmBeanie: "ニット帽、マフラー、厚手の靴下",
  },
  zh: {
    umbrella: "便携折叠伞或雨衣",
    sunglasses: "防紫外线太阳镜与遮阳帽",
    sunscreen: "防水防汗防晒霜 SPF 50+",
    water: "便携水杯或清凉饮用水",
    windbreaker: "透气防风外套",
    heavyCoat: "保暖厚羽绒服与手套",
    lightJacket: "薄款夹克或针织开衫",
    warmBeanie: "保暖针织帽、围巾与厚袜子",
  },
  hi: {
    umbrella: "छाता या रेनकोट",
    sunglasses: "यूवी चश्मा और टोपी",
    sunscreen: "सनस्क्रीन एसपीएफ़ 50+",
    water: "पानी की बोतल",
    windbreaker: "विंडप्रूफ जैकेट",
    heavyCoat: "गर्म विंटर कोट और दस्ताने",
    lightJacket: "हल्की जैकेट या स्वेटर",
    warmBeanie: "ऊनी टोपी और मफलर",
  },
  fr: {
    umbrella: "Parapluie compact ou imperméable",
    sunglasses: "Lunettes de soleil UV & chapeau",
    sunscreen: "Crème solaire résistante SPF 50+",
    water: "Gourde d'eau fraîche",
    windbreaker: "Veste coupe-vent",
    heavyCoat: "Manteau d'hiver chaud et gants",
    lightJacket: "Veste légère ou pull fin",
    warmBeanie: "Bonnet, écharpe et chaussettes chaudes",
  },
  de: {
    umbrella: "Kompakter Regenschirm oder Regenjacke",
    sunglasses: "UV-Sonnenbrille & Sonnenhut",
    sunscreen: "Wasserfester Sonnenschutz SPF 50+",
    water: "Trinkflasche mit kaltem Wasser",
    windbreaker: "Winddichte Funktionsjacke",
    heavyCoat: "Gefütterter Wintermantel & Handschuhe",
    lightJacket: "Leichte Jacke oder Strickjacke",
    warmBeanie: "Strickmütze, Schal & Thermosocken",
  },
  pt: {
    umbrella: "Guarda-chuva compacto ou capa de chuva",
    sunglasses: "Óculos de sol com proteção UV e chapéu",
    sunscreen: "Protetor solar resistente à água FPS 50+",
    water: "Garrafa de água gelada",
    windbreaker: "Jaqueta corta-vento",
    heavyCoat: "Casaco de inverno térmico e luvas",
    lightJacket: "Jaqueta leve ou suéter",
    warmBeanie: "Gorro de lã, cachecol e meias térmicas",
  },
  ru: {
    umbrella: "Компактный зонт или дождевик",
    sunglasses: "Солнцезащитные очки с защитой от УФ и шляпа",
    sunscreen: "Водостойкий солнцезащитный крем SPF 50+",
    water: "Бутылка прохладной воды",
    windbreaker: "Ветрозащитная куртка",
    heavyCoat: "Теплая зимняя куртка и перчатки",
    lightJacket: "Легкая куртка или свитер",
    warmBeanie: "Вязаная шапка, шарф и теплые носки",
  },
  ar: {
    umbrella: "مظلة صغيرة أو معطف مطر",
    sunglasses: "نظارات شمسية وقبعة واقية",
    sunscreen: "واقي شمس مقاوم للماء SPF 50+",
    water: "قارورة ماء بارد",
    windbreaker: "سترة واقية من الرياح",
    heavyCoat: "معطف شتوي دافئ وقفازات",
    lightJacket: "سترة خفيفة أو كنزة",
    warmBeanie: "قبعة صوف ووشاح وجوارب دافئة",
  },
  ko: {
    umbrella: "휴대용 우산 또는 우비",
    sunglasses: "자외선 차단 선글라스 & 모자",
    sunscreen: "워터프루프 선크림 SPF 50+",
    water: "시원한 물병",
    windbreaker: "방풍 바람막이 자켓",
    heavyCoat: "두꺼운 겨울 패딩 & 장갑",
    lightJacket: "가벼운 겉옷 또는 가디건",
    warmBeanie: "비니, 목도리 & 보온 양말",
  },
  id: {
    umbrella: "Payung lipat atau jas hujan",
    sunglasses: "Kacamata hitam UV & topi matahari",
    sunscreen: "Tabir surya tahan air SPF 50+",
    water: "Botol air dingin",
    windbreaker: "Jaket penahan angin",
    heavyCoat: "Jaket musim dingin tebal & sarung tangan",
    lightJacket: "Jaket tipis atau kardigan",
    warmBeanie: "Kupluk rajut, syal & kaus kaki hangat",
  },
  vi: {
    umbrella: "Ô gấp gọn hoặc áo mưa",
    sunglasses: "Kính râm chống tia UV & mũ rộng vành",
    sunscreen: "Kem chống nắng kháng nước SPF 50+",
    water: "Bình nước mát",
    windbreaker: "Áo khoác gió thoáng khí",
    heavyCoat: "Áo khoác ấm mùa đông & găng tay",
    lightJacket: "Áo khoác nhẹ hoặc áo len mỏng",
    warmBeanie: "Mũ len, khăn quàng & tất ấm",
  },
};

export const WeatherView: React.FC<WeatherViewProps> = ({
  weather,
  w: weatherProp,
  activeAlerts = [],
  disasters = [],
  unit,
  loading,
  onRefresh,
  onSelectBg,
  onSelectBackground,
  isFav,
  onToggleFavorite,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.toLowerCase().split("-")[0] || "en";
  const w = weather || weatherProp;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>(() => {
    if (customBgUrl) return customBgUrl;
    if (typeof window !== "undefined") {
      const cityKey = w?.place?.name ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}` : "";
      return (cityKey ? localStorage.getItem(cityKey) : null) || localStorage.getItem("weather:custom-bg:current") || "";
    }
    return "";
  });
  const [artIndex, setArtIndex] = useState(0);
  const [isDarkArtwork, setIsDarkArtwork] = useState<boolean>(false);

  // Clothing category selection with persistence
  const [wearCategory, setWearCategory] = useState<WearCategory>(() => {
    try {
      const saved = localStorage.getItem("weather:wear-category") as WearCategory;
      if (saved === "business" || saved === "sports" || saved === "casual") {
        return saved;
      }
    } catch {}
    return "casual";
  });

  const handleSelectCategory = (cat: WearCategory) => {
    setWearCategory(cat);
    try {
      localStorage.setItem("weather:wear-category", cat);
    } catch {}
  };

  const cityStorageKey = w?.place?.name
    ? `weather:custom-bg:${w.place.name.toLowerCase().trim()}`
    : "";

  // Auto-detect whether the hero background picture is dark or light
  useEffect(() => {
    if (!heroBgUrl) {
      setIsDarkArtwork(!w?.current?.is_day);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.src = heroBgUrl;

    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalLum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
          count++;
        }
        const avgLum = totalLum / count;
        setIsDarkArtwork(avgLum < 135);
      } catch {
        setIsDarkArtwork(!w?.current?.is_day);
      }
    };

    img.onerror = () => {
      if (!active) return;
      setIsDarkArtwork(!w?.current?.is_day);
    };

    return () => {
      active = false;
    };
  }, [heroBgUrl, w?.current?.is_day]);

  // Sync custom background if passed as prop
  useEffect(() => {
    if (customBgUrl) {
      setHeroBgUrl(customBgUrl);
    }
  }, [customBgUrl]);

  // Live listener for wallpaper changes from gallery
  useEffect(() => {
    const handleBgChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ city?: string; currentCity?: string; url?: string }>;
      if (customEvent.detail?.url) {
        setHeroBgUrl(customEvent.detail.url);
      }
    };
    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => {
      window.removeEventListener("weather:custom-bg-change", handleBgChange);
    };
  }, [w?.place?.name]);

  const handleSelectBackground = (url: string) => {
    setHeroBgUrl(url);
    if (cityStorageKey) {
      try {
        if (url) {
          localStorage.setItem(cityStorageKey, url);
          localStorage.setItem("weather:custom-bg:current", url);
        } else {
          localStorage.removeItem(cityStorageKey);
        }
      } catch {}
    }
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  useEffect(() => {
    if (!w?.place) return;

    try {
      const savedCityBg =
        localStorage.getItem(cityStorageKey) ||
        localStorage.getItem("weather:custom-bg:current");
      if (savedCityBg) {
        setHeroBgUrl(savedCityBg);
        return;
      }
    } catch {}

    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );

    const firstArt = arts[0];
    if (firstArt) {
      setHeroBgUrl(firstArt);
    } else {
      getCityWeatherBackground(
        w.place.name,
        conditionStr,
        w.current.code,
        w.current.temp,
        (loadedUrl) => {
          setHeroBgUrl(loadedUrl);
        },
        w.place.country,
        w.place.lat,
        w.place.lon
      ).then((res) => {
        if (res?.initialBg && !res.initialBg.startsWith("linear-gradient")) {
          setHeroBgUrl(res.initialBg);
        }
      }).catch(() => {});
    }
  }, [w?.place?.name, w?.current?.code, cityStorageKey]);

  if (!w) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-pulse">
        <p className="text-sm">{t("search_placeholder", "Loading local weather...")}</p>
      </div>
    );
  }

  const tempVal = Math.round(w.current.temp);
  const feelsVal = Math.round(w.current.feels);
  const conditionLabel = getConditionLabel(w.current.code, t);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";

  // Daily High/Low
  const todayDaily = w.daily[0];
  const maxTemp = todayDaily ? Math.round(todayDaily.max) : tempVal;
  const minTemp = todayDaily ? Math.round(todayDaily.min) : tempVal;

  // UV & Humidity
  const uvInfo = getUvIndexLabel(w.current.uv, t);
  const uvValFormatted = typeof w.current.uv === "number" ? w.current.uv.toFixed(1) : "0.0";

  // Wind speed & direction
  const windDirStr = getWindDirectionLabel(w.current.wind_dir);
  const windUnitStr = unit === "imperial" ? "mph" : "km/h";

   // Pressure & Visibility with defensive optional chaining
  const pressureVal = Math.round(w.current?.pressure ?? 1013);
  const visUnitStr = unit === "imperial" ? "mi" : "km";
  const rawVis = typeof w.current?.vis === "number" ? w.current.vis : 10;
  const visVal = unit === "imperial"
    ? (rawVis / 1.60934).toFixed(1)
    : rawVis.toFixed(1);

  // Rain chance
  const rainChanceVal = todayDaily?.pop ?? 0;

  // Sunrise/Sunset formatting
  let sunriseStr = "--:--";
  let sunsetStr = "--:--";
  if (todayDaily?.sunrise) {
    try {
      sunriseStr = todayDaily.sunrise.includes("T")
        ? todayDaily.sunrise.split("T")[1]?.slice(0, 5) || todayDaily.sunrise
        : todayDaily.sunrise;
    } catch {}
  }
  if (todayDaily?.sunset) {
    try {
      sunsetStr = todayDaily.sunset.includes("T")
        ? todayDaily.sunset.split("T")[1]?.slice(0, 5) || todayDaily.sunset
        : todayDaily.sunset;
    } catch {}
  }

  // --- Dynamic Clothing Advisor Engine ---
  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.current.code);
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(w.current.code);
  const isSunnyHighUv = w.current.uv >= 6 && w.current.is_day;
  const isWindy = w.current.wind_speed >= (unit === "imperial" ? 18 : 30);

  const locAccessory = (ACCESSORY_LABELS as any)[lang] || ACCESSORY_LABELS.en;
  const locWearCat = (WEAR_CATEGORIES as any)[lang] || WEAR_CATEGORIES.en;

  let clothingDescription = "";
  const accessories: string[] = [];

  if (tempC >= 28) {
    if (wearCategory === "business") {
      clothingDescription = t("wear_desc_hot_biz", "Breathable linen shirt or blouse, lightweight trousers, and moisture-wicking undershirt.");
    } else if (wearCategory === "sports") {
      clothingDescription = t("wear_desc_hot_sport", "Ultra-light tank top or moisture-wicking tee, running shorts, and anti-friction socks.");
    } else {
      clothingDescription = t("wear_desc_hot_casual", "Light cotton t-shirt, shorts or airy skirt, and breathable open footwear.");
    }
  } else if (tempC >= 20) {
    if (wearCategory === "business") {
      clothingDescription = t("wear_desc_mild_biz", "Long-sleeve dress shirt, tailored chinos or pencil skirt, and smart leather loafers.");
    } else if (wearCategory === "sports") {
      clothingDescription = t("wear_desc_mild_sport", "Breathable athletic t-shirt, flexible joggers or training tights, and cushioned running shoes.");
    } else {
      clothingDescription = t("wear_desc_mild_casual", "Comfortable cotton tee, light cardigan or denim shirt, and relaxed jeans or chinos.");
    }
  } else if (tempC >= 12) {
    if (wearCategory === "business") {
      clothingDescription = t("wear_desc_cool_biz", "Tailored wool blazer over dress shirt, smart slacks, and leather dress shoes.");
    } else if (wearCategory === "sports") {
      clothingDescription = t("wear_desc_cool_sport", "Long-sleeve thermal training top, wind-resistant track pants, and trail running shoes.");
    } else {
      clothingDescription = t("wear_desc_cool_casual", "Warm sweater or knit hoodie, medium jacket, jeans, and comfortable sneakers or boots.");
    }
  } else {
    if (wearCategory === "business") {
      clothingDescription = t("wear_desc_cold_biz", "Heavy wool overcoat, cashmere sweater layered over dress shirt, thermal trousers, and insulated leather boots.");
    } else if (wearCategory === "sports") {
      clothingDescription = t("wear_desc_cold_sport", "Fleece-lined thermal base layer, insulated wind jacket, thermal running tights, and trail shoes with grip.");
    } else {
      clothingDescription = t("wear_desc_cold_casual", "Padded down jacket or heavy parka, wool knit sweater, fleece-lined trousers, and warm winter boots.");
    }
  }

  if (isRaining) accessories.push(locAccessory.umbrella);
  if (isSunnyHighUv) {
    accessories.push(locAccessory.sunglasses);
    accessories.push(locAccessory.sunscreen);
  }
  if (tempC >= 30) accessories.push(locAccessory.water);
  if (isWindy && tempC < 22) accessories.push(locAccessory.windbreaker);
  if (tempC < 10) accessories.push(locAccessory.warmBeanie);
  if (tempC < 5 || isSnowing) accessories.push(locAccessory.heavyCoat);
  if (tempC >= 12 && tempC <= 18 && accessories.length < 2) accessories.push(locAccessory.lightJacket);

  const finalAccessories = Array.from(new Set(accessories)).slice(0, 3);

  // Cycling artwork through Next Art button
  const handleCycleArtwork = () => {
    const conditionStr = getConditionLabel(w.current.code, t);
    const arts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );
    if (!arts || arts.length === 0) return;

    const nextIdx = (artIndex + 1) % arts.length;
    setArtIndex(nextIdx);
    const nextUrl = arts[nextIdx];
    if (nextUrl) {
      handleSelectBackground(nextUrl);
    }
  };

  const cityBadgeClass =
    "inline-flex items-center gap-2 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]";

  const tempBadgeClass =
    "inline-flex items-baseline gap-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]";

  return (
    <div className="space-y-4">
      {/* 1. TOP ACTION BAR: Artwork Cycler, AI Gallery, Refresh, Favorite */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span>🎨</span>
          <span className="truncate max-w-[150px] sm:max-w-none">
            {t("watercolor_sky", "AI Watercolor")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Next Art Button */}
          <button
            type="button"
            onClick={handleCycleArtwork}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer"
            title={t("next_art", "Cycle next artwork")}
          >
            <span className="text-sm">🖼️</span>
            <span>{t("next_art", "Next Art")}</span>
          </button>

          {/* AI Gallery Button */}
          <Link
            to="/gallery"
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer"
            title={t("art_gallery", "AI Gallery")}
          >
            <span className="text-sm">🎨</span>
            <span>{t("art_gallery", "AI Gallery")}</span>
          </Link>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted disabled:opacity-60 cursor-pointer"
            title={t("refresh", "Refresh")}
          >
            <span className={`text-sm ${loading ? "animate-spin" : ""}`}>🔄</span>
            <span className="hidden sm:inline">{t("refresh", "Refresh")}</span>
          </button>

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className="flex items-center justify-center rounded-xl border border-border/80 bg-card/85 px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition hover:bg-muted cursor-pointer"
              title={isFav ? t("remove_favorite", "Remove from favorites") : t("add_favorite", "Add to favorites")}
              aria-pressed={!!isFav}
            >
              <span className="inline-block text-sm">
                {isFav ? "❤️" : "🤍"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STREAMLINED HERO CARD (Expanded Height & Crisp Artwork) */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 p-5 sm:p-6 shadow-lg bg-card text-card-foreground min-h-[290px] sm:min-h-[320px] flex flex-col justify-between">
        {heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url(${heroBgUrl})`,
              filter: "brightness(1.02) saturate(1.15)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between flex-1 w-full">
          {/* Top: City Name */}
          <div className="flex items-start justify-between">
            <div className={cityBadgeClass}>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {w.place.name}
              </h2>
              {w.place.country && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-white/40 text-white/95">
                  {w.place.country}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Row: Large Temperature & Current Weather Icon */}
          <div className="flex items-end justify-between pt-6">
            <div className={tempBadgeClass}>
              <span className="text-5xl sm:text-6xl font-black tracking-tighter">
                {tempVal}
              </span>
              <span className="text-2xl sm:text-3xl font-bold opacity-90">
                {tempUnitStr}
              </span>
            </div>

            <WeatherIcon
              code={w.current.code}
              isDay={w.current.is_day}
              className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </section>

      {/* 3. CURRENT CONDITIONS DETAILS CARD */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">
              {conditionLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {w.current.is_day ? t("daytime", "Daytime") : t("nighttime", "Nighttime")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <span>
              ↑ {maxTemp}{tempUnitStr} • ↓ {minTemp}{tempUnitStr}
            </span>
            <span className="text-[11px] opacity-75">
              • {t("now", "Now")}
            </span>
          </div>
        </div>

        {/* 6 Key Environmental Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Feels Like */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌡️ {t("feels_like", "Feels Like")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {feelsVal}{tempUnitStr}
            </span>
          </div>

          {/* Humidity */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💧 {t("humidity", "Humidity")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.current.humidity}%
            </span>
          </div>

          {/* Wind Speed & Direction */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💨 {t("wind", "Wind")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.wind_speed)} {windUnitStr} {windDirStr}
            </span>
          </div>

          {/* UV Index */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              ☀️ {t("uv_index", "UV Index")}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-bold text-foreground">{uvValFormatted}</span>
              <span className={`text-[11px] font-semibold ${uvInfo.color}`}>
                ({uvInfo.label})
              </span>
            </div>
          </div>

          {/* Rain Probability */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌧️ {t("rain_chance", "Rain Chance")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {rainChanceVal}%
            </span>
          </div>

          {/* Sunrise / Sunset */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌅 {t("sun_times", "Sun Times")}
            </span>
            <span className="text-xs font-bold text-foreground mt-1">
              ↑{sunriseStr} ↓{sunsetStr}
            </span>
          </div>
        </div>
      </section>

      {/* 4. ROLLING 24-HOUR HOURLY FORECAST */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⏱️</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("hourly_forecast", "24-Hour Forecast")}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {w.hourly.length} {t("hours", "hours")}
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {w.hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = getHourlyTimeLabel(h.time, idx, t);
            const hourlyCondition = getConditionLabel(h.code, t);
            const hTemp = Math.round(h.temp);
            const hPop = h.pop ?? 0;

            return (
              <div
                key={`hourly-${idx}`}
                className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 min-w-[70px] shrink-0 text-center space-y-1.5 hover:bg-muted/50 transition"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {timeLabel}
                </span>

                <WeatherIcon
                  code={h.code}
                  isDay={h.is_day}
                  className="w-8 h-8 my-0.5"
                />

                <span className="text-xs font-bold text-foreground">
                  {hTemp}{tempUnitStr}
                </span>

                {hPop > 0 ? (
                  <span className="text-[10px] font-semibold text-blue-500">
                    💧{hPop}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[62px]">
                    {hourlyCondition}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7-DAY EXTENDED FORECAST WITH TRANSLATED LABELS */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("seven_day_forecast", "7-Day Forecast")}
          </h3>
        </div>

        <div className="divide-y divide-border/40">
          {w.daily.slice(0, 7).map((d, idx) => {
            const dayLabel = getDailyDayLabel(d.date, idx, t);
            const dailyCondition = getConditionLabel(d.code, t);
            const dMax = Math.round(d.max);
            const dMin = Math.round(d.min);

            return (
              <div
                key={`daily-${idx}`}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="w-16 font-semibold text-foreground">
                  {dayLabel}
                </span>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <WeatherIcon code={d.code} isDay={true} className="w-6 h-6 shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {dailyCondition}
                  </span>
                </div>

                {d.pop > 0 && (
                  <span className="text-[11px] font-semibold text-blue-500 shrink-0">
                    💧{d.pop}%
                  </span>
                )}

                <div className="flex items-center gap-2 font-semibold text-right shrink-0">
                  <span className="text-foreground">{dMax}{tempUnitStr}</span>
                  <span className="text-muted-foreground font-normal">/ {dMin}{tempUnitStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. WHAT TO WEAR TODAY */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">👔</span>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("what_to_wear", "What to Wear Today")}
            </h3>
          </div>

          <div className="inline-flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => handleSelectCategory("casual")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "casual"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locWearCat.casual}
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory("business")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "business"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locWearCat.business}
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory("sports")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                wearCategory === "sports"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locWearCat.sports}
            </button>
          </div>
        </div>

        <div className="space-y-2.5 text-xs">
          <p className="text-foreground leading-relaxed">
            {clothingDescription}
          </p>

          {finalAccessories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                🎒 {t("essentials", "Recommended Gear")}:
              </span>
              {finalAccessories.map((acc, aIdx) => (
                <span
                  key={`acc-${aIdx}`}
                  className="rounded-lg bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium border border-primary/20"
                >
                  {acc}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Embedded AI Gallery Modal */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          activeCity={w.place.name}
          onSelectBackground={handleSelectBackground}
          onSelectBg={handleSelectBackground}
        />
      )}
    </div>
  );
};

export default WeatherView;
