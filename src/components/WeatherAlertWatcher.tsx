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
};

// Web Audio API chime synthesizer
function playAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
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
      gain.gain.linearRampToValueAtTime(0.2, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {}
}

export const WeatherAlertWatcher: React.FC<WeatherAlertWatcherProps> = ({
  weather,
  unit,
  activeAlerts = [],
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2).toLowerCase();
  const dict = useMemo<Record<string, string | undefined>>(
    () => ({ ...WATCHER_EN, ...(WATCHER_I18N[lang] ?? {}) }),
    [lang]
  );
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

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const updateConfig = (patch: Partial<AlertWatcherConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const detectedHazards = useMemo<DetectedHazard[]>(() => {
    const list: DetectedHazard[] = [];
    if (!weather?.current) return list;

    const { temp, code, wind_speed, feels, aqi, pm25, precipitation, uv } = weather.current;

    const tempC = unit === "imperial" ? ((temp - 32) * 5) / 9 : temp;
    const feelsC = unit === "imperial" ? ((feels - 32) * 5) / 9 : feels;
    const windKmh = unit === "imperial" ? wind_speed * 1.60934 : wind_speed;

    // 1. Severe Thunderstorm
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

    // 2. High Gale Winds
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

    // 3. Extreme Heatwave
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

    // 4. Freezing Cold
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

    // 5. Torrential Rain & Flash Floods
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

    // 6. Hazardous Air Quality
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

    // 7. Active Official Disaster Alerts
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

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
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
    } catch {}
  };

  const triggerNotification = useCallback((title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
          tag: "my-weather-pal-alert",
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (detectedHazards.length === 0) return;
    try {
      const lastSentRaw = localStorage.getItem(STORAGE_KEY_LAST_NOTIFIED);
      const lastSent = lastSentRaw ? parseInt(lastSentRaw, 10) : 0;
      const now = Date.now();

      if (now - lastSent > 30 * 60 * 1000) {
        if (config.soundEnabled) playAlertChime();
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
    } catch {}
  }, [detectedHazards, config, notificationPermission, tLocal, triggerNotification]);

  const handleTestAlert = () => {
    if (config.soundEnabled) playAlertChime();
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
      className="relative overflow-hidden rounded-2xl border-2 border-border/80 bg-card/95 p-4 sm:p-6 shadow-xl backdrop-blur-lg transition-all duration-300"
    >
      {/* Test Notification Banner Toast */}
      {toastMessage && (
        <div className="absolute top-3 left-3 right-3 z-30 flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/20 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <span className="text-2xl">🔔</span>
          <div className="flex-1 text-sm">
            <p className="font-bold text-foreground text-base leading-tight">{toastMessage.title}</p>
            <p className="text-foreground/90 font-medium mt-1 leading-snug">{toastMessage.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-foreground hover:bg-background/40 font-bold text-lg px-2 py-0.5 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b-2 border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-md border-2 ${
              hasHazards
                ? "bg-amber-500/25 text-amber-500 border-amber-500 animate-pulse"
                : "bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50"
            }`}
          >
            {hasHazards ? "⚠️" : "🛡️"}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                {tLocal("title", "Severe Weather Watcher & Alerts")}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-bold border-2 shadow-sm ${
                  hasHazards
                    ? "bg-destructive text-destructive-foreground border-destructive/50"
                    : "bg-emerald-600 text-white border-emerald-600/50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasHazards ? "bg-white animate-ping" : "bg-white"
                  }`}
                />
                {hasHazards
                  ? `${detectedHazards.length} ${tLocal("shield_hazards_found", "Hazards Detected")}`
                  : tLocal("shield_all_clear", "All Clear")}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground/80 mt-1">
              {tLocal("monitoring_city", "Monitoring")}:{" "}
              <span className="font-black text-foreground">{cityName}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all shadow-xs ${
              config.soundEnabled
                ? "bg-primary/20 border-primary text-primary hover:bg-primary/30"
                : "bg-muted border-border text-foreground/70 hover:bg-muted/80"
            }`}
            title={config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}
          >
            <span className="text-base">{config.soundEnabled ? "🔊" : "🔇"}</span>
            <span>{config.soundEnabled ? tLocal("sound_on", "Sound On") : tLocal("sound_muted", "Muted")}</span>
          </button>

          {/* Web Push Permission Toggle */}
          {notificationPermission !== "granted" ? (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-amber-950 border-2 border-amber-600 hover:bg-amber-400 transition-all shadow-xs"
            >
              <span className="text-base">🔔</span>
              <span>{tLocal("notify_permission_cta", "Enable Notifications")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateConfig({ notificationsEnabled: !config.notificationsEnabled })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all shadow-xs ${
                config.notificationsEnabled
                  ? "bg-emerald-600 text-white border-emerald-700"
                  : "bg-muted border-border text-foreground/70"
              }`}
            >
              <span className="text-base">🔔</span>
              <span>{tLocal("notify_enabled", "Active")}</span>
            </button>
          )}

          {/* Test Chime & Alert Button */}
          <button
            type="button"
            onClick={handleTestAlert}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-card hover:bg-muted border-2 border-border text-foreground transition-all shadow-xs"
            title={tLocal("test_btn", "Test Alert & Chime")}
          >
            <span className="text-base">▶️</span>
            <span>{tLocal("test_btn", "Test Alert")}</span>
          </button>

          {/* Settings Cog */}
          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="inline-flex items-center justify-center p-2 rounded-xl text-sm font-bold bg-card hover:bg-muted border-2 border-border text-foreground transition-all shadow-xs"
            title={tLocal("settings_btn", "Alert Settings")}
            aria-label="Alert settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Active Hazards Cards */}
      <div className="mt-4 space-y-3">
        {hasHazards ? (
          detectedHazards.map((hazard) => {
            const title = tLocal(hazard.titleKey, hazard.titleKey);
            const desc = tLocal(hazard.descKey, hazard.descKey);
            const advice = tLocal(hazard.adviceKey, hazard.adviceKey);

            return (
              <div
                key={hazard.id}
                className={`relative rounded-2xl border-2 p-4 sm:p-5 shadow-md transition-all ${
                  hazard.severity === "danger"
                    ? "bg-destructive/15 dark:bg-destructive/25 border-destructive text-foreground"
                    : "bg-amber-500/15 dark:bg-amber-950/40 border-amber-500 text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl sm:text-4xl shrink-0 mt-0.5">{hazard.icon}</span>
                    <div>
                      <h4 className="text-base sm:text-lg font-black leading-tight text-foreground">
                        {title}
                      </h4>
                      <p className="text-sm sm:text-base font-semibold text-foreground/90 mt-1 leading-snug">
                        {desc}
                      </p>
                    </div>
                  </div>
                  {hazard.metricValue && (
                    <span className="shrink-0 rounded-xl bg-background px-3 py-1 text-xs sm:text-sm font-black text-foreground border-2 border-border shadow-xs">
                      {hazard.metricValue}
                    </span>
                  )}
                </div>

                {/* High Contrast Advice Callout */}
                <div className="mt-3.5 flex items-start gap-3 rounded-xl bg-background/95 dark:bg-background/90 p-3.5 sm:p-4 text-sm sm:text-base font-semibold text-foreground border-2 border-border shadow-xs">
                  <span className="text-xl sm:text-2xl shrink-0 text-amber-500">💡</span>
                  <p className="flex-1 leading-relaxed text-foreground font-medium">{advice}</p>
                </div>
              </div>
            );
          })
        ) : (
          /* HIGH-CONTRAST "ALL CLEAR" STATE */
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 rounded-2xl border-2 border-emerald-600/50 bg-emerald-500/15 dark:bg-emerald-950/40 p-4 sm:p-5 shadow-xs text-foreground">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl shadow-md">
              ✓
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100">
                {tLocal("shield_all_clear", "All Clear — Conditions are safe")}
              </h4>
              <p className="text-sm sm:text-base font-semibold text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed mt-1">
                {tLocal(
                  "subtitle",
                  "Real-time monitoring for sudden storms, gale winds, heatwaves & hazardous air"
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel Drawer */}
      {settingsOpen && (
        <div className="mt-4 rounded-2xl border-2 border-border bg-card p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b-2 border-border/50 pb-3 mb-3.5">
            <h4 className="text-base sm:text-lg font-black text-foreground">
              {tLocal("settings_title", "Severe Weather Notification Preferences")}
            </h4>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-xs sm:text-sm font-bold text-foreground px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border"
            >
              {tLocal("close", "Done")}
            </button>
          </div>

          <div className="space-y-3.5 text-sm">
            {/* Audio Chime toggle */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-background cursor-pointer transition-colors">
              <div>
                <p className="font-bold text-foreground text-sm sm:text-base">
                  {tLocal("settings_sound_label", "Play Synthesized Audio Chime")}
                </p>
                <p className="text-foreground/75 font-medium text-xs sm:text-sm mt-0.5">
                  {tLocal(
                    "settings_sound_sub",
                    "Gentle two-tone chime when hazardous weather breaches safety thresholds"
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.soundEnabled}
                onChange={(e) => updateConfig({ soundEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </label>

            {/* Web Push toggle */}
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-background/80 hover:bg-background cursor-pointer transition-colors">
              <div>
                <p className="font-bold text-foreground text-sm sm:text-base">
                  {tLocal("settings_push_label", "Browser & Mobile Push Notifications")}
                </p>
                <p className="text-foreground/75 font-medium text-xs sm:text-sm mt-0.5">
                  {tLocal(
                    "settings_push_sub",
                    "Receive instant alert banners even when viewing other tabs"
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.notificationsEnabled}
                onChange={(e) => updateConfig({ notificationsEnabled: e.target.checked })}
                className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
              />
            </label>

            {/* Individual Hazard Toggles */}
            <div className="border-t-2 border-border/50 pt-3.5">
              <p className="font-black text-foreground text-sm sm:text-base mb-2.5">
                {tLocal("settings_types_title", "Monitored Hazard Types")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    key: "notifyThunderstorm",
                    labelKey: "settings_storm_label",
                    defaultLabel: "Thunderstorms & Lightning",
                    icon: "⚡",
                  },
                  {
                    key: "notifyWind",
                    labelKey: "settings_wind_label",
                    defaultLabel: "Gale Winds (> 45 km/h)",
                    icon: "💨",
                  },
                  {
                    key: "notifyHeat",
                    labelKey: "settings_heat_label",
                    defaultLabel: "Extreme Heatwaves (> 38°C)",
                    icon: "🌡️",
                  },
                  {
                    key: "notifyCold",
                    labelKey: "settings_cold_label",
                    defaultLabel: "Freezing Cold (≤ 0°C)",
                    icon: "❄️",
                  },
                  {
                    key: "notifyRain",
                    labelKey: "settings_rain_label",
                    defaultLabel: "Torrential Rain & Floods",
                    icon: "🌧️",
                  },
                  {
                    key: "notifyAir",
                    labelKey: "settings_air_label",
                    defaultLabel: "Hazardous PM2.5 (AQI > 150)",
                    icon: "😷",
                  },
                ].map(({ key, labelKey, defaultLabel, icon }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-2.5 rounded-xl bg-background/80 p-3 border-2 border-border/70 cursor-pointer hover:bg-background transition-colors"
                  >
                    <span className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                      <span className="text-base">{icon}</span>
                      <span>{tLocal(labelKey, defaultLabel)}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(config[key as keyof AlertWatcherConfig])}
                      onChange={(e) => updateConfig({ [key]: e.target.checked })}
                      className="h-5 w-5 rounded accent-primary cursor-pointer shrink-0"
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
