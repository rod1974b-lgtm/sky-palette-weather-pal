// src/lib/astronomy.ts
// Precision Celestial Engine: Sun Arc, Golden/Blue Hours & Lunar Calculations

export interface MoonPhaseInfo {
  phase: number; // 0 to 1
  ageDays: number; // 0 to 29.5
  illumination: number; // 0 to 100%
  key: MoonPhaseKey;
  icon: string;
  daysToFullMoon: number;
}

export type MoonPhaseKey =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export interface SunArcInfo {
  sunriseStr: string;
  sunsetStr: string;
  isDay: boolean;
  sunProgressPercent: number; // 0 to 100 along the daylight arc (clamped)
  daylightDurationStr: string;
  daylightRemainingStr: string | null;
  timeUntilSunriseStr: string | null;
  morningGoldenHour: { start: string; end: string };
  eveningGoldenHour: { start: string; end: string };
  morningBlueHour: { start: string; end: string };
  eveningBlueHour: { start: string; end: string };
  currentLightState: "golden_hour" | "blue_hour" | "daylight" | "night";
}

const SYNODIC_MONTH = 29.53058867; // Days in an average lunar month
const BASE_NEW_MOON_MS = new Date("2000-01-06T18:14:00Z").getTime();

/**
 * Calculates current Moon phase, surface illumination %, and synodic age.
 */
export function getMoonPhaseInfo(date: Date = new Date()): MoonPhaseInfo {
  const diffDays = (date.getTime() - BASE_NEW_MOON_MS) / (1000 * 60 * 60 * 24);
  const phase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const normalized = phase / SYNODIC_MONTH; // 0.0 to 1.0

  // Standard illumination formula
  const illumination = Math.round(((1 - Math.cos(normalized * 2 * Math.PI)) / 2) * 100);

  let key: MoonPhaseKey = "new_moon";
  let icon = "🌑";

  if (normalized < 0.03 || normalized > 0.97) {
    key = "new_moon";
    icon = "🌑";
  } else if (normalized < 0.22) {
    key = "waxing_crescent";
    icon = "🌒";
  } else if (normalized < 0.28) {
    key = "first_quarter";
    icon = "🌓";
  } else if (normalized < 0.47) {
    key = "waxing_gibbous";
    icon = "🌔";
  } else if (normalized < 0.53) {
    key = "full_moon";
    icon = "🌕";
  } else if (normalized < 0.72) {
    key = "waning_gibbous";
    icon = "🌖";
  } else if (normalized < 0.78) {
    key = "last_quarter";
    icon = "🌗";
  } else {
    key = "waning_crescent";
    icon = "🌘";
  }

  const daysToFullMoon =
    normalized < 0.5
      ? Math.max(0, Math.round((0.5 - normalized) * SYNODIC_MONTH))
      : Math.max(0, Math.round((1.5 - normalized) * SYNODIC_MONTH));

  return {
    phase: normalized,
    ageDays: Math.round(phase * 10) / 10,
    illumination,
    key,
    icon,
    daysToFullMoon,
  };
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1] ?? "0", 10) * 60 + parseInt(match[2] ?? "0", 10);
}

