import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Weather, WeatherUnit } from "@/lib/weather";

interface OutdoorActivityPlannerProps {
  weather: Weather;
  unit: WeatherUnit;
}

export type ActivityLevel = "ideal" | "good" | "fair" | "avoid";

export interface ActivityScore {
  id: string;
  category: "fitness" | "household" | "leisure";
  icon: string;
  name: string;
  level: ActivityLevel;
  score: number; // 0 - 100
  summary: string;
  metrics: { label: string; value: string; positive: boolean }[];
}

// 14-language localization dictionary
const PLANNER_EN = {
    title: "Outdoor Activity & Lifestyle Planner",
    subtitle: "Real-time condition ratings for your daily routines & outdoor plans",
    tab_all: "All",
    tab_fitness: "Fitness",
    tab_household: "Household",
    tab_leisure: "Leisure",
    level_ideal: "Ideal",
    level_good: "Good",
    level_fair: "Fair",
    level_avoid: "Avoid",
    running: "Running & Cycling",
    laundry: "Laundry Drying",
    carwash: "Car Wash",
    picnic: "Picnic & Dining",
    stargazing: "Stargazing",
    dogwalking: "Dog Walking",
    swimming: "Swimming & Beach",
    tip_running_ideal: "Crisp air, gentle wind, and dry ground. Peak workout weather!",
    tip_running_hot: "High heat and intense UV. Hydrate often or run in the early evening.",
    tip_running_rain: "Wet roads and rain risk. Indoor workouts or waterproof gear recommended.",
    tip_running_aqi: "Elevated particulate pollution. Light indoor cardio is safer today.",
    tip_laundry_ideal: "Low humidity and nice breeze. Clothes will dry rapidly outdoors!",
    tip_laundry_slow: "High humidity or overcast skies. Drying will be significantly delayed.",
    tip_laundry_rain: "Rain expected today. Best to hang clothes indoors or use a dryer.",
    tip_carwash_ideal: "Zero rain forecasted for the next 48 hours. Your clean car will stay pristine!",
    tip_carwash_rain: "Showers or storms likely soon. Hold off on washing for a few days.",
    tip_carwash_fair: "Slight chance of spotty rain. Safe to wash if parked under cover.",
    tip_picnic_ideal: "Comfortable temperatures and calm skies. Perfect for dining al fresco!",
    tip_picnic_wind: "Gusty breezes may blow paper plates and napkins. Pick a sheltered spot.",
    tip_picnic_rain: "Damp conditions or storm risk. Seek indoor dining or patio cover.",
    tip_stargazing_clear: "Minimal cloud cover and dark night skies. Excellent planetary visibility!",
    tip_stargazing_clouds: "Cloudy skies will obscure celestial views. Better skies expected later.",
    tip_stargazing_day: "Wait until nightfall after sunset for visible stars and constellations.",
    tip_dogwalking_ideal: "Pavements are cool and air is comfortable. Your dog will love this walk!",
    tip_dogwalking_hot: "Pavements may be scorching hot! Test ground with your palm or walk on grass.",
    tip_dogwalking_wet: "Muddy paws and wet streets. Keep a towel handy near the door.",
    tip_swimming_ideal: "Warm sunshine and high UV. Don't forget water-resistant sunscreen!",
    tip_swimming_cool: "A bit chilly or breezy for an outdoor swim. Warm pool preferred.",
    tip_swimming_storm: "Lightning or storm risk. Stay out of outdoor water immediately.",
    rain_risk_48h: "48h Rain Risk",
    uv_index: "UV Index",
    air_quality: "Air Quality",
    humidity: "Humidity",
    wind_speed: "Wind",
  };
type PlannerKey = keyof typeof PLANNER_EN;

