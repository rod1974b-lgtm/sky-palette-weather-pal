// src/components/WeatherPostcardModal.tsx
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Weather, WeatherUnit } from "@/lib/weather";
import { getActiveMascot } from "@/lib/mascots";

interface WeatherPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: Weather | null;
  unit: WeatherUnit;
  backgroundUrl: string;
}

type PostcardStyle = "vintage" | "polaroid" | "minimal";

interface PostcardI18n {
  title: string;
  subtitle: string;
  styleLabel: string;
  styles: {
    vintage: string;
    polaroid: string;
    minimal: string;
  };
  messageLabel: string;
  defaultGreetings: string;
  senderPlaceholder: string;
  shareBtn: string;
  downloadBtn: string;
  copyBtn: string;
  copied: string;
  generating: string;
  airMail: string;
  postmark: string;
  toLabel: string;
  locationLabel: string;
  weatherLabel: string;
  dispatchedVia: string;
  says: string;
  shareTitle: string;
  close: string;
}

const POSTCARD_I18N: Record<string, PostcardI18n> = {
  en: {
    title: "Weather Postcard",
    subtitle: "Share a personalized watercolor keepsake from your city",
    styleLabel: "Postcard Style",
    styles: { vintage: "Vintage Mail", polaroid: "Polaroid Snap", minimal: "Minimalist" },
    messageLabel: "Personal Greeting",
    defaultGreetings: "Sending warm greetings from under the open skies!",
    senderPlaceholder: "Your Name (Optional)",
    shareBtn: "Share Postcard",
    downloadBtn: "Download Image",
    copyBtn: "Copy Postcard Link",
    copied: "Copied to clipboard!",
    generating: "Generating keepsake...",
    airMail: "PAR AVION • AIR MAIL",
    postmark: "OFFICIAL WEATHER PAL POST",
    toLabel: "TO: Anyone who loves",
    locationLabel: "LOCATION:",
    weatherLabel: "WEATHER:",
    dispatchedVia: "DISPATCHED VIA: My Weather Pal ⛅",
    says: "says",
    shareTitle: "Weather Postcard",
    close: "Close",
  },
  th: {
    title: "โปสการ์ดสภาพอากาศ",
    subtitle: "ส่งต่อโปสการ์ดภาพวาดสีน้ำพร้อมสภาพอากาศและมาสคอตน่ารัก",
    styleLabel: "สไตล์โปสการ์ด",
    styles: { vintage: "จดหมายวินเทจ", polaroid: "โพลารอยด์", minimal: "มินิมอล" },
    messageLabel: "ข้อความทักทาย",
    defaultGreetings: "ส่งความคิดถึงจากฟากฟ้านี้ ขอให้มีวันที่สดใสและอบอุ่นใจเสมอ!",
    senderPlaceholder: "ชื่อของคุณ (ไม่บังคับ)",
    shareBtn: "แชร์โปสการ์ด",
    downloadBtn: "ดาวน์โหลดภาพ",
    copyBtn: "คัดลอกลิงก์",
    copied: "คัดลอกลงคลิปบอร์ดแล้ว!",
    generating: "กำลังวาดโปสการ์ด...",
    airMail: "PAR AVION • ไปรษณียากาศ",
    postmark: "ตราประทับสภาพอากาศทางการ",
    toLabel: "ถึง: ผู้ที่รักและคิดถึง",
    locationLabel: "สถานที่:",
    weatherLabel: "สภาพอากาศ:",
    dispatchedVia: "ส่งผ่าน: My Weather Pal ⛅",
    says: "บอกว่า",
    shareTitle: "โปสการ์ดสภาพอากาศ",
    close: "ปิด",
  },
  es: {
    title: "Postal del Clima",
    subtitle: "Comparte un recuerdo en acuarela personalizado de tu ciudad",
    styleLabel: "Estilo de postal",
    styles: { vintage: "Vintage", polaroid: "Polaroid", minimal: "Minimalista" },
    messageLabel: "Mensaje personal",
    defaultGreetings: "¡Te envío un cálido saludo bajo el cielo abierto!",
    senderPlaceholder: "Tu nombre (opcional)",
    shareBtn: "Compartir postal",
    downloadBtn: "Descargar imagen",
    copyBtn: "Copiar enlace",
    copied: "¡Copiado al portapapeles!",
    generating: "Generando postal...",
    airMail: "PAR AVION • CORREO AÉREO",
    postmark: "SERVICIO POSTAL OFICIAL DEL CLIMA",
    toLabel: "PARA: Quien ame",
    locationLabel: "UBICACIÓN:",
    weatherLabel: "CLIMA:",
    dispatchedVia: "ENVIADO VÍA: My Weather Pal ⛅",
    says: "dice",
    shareTitle: "Postal del Clima",
    close: "Cerrar",
  },
  ja: {
    title: "お天気ポストカード",
    subtitle: "水彩画の街並みと天気を添えた記念ポストカードをお届け",
    styleLabel: "ポストカードスタイル",
    styles: { vintage: "ヴィンテージ", polaroid: "ポラロイド", minimal: "ミニマル" },
    messageLabel: "メッセージ",
    defaultGreetings: "澄みわたる空の下から、あたたかいご挨拶をお届けします！",
    senderPlaceholder: "お名前（省略可）",
    shareBtn: "ポストカードを共有",
    downloadBtn: "画像をダウンロード",
    copyBtn: "リンクをコピー",
    copied: "クリップボードにコピーしました！",
    generating: "カードを生成中...",
    airMail: "航空郵便 • AIR MAIL",
    postmark: "WEATHER PAL 公式消印",
    toLabel: "宛先：大好きな街へ",
    locationLabel: "現在地：",
    weatherLabel: "お天気：",
    dispatchedVia: "配信元：My Weather Pal ⛅",
    says: "より：",
    shareTitle: "お天気ポストカード",
    close: "閉じる",
  },
  zh: {
    title: "天气明信片",
    subtitle: "分享属于你城市的专属水彩天气明信片",
    styleLabel: "明信片风格",
    styles: { vintage: "复古信札", polaroid: "宝丽来", minimal: "极简风" },
    messageLabel: "个性寄语",
    defaultGreetings: "从蔚蓝天空下为你寄来温暖问候，愿每一天都晴朗明媚！",
    senderPlaceholder: "你的姓名（选填）",
    shareBtn: "分享明信片",
    downloadBtn: "下载图片",
    copyBtn: "复制链接",
    copied: "已复制到剪贴板！",
    generating: "正在绘制明信片...",
    airMail: "航空信件 • AIR MAIL",
    postmark: "官方天气邮局纪念戳",
    toLabel: "致：每一个深爱",
    locationLabel: "位置：",
    weatherLabel: "天气：",
    dispatchedVia: "寄发自：My Weather Pal ⛅",
    says: "说：",
    shareTitle: "天气明信片",
    close: "关闭",
  },
  hi: {
    title: "मौसम पोस्टकार्ड",
    subtitle: "अपने शहर से एक सुंदर वॉटरकलर मौसम पोस्टकार्ड साझा करें",
    styleLabel: "पोस्टकार्ड शैली",
    styles: { vintage: "विंटेज मेल", polaroid: "पोलेरॉइड", minimal: "न्यूनतम" },
    messageLabel: "व्यक्तिगत संदेश",
    defaultGreetings: "खुले आसमान के नीचे से आपके लिए प्यार भरा पैगाम!",
    senderPlaceholder: "आपका नाम (वैकल्पिक)",
    shareBtn: "पोस्टकार्ड साझा करें",
    downloadBtn: "चित्र डाउनलोड करें",
    copyBtn: "लिंक कॉपी करें",
    copied: "क्लिपबोर्ड पर कॉपी किया गया!",
    generating: "पोस्टकार्ड तैयार हो रहा है...",
    airMail: "हवाई डाक • AIR MAIL",
    postmark: "आधिकारिक मौसम डाक टिकट",
    toLabel: "सेवा में: जिन्हें पसंद है",
    locationLabel: "स्थान:",
    weatherLabel: "मौसम:",
    dispatchedVia: "प्रेषक: My Weather Pal ⛅",
    says: "कहते हैं",
    shareTitle: "मौसम पोस्टकार्ड",
    close: "बंद करें",
  },
  fr: {
    title: "Carte Postale Météo",
    subtitle: "Partagez un souvenir aquarelle personnalisé de votre ville",
    styleLabel: "Style de carte",
    styles: { vintage: "Vintage", polaroid: "Pola", minimal: "Minimaliste" },
    messageLabel: "Message personnel",
    defaultGreetings: "Un doux bonjour sous les cieux chaleureux !",
    senderPlaceholder: "Votre nom (optionnel)",
    shareBtn: "Partager la carte",
    downloadBtn: "Télécharger l'image",
    copyBtn: "Copier le lien",
    copied: "Copié dans le presse-papiers !",
    generating: "Création de la carte...",
    airMail: "PAR AVION • POSTE AÉRIENNE",
    postmark: "POSTE MÉTÉO OFFICIELLE",
    toLabel: "POUR : Ceux qui aiment",
    locationLabel: "LIEU :",
    weatherLabel: "MÉTÉO :",
    dispatchedVia: "EXPÉDIÉ VIA : My Weather Pal ⛅",
    says: "dit",
    shareTitle: "Carte Postale Météo",
    close: "Fermer",
  },
  de: {
    title: "Wetter-Postkarte",
    subtitle: "Teile eine persönliche Aquarell-Wetterkarte deiner Stadt",
    styleLabel: "Postkarten-Stil",
    styles: { vintage: "Vintage", polaroid: "Polaroid", minimal: "Minimalistisch" },
    messageLabel: "Persönlicher Gruß",
    defaultGreetings: "Herzliche Grüße unter freiem Himmel!",
    senderPlaceholder: "Dein Name (optional)",
    shareBtn: "Postkarte teilen",
    downloadBtn: "Bild herunterladen",
    copyBtn: "Link kopieren",
    copied: "In die Zwischenablage kopiert!",
    generating: "Postkarte wird erstellt...",
    airMail: "LUFTPOST • AIR MAIL",
    postmark: "OFFIZIELLE WETTER-POST",
    toLabel: "AN: Alle, die lieben:",
    locationLabel: "STANDORT:",
    weatherLabel: "WETTER:",
    dispatchedVia: "VERSENDET ÜBER: My Weather Pal ⛅",
    says: "sagt",
    shareTitle: "Wetter-Postkarte",
    close: "Schließen",
  },
  pt: {
    title: "Cartão Postal do Clima",
    subtitle: "Compartilhe uma lembrança em aquarela personalizada da sua cidade",
    styleLabel: "Estilo do Cartão",
    styles: { vintage: "Vintage", polaroid: "Polaroide", minimal: "Minimalista" },
    messageLabel: "Mensagem pessoal",
    defaultGreetings: "Enviando um abraço caloroso sob o céu aberto!",
    senderPlaceholder: "Seu nome (opcional)",
    shareBtn: "Compartilhar postal",
    downloadBtn: "Baixar imagem",
    copyBtn: "Copiar link",
    copied: "Copiado para a área de transferência!",
    generating: "Gerando cartão...",
    airMail: "POR AVIÃO • CORREIO AÉREO",
    postmark: "SERVIÇO POSTAL DO CLIMA",
    toLabel: "PARA: Quem ama",
    locationLabel: "LOCALIZAÇÃO:",
    weatherLabel: "CLIMA:",
    dispatchedVia: "ENVIADO VIA: My Weather Pal ⛅",
    says: "diz",
    shareTitle: "Cartão Postal do Clima",
    close: "Fechar",
  },
  ru: {
    title: "Погодная открытка",
    subtitle: "Поделитесь акварельной открыткой с погодой вашего города",
    styleLabel: "Стиль открытки",
    styles: { vintage: "Винтаж", polaroid: "Полароид", minimal: "Минимализм" },
    messageLabel: "Личное пожелание",
    defaultGreetings: "Теплый привет из-под ясного неба!",
    senderPlaceholder: "Ваше имя (необязательно)",
    shareBtn: "Поделиться открыткой",
    downloadBtn: "Скачать картинку",
    copyBtn: "Скопировать ссылку",
    copied: "Скопировано в буфер обмена!",
    generating: "Создаем открытку...",
    airMail: "АВИАПОЧТА • AIR MAIL",
    postmark: "ОФИЦИАЛЬНАЯ ПОГОДНАЯ ПОЧТА",
    toLabel: "ДЛЯ: Тех, кто любит",
    locationLabel: "МЕСТОПОЛОЖЕНИЕ:",
    weatherLabel: "ПОГОДА:",
    dispatchedVia: "ОТПРАВЛЕНО ЧЕРЕЗ: My Weather Pal ⛅",
    says: "говорит",
    shareTitle: "Погодная открытка",
    close: "Закрыть",
  },
  ar: {
    title: "بطاقة بريدية للطقس",
    subtitle: "شارك بطاقة بريدية مرسومة بألوان مائية تعبر عن طقس مدينتك",
    styleLabel: "نمط البطاقة",
    styles: { vintage: "بريد كلاسيكي", polaroid: "بولارويد", minimal: "بسيط" },
    messageLabel: "تحية شخصية",
    defaultGreetings: "أجمل التحيات من تحت هذه السماء الصافية!",
    senderPlaceholder: "اسمك (اختياري)",
    shareBtn: "مشاركة البطاقة",
    downloadBtn: "تحميل الصورة",
    copyBtn: "نسخ الرابط",
    copied: "تم النسخ إلى الحافظة!",
    generating: "جارٍ إنشاء البطاقة...",
    airMail: "بالبريد الجوي • AIR MAIL",
    postmark: "الختم البريدي الرسمي للطقس",
    toLabel: "إلى: كل من يحب",
    locationLabel: "الموقع:",
    weatherLabel: "الطقس:",
    dispatchedVia: "أُرسلت عبر: My Weather Pal ⛅",
    says: "يقول",
    shareTitle: "بطاقة بريدية للطقس",
    close: "إغلاق",
  },
  ko: {
    title: "날씨 엽서",
    subtitle: "수채화 풍경과 현재 날씨를 담은 특별한 기념 엽서를 전하세요",
    styleLabel: "엽서 스타일",
    styles: { vintage: "빈티지 우편", polaroid: "폴라로이드", minimal: "미니멀" },
    messageLabel: "메시지 입력",
    defaultGreetings: "맑은 하늘 아래에서 따뜻한 안부를 전합니다!",
    senderPlaceholder: "보내는 이 이름 (선택사항)",
    shareBtn: "엽서 공유하기",
    downloadBtn: "이미지 다운로드",
    copyBtn: "링크 복사",
    copied: "클립보드에 복사되었습니다!",
    generating: "엽서 제작 중...",
    airMail: "항공우편 • AIR MAIL",
    postmark: "WEATHER PAL 공식 소인",
    toLabel: "받는 이:",
    locationLabel: "위치:",
    weatherLabel: "날씨:",
    dispatchedVia: "발송: My Weather Pal ⛅",
    says: "의 한마디:",
    shareTitle: "날씨 엽서",
    close: "닫기",
  },
  id: {
    title: "Kartu Pos Cuaca",
    subtitle: "Bagikan kartu pos cat air personal cuaca kota Anda",
    styleLabel: "Gaya Kartu Pos",
    styles: { vintage: "Klasik Surat", polaroid: "Polaroid", minimal: "Minimalis" },
    messageLabel: "Pesan Pribadi",
    defaultGreetings: "Salam hangat dari bawah langit yang cerah!",
    senderPlaceholder: "Nama Anda (Opsional)",
    shareBtn: "Bagikan Kartu Pos",
    downloadBtn: "Unduh Gambar",
    copyBtn: "Salin Tautan",
    copied: "Tersalin ke papan klip!",
    generating: "Membuat kartu pos...",
    airMail: "SURAT UDARA • AIR MAIL",
    postmark: "KANTOR POS CUACA RESMI",
    toLabel: "KEPADA: Siapa pun yang mencintai",
    locationLabel: "LOKASI:",
    weatherLabel: "CUACA:",
    dispatchedVia: "DIKIRIM MELALUI: My Weather Pal ⛅",
    says: "berkata",
    shareTitle: "Kartu Pos Cuaca",
    close: "Tutup",
  },
  vi: {
    title: "Bưu Thiếp Thời Tiết",
    subtitle: "Gửi tặng bưu thiếp màu nước lưu niệm kèm thời tiết thành phố của bạn",
    styleLabel: "Kiểu bưu thiếp",
    styles: { vintage: "Cổ điển", polaroid: "Polaroid", minimal: "Tối giản" },
    messageLabel: "Lời nhắn gửi",
    defaultGreetings: "Gửi lời chào ấm áp từ dưới bầu trời rộng mở!",
    senderPlaceholder: "Tên của bạn (Tùy chọn)",
    shareBtn: "Chia sẻ bưu thiếp",
    downloadBtn: "Tải ảnh về",
    copyBtn: "Sao chép liên kết",
    copied: "Đã sao chép vào bộ nhớ tạm!",
    generating: "Đang tạo bưu thiếp...",
    airMail: "THƯ MÁY BAY • AIR MAIL",
    postmark: "DẤU BƯU ĐIỆN THỜI TIẾT",
    toLabel: "GỬI TỚI: Bất cứ ai yêu mến",
    locationLabel: "ĐỊA ĐIỂM:",
    weatherLabel: "THỜI TIẾT:",
    dispatchedVia: "GỬI QUA: My Weather Pal ⛅",
    says: "nhắn rằng",
    shareTitle: "Bưu Thiếp Thời Tiết",
    close: "Đóng",
  },
};

