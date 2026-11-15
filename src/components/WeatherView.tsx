// src/components/WeatherView.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import {
  type Weather,
  type WeatherUnit,
  type Place,
  aqiCategory,
} from "@/lib/weather";
import { WeatherIcon } from "@/lib/weatherIcons";
import { useTranslation } from "react-i18next";
import {
  getAllAvailableArtworks,
  getCityWeatherBackground,
} from "@/lib/aiWatercolorGenerator";
import { AiGalleryModal } from "@/components/AiGalleryModal";
import {
  type SavedItem,
  getWallpaperItem,
  setWallpaperItem,
  deleteWallpaperItem,
  getSavedArtworks,
  migrateLegacyLocalStorage,
} from "@/lib/wallpaperStorage";
import { WeatherMascot } from "@/components/WeatherMascot";
import { AstronomyTracker } from "@/components/AstronomyTracker";

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

// Localized AQI Health Advisories
function getAqiAdvisory(
  level: "good" | "moderate" | "sensitive" | "unhealthy" | "very_unhealthy" | "hazardous",
  lang: string,
  t: TFunction
): { label: string; advice: string } {
  switch (level) {
    case "good":
      return {
        label: t("aqi_good", lang === "th" ? "คุณภาพอากาศดี" : "Good"),
        advice: t(
          "aqi_good_desc",
          lang === "th"
            ? "อากาศบริสุทธิ์ เหมาะอย่างยิ่งสำหรับกิจกรรมและออกกำลังกายกลางแจ้ง"
            : "Air quality is ideal for all outdoor activities and exercise."
        ),
      };
    case "moderate":
      return {
        label: t("aqi_moderate", lang === "th" ? "ปานกลาง" : "Moderate"),
        advice: t(
          "aqi_moderate_desc",
          lang === "th"
            ? "คุณภาพอากาศยอมรับได้ ผู้ที่ไวต่อฝุ่นละอองควรสังเกตอาการหากอยู่กลางแจ้งนาน"
            : "Air quality is acceptable; unusually sensitive individuals should observe symptoms."
        ),
      };
    case "sensitive":
      return {
        label: t("aqi_sensitive", lang === "th" ? "เริ่มมีผลกระทบต่อสุขภาพ" : "Unhealthy for Sensitive Groups"),
        advice: t(
          "aqi_sensitive_desc",
          lang === "th"
            ? "เด็ก ผู้สูงอายุ และผู้ป่วยทางเดินหายใจควรสวมหน้ากากอนามัย และลดกิจกรรมกลางแจ้ง"
            : "Children, seniors, and sensitive individuals should wear a mask and limit outdoor exertion."
        ),
      };
    case "unhealthy":
      return {
        label: t("aqi_unhealthy", lang === "th" ? "มีผลกระทบต่อสุขภาพ" : "Unhealthy"),
        advice: t(
          "aqi_unhealthy_desc",
          lang === "th"
            ? "ทุกคนควรสวมหน้ากาก N95 กลางแจ้ง หลีกเลี่ยงการออกกำลังกายกลางแจ้ง และปิดหน้าต่าง"
            : "Everyone should wear an N95 mask outdoors, avoid outdoor workouts, and close windows."
        ),
      };
    case "very_unhealthy":
      return {
        label: t("aqi_very_unhealthy", lang === "th" ? "มีผลกระทบต่อสุขภาพมาก" : "Very Unhealthy"),
        advice: t(
          "aqi_very_unhealthy_desc",
          lang === "th"
            ? "แจ้งเตือนสุขภาพ: ควรสวมหน้ากาก N95 ทุกครั้งที่ออกนอกอาคาร และเปิดเครื่องฟอกอากาศ"
            : "Health alert: Wear an N95 mask outdoors, keep windows sealed, and use air purifiers."
        ),
      };
    case "hazardous":
    default:
      return {
        label: t("aqi_hazardous", lang === "th" ? "อันตรายร้ายแรง" : "Hazardous"),
        advice: t(
          "aqi_hazardous_desc",
          lang === "th"
            ? "ภาวะฉุกเฉินด้านมลพิษ: งดกิจกรรมกลางแจ้งทุกชนิด สวมหน้ากาก N95 มิดชิดตลอดเวลา"
            : "Emergency conditions: Avoid all outdoor physical activity. Keep an N95 mask sealed."
        ),
      };
  }
}