const PLANNER_I18N: Record<string, Partial<Record<PlannerKey, string>>> = {
  en: PLANNER_EN,
  th: {
    title: "วางแผนกิจกรรมกลางแจ้งและการใช้ชีวิต",
    subtitle: "ประเมินสภาพอากาศแบบเรียลไทม์สำหรับกิจวัตรและกิจกรรมนอกบ้าน",
    tab_all: "ทั้งหมด",
    tab_fitness: "ออกกำลังกาย",
    tab_household: "งานบ้าน",
    tab_leisure: "พักผ่อน",
    level_ideal: "ยอดเยี่ยม",
    level_good: "ดี",
    level_fair: "พอใช้",
    level_avoid: "ควรเลี่ยง",
    running: "วิ่ง & ปั่นจักรยาน",
    laundry: "ตากผ้ากลางแจ้ง",
    carwash: "ล้างรถ",
    picnic: "ปิกนิก & ทานอาหารนอกบ้าน",
    stargazing: "ดูดาวตอนกลางคืน",
    dogwalking: "พาสัตว์เลี้ยงเดินเล่น",
    swimming: "ว่ายน้ำ & ชายหาด",
    tip_running_ideal: "อากาศกำลังดี ลมอ่อนและพื้นแห้ง เหมาะกับการออกกำลังกายกลางแจ้ง!",
    tip_running_hot: "อากาศร้อนและแดดแรง ควรจิบน้ำบ่อยๆ หรือเลือกรอบเช้าตรู่/ค่ำ",
    tip_running_rain: "มีฝนตกหรือถนนเปียกลื่น แนะนำออกกำลังกายในร่มแทน",
    tip_running_aqi: "ค่าฝุ่น PM2.5 สูง แนะนำออกกำลังกายในร่มที่ปิดมิดชิด",
    tip_laundry_ideal: "ความชื้นต่ำและลมพัดโปร่ง ผ้าจะแห้งไวและไม่อับชื้น!",
    tip_laundry_slow: "ความชื้นสูงหรือมีเมฆหนา ผ้าจะแห้งช้ากว่าปกติ",
    tip_laundry_rain: "มีโอกาสฝนตกสูง แนะนำตากในที่ร่มหรือใช้เครื่องอบผ้า",
    tip_carwash_ideal: "ไม่มีฝนใน 48 ชั่วโมงข้างหน้า ล้างแล้วรถจะสะอาดเงางามยาวนาน!",
    tip_carwash_rain: "มีโอกาสเกิดฝนหรือพายุเร็วๆ นี้ ควรรออีกสักสองสามวัน",
    tip_carwash_fair: "อาจมีฝนประปราย หากจอดในโรงรถสามารถล้างได้",
    tip_picnic_ideal: "อุณหภูมิสบาย ท้องฟ้าสดใส เหมาะแก่การรับประทานอาหารกลางแจ้งอย่างยิ่ง",
    tip_picnic_wind: "มีลมกระโชกแรง อาจพัดสิ่งของปลิว ควรเลือกมุมที่มีที่บังลม",
    tip_picnic_rain: "พื้นเปียกหรือมีความเสี่ยงฝนตก แนะนำทานอาหารในร่ม",
    tip_stargazing_clear: "ท้องฟ้าโปร่งไร้เมฆ ทัศนวิสัยดีเยี่ยม เหมาะกับการชมดวงดาว!",
    tip_stargazing_clouds: "มีเมฆบดบังท้องฟ้าเป็นส่วนใหญ่ มองเห็นดาวได้ยาก",
    tip_stargazing_day: "รอหลังพระอาทิตย์ตกดินเพื่อให้ท้องฟ้ามืดสนิทก่อนชมดาว",
    tip_dogwalking_ideal: "พื้นถนนไม่ร้อน อากาศสบาย สัตว์เลี้ยงของคุณจะเพลิดเพลินมาก!",
    tip_dogwalking_hot: "พื้นถนนอาจร้อนจัด! ลองสัมผัสพื้นด้วยมือก่อน หรือเดินบนสนามหญ้า",
    tip_dogwalking_wet: "พื้นเฉอะแฉะ ระวังเท้าเลอะ เตรียมผ้าเช็ดก่อนเข้าบ้าน",
    tip_swimming_ideal: "แดดอุ่น น้ำน่าเล่น อย่าลืมทาครีมกันแดดกันน้ำ!",
    tip_swimming_cool: "ลมแรงหรืออากาศเย็นเล็กน้อย เหมาะกับสระน้ำอุ่น",
    tip_swimming_storm: "เสี่ยงฟ้าคะนอง ห้ามลงเล่นน้ำกลางแจ้งเด็ดขาด",
    rain_risk_48h: "โอกาสฝน 48 ชม.",
    uv_index: "ดัชนี UV",
    air_quality: "คุณภาพอากาศ",
    humidity: "ความชื้น",
    wind_speed: "ความเร็วลม",
  },
  es: {
    title: "Planificador de Actividades al Aire Libre",
    subtitle: "Calificaciones en tiempo real para tus rutinas y planes exteriores",
    tab_all: "Todos",
    tab_fitness: "Deporte",
    tab_household: "Hogar",
    tab_leisure: "Ocio",
    level_ideal: "Ideal",
    level_good: "Bueno",
    level_fair: "Regular",
    level_avoid: "Evitar",
    running: "Correr y Ciclismo",
    laundry: "Secar Ropa al Sol",
    carwash: "Lavar el Coche",
    picnic: "Pícnic y Terraza",
    stargazing: "Observar Estrellas",
    dogwalking: "Pasear al Perro",
    swimming: "Piscina y Playa",
    tip_running_ideal: "Aire fresco, viento suave y suelo seco. ¡Clima perfecto para entrenar!",
    tip_running_hot: "Mucho calor y radiación UV alta. Hidrátate o corre al atardecer.",
    tip_running_rain: "Suelo mojado y riesgo de lluvia. Mejor entrenamiento bajo techo.",
    tip_running_aqi: "Polución elevada. Se recomienda cardio suave en interiores.",
    tip_laundry_ideal: "Baja humedad y brisa agradable. ¡La ropa se secará muy rápido!",
    tip_laundry_slow: "Alta humedad o cielo cubierto. El secado tardará bastante.",
    tip_laundry_rain: "Lluvia prevista hoy. Es mejor tender dentro de casa.",
    tip_carwash_ideal: "Sin lluvia prevista en las próximas 48 horas. ¡Tu coche brillará!",
    tip_carwash_rain: "Probables chubascos pronto. Pospón el lavado unos días.",
    tip_carwash_fair: "Baja probabilidad de lluvia. Lava si aparcas bajo techo.",
    tip_picnic_ideal: "Temperatura agradable y cielo despejado. ¡Perfecto para comer al aire libre!",
    tip_picnic_wind: "Rachas de viento notables. Busca una zona resguardada.",
    tip_picnic_rain: "Riesgo de precipitaciones. Se aconseja terraza cubierta.",
    tip_stargazing_clear: "Cielo sin nubes y excelente visibilidad cósmica.",
    tip_stargazing_clouds: "Nubes abundantes ocultarán las estrellas.",
    tip_stargazing_day: "Espera a la noche tras la puesta del sol para ver estrellas.",
    tip_dogwalking_ideal: "El asfalto está fresco y el clima es templado. ¡Paseo ideal!",
    tip_dogwalking_hot: "¡El suelo puede quemar! Comprueba el asfalto con la mano.",
    tip_dogwalking_wet: "Calles mojadas y barro. Ten toallas listas al volver.",
    tip_swimming_ideal: "Sol radiante y temperatura cálida. ¡Aplica protector solar!",
    tip_swimming_cool: "Algo fresco o ventoso para nadar al aire libre.",
    tip_swimming_storm: "Riesgo de tormenta eléctrica. Sal del agua de inmediato.",
    rain_risk_48h: "Riesgo Lluvia 48h",
    uv_index: "Índice UV",
    air_quality: "Calidad Aire",
    humidity: "Humedad",
    wind_speed: "Viento",
  },
  ja: {
    title: "アウトドア活動＆ライフスタイル・プランナー",
    subtitle: "毎日の習慣やお出かけのためのリアルタイム天気適性指数",
    tab_all: "すべて",
    tab_fitness: "運動",
    tab_household: "家事",
    tab_leisure: "レジャー",
    level_ideal: "最適",
    level_good: "良好",
    level_fair: "普通",
    level_avoid: "不適",
    running: "ランニング・サイクリング",
    laundry: "洗濯物干し",
    carwash: "洗車",
    picnic: "ピクニック・外食",
    stargazing: "天体観測・星空",
    dogwalking: "愛犬の散歩",
    swimming: "水泳・海水浴",
    tip_running_ideal: "爽やかな風と乾燥した路面。運動に最高のコンディションです！",
    tip_running_hot: "気温と紫外線が高めです。水分補給をこまめに行いましょう。",
    tip_running_rain: "降雨または路面凍結・スリップの危険。室内運動が安全です。",
    tip_running_aqi: "大気汚染指数が高めです。激しい屋外運動は控えましょう。",
    tip_laundry_ideal: "湿度低めで適度な風。外干しで気持ちよく乾きます！",
    tip_laundry_slow: "高湿度または曇天。乾くまでに時間がかかります。",
    tip_laundry_rain: "雨の予報があります。部屋干しまたは乾燥機をおすすめします。",
    tip_carwash_ideal: "今後48時間は雨の心配がありません。洗車日和です！",
    tip_carwash_rain: "近いうちに雨が降る見込みです。数日見合わせましょう。",
    tip_carwash_fair: "小雨の可能性があります。屋根付き駐車場なら洗車OKです。",
    tip_picnic_ideal: "心地よい気温と穏やかな風。アウトドアランチにぴったり！",
    tip_picnic_wind: "突風に注意。物が飛ばされない場所を選びましょう。",
    tip_picnic_rain: "雨の懸念があります。屋根のあるテラスや室内がおすすめ。",
    tip_stargazing_clear: "雲が少なく澄んだ夜空。星空観察に絶好の夜です！",
    tip_stargazing_clouds: "雲が多く星が見えにくい空模様です。",
    tip_stargazing_day: "日没後の夜の空をお待ちください。",
    tip_dogwalking_ideal: "路面温度も快適です。愛犬との楽しい散歩ができます！",
    tip_dogwalking_hot: "アスファルトが高温の恐れがあります。日陰や芝生を選びましょう。",
    tip_dogwalking_wet: "水たまりやぬかるみあり。帰宅時の足拭きタオルを用意しましょう。",
    tip_swimming_ideal: "水辺で過ごすのに最高の日差しです。日焼け止めを忘れずに！",
    tip_swimming_cool: "風があり少し肌寒いかもしれません。温水プールが快適です。",
    tip_swimming_storm: "雷雲接近の危険あり。直ちに水から上がりましょう。",
    rain_risk_48h: "48時間雨リスク",
    uv_index: "紫外線指数",
    air_quality: "空気質",
    humidity: "湿度",
    wind_speed: "風速",
  },
  zh: {
    title: "户外活动与生活出行指南",
    subtitle: "基于实时天气、紫外线和空气质量的生活日程适宜度评估",
    tab_all: "全部",
    tab_fitness: "健身运动",
    tab_household: "家务生活",
    tab_leisure: "休闲出游",
    level_ideal: "极佳",
    level_good: "适宜",
    level_fair: "一般",
    level_avoid: "不宜",
    running: "跑步与骑行",
    laundry: "户外晾晒",
    carwash: "洗车指数",
    picnic: "野餐与户外用餐",
    stargazing: "夜间观星",
    dogwalking: "遛狗散步",
    swimming: "游泳戏水",
    tip_running_ideal: "温度适宜，微风拂面，非常适合户外有氧运动！",
    tip_running_hot: "气温较高且紫外线强烈，注意补充水分或选择傍晚锻炼。",
    tip_running_rain: "地面湿滑有降雨风险，建议室内健身运动。",
    tip_running_aqi: "空气污染指数偏高，建议在空气清新的室内锻炼。",
    tip_laundry_ideal: "空气干燥伴有微风，衣物在户外能快速晾干！",
    tip_laundry_slow: "湿度偏高或阴云密布，晾干速度较慢。",
    tip_laundry_rain: "有降雨可能，建议移至室内晾干或使用烘干机。",
    tip_carwash_ideal: "未来48小时无降雨，洗车后可保持长期干净光亮！",
    tip_carwash_rain: "近期有降水预报，建议推迟洗车计划。",
    tip_carwash_fair: "偶有小阵雨风险，若有室内车库可放心清洗。",
    tip_picnic_ideal: "天气温和宜人，非常适合户外草坪聚餐与露营！",
    tip_picnic_wind: "阵风较大，请注意固定遮阳伞或选择背风处。",
    tip_picnic_rain: "天气阴湿有雨，建议选择带顶棚的露台或室内用餐。",
    tip_stargazing_clear: "云量极少，夜空通透，是仰望银河与星空的绝佳之夜！",
    tip_stargazing_clouds: "多云或阴天，星空视线受阻。",
    tip_stargazing_day: "请等待日落天黑后再开启观星之旅。",
    tip_dogwalking_ideal: "地面温和舒适，您的爱犬一定会度过愉快的散步时光！",
    tip_dogwalking_hot: "地面可能发烫！请先用手背试温或选择草地散步。",
    tip_dogwalking_wet: "地面潮湿泥泞，进屋前请备好擦脚毛巾。",
    tip_swimming_ideal: "阳光明媚水温舒适，户外玩水记得涂抹防水防晒霜！",
    tip_swimming_cool: "风大且水温偏凉，室内恒温泳池更舒适。",
    tip_swimming_storm: "雷暴预警风险，请立即远离户外水域！",
    rain_risk_48h: "48小时降雨率",
    uv_index: "紫外线指数",
    air_quality: "空气质量",
    humidity: "相对湿度",
    wind_speed: "风力风速",
  },
  hi: {
    title: "आउटडोर गतिविधि और जीवनशैली योजनाकार",
    subtitle: "आपकी दैनिक गतिविधियों के लिए वास्तविक समय मौसम रेटिंग",
    tab_all: "सभी",
    tab_fitness: "व्यायाम",
    tab_household: "घरेलू कार्य",
    tab_leisure: "मनोरंजन",
    level_ideal: "उत्कृष्ट",
    level_good: "अच्छा",
    level_fair: "सामान्य",
    level_avoid: "बचें",
    running: "दौड़ना और साइकिल चलाना",
    laundry: "कपड़े सुखाना",
    carwash: "कार धोना",
    picnic: "पिकनिक और आउटडोर भोजन",
    stargazing: "तारे देखना",
    dogwalking: "कुत्ते को टहलाना",
    swimming: "तैराकी",
    tip_running_ideal: "ताजा हवा, हल्की हवा और सूखी जमीन। दौड़ने के लिए उत्तम मौसम!",
    tip_running_hot: "तेज धूप और गर्मी। पर्याप्त पानी पिएं या शाम को दौड़ें।",
    tip_running_rain: "बारिश और गीली सड़कों का खतरा। इनडोर कसरत बेहतर है।",
    tip_running_aqi: "हवा में प्रदूषण ज्यादा है। घर के अंदर हल्का व्यायाम करें।",
    tip_laundry_ideal: "कम नमी और अच्छी हवा। कपड़े तेजी से सूखेंगे!",
    tip_laundry_slow: "ज्यादा नमी के कारण कपड़े देर से सूखेंगे।",
    tip_laundry_rain: "बारिश की संभावना है। कपड़े अंदर सुखाएं।",
    tip_carwash_ideal: "अगले 48 घंटों में बारिश की संभावना नहीं है। कार धोना सही रहेगा!",
    tip_carwash_rain: "जल्द ही बारिश संभव है। कार धोना टालें।",
    tip_carwash_fair: "हल्की बारिश की संभावना है। कवर्ड पार्किंग हो तो धो सकते हैं।",
    tip_picnic_ideal: "सुहावना तापमान और साफ आसमान। पिकनिक के लिए शानदार दिन!",
    tip_picnic_wind: "तेज हवा से सामान उड़ सकता है। सुरक्षित जगह चुनें।",
    tip_picnic_rain: "बारिश की संभावना है। शेड वाली जगह चुनें।",
    tip_stargazing_clear: "साफ रात का आसमान। तारों को देखने का उत्तम अवसर!",
    tip_stargazing_clouds: "बादलों की वजह से तारे नहीं दिखेंगे।",
    tip_stargazing_day: "तारे देखने के लिए सूर्यास्त का इंतजार करें।",
    tip_dogwalking_ideal: "सड़कें ठंडी हैं और मौसम अच्छा है। टहलने का बढ़िया समय!",
    tip_dogwalking_hot: "सड़क बहुत गर्म हो सकती है! घास पर टहलाएं।",
    tip_dogwalking_wet: "गीली सड़कों पर कीचड़ हो सकता है। तौलिया तैयार रखें।",
    tip_swimming_ideal: "तेज धूप और गर्म मौसम। सनस्क्रीन लगाना न भूलें!",
    tip_swimming_cool: "हवा ठंडी है। गर्म पानी का पूल बेहतर रहेगा।",
    tip_swimming_storm: "तूफान का खतरा है। तुरंत पानी से बाहर आएं।",
    rain_risk_48h: "48 घंटे बारिश जोखिम",
    uv_index: "UV सूचकांक",
    air_quality: "वायु गुणवत्ता",
    humidity: "नमी",
    wind_speed: "हवा की गति",
  },
  fr: {
    title: "Guide des Activités de Plein Air",
    subtitle: "Évaluation en temps réel pour vos sorties et routines quotidiennes",
    tab_all: "Tout",
    tab_fitness: "Sport",
    tab_household: "Maison",
    tab_leisure: "Loisirs",
    level_ideal: "Idéal",
    level_good: "Bon",
    level_fair: "Moyen",
    level_avoid: "À éviter",
    running: "Course & Cyclisme",
    laundry: "Séchage du Linge",
    carwash: "Lavage de Voiture",
    picnic: "Pique-nique & Terrasse",
    stargazing: "Observation des Étoiles",
    dogwalking: "Promenade du Chien",
    swimming: "Baignade & Plage",
    tip_running_ideal: "Air frais, vent calme et sol sec. Conditions optimales pour le sport !",
    tip_running_hot: "Forte chaleur et UV élevés. Hydratez-vous ou courez en soirée.",
    tip_running_rain: "Sol glissant et pluie. Préférez une séance en intérieur.",
    tip_running_aqi: "Qualité de l'air médiocre. Cardio doux en intérieur conseillé.",
    tip_laundry_ideal: "Faible humidité et brise agréable. Le linge séchera très vite dehors !",
    tip_laundry_slow: "Humidité élevée. Le séchage prendra plus de temps.",
    tip_laundry_rain: "Pluie prévue aujourd'hui. Faites sécher le linge à l'intérieur.",
    tip_carwash_ideal: "Aucune pluie prévue sous 48h. Votre voiture restera impeccable !",
    tip_carwash_rain: "Averses imminentes. Reportez le lavage de quelques jours.",
    tip_carwash_fair: "Léger risque de bruine. Faisable si garée à l'abri.",
    tip_picnic_ideal: "Douceur et ciel dégagé. Merveilleux pour déjeuner dehors !",
    tip_picnic_wind: "Rafales de vent. Choisissez un endroit abrité.",
    tip_picnic_rain: "Risque de pluie. Privilégiez une terrasse couverte.",
    tip_stargazing_clear: "Ciel pur et sans nuages. Visibilité astronomique parfaite !",
    tip_stargazing_clouds: "Ciel couvert masquant les étoiles.",
    tip_stargazing_day: "Attendez la tombée de la nuit après le coucher du soleil.",
    tip_dogwalking_ideal: "Sol frais et temps agréable. Votre chien va adorer la sortie !",
    tip_dogwalking_hot: "Asphalte brûlant ! Testez le sol de la main ou marchez sur l'herbe.",
    tip_dogwalking_wet: "Trottoirs mouillés et boue. Préparez une serviette à l'entrée.",
    tip_swimming_ideal: "Soleil chaud. Pensez à la crème solaire résistante à l'eau !",
    tip_swimming_cool: "Un peu frais ou venteux pour nager dehors.",
    tip_swimming_storm: "Risque d'orage. Sortez de l'eau sans délai.",
    rain_risk_48h: "Risque Pluie 48h",
    uv_index: "Indice UV",
    air_quality: "Qualité Air",
    humidity: "Humidité",
    wind_speed: "Vent",
  },
  de: {
    title: "Freizeit- & Outdoor-Aktivitätenplaner",
    subtitle: "Echtzeit-Wetterbewertung für Sport, Haushalt und Ausflüge",
    tab_all: "Alle",
    tab_fitness: "Fitness",
    tab_household: "Haushalt",
    tab_leisure: "Freizeit",
    level_ideal: "Ideal",
    level_good: "Gut",
    level_fair: "Mäßig",
    level_avoid: "Meiden",
    running: "Laufen & Radfahren",
    laundry: "Wäschetrocknen",
    carwash: "Autowäsche",
    picnic: "Picknick & Außenbereich",
    stargazing: "Sterne Beobachten",
    dogwalking: "Gassigehen",
    swimming: "Schwimmen & Badesee",
    tip_running_ideal: "Angenehme Kühle, trockene Wege und wenig Wind. Perfektes Laufwetter!",
    tip_running_hot: "Große Hitze und hohe UV-Werte. Reichlich trinken oder abends laufen.",
    tip_running_rain: "Nasse Straßen und Rutschgefahr. Training drinnen empfohlen.",
    tip_running_aqi: "Erhöhte Feinstaubwerte. Sport besser drinnen ausüben.",
    tip_laundry_ideal: "Niedrige Luftfeuchtigkeit und feine Brise. Wäsche trocknet rasch!",
    tip_laundry_slow: "Hohe Luftfeuchte. Wäsche trocknet nur sehr langsam.",
    tip_laundry_rain: "Regen gemeldet. Bitte drinnen aufhängen.",
    tip_carwash_ideal: "48 Stunden trockenes Wetter garantiert. Das Auto bleibt blitzsauber!",
    tip_carwash_rain: "Baldiger Regen erwartet. Wagenwäsche um ein paar Tage verschieben.",
    tip_carwash_fair: "Vereinzelt Schauer möglich. In der Garage problemlos.",
    tip_picnic_ideal: "Mildes Wetter und heiterer Himmel. Ideal fürs Essen im Grünen!",
    tip_picnic_wind: "Böiger Wind. Windgeschützten Platz suchen.",
    tip_picnic_rain: "Nass und ungemütlich. Überdachte Plätze aufsuchen.",
    tip_stargazing_clear: "Klarer Nachthimmel ohne Bewölkung. Tolle Sicht auf Sterne und Planeten!",
    tip_stargazing_clouds: "Dichte Wolken versperren die Sicht.",
    tip_stargazing_day: "Warten Sie auf den Sonnenuntergang und die Dunkelheit.",
    tip_dogwalking_ideal: "Boden angenehm temperiert. Ideale Runde für Ihren Vierbeiner!",
    tip_dogwalking_hot: "Asphalt kann sehr heiß sein! Handtest machen oder auf Gras laufen.",
    tip_dogwalking_wet: "Matsch und Pfützen. Handtuch für die Pfoten bereithalten.",
    tip_swimming_ideal: "Herrliches Sommerwetter. Sonnenschutz nicht vergessen!",
    tip_swimming_cool: "Kühl oder windig für Freibäder. Hallenbad empfohlen.",
    tip_swimming_storm: "Gewittergefahr! Wasser unverzüglich verlassen.",
    rain_risk_48h: "48h Regenrisiko",
    uv_index: "UV-Index",
    air_quality: "Luftqualität",
    humidity: "Luftfeuchte",
    wind_speed: "Windstärke",
  },
  pt: {
    title: "Planejador de Atividades ao Ar Livre",
    subtitle: "Classificação em tempo real para suas rotinas e planos externos",
    tab_all: "Todos",
    tab_fitness: "Esporte",
    tab_household: "Casa",
    tab_leisure: "Lazer",
    level_ideal: "Ideal",
    level_good: "Bom",
    level_fair: "Regular",
    level_avoid: "Evitar",
    running: "Corrida & Ciclismo",
    laundry: "Secagem de Roupas",
    carwash: "Lavar o Carro",
    picnic: "Piquenique & Almoço",
    stargazing: "Observar Estrelas",
    dogwalking: "Passear com o Cão",
    swimming: "Natação & Praia",
    tip_running_ideal: "Ar puro, vento suave e piso seco. Clima perfeito para o treino!",
    tip_running_hot: "Calor intenso e índice UV alto. Hidrate-se bem.",
    tip_running_rain: "Chão molhado com risco de chuva. Treine em local coberto.",
    tip_running_aqi: "Qualidade do ar desfavorável. Melhor exercitar-se em local fechado.",
    tip_laundry_ideal: "Pouca umidade e brisa fresca. As roupas secarão rapidamente!",
    tip_laundry_slow: "Alta umidade ou céu nublado. A secagem será demorada.",
    tip_laundry_rain: "Previsão de chuva hoje. Estenda em local coberto.",
    tip_carwash_ideal: "Sem chuva nas próximas 48 horas. Seu carro ficará impecável!",
    tip_carwash_rain: "Pancadas de chuva em breve. Adie a lavagem por alguns dias.",
    tip_carwash_fair: "Pequena chance de chuva fraca. Seguro se estiver sob cobertura.",
    tip_picnic_ideal: "Tempo ameno e céu aberto. Excelente para almoçar ao ar livre!",
    tip_picnic_wind: "Vento forte. Escolha um cantinho protegido.",
    tip_picnic_rain: "Tempo chuvoso. Procure um quiosque ou varanda coberta.",
    tip_stargazing_clear: "Céu limpo e sem nuvens. Ótima visibilidade astronômica!",
    tip_stargazing_clouds: "Muitas nuvens escondendo o céu estrelado.",
    tip_stargazing_day: "Aguarde o anoitecer após o pôr do sol.",
    tip_dogwalking_ideal: "Asfalto fresco e clima agradável. O passeio será fantástico!",
    tip_dogwalking_hot: "O asfalto pode queimar as patas! Caminhe na grama.",
    tip_dogwalking_wet: "Ruas molhadas e poças. Tenha uma toalha pronta na porta.",
    tip_swimming_ideal: "Sol brilhando e clima quente. Use protetor solar resistente à água!",
    tip_swimming_cool: "Fresco ou com vento. Piscina aquecida é mais indicada.",
    tip_swimming_storm: "Risco de raios. Saia da água imediatamente.",
    rain_risk_48h: "Chuva em 48h",
    uv_index: "Índice UV",
    air_quality: "Qualidade do Ar",
    humidity: "Umidade",
    wind_speed: "Vento",
  },
  ru: {
    title: "Планировщик активности на открытом воздухе",
    subtitle: "Оценка погодных условий для спорта, быта и отдыха в реальном времени",
    tab_all: "Все",
    tab_fitness: "Спорт",
    tab_household: "Быт",
    tab_leisure: "Отдых",
    level_ideal: "Отлично",
    level_good: "Хорошо",
    level_fair: "Средне",
    level_avoid: "Не стоит",
    running: "Бег и Велосипед",
    laundry: "Сушка белья",
    carwash: "Мойка машины",
    picnic: "Пикник и кафе",
    stargazing: "Звёздное небо",
    dogwalking: "Прогулка с собакой",
    swimming: "Купание и Пляж",
    tip_running_ideal: "Свежий воздух, сухой асфальт и легкий ветерок. Идеально для пробежки!",
    tip_running_hot: "Жара и высокий УФ-индекс. Пейте больше воды или бегайте вечером.",
    tip_running_rain: "Мокрая дорога и дождь. Лучше позаниматься в помещении.",
    tip_running_aqi: "Загрязнение воздуха выше нормы. Рекомендуется легкая тренировка дома.",
    tip_laundry_ideal: "Низкая влажность и ветерок. Белье высохнет очень быстро!",
    tip_laundry_slow: "Высокая влажность или пасмурно. Сохнуть будет долго.",
    tip_laundry_rain: "Ожидается дождь. Сушите белье в комнате.",
    tip_carwash_ideal: "Осадков в ближайшие 48 часов не ожидается. Машина будет чистой!",
    tip_carwash_rain: "Скоро возможен дождь. Отложите мойку на пару дней.",
    tip_carwash_fair: "Возможен мелкий дождь. В гараже мыть безопасно.",
    tip_picnic_ideal: "Приятная температура и ясное небо. Отличный день для пикника!",
    tip_picnic_wind: "Порывистый ветер. Выберите защищенное место.",
    tip_picnic_rain: "Сырость или дождь. Лучше выбрать крытую террасу.",
    tip_stargazing_clear: "Безоблачное ночное небо. Отличная видимость созвездий!",
    tip_stargazing_clouds: "Плотные облака закрывают обзор звезд.",
    tip_stargazing_day: "Дождитесь наступления темноты после заката.",
    tip_dogwalking_ideal: "Асфальт прохладный, погода комфортная. Пес будет в восторге!",
    tip_dogwalking_hot: "Асфальт может обжечь лапы! Гуляйте по траве.",
    tip_dogwalking_wet: "Грязь и лужи. Приготовьте полотенце у входа.",
    tip_swimming_ideal: "Тепло и солнечно. Не забудьте водостойкий солнцезащитный крем!",
    tip_swimming_cool: "Прохладно или ветрено для купания на улице.",
    tip_swimming_storm: "Опасность грозы! Немедленно выйдите из воды.",
    rain_risk_48h: "Риск дождя 48ч",
    uv_index: "УФ-индекс",
    air_quality: "Воздух",
    humidity: "Влажность",
    wind_speed: "Ветер",
  },
  ar: {
    title: "مخطط الأنشطة الخارجية ونمط الحياة",
    subtitle: "تقييم مباشر للطقس والملائمة للأنشطة اليومية والرحلات",
    tab_all: "الكل",
    tab_fitness: "رياضة",
    tab_household: "المنزل",
    tab_leisure: "ترفيه",
    level_ideal: "مثالي",
    level_good: "جيد",
    level_fair: "مقبول",
    level_avoid: "تجنب",
    running: "الجري وركوب الدراجات",
    laundry: "تجفيف الملابس بالخارج",
    carwash: "غسيل السيارة",
    picnic: "نزهة وتناول الطعام",
    stargazing: "مراقبة النجوم ليلاً",
    dogwalking: "تمشية الحيوانات الأليفة",
    swimming: "السباحة والشاطئ",
    tip_running_ideal: "هواء منعش ورياح هادئة وطرق جافة. وقت مثالي للرياضة!",
    tip_running_hot: "حرارة شديدة وأشعة شمس قوية. أكثر من شرب الماء أو تدرب مساءً.",
    tip_running_rain: "أمطار وطرق منزلقة. يفضل ممارسة الرياضة في الداخل.",
    tip_running_aqi: "تلوث الهواء مرتفع نسبياً. من الأفضل التدرب داخل المنزل.",
    tip_laundry_ideal: "رطوبة منخفضة ونسيم لطيف. ستجف الملابس بسرعة فائقة!",
    tip_laundry_slow: "رطوبة عالية أو سماء غائمة، سيستغرق التجفيف وقتاً أطول.",
    tip_laundry_rain: "أمطار متوقعة اليوم، يفضل تجفيف الملابس داخل المنزل.",
    tip_carwash_ideal: "لا أمطار خلال الـ 48 ساعة القادمة. ستبقى سيارتك نظيفة ولامعة!",
    tip_carwash_rain: "احتمال هطول أمطار قريباً. أجل غسيل السيارة لبضعة أيام.",
    tip_carwash_fair: "احتمال رذاذ خفيف. مناسب إذا أوقفت السيارة في مكان مسقوف.",
    tip_picnic_ideal: "جو لطيف وسماء صافية. مناسب جداً لتناول الطعام في الهواء الطلق!",
    tip_picnic_wind: "رياح نشطة قد تطير الأغراض. اختر مكاناً محمياً.",
    tip_picnic_rain: "أرض مبللة أو أمطار متوقعة. يفضل الجلوس في مكان مسقوف.",
    tip_stargazing_clear: "سماء ليلية صافية وخالية من الغيوم. رؤية رائعة للنجوم!",
    tip_stargazing_clouds: "غيوم كثيفة تحجب رؤية النجوم.",
    tip_stargazing_day: "انتظر حتى حلول الظلام بعد غروب الشمس.",
    tip_dogwalking_ideal: "الأرض باردة والجو معتدل. نزهة ممتعة ومريحة لحيوانك الأليف!",
    tip_dogwalking_hot: "الأسفلت قد يكون حاراً جداً! افحص الأرض بيدك أو امشِ على العشب.",
    tip_dogwalking_wet: "شوارع مبتلة ووحل. جهز منشفة عند الباب.",
    tip_swimming_ideal: "شمس دافئة وطقس صيفي. لا تنسَ واقي الشمس المقاوم للماء!",
    tip_swimming_cool: "الجو بارد أو به رياح للسباحة الخارجية. المسبح الدافئ أفضل.",
    tip_swimming_storm: "خطر العواصف الرعدية والبرق. اخرج من الماء فوراً.",
    rain_risk_48h: "مطر خلال 48س",
    uv_index: "مؤشر الشمس",
    air_quality: "جودة الهواء",
    humidity: "الرطوبة",
    wind_speed: "سرعة الرياح",
  },
  ko: {
    title: "야외 활동 & 라이프스타일 플래너",
    subtitle: "실시간 날씨와 대기 질 기반 일상 및 야외 활동 적합도 지수",
    tab_all: "전체",
    tab_fitness: "운동",
    tab_household: "가사",
    tab_leisure: "여가",
    level_ideal: "최상",
    level_good: "좋음",
    level_fair: "보통",
    level_avoid: "자제",
    running: "러닝 & 자전거",
    laundry: "야외 빨래 건조",
    carwash: "세차 지수",
    picnic: "피크닉 & 야외 식사",
    stargazing: "별자리 관측",
    dogwalking: "반려견 산책",
    swimming: "물놀이 & 수영",
    tip_running_ideal: "상쾌한 공기와 마른 노면. 야외 운동하기에 최고의 날씨입니다!",
    tip_running_hot: "기온과 자외선이 높습니다. 수분을 자주 섭취하거나 해질녘을 이용하세요.",
    tip_running_rain: "비와 미끄러운 노면 위험. 실내 유산소 운동을 권장합니다.",
    tip_running_aqi: "미세먼지 농도가 높습니다. 실내에서 가벼운 운동을 하세요.",
    tip_laundry_ideal: "낮은 습도와 기분 좋은 바람으로 빨래가 보송보송하게 잘 마릅니다!",
    tip_laundry_slow: "습도가 높거나 흐려 건조 시간이 오래 걸립니다.",
    tip_laundry_rain: "비 소식이 있으므로 실내 건조나 건조기를 이용하세요.",
    tip_carwash_ideal: "향후 48시간 동안 비 소식이 없습니다. 세차하기에 아주 좋습니다!",
    tip_carwash_rain: "곧 비 소식이 있습니다. 며칠 뒤로 미루시는 것을 추천합니다.",
    tip_carwash_fair: "약한 비 가능성이 있습니다. 실내 주차장 이용 시 세차해도 괜찮습니다.",
    tip_picnic_ideal: "쾌적한 온도와 맑은 하늘. 야외 피크닉에 안성맞춤입니다!",
    tip_picnic_wind: "돌풍에 물건이 날아갈 수 있으니 바람막이가 있는 곳을 고르세요.",
    tip_picnic_rain: "비 위험이 있으니 지붕이 있는 야외 테라스나 실내를 추천합니다.",
    tip_stargazing_clear: "구름 없이 맑은 밤하늘로 별과 행성 관측에 훌륭합니다!",
    tip_stargazing_clouds: "구름이 많아 밤하늘 시야가 가려집니다.",
    tip_stargazing_day: "일몰 후 어두워질 때까지 기다려 주세요.",
    tip_dogwalking_ideal: "아스팔트가 시원하고 날씨가 좋습니다. 반려견과 함께 신나게 걸어보세요!",
    tip_dogwalking_hot: "아스팔트가 뜨거울 수 있습니다! 손으로 온도를 확인하고 잔디밭을 이용하세요.",
    tip_dogwalking_wet: "길이 젖어 흙탕물이 튈 수 있으니 발 닦을 수건을 준비하세요.",
    tip_swimming_ideal: "따뜻한 햇살과 기온. 방수 자외선 차단제를 꼭 챙기세요!",
    tip_swimming_cool: "야외 수영하기엔 조금 쌀쌀합니다. 온수풀을 추천합니다.",
    tip_swimming_storm: "낙뢰 위험이 있으니 즉시 물 밖으로 나오세요.",
    rain_risk_48h: "48시간 강수확률",
    uv_index: "자외선 지수",
    air_quality: "대기질",
    humidity: "습도",
    wind_speed: "풍속",
  },
  id: {
    title: "Perencana Aktivitas Luar Ruangan",
    subtitle: "Peringkat kondisi langsung untuk rutinitas dan rencana aktivitas Anda",
    tab_all: "Semua",
    tab_fitness: "Olahraga",
    tab_household: "Rumah Tangga",
    tab_leisure: "Santai",
    level_ideal: "Ideal",
    level_good: "Bagus",
    level_fair: "Cukup",
    level_avoid: "Hindari",
    running: "Lari & Bersepeda",
    laundry: "Jemur Pakaian",
    carwash: "Cuci Kendaraan",
    picnic: "Piknik & Makan Terbuka",
    stargazing: "Melihat Bintang",
    dogwalking: "Jalan Bersama Hewan",
    swimming: "Berenang & Pantai",
    tip_running_ideal: "Udara segar, angin tenang, dan jalan kering. Sangat pas untuk berolahraga!",
    tip_running_hot: "Suhu panas dan UV tinggi. Banyak minum air atau olahraga saat sore.",
    tip_running_rain: "Hujan atau jalanan licin. Lebih aman berolahraga di dalam ruangan.",
    tip_running_aqi: "Polusi udara meningkat. Disarankan olahraga ringan di dalam ruangan.",
    tip_laundry_ideal: "Kelembapan rendah dan semilir angin. Pakaian akan cepat kering!",
    tip_laundry_slow: "Kelembapan tinggi atau berawan. Pakaian lama kering.",
    tip_laundry_rain: "Prakiraan hujan hari ini. Sebaiknya jemur di dalam ruangan.",
    tip_carwash_ideal: "Nol risiko hujan dalam 48 jam ke depan. Mobil akan tetap bersih mengilap!",
    tip_carwash_rain: "Hujan diperkirakan segera turun. Tunda mencuci beberapa hari.",
    tip_carwash_fair: "Kemungkinan hujan rintik. Aman jika diparkir di tempat beratap.",
    tip_picnic_ideal: "Suhu nyaman dan langit cerah. Waktu yang sempurna untuk makan di luar!",
    tip_picnic_wind: "Angin kencang bisa meniup barang. Pilih tempat yang terlindung.",
    tip_picnic_rain: "Kondisi basah atau berisiko hujan. Pilih teras beratap.",
    tip_stargazing_clear: "Langit malam cerah tanpa awan. Pemandangan bintang sangat menakjubkan!",
    tip_stargazing_clouds: "Awan tebal menghalangi pandangan bintang.",
    tip_stargazing_day: "Tunggu hingga malam tiba setelah matahari terbenam.",
    tip_dogwalking_ideal: "Aspal dingin dan cuaca sejuk. Hewan peliharaan Anda akan sangat senang!",
    tip_dogwalking_hot: "Aspal mungkin sangat panas! Uji dengan tangan atau jalan di atas rumput.",
    tip_dogwalking_wet: "Jalanan basah dan berlumpur. Siapkan handuk di dekat pintu.",
    tip_swimming_ideal: "Matahari hangat dan cerah. Jangan lupa gunakan tabir surya anti air!",
    tip_swimming_cool: "Agak dingin atau berangin untuk berenang di luar.",
    tip_swimming_storm: "Bahaya petir. Segera keluar dari air.",
    rain_risk_48h: "Risiko Hujan 48 Jam",
    uv_index: "Indeks UV",
    air_quality: "Kualitas Udara",
    humidity: "Kelembapan",
    wind_speed: "Kecepatan Angin",
  },
  vi: {
    title: "Kế Hoạch Hoạt Động Ngoài Trời",
    subtitle: "Đánh giá thời tiết thực tế cho thói quen hàng ngày và kế hoạch vui chơi",
    tab_all: "Tất cả",
    tab_fitness: "Thể thao",
    tab_household: "Gia đình",
    tab_leisure: "Thư giãn",
    level_ideal: "Lý tưởng",
    level_good: "Tốt",
    level_fair: "Khá",
    level_avoid: "Nên tránh",
    running: "Chạy bộ & Đạp xe",
    laundry: "Phơi quần áo",
    carwash: "Rửa xe",
    picnic: "Dã ngoại & Ăn ngoài trời",
    stargazing: "Ngắm sao đêm",
    dogwalking: "Dắt thú cưng đi dạo",
    swimming: "Bơi lội & Bãi biển",
    tip_running_ideal: "Không khí mát mẻ, gió nhẹ và đường khô ráo. Rất thích hợp tập luyện!",
    tip_running_hot: "Nhiệt độ và chỉ số UV cao. Uống nhiều nước hoặc chạy lúc sáng sớm/chiều muộn.",
    tip_running_rain: "Đường trơn trượt và nguy cơ mưa. Nên tập luyện trong nhà.",
    tip_running_aqi: "Chỉ số ô nhiễm không khí tăng. Nên tập thể dục nhẹ nhàng trong phòng.",
    tip_laundry_ideal: "Độ ẩm thấp kèm gió thoáng. Quần áo sẽ khô rất nhanh và thơm tho!",
    tip_laundry_slow: "Độ ẩm cao hoặc nhiều mây. Quần áo sẽ lâu khô hơn bình thường.",
    tip_laundry_rain: "Dự báo có mưa hôm nay. Tốt nhất nên phơi đồ có mái che.",
    tip_carwash_ideal: "Không có mưa trong 48 giờ tới. Xe rửa xong sẽ giữ được độ sáng bóng lâu dài!",
    tip_carwash_rain: "Khả năng sắp có mưa rào. Nên hoãn rửa xe vài ngày.",
    tip_carwash_fair: "Khả năng có mưa phùn nhẹ. Rửa được nếu có mái che xe.",
    tip_picnic_ideal: "Thời tiết dễ chịu và trời quang. Rất thích hợp cho bữa tiệc ngoài trời!",
    tip_picnic_wind: "Gió giật mạnh có thể làm bay đồ đạc. Chọn góc khuất gió.",
    tip_picnic_rain: "Thời tiết ẩm ướt hoặc có mưa. Nên chọn quán có mái che.",
    tip_stargazing_clear: "Bầu trời đêm quang đãng không mây. Tầm nhìn ngắm sao cực kỳ rõ nét!",
    tip_stargazing_clouds: "Nhiều mây che khuất các vì sao.",
    tip_stargazing_day: "Vui lòng chờ sau khi mặt trời lặn hẳn để ngắm sao.",
    tip_dogwalking_ideal: "Mặt đường mát mẻ, khí hậu dễ chịu. Thú cưng sẽ rất thích chuyến đi dạo này!",
    tip_dogwalking_hot: "Mặt đường nhựa có thể rất nóng! Kiểm tra bằng tay hoặc đi trên cỏ.",
    tip_dogwalking_wet: "Đường ướt và bùn đất. Chuẩn bị khăn lau chân trước cửa.",
    tip_swimming_ideal: "Nắng ấm chan hòa. Đừng quên thoa kem chống nắng chống nước!",
    tip_swimming_cool: "Hơi se lạnh hoặc nhiều gió để bơi ngoài trời.",
    tip_swimming_storm: "Nguy cơ dông sét. Lập tức rời khỏi mặt nước.",
    rain_risk_48h: "Nguy cơ mưa 48h",
    uv_index: "Chỉ số UV",
    air_quality: "Chất lượng khí",
    humidity: "Độ ẩm",
    wind_speed: "Tốc độ gió",
  },
};

