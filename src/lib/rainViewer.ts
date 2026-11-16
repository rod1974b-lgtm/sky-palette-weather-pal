// src/lib/rainViewer.ts
export interface RainViewerFrame {
  time: number;
  path: string;
}

export interface RainViewerData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
  satellite?: {
    infrared?: RainViewerFrame[];
  };
}

let cachedMetadata: { data: RainViewerData; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3-minute cache for fresh radar frames

/**
 * Fetches the latest global radar frame list from RainViewer.
 */
export async function getRainViewerMetadata(): Promise<RainViewerData | null> {
  const now = Date.now();
  if (cachedMetadata && now - cachedMetadata.fetchedAt < CACHE_TTL_MS) {
    return cachedMetadata.data;
  }

  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const data: RainViewerData = await res.json();
    cachedMetadata = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.warn("Failed to fetch RainViewer radar metadata:", err);
    return cachedMetadata ? cachedMetadata.data : null;
  }
}

/**
 * Convert longitude to Slippy Map tile X coordinate (Web Mercator)
 */
export function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

/**
 * Convert latitude to Slippy Map tile Y coordinate (Web Mercator)
 */
export function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

/**
 * Build RainViewer radar tile URL
 * colorScheme: 2 = Universal Blue, 4 = The Weather Channel, 6 = TITAN
 */
export function getRadarTileUrl(
  host: string,
  path: string,
  z: number,
  x: number,
  y: number,
  colorScheme = 2,
  smooth = 1,
  snow = 1
): string {
  return `${host}${path}/256/${z}/${x}/${y}/${colorScheme}/${smooth}_${snow}.png`;
}

/**
 * High-contrast OpenStreetMap basemap tile URL
 */
export function getBaseMapTileUrl(z: number, x: number, y: number): string {
  // Uses CartoDB Voyager raster tiles for clean weather contrast
  const subdomains = ["a", "b", "c", "d"];
  const sub = subdomains[Math.abs(x + y) % subdomains.length];
  return `https://cartodb-basemaps-${sub}.global.ssl.fastly.net/rastertiles/voyager/${z}/${x}/${y}.png`;
}

/**
 * Format relative frame timestamp for radar scrubber
 */
export function formatFrameTime(timestamp: number, lang: string): string {
  const diffSec = Math.round((Date.now() - timestamp * 1000) / 1000);
  const diffMins = Math.round(diffSec / 60);

  if (diffMins <= 2) {
    return lang === "th" ? "ขณะนี้ (สด)" : "Live (Now)";
  }
  if (diffMins > 0) {
    return lang === "th" ? `${diffMins} นาทีที่แล้ว` : `${diffMins}m ago`;
  }
  return lang === "th" ? `อีก ${Math.abs(diffMins)} นาที` : `in ${Math.abs(diffMins)}m`;
}

/**
 * 14-Language dictionary for Radar controls and legend
 */
export const RADAR_EN = {
    title: "Live Rain Radar",
    subtitle: "Real-time precipitation & storm tracking",
    play: "Play Loop",
    pause: "Pause",
    recenter: "Recenter City",
    opacity: "Radar Opacity",
    light: "Light",
    moderate: "Moderate",
    heavy: "Heavy",
    severe: "Severe / Hail",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    layerRadar: "Rain Radar",
    layerSatellite: "Satellite Clouds",
    loadingRadar: "Loading radar stream...",
    radarNotice: "Powered by global radar stations with 10-minute updates.",
  };
export type RadarKey = keyof typeof RADAR_EN;

