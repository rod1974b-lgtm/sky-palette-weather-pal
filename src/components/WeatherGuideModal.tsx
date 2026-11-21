// src/components/WeatherGuideModal.tsx
// FIXED — v2
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// BUG 1 — 3 icon files did NOT exist, so those guide cards showed a broken image
//   (hidden by onError, so the card showed no picture at all). Checked against
//   weatherIcons.fixed.tsx (only files in that file exist in the repo):
//   - 09d_drizzle.png  -> DOES NOT EXIST. Drizzle day uses 10d_light_rain.png.
//   - 09d_shower_rain.png -> DOES NOT EXIST. Shower day uses 10d_light_rain.png.
//   - 50d_fog.png -> DOES NOT EXIST. Fog uses 50d_mist.png (mist is closest).
//   FIX: 09_drizzle day -> 10d_light_rain.png + night 09n_shower_night.png.
//   09_shower day -> 10d_light_rain.png (night was already correct).
//   50_fog day -> 50d_mist.png. No new file names invented.
// BUG 2 — Count was wrong. Header comment said "28 watercolor icons" and UI said
//   "all 28 day & night conditions" and Thai "28 รูปแบบ". The catalog actually had
//   16 entries. weatherIcons has 24 files, not 28. FIX: Catalog now has 18 entries
//   (added dust + smoke, see BUG 3) and all counts now say 18, not 28.
// BUG 3 — Dust and smoke were missing. weatherIcons has 50d_dust.png and
//   50d_smoke (haze picture). The guide had mist, fog, haze, wind, tornado, but
//   no dust or smoke, so a user who saw a dust icon in the app could not find it
//   in the guide. FIX: Added 50_dust (50d_dust.png) and 50_smoke
//   (50d_haze_ratchaburi.png, same closest picture as weatherIcons) with En/Th
//   names and descriptions in the same style as the other entries.
// BUG 4 — Topic did not sync if the parent re-used the modal while mounted.
//   useState(initialTopic) runs once. If WeatherView ever keeps the modal mounted
//   and changes initialTopic (e.g. humidity -> wind without unmount), the guide
//   would stay on the old topic. FIX: useEffect syncs topic when isOpen or
//   initialTopic changes. In current WeatherView the modal unmounts on close,
//   so this is a safety fix, not a visible change today.
// BUG 5 — No Escape key, no backdrop click, no scroll lock. Other modals
//   (ForecastDetailModal, PaymentModal) close on Escape / backdrop click and lock
//   body scroll. This one did none of them: clicking outside did nothing, Escape
//   did nothing, and the page behind kept scrolling. FIX: Added all three —
//   outer backdrop onClick={onClose} + inner stopPropagation, Escape listener,
//   and body scroll lock while open. Hooks are all BEFORE the early return,
//   so the Rules of Hooks are not broken.
// BUG 6 — 10_light had no night picture. weatherIcons maps night light rain to
//   10n_rain_night.png. The guide showed only the day picture. FIX: Added
//   nightIcon 10n_rain_night.png for 10_light.
// KNOWN LIMIT, NOT A BUG WE CAN FIX WITHOUT TRANSLATIONS — Guide body is En/Th
//   only. The bulk text (icon names/descriptions, moon phases, UV/AQI/pressure/
//   humidity/wind/conditions) is hardcoded En/Th with isThai ternaries. It does
//   NOT use t() for those strings, so German/Japanese/etc. users see English.
//   That is the same as before. To translate the guide body to all 14 languages,
//   those strings need real translations in the locale files — we do NOT invent
//   12 languages of translations here. The parts that DO use t() (topic labels,
//   title, subtitle, close, Got It) ARE translated via extras Part 3 for all
//   14 languages, so they keep working. Do not "fix" this by converting the
//   bulk text to t("guide_...") keys without adding the translations — that
//   would just show English fallback for everyone and lose the Thai text.
// KEPT AS-IS: All En/Th bulk text verbatim (no wording changed), GuideTopic
//   type, props, topic filter UI, moon phases, UV/AQI/pressure/humidity/wind/
//   conditions sections, layout and styling.
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

interface WeatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: GuideTopic;
}

