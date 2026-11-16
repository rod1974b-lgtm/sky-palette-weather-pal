// src/components/WeatherAlertWatcher.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Weather, WeatherUnit } from "@/lib/weather";

export interface TickerAlertItem {
  id?: string;
  source?: string;
  severity: "disaster" | "warning" | "advisory" | "all-clear" | "danger";
  headline?: string;
  headlineTh?: string;
  text?: string;
  details?: string;
  area?: string;
  tag?: string;
  timeAgo?: string;
  timestamp?: number;
}

export interface WeatherAlertWatcherProps {
  weather: Weather;
  unit: WeatherUnit;
  activeAlerts?: TickerAlertItem[];
}

export interface DetectedHazard {
  id: string;
  type: "thunderstorm" | "wind" | "heat" | "cold" | "rain" | "air" | "official";
  severity: "danger" | "warning" | "advisory";
  icon: string;
  titleKey: string;
  descKey: string;
  adviceKey: string;
  metricValue?: string;
}

interface AlertWatcherConfig {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  notifyThunderstorm: boolean;
  notifyWind: boolean;
  notifyHeat: boolean;
  notifyCold: boolean;
  notifyRain: boolean;
  notifyAir: boolean;
}

const DEFAULT_CONFIG: AlertWatcherConfig = {
  soundEnabled: true,
  notificationsEnabled: false,
  notifyThunderstorm: true,
  notifyWind: true,
  notifyHeat: true,
  notifyCold: true,
  notifyRain: true,
  notifyAir: true,
};

const STORAGE_KEY_CONFIG = "weather:alert_watcher_config";
const STORAGE_KEY_LAST_NOTIFIED = "weather:alert_watcher_last_sent";

// 14-language localization dictionary
const WATCHER_EN = {
    title: "Severe Weather Watcher & Alerts",
    subtitle: "Real-time monitoring for sudden storms, gale winds, heatwaves & hazardous air",
    shield_active: "Active Shield",
    shield_all_clear: "All Clear — Conditions are safe",
    shield_hazards_found: "Active Weather Hazards Detected",
    monitoring_city: "Monitoring",
    test_btn: "Test Alert & Chime",
    settings_btn: "Alert Settings",
    sound_on: "Sound On",
    sound_muted: "Muted",
    notify_permission_cta: "Enable Notifications",
    notify_enabled: "Notifications Active",
    notify_blocked: "Notifications Blocked",
    test_toast_title: "Severe Weather Watcher Active",
    test_toast_desc: "This is a test notification with synthesized alert chime. Stay safe!",
    hazard_thunderstorm_title: "Severe Thunderstorm Warning",
    hazard_thunderstorm_desc: "Intense lightning, squall gusts, or hail detected in the area.",
    hazard_thunderstorm_advice: "Seek sturdy shelter indoors immediately. Unplug sensitive electronics and stay away from windows.",
    hazard_wind_title: "Gale-Force Wind Warning",
    hazard_wind_desc: "Damaging wind gusts exceed safe limits.",
    hazard_wind_advice: "Secure loose patio furniture, beware of falling tree branches and avoid driving high-profile vehicles.",
    hazard_heat_title: "Extreme Heat Index Advisory",
    hazard_heat_desc: "Hazardous heat levels create high risk of heatstroke and exhaustion.",
    hazard_heat_advice: "Stay hydrated with electrolytes, seek air-conditioned environments, and avoid strenuous outdoor exercise.",
    hazard_cold_title: "Freezing Temperatures Warning",
    hazard_cold_desc: "Sub-zero conditions with risk of black ice and hypothermia.",
    hazard_cold_advice: "Dress in multiple warm thermal layers, insulate exposed water pipes, and watch for icy pavements.",
    hazard_rain_title: "Torrential Rain & Flash Flood Watch",
    hazard_rain_desc: "Heavy downpours could cause rapid street water accumulation and low-lying flooding.",
    hazard_rain_advice: "Avoid crossing flooded underpasses or fast-moving water. Keep essential valuables off low floors.",
    hazard_air_title: "Unhealthy Air Quality & PM2.5 Alert",
    hazard_air_desc: "Elevated particulate pollution reaches unhealthy thresholds.",
    hazard_air_advice: "Wear a certified N95/KF94 mask outdoors. Keep doors and windows closed and use an indoor HEPA purifier.",
    hazard_official_title: "Official Meteorological Bulletin",
    hazard_official_desc: "Active disaster bulletin from regional weather authorities.",
    hazard_official_advice: "Follow local government emergency directives and maintain portable emergency supplies.",
    settings_title: "Severe Weather Notification Preferences",
    settings_sound_label: "Play Synthesized Audio Chime",
    settings_sound_sub: "Gentle two-tone chime when hazardous weather breaches safety thresholds",
    settings_push_label: "Browser & Mobile Push Notifications",
    settings_push_sub: "Receive instant alert banners even when viewing other tabs",
    settings_types_title: "Monitored Hazard Types",
    settings_storm_label: "Thunderstorms & Lightning",
    settings_wind_label: "Gale Winds (> 45 km/h)",
    settings_heat_label: "Extreme Heatwaves (> 38°C / 100°F)",
    settings_cold_label: "Freezing Cold (≤ 0°C / 32°F)",
    settings_rain_label: "Torrential Rain & Flash Floods",
    settings_air_label: "Hazardous PM2.5 & Air Quality (AQI > 150)",
    close: "Done",
  };
export type WatcherKey = keyof typeof WATCHER_EN;