const TAG_TRANSLATION_MAP: Record<string, string> = {
  "TMD Alert": "alert_thunderstorm_tag",
  "TMD Warning": "alert_thunderstorm_tag",
  "Earthquake": "alert_earthquake_tag",
  "Earthquake Alert": "alert_earthquake_tag",
  "Flood Watch": "alert_flood_tag",
  "Rain Advisory": "alert_rain_tag",
  "Severe Storm": "alert_thunderstorm_tag",
  "High Wind": "alert_hazard",
  "Extreme Heat": "alert_hazard",
  "Severe Freeze": "alert_hazard",
  "NWS Alert": "alert_hazard",
  "Air Quality": "air_quality",
  "Marine Warning": "alert_advisory",
};

const WEAR_CATEGORIES = {
  en: { casual: "Casual", business: "Office / Business", sports: "Athletic / Outdoor" },
  th: { casual: "ลำลอง / สบายๆ", business: "ทำงาน / สุภาพ", sports: "ออกกำลังกาย / ลุยๆ" },
  es: { casual: "Casual", business: "Oficina / Negocios", sports: "Deportivo / Aire libre" },
  ja: { casual: "カジュアル", business: "ビジネス", sports: "スポーツ" },
  zh: { casual: "休闲日常", business: "商务通勤", sports: "运动健身" },
  hi: { casual: "कैज़ुअल", business: "कार्यालय", sports: "खेलकूद" },
  fr: { casual: "Décontracté", business: "Bureau / Travail", sports: "Sport / Extérieur" },
  de: { casual: "Freizeit", business: "Büro / Business", sports: "Sport / Outdoor" },
  pt: { casual: "Casual", business: "Trabalho / Social", sports: "Esportivo / Ar livre" },
  ru: { casual: "Повседневная", business: "Офис / Работа", sports: "Спорт / Активный отдых" },
  ar: { casual: "يومي / كاجوال", business: "عمل / رسمي", sports: "رياضي / خارجي" },
  ko: { casual: "캐주얼", business: "오피스 / 출근룩", sports: "운동 / 아웃도어" },
  id: { casual: "Santai", business: "Kantor / Kerja", sports: "Olahraga / Luar ruangan" },
  vi: { casual: "Thường ngày", business: "Công sở / Đi làm", sports: "Thể thao / Ngoài trời" },
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
    n95Mask: "😷 N95 particulate mask for PM2.5 / smog",
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
    n95Mask: "😷 หน้ากาก N95 ป้องกันฝุ่น PM2.5 / ควันพิษ",
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
    n95Mask: "😷 Mascarilla N95 para partículas PM2.5 y humo",
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
    n95Mask: "😷 微粒子・PM2.5対策用N95マスク",
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
    n95Mask: "😷 防霾防颗粒物 N95 口罩",
  },
  hi: {
    umbrella: "छाता या रेनकोट",
    sunglasses: "यूवी चश्मा और टोपी",
    sunscreen: "एसपीएफ 50+ सनस्क्रीन",
    water: "ठंडा पानी",
    windbreaker: "विंडप्रूफ जैकेट",
    heavyCoat: "गर्म कोट और दस्ताने",
    lightJacket: "हल्की जैकेट",
    warmBeanie: "टोपी और मफलर",
    n95Mask: "😷 स्मॉग और PM2.5 के लिए N95 मास्क",
  },
  fr: {
    umbrella: "Parapluie compact ou imperméable",
    sunglasses: "Lunettes de soleil UV & chapeau",
    sunscreen: "Crème solaire résistante SPF 50+",
    water: "Gourde d'eau fraîche",
    windbreaker: "Veste coupe-vent respirante",
    heavyCoat: "Manteau d'hiver chaud & gants",
    lightJacket: "Veste légère ou pull fin",
    warmBeanie: "Bonnet en laine, écharpe & chaussettes chaudes",
    n95Mask: "😷 Masque N95 / FFP2 anti-particules PM2.5",
  },
  de: {
    umbrella: "Kompakter Regenschirm oder Regenmantel",
    sunglasses: "UV-Sonnenbrille & Sonnenhut",
    sunscreen: "Wasserfeste Sonnencreme LSF 50+",
    water: "Trinkflasche mit kaltem Wasser",
    windbreaker: "Atmungsaktive Windjacke",
    heavyCoat: "Warmer Wintermantel & Handschuhe",
    lightJacket: "Leichte Jacke oder Pullover",
    warmBeanie: "Wollmütze, Schal & Thermosocken",
    n95Mask: "😷 N95 / FFP2 Feinstaubmaske gegen PM2.5",
  },
  pt: {
    umbrella: "Guarda-chuva compacto ou capa de chuva",
    sunglasses: "Óculos de sol UV e chapéu",
    sunscreen: "Protetor solar resistente SPF 50+",
    water: "Garrafa de água gelada",
    windbreaker: "Jaqueta corta-vento",
    heavyCoat: "Casaco de inverno térmico & luvas",
    lightJacket: "Jaqueta leve ou suéter",
    warmBeanie: "Gorro de lã, cachecol e meias quentes",
    n95Mask: "😷 Máscara N95 contra partículas PM2.5 e fumaça",
  },
  ru: {
    umbrella: "Компактный зонт или дождевик",
    sunglasses: "Солнцезащитные очки UV и панама",
    sunscreen: "Водостойкий солнцезащитный крем SPF 50+",
    water: "Бутылка с прохладной водой",
    windbreaker: "Ветрозащитная легкая куртка",
    heavyCoat: "Теплое зимнее пальто/пуховик и перчатки",
    lightJacket: "Легкая ветровка или джемпер",
    warmBeanie: "Вязаная шапка, шарф и теплые носки",
    n95Mask: "😷 Респиратор N95 от смога и PM2.5",
  },
  ar: {
    umbrella: "مظلة مدمجة أو معطف مطر",
    sunglasses: "نظارات شمسية وقبعة",
    sunscreen: "واقي شمس مقاوم للماء SPF 50+",
    water: "قارورة ماء بارد",
    windbreaker: "سترة خفيفة واقية من الرياح",
    heavyCoat: "معطف شتوي دافئ وقفازات",
    lightJacket: "سترة خفيفة أو كنزة",
    warmBeanie: "قبعة صوفية ووشاح",
    n95Mask: "😷 كمامة N95 واقية من الغبار وPM2.5",
  },
  ko: {
    umbrella: "접이식 우산 또는 우비",
    sunglasses: "자외선 차단 선글라스 & 모자",
    sunscreen: "워터프루프 선크림 SPF 50+",
    water: "휴대용 물병 또는 시원한 물",
    windbreaker: "방풍 윈드브레이커",
    heavyCoat: "두꺼운 겨울 패딩 코트 & 장갑",
    lightJacket: "가벼운 재킷 또는 가디건",
    warmBeanie: "비니 모자, 목도리 & 보온 양말",
    n95Mask: "😷 미세먼지(PM2.5) 차단 N95 마스크",
  },
  id: {
    umbrella: "Payung lipat atau jas hujan",
    sunglasses: "Kacamata hitam UV & topi matahari",
    sunscreen: "Tabir surya tahan air SPF 50+",
    water: "Botol air dingin",
    windbreaker: "Jaket pelindung angin",
    heavyCoat: "Mantel musim dingin tebal & sarung tangan",
    lightJacket: "Jaket tipis atau sweter",
    warmBeanie: "Kupluk rajut, syal & kaus kaki tebal",
    n95Mask: "😷 Masker N95 pelindung debu PM2.5 & polusi",
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
    n95Mask: "😷 Khẩu trang N95 chống bụi mịn PM2.5",
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
  isFav = false,
  onToggleFavorite,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const w = weather || weatherProp;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeWallpaperUrl, setActiveWallpaperUrl] = useState<string | null>(customBgUrl || null);
  const [artIndex, setArtIndex] = useState(0);
  const [savedSlots, setSavedSlots] = useState<SavedItem[]>([]);
  const [wearCategory, setWearCategory] = useState<WearCategory>("casual");

  // Load saved slots from IndexedDB with migration fallback
  useEffect(() => {
    migrateLegacyLocalStorage().then(() => {
      getSavedArtworks().then((list) => {
        setSavedSlots(list);
      });
    });
  }, []);

  // Listen for custom wallpaper updates across tabs/windows
  useEffect(() => {
    const handleStorageChange = () => {
      getSavedArtworks().then((list) => {
        setSavedSlots(list);
      });
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("weather:custom-art-saved-updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("weather:custom-art-saved-updated", handleStorageChange);
    };
  }, []);

  // Sync external customBgUrl
  useEffect(() => {
    if (customBgUrl) {
      setActiveWallpaperUrl(customBgUrl);
    }
  }, [customBgUrl]);

  // Read saved category choice
  useEffect(() => {
    const saved = localStorage.getItem("weather:wearCategory") as WearCategory;
    if (saved && ["casual", "business", "sports"].includes(saved)) {
      setWearCategory(saved);
    }
  }, []);

  const handleSelectCategory = (cat: WearCategory) => {
    setWearCategory(cat);
    try {
      localStorage.setItem("weather:wearCategory", cat);
    } catch {}
  };

  // Curated art catalog
  const curatedArtworks = getAllAvailableArtworks();

  // Cycle next artwork: saved slots first, then curated
  const cycleNextArtwork = useCallback(() => {
    const combined: string[] = [
      ...savedSlots.map((s) => s.dataUrl).filter(Boolean),
      ...curatedArtworks.map((a) => a.url),
    ];

    if (combined.length === 0) return;

    const nextIdx = (artIndex + 1) % combined.length;
    setArtIndex(nextIdx);
    const chosen = combined[nextIdx];
    setActiveWallpaperUrl(chosen);

    if (onSelectBg) onSelectBg(chosen);
    if (onSelectBackground) onSelectBackground(chosen);
  }, [artIndex, curatedArtworks, savedSlots, onSelectBg, onSelectBackground]);

  const handleSelectBackground = (url: string) => {
    setActiveWallpaperUrl(url);
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  const openGalleryModal = () => {
    if (onOpenAiGallery) {
      onOpenAiGallery();
    } else {
      setGalleryOpen(true);
    }
  };

  if (loading && !w) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-center animate-pulse">
        <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">{t("loading_weather", "Loading weather data...")}</p>
      </div>
    );
  }

  if (!w) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <span className="text-4xl mb-3">⛅</span>
        <h3 className="text-base font-semibold text-foreground">{t("no_weather_data", "No weather data")}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {t("no_weather_desc", "Search for a city or use your current location to view live weather, air quality, and astronomy.")}
        </p>
      </div>
    );
  }

  // Determine active background artwork
  const fallbackBg = getCityWeatherBackground(
    w.place.name,
    w.current.code,
    w.current.is_day === 1
  );
  const displayBg = activeWallpaperUrl || fallbackBg;

  // Weather variables
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const speedUnitStr = unit === "imperial" ? "mph" : "km/h";
  const pressureUnitStr = "hPa";
  const visUnitStr = unit === "imperial" ? "mi" : "km";

  const conditionLabel = getConditionLabel(w.current.code, t);
  const feelsLikeVal = Math.round(w.current.apparent_temperature ?? w.current.temp);
  const windDir = getWindDirectionLabel(w.current.wind_direction ?? 0);
  const uvNum = typeof w.current.uv_index === "number" ? Math.round(w.current.uv_index) : 0;
  const uvInfo = getUvIndexLabel(uvNum, t);

  // Daily high / low
  const todayDaily = w.daily[0];
  const maxTemp = todayDaily ? Math.round(todayDaily.max) : Math.round(w.current.temp);
  const minTemp = todayDaily ? Math.round(todayDaily.min) : Math.round(w.current.temp);
  const rainChanceVal = todayDaily?.pop ?? 0;

  // Sun times
  let sunriseStr = "--:--";
  let sunsetStr = "--:--";
  if (todayDaily?.sunrise) {
    try {
      const parts = todayDaily.sunrise.split("T")[1];
      sunriseStr = parts ? parts.slice(0, 5) : todayDaily.sunrise;
    } catch {}
  }
  if (todayDaily?.sunset) {
    try {
      const parts = todayDaily.sunset.split("T")[1];
      sunsetStr = parts ? parts.slice(0, 5) : todayDaily.sunset;
    } catch {}
  }

  // Active Alerts combined
  const alertsToDisplay = activeAlerts.length > 0 ? activeAlerts : disasters;

  // Air Quality & PM2.5 calculation
  const aqiVal = typeof w.current?.aqi === "number" ? Math.round(w.current.aqi) : undefined;
  const pm25Val = typeof w.current?.pm25 === "number" ? w.current.pm25 : undefined;
  const pm10Val = typeof w.current?.pm10 === "number" ? w.current.pm10 : undefined;

  // Compute AQI category & localized advice
  const effectiveAqi = aqiVal !== undefined ? aqiVal : (pm25Val ? Math.round(pm25Val * 3) : 35);
  const aqiCategoryInfo = aqiCategory(effectiveAqi);
  const aqiAdvisoryInfo = getAqiAdvisory(aqiCategoryInfo.level, lang, t);

  // What to Wear Advice calculation
  const locWearCat =
    WEAR_CATEGORIES[lang as keyof typeof WEAR_CATEGORIES] || WEAR_CATEGORIES.en;
  const locAccessory =
    ACCESSORY_LABELS[lang as keyof typeof ACCESSORY_LABELS] || ACCESSORY_LABELS.en;

  const tempC = unit === "imperial" ? ((w.current.temp - 32) * 5) / 9 : w.current.temp;
  const code = w.current.code;
  const isRaining = code >= 95 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isFreezing = tempC <= 0;
  const isCold = tempC > 0 && tempC <= 14;
  const isMild = tempC > 14 && tempC <= 23;
  const isWarm = tempC > 23 && tempC <= 30;
  const isVeryHot = tempC > 30;

  let clothingDescription = "";
  if (wearCategory === "business") {
    if (isFreezing || isCold) {
      clothingDescription =
        lang === "th"
          ? "เสื้อโค้ตสูทผ้าวูล เสื้อเชิ้ตแขนยาว กางเกงสแล็ค และรองเท้าคัทชูหนังกันหนาว"
          : "Tailored wool overcoat or blazer, dress shirt, formal trousers, and leather dress shoes.";
    } else if (isVeryHot) {
      clothingDescription =
        lang === "th"
          ? "เสื้อเชิ้ตผ้าลินินหรือคอตตอนระบายอากาศ กางเกงสแล็คผ้าเบา พร้อมสูทบางสำหรับประชุม"
          : "Breathable linen/cotton dress shirt, lightweight dress chinos, and loafers.";
    } else {
      clothingDescription =
        lang === "th"
          ? "ชุดทำงานสุภาพ สูทเบลเซอร์ลำลอง เสื้อเชิ้ต หรือเดรสทำงานเรียบหรู"
          : "Smart business casual blazer, crisp button-down, tailored trousers, and dress shoes.";
    }
  } else if (wearCategory === "sports") {
    if (isFreezing || isCold) {
      clothingDescription =
        lang === "th"
          ? "ชุดวิ่งแขนยาวแนบเนื้อ เสื้อกั๊กกันลม กางเกงเลกกิ้งกันหนาว และรองเท้าวิ่งเสริมการยึดเกาะ"
          : "Thermal compression base layer, windproof running vest, thermal tights, and running shoes.";
    } else if (isVeryHot) {
      clothingDescription =
        lang === "th"
          ? "เสื้อกล้ามหรือเสื้อวิ่งระบายเหงื่อ Quick-dry กางเกงขาสั้นวิ่ง หมวกวิ่ง และแว่นกันแดด"
          : "Ultra-breathable singlet or quick-dry tee, running shorts, sweatband, and sports sunglasses.";
    } else {
      clothingDescription =
        lang === "th"
          ? "เสื้อยืดกีฬาผ้าระบายอากาศ กางเกงวอร์มหรือเลกกิ้ง และรองเท้ากีฬาคู่โปรด"
          : "Athletic moisture-wicking tee, comfortable joggers or shorts, and running sneakers.";
    }
  } else {
    // casual default
    if (isFreezing) {
      clothingDescription =
        lang === "th"
          ? "เสื้อขนเป็ดหนาพิเศษ เสื้อฮีทเทค กางเกงขายาวบุขน ถุงมือ และรองเท้าบูท"
          : "Heavy down parka, thermal base layer, insulated trousers, warm boots, and fleece-lined gloves.";
    } else if (isCold) {
      clothingDescription =
        lang === "th"
          ? "เสื้อสเวตเตอร์หรือแจ็คเก็ตยีนส์ กางเกงขายาว และรองเท้าผ้าใบหุ้มส้น"
          : "Cozy knit sweater or denim jacket, comfortable trousers/jeans, and sturdy sneakers.";
    } else if (isMild) {
      clothingDescription =
        lang === "th"
          ? "เสื้อยืดคอตตอนสบายๆ คลุมด้วยคาร์ดิแกนบาง และกางเกงยีนส์ตัวเก่ง"
          : "Classic cotton t-shirt paired with a light cardigan or overshirt and comfortable chinos.";
    } else if (isVeryHot) {
      clothingDescription =
        lang === "th"
          ? "เสื้อยืดคอตตอนบาง กางเกงขาสั้นผ้าเบา แว่นกันแดด และรองเท้าแตะหรือผ้าใบโปร่ง"
          : "Breathable airy cotton t-shirt, casual linen shorts, UV sunglasses, and canvas shoes.";
    } else {
      clothingDescription =
        lang === "th"
          ? "เสื้อยืดหรือเสื้อเชิ้ตลำลอง กางเกงยีนส์ตัวโปรด และรองเท้าผ้าใบสบายเท้า"
          : "Comfortable casual tee or polo, relaxed jeans or chinos, and everyday walking sneakers.";
    }
  }

  // Accessories logic with automatic N95 mask recommendation when PM2.5 or AQI is elevated
  const accessories: string[] = [];

  // 1. High Pollution Alert: Prioritize N95 Mask
  if ((pm25Val && pm25Val >= 35.5) || (aqiVal && aqiVal >= 101)) {
    accessories.push(locAccessory.n95Mask || "😷 N95 Mask for PM2.5");
  }

  // 2. Weather conditions
  if (isRaining) accessories.push(locAccessory.umbrella);
  if (tempC <= 5) accessories.push(locAccessory.heavyCoat, locAccessory.warmBeanie);
  if (uvNum >= 6) accessories.push(locAccessory.sunglasses, locAccessory.sunscreen);
  if (isVeryHot) accessories.push(locAccessory.water);
  if ((w.current.wind_speed ?? 0) >= 28) accessories.push(locAccessory.windbreaker);
  if (tempC >= 12 && tempC <= 18 && accessories.length < 2) accessories.push(locAccessory.lightJacket);

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full pb-8">
      {/* 1. ACTIVE WEATHER & DISASTER ALERTS TICKER */}
      {alertsToDisplay.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 overflow-hidden shadow-xs">
          <div className="p-3 flex items-start gap-3">
            <span className="text-xl shrink-0 animate-bounce">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                  {t("active_disaster_alerts", "Active Weather Alerts")}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 font-semibold text-destructive">
                  {alertsToDisplay.length} {alertsToDisplay.length === 1 ? t("alert_single", "Alert") : t("alert_plural", "Alerts")}
                </span>
              </div>
              <div className="mt-1 space-y-1.5">
                {alertsToDisplay.map((alert, idx) => {
                  const tagKey = alert.tag ? TAG_TRANSLATION_MAP[alert.tag] : undefined;
                  const tagText = tagKey ? t(tagKey, alert.tag) : alert.tag;
                  const headlineText =
                    lang === "th" && alert.headlineTh
                      ? alert.headlineTh
                      : alert.headline || alert.text || t("alert_warning", "Warning issued");

                  return (
                    <div
                      key={alert.id || idx}
                      className="text-xs text-foreground/90 flex items-baseline gap-1.5"
                    >
                      {tagText && (
                        <span className="font-bold text-destructive shrink-0">
                          [{tagText}]
                        </span>
                      )}
                      <span className="line-clamp-2 leading-relaxed">
                        {headlineText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTION CONTROLS BAR: NEXT ART -> AI GALLERY -> REFRESH -> FAVORITE */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <button
          type="button"
          onClick={cycleNextArtwork}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-muted/70 hover:bg-muted text-foreground transition cursor-pointer active:scale-95"
          title={t("cycle_art_desc", "Cycle to next watercolor art or saved slot")}
        >
          <span>🎨</span>
          <span>{t("next_artwork", "Next Art")}</span>
        </button>

        <button
          type="button"
          onClick={openGalleryModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer active:scale-95 border border-primary/20"
          title={t("ai_gallery_slots", "AI Gallery & Wallpaper Slots")}
        >
          <span>🖼️</span>
          <span>{t("ai_gallery", "AI Gallery")}</span>
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 text-xs font-medium rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer active:scale-95"
            title={t("refresh_weather", "Refresh Weather")}
          >
            🔄
          </button>

          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`p-2 text-xs font-medium rounded-xl transition cursor-pointer active:scale-95 ${
                isFav
                  ? "text-rose-500 bg-rose-500/10 hover:bg-rose-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isFav ? t("remove_fav", "Remove Favorite") : t("add_fav", "Add Favorite")}
            >
              {isFav ? "❤️" : "🤍"}
            </button>
          )}
        </div>
      </div>

      {/* 3. WEATHER HERO CARD WITH WATERCOLOR ART & MASCOT */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md text-foreground min-h-[300px] flex flex-col justify-between p-5 sm:p-6 transition-all duration-300">
        {/* Watercolor Wallpaper Background with Contrast Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${displayBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30 dark:from-background/95 dark:via-background/70 dark:to-background/40 pointer-events-none backdrop-blur-[1px]" />

        {/* Card Header: Place & Weather Mascot Companion */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground drop-shadow-xs">
                {w.place.name}
              </h2>
              {w.place.country && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-background/80 font-bold backdrop-blur-md border border-border/60 text-muted-foreground">
                  {w.place.country}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {t("updated_just_now", "Live Conditions")} • {w.place.admin1 || w.place.country || ""}
            </p>
          </div>

          {/* Interactive Mascot Companion */}
          <div className="shrink-0">
            <WeatherMascot weather={w} />
          </div>
        </div>

        {/* Card Body: Temperature & Weather Icon */}
        <div className="relative z-10 my-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline">
              <span className="text-5xl sm:text-6xl font-black tracking-tighter text-foreground drop-shadow-sm">
                {Math.round(w.current.temp)}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-primary ml-1">
                {tempUnitStr}
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-foreground/90 capitalize mt-1 flex items-center gap-1.5">
              <span>{conditionLabel}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {t("feels_like", "Feels like")} {feelsLikeVal}{tempUnitStr} • ↑{maxTemp}{tempUnitStr} ↓{minTemp}{tempUnitStr}
            </p>
          </div>

          <div className="shrink-0 p-3 rounded-2xl bg-background/60 backdrop-blur-md border border-border/50 shadow-xs">
            <WeatherIcon
              code={w.current.code}
              isDay={w.current.is_day}
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md"
            />
          </div>
        </div>

        {/* Card Footer: Quick Stats */}
        <div className="relative z-10 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center text-xs font-medium">
          <div className="bg-background/60 backdrop-blur-md py-1.5 px-2 rounded-xl border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{t("humidity", "Humidity")}</span>
            <span className="font-bold text-foreground">{w.current.humidity ?? "--"}%</span>
          </div>
          <div className="bg-background/60 backdrop-blur-md py-1.5 px-2 rounded-xl border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{t("wind", "Wind")}</span>
            <span className="font-bold text-foreground">{Math.round(w.current.wind_speed ?? 0)} {speedUnitStr}</span>
          </div>
          <div className="bg-background/60 backdrop-blur-md py-1.5 px-2 rounded-xl border border-border/40">
            <span className="text-[10px] text-muted-foreground block">{t("uv_index", "UV Index")}</span>
            <span className={`font-bold ${uvInfo.color}`}>{uvNum} ({uvInfo.label})</span>
          </div>
        </div>
      </section>

      {/* 4. CURRENT CONDITIONS DETAILED METRICS GRID */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
          <span className="text-base">📊</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("current_conditions", "Current Conditions")}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Feels Like */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              🌡️ {t("feels_like", "Feels Like")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {feelsLikeVal}{tempUnitStr}
            </span>
          </div>

          {/* Humidity */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💧 {t("humidity", "Humidity")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.current.humidity ?? "--"}%
            </span>
          </div>

          {/* Wind Speed & Direction */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              💨 {t("wind", "Wind")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.wind_speed ?? 0)} {speedUnitStr} {windDir}
            </span>
          </div>

          {/* Pressure */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              ⏱️ {t("pressure", "Pressure")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {Math.round(w.current.pressure ?? 1013)} {pressureUnitStr}
            </span>
          </div>

          {/* Visibility */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              👁️ {t("visibility", "Visibility")}
            </span>
            <span className="text-sm font-bold text-foreground mt-1">
              {w.current.visibility !== undefined ? Math.round(w.current.visibility) : "--"} {visUnitStr}
            </span>
          </div>

          {/* UV Index */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              ☀️ {t("uv_index", "UV Index")}
            </span>
            <span className={`text-sm font-bold mt-1 ${uvInfo.color}`}>
              {uvNum} <span className="text-[11px] font-medium text-muted-foreground">({uvInfo.label})</span>
            </span>
          </div>

          {/* Rain Chance */}
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

        {/* Live Air Quality & PM2.5 Health Impact Banner */}
        {(aqiVal !== undefined || pm25Val !== undefined) && (
          <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition mt-1.5 ${aqiCategoryInfo.bg}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">🍃</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("air_quality", "Air Quality (AQI)")}
                  </span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${aqiCategoryInfo.color} ${aqiCategoryInfo.bg}`}>
                    {aqiVal !== undefined ? aqiVal : (pm25Val ? Math.round(pm25Val * 3) : "--")} • {aqiAdvisoryInfo.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {aqiAdvisoryInfo.advice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-center border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-3">
              {pm25Val !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">PM2.5</span>
                  <span className="font-bold text-foreground">
                    {pm25Val} <span className="text-[10px] font-normal text-muted-foreground">µg/m³</span>
                  </span>
                </div>
              )}
              {pm10Val !== undefined && (
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">PM10</span>
                  <span className="font-bold text-foreground">
                    {pm10Val} <span className="text-[10px] font-normal text-muted-foreground">µg/m³</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sun Arc & Moon Phase Astronomy Tracker */}
      <AstronomyTracker weather={w} />

      {/* 5. WHAT TO WEAR TODAY (Directly under Current Conditions) */}
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

        <p className="text-xs text-foreground/90 leading-relaxed font-medium">
          {clothingDescription}
        </p>

        {accessories.length > 0 && (
          <div className="pt-2 border-t border-border/40 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("recommended_accessories", "Recommended Gear")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {accessories.map((acc, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border/50 text-xs font-medium text-foreground"
                >
                  {acc}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. 24-HOUR HOURLY FORECAST WITH PRINTED CONDITIONS */}
      <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🕒</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("hourly_forecast", "24-Hour Forecast")}
          </h3>
        </div>

        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {w.hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = getHourlyTimeLabel(h.time, idx, t);
            const hourlyCondition = getConditionLabel(h.code, t);
            const hTemp = Math.round(h.temp);
            const hPop = h.pop ?? 0;

            return (
              <div
                key={`hour-${idx}`}
                className="flex-shrink-0 w-20 p-2.5 rounded-xl bg-muted/30 border border-border/40 flex flex-col items-center justify-between text-center gap-1.5 snap-start transition hover:bg-muted/50"
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {timeLabel}
                </span>

                <WeatherIcon code={h.code} isDay={h.is_day} className="w-8 h-8 shrink-0 my-1" />

                <span className="text-xs font-bold text-foreground">
                  {hTemp}{tempUnitStr}
                </span>

                {/* Printed Weather Condition Words */}
                <span
                  className="text-[10px] font-medium text-muted-foreground line-clamp-1 max-w-[72px]"
                  title={hourlyCondition}
                >
                  {hourlyCondition}
                </span>

                {hPop > 0 && (
                  <span className="text-[10px] font-semibold text-blue-500">
                    💧{hPop}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. 7-DAY EXTENDED FORECAST WITH TRANSLATED LABELS */}
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
                  <WeatherIcon code={d.code} isDay={1} className="w-6 h-6 shrink-0" />
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

      {/* Embedded AI Gallery Modal */}
      {galleryOpen && (
        <AiGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          city={w.place.name}
          onSelectBackground={handleSelectBackground}
          onSelectBg={handleSelectBackground}
        />
      )}
    </div>
  );
};

export default WeatherView;