interface IconGuideItem {
  code: string;
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
}) => {
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState<GuideTopic>(initialTopic);

  // FIXED BUG 4: Sync topic when the parent changes initialTopic while mounted.
  useEffect(() => {
    if (isOpen) setTopic(initialTopic);
  }, [isOpen, initialTopic]);

  // FIXED BUG 5: Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // FIXED BUG 5: Close on Escape.
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
    { id: "uv", label: t("guide_uv", isThai ? "ดัชนี UV" : "UV Index"), icon: "☀" },
    { id: "aqi", label: t("guide_aqi", isThai ? "คุณภาพอากาศ" : "Air Quality"), icon: "🍃" },
    { id: "pressure", label: t("guide_pressure", isThai ? "ความกดอากาศ" : "Pressure"), icon: "🧭" },
    { id: "humidity", label: t("guide_humidity", isThai ? "ความชื้นสัมพัทธ์" : "Humidity"), icon: "💧" },
    { id: "wind", label: t("guide_wind", isThai ? "ลมและลมกระโชก" : "Wind"), icon: "💨" },
    { id: "conditions", label: t("guide_conditions", isThai ? "สภาพอากาศ" : "Conditions"), icon: "⛅" },
  ];

  // Comprehensive catalog of the app's 18 watercolor conditions (FIXED BUG 2: was 28, actually 16; now 18 with dust + smoke).
  // FIXED BUG 1: 09d_drizzle.png / 09d_shower_rain.png / 50d_fog.png do not exist — replaced with closest existing files.
  const iconCatalog: IconGuideItem[] = [
    {
      code: "01",
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
      // FIXED BUG 1: Was /icons/watercolor/09d_drizzle.png (does not exist).
      // Closest existing day file is light rain; night is shower night (same as weatherIcons).
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
      // FIXED BUG 1: Was /icons/watercolor/09d_shower_rain.png (does not exist).
      // Closest existing day file is light rain; night was already correct.
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
      dayIcon: "/icons/watercolor/10d_light_rain.png",
      // FIXED BUG 6: Added night picture (was missing). Night light rain is 10n_rain_night.png.
      nightIcon: "/icons/watercolor/10n_rain_night.png",
      emoji: "💧",
      nameEn: "Light Rain",
      nameTh: "ฝนตกเล็กน้อย",
      descEn: "Gentle continuous rainfall. Pavement stays wet; light umbrella or hooded jacket advised.",
      descTh: "ฝนตกเบาๆ อย่างต่อเนื่อง ถนนเปียกลื่น แนะนำให้กางร่มหรือใส่เสื้อกันฝนแบบบาง",
      categoryEn: "Precipitation",
      categoryTh: "หยาดน้ำฟ้า & ฝน",
    },
    {
      code: "10_heavy",
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
      dayIcon: "/icons/watercolor/50d_mist.png",
      emoji: "🌫",
      nameEn: "Mist / Morning Dew",
      nameTh: "หมอกแดด / ละอองหมอกบาง",
      descEn: "Light atmospheric suspension of water droplets. Visibility is over 1 km (0.6 miles).",
      descTh: "ละอองน้ำบางเบาลอยในอากาศยามเช้าหรือหลังฝน ทัศนวิสัยยังมองเห็นได้ไกลกว่า 1 กิโลเมตร",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_fog",
      // FIXED BUG 1: Was /icons/watercolor/50d_fog.png (does not exist). Mist is closest.
      dayIcon: "/icons/watercolor/50d_mist.png",
      emoji: "🌁",
      nameEn: "Dense Fog",
      nameTh: "หมอกหนาจัด",
      descEn: "Cloud resting at ground level. Visibility drops below 1 km; headlights and slow driving are essential.",
      descTh: "กลุ่มเมฆลดระดับลงมาสัมผัสพื้น ทัศนวิสัยลดต่ำกว่า 1 กิโลเมตร ควรเปิดไฟหน้ารถและขับขี่อย่างระมัดระวัง",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_haze",
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
      code: "50_dust",
      // FIXED BUG 3: Added — was missing, but weatherIcons has 50d_dust.png.
      dayIcon: "/icons/watercolor/50d_dust.png",
      emoji: "🌪",
      nameEn: "Dust / Sand Storm",
      nameTh: "พายุฝุ่น / ฝุ่นทราย",
      descEn: "Fine dust and sand lifted by wind, cutting visibility and irritating eyes and lungs. Wear a mask and goggles.",
      descTh: "ฝุ่นและทรายละเอียดที่ลมพัดฟุ้ง ทำให้ทัศนวิสัยลดลงและระคายเคืองตาและปอด ควรสวมหน้ากากและแว่นตา",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_smoke",
      // FIXED BUG 3: Added — was missing. No smoke file exists; haze picture is closest (same as weatherIcons).
      dayIcon: "/icons/watercolor/50d_haze_ratchaburi.png",
      emoji: "😷",
      nameEn: "Smoke / Wildfire Smoke",
      nameTh: "ควันไฟ / ควันไฟป่า",
      descEn: "Smoke from fires and burning, with a sharp smell. Stay indoors when thick, and wear an N95 mask outside.",
      descTh: "ควันจากไฟไหม้และไฟป่า มีกลิ่นฉุน ควรอยู่ในอาคารเมื่อควันหนา และสวมหน้ากาก N95 เมื่อออกนอกอาคาร",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_wind",
      dayIcon: "/icons/watercolor/50d_wind.png",
      emoji: "💨",
      nameEn: "Gale & Strong Wind",
      nameTh: "ลมกระโชกแรง / ลมพายุ",
      descEn: "Sustained winds over 40 km/h (25 mph). Secure loose outdoor items and beware of flying debris.",
      descTh: "ลมพัดแรงต่อเนื่องเกิน 40 กม./ชม. สิ่งของน้ำหนักเบาอาจปลิว ระวังต้นไม้หรือป้ายโฆษณาชำรุด",
      categoryEn: "Atmosphere",
      categoryTh: "บรรยากาศ & หมอกควัน",
    },
    {
      code: "50_tornado",
      dayIcon: "/icons/watercolor/50d_tornado.png",
      emoji: "🌪",
      nameEn: "Tornado / Funnel Cloud",
      nameTh: "พายุทอร์นาโด / พายุงวงช้าง",
      descEn: "Violently rotating column of air extending from storm cloud to ground. Extreme localized danger.",
      descTh: "ลมหมุนวนรุนแรงรูปกรวยที่ทอดจากฐานเมฆลงสู่พื้น อันตรายสูงสุด ควรหลบเข้าห้องใต้ดินหรือห้องชั้นในสุดทันที",
      categoryEn: "Severe Weather",
      categoryTh: "สภาพอากาศรุนแรง",
    },
  ];

  // Moon phases explanation
  const moonPhases = [
    {
      icon: "🌑",
      nameEn: "New Moon",
      nameTh: "จันทร์ดับ (แรม ๑๕ ค่ำ)",
      illum: "0%",
      descEn: "Moon sits between Earth and Sun. Dark night skies; peak visibility for stargazing and meteor showers.",
      descTh: "ดวงจันทร์หันด้านมืดเข้าหาโลก ท้องฟ้ายามค่ำคืนมืดสนิท เหมาะที่สุดสำหรับการดูดาวและทางช้างเผือก",
    },
    {
      icon: "🌒",
      nameEn: "Waxing Crescent",
      nameTh: "เสี้ยวข้างขึ้น (ขึ้น ๑–๖ ค่ำ)",
      illum: "1% – 49%",
      descEn: "A slim glowing crescent appears in the western evening sky right after sunset.",
      descTh: "เสี้ยวพระจันทร์รูปโค้งบางเริ่มปรากฏทางทิศตะวันตกช่วงหัวค่ำหลังดวงอาทิตย์ตกดิน",
    },
    {
      icon: "🌓",
      nameEn: "First Quarter",
      nameTh: "ครึ่งดวงแรก (ขึ้น ๘ ค่ำ)",
      illum: "50%",
      descEn: "Right half of the Moon is illuminated. High overhead around sunset.",
      descTh: "ด้านขวาของดวงจันทร์สว่างขึ้นครึ่งดวง ลอยอยู่กลางศีรษะช่วงเวลาพลบค่ำ",
    },
    {
      icon: "🌔",
      nameEn: "Waxing Gibbous",
      nameTh: "ค่อนดวงข้างขึ้น (ขึ้น ๙–๑๔ ค่ำ)",
      illum: "51% – 99%",
      descEn: "More than half lit and growing brighter each night; easy to view with small binoculars.",
      descTh: "สว่างมากกว่าครึ่งดวงและขยายพื้นที่สว่างขึ้นเรื่อยๆ ส่องแสงนวลตาชัดเจน",
    },
    {
      icon: "🌕",
      nameEn: "Full Moon",
      nameTh: "จันทร์เต็มดวง (ขึ้น ๑๕ ค่ำ)",
      illum: "100%",
      descEn: "Entire visible face reflects sunlight. Bright enough to cast night shadows and triggers high ocean spring tides.",
      descTh: "ดวงจันทร์สะท้อนแสงเต็มดวง สว่างจนเกิดเงายามค่ำคืน และส่งผลให้น้ำขึ้น-น้ำลงสูงสุด (น้ำเกิด)",
    },
    {
      icon: "🌖",
      nameEn: "Waning Gibbous",
      nameTh: "ค่อนดวงข้างแรม (แรม ๑–๖ ค่ำ)",
      illum: "99% – 51%",
      descEn: "Moon begins shrinking from right to left, rising later into the late evening and midnight.",
      descTh: "ความสว่างเริ่มลดลงจากทางทิศตะวันตก ขึ้นช้าลงเรื่อยๆ ในช่วงดึกสงัด",
    },
    {
      icon: "🌗",
      nameEn: "Last Quarter",
      nameTh: "ครึ่งดวงหลัง (แรม ๘ ค่ำ)",
      illum: "50%",
      descEn: "Left half is illuminated. Rises around midnight and stays visible well into morning daylight.",
      descTh: "สว่างครึ่งดวงด้านซ้าย ขึ้นราวเที่ยงคืนและยังคงมองเห็นได้ชัดเจนในท้องฟ้ายามเช้า",
    },
    {
      icon: "🌘",
      nameEn: "Waning Crescent",
      nameTh: "เสี้ยวข้างแรม (แรม ๙–๑๔ ค่ำ)",
      illum: "49% – 1%",
      descEn: "A slender silver crescent visible in the eastern sky just before dawn.",
      descTh: "เสี้ยวพระจันทร์โค้งเรียวบาง ปรากฏทางขอบฟ้าทิศตะวันออกก่อนรุ่งสาง",
    },
  ];

  return (
    // FIXED BUG 5: Backdrop click now closes (was missing). Inner panel stops propagation.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-white/20 bg-card text-card-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">ℹ</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {t("weather_guide_title", isThai ? "คู่มือเข้าใจสภาพอากาศ & สัญลักษณ์" : "Weather & Celestial Guide")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("weather_guide_subtitle", isThai ? "เข้าใจตัวเลข สัญลักษณ์ไอคอน และการโคจรของดวงดาว" : "Simple explanation of weather metrics, icons & celestial tracker")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-bold transition cursor-pointer"
            aria-label={t("close", "Close")}
          >
            ✕
          </button>
        </div>

        {/* Topic Filters */}
        <div className="flex gap-1.5 overflow-x-auto p-3 border-b border-border/40 scrollbar-none bg-muted/10 shrink-0">
          {topics.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTopic(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                topic === item.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">

          {/* SECTION 1: WEATHER ICONS GLOSSARY */}
          {(topic === "all" || topic === "icons") && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  <div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">
                      {isThai ? "สารบัญไอคอนสีน้ำ (Watercolor Weather Icons)" : "Watercolor Weather Icon Guide"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {/* FIXED BUG 2: Was 28, actually 16. Now 18 with dust + smoke. */}
                      {isThai ? "รวมไอคอนสภาพอากาศกลางวันและกลางคืนทั้งหมด 18 รูปแบบในแอป" : "Visual breakdown of all 18 day & night conditions used in the app"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {iconCatalog.map((item) => (
                  <div
                    key={item.code}
                    className="p-3 rounded-2xl bg-card border border-border/70 shadow-2xs flex flex-col justify-between space-y-2 hover:border-primary/40 transition"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon Thumbnails (Day and Night if available) */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1.5 rounded-xl border border-border/50">
                        <img
                          src={item.dayIcon}
                          alt={item.nameEn}
                          className="w-8 h-8 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                        {item.nightIcon && (
                          <img
                            src={item.nightIcon}
                            alt={`${item.nameEn} Night`}
                            className="w-8 h-8 object-contain opacity-90"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{item.emoji}</span>
                          <h4 className="font-bold text-foreground text-xs truncate">
                            {isThai ? item.nameTh : item.nameEn}
                          </h4>
                        </div>
                        <span className="inline-block text-[10px] font-semibold text-primary/80 mt-0.5">
                          {isThai ? item.categoryTh : item.categoryEn}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {isThai ? item.descTh : item.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: SUN & MOON CELESTIAL TRACKER */}
          {(topic === "all" || topic === "astronomy") && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-500/15 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">
                      {isThai ? "คู่มือระบบสุริยะ & ดวงดาว (Sun & Moon Tracker)" : "Sun & Moon Celestial Guide"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isThai ? "เข้าใจเส้นทางดวงอาทิตย์ ชั่วโมงแสงสีทอง และเฟสดวงจันทร์" : "Master the solar arc, golden hours, and lunar phases for outdoor life"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sun Arc & Hours */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500">
                  ☀ {isThai ? "การโคจรของดวงอาทิตย์ & แสงธรรมชาติ" : "The Daylight Arc & Natural Lighting"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span>🌅</span> {isThai ? "ชั่วโมงแสงสีทอง (Golden Hour):" : "Golden Hour:"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {isThai
                        ? "เกิดขึ้นประมาณ 30–45 นาทีหลังพระอาทิตย์ขึ้นและก่อนพระอาทิตย์ตก แสงแดดจะทอดต่ำ ให้แสงอบอุ่นนุ่มนวล เป็นช่วงเวลาที่ดีที่สุดในการถ่ายรูปและเดินเล่น"
                        : "Occurs ~30–45 mins after sunrise & before sunset. The low sun angle scatters harsh blue rays, giving off a warm, flattering golden glow ideal for portraits and photography."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                    <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                      <span>🌌</span> {isThai ? "ชั่วโมงแสงสีน้ำเงิน (Blue Hour):" : "Blue Hour:"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {isThai
                        ? "เกิดขึ้นก่อนดวงอาทิตย์ขึ้นและหลังลับขอบฟ้า แสงบนฟ้าจะเปลี่ยนเป็นสีน้ำเงินเข้มและคราม เหมาะกับการชมวิวเมืองและไฟตึก"
                        : "The twilight period when the sun sits just below the horizon. The sky turns rich royal blue while city lights glow, providing a striking atmospheric mood."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span>☀</span> {isThai ? "จุดสูงสุดของดวงอาทิตย์ (Solar Noon):" : "Solar Noon:"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {isThai
                        ? "ช่วงเวลาที่ดวงอาทิตย์อยู่จุดสูงสุดบนท้องฟ้า (มักไม่ใช่เวลา 12:00 น. เป๊ะๆ ตามนาฬิกา) เป็นช่วงที่รังสี UV และความร้อนจากแสงแดดเข้มข้นที่สุดในแต่ละวัน"
                        : "The exact moment the sun crosses your meridian and reaches its highest elevation. This marks true peak UV intensity and heat radiation, not clock 12:00."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span>⏱</span> {isThai ? "ระยะเวลาแสงแดด (Daylight Hours):" : "Daylight Duration:"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {isThai
                        ? "คำนวณจำนวนชั่วโมงและนาทีทั้งหมดตั้งแต่พระอาทิตย์ขึ้นจนตก ช่วยให้คุณวางแผนกิจกรรมกลางแจ้งและการเดินทางล่วงหน้า"
                        : "Total hours and minutes from sunrise to sunset, indicating seasonal shifts and helping you plan long outdoor runs, hikes, and road trips."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Moon Phases */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400">
                  🌙 {isThai ? "ข้างขึ้น - ข้างแรม 8 ระยะ (8 Lunar Phases)" : "8 Moon Phases & Stargazing"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {moonPhases.map((phase, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="text-base">{phase.icon}</span>
                          <span>{isThai ? phase.nameTh : phase.nameEn}</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted font-bold text-muted-foreground">
                          {phase.illum}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {isThai ? phase.descTh : phase.descEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* UV INDEX */}
          {(topic === "all" || topic === "uv") && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">☀</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "ดัชนีรังสี UV (0 ถึง 11+)" : "UV Index (0 to 11+)"}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {isThai
                  ? "บอกระดับความแรงของรังสียูวีจากแสงแดดที่ส่งผลต่อผิวหนังและสายตาของคุณ:"
                  : "Measures the strength of sunburn-producing ultraviolet radiation reaching the ground:"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">0 – 2 (Low / ต่ำ):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "ปลอดภัย ไม่จำเป็นต้องทาครีมกันแดด เว้นแต่อยู่กลางแจ้งนาน" : "Safe to be outside. No special sun protection required."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-amber-500">3 – 5 (Moderate / ปานกลาง):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "ใส่หมวก แว่นกันแดด และทาครีมกันแดดเมื่อต้องออกแดด" : "Wear sunglasses, hat, and apply SPF 30+ if outdoors for 30+ mins."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-orange-500">6 – 7 (High / สูง):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "ผิวไหม้แดดได้ใน 20 นาที ควรหลบในที่ร่มช่วงเที่ยงถึงบ่าย" : "Skin burns in 20 minutes. Seek shade between 11 AM and 3 PM."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-destructive">8 – 11+ (Very High & Extreme):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "อันตรายมาก ผิวไหม้ได้ใน 10 นาที หลีกเลี่ยงแดดจัดเด็ดขาด" : "Skin burns in under 15 mins. Avoid direct midday sun completely."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AIR QUALITY & PM2.5 */}
          {(topic === "all" || topic === "aqi") && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍃</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "คุณภาพอากาศ (AQI) และฝุ่น PM2.5" : "Air Quality (AQI) & PM2.5"}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {isThai
                  ? "PM2.5 คือฝุ่นละอองขนาดจิ๋วที่สามารถเข้าสู่ปอดและกระแสเลือดได้โดยตรง:"
                  : "PM2.5 particles are microscopic specks of dust and smoke that can penetrate deep into the lungs:"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">0 – 50 (Good / อากาศดี):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "อากาศบริสุทธิ์ เหมาะกับการวิ่งหรือออกกำลังกายกลางแจ้ง" : "Clean air. Great for outdoor running and open windows."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-amber-500">51 – 100 (Moderate / ปานกลาง):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "อากาศปกติ ผู้ที่มีโรคประจำตัวเกี่ยวกับทางเดินหายใจอาจสังเกตเห็น" : "Acceptable. Highly sensitive people should limit prolonged exertion."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-orange-500">101 – 150 (Sensitive / เริ่มมีผล):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "เด็ก คนชรา และผู้ป่วยภูมิแพ้ควรใส่หน้ากาก N95" : "Children, elderly, and asthmatics should wear an N95 mask outside."}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-destructive">151+ (Unhealthy / ไม่ดีต่อสุขภาพ):</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isThai ? "ปิดหน้าต่าง ใช้เครื่องฟอกอากาศ หลีกเลี่ยงกิจกรรมกลางแจ้ง" : "Close windows, run air purifiers, and wear an N95 mask outdoors."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BAROMETRIC PRESSURE */}
          {(topic === "all" || topic === "pressure") && (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧭</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "ความกดอากาศ (hPa หรือ inHg)" : "Barometric Pressure (hPa or inHg)"}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {isThai
                  ? "ความกดอากาศระดับปกติเฉลี่ยอยู่ที่ 1013 hPa (29.92 inHg):"
                  : "Sea level average is 1013 hPa (29.92 inHg). Pressure trends tell you what's coming before it arrives:"}
              </p>
              <div className="space-y-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-start gap-2">
                  <span className="text-base shrink-0">📈</span>
                  <div>
                    <span className="font-bold text-foreground">
                      {isThai ? "ความกดอากาศสูง (> 1015 hPa):" : "High Pressure (> 1015 hPa):"}
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      {isThai ? "ท้องฟ้าแจ่มใส อากาศสงบและแห้ง แดดออกต่อเนื่อง" : "Sinking air keeps clouds away. Expect stable, dry, sunny weather."}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-start gap-2">
                  <span className="text-base shrink-0">📉</span>
                  <div>
                    <span className="font-bold text-destructive">
                      {isThai ? "ความกดอากาศลดลงอย่างรวดเร็ว (< 1008 hPa):" : "Falling / Low Pressure (< 1008 hPa):"}
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      {isThai ? "สัญญาณเตือนว่าพายุ เมฆฝน หรือแนวปะทะอากาศกำลังเคลื่อนเข้ามา" : "Warm rising air creates clouds. Storms, rain fronts, and wind are approaching."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HUMIDITY & FEELS-LIKE */}
          {(topic === "all" || topic === "humidity") && (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">💧</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "ความชื้นสัมพัทธ์และอุณหภูมิที่รู้สึกได้ (Feels Like)" : "Humidity & \"Feels Like\" Temperature"}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {isThai
                  ? "ความชื้นบอกปริมาณไอน้ำในอากาศ ร่างกายระบายความร้อนด้วยเหงื่อ ถ้าความชื้นสูง (> 70%) เหงื่อระเหยยาก จะรู้สึกอบอ้าวเหนียวตัวมากกว่าอุณหภูมิจริง"
                  : "Humidity shows moisture in the air. When humidity is high (> 70%), sweat cannot evaporate, making 30°C feel like 38°C (heat index). Low humidity (< 30%) feels crisp and dries out skin."}
              </p>
            </div>
          )}

          {/* WIND & GUSTS */}
          {(topic === "all" || topic === "wind") && (
            <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">💨</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "ความเร็วลมและทิศทางลม" : "Wind Speed & Direction"}
                </h3>
              </div>
              <p className="text-muted-foreground">
                {isThai
                  ? "ลม 0–15 km/h คือลมอ่อนสบาย, 16–35 km/h คือลมพัดปานกลางใบไม้ไหว, และเกิน 40 km/h คือลมแรงที่อาจพัดร่มหรือสิ่งของปลิวได้"
                  : "0–15 km/h is a gentle breeze; 16–35 km/h moves tree branches; 40+ km/h can invert umbrellas, topple light outdoor furniture, and create choppy water."}
              </p>
            </div>
          )}

          {/* COMMON WEATHER CONDITIONS */}
          {(topic === "all" || topic === "conditions") && (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">⛅</span>
                <h3 className="font-bold text-foreground text-sm sm:text-base">
                  {isThai ? "คำอธิบายสภาพอากาศทั่วไป" : "Common Weather Conditions"}
                </h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-foreground">{isThai ? "ฝนละออง (Drizzle):" : "Drizzle:"}</span>{" "}
                  <span className="text-muted-foreground">{isThai ? "เม็ดฝนขนาดจิ๋วที่ลอยในอากาศ มักไม่ทำให้เปียกโชกทันที" : "Extremely fine droplets floating in air; rarely creates large puddles."}</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-foreground">{isThai ? "ฝนซู่ / ฝนเป็นช่วง (Showers):" : "Showers:"}</span>{" "}
                  <span className="text-muted-foreground">{isThai ? "ฝนที่ตกหนักเป็นช่วงสั้นๆ และหยุด มีช่วงแดดสลับ" : "Sudden bursts of rain with rapid start and stop times, often between sunny spells."}</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/60">
                  <span className="font-bold text-foreground">{isThai ? "พายุฝนฟ้าคะนอง (Thunderstorm):" : "Thunderstorm:"}</span>{" "}
                  <span className="text-muted-foreground">{isThai ? "ฝนตกหนัก มีฟ้าแลบ ฟ้าร้อง และลมกระโชกแรง ควรหลบในอาคาร" : "Lightning, thunder, heavy rain, and sudden wind gusts. Always seek indoor shelter."}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 p-3 bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:opacity-95 transition cursor-pointer"
          >
            {t("got_it", isThai ? "เข้าใจแล้ว" : "Got It")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeatherGuideModal;