export const WeatherPostcardModal: React.FC<WeatherPostcardModalProps> = ({
  isOpen,
  onClose,
  weather,
  unit,
  backgroundUrl,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().split("-")[0] || "en";
  const texts = (POSTCARD_I18N[lang] ?? POSTCARD_I18N["en"]) as (typeof POSTCARD_I18N)[string];

  const [style, setStyle] = useState<PostcardStyle>("vintage");
  const [greeting, setGreeting] = useState<string>(texts.defaultGreetings);
  const [senderName, setSenderName] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Active mascot companion for stamp/sticker
  const mascot = getActiveMascot();

  // Update default greeting when language changes
  useEffect(() => {
    setGreeting(texts.defaultGreetings);
  }, [lang, texts.defaultGreetings]);

  if (!isOpen || !weather?.current) return null;

  const cityName = weather.place.name;
  const countryName = weather.place.country || "";
  const tempVal = Math.round(weather.current.temp);
  const tempUnitStr = unit === "imperial" ? "°F" : "°C";
  const humidity = weather.current.humidity ?? 65;
  const todayDate = new Date().toLocaleDateString(i18n.language || undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Render high-resolution canvas postcard for sharing/download
  const renderPostcardCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D canvas context");

    // 1. Postcard Background Paper Texture (Warm parchment)
    ctx.fillStyle = style === "vintage" ? "#FAF7F0" : style === "polaroid" ? "#FFFFFF" : "#F8FAFC";
    ctx.fillRect(0, 0, 1200, 800);

    // Subtle Postal border
    ctx.strokeStyle = style === "vintage" ? "#E2D9C8" : "#E2E8F0";
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 1160, 760);

    // Air Mail vintage border ribbon (Top-right & bottom-left dashes)
    if (style === "vintage") {
      ctx.save();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#38BDF8";
      ctx.setLineDash([20, 15]);
      ctx.strokeRect(30, 30, 1140, 740);
      ctx.restore();
    }

    // 2. Artwork Frame (Left or Hero section)
    const artWidth = style === "polaroid" ? 520 : 540;
    const artHeight = style === "polaroid" ? 540 : 660;
    const artX = 50;
    const artY = style === "polaroid" ? 60 : 70;

    // Load Wallpaper Image with fallback to watercolor gradient
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = backgroundUrl;
      });
      ctx.drawImage(img, artX, artY, artWidth, artHeight);
    } catch {
      // Fallback watercolor gradient
      const grad = ctx.createLinearGradient(artX, artY, artX + artWidth, artY + artHeight);
      grad.addColorStop(0, "#BAE6FD");
      grad.addColorStop(0.5, "#E0E7FF");
      grad.addColorStop(1, "#FED7AA");
      ctx.fillStyle = grad;
      ctx.fillRect(artX, artY, artWidth, artHeight);
    }

    // Artwork Border & Shadow
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 8;
    ctx.strokeRect(artX, artY, artWidth, artHeight);

    // City tag overlay on art
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.roundRect(artX + 24, artY + artHeight - 74, 300, 50, 12);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${cityName}`, artX + 40, artY + artHeight - 40);

    // 3. Right Side: Postal Stamp & Postmark
    const rightX = 640;

    // Air Mail Ribbon Header
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 15px monospace";
    ctx.letterSpacing = "3px";
    ctx.fillText(texts.airMail, rightX, 85);

    // Divider Line down the middle
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(615, 80);
    ctx.lineTo(615, 720);
    ctx.stroke();
    ctx.setLineDash([]);

    // Postage Stamp (Top Right)
    const stampX = 1010;
    const stampY = 70;
    const stampW = 130;
    const stampH = 150;

    // Stamp Serrated Edge / Background
    ctx.fillStyle = "#FFFBEB";
    ctx.fillRect(stampX, stampY, stampW, stampH);
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = 3;
    ctx.strokeRect(stampX, stampY, stampW, stampH);

    // Stamp Content: Temp & Sun
    ctx.fillStyle = "#B45309";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.fillText(`${tempVal}${tempUnitStr}`, stampX + 20, stampY + 50);

    ctx.fillStyle = "#475569";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(cityName.slice(0, 10), stampX + 16, stampY + 80);
    ctx.fillText(`💧 ${humidity}%`, stampX + 16, stampY + 110);

    // Postal Rubber Postmark (Round Cancellation Stamp)
    ctx.save();
    ctx.strokeStyle = "rgba(71, 85, 105, 0.65)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(stampX - 50, stampY + 70, 55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "rgba(71, 85, 105, 0.8)";
    ctx.fillText(cityName.toUpperCase().slice(0, 14), stampX - 95, stampY + 60);
    ctx.fillText(todayDate, stampX - 90, stampY + 80);

    // Postmark wavy cancellation lines
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const lineY = stampY + 45 + i * 20;
      ctx.moveTo(stampX - 5, lineY);
      ctx.bezierCurveTo(stampX + 30, lineY - 6, stampX + 70, lineY + 6, stampX + 110, lineY);
    }
    ctx.stroke();
    ctx.restore();

    // 4. Personalized Handwritten Message
    ctx.fillStyle = "#1E293B";
    ctx.font = "italic 22px Georgia, serif";
    const maxTextWidth = 490;
    const words = (greeting || texts.defaultGreetings).split(" ");
    let line = "";
    let lineY = 270;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(line, rightX, lineY);
        line = words[n] + " ";
        lineY += 34;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, rightX, lineY);

    if (senderName.trim()) {
      ctx.font = "bold italic 20px Georgia, serif";
      ctx.fillText(`— ${senderName}`, rightX + 240, lineY + 45);
    }

    // 5. Postal Address Lines
    const addressStartY = 480;
    ctx.strokeStyle = "#94A3B8";
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 4; i++) {
      const linePos = addressStartY + i * 44;
      ctx.beginPath();
      ctx.moveTo(rightX, linePos);
      ctx.lineTo(1120, linePos);
      ctx.stroke();
    }

    ctx.fillStyle = "#64748B";
    ctx.font = "14px monospace";
    ctx.fillText(`${texts.toLabel} ${cityName}`, rightX + 10, addressStartY - 8);
    ctx.fillText(`${texts.locationLabel} ${cityName}, ${countryName}`, rightX + 10, addressStartY + 36);
    ctx.fillText(`${texts.weatherLabel} ${tempVal}${tempUnitStr} • ${todayDate}`, rightX + 10, addressStartY + 80);
    ctx.fillText(texts.dispatchedVia, rightX + 10, addressStartY + 124);

    // Mascot companion quote badge at bottom-right
    if (mascot) {
      ctx.fillStyle = "#F1F5F9";
      ctx.roundRect(rightX, 670, 480, 50, 12);
      ctx.fill();
      ctx.strokeStyle = "#CBD5E1";
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(`🐾 ${mascot.name} ${texts.says}: "${mascot.quote}"`, rightX + 16, 700);
    }

    return canvas;
  };

  // 1. Download Postcard Image (PNG)
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderPostcardCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `weather-postcard-${cityName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to export postcard:", e);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Native Share API (Mobile Web Share Sheet with Image attachment)
  const handleShare = async () => {
    try {
      setIsExporting(true);
      const canvas = await renderPostcardCanvas();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownload();
          return;
        }

        const file = new File(
          [blob],
          `weather-postcard-${cityName.toLowerCase().replace(/\s+/g, "-")}.png`,
          { type: "image/png" }
        );

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${cityName} ${texts.shareTitle} ⛅`,
              text: `${greeting} (${tempVal}${tempUnitStr} in ${cityName})`,
              files: [file],
            });
          } catch (err: unknown) {
            if ((err as { name?: string })?.name !== "AbortError") {
              handleDownload();
            }
          }
        } else if (navigator.share) {
          try {
            await navigator.share({
              title: `${cityName} ${texts.shareTitle} ⛅`,
              text: `${greeting} (${tempVal}${tempUnitStr} in ${cityName})\n${window.location.origin}`,
              url: window.location.href,
            });
          } catch {}
        } else {
          // Fallback to direct download
          handleDownload();
        }
        setIsExporting(false);
      }, "image/png");
    } catch (e) {
      console.error("Share failed:", e);
      setIsExporting(false);
    }
  };

  // 3. Copy Link
  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2400);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💌</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {texts.title}
              </h2>
              <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            aria-label={texts.close}
          >
            ✕
          </button>
        </div>

        {/* Content Body: Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Style Selector */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">
              {texts.styleLabel}:
            </span>
            <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/50">
              <button
                type="button"
                onClick={() => setStyle("vintage")}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  style === "vintage"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📜 {texts.styles.vintage}
              </button>
              <button
                type="button"
                onClick={() => setStyle("polaroid")}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  style === "polaroid"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📷 {texts.styles.polaroid}
              </button>
              <button
                type="button"
                onClick={() => setStyle("minimal")}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  style === "minimal"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✨ {texts.styles.minimal}
              </button>
            </div>
          </div>

          {/* Interactive Live Postcard Preview Card */}
          <div
            className={`relative rounded-2xl border p-4 sm:p-6 transition-all duration-300 shadow-sm overflow-hidden ${
              style === "vintage"
                ? "bg-[#FAF7F0] text-[#1E293B] border-[#E2D9C8]"
                : style === "polaroid"
                ? "bg-white text-slate-800 border-slate-200"
                : "bg-slate-50 text-slate-900 border-slate-200"
            }`}
          >
            {/* Air Mail Border Accent */}
            {style === "vintage" && (
              <div className="absolute top-2 right-4 text-[10px] font-mono tracking-widest text-sky-600 font-bold">
                {texts.airMail}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Artwork Side */}
              <div className="relative rounded-xl overflow-hidden shadow-md aspect-4/3 border-4 border-white">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 text-white">
                  <span className="text-base font-extrabold drop-shadow-sm">
                    {cityName}
                  </span>
                  <span className="text-xs opacity-90 block">
                    {countryName}
                  </span>
                </div>
              </div>

              {/* Postal Stamp & Message Side */}
              <div className="space-y-3 text-xs">
                {/* Stamp & Postmark Row */}
                <div className="flex items-start justify-between gap-2 border-b border-dashed border-slate-300 pb-3">
                  {/* Round Postmark */}
                  <div className="w-16 h-16 rounded-full border-2 border-slate-400 border-dashed flex flex-col items-center justify-center text-[9px] text-slate-600 font-mono text-center p-1 rotate-[-6deg]">
                    <span className="font-bold">{cityName.slice(0, 8).toUpperCase()}</span>
                    <span>{todayDate.slice(0, 6)}</span>
                  </div>

                  {/* Stamp */}
                  <div className="p-2 rounded-lg bg-amber-50 border-2 border-amber-500 text-amber-900 flex flex-col items-center text-center shadow-xs">
                    <span className="text-base font-black">
                      {tempVal}{tempUnitStr}
                    </span>
                    <span className="text-[9px] uppercase font-bold tracking-tight">
                      {cityName.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Greeting Note */}
                <div className="font-serif italic text-sm text-slate-700 leading-relaxed min-h-[48px]">
                  "{greeting}"
                </div>

                {/* Sender signature */}
                {senderName.trim() && (
                  <div className="text-right font-serif font-bold italic text-slate-800">
                    — {senderName}
                  </div>
                )}

                {/* Companion Footnote */}
                {mascot && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span>🐾</span>
                    <span className="truncate">
                      <strong>{mascot.name}:</strong> "{mascot.quote}"
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Greeting Input Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>✏️ {texts.messageLabel}</span>
              <span className="text-[10px] text-muted-foreground">
                {greeting.length}/120
              </span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-foreground"
              placeholder={texts.defaultGreetings}
              aria-label={texts.messageLabel}
            />

            <input
              type="text"
              maxLength={30}
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-muted/40 border border-border focus:outline-hidden focus:ring-2 focus:ring-primary text-foreground"
              placeholder={texts.senderPlaceholder}
              aria-label={texts.senderPlaceholder}
            />
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer flex items-center justify-center gap-1.5"
            aria-label={copyFeedback ? texts.copied : texts.copyBtn}
          >
            <span>🔗</span>
            <span>{copyFeedback ? texts.copied : texts.copyBtn}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              aria-label={isExporting ? texts.generating : texts.downloadBtn}
            >
              <span>📥</span>
              <span>{isExporting ? texts.generating : texts.downloadBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              aria-label={isExporting ? texts.generating : texts.shareBtn}
            >
              <span>💌</span>
              <span>{isExporting ? texts.generating : texts.shareBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPostcardModal;