function formatMinutes(min: number): string {
  const norm = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = Math.floor(norm % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(minTotal: number): string {
  const h = Math.floor(minTotal / 60);
  const m = minTotal % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/**
 * Calculates real-time solar arc metrics, golden hours, and blue hours.
 */
export function getSunArcInfo(
  sunriseRaw?: string,
  sunsetRaw?: string,
  localTimeIso?: string,
  isDayFlag?: number
): SunArcInfo {
  const srMin = parseTimeToMinutes(sunriseRaw) ?? 360; // Default 06:00
  const ssMin = parseTimeToMinutes(sunsetRaw) ?? 1080; // Default 18:00

  const sunriseStr = formatMinutes(srMin);
  const sunsetStr = formatMinutes(ssMin);

  // Parse current local minutes of day
  let nowMin: number;
  if (localTimeIso && localTimeIso.includes("T")) {
    const timePart = localTimeIso.split("T")[1];
    nowMin = parseTimeToMinutes(timePart) ?? new Date().getHours() * 60 + new Date().getMinutes();
  } else {
    const d = new Date();
    nowMin = d.getHours() * 60 + d.getMinutes();
  }

  const daylightMin = Math.max(60, ssMin - srMin);
  const daylightDurationStr = formatDuration(daylightMin);

  const isDay = isDayFlag !== undefined ? isDayFlag === 1 : nowMin >= srMin && nowMin <= ssMin;

  let sunProgressPercent = 0;
  let daylightRemainingStr: string | null = null;
  let timeUntilSunriseStr: string | null = null;

  if (nowMin < srMin) {
    // Before sunrise (Night)
    sunProgressPercent = 0;
    timeUntilSunriseStr = formatDuration(srMin - nowMin);
  } else if (nowMin > ssMin) {
    // After sunset (Night)
    sunProgressPercent = 100;
    const minUntilNextSr = 1440 - nowMin + srMin;
    timeUntilSunriseStr = formatDuration(minUntilNextSr);
  } else {
    // Daylight
    const elapsed = nowMin - srMin;
    sunProgressPercent = Math.min(100, Math.max(0, Math.round((elapsed / daylightMin) * 100)));
    daylightRemainingStr = formatDuration(Math.max(0, ssMin - nowMin));
  }

  // Golden Hour windows
  // Morning: Sunrise to +50 min
  const morningGoldenHour = {
    start: sunriseStr,
    end: formatMinutes(srMin + 50),
  };
  // Evening: Sunset - 60 min to Sunset
  const eveningGoldenHour = {
    start: formatMinutes(ssMin - 60),
    end: sunsetStr,
  };

  // Blue Hour windows
  // Morning: Sunrise - 35 min to Sunrise - 10 min
  const morningBlueHour = {
    start: formatMinutes(srMin - 35),
    end: formatMinutes(srMin - 10),
  };
  // Evening: Sunset + 10 min to Sunset + 35 min
  const eveningBlueHour = {
    start: formatMinutes(ssMin + 10),
    end: formatMinutes(ssMin + 35),
  };

  // Determine active light state
  let currentLightState: "golden_hour" | "blue_hour" | "daylight" | "night" = isDay
    ? "daylight"
    : "night";

  if (
    (nowMin >= srMin && nowMin <= srMin + 50) ||
    (nowMin >= ssMin - 60 && nowMin <= ssMin)
  ) {
    currentLightState = "golden_hour";
  } else if (
    (nowMin >= srMin - 35 && nowMin <= srMin - 10) ||
    (nowMin >= ssMin + 10 && nowMin <= ssMin + 35)
  ) {
    currentLightState = "blue_hour";
  }

  return {
    sunriseStr,
    sunsetStr,
    isDay,
    sunProgressPercent,
    daylightDurationStr,
    daylightRemainingStr,
    timeUntilSunriseStr,
    morningGoldenHour,
    eveningGoldenHour,
    morningBlueHour,
    eveningBlueHour,
    currentLightState,
  };
}

/**
 * 14-Language Astronomical Dictionary
 */
export const ASTRONOMY_I18N: Record<
  string,
  {
    celestial_tracker: string;
    solar_path: string;
    lunar_phase: string;
    daylight: string;
    daylight_remaining: string;
    time_to_sunrise: string;
    golden_hour: string;
    blue_hour: string;
    magic_hours: string;
    morning: string;
    evening: string;
    illuminated: string;
    next_full_moon: string;
    moon_age: string;
    in_days: string;
    active_now: string;
    phases: Record<MoonPhaseKey, string>;
  }
> = {
  en: {
    celestial_tracker: "Sun & Moon Tracker",
    solar_path: "Sun Trajectory",
    lunar_phase: "Moon Phase",
    daylight: "Daylight",
    daylight_remaining: "remaining",
    time_to_sunrise: "until sunrise",
    golden_hour: "Golden Hour",
    blue_hour: "Blue Hour",
    magic_hours: "Photographer's Magic Hours",
    morning: "Morning",
    evening: "Evening",
    illuminated: "illuminated",
    next_full_moon: "Next Full Moon",
    moon_age: "Lunar Age",
    in_days: "in {{days}} days",
    active_now: "ACTIVE NOW",
    phases: {
      new_moon: "New Moon",
      waxing_crescent: "Waxing Crescent",
      first_quarter: "First Quarter",
      waxing_gibbous: "Waxing Gibbous",
      full_moon: "Full Moon",
      waning_gibbous: "Waning Gibbous",
      last_quarter: "Last Quarter",
      waning_crescent: "Waning Crescent",
    },
  },
  th: {
    celestial_tracker: "วิถีดวงอาทิตย์และดวงจันทร์",
    solar_path: "เส้นทางดวงอาทิตย์",
    lunar_phase: "ข้างขึ้น-ข้างแรม",
    daylight: "แสงกลางวัน",
    daylight_remaining: "แสงสว่างที่เหลือ",
    time_to_sunrise: "จนถึงอาทิตย์ขึ้น",
    golden_hour: "ช่วงแสงสีทอง (Golden Hour)",
    blue_hour: "ช่วงแสงสีน้ำเงิน (Blue Hour)",
    magic_hours: "ช่วงเวลาถ่ายภาพยอดนิยม",
    morning: "เช้า",
    evening: "เย็น",
    illuminated: "สว่าง",
    next_full_moon: "จันทร์เพ็ญถัดไป",
    moon_age: "อายุจันทร์",
    in_days: "อีก {{days}} วัน",
    active_now: "ขณะนี้",
    phases: {
      new_moon: "เดือนดับ (แรม 15 ค่ำ)",
      waxing_crescent: "จันทร์เสี้ยวข้างขึ้น",
      first_quarter: "ครึ่งดวงแรก (ขึ้น 8 ค่ำ)",
      waxing_gibbous: "ค่อนดวงข้างขึ้น",
      full_moon: "วันเพ็ญ (ขึ้น 15 ค่ำ)",
      waning_gibbous: "ค่อนดวงข้างแรม",
      last_quarter: "ครึ่งดวงหลัง (แรม 8 ค่ำ)",
      waning_crescent: "จันทร์เสี้ยวข้างแรม",
    },
  },
  es: {
    celestial_tracker: "Seguidor de Sol y Luna",
    solar_path: "Trayectoria Solar",
    lunar_phase: "Fase Lunar",
    daylight: "Luz Diurna",
    daylight_remaining: "restante",
    time_to_sunrise: "hasta el amanecer",
    golden_hour: "Hora Dorada",
    blue_hour: "Hora Azul",
    magic_hours: "Horas Mágicas de Fotografía",
    morning: "Mañana",
    evening: "Tarde",
    illuminated: "iluminada",
    next_full_moon: "Próxima Luna Llena",
    moon_age: "Edad Lunar",
    in_days: "en {{days}} días",
    active_now: "ACTIVO AHORA",
    phases: {
      new_moon: "Luna Nueva",
      waxing_crescent: "Luna Creciente",
      first_quarter: "Cuarto Creciente",
      waxing_gibbous: "Gibosa Creciente",
      full_moon: "Luna Llena",
      waning_gibbous: "Gibosa Menguante",
      last_quarter: "Cuarto Menguante",
      waning_crescent: "Luna Menguante",
    },
  },
  ja: {
    celestial_tracker: "太陽と月の軌道",
    solar_path: "太陽の軌道",
    lunar_phase: "月相",
    daylight: "日照時間",
    daylight_remaining: "残り日照",
    time_to_sunrise: "日の出まで",
    golden_hour: "ゴールデンアワー",
    blue_hour: "ブルーアワー",
    magic_hours: "撮影マジックアワー",
    morning: "朝",
    evening: "夕方",
    illuminated: "輝面比",
    next_full_moon: "次の満月",
    moon_age: "月齢",
    in_days: "{{days}}日後",
    active_now: "現在中",
    phases: {
      new_moon: "新月",
      waxing_crescent: "三日月",
      first_quarter: "上弦の月",
      waxing_gibbous: "十日夜の月",
      full_moon: "満月",
      waning_gibbous: "十六夜の月",
      last_quarter: "下弦の月",
      waning_crescent: "有明の月",
    },
  },
  zh: {
    celestial_tracker: "日月中天与月相",
    solar_path: "太阳运行轨迹",
    lunar_phase: "当前月相",
    daylight: "白昼时长",
    daylight_remaining: "剩余日照",
    time_to_sunrise: "距离日出",
    golden_hour: "黄金时刻 (Golden Hour)",
    blue_hour: "蓝调时刻 (Blue Hour)",
    magic_hours: "摄影黄金光线",
    morning: "早晨",
    evening: "傍晚",
    illuminated: "照亮比例",
    next_full_moon: "下次满月",
    moon_age: "月龄",
    in_days: "{{days}} 天后",
    active_now: "当前正在发生",
    phases: {
      new_moon: "新月 (朔)",
      waxing_crescent: "峨眉月",
      first_quarter: "上弦月",
      waxing_gibbous: "盈凸月",
      full_moon: "满月 (望)",
      waning_gibbous: "亏凸月",
      last_quarter: "下弦月",
      waning_crescent: "残月",
    },
  },
  hi: {
    celestial_tracker: "सूर्य एवं चंद्र चक्र",
    solar_path: "सूर्य का मार्ग",
    lunar_phase: "चंद्र कलाएं",
    daylight: "दिन का प्रकाश",
    daylight_remaining: "शेष समय",
    time_to_sunrise: "सूर्योदय तक",
    golden_hour: "स्वर्णिम वेला",
    blue_hour: "नीली वेला",
    magic_hours: "फोटोग्राफी का सुनहरा समय",
    morning: "सुबह",
    evening: "शाम",
    illuminated: "प्रकाशित",
    next_full_moon: "अगली पूर्णिमा",
    moon_age: "चंद्र आयु",
    in_days: "{{days}} दिनों में",
    active_now: "अभी जारी",
    phases: {
      new_moon: "अमावस्या",
      waxing_crescent: "शुक्ल प्रतिपदा",
      first_quarter: "शुक्ल अष्टमी",
      waxing_gibbous: "शुक्ल चतुर्दशी",
      full_moon: "पूर्णिमा",
      waning_gibbous: "कृष्ण प्रतिपदा",
      last_quarter: "कृष्ण अष्टमी",
      waning_crescent: "कृष्ण चतुर्दशी",
    },
  },
  fr: {
    celestial_tracker: "Trajectoire Solaire & Lune",
    solar_path: "Trajectoire du Soleil",
    lunar_phase: "Phase Lunaire",
    daylight: "Lumière du jour",
    daylight_remaining: "restante",
    time_to_sunrise: "avant le lever",
    golden_hour: "Heure Dorée",
    blue_hour: "Heure Bleue",
    magic_hours: "Heures Magiques pour Photos",
    morning: "Matin",
    evening: "Soir",
    illuminated: "éclairée",
    next_full_moon: "Prochaine Pleine Lune",
    moon_age: "Âge Lunaire",
    in_days: "dans {{days}} jours",
    active_now: "EN COURS",
    phases: {
      new_moon: "Nouvelle Lune",
      waxing_crescent: "Premier Croissant",
      first_quarter: "Premier Quartier",
      waxing_gibbous: "Gibbeuse Croissante",
      full_moon: "Pleine Lune",
      waning_gibbous: "Gibbeuse Décroissante",
      last_quarter: "Dernier Quartier",
      waning_crescent: "Dernier Croissant",
    },
  },
  de: {
    celestial_tracker: "Sonnen- & Mondbahn",
    solar_path: "Sonnenlauf",
    lunar_phase: "Mondphase",
    daylight: "Tageslicht",
    daylight_remaining: "verbleibend",
    time_to_sunrise: "bis Sonnenaufgang",
    golden_hour: "Goldene Stunde",
    blue_hour: "Blaue Stunde",
    magic_hours: "Magische Fotostunden",
    morning: "Morgens",
    evening: "Abends",
    illuminated: "beleuchtet",
    next_full_moon: "Nächster Vollmond",
    moon_age: "Mondalter",
    in_days: "in {{days}} Tagen",
    active_now: "JETZT AKTIV",
    phases: {
      new_moon: "Neumond",
      waxing_crescent: "Zunehmende Sichel",
      first_quarter: "Erstes Viertel",
      waxing_gibbous: "Zunehmender Mond",
      full_moon: "Vollmond",
      waning_gibbous: "Abnehmender Mond",
      last_quarter: "Letztes Viertel",
      waning_crescent: "Abnehmende Sichel",
    },
  },
  pt: {
    celestial_tracker: "Trajetória do Sol e Lua",
    solar_path: "Trajetória Solar",
    lunar_phase: "Fase da Lua",
    daylight: "Luz do dia",
    daylight_remaining: "restante",
    time_to_sunrise: "até o nascer do sol",
    golden_hour: "Hora Dourada",
    blue_hour: "Hora Azul",
    magic_hours: "Horas Mágicas da Fotografia",
    morning: "Manhã",
    evening: "Tarde",
    illuminated: "iluminada",
    next_full_moon: "Próxima Lua Cheia",
    moon_age: "Idade Lunar",
    in_days: "em {{days}} dias",
    active_now: "ATIVO AGORA",
    phases: {
      new_moon: "Lua Nova",
      waxing_crescent: "Crescente Inicial",
      first_quarter: "Quarto Crescente",
      waxing_gibbous: "Gibosa Crescente",
      full_moon: "Lua Cheia",
      waning_gibbous: "Gibosa Minguante",
      last_quarter: "Quarto Minguante",
      waning_crescent: "Minguante Final",
    },
  },
  ru: {
    celestial_tracker: "Движение Солнца и Луны",
    solar_path: "Траектория Солнца",
    lunar_phase: "Фаза Луны",
    daylight: "Световой день",
    daylight_remaining: "осталось",
    time_to_sunrise: "до рассвета",
    golden_hour: "Золотой час",
    blue_hour: "Синий час",
    magic_hours: "Золотые часы фотосъемки",
    morning: "Утро",
    evening: "Вечер",
    illuminated: "освещено",
    next_full_moon: "Полнолуние",
    moon_age: "Возраст Луны",
    in_days: "через {{days}} дн.",
    active_now: "ПРЯМО СЕЙЧАС",
    phases: {
      new_moon: "Новолуние",
      waxing_crescent: "Молодая Луна",
      first_quarter: "Первая четверть",
      waxing_gibbous: "Растущая Луна",
      full_moon: "Полнолуние",
      waning_gibbous: "Убывающая Луна",
      last_quarter: "Последняя четверть",
      waning_crescent: "Старая Луна",
    },
  },
  ar: {
    celestial_tracker: "مسار الشمس والقمر",
    solar_path: "مسار الشمس",
    lunar_phase: "أطوار القمر",
    daylight: "ضوء النهار",
    daylight_remaining: "متبقٍ",
    time_to_sunrise: "حتى الشروق",
    golden_hour: "الساعة الذهبية",
    blue_hour: "الساعة الزرقاء",
    magic_hours: "الساعات الساحرة للتصوير",
    morning: "صباحاً",
    evening: "مساءً",
    illuminated: "مضاء",
    next_full_moon: "البدر القادم",
    moon_age: "عمر القمر",
    in_days: "خلال {{days}} يوم",
    active_now: "نشط الآن",
    phases: {
      new_moon: "محاق",
      waxing_crescent: "هلال متزايد",
      first_quarter: "تربيع أول",
      waxing_gibbous: "أحدب متزايد",
      full_moon: "بدر",
      waning_gibbous: "أحدب متناقص",
      last_quarter: "تربيع ثانٍ",
      waning_crescent: "هلال متناقص",
    },
  },
  ko: {
    celestial_tracker: "태양 궤적 및 달의 위상",
    solar_path: "태양의 궤적",
    lunar_phase: "달의 위상",
    daylight: "낮 시간",
    daylight_remaining: "남은 시간",
    time_to_sunrise: "일출까지",
    golden_hour: "골든 아워",
    blue_hour: "블루 아워",
    magic_hours: "사진작가의 매직 아워",
    morning: "아침",
    evening: "저녁",
    illuminated: "조도",
    next_full_moon: "다음 보름달",
    moon_age: "월령",
    in_days: "{{days}}일 후",
    active_now: "현재 진행 중",
    phases: {
      new_moon: "삭 (초승달)",
      waxing_crescent: "초승달",
      first_quarter: "상현달",
      waxing_gibbous: "상현망간달",
      full_moon: "보름달 (만월)",
      waning_gibbous: "하현망간달",
      last_quarter: "하현달",
      waning_crescent: "그믐달",
    },
  },
  id: {
    celestial_tracker: "Pelacak Matahari & Bulan",
    solar_path: "Lintasan Matahari",
    lunar_phase: "Fase Bulan",
    daylight: "Waktu Siang",
    daylight_remaining: "tersisa",
    time_to_sunrise: "menuju matahari terbit",
    golden_hour: "Jam Emas (Golden Hour)",
    blue_hour: "Jam Biru (Blue Hour)",
    magic_hours: "Waktu Emas Fotografi",
    morning: "Pagi",
    evening: "Sore",
    illuminated: "terang",
    next_full_moon: "Bulan Purnama Berikutnya",
    moon_age: "Usia Bulan",
    in_days: "dalam {{days}} hari",
    active_now: "SEDANG AKTIF",
    phases: {
      new_moon: "Bulan Baru (Mati)",
      waxing_crescent: "Sabit Muda",
      first_quarter: "Perbani Awal",
      waxing_gibbous: "Cembung Awal",
      full_moon: "Bulan Purnama",
      waning_gibbous: "Cembung Akhir",
      last_quarter: "Perbani Akhir",
      waning_crescent: "Sabit Tua",
    },
  },
  vi: {
    celestial_tracker: "Quỹ Đạo Mặt Trời & Mặt Trăng",
    solar_path: "Hành trình Mặt Trời",
    lunar_phase: "Tuần Trăng",
    daylight: "Thời gian ban ngày",
    daylight_remaining: "còn lại",
    time_to_sunrise: "đến khi bình minh",
    golden_hour: "Giờ Vàng (Golden Hour)",
    blue_hour: "Giờ Xanh (Blue Hour)",
    magic_hours: "Thời Điểm Vàng Chụp Ảnh",
    morning: "Sáng",
    evening: "Chiều",
    illuminated: "chiếu sáng",
    next_full_moon: "Trăng Tròn Tiếp Theo",
    moon_age: "Tuổi trăng",
    in_days: "sau {{days}} ngày",
    active_now: "ĐANG DIỄN RA",
    phases: {
      new_moon: "Trăng Non",
      waxing_crescent: "Trăng Lưỡi Liềm Đầu Tháng",
      first_quarter: "Trăng Bán Nguyệt Đầu Tháng",
      waxing_gibbous: "Trăng Khuyết Đầu Tháng",
      full_moon: "Trăng Tròn (Rằm)",
      waning_gibbous: "Trăng Khuyết Cuối Tháng",
      last_quarter: "Trăng Bán Nguyệt Cuối Tháng",
      waning_crescent: "Trăng Lưỡi Liềm Cuối Tháng",
    },
  },
};

export function getAstronomyTexts(lang: string = "en") {
  const norm = lang.toLowerCase().split("-")[0] ?? "en";
  return (ASTRONOMY_I18N[norm] ?? ASTRONOMY_I18N["en"]) as (typeof ASTRONOMY_I18N)[string];
}