export const RADAR_I18N: Record<string, Partial<Record<RadarKey, string>>> = {
  en: RADAR_EN,
  th: {
    title: "เรดาร์ตรวจฝนสด",
    subtitle: "ติดตามกลุ่มฝนฟ้าคะนองและพายุแบบเรียลไทม์",
    play: "เล่นภาพเคลื่อนไหว",
    pause: "หยุดชั่วคราว",
    recenter: "กลับมาที่เมืองนี้",
    opacity: "ความโปร่งแสงเรดาร์",
    light: "เบาบาง",
    moderate: "ปานกลาง",
    heavy: "หนัก",
    severe: "หนักมาก / ลูกเห็บ",
    zoomIn: "ซูมเข้า",
    zoomOut: "ซูมออก",
    layerRadar: "เรดาร์ฝน",
    layerSatellite: "ภาพถ่ายดาวเทียม",
    loadingRadar: "กำลังโหลดข้อมูลเรดาร์สด...",
    radarNotice: "เชื่อมต่อสถานีเรดาร์ตรวจอากาศ อัปเดตทุก 10 นาที",
  },
  es: {
    title: "Radar de Lluvia en Vivo",
    subtitle: "Seguimiento de tormentas y precipitaciones en tiempo real",
    play: "Reproducir",
    pause: "Pausar",
    recenter: "Centrar Ciudad",
    opacity: "Opacidad",
    light: "Ligera",
    moderate: "Moderada",
    heavy: "Fuerte",
    severe: "Severa / Granizo",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    layerRadar: "Radar",
    layerSatellite: "Satélite",
    loadingRadar: "Cargando radar...",
    radarNotice: "Actualizado cada 10 minutos con datos de radares globales.",
  },
  ja: {
    title: "リアルタイム雨雲レーダー",
    subtitle: "降水量と台風・雨雲の最新動向",
    play: "再生",
    pause: "一時停止",
    recenter: "街を再センタリング",
    opacity: "レーダー透過度",
    light: "弱い雨",
    moderate: "並の雨",
    heavy: "強い雨",
    severe: "激しい雨・雹",
    zoomIn: "拡大",
    zoomOut: "縮小",
    layerRadar: "雨雲レーダー",
    layerSatellite: "気象衛星",
    loadingRadar: "レーダー画像を読み込み中...",
    radarNotice: "世界各国の気象レーダー網より10分ごとに更新。",
  },
  zh: {
    title: "实时降雨雷达图",
    subtitle: "实时追踪降水分布与强对流天气",
    play: "播放动态",
    pause: "暂停",
    recenter: "重新定位于当前城市",
    opacity: "雷达透明度",
    light: "小雨",
    moderate: "中雨",
    heavy: "大雨",
    severe: "暴雨 / 冰雹",
    zoomIn: "放大",
    zoomOut: "缩小",
    layerRadar: "降雨雷达",
    layerSatellite: "卫星云图",
    loadingRadar: "正在加载雷达回波图...",
    radarNotice: "由全球气象雷达网络支持，每 10 分钟自动更新。",
  },
  hi: {
    title: "लाइव वर्षा रडार",
    subtitle: "वास्तविक समय बारिश और तूफान ट्रैकिंग",
    play: "चलाएं",
    pause: "रोकें",
    recenter: "शहर केंद्रित करें",
    opacity: "रडार पारदर्शिता",
    light: "हल्की",
    moderate: "मध्यम",
    heavy: "भारी",
    severe: "अत्यधिक / ओले",
    zoomIn: "ज़ूम इन",
    zoomOut: "ज़ूम आउट",
    layerRadar: "वर्षा रडार",
    layerSatellite: "उपग्रह",
    loadingRadar: "रडार डेटा लोड हो रहा है...",
    radarNotice: "वैश्विक मौसम रडार स्टेशनों से प्रत्येक 10 मिनट में अपडेट।",
  },
  fr: {
    title: "Radar des Pluies en Direct",
    subtitle: "Suivi des précipitations et des orages en temps réel",
    play: "Lecture",
    pause: "Pause",
    recenter: "Recentrer la ville",
    opacity: "Opacité",
    light: "Faible",
    moderate: "Modérée",
    heavy: "Forte",
    severe: "Violente / Grêle",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    layerRadar: "Radar pluie",
    layerSatellite: "Satellite",
    loadingRadar: "Chargement du radar...",
    radarNotice: "Mis à jour toutes les 10 minutes par les stations radar météo.",
  },
  de: {
    title: "Live-Regenradar",
    subtitle: "Echtzeit-Niederschlags- und Gewitterverfolgung",
    play: "Abspielen",
    pause: "Pause",
    recenter: "Stadt zentrieren",
    opacity: "Radar-Transparenz",
    light: "Leicht",
    moderate: "Mäßig",
    heavy: "Stark",
    severe: "Unwetter / Hagel",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    layerRadar: "Regenradar",
    layerSatellite: "Satellit",
    loadingRadar: "Radar wird geladen...",
    radarNotice: "Alle 10 Minuten aktualisiert über globale Wetterradare.",
  },
  pt: {
    title: "Radar de Chuva em Tempo Real",
    subtitle: "Rastreamento ao vivo de precipitação e tempestades",
    play: "Reproduzir",
    pause: "Pausar",
    recenter: "Centralizar Cidade",
    opacity: "Opacidade do Radar",
    light: "Fraca",
    moderate: "Moderada",
    heavy: "Forte",
    severe: "Severa / Granizo",
    zoomIn: "Aproximar",
    zoomOut: "Afastar",
    layerRadar: "Radar de Chuva",
    layerSatellite: "Satélite",
    loadingRadar: "Carregando radar...",
    radarNotice: "Atualizado a cada 10 minutos por estações de radar globais.",
  },
  ru: {
    title: "Онлайн Радар Осадков",
    subtitle: "Отслеживание дождей и гроз в реальном времени",
    play: "Воспроизведение",
    pause: "Пауза",
    recenter: "К центру города",
    opacity: "Прозрачность радара",
    light: "Слабый",
    moderate: "Умеренный",
    heavy: "Сильный",
    severe: "Шторм / Град",
    zoomIn: "Приблизить",
    zoomOut: "Отдалить",
    layerRadar: "Радар осадков",
    layerSatellite: "Спутник",
    loadingRadar: "Загрузка радара...",
    radarNotice: "Обновляется каждые 10 минут по данным сети метеорадаров.",
  },
  ar: {
    title: "رادار الأمطار المباشر",
    subtitle: "متابعة الأمطار والعواصف في الوقت الفعلي",
    play: "تشغيل",
    pause: "إيقاف مؤقت",
    recenter: "إعادة التمركز",
    opacity: "شفافية الرادار",
    light: "خفيف",
    moderate: "متوسط",
    heavy: "غزير",
    severe: "عاصف / بَرَد",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    layerRadar: "رادار الأمطار",
    layerSatellite: "الأقمار الصناعية",
    loadingRadar: "جارٍ تحميل الرادار...",
    radarNotice: "يتم التحديث كل 10 دقائق من محطات الرادار العالمية.",
  },
  ko: {
    title: "실시간 비구름 레이더",
    subtitle: "실시간 강수량 및 강우·태풍 이동 경로 추적",
    play: "재생",
    pause: "일시정지",
    recenter: "도시 재중심",
    opacity: "레이더 투명도",
    light: "약한 비",
    moderate: "보통 비",
    heavy: "강한 비",
    severe: "폭우 / 우박",
    zoomIn: "확대",
    zoomOut: "축소",
    layerRadar: "강수 레이더",
    layerSatellite: "위성 구름",
    loadingRadar: "레이더 데이터 로딩 중...",
    radarNotice: "전 세계 기상 레이더 관측망을 통해 10분마다 업데이트됩니다.",
  },
  id: {
    title: "Radar Hujan Langsung",
    subtitle: "Pemantauan presipitasi dan badai secara real-time",
    play: "Putar Loop",
    pause: "Jeda",
    recenter: "Pusatkan Kota",
    opacity: "Transparansi Radar",
    light: "Ringan",
    moderate: "Sedang",
    heavy: "Lebat",
    severe: "Ekstrem / Es",
    zoomIn: "Perbesar",
    zoomOut: "Perkecil",
    layerRadar: "Radar Hujan",
    layerSatellite: "Satelit",
    loadingRadar: "Memuat radar langsung...",
    radarNotice: "Diperbarui setiap 10 menit oleh stasiun radar cuaca global.",
  },
  vi: {
    title: "Rada Mưa Trực Tiếp",
    subtitle: "Theo dõi lượng mưa và giông bão theo thời gian thực",
    play: "Phát chuyển động",
    pause: "Tạm dừng",
    recenter: "Căn giữa thành phố",
    opacity: "Độ mờ rada",
    light: "Nhẹ",
    moderate: "Vừa",
    heavy: "To",
    severe: "Rất to / Mưa đá",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    layerRadar: "Rada mưa",
    layerSatellite: "Vệ tinh mây",
    loadingRadar: "Đang tải dữ liệu rada...",
    radarNotice: "Cập nhật mỗi 10 phút từ các trạm rada thời tiết toàn cầu.",
  },
};