const WATCHER_I18N: Record<string, Partial<Record<WatcherKey, string>>> = {
  en: WATCHER_EN,
  th: {
    title: "ระบบเฝ้าระวังสภาพอากาศรุนแรงและการแจ้งเตือน",
    subtitle: "ตรวจจับพายุฝนฟ้าคะนอง ลมกระโชกแรง คลื่นความร้อน และฝุ่น PM2.5 แบบเรียลไทม์",
    shield_active: "ระบบความปลอดภัยทำงาน",
    shield_all_clear: "สภาวะปกติ — สภาพอากาศปลอดภัย",
    shield_hazards_found: "ตรวจพบสภาวะสภาพอากาศรุนแรง",
    monitoring_city: "กำลังเฝ้าระวังเมือง",
    test_btn: "ทดสอบเสียงแจ้งเตือน",
    settings_btn: "ตั้งค่าการเตือน",
    sound_on: "เปิดเสียง",
    sound_muted: "ปิดเสียง",
    notify_permission_cta: "เปิดรับการแจ้งเตือน",
    notify_enabled: "การแจ้งเตือนเปิดใช้งานแล้ว",
    notify_blocked: "การแจ้งเตือนถูกระงับ",
    test_toast_title: "ระบบเฝ้าระวังสภาพอากาศทำงานปกติ",
    test_toast_desc: "นี่คือการแจ้งเตือนทดสอบพร้อมเสียงสังเคราะห์เพื่อความปลอดภัยของคุณ!",
    hazard_thunderstorm_title: "เตือนภัยพายุฝนฟ้าคะนองรุนแรง",
    hazard_thunderstorm_desc: "ตรวจพบฟ้าผ่า ลมกระโชกแรง หรือลูกเห็บตกในพื้นที่",
    hazard_thunderstorm_advice: "หลบเข้าในอาคารที่มั่นคงทันที ถอดปลั๊กอุปกรณ์ไฟฟ้า และหลีกเลี่ยงการอยู่ใกล้หน้าต่าง",
    hazard_wind_title: "เตือนภัยลมกระโชกแรงอันตราย",
    hazard_wind_desc: "ความเร็วลมกระโชกแรงเกินเกณฑ์ความปลอดภัย",
    hazard_wind_advice: "ยึดสิ่งของกลางแจ้ง ระวังกิ่งไม้หรือป้ายโฆษณาหักโค่น และหลีกเลี่ยงการขับขี่รถทรงสูง",
    hazard_heat_title: "เตือนภัยดัชนีความร้อนสูงจัด (Heat Index)",
    hazard_heat_desc: "ความร้อนรุนแรงเสี่ยงต่อภาวะลมแดด (Heatstroke) และการขาดน้ำ",
    hazard_heat_advice: "จิบน้ำหรือเกลือแร่อย่างสม่ำเสมอ พักในห้องปรับอากาศ และหลีกเลี่ยงกิจกรรมกลางแจ้งที่หนักหน่วง",
    hazard_cold_title: "เตือนภัยอุณหภูมิลดต่ำจุดเยือกแข็ง",
    hazard_cold_desc: "สภาพอากาศหนาวจัด เสี่ยงต่อภาวะตัวเย็นเกินและน้ำค้างแข็ง",
    hazard_cold_advice: "สวมเสื้อผ้ากันหนาวหลายชั้น ป้องกันท่อน้ำแตก และระมัดระวังพื้นผิวถนนที่ลื่น",
    hazard_rain_title: "เฝ้าระวังฝนตกหนักมากและน้ำท่วมฉับพลัน",
    hazard_rain_desc: "ฝนตกหนักสะสมอาจทำให้เกิดน้ำท่วมขังบนถนนและพื้นที่ลุ่มต่ำ",
    hazard_rain_advice: "หลีกเลี่ยงการขับรถลุยทางน้ำหลากหรืออุโมงค์ที่มีน้ำท่วม ยกสิ่งของขึ้นที่สูง",
    hazard_air_title: "แจ้งเตือนคุณภาพอากาศและฝุ่น PM2.5 เกินมาตรฐาน",
    hazard_air_desc: "ปริมาณฝุ่นละอองขนาดเล็กอยู่ในเกณฑ์ที่มีผลกระทบต่อสุขภาพ",
    hazard_air_advice: "สวมหน้ากาก N95 หรือ KF94 เมื่อต้องออกนอกอาคาร ปิดประตูหน้าต่าง และเปิดเครื่องฟอกอากาศ",
    hazard_official_title: "ประกาศเตือนภัยจากกรมอุตุนิยมวิทยา",
    hazard_official_desc: "ประกาศแจ้งเตือนภัยอย่างเป็นทางการสำหรับพื้นที่นี้",
    hazard_official_advice: "ปฏิบัติตามคำแนะนำของเจ้าหน้าที่และเตรียมพร้อมสิ่งของจำเป็นสำหรับกรณีฉุกเฉิน",
    settings_title: "ตั้งค่าการแจ้งเตือนสภาพอากาศรุนแรง",
    settings_sound_label: "เปิดเสียงสัญญาณเตือนสังเคราะห์",
    settings_sound_sub: "ส่งเสียงเตือนสองระดับเมื่อเกิดสภาพอากาศที่เกินเกณฑ์ความปลอดภัย",
    settings_push_label: "การแจ้งเตือนผ่านเบราว์เซอร์และมือถือ",
    settings_push_sub: "รับแบนเนอร์แจ้งเตือนทันทีแม้จะเปิดหน้าต่างหรือแอปอื่นอยู่",
    settings_types_title: "ประเภทภัยธรรมชาติที่เฝ้าระวัง",
    settings_storm_label: "พายุฝนฟ้าคะนองและฟ้าผ่า",
    settings_wind_label: "ลมกระโชกแรง (> 45 กม./ชม.)",
    settings_heat_label: "คลื่นความร้อนสูงจัด (> 38°C)",
    settings_cold_label: "อากาศหนาวจัดจุดเยือกแข็ง (≤ 0°C)",
    settings_rain_label: "ฝนตกหนักและน้ำท่วมฉับพลัน",
    settings_air_label: "ฝุ่น PM2.5 และคุณภาพอากาศวิกฤต (AQI > 150)",
    close: "เสร็จสิ้น",
  },
  es: {
    title: "Vigilante del Clima Severo y Alertas",
    subtitle: "Monitoreo en tiempo real de tormentas, vendavales, olas de calor y aire peligroso",
    shield_active: "Escudo Activo",
    shield_all_clear: "Todo Despejado — Condiciones seguras",
    shield_hazards_found: "Peligros Meteorológicos Detectados",
    monitoring_city: "Monitoreando",
    test_btn: "Probar Alerta y Sonido",
    settings_btn: "Ajustes de Alertas",
    sound_on: "Sonido Activado",
    sound_muted: "Silenciado",
    notify_permission_cta: "Activar Notificaciones",
    notify_enabled: "Notificaciones Activas",
    notify_blocked: "Notificaciones Bloqueadas",
    test_toast_title: "Vigilante del Clima Activo",
    test_toast_desc: "Esta es una notificación de prueba con sonido sintetizado. ¡Mantente a salvo!",
    hazard_thunderstorm_title: "Alerta de Tormenta Eléctrica Severa",
    hazard_thunderstorm_desc: "Relámpagos intensos, ráfagas o granizo detectados en la zona.",
    hazard_thunderstorm_advice: "Refúgiate de inmediato en un edificio seguro. Desconecta aparatos electrónicos y aléjate de ventanas.",
    hazard_wind_title: "Aviso de Vientos Fuertes y Vendaval",
    hazard_wind_desc: "Ráfagas de viento peligrosas que superan los límites seguros.",
    hazard_wind_advice: "Asegura objetos exteriores, ten cuidado con ramas caídas y evita conducir vehículos de gran altura.",
    hazard_heat_title: "Aviso de Calor Extremo e Índice Térmico",
    hazard_heat_desc: "Temperaturas peligrosas con alto riesgo de insolación y deshidratación.",
    hazard_heat_advice: "Hidrátate constantemente con electrolitos, permanece en sitios con aire acondicionado y evita ejercicio intenso.",
    hazard_cold_title: "Aviso de Bajas Temperaturas y Heladas",
    hazard_cold_desc: "Condiciones bajo cero con riesgo de hielo negro e hipotermia.",
    hazard_cold_advice: "Vístete con capas térmicas, protege tuberías expuestas y camina con cuidado sobre pavimentos helados.",
    hazard_rain_title: "Aviso de Lluvia Torrencial e Inundación Repentina",
    hazard_rain_desc: "Fuertes aguaceros pueden provocar acumulación rápida de agua en calles.",
    hazard_rain_advice: "No cruces pasos a desnivel inundados ni corrientes de agua. Protege objetos valiosos de niveles bajos.",
    hazard_air_title: "Alerta de Calidad del Aire y PM2.5 Peligroso",
    hazard_air_desc: "Contaminación por partículas finas en niveles dañinos para la salud.",
    hazard_air_advice: "Usa mascarilla N95 en exteriores, mantén ventanas cerradas y utiliza purificadores de aire interiores.",
    hazard_official_title: "Boletín Meteorológico Oficial",
    hazard_official_desc: "Aviso de emergencia emitido por las autoridades meteorológicas locales.",
    hazard_official_advice: "Sigue las directivas oficiales de emergencia y mantén suministros básicos a mano.",
    settings_title: "Preferencias de Alertas Meteorológicas",
    settings_sound_label: "Reproducir Campana de Audio Sintetizada",
    settings_sound_sub: "Tono armónico dual cuando el clima supera los límites de seguridad",
    settings_push_label: "Notificaciones Push en Navegador y Móvil",
    settings_push_sub: "Recibe alertas instantáneas incluso cuando estés en otras pestañas",
    settings_types_title: "Peligros Monitoreados",
    settings_storm_label: "Tormentas Eléctricas y Rayos",
    settings_wind_label: "Vientos Fuertes (> 45 km/h)",
    settings_heat_label: "Olas de Calor Extremo (> 38°C)",
    settings_cold_label: "Heladas y Frío Polar (≤ 0°C)",
    settings_rain_label: "Lluvias Torrenciales e Inundaciones",
    settings_air_label: "Calidad del Aire Peligrosa (AQI > 150)",
    close: "Listo",
  },
  ja: {
    title: "警報・悪天候監視アラート",
    subtitle: "突発的な雷雨、強風、熱中症警戒、PM2.5危険値をリアルタイム監視",
    shield_active: "監視シールド稼働中",
    shield_all_clear: "警報なし — 天候は安全です",
    shield_hazards_found: "気象警報が検知されました",
    monitoring_city: "監視対象地域",
    test_btn: "警報音・通知テスト",
    settings_btn: "アラート設定",
    sound_on: "音量オン",
    sound_muted: "消音",
    notify_permission_cta: "プッシュ通知を有効化",
    notify_enabled: "通知が有効です",
    notify_blocked: "通知がブロックされています",
    test_toast_title: "気象監視システムは正常に作動しています",
    test_toast_desc: "これは警報チャイム音付きのテスト通知です。安全にお過ごしください！",
    hazard_thunderstorm_title: "激しい雷雨・落雷警報",
    hazard_thunderstorm_desc: "激しい雷放電、突風、または降雹が検知されています。",
    hazard_thunderstorm_advice: "直ちに頑丈な建物へ避難してください。家電のプラグを抜き窓から離れてください。",
    hazard_wind_title: "強風・暴風警戒アラート",
    hazard_wind_desc: "突風が安全基準を超えています。",
    hazard_wind_advice: "ベランダの飛びやすい物を固定し、倒木や看板の落下に注意してください。",
    hazard_heat_title: "極端な暑さ・熱中症特別警戒",
    hazard_heat_desc: "熱中症のリスクが非常に高い危険な暑さです。",
    hazard_heat_advice: "こまめな水分・塩分補給を行い、エアコンの効いた室内で過ごしてください。",
    hazard_cold_title: "凍結・低温警報",
    hazard_cold_desc: "路面凍結や低体温症の危険がある氷点下の寒さです。",
    hazard_cold_advice: "十分な防寒着を着用し、凍結した路面での転倒に注意してください。",
    hazard_rain_title: "猛烈な雨・浸水害警戒",
    hazard_rain_desc: "急激な道路冠水や低地浸水の恐れがある激しい降雨です。",
    hazard_rain_advice: "冠水した道路やアンダーパスを避け、危険な増水河川に近づかないでください。",
    hazard_air_title: "大気汚染・PM2.5危険水準アラート",
    hazard_air_desc: "微小粒子状物質が健康に影響を及ぼす危険なレベルです。",
    hazard_air_advice: "外出時は高性能マスクを着用し、窓を閉めて空気清浄機を稼働させてください。",
    hazard_official_title: "気象庁・公式気象特別速報",
    hazard_official_desc: "自治体または気象当局からの公式緊急情報です。",
    hazard_official_advice: "地域の防災指示に従い、非常持ち出し袋を確認してください。",
    settings_title: "気象アラート監視設定",
    settings_sound_label: "合成チャイム警報音を鳴らす",
    settings_sound_sub: "気象が安全基準を超えた場合に2音の警告チャイムを鳴らします",
    settings_push_label: "ブラウザ・モバイル通知",
    settings_push_sub: "別のタブを開いていても緊急アラートを受信します",
    settings_types_title: "監視対象の気象項目",
    settings_storm_label: "雷雨・落雷",
    settings_wind_label: "強風・暴風 (> 45 km/h)",
    settings_heat_label: "極端な猛暑 (> 38°C)",
    settings_cold_label: "氷点下の冷え込み (≤ 0°C)",
    settings_rain_label: "猛烈な雨・洪水警戒",
    settings_air_label: "大気汚染・高濃度PM2.5 (AQI > 150)",
    close: "完了",
  },
  zh: {
    title: "严峻天气守望者与实时预警",
    subtitle: "全天候监测雷暴、大风、极端高温和重度空气污染",
    shield_active: "防护盾已开启",
    shield_all_clear: "一切正常 — 天气状况安全",
    shield_hazards_found: "检测到突发气象风险",
    monitoring_city: "监测城市",
    test_btn: "测试提示音与通知",
    settings_btn: "预警设置",
    sound_on: "开启声音",
    sound_muted: "静音",
    notify_permission_cta: "开启弹窗通知",
    notify_enabled: "通知已启用",
    notify_blocked: "通知已被阻止",
    test_toast_title: "天气守护者正在正常运行",
    test_toast_desc: "这是一条包含合成提示音的测试预警，祝您出行平安！",
    hazard_thunderstorm_title: "强对流雷暴与雷电预警",
    hazard_thunderstorm_desc: "监测到剧烈雷电、短时雷暴大风或冰雹。",
    hazard_thunderstorm_advice: "请立即进入坚固建筑物内避险，拔掉精密电器插头并远离窗户。",
    hazard_wind_title: "大风与强阵风预警",
    hazard_wind_desc: "瞬间阵风速度超过安全警戒值。",
    hazard_wind_advice: "请固定阳台室外物品，谨防高空坠物和折断树枝，避免驾驶大型高箱车。",
    hazard_heat_title: "极端酷热指数高温预警",
    hazard_heat_desc: "体感极热，极易发生中暑或脱水危险。",
    hazard_heat_advice: "及时补充电解质水分，尽量处于空调清凉环境中，避免高温下剧烈运动。",
    hazard_cold_title: "极寒与冰冻低温警报",
    hazard_cold_desc: "气温降至冰点以下，有路面结冰和失温风险。",
    hazard_cold_advice: "请穿着多层防寒保暖衣物，防范水管冻裂，行车走路谨防地面积冰。",
    hazard_rain_title: "暴雨与短时内涝积水预警",
    hazard_rain_desc: "短时强降水可能导致城市道路急剧积水与低洼处内涝。",
    hazard_rain_advice: "请勿涉水穿越积水立交桥或未知深水区，将低处贵重物品抬高。",
    hazard_air_title: "重度空气污染与PM2.5预警",
    hazard_air_desc: "细颗粒物浓度已达到对健康有害的高风险水平。",
    hazard_air_advice: "外出务必佩戴N95或防霾口罩，紧闭门窗并开启室内空气净化机。",
    hazard_official_title: "气象部门官方灾害公告",
    hazard_official_desc: "气象或防灾部门发布的实时官方预警通报。",
    hazard_official_advice: "请遵从当地应急减灾指示，保持通讯畅通与应急物资充足。",
    settings_title: "气象预警监测设置",
    settings_sound_label: "播放合成双音警报声",
    settings_sound_sub: "当突发天气超标时自动发出柔和提示音",
    settings_push_label: "浏览器与移动端推送通知",
    settings_push_sub: "即使在浏览其他网页或桌面时也能及时收到气象弹窗",
    settings_types_title: "监测的气象灾害类型",
    settings_storm_label: "雷暴与闪电",
    settings_wind_label: "大风烈风 (> 45 km/h)",
    settings_heat_label: "极端高温酷暑 (> 38°C)",
    settings_cold_label: "冰冻极寒天气 (≤ 0°C)",
    settings_rain_label: "短时暴雨与内涝",
    settings_air_label: "严重空气污染与高PM2.5 (AQI > 150)",
    close: "完成",
  },
  fr: {
    title: "Veille Météo Sévère & Alertes",
    subtitle: "Surveillance continue des orages, vents violents, canicules et pollution",
    shield_active: "Bouclier Actif",
    shield_all_clear: "R.A.S. — Conditions sécuritaires",
    shield_hazards_found: "Dangers Météo Détectés",
    monitoring_city: "Surveillance de",
    test_btn: "Tester Alerte & Son",
    settings_btn: "Paramètres",
    sound_on: "Son activé",
    sound_muted: "Muet",
    notify_permission_cta: "Activer les Notifications",
    notify_enabled: "Notifications actives",
    notify_blocked: "Notifications bloquées",
    test_toast_title: "Veille Météo Opérationnelle",
    test_toast_desc: "Notification test avec carillon sonore synthétique. Restez en sécurité !",
    hazard_thunderstorm_title: "Alerte Orages Violents & Foudre",
    hazard_thunderstorm_desc: "Éclairs intenses, bourrasques ou grêle détectés dans votre secteur.",
    hazard_thunderstorm_advice: "Abritez-vous immédiatement dans un bâtiment solide. Éloignez-vous des fenêtres.",
    hazard_wind_title: "Alerte Vents Violents & Coup de Vent",
    hazard_wind_desc: "Les rafales de vent dépassent les seuils de sécurité.",
    hazard_wind_advice: "Fixez les objets extérieurs, attention aux chutes de branches d'arbres.",
    hazard_heat_title: "Vigilance Canicule & Chaleur Extrême",
    hazard_heat_desc: "Risque très élevé de coup de chaleur et de déshydratation.",
    hazard_heat_advice: "Hydratez-vous régulièrement, restez au frais et évitez les efforts physiques intenses.",
    hazard_cold_title: "Alerte Gel & Températures Glaciales",
    hazard_cold_desc: "Températures négatives avec risque de verglas.",
    hazard_cold_advice: "Portez des vêtements thermiques superposés et soyez très vigilant sur les routes verglacées.",
    hazard_rain_title: "Vigilance Pluie Torrentielle & Inondation",
    hazard_rain_desc: "Fortes précipitations risquant de saturer rapidement le réseau urbain.",
    hazard_rain_advice: "Ne vous engagez pas sur les passages sous voie inondés et limitez vos déplacements.",
    hazard_air_title: "Alerte Qualité de l'Air & PM2.5",
    hazard_air_desc: "Concentration élevée de particules fines nocive pour la santé.",
    hazard_air_advice: "Portez un masque N95 en extérieur, fermez les fenêtres et activez un purificateur.",
    hazard_official_title: "Bulletin Météorologique Officiel",
    hazard_official_desc: "Avis d'urgence officiel émis par les services météorologiques régionaux.",
    hazard_official_advice: "Respectez les consignes de sécurité des autorités locales.",
    settings_title: "Préférences d'Alerte Météo",
    settings_sound_label: "Jouer le Carillon Audio Synthétique",
    settings_sound_sub: "Avertissement sonore doux à deux tons en cas de dépassement des seuils",
    settings_push_label: "Notifications Push Navigateur & Mobile",
    settings_push_sub: "Recevez les alertes instantanées même sur un autre onglet",
    settings_types_title: "Dangers Surveillés",
    settings_storm_label: "Orages et foudre",
    settings_wind_label: "Vents violents (> 45 km/h)",
    settings_heat_label: "Canicule (> 38°C)",
    settings_cold_label: "Grand froid (≤ 0°C)",
    settings_rain_label: "Pluies torrentielles",
    settings_air_label: "Air toxique (AQI > 150)",
    close: "Fermer",
  },
  de: {
    title: "Unwetter-Wächter & Benachrichtigungen",
    subtitle: "Echtzeit-Überwachung vor Gewittern, Sturm, Hitzewellen & Feinstaub",
    shield_active: "Schutzschild Aktiv",
    shield_all_clear: "Alles Ruhig — Sichere Wetterlage",
    shield_hazards_found: "Wettergefahren Erkannt",
    monitoring_city: "Überwachung für",
    test_btn: "Alarm & Ton testen",
    settings_btn: "Alarmeinstellungen",
    sound_on: "Ton An",
    sound_muted: "Stumm",
    notify_permission_cta: "Benachrichtigungen aktivieren",
    notify_enabled: "Benachrichtigungen Aktiv",
    notify_blocked: "Benachrichtigungen Blockiert",
    test_toast_title: "Unwetter-Wächter bereit",
    test_toast_desc: "Testbenachrichtigung mit synthetisiertem Warnton. Passen Sie auf sich auf!",
    hazard_thunderstorm_title: "Schwere Gewitter- und Blitzwarnung",
    hazard_thunderstorm_desc: "Intensive Blitze, Sturmböen oder Hagel in der Region.",
    hazard_thunderstorm_advice: "Suchen Sie unverzüglich Schutz in festen Gebäuden und meiden Sie Fensternähe.",
    hazard_wind_title: "Sturm- und Orkanböen-Warnung",
    hazard_wind_desc: "Gefährliche Windböen übersteigen sichere Grenzwerte.",
    hazard_wind_advice: "Sichern Sie lose Gegenstände im Freien, achten Sie auf herabstürzende Äste.",
    hazard_heat_title: "Warnung vor Extremer Hitze",
    hazard_heat_desc: "Gefahr von Hitzschlag und starker Dehydrierung.",
    hazard_heat_advice: "Viel trinken, kühle Räume aufsuchen und anstrengende Tätigkeiten im Freien vermeiden.",
    hazard_cold_title: "Frost- und Kältewarnung",
    hazard_cold_desc: "Temperaturen unter dem Gefrierpunkt mit Glättegefahr.",
    hazard_cold_advice: "Warme Kleidungsschichten tragen und auf glatten Gehwegen vorsichtig sein.",
    hazard_rain_title: "Starkregen- und Überflutungswarnung",
    hazard_rain_desc: "Heftige Niederschläge können zu raschen Überflutungen führen.",
    hazard_rain_advice: "Überflutete Unterführungen meiden und Kellerbereiche sichern.",
    hazard_air_title: "Warnung vor Schlechter Luft & Feinstaub",
    hazard_air_desc: "Hohe PM2.5-Werte belasten die Atemwege.",
    hazard_air_advice: "Draußen N95-Maske tragen, Fenster geschlossen halten.",
    hazard_official_title: "Amtliche Wetterwarnung",
    hazard_official_desc: "Offizielle Warnung der regionalen Wetterbehörden.",
    hazard_official_advice: "Befolgen Sie die behördlichen Schutzanweisungen.",
    settings_title: "Wetterwarnungs-Einstellungen",
    settings_sound_label: "Synthetischen Warnton abspielen",
    settings_sound_sub: "Angenehmer Doppelton-Gong bei Überschreitung kritischer Schwellen",
    settings_push_label: "Browser- & Mobil-Pushmeldungen",
    settings_push_sub: "Sofortige Warnungen auch beim Surfen auf anderen Tabs",
    settings_types_title: "Überwachte Gefahren",
    settings_storm_label: "Gewitter & Blitzschlag",
    settings_wind_label: "Sturmböen (> 45 km/h)",
    settings_heat_label: "Extreme Hitzewellen (> 38°C)",
    settings_cold_label: "Frost & Kälte (≤ 0°C)",
    settings_rain_label: "Sturzfluten & Starkregen",
    settings_air_label: "Gesundheitsschädliche Luft (AQI > 150)",
    close: "Fertig",
  },
  pt: {
    title: "Vigilante de Clima Severo e Alertas",
    subtitle: "Monitoramento em tempo real contra tempestades, ventanias, calor e ar poluído",
    shield_active: "Escudo Ativo",
    shield_all_clear: "Tudo Calmo — Condições seguras",
    shield_hazards_found: "Riscos Meteorológicos Detectados",
    monitoring_city: "Monitorando",
    test_btn: "Testar Alerta e Som",
    settings_btn: "Configurações",
    sound_on: "Som Ligado",
    sound_muted: "Mudo",
    notify_permission_cta: "Ativar Notificações",
    notify_enabled: "Notificações Ativas",
    notify_blocked: "Notificações Bloqueadas",
    test_toast_title: "Vigilante Meteorológico Ativo",
    test_toast_desc: "Notificação de teste com aviso sonoro sintetizado. Fique em segurança!",
    hazard_thunderstorm_title: "Alerta de Tempestade e Raios",
    hazard_thunderstorm_desc: "Raios intensos, ventos fortes ou granizo detectados.",
    hazard_thunderstorm_advice: "Procure abrigo sólido imediatamente. Desconecte eletrônicos e fique longe de janelas.",
    hazard_wind_title: "Alerta de Ventos Fortes e Rajadas",
    hazard_wind_desc: "Rajadas perigosas de vento superando os limites seguros.",
    hazard_wind_advice: "Prenda objetos soltos em áreas externas e tome cuidado com árvores caídas.",
    hazard_heat_title: "Alerta de Calor Extremo",
    hazard_heat_desc: "Temperaturas perigosas com alto risco de insolação.",
    hazard_heat_advice: "Beba água regularmente, permaneça em ambientes climatizados e evite esforço excessivo.",
    hazard_cold_title: "Aviso de Frio Severo e Geada",
    hazard_cold_desc: "Condições próximas ou abaixo de zero com risco de gelo.",
    hazard_cold_advice: "Vista roupas térmicas em camadas e proteja áreas expostas.",
    hazard_rain_title: "Alerta de Chuva Torrencial e Alagamento",
    hazard_rain_desc: "Chuva intensa com risco rápido de acúmulo de água nas vias.",
    hazard_rain_advice: "Não atravesse ruas alagadas ou enxurradas fortes.",
    hazard_air_title: "Alerta de Ar Perigoso e PM2.5",
    hazard_air_desc: "Poluição particulada em nível nocivo à saúde.",
    hazard_air_advice: "Use máscara N95 ao ar livre e mantenha janelas fechadas.",
    hazard_official_title: "Boletim Meteorológico Oficial",
    hazard_official_desc: "Aviso emitido pela autoridade meteorológica regional.",
    hazard_official_advice: "Siga as orientações da defesa civil local.",
    settings_title: "Preferências de Alerta de Clima",
    settings_sound_label: "Tocar Alarme Sonoro Sintetizado",
    settings_sound_sub: "Aviso suave de dois tons ao ultrapassar limites de segurança",
    settings_push_label: "Notificações Push no Navegador e Celular",
    settings_push_sub: "Receba alertas mesmo com o navegador em segundo plano",
    settings_types_title: "Perigos Monitorados",
    settings_storm_label: "Tempestades e Raios",
    settings_wind_label: "Vendavais (> 45 km/h)",
    settings_heat_label: "Ondas de Calor (> 38°C)",
    settings_cold_label: "Frio e Congelamento (≤ 0°C)",
    settings_rain_label: "Chuvas Fortes e Inundações",
    settings_air_label: "Qualidade do Ar Nociva (AQI > 150)",
    close: "Concluído",
  },
  ru: {
    title: "Мониторинг Опасных Погодных Явлений",
    subtitle: "Контроль гроз, шквалов, аномальной жары, морозов и опасного загрязнения воздуха",
    shield_active: "Защита активна",
    shield_all_clear: "Спокойно — Опасных явлений нет",
    shield_hazards_found: "Обнаружены Опасные Явления",
    monitoring_city: "Мониторинг города",
    test_btn: "Тест сигнала и уведомления",
    settings_btn: "Настройки тревог",
    sound_on: "Звук вкл.",
    sound_muted: "Без звука",
    notify_permission_cta: "Включить уведомления",
    notify_enabled: "Уведомления активны",
    notify_blocked: "Уведомления заблокированы",
    test_toast_title: "Система оповещения активна",
    test_toast_desc: "Тестовое уведомление со звуковым сигналом. Берегите себя!",
    hazard_thunderstorm_title: "Штормовое предупреждение: Гроза",
    hazard_thunderstorm_desc: "Зафиксированы сильные молнии, шквалы или град.",
    hazard_thunderstorm_advice: "Укройтесь в капитальном здании, закройте окна и отключите чувствительные электроприборы.",
    hazard_wind_title: "Предупреждение: Шквалистый Ветер",
    hazard_wind_desc: "Порывы ветра превышают безопасные значения.",
    hazard_wind_advice: "Закрепите предметы на балконах, остерегайтесь падения веток и слабо закрепленных конструкций.",
    hazard_heat_title: "Предупреждение: Аномальная Жара",
    hazard_heat_desc: "Высокий риск теплового удара и обезвоживания.",
    hazard_heat_advice: "Пейте больше воды с минералами, избегайте прямых солнечных лучей и физических нагрузок.",
    hazard_cold_title: "Предупреждение: Сильный Мороз и Гололед",
    hazard_cold_desc: "Отрицательные температуры и высокий риск гололеда.",
    hazard_cold_advice: "Одевайтесь многослойно, берегите тепло и будьте внимательны на обледенелых дорогах.",
    hazard_rain_title: "Предупреждение: Ливень и Подтопление",
    hazard_rain_desc: "Интенсивные осадки могут вызвать быстрое затопление улиц.",
    hazard_rain_advice: "Избегайте затопленных подземных переходов и низин.",
    hazard_air_title: "Опасное загрязнение воздуха (PM2.5)",
    hazard_air_desc: "Концентрация опасных микрочастиц превысила допустимую норму.",
    hazard_air_advice: "Используйте респиратор N95 на улице, держите окна закрытыми.",
    hazard_official_title: "Официальное метеопредупреждение",
    hazard_official_desc: "Экстренное сообщение от региональных метеорологических служб.",
    hazard_official_advice: "Следуйте инструкциям экстренных служб.",
    settings_title: "Настройки погодных предупреждений",
    settings_sound_label: "Звуковой сигнал оповещения",
    settings_sound_sub: "Мягкий двухтональный сигнал при обнаружении угрозы",
    settings_push_label: "Push-уведомления в браузере и на телефоне",
    settings_push_sub: "Мгновенные оповещения даже при свернутом окне",
    settings_types_title: "Контролируемые угрозы",
    settings_storm_label: "Грозы и молнии",
    settings_wind_label: "Штормовой ветер (> 45 км/ч)",
    settings_heat_label: "Сильная жара (> 38°C)",
    settings_cold_label: "Сильный мороз (≤ 0°C)",
    settings_rain_label: "Ливни и подтопления",
    settings_air_label: "Опасный воздух и PM2.5 (AQI > 150)",
    close: "Готово",
  },
  ar: {
    title: "مراقب الطقس القاسي والتنبيهات",
    subtitle: "مراقبة حية للعواصف الرعدية، الرياح العاتية، موجات الحر وتلوث الهواء",
    shield_active: "درع الحماية نشط",
    shield_all_clear: "الأجواء آمنة ومستقرة",
    shield_hazards_found: "تم رصد مخاطر جوية نشطة",
    monitoring_city: "مراقبة مدينة",
    test_btn: "اختبار النغمة والإشعار",
    settings_btn: "إعدادات التنبيه",
    sound_on: "الصوت مفعّل",
    sound_muted: "مكتوم",
    notify_permission_cta: "تفعيل الإشعارات",
    notify_enabled: "الإشعارات مفعلة",
    notify_blocked: "الإشعارات محظورة",
    test_toast_title: "نظام مراقبة الطقس يعمل بنجاح",
    test_toast_desc: "هذا إشعار تجريبي مع نغمة تحذيرية صوتية. دمتم سالمين!",
    hazard_thunderstorm_title: "تحذير من عواصف رعدية شديدة",
    hazard_thunderstorm_desc: "تم رصد صواعق رعدية قوية ورياح هابطة أو بَرَد.",
    hazard_thunderstorm_advice: "احتمِ فوراً داخل مبنى آمن وتجنب النوافذ وافصل الأجهزة الحساسة.",
    hazard_wind_title: "تحذير من رياح قوية وعواصف",
    hazard_wind_desc: "هبات الرياح تتجاوز الحدود الآمنة.",
    hazard_wind_advice: "قم بتثبيت الأشياء المتطايرة في الخارج وتوخ الحذر من سقوط الأغصان.",
    hazard_heat_title: "تنبيه من موجة حر شديدة",
    hazard_heat_desc: "درجات حرارة مرتفعة تزيد من خطر ضربات الشمس.",
    hazard_heat_advice: "أكثر من شرب السوائل وابق في أماكن مكيفة وتجنب الجهد في الهواء الطلق.",
    hazard_cold_title: "تحذير من درجات حرارة انجمادية",
    hazard_cold_desc: "أجواء شديدة البرودة مع خطر تشكل الجليد.",
    hazard_cold_advice: "ارتدِ ملابس دافئة متعددة الطبقات وانتبه للأسطح الزلقة.",
    hazard_rain_title: "تحذير من أمطار غزيرة وسيول مفاجئة",
    hazard_rain_desc: "هطول أمطار كثيفة قد يسبب تجمعات مائية سريعة.",
    hazard_rain_advice: "تجنب المرور في الأنفاق المغمورة ومجاري السيول.",
    hazard_air_title: "تنبيه من جودة هواء خطرة وغبار PM2.5",
    hazard_air_desc: "ارتفاع الجسيمات الدقيقة إلى مستويات تضر بالصحة.",
    hazard_air_advice: "ارتدِ كمامة واقية N95 وأغلق النوافذ وشغّل أجهزة تنقية الهواء.",
    hazard_official_title: "نشرة الأرصاد الجوية الرسمية",
    hazard_official_desc: "بيان طوارئ صادر عن الجهات الرسمية المعنية بالطقس.",
    hazard_official_advice: "اتبع إرشادات السلامة الصادرة عن السلطات المحلية.",
    settings_title: "تفضيلات تنبيهات الطقس",
    settings_sound_label: "تشغيل نغمة التحذير الصوتية",
    settings_sound_sub: "نغمة هادئة ثنائية التردد عند تجاوز مؤشرات السلامة",
    settings_push_label: "إشعارات المتصفح والهاتف",
    settings_push_sub: "استقبل التنبيهات الفورية حتى أثناء تصفح نوافذ أخرى",
    settings_types_title: "المخاطر المراقبة",
    settings_storm_label: "العواصف الرعدية والصواعق",
    settings_wind_label: "الرياح القوية (> 45 كم/س)",
    settings_heat_label: "موجات الحرارة الشديدة (> 38°م)",
    settings_cold_label: "الصقيع والبرودة القارسة (≤ 0°م)",
    settings_rain_label: "الأمطار الغزيرة والسيول",
    settings_air_label: "تلوث الهواء والغبار (AQI > 150)",
    close: "تم",
  },
  ko: {
    title: "위험 기상 감시 및 실시간 알림",
    subtitle: "돌발 뇌우, 강풍, 폭염, 혹한 및 미세먼지 위험 실시간 자동 감시",
    shield_active: "기상 쉴드 작동 중",
    shield_all_clear: "이상 없음 — 안전한 날씨입니다",
    shield_hazards_found: "위험 기상 현상 감지됨",
    monitoring_city: "감시 도시",
    test_btn: "알림음 및 푸시 테스트",
    settings_btn: "알림 설정",
    sound_on: "소리 켜짐",
    sound_muted: "음소거",
    notify_permission_cta: "푸시 알림 활성화",
    notify_enabled: "알림 활성화됨",
    notify_blocked: "알림 차단됨",
    test_toast_title: "기상 알리미가 정상 작동 중입니다",
    test_toast_desc: "합성 경고음과 함께 표시되는 테스트 알림입니다. 안전에 유의하세요!",
    hazard_thunderstorm_title: "강한 뇌우 및 낙뢰 경보",
    hazard_thunderstorm_desc: "주변 지역에 강한 번개, 돌풍 또는 우박이 감지되었습니다.",
    hazard_thunderstorm_advice: "즉시 견고한 실내로 대피하시고 창문에서 떨어져 전자기기 플러그를 분리하세요.",
    hazard_wind_title: "강풍 및 순간돌풍 주의보",
    hazard_wind_desc: "순간 풍속이 안전 기준을 초과했습니다.",
    hazard_wind_advice: "야외 시설물을 단단히 고정하고 낙하물이나 부러진 나뭇가지에 주의하세요.",
    hazard_heat_title: "극심한 폭염 및 열사병 경보",
    hazard_heat_desc: "열사병과 탈수 위험이 매우 높은 위험한 기온입니다.",
    hazard_heat_advice: "충분한 수분을 섭취하고 시원한 실내에 머무르며 격렬한 야외 운동을 자제하세요.",
    hazard_cold_title: "한파 및 결빙 주의보",
    hazard_cold_desc: "빙판길 및 저체온증 위험이 있는 영하의 날씨입니다.",
    hazard_cold_advice: "보온 의류를 겹쳐 입으시고 수도관 동파 및 빙판길 낙상에 주의하세요.",
    hazard_rain_title: "집중호우 및 침수 경보",
    hazard_rain_desc: "단시간 폭우로 도로 침수 및 저지대 침수 우려가 있습니다.",
    hazard_rain_advice: "침수된 지하차도나 하천변에 접근하지 마시고 안전한 고지대로 이동하세요.",
    hazard_air_title: "미세먼지(PM2.5) 매우나쁨 경보",
    hazard_air_desc: "초미세먼지 농도가 건강에 유해한 수준에 도달했습니다.",
    hazard_air_advice: "외출 시 KF94 마스크를 착용하시고 창문을 닫은 채 공기청정기를 가동하세요.",
    hazard_official_title: "기상청 공식 기상특보",
    hazard_official_desc: "관할 기상 당국에서 발령한 공식 방재 경보입니다.",
    hazard_official_advice: "지역 재난안전 지침을 준수하시고 비상 용품을 점검하세요.",
    settings_title: "기상 알림 환경 설정",
    settings_sound_label: "합성 차임 알림음 재생",
    settings_sound_sub: "기상 위험이 감지될 때 부드러운 2음계 차임벨을 울립니다",
    settings_push_label: "브라우저 및 모바일 푸시 알림",
    settings_push_sub: "다른 탭이나 화면을 보고 있을 때도 즉시 경보 팝업을 수신합니다",
    settings_types_title: "감시할 기상 위험 항목",
    settings_storm_label: "뇌우 및 낙뢰",
    settings_wind_label: "강풍 (> 45 km/h)",
    settings_heat_label: "극심한 폭염 (> 38°C)",
    settings_cold_label: "영하 혹한 (≤ 0°C)",
    settings_rain_label: "집중호우 및 침수",
    settings_air_label: "미세먼지 위험 (AQI > 150)",
    close: "완료",
  },
  vi: {
    title: "Hệ Thống Canh Giữ Thời Tiết Nguy Hiểm & Cảnh Báo",
    subtitle: "Giám sát thời gian thực dông lốc, gió giật, nắng nóng cực đoan và bụi mịn PM2.5",
    shield_active: "Lá Chắn Hoạt Động",
    shield_all_clear: "Bình Thường — Thời tiết an toàn",
    shield_hazards_found: "Phát Hiện Nguy Cơ Thời Tiết",
    monitoring_city: "Đang theo dõi",
    test_btn: "Thử Chuông & Thông Báo",
    settings_btn: "Cài Đặt Cảnh Báo",
    sound_on: "Bật âm thanh",
    sound_muted: "Tắt tiếng",
    notify_permission_cta: "Bật Thông Báo Trình Duyệt",
    notify_enabled: "Thông báo đang bật",
    notify_blocked: "Thông báo bị chặn",
    test_toast_title: "Hệ thống giám sát đang hoạt động",
    test_toast_desc: "Đây là thông báo thử nghiệm kèm âm thanh cảnh báo. Chúc bạn một ngày an lành!",
    hazard_thunderstorm_title: "Cảnh Báo Dông Sét & Lốc Xoáy",
    hazard_thunderstorm_desc: "Sét mạnh, gió giật hoặc mưa đá được ghi nhận trong khu vực.",
    hazard_thunderstorm_advice: "Tìm nơi trú ẩn kiên cố ngay lập tức. Tránh xa cửa sổ và ngắt nguồn điện nhạy cảm.",
    hazard_wind_title: "Cảnh Báo Gió Giật Mạnh",
    hazard_wind_desc: "Tốc độ gió giật vượt ngưỡng an toàn cho phép.",
    hazard_wind_advice: "Chằng chống vật dụng ngoài trời, cẩn thận cành cây gãy và hạn chế lái xe mui cao.",
    hazard_heat_title: "Cảnh Báo Nắng Nóng Cực Đoan",
    hazard_heat_desc: "Nguy cơ sốc nhiệt và mất nước rất cao do chỉ số nhiệt nguy hiểm.",
    hazard_heat_advice: "Uống nhiều nước khoáng, ở nơi có điều hòa mát mẻ và tránh vận động mạnh ngoài trời.",
    hazard_cold_title: "Cảnh Báo Rét Đậm Rét Hại & Băng Giá",
    hazard_cold_desc: "Nhiệt độ xuống mức đóng băng có nguy cơ trơn trượt.",
    hazard_cold_advice: "Mặc nhiều lớp áo ấm giữ nhiệt và cẩn thận khi đi trên đường trơn trượt.",
    hazard_rain_title: "Cảnh Báo Mưa Xối Xả & Ngập Úng Cục Bộ",
    hazard_rain_desc: "Mưa lớn dồn dập có thể gây ngập đường phố nhanh chóng.",
    hazard_rain_advice: "Không đi qua hầm chui ngập nước hoặc dòng nước chảy xiết.",
    hazard_air_title: "Cảnh Báo Ô Nhiễm Không Khí & Bụi Mịn PM2.5",
    hazard_air_desc: "Nồng độ bụi mịn PM2.5 tăng vọt tới mức nguy hại cho sức khỏe.",
    hazard_air_advice: "Đeo khẩu trang N95 khi ra ngoài, đóng kín cửa và bật máy lọc không khí.",
    hazard_official_title: "Bản Tin Khí Tượng Thủy Văn Chính Thức",
    hazard_official_desc: "Thông báo khẩn từ cơ quan dự báo thời tiết địa phương.",
    hazard_official_advice: "Tuân thủ chỉ dẫn an toàn phòng chống thiên tai của địa phương.",
    settings_title: "Tùy Chọn Cảnh Báo Thời Tiết",
    settings_sound_label: "Phát Chuông Cảnh Báo Tổng Hợp",
    settings_sound_sub: "Âm thanh hai giai điệu êm dịu khi thời tiết vượt ngưỡng nguy hiểm",
    settings_push_label: "Thông Báo Đẩy Trên Trình Duyệt & Điện Thoại",
    settings_push_sub: "Nhận thông báo khẩn ngay cả khi đang xem tab khác",
    settings_types_title: "Các Loại Hình Thiên Tai Giám Sát",
    settings_storm_label: "Dông sét & sấm chớp",
    settings_wind_label: "Gió mạnh (> 45 km/h)",
    settings_heat_label: "Nắng nóng gay gắt (> 38°C)",
    settings_cold_label: "Rét buốt đóng băng (≤ 0°C)",
    settings_rain_label: "Mưa to & ngập lụt",
    settings_air_label: "Ô nhiễm không khí (AQI > 150)",
    close: "Xong",
  },
  id: {
    title: "Pengawas Cuaca Ekstrem & Peringatan",
    subtitle: "Pemantauan langsung badai petir, angin kencang, gelombang panas & polusi udara",
    shield_active: "Pelindung Aktif",
    shield_all_clear: "Aman — Kondisi cuaca baik",
    shield_hazards_found: "Bahaya Cuaca Terdeteksi",
    monitoring_city: "Memantau kota",
    test_btn: "Uji Lonceng & Notifikasi",
    settings_btn: "Pengaturan Peringatan",
    sound_on: "Suara Aktif",
    sound_muted: "Hening",
    notify_permission_cta: "Aktifkan Notifikasi",
    notify_enabled: "Notifikasi Aktif",
    notify_blocked: "Notifikasi Diblokir",
    test_toast_title: "Pengawas Cuaca Berjalan Normal",
    test_toast_desc: "Ini adalah notifikasi uji coba dengan lonceng alarm sintetis. Tetap aman!",
    hazard_thunderstorm_title: "Peringatan Badai Petir Parah",
    hazard_thunderstorm_desc: "Kilat kuat, angin puting beliung, atau hujan es terdeteksi.",
    hazard_thunderstorm_advice: "Segera berlindung di dalam bangunan kokoh dan jauhi jendela.",
    hazard_wind_title: "Peringatan Angin Kencang & Puting Beliung",
    hazard_wind_desc: "Kecepatan hembusan angin melebihi batas aman.",
    hazard_wind_advice: "Kencangkan perabot luar ruangan, waspadai pohon tumbang.",
    hazard_heat_title: "Peringatan Suhu Panas Ekstrem",
    hazard_heat_desc: "Risiko heatstroke dan dehidrasi sangat tinggi.",
    hazard_heat_advice: "Cukupi kebutuhan cairan, berteduh di ruangan ber-AC, dan hindari aktivitas berat di luar ruangan.",
    hazard_cold_title: "Peringatan Suhu Dingin Membeku",
    hazard_cold_desc: "Kondisi sangat dingin dengan risiko hipotermia.",
    hazard_cold_advice: "Gunakan pakaian hangat berlapis dan berhati-hati di jalan yang licin.",
    hazard_rain_title: "Peringatan Hujan Lebat & Banjir Kilat",
    hazard_rain_desc: "Curah hujan tinggi berpotensi menyebabkan genangan air cepat di jalan.",
    hazard_rain_advice: "Hindari melintasi jalan bawah tanah yang tergenang atau arus air deras.",
    hazard_air_title: "Peringatan Polusi Udara Berbahaya & PM2.5",
    hazard_air_desc: "Partikel berbahaya PM2.5 mencapai tingkat tidak sehat.",
    hazard_air_advice: "Gunakan masker N95 di luar ruangan dan tutup jendela.",
    hazard_official_title: "Peringatan Resmi BMKG",
    hazard_official_desc: "Buletin darurat dari otoritas cuaca resmi.",
    hazard_official_advice: "Ikuti panduan tanggap darurat dari otoritas setempat.",
    settings_title: "Pengaturan Peringatan Cuaca",
    settings_sound_label: "Bunyikan Lonceng Audio Sintetis",
    settings_sound_sub: "Nada ganda lembut saat cuaca melampaui batas aman",
    settings_push_label: "Notifikasi Push Browser & Ponsel",
    settings_push_sub: "Terima peringatan langsung bahkan saat membuka tab lain",
    settings_types_title: "Jenis Bahaya yang Dipantau",
    settings_storm_label: "Badai Petir & Petir",
    settings_wind_label: "Angin Kencang (> 45 km/jam)",
    settings_heat_label: "Gelombang Panas (> 38°C)",
    settings_cold_label: "Udara Dingin Beku (≤ 0°C)",
    settings_rain_label: "Hujan Lebat & Banjir",
    settings_air_label: "Kualitas Udara Buruk (AQI > 150)",
    close: "Selesai",
  },
  hi: {
    title: "गंभीर मौसम संरक्षक एवं चेतावनी प्रणाली",
    subtitle: "तूफान, तेज हवाओं, लू, शीतलहर एवं वायु प्रदूषण की लाइव निगरानी",
    shield_active: "सुरक्षा कवच सक्रिय",
    shield_all_clear: "सब शांत — मौसम सुरक्षित है",
    shield_hazards_found: "मौसम संबंधी खतरे पाए गए",
    monitoring_city: "निगरानी शहर",
    test_btn: "अलर्ट व ध्वनि परीक्षण",
    settings_btn: "अलर्ट सेटिंग्स",
    sound_on: "ध्वनि चालू",
    sound_muted: "मौन",
    notify_permission_cta: "सूचनाएं सक्षम करें",
    notify_enabled: "सूचनाएं सक्रिय हैं",
    notify_blocked: "सूचनाएं अवरुद्ध हैं",
    test_toast_title: "मौसम संरक्षक सफलतापूर्वक कार्य कर रहा है",
    test_toast_desc: "यह कृत्रिम चेतावनी ध्वनि के साथ एक परीक्षण सूचना है। सुरक्षित रहें!",
    hazard_thunderstorm_title: "भीषण आंधी-तूफान व वज्रपात चेतावनी",
    hazard_thunderstorm_desc: "तीव्र बिजली कड़कने, तेज अंधड़ अथवा ओलावृष्टि की संभावना।",
    hazard_thunderstorm_advice: "तुरंत पक्के भवन में शरण लें, खिड़कियों से दूर रहें और संवेदनशील इलेक्ट्रॉनिक उपकरण बंद रखें।",
    hazard_wind_title: "तेज आंधी व विनाशकारी हवाओं की चेतावनी",
    hazard_wind_desc: "हवा के झोंके सुरक्षित सीमा से कहीं अधिक तीव्र हैं।",
    hazard_wind_advice: "बाहरी वस्तुओं को सुरक्षित बांधें, पेड़ों की डालियों और होर्डिंग्स से दूर रहें।",
    hazard_heat_title: "भीषण लू व अत्यधिक ताप सूचकांक चेतावनी",
    hazard_heat_desc: "लू लगने (हीटस्ट्रोक) तथा निर्जलीकरण का गंभीर खतरा।",
    hazard_heat_advice: "पर्याप्त पानी व ओआरएस का सेवन करें, धूप से बचें और वातानुकूलित स्थानों में रहें।",
    hazard_cold_title: "शीतलहर व पाला जमने की चेतावनी",
    hazard_cold_desc: "तापमान शून्य के करीब, हाइपोथर्मिया का जोखिम।",
    hazard_cold_advice: "गर्म कपड़ों की कई परतें पहनें और फिसलन भरी सड़कों पर सावधानी बरतें।",
    hazard_rain_title: "मूसलाधार वर्षा व अचानक बाढ़ की चेतावनी",
    hazard_rain_desc: "अत्यधिक वर्षा से जलभराव और बाढ़ की आशंका।",
    hazard_rain_advice: "जलमग्न रास्तों और निचले पुलों को पार करने से बचें।",
    hazard_air_title: "गंभीर वायु प्रदूषण व PM2.5 अलर्ट",
    hazard_air_desc: "हवा में हानिकारक कणों की मात्रा अत्यधिक खतरनाक स्तर पर है।",
    hazard_air_advice: "बाहर निकलते समय N95 मास्क अवश्य पहनें और खिड़कियां बंद रखें।",
    hazard_official_title: "मौसम विभाग की आधिकारिक चेतावनी",
    hazard_official_desc: "क्षेत्रीय मौसम केंद्र द्वारा जारी आधिकारिक आपदा बुलेटिन।",
    hazard_official_advice: "स्थानीय प्रशासन के सुरक्षा निर्देशों का पालन करें।",
    settings_title: "मौसम चेतावनी प्राथमिकताएं",
    settings_sound_label: "चेतावनी घंटी ध्वनि बजाएं",
    settings_sound_sub: "खतरे की सीमा पार होने पर मधुर दोहरे सुर की घंटी बजाएं",
    settings_push_label: "ब्राउज़र एवं मोबाइल पुश नोटिफिकेशन",
    settings_push_sub: "दूसरे टैब में रहने पर भी तत्काल चेतावनी सूचनाएं प्राप्त करें",
    settings_types_title: "निगरानी योग्य खतरे",
    settings_storm_label: "आंधी-तूफान व बिजली",
    settings_wind_label: "तेज आंधी (> 45 किमी/घंटा)",
    settings_heat_label: "भीषण गर्मी व लू (> 38°C)",
    settings_cold_label: "शीतलहर व ठंड (≤ 0°C)",
    settings_rain_label: "मूसलाधार बारिश व जलभराव",
    settings_air_label: "विषाक्त वायु प्रदूषण (AQI > 150)",
    close: "पूर्ण",
  },
};

