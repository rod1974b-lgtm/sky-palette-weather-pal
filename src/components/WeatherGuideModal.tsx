// src/components/WeatherGuideModal.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export type GuideTopic =
  | "all"
  | "icons"
  | "astronomy"
  | "uv"
  | "aqi"
  | "pressure"
  | "humidity"
  | "wind"
  | "conditions";

export interface WeatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: GuideTopic;
  selectedWeatherCode?: number;
}

interface IconGuideItem {
  code: string;
  wmoCodes?: number[];
  dayIcon: string;
  nightIcon?: string;
  emoji: string;
  nameEn: string;
  nameTh: string;
  descEn: string;
  descTh: string;
  categoryEn: string;
  categoryTh: string;
}

export const WeatherGuideModal: React.FC<WeatherGuideModalProps> = ({
  isOpen,
  onClose,
  initialTopic = "all",
  selectedWeatherCode,
}) => {
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState<GuideTopic>(initialTopic);

  useEffect(() => {
    if (isOpen) {
      if (selectedWeatherCode !== undefined) {
        setTopic("icons");
      } else {
        setTopic(initialTopic);
      }
    }
  }, [isOpen, initialTopic, selectedWeatherCode]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isThai = i18n.language?.startsWith("th");

  const topics: { id: GuideTopic; label: string; icon: string }[] = [
    { id: "all", label: t("guide_all", isThai ? "ทั้งหมด" : "All Topics"), icon: "📚" },
    { id: "icons", label: t("guide_icons", isThai ? "ไอคอนสภาพอากาศ" : "Weather Icons"), icon: "🎨" },
    { id: "astronomy", label: t("guide_astronomy", isThai ? "ดวงอาทิตย์ & ดวงจันทร์" : "Sun & Moon Tracker"), icon: "✨" },
    { id: "uv", label: t("guide_uv", isThai ? "ดัชนี UV" : "UV Index"), icon: "☀️" },
    { id: "aqi", label: t("guide_aqi", isThai ? "คุณภาพอากาศ PM2.5" : "Air Quality (AQI)"), icon: "🍃" },
    { id: "pressure", label: t("guide_pressure", isThai ? "ความกดอากาศ" : "Barometric Pressure"), icon: "🧭" },
    { id: "humidity", label: t("guide_humidity", isThai ? "ความชื้นสัมพัทธ์" : "Humidity"), icon: "💧" },
    { id: "wind", label: t("guide_wind", isThai ? "แรงลม & ลมกระโชก" : "Wind & Gusts"), icon: "💨" },
  ];

  const iconCatalog: IconGuideItem[] = [
    {
      code: "01",
      wmoCodes: [0, 1],
      dayIcon: "/icons/watercolor/01d_clear_sky.png",
      nightIcon: "/icons/watercolor/01n_clear_night.png",
      emoji: "☀",
      nameEn: "Clear Sky / Sunny",
      nameTh: "ท้องฟ้าแจ่มใส / แดดจัด",
      descEn: "Virtually zero cloud cover. Peak solar exposure during the day and rapid radiational cooling at night.",
      descTh: "แทบไม่มีเมฆบดบัง แดดจัดช่วงกลางวัน และอากาศคลายความร้อนได้เร็วเมื่อตกกลางคืน",
      categoryEn: "Fair Weather",
      categoryTh: "สภาพอากาศแจ่มใส",
    },
    {
      code: "02",
      wmoCodes: [2],
      dayIcon: "/icons/watercolor/02d_few_clouds.png",
      nightIcon: "/icons/watercolor/02n_few_clouds_night.png",
      emoji: "🌤",
      nameEn: "Few Clouds",
      nameTh: "มีเมฆบางส่วน (เมฆน้อย)",
      descEn: "10% to 25% cloud coverage. Bright sunshine with brief pleasant shade spells.",
      descTh: "เมฆปกคลุม 10%–25% แดดยังคงส่องสว่าง มีร่มเงาเคลื่อนผ่านเป็นระยะ",
      categoryEn: "Fair Weather",
      categoryTh: "สภาพอากาศแจ่มใส",
    },
    {
      code: "03",
      wmoCodes: [3],
      dayIcon: "/icons/watercolor/03d_scattered.png",
      nightIcon: "/icons/watercolor/03n_scattered_night.png",
      emoji: "⛅",
      nameEn: "Scattered / Partly Cloudy",
      nameTh: "เมฆเป็นหย่อมๆ / มีเมฆกระจาย",
      descEn: "25% to 50% cloud cover. Balanced mix of sun and clouds; great for outdoor recreation.",
      descTh: "เมฆปกคลุม 25%–50% แดดสลับร่ม บรรยากาศกำลังดีสำหรับการออกไปทำกิจกรรมกลางแจ้ง",
      categoryEn: "Clouds",
      categoryTh: "กลุ่มเมฆ",
    },
    {
      code: "04",
      wmoCodes: [],
      dayIcon: "/icons/watercolor/04d_broken.png",
      nightIcon: "/icons/watercolor/04n_broken_night.png",
      emoji: "☁",
      nameEn: "Broken Clouds",
      nameTh: "เมฆมากเป็นส่วนใหญ่",
      descEn: "50% to 85% cloud coverage with blue sky visible only in small gaps. Mild diffuse daylight.",
      descTh: "เมฆหนาปกคลุม 50%–85% เห็นฟ้าสีครามเพียงบางช่อง แสงแดดกระจายตัวไม่แสบตา",
      categoryEn: "Clouds",
      categoryTh: "กลุ่มเมฆ",
    },
    {
      code: "04_overcast",
      wmoCodes: [],
      dayIcon: "/icons/watercolor/04d_overcast.png",
      nightIcon: "/icons/watercolor/04n_overcast_night.png",
      emoji: "☁",
      nameEn: "Overcast",
      nameTh: "มืดครึ้ม / เมฆเต็มท้องฟ้า",
      descEn: "85% to 100% thick cloud ceiling. Low UV, dim daylight, and often leads to drizzle or rain.",
      descTh: "เมฆหนาทึบปกคลุมเกือบ 100% แดดส่องไม่ถึง ค่า UV ต่ำ และมักเป็นสัญญาณก่อนฝนตก",
      categoryEn: "Clouds",
      categoryTh: "กลุ่มเมฆ",
    },
    {
      code: "09_drizzle",
      wmoCodes: [51, 53, 55, 56, 57],
      dayIcon: "/icons/watercolor/10d_light_rain.png",
      nightIcon: "/icons/watercolor/09n_shower_night.png",
      emoji: "🌦",
      nameEn: "Drizzle & Fine Mist Rain",
      nameTh: "ฝนละออง / ฝนพรำ",
      descEn: "Extremely fine, floating water droplets. Barely makes ripples in puddles but will slowly dampen clothes.",
      descTh: "ละอองน้ำเม็ดจิ๋วที่ลอยในอากาศ ไม่ถึงกับเปียกโชกทันทีแต่ทำให้เสื้อผ้าชื้นได้ถ้าอยู่นาน",
      categoryEn: "Precipitation",
      categoryTh: "หยาดน้ำฟ้า & ฝน",
    },
    {
      code: "09_shower",
      wmoCodes: [80, 81, 82],
      dayIcon: "/icons/watercolor/10d_light_rain.png",
      nightIcon: "/icons/watercolor/09n_shower_night.png",
      emoji: "🌧",
      nameEn: "Shower Rain",
      nameTh: "ฝนซู่ / ฝนตกเป็นช่วงๆ",
      descEn: "Sudden bursts of rain with rapid start and stop times, frequently alternating with clear spells.",
      descTh: "ฝนที่ตกหนักกะทันหันเป็นช่วงสั้นๆ แล้วหยุด มีช่วงแดดออกสลับกัน เหมาะกับการพกร่มพับ",
      categoryEn: "Precipitation",
      categoryTh: "หยาดน้ำฟ้า & ฝน",
    },
    {
      code: "10_light",
      wmoCodes: [61, 63],
      dayIcon: "/icons/watercolor/10d_light_rain.png",
      nightIcon: "/icons/watercolor/10n_rain_night.png",
      emoji: "💧",
      nameEn: "Light to Moderate Rain",
      nameTh: "ฝนตกเล็กน้อยถึงปานกลาง",
      descEn: "Gentle continuous rainfall. Pavement stays wet; light umbrella or hooded jacket advised.",
      descTh: "ฝนตกเบาๆ อย่างต่อเนื่อง ถนนเปียกลื่น แนะนำให้กางร่มหรือใส่เสื้อกันฝนแบบบาง",
      categoryEn: "Precipitation",
      categoryTh: "หยาดน้ำฟ้า & ฝน",
    },
    {
      code: "10_heavy",
      wmoCodes: [65],
      dayIcon: "/icons/watercolor/10d_heavy_rain.png",
      nightIcon: "/icons/watercolor/10n_rain_night.png",
      emoji: "🌊",
      nameEn: "Heavy / Torrential Rain",
      nameTh: "ฝนตกหนัก / ฝนตกชุก",
      descEn: "Copious rainfall with rapid puddle and flash-puddle formation. Low visibility on roads.",
      descTh: "ฝนกระหน่ำปริมาณน้ำฝนสูง น้ำอาจท่วมขังบนพื้นผิวทาง ทัศนวิสัยบนท้องถนนลดลงมาก",
      categoryEn: "Precipitation",
      categoryTh: "หยาดน้ำฟ้า & ฝน",
    },
    {
      code: "11",
      wmoCodes: [95, 96, 99],
      dayIcon: "/icons/watercolor/11d_thunderstorm.png",
      nightIcon: "/icons/watercolor/11n_thunderstorm_night.png",
      emoji: "⛈",
      nameEn: "Thunderstorm",
      nameTh: "พายุฝนฟ้าคะนอง",
      descEn: "Severe convective storm with lightning, thunder, and wind gusts. Seek safe indoor shelter immediately.",
      descTh: "เมฆฝนฟ้าคะนอง มีฟ้าแลบ ฟ้าร้อง ฟ้าผ่า และลมกระโชกแรง ควรงดกิจกรรมกลางแจ้งและหลบในอาคาร",
      categoryEn: "Severe Weather",
      categoryTh: "สภาพอากาศรุนแรง",
    },
    {
      code: "13",
      wmoCodes: [71, 73, 75, 77, 85, 86],
      dayIcon: "/icons/watercolor/13d_snow.png",
      nightIcon: "/icons/watercolor/13n_snow_night.png",
      emoji: "❄",
      nameEn: "Snow & Flurries",
      nameTh: "หิมะ / หิมะตก",
      descEn: "Atmospheric freezing water vapor forming ice crystals. Risk of slick roads and black ice.",
      descTh: "ผลึกน้ำแข็งโปรยปรายเมื่ออุณหภูมิต่ำกว่าจุดเยือกแข็ง ระวังพื้นผิวถนนลื่นและน้ำแข็งเกาะ",
      categoryEn: "Winter",
      categoryTh: "ฤดูหนาว & หิมะ",
    },
    {
      code: "50_mist",
      wmoCodes: [45, 48],
      dayIcon: "/icons/watercolor/50d_mist.png",
      emoji: "🌫",
      nameEn: "Mist / Dense Fog",
      nameTh: "หมอกแดด / ละอองหมอกหนา",
      descEn: "Suspension of microscopic water droplets reducing visibility. Headlights and slow driving recommended.",
      descTh: "ละอองน้ำลอยตัวในอากาศ ทัศนวิสัยลดลงต่ำกว่า 1 กิโลเมตร ควรเปิดไฟหน้ารถและขับขี่อย่างระมัดระวัง",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_haze",
      wmoCodes: [],
      dayIcon: "/icons/watercolor/50d_haze_ratchaburi.png",
      emoji: "😷",
      nameEn: "Haze / PM2.5 Smog",
      nameTh: "หมอกควัน / ฝุ่นควันพิษ PM2.5",
      descEn: "Dry smoke, ash, and fine airborne particulates trapping sunlight. Wear an N95 mask outdoors.",
      descTh: "ฝุ่นผง ควันไฟ และมลพิษอนุภาคเล็กสะสมในอากาศ แนะนำให้สวมหน้ากาก N95 และหลีกเลี่ยงกิจกรรมกลางแจ้ง",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "wind",
      wmoCodes: [],
      dayIcon: "/icons/watercolor/wind.png",
      emoji: "💨",
      nameEn: "High Winds / Breezy",
      nameTh: "ลมกระโชกแรง / ลมแรง",
      descEn: "Sustained high velocity air currents capable of swaying large branches and shifting light items.",
      descTh: "กระแสลมพัดต่อเนื่องด้วยความเร็วสูง สามารถพัดกิ่งไม้ใหญ่ไหวและขยับสิ่งของน้ำหนักเบาได้",
      categoryEn: "Wind & Severe",
      categoryTh: "ลม & สภาพอากาศรุนแรง",
    },
    {
      code: "tornado",
      wmoCodes: [],
      dayIcon: "/icons/watercolor/tornado.png",
      emoji: "🌪",
      nameEn: "Tornado / Funnel Cloud",
      nameTh: "พายุทอร์นาโด / พายุงวงช้าง",
      descEn: "Violently rotating column of air in contact with ground. Extreme emergency; take basement shelter.",
      descTh: "ลำอากาศหมุนวนรุนแรงที่แตะถึงพื้นดิน สภาพอากาศอันตรายสูงสุด รีบหลบในห้องใต้ดินหรือโครงสร้างแข็งแรง",
      categoryEn: "Wind & Severe",
      categoryTh: "ลม & สภาพอากาศรุนแรง",
    },
  ];

  const matchedItem =
    selectedWeatherCode !== undefined
      ? iconCatalog.find((item) => item.wmoCodes?.includes(selectedWeatherCode))
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-sky-900/10 dark:border-sky-500/20 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 text-white p-4 sm:p-5 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", "Close")}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h2 id="guide-title" className="text-lg sm:text-xl font-bold tracking-tight">
              {t("guide_title", isThai ? "คู่มือทำความเข้าใจสภาพอากาศ" : "Weather & Forecast Guide")}
            </h2>
          </div>
          <p className="text-xs text-sky-100/90 mt-1">
            {t(
              "guide_subtitle",
              isThai
                ? "คำอธิบายตัวเลข วิถีดวงอาทิตย์ ดวงจันทร์ และสัญลักษณ์สภาพอากาศ เพื่อการอ่านพยากรณ์อย่างมั่นใจ"
                : "Simple, easy-to-read explanations for every metric, celestial trajectory, and condition icon"
            )}
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 p-3 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 scrollbar-none">
          {topics.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTopic(item.id)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer ${
                topic === item.id
                  ? "bg-sky-600 text-white shadow-xs font-semibold"
                  : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-zinc-800 dark:text-zinc-200 text-sm">
          {/* FOCUSED WEATHER CONDITION SPOTLIGHT (if opened from an icon click) */}
          {matchedItem && (topic === "all" || topic === "icons") && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-amber-500/10 border-2 border-sky-500/40 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {t("current_condition_explanation", isThai ? "คำอธิบายสภาพอากาศปัจจุบันของคุณ" : "Your Current Weather Condition")}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                  WMO #{selectedWeatherCode}
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <img
                  src={matchedItem.dayIcon}
                  alt={matchedItem.nameEn}
                  className="w-14 h-14 object-contain drop-shadow-md shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>{matchedItem.emoji}</span>
                    <span>{isThai ? matchedItem.nameTh : matchedItem.nameEn}</span>
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                    {isThai ? matchedItem.descTh : matchedItem.descEn}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 1. ICONS CATALOG */}
          {(topic === "all" || topic === "icons") && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2 text-sky-600 dark:text-sky-400">
                  <span>🎨</span>
                  <span>{t("guide_icons_heading", isThai ? "ไอคอนสีน้ำสภาพอากาศ" : "Watercolor Weather Icons")}</span>
                </h3>
                <span className="text-xs text-zinc-500">
                  {isThai ? "กลางวัน & กลางคืน" : "Day & Night Pairs"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {iconCatalog.map((item) => {
                  const isSelected =
                    selectedWeatherCode !== undefined && item.wmoCodes?.includes(selectedWeatherCode);
                  return (
                    <div
                      key={item.code}
                      className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/40 shadow-xs"
                          : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <img
                          src={item.dayIcon}
                          alt={item.nameEn}
                          className="w-10 h-10 object-contain drop-shadow-xs"
                        />
                        {item.nightIcon && (
                          <img
                            src={item.nightIcon}
                            alt={`${item.nameEn} night`}
                            className="w-6 h-6 object-contain opacity-75"
                            title="Night icon"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {isThai ? item.nameTh : item.nameEn}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                            {isThai ? item.categoryTh : item.categoryEn}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {isThai ? item.descTh : item.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. SUN & MOON ASTRONOMY TRAJECTORY */}
          {(topic === "all" || topic === "astronomy") && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <span>✨</span>
                  <span>{t("guide_celestial_heading", isThai ? "วิถีดวงอาทิตย์และดวงจันทร์บนท้องฟ้า" : "Sun & Moon Trajectory Guide")}</span>
                </h3>
              </div>

              {/* Solar Arc & Daylight Trajectory */}
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <h4 className="font-bold text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <span>☀️</span>
                  <span>{t("guide_sun_trajectory_title", isThai ? "เส้นทางโค้งของดวงอาทิตย์ (Solar Arc)" : "Solar Arc & Daylight Progression")}</span>
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {isThai
                    ? "ดวงอาทิตย์เคลื่อนที่เป็นรูปพาราโบลาจากขอบฟ้าทิศตะวันออก (Sunrise) ขึ้นสู่จุดสูงสุดที่เที่ยงวันดาราศาสตร์ (Solar Noon) แล้วคล้อยต่ำลงสู่ทิศตะวันตก (Sunset) มุมตกกระทบของแสงอาทิตย์ส่งผลโดยตรงต่อรังสี UV และการสะสมความร้อนบนพื้นผิวโลก"
                    : "The sun follows a parabolic curve across the sky from east to west. At Solar Noon, sunlight strikes at the steepest angle, producing peak UV index and maximum surface heating before tapering down toward sunset."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-amber-500/20">
                    <span className="font-bold text-amber-600 dark:text-amber-400 block">
                      📸 {t("golden_hour", "Golden Hour")}
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {isThai
                        ? "เกิดขึ้น 1 ชั่วโมงหลังพระอาทิตย์ขึ้นและก่อนพระอาทิตย์ตก แสงทำมุมต่ำ เดินทางผ่านชั้นบรรยากาศหนา ให้โทนสีทองอบอุ่น นุ่มนวล เหมาะกับการถ่ายภาพ"
                        : "Occurs when the sun is roughly 6° above the horizon. Light travels through thicker atmosphere, diffusing harsh glare and leaving soft, warm golden tones."}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-indigo-500/20">
                    <span className="font-bold text-indigo-500 dark:text-indigo-400 block">
                      🌌 {t("blue_hour", "Blue Hour")}
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      {isThai
                        ? "ช่วงสนธยา 20-30 นาทีก่อนพระอาทิตย์ขึ้นหรือหลังตกดิน แสงอาทิตย์สะท้อนชั้นบรรยากาศชั้นบนเกิดโทนสีฟ้าครามเข้มสวยงาม"
                        : "Occurs during twilight when the sun is 4° to 6° below the horizon. The ozone layer absorbs warm wavelengths, casting a deep indigo evening hue."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lunar Trajectory & 29.5-Day Cycle */}
              <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <h4 className="font-bold text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <span>🌙</span>
                  <span>{t("guide_moon_trajectory_title", isThai ? "วิถีดวงจันทร์และข้างขึ้น-ข้างแรม (Lunar Cycle)" : "Lunar Orbit & 29.5-Day Synodic Cycle")}</span>
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {isThai
                    ? "ดวงจันทร์โคจรรอบโลกครบ 1 รอบทุกๆ 29.53 วัน ตำแหน่งสัมพัทธ์ระหว่างโลก ดวงอาทิตย์ และดวงจันทร์ ทำให้ส่วนสว่างที่มองเห็นเปลี่ยนไป และดวงจันทร์จะขึ้นช้าลงวันละประมาณ 50 นาที"
                    : "The Moon orbits Earth every 29.53 days. As its angle relative to Earth and Sun shifts, illuminated surface area cycles from 0% (New Moon) to 100% (Full Moon). The Moon rises approximately 50 minutes later each night."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-2xl block">🌑</span>
                    <span className="font-bold block mt-1 text-[11px]">New Moon (0%)</span>
                    <span className="text-[10px] text-zinc-500">{isThai ? "มืดสนิท / เริ่มรอบใหม่" : "Dark / Reset"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-2xl block">🌓</span>
                    <span className="font-bold block mt-1 text-[11px]">First Quarter (50%)</span>
                    <span className="text-[10px] text-zinc-500">{isThai ? "ครึ่งดวงข้างขึ้น" : "Waxing Half"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-2xl block">🌕</span>
                    <span className="font-bold block mt-1 text-[11px]">Full Moon (100%)</span>
                    <span className="text-[10px] text-zinc-500">{isThai ? "จันทร์เพ็ญเต็มดวง" : "Peak Night Light"}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-2xl block">🌗</span>
                    <span className="font-bold block mt-1 text-[11px]">Last Quarter (50%)</span>
                    <span className="text-[10px] text-zinc-500">{isThai ? "ครึ่งดวงข้างแรม" : "Waning Half"}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. UV INDEX */}
          {(topic === "all" || topic === "uv") && (
            <section className="space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <span>☀️</span>
                <span>{t("guide_uv_heading", isThai ? "ดัชนีรังสี UV" : "UV Index (Solar Radiation)")}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {isThai
                  ? "บอกระดับความเข้มข้นของรังสีอัลตราไวโอเลตที่มีผลต่อผิวหนังและสายตา ยิ่งตัวเลขสูง ผิวจะไหม้แดดได้เร็วขึ้น"
                  : "Measures the strength of sunburn-producing ultraviolet radiation at solar noon. Higher numbers mean faster skin damage."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-sm">0 – 2</span>
                  <span className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-300">
                    {isThai ? "ปลอดภัย" : "Low"}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "ไม่ต้องป้องกันพิเศษ" : "No protection needed"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block text-sm">3 – 5</span>
                  <span className="font-semibold text-[11px] text-amber-700 dark:text-amber-300">
                    {isThai ? "ปานกลาง" : "Moderate"}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "ทากันแดด / แว่นกันแดด" : "Sunscreen & shades"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <span className="font-bold text-orange-600 dark:text-orange-400 block text-sm">6 – 7</span>
                  <span className="font-semibold text-[11px] text-orange-700 dark:text-orange-300">
                    {isThai ? "สูง" : "High"}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "หมวก + ร่ม + ร่มเงา" : "Hat + shade needed"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <span className="font-bold text-rose-600 dark:text-rose-400 block text-sm">8 – 10</span>
                  <span className="font-semibold text-[11px] text-rose-700 dark:text-rose-300">
                    {isThai ? "สูงมาก" : "Very High"}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "ผิวไหม้ใน 15 นาที" : "Burns in 15 mins"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 col-span-2 sm:col-span-1">
                  <span className="font-bold text-purple-600 dark:text-purple-400 block text-sm">11+</span>
                  <span className="font-semibold text-[11px] text-purple-700 dark:text-purple-300">
                    {isThai ? "อันตรายสุด" : "Extreme"}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "เลี่ยงแดดเที่ยงวัน" : "Avoid midday sun"}</p>
                </div>
              </div>
            </section>
          )}

          {/* 4. AQI & PM2.5 */}
          {(topic === "all" || topic === "aqi") && (
            <section className="space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span>🍃</span>
                <span>{t("guide_aqi_heading", isThai ? "คุณภาพอากาศ & PM2.5" : "Air Quality Index (AQI) & PM2.5")}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {isThai
                  ? "ดัชนีวัดมลพิษฝุ่นละอองขนาดเล็กมาก (PM2.5) ที่สามารถแทรกซึมเข้าสู่กระแสเลือดได้ ควรเช็คก่อนวิ่งหรือออกกำลังกลางแจ้ง"
                  : "Tracks microscopic particulate pollution (PM2.5) that penetrates deep into lungs. Consult before running or training outdoors."}
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">0 – 50 • {isThai ? "ดีเยี่ยม" : "Good"}</span>
                  <span className="text-[11px] text-zinc-500">{isThai ? "อากาศบริสุทธิ์ ทำกิจกรรมได้เต็มที่" : "Clean fresh air for all"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">51 – 100 • {isThai ? "ปานกลาง" : "Moderate"}</span>
                  <span className="text-[11px] text-zinc-500">{isThai ? "ผู้แพ้ง่ายอาจเริ่มมีอาการ" : "Sensitive groups take caution"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                  <span className="font-semibold text-orange-700 dark:text-orange-300">101 – 150 • {isThai ? "เริ่มมีผลต่อสุขภาพ" : "Unhealthy for Sensitive"}</span>
                  <span className="text-[11px] text-zinc-500">{isThai ? "เด็กและผู้สูงอายุควรลดกิจกรรม" : "Mask recommended"}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                  <span className="font-semibold text-rose-700 dark:text-rose-300">151+ • {isThai ? "มีผลต่อทุกคน" : "Unhealthy for All"}</span>
                  <span className="text-[11px] text-zinc-500">{isThai ? "สวมหน้ากาก N95 งดออกกำลังแจ้ง" : "Wear N95, stay indoors"}</span>
                </div>
              </div>
            </section>
          )}

          {/* 5. BAROMETRIC PRESSURE */}
          {(topic === "all" || topic === "pressure") && (
            <section className="space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <span>🧭</span>
                <span>{t("guide_pressure_heading", isThai ? "ความกดอากาศ (hPa / inHg)" : "Barometric Pressure")}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {isThai
                  ? "น้ำหนักของมวลอากาศที่กดทับลงมา ค่ามาตรฐานที่ระดับน้ำทะเลคือ 1013 hPa (29.92 inHg) ความเปลี่ยนแปลงของความกดอากาศคือตัวพยากรณ์พายุที่ดีที่สุด"
                  : "The weight of the atmosphere overhead. Standard sea-level baseline is 1013 hPa (29.92 inHg). Fast changes signal incoming fronts."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
                  <span className="font-bold text-sky-600 dark:text-sky-400 block text-xs">
                    📉 {isThai ? "ความกดอากาศลดต่ำลง (< 1008 hPa)" : "Falling Pressure (< 1008 hPa)"}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isThai
                      ? "มวลอากาศลอยตัว เกิดเมฆหนา ฝนตก หรือพายุเข้า ผู้ป่วยไมเกรนมักปวดศีรษะช่วงนี้"
                      : "Air rises, clouds condense, bringing precipitation and storms. Often triggers barometric migraines."}
                  </p>
                </div>
                <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">
                    📈 {isThai ? "ความกดอากาศสูงขึ้น (> 1018 hPa)" : "Rising Pressure (> 1018 hPa)"}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isThai
                      ? "มวลอากาศจมตัว ท้องฟ้าเปิด แดดดี ลมสงบ อากาศปลอดโปร่งแจ่มใส"
                      : "Air sinks, clouds dissipate, ushering in clear skies, crisp cool air, and dry weather."}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 6. HUMIDITY & DEW POINT */}
          {(topic === "all" || topic === "humidity") && (
            <section className="space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                <span>💧</span>
                <span>{t("guide_humidity_heading", isThai ? "ความชื้นสัมพัทธ์ & จุดน้ำค้าง" : "Relative Humidity & Dew Point")}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {isThai
                  ? "ปริมาณไอน้ำในอากาศเทียบกับขีดความจุสูงสุดที่อุณหภูมินั้น ความชื้นสูงจะทำให้เหงื่อระเหยยาก รู้สึกอบอ้าวและร้อนกว่าอุณหภูมิจริงมาก"
                  : "Percentage of moisture air is holding relative to maximum capacity. High humidity hampers sweat evaporation, elevating the heat index."}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <span className="font-bold block text-sm">&lt; 30%</span>
                  <span className="font-medium text-[11px]">{isThai ? "แห้งแล้ง" : "Dry"}</span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "ผิวแห้ง คอแห้ง" : "Dry skin / lips"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-sm">30% – 60%</span>
                  <span className="font-medium text-[11px] text-emerald-700 dark:text-emerald-300">{isThai ? "สบายตัวที่สุด" : "Ideal Comfort"}</span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "หายใจสะดวก" : "Easy breathing"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 block text-sm">&gt; 70%</span>
                  <span className="font-medium text-[11px] text-cyan-700 dark:text-cyan-300">{isThai ? "อบอ้าว เหนียวตัว" : "Muggy / Humid"}</span>
                  <p className="text-[10px] text-zinc-500 mt-1">{isThai ? "ระบายเหงื่อช้า" : "Sweat won't evaporate"}</p>
                </div>
              </div>
            </section>
          )}

          {/* 7. WIND & GUSTS */}
          {(topic === "all" || topic === "wind") && (
            <section className="space-y-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <span>💨</span>
                <span>{t("guide_wind_heading", isThai ? "แรงลมเฉลี่ย vs ลมกระโชก" : "Sustained Wind vs Gusts")}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {isThai
                  ? "ลมเฉลี่ย (Sustained) คือความเร็วลมที่พัดสม่ำเสมอ ลมกระโชก (Gust) คือกระแสลมที่พัดกระแทกแรงขึ้นชั่วคราว 20-50% ซึ่งอาจทำให้ร่มหักหรือกิ่งไม้หล่นได้"
                  : "Sustained speed is the 2-minute running average. Gusts are short sudden bursts (3-20 sec) that can exceed sustained wind by 30-50%."}
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            {t("got_it", isThai ? "เข้าใจแล้ว" : "Got It")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeatherGuideModal;