export const OutdoorActivityPlanner: React.FC<OutdoorActivityPlannerProps> = ({
  weather,
  unit,
}) => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2).toLowerCase();
  const dict: Record<PlannerKey, string> = { ...PLANNER_EN, ...(PLANNER_I18N[lang] ?? {}) };

  const [activeTab, setActiveTab] = useState<"all" | "fitness" | "household" | "leisure">("all");

  // Core weather metrics
  const cur: Partial<Weather["current"]> = weather?.current ?? {};
  const num = (v: unknown, fb: number) => (typeof v === "number" && !isNaN(v) ? v : fb);
  const now = {
    temp: num(cur.temp, 0),
    humidity: num(cur.humidity, 0),
    wind: num(cur.wind ?? cur.wind_speed, 0),
    uv: num(cur.uv ?? cur.uvIndex, 0),
    aqi: typeof cur.aqi === "number" ? cur.aqi : undefined,
    is_day: num(cur.is_day, 1),
    code: num(cur.code, 0),
    precipitation: num(cur.precipitation, 0),
  };
  const daily = Array.isArray(weather?.daily) ? weather.daily : [];
  const temp = now.temp; // in active unit
  const tempC = unit === "imperial" ? ((temp - 32) * 5) / 9 : temp;
  const humidity = now.humidity;
  const windKmh = unit === "imperial" ? now.wind * 1.60934 : now.wind;
  const uv = Math.round(now.uv * 10) / 10;
  const aqi = now.aqi ?? 30;
  const isDay = now.is_day === 1;

  // Rain probability today and over next 48 hours
  const rainToday = daily[0]?.precipProbMax ?? 0;
  const rainNext48h = Math.max(
    daily[0]?.precipProbMax ?? 0,
    daily[1]?.precipProbMax ?? 0
  );
  const isStormCode = [95, 96, 99].includes(now.code);
  const isRainingCode = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(now.code);

  const activities: ActivityScore[] = useMemo(() => {
    const list: ActivityScore[] = [];

    // 1. Running & Cycling
    let runLevel: ActivityLevel = "ideal";
    let runScore = 95;
    let runTip = dict.tip_running_ideal;

    if (isStormCode || isRainingCode || rainToday > 70) {
      runLevel = "avoid";
      runScore = 20;
      runTip = dict.tip_running_rain;
    } else if (aqi > 150) {
      runLevel = "avoid";
      runScore = 30;
      runTip = dict.tip_running_aqi;
    } else if (tempC > 34 || uv > 9) {
      runLevel = "fair";
      runScore = 55;
      runTip = dict.tip_running_hot;
    } else if (tempC > 29 || uv > 6 || aqi > 100 || rainToday > 35) {
      runLevel = "good";
      runScore = 75;
      runTip = dict.tip_running_hot;
    }

    list.push({
      id: "running",
      category: "fitness",
      icon: "🏃",
      name: dict.running,
      level: runLevel,
      score: runScore,
      summary: runTip,
      metrics: [
        { label: dict.uv_index, value: `${uv}`, positive: uv < 6 },
        { label: dict.air_quality, value: `AQI ${aqi}`, positive: aqi < 100 },
        { label: dict.wind_speed, value: `${Math.round(now.wind)} ${unit === "imperial" ? "mph" : "km/h"}`, positive: windKmh < 30 },
      ],
    });

    // 2. Laundry Drying
    let laundryLevel: ActivityLevel = "ideal";
    let laundryScore = 95;
    let laundryTip = dict.tip_laundry_ideal;

    if (isRainingCode || isStormCode || rainToday > 50) {
      laundryLevel = "avoid";
      laundryScore = 15;
      laundryTip = dict.tip_laundry_rain;
    } else if (humidity > 78 || rainToday > 30) {
      laundryLevel = "fair";
      laundryScore = 50;
      laundryTip = dict.tip_laundry_slow;
    } else if (humidity > 65) {
      laundryLevel = "good";
      laundryScore = 78;
      laundryTip = dict.tip_laundry_slow;
    }

    list.push({
      id: "laundry",
      category: "household",
      icon: "🧺",
      name: dict.laundry,
      level: laundryLevel,
      score: laundryScore,
      summary: laundryTip,
      metrics: [
        { label: dict.humidity, value: `${humidity}%`, positive: humidity < 65 },
        { label: dict.rain_risk_48h, value: `${rainToday}%`, positive: rainToday < 30 },
      ],
    });

    // 3. Car Wash
    let carLevel: ActivityLevel = "ideal";
    let carScore = 95;
    let carTip = dict.tip_carwash_ideal;

    if (rainNext48h >= 60 || isStormCode || isRainingCode) {
      carLevel = "avoid";
      carScore = 20;
      carTip = dict.tip_carwash_rain;
    } else if (rainNext48h >= 35) {
      carLevel = "fair";
      carScore = 55;
      carTip = dict.tip_carwash_fair;
    } else if (rainNext48h >= 20) {
      carLevel = "good";
      carScore = 80;
      carTip = dict.tip_carwash_fair;
    }

    list.push({
      id: "carwash",
      category: "household",
      icon: "🚗",
      name: dict.carwash,
      level: carLevel,
      score: carScore,
      summary: carTip,
      metrics: [
        { label: dict.rain_risk_48h, value: `${rainNext48h}%`, positive: rainNext48h < 30 },
      ],
    });

    // 4. Picnic & Outdoor Dining
    let picLevel: ActivityLevel = "ideal";
    let picScore = 90;
    let picTip = dict.tip_picnic_ideal;

    if (isStormCode || isRainingCode || rainToday > 50) {
      picLevel = "avoid";
      picScore = 25;
      picTip = dict.tip_picnic_rain;
    } else if (windKmh > 35) {
      picLevel = "fair";
      picScore = 55;
      picTip = dict.tip_picnic_wind;
    } else if (tempC > 33 || tempC < 14 || rainToday > 25) {
      picLevel = "good";
      picScore = 75;
      picTip = dict.tip_picnic_ideal;
    }

    list.push({
      id: "picnic",
      category: "leisure",
      icon: "🥪",
      name: dict.picnic,
      level: picLevel,
      score: picScore,
      summary: picTip,
      metrics: [
        { label: dict.wind_speed, value: `${Math.round(now.wind)} ${unit === "imperial" ? "mph" : "km/h"}`, positive: windKmh < 25 },
        { label: dict.rain_risk_48h, value: `${rainToday}%`, positive: rainToday < 25 },
      ],
    });

    // 5. Stargazing
    let starLevel: ActivityLevel = "ideal";
    let starScore = 90;
    let starTip = dict.tip_stargazing_clear;

    if (isDay) {
      starLevel = "fair";
      starScore = 50;
      starTip = dict.tip_stargazing_day;
    } else if (isRainingCode || isStormCode || [2, 3, 45, 48].includes(now.code)) {
      starLevel = "avoid";
      starScore = 20;
      starTip = dict.tip_stargazing_clouds;
    } else if (now.code === 1) {
      starLevel = "good";
      starScore = 80;
      starTip = dict.tip_stargazing_clear;
    }

    list.push({
      id: "stargazing",
      category: "leisure",
      icon: "✨",
      name: dict.stargazing,
      level: starLevel,
      score: starScore,
      summary: starTip,
      metrics: [
        { label: "Night Sky", value: isDay ? "Daytime" : "Night", positive: !isDay },
        { label: "Clouds", value: now.code === 0 ? "Clear" : "Cloudy", positive: now.code === 0 },
      ],
    });

    // 6. Dog Walking
    let dogLevel: ActivityLevel = "ideal";
    let dogScore = 92;
    let dogTip = dict.tip_dogwalking_ideal;

    if (isStormCode || (isRainingCode && now.precipitation > 2)) {
      dogLevel = "avoid";
      dogScore = 30;
      dogTip = dict.tip_dogwalking_wet;
    } else if (tempC > 32) {
      dogLevel = "fair";
      dogScore = 55;
      dogTip = dict.tip_dogwalking_hot;
    } else if (isRainingCode || tempC > 28) {
      dogLevel = "good";
      dogScore = 78;
      dogTip = isRainingCode ? dict.tip_dogwalking_wet : dict.tip_dogwalking_hot;
    }

    list.push({
      id: "dogwalking",
      category: "leisure",
      icon: "🐕",
      name: dict.dogwalking,
      level: dogLevel,
      score: dogScore,
      summary: dogTip,
      metrics: [
        { label: "Ground Heat", value: tempC > 30 ? "Warm" : "Safe", positive: tempC <= 30 },
        { label: dict.air_quality, value: `AQI ${aqi}`, positive: aqi < 100 },
      ],
    });

    // 7. Swimming & Beach
    let swimLevel: ActivityLevel = "ideal";
    let swimScore = 88;
    let swimTip = dict.tip_swimming_ideal;

    if (isStormCode) {
      swimLevel = "avoid";
      swimScore = 10;
      swimTip = dict.tip_swimming_storm;
    } else if (tempC < 21) {
      swimLevel = "fair";
      swimScore = 50;
      swimTip = dict.tip_swimming_cool;
    } else if (isRainingCode || tempC < 25) {
      swimLevel = "good";
      swimScore = 75;
      swimTip = dict.tip_swimming_cool;
    }

    list.push({
      id: "swimming",
      category: "fitness",
      icon: "🏊",
      name: dict.swimming,
      level: swimLevel,
      score: swimScore,
      summary: swimTip,
      metrics: [
        { label: dict.uv_index, value: `${uv}`, positive: uv >= 4 },
        { label: dict.wind_speed, value: `${Math.round(now.wind)} ${unit === "imperial" ? "mph" : "km/h"}`, positive: windKmh < 30 },
      ],
    });

    return list;
  }, [now, tempC, humidity, windKmh, uv, aqi, isDay, rainToday, rainNext48h, isStormCode, isRainingCode, unit, dict]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return activities;
    return activities.filter((a) => a.category === activeTab);
  }, [activities, activeTab]);

  const getBadgeStyle = (level: ActivityLevel) => {
    switch (level) {
      case "ideal":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
          dot: "bg-emerald-500",
          text: dict.level_ideal,
        };
      case "good":
        return {
          bg: "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-400",
          dot: "bg-sky-500",
          text: dict.level_good,
        };
      case "fair":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
          dot: "bg-amber-500",
          text: dict.level_fair,
        };
      case "avoid":
      default:
        return {
          bg: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400",
          dot: "bg-rose-500",
          text: dict.level_avoid,
        };
    }
  };

  return (
    <section className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs text-card-foreground space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏃</span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dict.title}
            </h3>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              {dict.subtitle}
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="inline-flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 text-xs self-start sm:self-auto">
          {(["all", "fitness", "household", "leisure"] as const).map((tab) => {
            const labelKey = `tab_${tab}` as keyof typeof dict;
            const label = dict[labelKey] || tab;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  active
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const badge = getBadgeStyle(item.level);

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-background/60 border border-border/60 hover:border-border transition flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl p-1.5 rounded-lg bg-muted/40 border border-border/40">
                      {item.icon}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {item.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.text}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {/* Metrics Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40 text-[11px]">
                {item.metrics.map((m, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded-md font-medium border ${
                      m.positive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border/50"
                    }`}
                  >
                    <span className="opacity-70">{m.label}:</span>{" "}
                    <span className="font-semibold">{m.value}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
