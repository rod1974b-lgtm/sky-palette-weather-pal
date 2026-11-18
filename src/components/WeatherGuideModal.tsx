// src/components/WeatherGuideModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export type GuideTopic = "all" | "uv" | "aqi" | "pressure" | "humidity" | "wind" | "conditions";

interface WeatherGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: GuideTopic;
}

export const WeatherGuideModal: React.FC<WeatherGuideModalProps> = ({
  isOpen,
  onClose,
  initialTopic = "all",
}) => {
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState<GuideTopic>(initialTopic);

  if (!isOpen) return null;

  const isThai = i18n.language?.startsWith("th");

  const topics: { id: GuideTopic; label: string; icon: string }[] = [
    { id: "all", label: t("guide_all", isThai ? "ทั้งหมด" : "All Topics"), icon: "📚" },
    { id: "uv", label: t("guide_uv", isThai ? "ดัชนี UV" : "UV Index"), icon: "☀️" },
    { id: "aqi", label: t("guide_aqi", isThai ? "คุณภาพอากาศ" : "Air Quality"), icon: "🍃" },
    { id: "pressure", label: t("guide_pressure", isThai ? "ความกดอากาศ" : "Pressure"), icon: "🧭" },
    { id: "humidity", label: t("guide_humidity", isThai ? "ความชื้นสัมพัทธ์" : "Humidity"), icon: "💧" },
    { id: "wind", label: t("guide_wind", isThai ? "ลมและลมกระโชก" : "Wind"), icon: "💨" },
    { id: "conditions", label: t("guide_conditions", isThai ? "สภาพอากาศ" : "Conditions"), icon: "⛅" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-white/20 bg-card text-card-foreground shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {t("weather_guide_title", isThai ? "คู่มือเข้าใจสภาพอากาศง่ายๆ" : "Simple Weather Guide")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("weather_guide_subtitle", isThai ? "เข้าใจตัวเลขและการแจ้งเตือนในชีวิตประจำวัน" : "Everyday explanation of weather numbers & terms")}
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
          
          {/* UV INDEX */}
          {(topic === "all" || topic === "uv") && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">☀️</span>
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
                  ? "ความชื้นบอกปริมาณไอน้ำในอากาศ ร่างกายระบายความร้อนด้วยเหงื่อ ถ้าความชื้นสูง เหงื่อระเหยยาก จะรู้สึกอบอ้าวเหนียวตัวมากกว่าอุณหภูมิจริง"
                  : "Humidity shows the amount of moisture in the air. When humidity is high (over 70%), sweat cannot evaporate, making 30°C feel like 38°C (heat index). When humidity is low (under 30%), the air feels crisp and dries out skin."}
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
                  ? "ลม 0–15 km/h คือลมอ่อนสบาย, 16–35 km/h คือลมพัดปานกลางใบไม้ไหว, และเกิน 45 km/h คือลมแรงที่อาจพัดร่มหรือสิ่งของปลิวได้"
                  : "0–15 km/h is a light gentle breeze; 16–35 km/h moves branches; 40+ km/h can invert umbrellas, topple light outdoor furniture, and create choppy water."}
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