// Web Audio API chime synthesizer
function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Two-tone pleasant caution chime: D5 (587.33 Hz) then A5 (880 Hz)
    const tones = [
      { freq: 587.33, start: 0, duration: 0.28 },
      { freq: 880.0, start: 0.16, duration: 0.45 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // audio context may be blocked by browser policy prior to user interaction
  }
}

export const WeatherAlertWatcher: React.FC<WeatherAlertWatcherProps> = ({
  weather,
  unit,
  activeAlerts = [],
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2).toLowerCase();
  const dict = useMemo<Record<string, string | undefined>>(() => ({ ...WATCHER_EN, ...(WATCHER_I18N[lang] ?? {}) }), [lang]);
  const tLocal = useCallback((key: string, fallback: string) => dict[key] || fallback, [dict]);

  // Settings configuration state
  const [config, setConfig] = useState<AlertWatcherConfig>(() => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // Sync notification permission status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Save config changes
  const updateConfig = (patch: Partial<AlertWatcherConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      } catch {
        // storage quota fallback
      }
      return next;
    });
  };

  // Evaluate hazards from live weather metrics
  const detectedHazards = useMemo<DetectedHazard[]>(() => {
    const list: DetectedHazard[] = [];
    if (!weather?.current) return list;

    const {
      temp,
      code,
      wind_speed,
      feels,
      aqi,
      pm25,
      precipitation,
      uv,
    } = weather.current;

    // Convert temp to Celsius for universal evaluation
    const tempC = unit === "imperial" ? ((temp - 32) * 5) / 9 : temp;
    const feelsC = unit === "imperial" ? ((feels - 32) * 5) / 9 : feels;
    const windKmh = unit === "imperial" ? wind_speed * 1.60934 : wind_speed;

    // 1. Severe Thunderstorm (WMO 95, 96, 99)
    if (config.notifyThunderstorm && (code === 95 || code === 96 || code === 99)) {
      list.push({
        id: "thunderstorm",
        type: "thunderstorm",
        severity: "danger",
        icon: "⚡",
        titleKey: "hazard_thunderstorm_title",
        descKey: "hazard_thunderstorm_desc",
        adviceKey: "hazard_thunderstorm_advice",
        metricValue: `WMO #${code}`,
      });
    }

    // 2. High Gale Winds (> 45 km/h / 28 mph)
    if (config.notifyWind && windKmh >= 45) {
      list.push({
        id: "wind",
        type: "wind",
        severity: windKmh >= 60 ? "danger" : "warning",
        icon: "💨",
        titleKey: "hazard_wind_title",
        descKey: "hazard_wind_desc",
        adviceKey: "hazard_wind_advice",
        metricValue: `${Math.round(wind_speed)} ${unit === "imperial" ? "mph" : "km/h"}`,
      });
    }

    // 3. Extreme Heatwave & Dangerous Heat Index (Temp > 38°C or Feels > 40°C or UV >= 10)
    if (config.notifyHeat && (tempC >= 38 || feelsC >= 40 || (uv && uv >= 11))) {
      list.push({
        id: "heat",
        type: "heat",
        severity: feelsC >= 42 ? "danger" : "warning",
        icon: "🌡️",
        titleKey: "hazard_heat_title",
        descKey: "hazard_heat_desc",
        adviceKey: "hazard_heat_advice",
        metricValue: `${Math.round(feels)}° ${unit === "imperial" ? "F" : "C"}`,
      });
    }

    // 4. Freezing Cold & Frost Hazard (≤ 0°C / 32°F)
    if (config.notifyCold && tempC <= 0) {
      list.push({
        id: "cold",
        type: "cold",
        severity: tempC <= -10 ? "danger" : "warning",
        icon: "❄️",
        titleKey: "hazard_cold_title",
        descKey: "hazard_cold_desc",
        adviceKey: "hazard_cold_advice",
        metricValue: `${Math.round(temp)}° ${unit === "imperial" ? "F" : "C"}`,
      });
    }

    // 5. Torrential Rain & Flash Floods (> 20mm/h or code 65, 82 with precip)
    if (config.notifyRain && (precipitation >= 15 || code === 65 || code === 82)) {
      list.push({
        id: "rain",
        type: "rain",
        severity: precipitation >= 25 ? "danger" : "warning",
        icon: "🌧️",
        titleKey: "hazard_rain_title",
        descKey: "hazard_rain_desc",
        adviceKey: "hazard_rain_advice",
        metricValue: `${precipitation.toFixed(1)} mm/h`,
      });
    }

    // 6. Hazardous Air Quality (AQI > 150 or PM2.5 > 55.4)
    const dangerousAqi = aqi && aqi > 150;
    const dangerousPm25 = pm25 && pm25 > 55.4;
    if (config.notifyAir && (dangerousAqi || dangerousPm25)) {
      list.push({
        id: "air",
        type: "air",
        severity: (aqi && aqi > 200) || (pm25 && pm25 > 150) ? "danger" : "warning",
        icon: "😷",
        titleKey: "hazard_air_title",
        descKey: "hazard_air_desc",
        adviceKey: "hazard_air_advice",
        metricValue: pm25 ? `${Math.round(pm25)} µg/m³` : `AQI ${aqi}`,
      });
    }

    // 7. Active Official Disaster / TMD / USGS / NWS Feed Items
    activeAlerts.forEach((alert, idx) => {
      if (alert.severity === "danger" || alert.severity === "disaster" || alert.severity === "warning") {
        list.push({
          id: `official-${alert.id || idx}`,
          type: "official",
          severity: "danger",
          icon: "🚨",
          titleKey: alert.tag || "hazard_official_title",
          descKey: alert.headline || alert.text || "hazard_official_desc",
          adviceKey: alert.details || "hazard_official_advice",
          metricValue: alert.area || alert.source || "Official Alert",
        });
      }
    });

    return list;
  }, [weather, unit, config, activeAlerts]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        updateConfig({ notificationsEnabled: true });
        triggerNotification(
          tLocal("test_toast_title", "Severe Weather Watcher Active"),
          tLocal("test_toast_desc", "This is a test notification with synthesized alert chime. Stay safe!")
        );
      }
    } catch {
      // ignored
    }
  };

  // Dispatch Web Notification
  const triggerNotification = useCallback((title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "my-weather-pal-alert",
        });
      } catch {
        // Notification constructor could fail on certain mobile browsers
      }
    }
  }, []);

  // Automatic alert trigger with cooldown (once per 30 minutes for duplicate conditions)
  useEffect(() => {
    if (detectedHazards.length === 0) return;

    try {
      const lastSentRaw = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);
      const lastSent = lastSentRaw ? parseInt(lastSentRaw, 10) : 0;
      const now = Date.now();

      // 30 minute debounce cooldown
      if (now - lastSent > 30 * 60 * 1000) {
        if (config.soundEnabled) {
          playAlertChime();
        }
        if (config.notificationsEnabled && notificationPermission === "granted") {
          const topHazard = detectedHazards[0];
          if (topHazard) {
            const title = tLocal(topHazard.titleKey, topHazard.titleKey);
            const body = tLocal(topHazard.adviceKey, topHazard.adviceKey);
            triggerNotification(title, body);
          }
        }
        localStorage.setItem(STORAGE_KEY_LAST_NOTIFIED, now.toString());
      }
    } catch {
      // storage unavailable
    }
  }, [detectedHazards, config, notificationPermission, tLocal, triggerNotification]);

  // Manual Test Alert button handler
  const handleTestAlert = () => {
    if (config.soundEnabled) {
      playAlertChime();
    }
    const testTitle = tLocal("test_toast_title", "Severe Weather Watcher Active");
    const testDesc = tLocal("test_toast_desc", "This is a test notification with synthesized alert chime. Stay safe!");

    setToastMessage({ title: testTitle, desc: testDesc });
    setTimeout(() => setToastMessage(null), 4500);

    if (config.notificationsEnabled && notificationPermission === "granted") {
      triggerNotification(testTitle, testDesc);
    }
  };

  const hasHazards = detectedHazards.length > 0;
  const cityName = weather?.place?.name || "Current Location";

  return (
    <section
      aria-label="Severe Weather Alert Watcher"
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/65 p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all duration-300"
    >
      {/* Test Notification Banner Toast */}
      {toastMessage && (
        <div className="absolute top-3 left-3 right-3 z-30 flex items-start gap-3 rounded-xl border border-primary/50 bg-primary/15 p-3 shadow-xl backdrop-blur-lg animate-in fade-in slide-in-from-top-2">
          <span className="text-xl">🔔</span>
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-semibold text-foreground">{toastMessage.title}</p>
            <p className="text-muted-foreground mt-0.5">{toastMessage.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-muted-foreground hover:text-foreground text-base px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-sm ${
              hasHazards
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse"
                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
            }`}
          >
            {hasHazards ? "⚠️" : "🛡️"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground">
                {tLocal("title", "Severe Weather Watcher & Alerts")}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                  hasHazards
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    hasHazards ? "bg-destructive animate-ping" : "bg-emerald-500"
                  }`}
                />
                {hasHazards
                  ? `${detectedHazards.length} ${tLocal("shield_hazards_found", "Hazards Detected")}`
                  : tLocal("shield_all_clear", "All Clear")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tLocal("monitoring_city", "Monitoring")}: <span className="font-medium text-foreground">{cityName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:self-center flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              config.soundEnabled
                ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                : "bg-muted/60 border-border text-muted-foreground hover:bg-muted"
            }`}
            title={config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}
          >
            <span>{config.soundEnabled ? "🔊" : "🔇"}</span>
            <span className="hidden sm:inline">
              {config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}
            </span>
          </button>

          {/* Web Push Permission Toggle */}
          {notificationPermission !== "granted" ? (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              <span>🔔</span>
              <span>{tLocal("notify_permission_cta", "Enable Notifications")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateConfig({ notificationsEnabled: !config.notificationsEnabled })}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                config.notificationsEnabled
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted/60 border-border text-muted-foreground"
              }`}
            >
              <span>🔔</span>
              <span className="hidden sm:inline">{tLocal("notify_enabled", "Active")}</span>
            </button>
          )}

          {/* Test Chime & Alert Button */}
          <button
            type="button"
            onClick={handleTestAlert}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent/60 hover:bg-accent border border-border text-foreground transition-colors"
            title={tLocal("test_btn", "Test Alert & Chime")}
          >
            <span>▶️</span>
            <span>{tLocal("test_btn", "Test Alert")}</span>
          </button>

          {/* Settings Cog */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors"
            title={tLocal("settings_btn", "Alert Settings")}
            aria-label="Alert settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Active Hazards Cards */}
      <div className="mt-3.5 space-y-2.5">
        {hasHazards ? (
          detectedHazards.map((hazard) => {
            const title = tLocal(hazard.titleKey, hazard.titleKey);
            const desc = tLocal(hazard.descKey, hazard.descKey);
            const advice = tLocal(hazard.adviceKey, hazard.adviceKey);

            return (
              <div
                key={hazard.id}
                className={`relative rounded-xl border p-3.5 transition-all ${
                  hazard.severity === "danger"
                    ? "bg-destructive/10 border-destructive/40 text-foreground"
                    : "bg-amber-500/10 border-amber-500/35 text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{hazard.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold leading-tight">{title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                  {hazard.metricValue && (
                    <span className="shrink-0 rounded-md bg-background/70 px-2 py-0.5 text-xs font-semibold text-foreground border border-border/50">
                      {hazard.metricValue}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-background/55 p-2 text-xs text-foreground/90 border border-border/40">
                  <span className="text-primary font-bold">💡</span>
                  <p className="flex-1 leading-relaxed">{advice}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 text-xs text-muted-foreground">
            <span className="text-xl text-emerald-500">✅</span>
            <p className="flex-1 leading-relaxed">
              {tLocal("subtitle", "Real-time monitoring for sudden storms, gale winds, heatwaves & hazardous air")}
            </p>
          </div>
        )}
      </div>

      {/* Settings Panel / Modal Drawer */}
      {settingsOpen && (
        <div className="mt-4 rounded-xl border border-border bg-background/85 p-4 shadow-inner backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5 mb-3">
            <h4 className="text-sm font-bold text-foreground">
              {tLocal("settings_title", "Severe Weather Notification Preferences")}
            </h4>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/60"
            >
              {tLocal("close", "Done")}
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {/* Audio Chime toggle */}
            <label className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer">
              <div>
                <p className="font-semibold text-foreground">
                  {tLocal("settings_sound_label", "Play Synthesized Audio Chime")}
                </p>
                <p className="text-muted-foreground">
                  {tLocal("settings_sound_sub", "Gentle two-tone chime when hazardous weather breaches safety thresholds")}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => updateConfig({ soundEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </label>

            {/* Web Push toggle */}
            <label className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 cursor-pointer">
              <div>
                <p className="font-semibold text-foreground">
                  {tLocal("settings_push_label", "Browser & Mobile Push Notifications")}
                </p>
                <p className="text-muted-foreground">
                  {tLocal("settings_push_sub", "Receive instant alert banners even when viewing other tabs")}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificationsEnabled}
                onChange={(e) => updateConfig({ notificationsEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </label>

            {/* Individual Hazard Toggles */}
            <div className="border-t border-border/40 pt-3">
              <p className="font-bold text-foreground mb-2">
                {tLocal("settings_types_title", "Monitored Hazard Types")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "notifyThunderstorm", labelKey: "settings_storm_label", defaultLabel: "Thunderstorms & Lightning", icon: "⚡" },
                  { key: "notifyWind", labelKey: "settings_wind_label", defaultLabel: "Gale Winds (> 45 km/h)", icon: "💨" },
                  { key: "notifyHeat", labelKey: "settings_heat_label", defaultLabel: "Extreme Heatwaves (> 38°C)", icon: "🌡️" },
                  { key: "notifyCold", labelKey: "settings_cold_label", defaultLabel: "Freezing Cold (≤ 0°C)", icon: "❄️" },
                  { key: "notifyRain", labelKey: "settings_rain_label", defaultLabel: "Torrential Rain & Floods", icon: "🌧️" },
                  { key: "notifyAir", labelKey: "settings_air_label", defaultLabel: "Hazardous PM2.5 (AQI > 150)", icon: "😷" },
                ].map(({ key, labelKey, defaultLabel, icon }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-card/60 p-2 border border-border/40 cursor-pointer hover:bg-card/90"
                  >
                    <span className="flex items-center gap-1.5 text-foreground">
                      <span>{icon}</span>
                      <span>{tLocal(labelKey, defaultLabel)}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(config[key as keyof AlertWatcherConfig])}
                      onChange={(e) => updateConfig({ [key]: e.target.checked })}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WeatherAlertWatcher;
