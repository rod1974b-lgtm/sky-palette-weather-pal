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
    n95Mask: "😷 N95 防霾防颗粒物口罩",
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
  isFav,
  onToggleFavorite,
  onOpenAiGallery,
  customBgUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.toLowerCase().split("-")[0] || "en";
  const w = weather || weatherProp;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>(customBgUrl || "");
  const [savedSlots, setSavedSlots] = useState<SavedItem[]>([]);
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

  // 1. Initialize IndexedDB migration & load saved slot artworks
  const reloadSlots = useCallback(async () => {
    try {
      await migrateLegacyLocalStorage();
      const slots = await getSavedArtworks();
      setSavedSlots(slots);
      return slots;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    reloadSlots();
  }, [reloadSlots]);

  // 2. Load hero background from IndexedDB with city, slot, and landmark fallbacks
  useEffect(() => {
    if (!w?.place) return;
    let isCurrent = true;

    async function loadBackground() {
      if (customBgUrl) {
        if (isCurrent) setHeroBgUrl(customBgUrl);
        return;
      }

      // 1. Check city-specific custom wallpaper from IndexedDB
      if (cityStorageKey) {
        const savedCityBg = await getWallpaperItem(cityStorageKey);
        if (savedCityBg && isCurrent) {
          setHeroBgUrl(savedCityBg);
          return;
        }
      }

      // 2. Check general current custom wallpaper
      const savedCurrentBg = await getWallpaperItem("weather:custom-bg:current");
      if (savedCurrentBg && isCurrent) {
        setHeroBgUrl(savedCurrentBg);
        return;
      }

      // 3. Check user's saved slots (Slot 1, Slot 2, Slot 3...)
      const slots = await reloadSlots();
      if (slots.length > 0) {
        const cityMatch = slots.find((s) =>
          s.title.toLowerCase().includes(w?.place?.name.toLowerCase().trim() || "")
        );
        const targetSlot = cityMatch || slots[0];
        if (targetSlot?.url && isCurrent) {
          setHeroBgUrl(targetSlot.url);
          return;
        }
      }

      // 4. Curated Landmark Watercolor Fallback
      if (!isCurrent) return;
      const conditionStr = getConditionLabel(w.current.code, t);
      const landmarkArts = getAllAvailableArtworks(
        w.place.name,
        w.current.code,
        conditionStr,
        w.place.country,
        w.place.lat,
        w.place.lon
      );

      if (landmarkArts.length > 0 && isCurrent) {
        setHeroBgUrl(landmarkArts[0]);
      } else {
        getCityWeatherBackground(
          w.place.name,
          conditionStr,
          w.current.code,
          w.current.temp,
          (loadedUrl) => {
            if (isCurrent) setHeroBgUrl(loadedUrl);
          },
          w.place.country,
          w.place.lat,
          w.place.lon
        )
          .then((res) => {
            if (res?.initialBg && !res.initialBg.startsWith("linear-gradient") && isCurrent) {
              setHeroBgUrl(res.initialBg);
            }
          })
          .catch(() => {});
      }
    }

    loadBackground();

    return () => {
      isCurrent = false;
    };
  }, [w?.place?.name, w?.current?.code, cityStorageKey, customBgUrl, reloadSlots, t]);

  // 3. Auto-detect whether the hero background picture is dark or light
  useEffect(() => {
    if (!heroBgUrl) {
      setIsDarkArtwork(!w?.current?.is_day);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = heroBgUrl;
    img.onload = () => {
      if (!active) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, 16, 16);
          const data = ctx.getImageData(0, 0, 16, 16).data;
          let r = 0,
            g = 0,
            b = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          const count = data.length / 4;
          const brightness = (r / count) * 0.299 + (g / count) * 0.587 + (b / count) * 0.114;
          setIsDarkArtwork(brightness < 128);
        }
      } catch {
        setIsDarkArtwork(true);
      }
    };
    img.onerror = () => {
      if (active) setIsDarkArtwork(true);
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

  // 4. Live listener for wallpaper changes from gallery
  useEffect(() => {
    const handleBgChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ city?: string; currentCity?: string; url?: string }>;
      if (customEvent.detail?.url) {
        setHeroBgUrl(customEvent.detail.url);
      }
      reloadSlots();
    };

    window.addEventListener("weather:custom-bg-change", handleBgChange);
    return () => {
      window.removeEventListener("weather:custom-bg-change", handleBgChange);
    };
  }, [reloadSlots]);

  const handleSelectBackground = async (url: string) => {
    setHeroBgUrl(url);
    if (cityStorageKey) {
      if (url) {
        await setWallpaperItem(cityStorageKey, url);
        await setWallpaperItem("weather:custom-bg:current", url);
      } else {
        await deleteWallpaperItem(cityStorageKey);
      }
    }
    if (onSelectBg) onSelectBg(url);
    if (onSelectBackground) onSelectBackground(url);
  };

  // Cycling artwork through Next Art button: Slot 1 -> Slot 2 -> Slot 3 -> ... -> Curated Landmarks
  const handleCycleArtwork = async () => {
    if (!w?.place) return;
    const conditionStr = getConditionLabel(w.current.code, t);
    const landmarkArts = getAllAvailableArtworks(
      w.place.name,
      w.current.code,
      conditionStr,
      w.place.country,
      w.place.lat,
      w.place.lon
    );

    const freshSlots = await reloadSlots();
    const slotUrls = freshSlots.map((s) => s.url);
    const allArts = Array.from(new Set([...slotUrls, ...landmarkArts]));
    if (!allArts || allArts.length === 0) return;

    const currentIdx = allArts.indexOf(heroBgUrl);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % allArts.length : 0;
    setArtIndex(nextIdx);
    const nextUrl = allArts[nextIdx];
    if (nextUrl) {
      handleSelectBackground(nextUrl);
    }
  };

  // Determine if active heroBgUrl is one of user's saved slots
  const currentSlotIndex = savedSlots.findIndex((s) => s.url === heroBgUrl);

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
  const uvNum = typeof w.current.uv === "number" && !isNaN(w.current.uv) ? w.current.uv : 0;
  const uvInfo = getUvIndexLabel(uvNum, t);
  const uvValFormatted = uvNum.toFixed(1);

  // Wind speed & direction
  const windDirStr = getWindDirectionLabel(w.current.wind_dir ?? 0);
  const windUnitStr = unit === "imperial" ? "mph" : "km/h";

  // Pressure & Visibility with defensive optional chaining
  const pressureVal = Math.round(w.current?.pressure ?? 1013);
  const visUnitStr = unit === "imperial" ? "mi" : "km";
  const rawVis = typeof w.current?.vis === "number" ? w.current.vis : 10;
  const visVal = unit === "imperial" ? (rawVis / 1.60934).toFixed(1) : rawVis.toFixed(1);

  // Rain chance
  const rainChanceVal = todayDaily?.pop ?? 0;

  // Sunrise/Sunset formatting
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
  const isSnowing = (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
  const isVeryHot = tempC >= 32;

  let clothingDescription = "";
  if (wearCategory === "business") {
    if (isRaining) {
      clothingDescription =
        lang === "th"
          ? "เสื้อเทรนช์โค้ทกันน้ำ รองเท้าหนังกันน้ำ และพกร่มทำงานคันใหญ่"
          : "Tailored commuter trench coat, water-resistant dress shoes, and a sturdy business umbrella.";
    } else if (isSnowing || tempC <= 5) {
      clothingDescription =
        lang === "th"
          ? "เสื้อโค้ทผ้าวูลตัวยาวทับชุดสูท ผ้าพันคอแคชเมียร์ และถุงมือหนังสุภาพ"
          : "Tailored wool overcoat over suit, cashmere scarf, and insulated dress leather gloves.";
    } else if (tempC <= 14) {
      clothingDescription =
        lang === "th"
          ? "เบลเซอร์ผ้าวูล เสื้อเชิ้ตคัตติ้งเนี้ยบ หรือสเวตเตอร์บางสวมทับเชิ้ต"
          : "Structured wool blazer, crisp dress shirt, and optional fine-knit sweater layer.";
    } else if (isVeryHot) {
      clothingDescription =
        lang === "th"
          ? "เสื้อเชิ้ตผ้าลินินหรือคอตตอนระบายอากาศ กางเกงสแล็คเนื้อเบาโทนสว่าง"
          : "Breathable crisp cotton/linen dress shirt, lightweight tailored trousers, and leather loafers.";
    } else {
      clothingDescription =
        lang === "th"
          ? "เสื้อเชิ้ตทำงานแขนยาว กางเกงสแล็คทรงพอดีตัว และเบลเซอร์มาตรฐาน"
          : "Classic commuter button-down shirt, smart tailored trousers, and clean professional attire.";
    }
  } else if (wearCategory === "sports") {
    if (isRaining) {
      clothingDescription =
        lang === "th"
          ? "เสื้อวิ่งกันน้ำมีฮู้ด กางเกงรัดรูปแห้งไว และรองเท้าวิ่งกริปเกาะถนนเปียก"
          : "Waterproof running shell jacket, quick-dry tights, and trail shoes with wet-grip traction.";
    } else if (isSnowing || tempC <= 5) {
      clothingDescription =
        lang === "th"
          ? "เสื้อเบสเลเยอร์เทอร์มอล แจ็กเก็ตฟลีซกันหนาว หมวกบีนี่ และถุงมือออกกำลังกาย"
          : "Thermal compression base layer, insulated athletic fleece, moisture-wicking beanie & gloves.";
    } else if (tempC <= 14) {
      clothingDescription =
        lang === "th"
          ? "เสื้อแขนยาวผ้าระบายอากาศ เสื้อกั๊กกันลม และกางเกงวอร์มออกกำลังกาย"
          : "Long-sleeve technical athletic shirt, wind vest, and breathable running track pants.";
    } else if (isVeryHot) {
      clothingDescription =
        lang === "th"
          ? "เสื้อกล้ามหรือเสื้อวิ่งระบายเหงื่อ กางเกงขาสั้นเบาพิเศษ และหมวกวิ่งกันแดด"
          : "Ultra-breathable sweat-wicking singlet, split running shorts, and sun-protection sports cap.";
    } else {
      clothingDescription =
        lang === "th"
          ? "เสื้อยืดกีฬาเนื้อดราย กางเกงจ็อกเกอร์ และรองเท้าผ้าใบซัพพอร์ตดี"
          : "Performance technical tee, flexible training joggers, and supportive athletic sneakers.";
    }
  } else {
    // Casual
    if (isRaining) {
      clothingDescription =
        lang === "th"
          ? "เสื้อฮู้ดกันน้ำ กางเกงยีนส์พับขา รองเท้ากันน้ำ และร่มพกพาสีสดใส"
          : "Lightweight hooded waterproof jacket, water-resistant sneakers, and a compact umbrella.";
    } else if (isSnowing || tempC <= 5) {
      clothingDescription =
        lang === "th"
          ? "เสื้อแจ็กเก็ตบุนวมหนานุ่ม เสื้อสเวตเตอร์ไหมพรม และรองเท้าบูทกันลื่น"
          : "Puffer down jacket, cozy fleece/wool sweater, thermal beanie, and insulated boots.";
    } else if (tempC <= 14) {
      clothingDescription =
        lang === "th"
          ? "เสื้อแจ็กเก็ตยีนส์หรือคาร์ดิแกน สวมทับเสื้อยืด และกางเกงขายาวใส่สบาย"
          : "Denim or bomber jacket layered over a casual tee, comfortable denim, and sneakers.";
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

  const finalAccessories = Array.from(new Set(accessories)).slice(0, 3);

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
          <span className="truncate max-w-[150px] sm:max-w-none font-semibold text-foreground">
            {currentSlotIndex >= 0
              ? t("slot_active_badge", `Slot ${currentSlotIndex + 1}`, { slot: currentSlotIndex + 1 })
              : t("watercolor_sky", "AI Watercolor")}
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

      {/* 2. DISASTER & ADVISORY ALERT TICKER BANNER (Active Alerts / All Clear) */}
      <section className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs text-card-foreground">
        {alertsToDisplay.length > 0 ? (
          <div className="flex items-center px-3.5 py-2.5 bg-amber-500/10 text-amber-900 dark:text-amber-200 border-b border-amber-500/20 text-xs">
            <span className="font-bold flex items-center gap-1.5 shrink-0 mr-3">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <span className="sm:hidden">⚠️ ({alertsToDisplay.length})</span>
              <span className="hidden sm:inline">
                {t("alerts", "Weather Alerts")} ({alertsToDisplay.length})
              </span>
            </span>

            <div className="overflow-hidden relative w-full flex items-center">
              <div className="flex items-center gap-6 whitespace-nowrap animate-ticker hover:[animation-play-state:paused] py-0.5">
                {alertsToDisplay.map((alt) => {
                  const tagKey = alt.tagKey || (alt.tag ? TAG_TRANSLATION_MAP[alt.tag] : undefined);
                  const displayTag = tagKey ? t(tagKey, alt.tag || "Advisory") : alt.tag || "Advisory";

                  return (
                    <div key={alt.id} className="inline-flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {displayTag}
                      </span>
                      <span className="font-medium">
                        {lang === "th" && alt.headlineTh
                          ? alt.headlineTh
                          : (alt.headlineEn ?? alt.text ?? alt.headline ?? "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>
              {t("all_clear", "ALL CLEAR")} — {t("all_clear_sub", "No severe weather watches active in this region")}
            </span>
          </div>
        )}
      </section>

      {/* 3. STREAMLINED HERO CARD (Expanded Height & Mascot Companion) */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 p-5 sm:p-6 shadow-lg bg-card text-card-foreground min-h-[290px] sm:min-h-[320px] flex flex-col justify-between">
        {heroBgUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
            style={{
              backgroundImage: `url("${heroBgUrl}")`,
              filter: "brightness(1.02) saturate(1.15)",
            }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between flex-1 w-full">
          {/* Top: City Name & Mascot Companion */}
          <div className="flex items-start justify-between gap-3">
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

            {/* Weather Companion Mascot Widget */}
            <WeatherMascot weather={w} />
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

      {/* 4. CURRENT CONDITIONS DETAILS CARD */}
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

      {/* 6. ROLLING 24-HOUR HOURLY FORECAST WITH PRINTED WEATHER WORDS */}
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
                className="flex flex-col items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 min-w-[76px] shrink-0 text-center space-y-1.5 hover:bg-muted/50 transition"
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
