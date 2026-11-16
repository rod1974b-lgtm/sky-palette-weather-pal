// src/lib/mascots.ts
import { isThankYouBackgroundUnlocked } from "@/lib/monetization";
import type { Weather } from "@/lib/weather";

export interface Mascot {
  id: string;
  name: string;
  title: string;
  species: string;
  isAnimated: boolean;
  minTier: "free" | "small" | "medium" | "large" | "party";
  tierLabel: string;
  quote: string;
  avatarSvg: string;
}

export const MASCOTS: Mascot[] = [
  // 1. FREE BASELINE BUDDY 1: Frothy the Classic Mug
  {
    id: "frothy",
    name: "Frothy",
    title: "The Bubbly Root Beer Mug",
    species: "Root Beer Mug",
    isAnimated: false,
    minTier: "free",
    tierLabel: "Free Baseline",
    quote: "Stay chilled and cozy, rain or shine!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Glass Mug Base -->
        <rect x="25" y="32" width="45" height="48" rx="8" fill="#8B4513" stroke="#D97706" stroke-width="3"/>
        <!-- Amber Root Beer Liquid -->
        <rect x="28" y="38" width="39" height="38" rx="4" fill="#B45309"/>
        <!-- Sturdy Glass Handle -->
        <path d="M70 42h8a8 8 0 018 8v12a8 8 0 01-8 8h-8" stroke="#D97706" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Creamy Thick Foam Head -->
        <path d="M22 34c0-7 6-12 14-12 4 0 8 3 11 1 3-4 10-4 14 0 5 1 12 4 12 11H22z" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2.5"/>
        <!-- Cheerful Face -->
        <circle cx="41" cy="54" r="3" fill="#FFFBEB"/>
        <circle cx="55" cy="54" r="3" fill="#FFFBEB"/>
        <circle cx="36" cy="58" r="2.5" fill="#F87171" opacity="0.8"/>
        <circle cx="60" cy="58" r="2.5" fill="#F87171" opacity="0.8"/>
        <path d="M45 61c2 2.5 6 2.5 8 0" stroke="#FFFBEB" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Effervescent Rising Bubbles -->
        <circle cx="34" cy="20" r="3" fill="#FFFBEB"/>
        <circle cx="58" cy="18" r="2" fill="#FFFBEB"/>
        <circle cx="47" cy="14" r="1.5" fill="#FFFBEB"/>
      </svg>
    `,
  },

  // 1. FREE BASELINE BUDDY 2: Fizz the Soda Bubble
  {
    id: "fizz",
    name: "Fizz",
    title: "The Bouncy Soda Bubble",
    species: "Root Beer Bubble",
    isAnimated: false,
    minTier: "free",
    tierLabel: "Free Baseline",
    quote: "Bubbling with excitement for today's forecast!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Main Translucent Golden Bubble -->
        <circle cx="50" cy="50" r="30" fill="#F59E0B" fill-opacity="0.3" stroke="#D97706" stroke-width="3"/>
        <!-- Inner Amber Sheen -->
        <ellipse cx="42" cy="38" rx="8" ry="4" fill="#FEF3C7" fill-opacity="0.75" transform="rotate(-30 42 38)"/>
        <!-- Cute Eyes -->
        <circle cx="43" cy="51" r="3" fill="#78350F"/>
        <circle cx="57" cy="51" r="3" fill="#78350F"/>
        <!-- Rosy Blush -->
        <circle cx="37" cy="55" r="2.5" fill="#F43F5E" opacity="0.7"/>
        <circle cx="63" cy="55" r="2.5" fill="#F43F5E" opacity="0.7"/>
        <!-- Happy Open Smile -->
        <path d="M46 58c2 3 6 3 8 0" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
        <!-- Small companion micro-bubbles -->
        <circle cx="76" cy="32" r="5" fill="#FDE68A" stroke="#D97706" stroke-width="1.5"/>
        <circle cx="26" cy="68" r="4" fill="#FDE68A" stroke="#D97706" stroke-width="1.5"/>
        <circle cx="70" cy="65" r="3" fill="#FDE68A"/>
      </svg>
    `,
  },

  // 2. SMALL ROOT BEER TIER ($1): Scoop the Vanilla Float
  {
    id: "scoop",
    name: "Scoop",
    title: "The Vanilla Float",
    species: "Root Beer Float",
    isAnimated: false,
    minTier: "small",
    tierLabel: "Small Root Beer ($1)",
    quote: "Life is sweeter with an extra scoop and sunny skies!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Tall Sundae Glass -->
        <path d="M30 38 L35 78 A5 5 0 0 0 40 83 L60 83 A5 5 0 0 0 65 78 L70 38 Z" fill="#92400E" stroke="#D97706" stroke-width="3"/>
        <path d="M33 42 L37 77 L63 77 L67 42 Z" fill="#B45309"/>
        <!-- Glass Stem & Base -->
        <rect x="46" y="83" width="8" height="7" fill="#D97706"/>
        <ellipse cx="50" cy="91" rx="16" ry="3" fill="#D97706"/>
        <!-- Vanilla Ice Cream Scoop sitting in float -->
        <circle cx="50" cy="34" r="18" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2.5"/>
        <path d="M32 40c4 3 8 2 12 0s8-2 12 0 8 3 12 0" stroke="#FFFBEB" stroke-width="4" stroke-linecap="round"/>
        <!-- Retro Striped Straw -->
        <line x1="58" y1="36" x2="74" y2="12" stroke="#EF4444" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="62" y1="30" x2="70" y2="18" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Scoop's Cute Face -->
        <circle cx="43" cy="33" r="2.5" fill="#78350F"/>
        <circle cx="57" cy="33" r="2.5" fill="#78350F"/>
        <path d="M47 38c1.5 2 4.5 2 6 0" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
        <!-- Bright Red Maraschino Cherry on Top -->
        <circle cx="39" cy="18" r="5" fill="#DC2626"/>
        <path d="M40 14c2-5 6-7 10-6" stroke="#15803D" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
  },

  // 3. MEDIUM ROOT BEER TIER ($3): Chill Mug (Animated)
  {
    id: "chill",
    name: "Chill Mug",
    title: "The Frosty Mug",
    species: "Iced Root Beer",
    isAnimated: true,
    minTier: "medium",
    tierLabel: "Medium Root Beer ($3)",
    quote: "Ice cold and condensation-fresh!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-bounce">
        <!-- Frosted Heavy Dimple Mug -->
        <rect x="24" y="32" width="46" height="48" rx="8" fill="#78350F" stroke="#38BDF8" stroke-width="3"/>
        <rect x="27" y="36" width="40" height="40" rx="5" fill="#92400E"/>
        <!-- Handle -->
        <path d="M70 42h9a7 7 0 017 7v14a7 7 0 01-7 7h-9" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
        <!-- Ice Crystals Frost Effect -->
        <path d="M22 34c2-6 8-10 14-9 4 1 8-2 14-2 6 0 10 3 14 2 6-1 12 3 14 9z" fill="#E0F2FE" stroke="#BAE6FD" stroke-width="2"/>
        <!-- Floating Ice Cubes inside Mug -->
        <rect x="33" y="44" width="10" height="10" rx="2" fill="#BAE6FD" opacity="0.85" transform="rotate(12 33 44)"/>
        <rect x="52" y="42" width="11" height="11" rx="2" fill="#BAE6FD" opacity="0.85" transform="rotate(-15 52 42)"/>
        <!-- Cool Sunglasses -->
        <rect x="33" y="55" width="13" height="8" rx="2" fill="#0F172A"/>
        <rect x="51" y="55" width="13" height="8" rx="2" fill="#0F172A"/>
        <line x1="46" y1="58" x2="51" y2="58" stroke="#0F172A" stroke-width="2.5"/>
        <!-- Smug Smile -->
        <path d="M47 67c2 2 6 2 7 0" stroke="#FFFBEB" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
  },

  // 3. MEDIUM ROOT BEER TIER ($3): Cap the Vintage Soda Bottle
  {
    id: "cap",
    name: "Cap",
    title: "The Vintage Soda Bottle",
    species: "Root Beer Bottle",
    isAnimated: false,
    minTier: "medium",
    tierLabel: "Medium Root Beer ($3)",
    quote: "Pop the cap and let the good weather flow!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Bottle Neck & Body -->
        <path d="M42 22 L58 22 L58 34 L66 45 L66 82 A5 5 0 0 1 61 87 L39 87 A5 5 0 0 1 34 82 L34 45 L42 34 Z" fill="#78350F" stroke="#D97706" stroke-width="3"/>
        <rect x="37" y="48" width="26" height="34" rx="3" fill="#92400E"/>
        <!-- Vintage Oval Brand Label -->
        <ellipse cx="50" cy="62" rx="11" ry="8" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5"/>
        <text x="50" y="64" font-size="6" font-family="sans-serif" font-weight="bold" fill="#78350F" text-anchor="middle">R-BEER</text>
        <!-- Crimped Bottle Cap Hat tilted like a fedora -->
        <path d="M38 20 L62 20 L64 24 L36 24 Z" fill="#DC2626" stroke="#991B1B" stroke-width="2"/>
        <!-- Happy Face on Bottle Neck -->
        <circle cx="46" cy="38" r="2" fill="#FFFBEB"/>
        <circle cx="54" cy="38" r="2" fill="#FFFBEB"/>
        <path d="M48 41c1 1.5 3 1.5 4 0" stroke="#FFFBEB" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,
  },

  // 4. LARGE ROOT BEER TIER ($5): Barrel Bob the Aged Oak Keg
  {
    id: "barrel",
    name: "Barrel Bob",
    title: "The Aged Oak Keg",
    species: "Oak Barrel",
    isAnimated: false,
    minTier: "large",
    tierLabel: "Large Root Beer ($5)",
    quote: "Aged to perfection with wisdom for every storm.",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Wooden Oak Stave Body -->
        <path d="M30 26 C20 45, 20 65, 30 84 L70 84 C80 65, 80 45, 70 26 Z" fill="#78350F" stroke="#451A03" stroke-width="3"/>
        <!-- Steel Hoops -->
        <path d="M26 36 C42 38, 58 38, 74 36" stroke="#94A3B8" stroke-width="3.5" fill="none"/>
        <path d="M24 55 C42 57, 58 57, 76 55" stroke="#94A3B8" stroke-width="3.5" fill="none"/>
        <path d="M26 74 C42 76, 58 76, 74 74" stroke="#94A3B8" stroke-width="3.5" fill="none"/>
        <!-- Wise Friendly Face -->
        <circle cx="42" cy="46" r="3" fill="#FEF3C7"/>
        <circle cx="58" cy="46" r="3" fill="#FEF3C7"/>
        <!-- Bushy White Foam Mustache -->
        <path d="M36 53c4-3 10-1 14 2 4-3 10-5 14-2-2 4-6 5-14 3-8 2-12 1-14-3z" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"/>
        <!-- Brass Spigot Tap Nose -->
        <rect x="47" y="48" width="6" height="5" rx="1" fill="#F59E0B"/>
      </svg>
    `,
  },

  // 4. LARGE ROOT BEER TIER ($5): Sparkle Float (Animated)
  {
    id: "sparkle_float",
    name: "Sparkle Float",
    title: "The Double-Scoop Deluxe",
    species: "Deluxe Float",
    isAnimated: true,
    minTier: "large",
    tierLabel: "Large Root Beer ($5)",
    quote: "Two scoops, a bright red cherry, and pure fizzy joy!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-pulse">
        <!-- Elegant Parfait Glass -->
        <path d="M28 36 L36 78 A6 6 0 0 0 42 84 L58 84 A6 6 0 0 0 64 78 L72 36 Z" fill="#92400E" stroke="#F59E0B" stroke-width="3"/>
        <path d="M31 40 L38 78 L62 78 L69 40 Z" fill="#B45309"/>
        <!-- Bottom Scoop: Chocolate Root Beer Swirl -->
        <circle cx="44" cy="36" r="14" fill="#D97706" stroke="#92400E" stroke-width="2"/>
        <!-- Top Scoop: Creamy Vanilla Bean -->
        <circle cx="56" cy="26" r="14" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2"/>
        <!-- Waving Striped Straw -->
        <line x1="38" y1="36" x2="26" y2="12" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
        <!-- Glittering Sparkles -->
        <polygon points="76,18 78,24 84,26 78,28 76,34 74,28 68,26 74,24" fill="#FACC15"/>
        <polygon points="20,44 21,48 25,49 21,50 20,54 19,50 15,49 19,48" fill="#FACC15"/>
        <!-- Cute Face on Top Scoop -->
        <circle cx="53" cy="25" r="2" fill="#78350F"/>
        <circle cx="61" cy="25" r="2" fill="#78350F"/>
        <path d="M55 29c1 1.5 3 1.5 4 0" stroke="#78350F" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `,
  },

  // 5. PARTY PACK VIP TIER ($10): The Royal Amber Stein (Animated VIP Champion)
  {
    id: "amber_stein",
    name: "Royal Stein",
    title: "The VIP Golden Stein",
    species: "Royal Root Beer Stein",
    isAnimated: true,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Cheers to you! Thank you for supporting My Weather Pal forever!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-bounce">
        <!-- Heavy German-Style Ceramic & Gold Stein Body -->
        <rect x="25" y="32" width="46" height="50" rx="8" fill="#78350F" stroke="#F59E0B" stroke-width="3.5"/>
        <rect x="28" y="36" width="40" height="42" rx="5" fill="#92400E"/>
        <!-- Gold Handle -->
        <path d="M71 40h10a8 8 0 018 8v16a8 8 0 01-8 8h-10" stroke="#F59E0B" stroke-width="5" stroke-linecap="round"/>
        <!-- Royal Golden Crown Lid with Thumb Lever -->
        <path d="M24 32 L72 32 L66 22 L58 26 L48 18 L38 26 L30 22 Z" fill="#F59E0B" stroke="#B45309" stroke-width="2.5"/>
        <circle cx="48" cy="16" r="3" fill="#EF4444"/>
        <circle cx="34" cy="68" r="2" fill="#F59E0B"/>
        <circle cx="62" cy="68" r="2" fill="#F59E0B"/>
        <!-- Froth Cascading Down Front -->
        <path d="M22 34c4 4 10 2 16 0 6 3 14 3 20 0 6 4 14 0 16-2" stroke="#FFFBEB" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Winking VIP Face -->
        <path d="M38 52c2-2 5-2 7 0" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="56" cy="51" r="3" fill="#FEF3C7"/>
        <path d="M44 60c2 3 7 3 9 0" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Floating Golden Crown Star -->
        <polygon points="50,70 52,74 56,74 53,77 54,81 50,78 46,81 47,77 44,74 48,74" fill="#FACC15"/>
      </svg>
    `,
  },

  // 5. PARTY PACK VIP TIER ($10): Golden Sundae (Exclusive Crown Buddy)
  {
    id: "golden_sundae",
    name: "Golden Float",
    title: "The Crown Root Beer Sundae",
    species: "VIP Feast",
    isAnimated: false,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "A feast of vanilla cream, golden sparkles, and clear blue skies!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Crystal Chalice -->
        <path d="M26 34 L34 68 A8 8 0 0 0 42 74 L46 84 L38 86 L38 90 L62 90 L62 86 L54 84 L58 74 A8 8 0 0 0 66 68 L74 34 Z" fill="#92400E" stroke="#F59E0B" stroke-width="3"/>
        <path d="M30 38 L37 66 L63 66 L70 38 Z" fill="#B45309"/>
        <!-- Triple Swirl Foam Crown -->
        <ellipse cx="50" cy="34" rx="20" ry="12" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2.5"/>
        <ellipse cx="50" cy="24" rx="14" ry="9" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2"/>
        <!-- Golden Sparkles and Wafer Stick -->
        <line x1="56" y1="30" x2="72" y2="10" stroke="#D97706" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="50" cy="14" r="4.5" fill="#EF4444"/>
        <!-- Joyful Face -->
        <circle cx="43" cy="33" r="2.5" fill="#78350F"/>
        <circle cx="57" cy="33" r="2.5" fill="#78350F"/>
        <path d="M47 38c1.5 2 4.5 2 6 0" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
  },
];

const ACTIVE_MASCOT_KEY = "weather:active-mascot";
const MASCOT_VISIBILITY_KEY = "weather:mascot-visible";

/**
 * Checks if a mascot is unlocked based on Root Beer supporter status
 */
export function isMascotUnlocked(mascotId: string): boolean {
  if (typeof window === "undefined") {
    return mascotId === "frothy" || mascotId === "fizz";
  }

  const m = MASCOTS.find((x) => x.id === mascotId);
  if (!m) return false;
  if (m.minTier === "free") return true;

  const isSmall = isThankYouBackgroundUnlocked("small_root_beer_tier");
  const isMedium = isThankYouBackgroundUnlocked("medium_root_beer_tier");
  const isLarge = isThankYouBackgroundUnlocked("large_root_beer_tier");
  const isParty = isThankYouBackgroundUnlocked("party_root_beer_tier");

  if (m.minTier === "small") return isSmall || isMedium || isLarge || isParty;
  if (m.minTier === "medium") return isMedium || isLarge || isParty;
  if (m.minTier === "large") return isLarge || isParty;
  if (m.minTier === "party") return isParty;

  return false;
}

export function getActiveMascot(): Mascot {
  const fallback = MASCOTS[0] as Mascot;
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(ACTIVE_MASCOT_KEY);
    const found = MASCOTS.find((m) => m.id === saved);
    if (found && isMascotUnlocked(found.id)) {
      return found;
    }
  } catch {}
  return fallback; // Frothy default
}

export function setActiveMascot(mascotId: string): void {
  try {
    localStorage.setItem(ACTIVE_MASCOT_KEY, mascotId);
    window.dispatchEvent(
      new CustomEvent("weather:mascot-change", { detail: { mascotId } })
    );
  } catch {}
}

export function isMascotVisible(): boolean {
  try {
    const val = localStorage.getItem(MASCOT_VISIBILITY_KEY);
    return val !== "false";
  } catch {
    return true;
  }
}

export function setMascotVisible(visible: boolean): void {
  try {
    localStorage.setItem(MASCOT_VISIBILITY_KEY, visible ? "true" : "false");
    window.dispatchEvent(
      new CustomEvent("weather:mascot-visibility-change", { detail: { visible } })
    );
  } catch {}
}

/**
 * Weather-aware dialogue engine in English and Thai with root beer flavor
 */
export function getMascotSpeech(
  mascot: Mascot,
  weather: Weather | null,
  lang: string = "en"
): string {
  if (!weather?.current) return mascot.quote;

  const tempC =
    weather.unit === "imperial"
      ? ((weather.current.temp - 32) * 5) / 9
      : weather.current.temp;

  const code = weather.current.code;
  const isNight = weather.current.is_day === 0;
  const aqi = weather.current.aqi ?? 0;
  const isThai = lang.startsWith("th");

  // 1. Extreme Pollution / Unhealthy AQI
  if (aqi >= 101 || (weather.current.pm25 && weather.current.pm25 >= 35.5)) {
    return isThai
      ? "วันนี้ฝุ่นหนานะ! สวมหน้ากาก N95 แล้วแวะจิบรูทเบียร์เย็นๆ ในบ้านดีกว่า 😷🍺"
      : "Smoggy skies today! Wear your N95 mask and enjoy a cold root beer indoors! 😷🍺";
  }

  // 2. Severe Thunderstorm
  if (code >= 95) {
    return isThai
      ? "ฟ้าคำรามเสียงดัง! อยู่ในที่ปลอดภัยแล้วจิบรูทเบียร์ฟองนุ่มๆ กัน ⚡🍺"
      : "Thunder is roaring loud! Cozy up inside with a bubbly root beer mug! ⚡🍺";
  }

  // 3. Rain / Showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return isThai
      ? "ฝนตกฉ่ำๆ ฟังเสียงฝนเพลินๆ พร้อมรูทเบียร์โฟลตหอมหวาน 🌧️🍨"
      : "Rain on the windowpane pairs best with a chilled root beer float! 🌧️🍨";
  }

  // 4. Freezing Cold
  if (tempC <= 5) {
    return isThai
      ? "หนาวจับใจเลย! มาจิบเครื่องดื่มคาราเมลรูทเบียร์อุ่นๆ คลายหนาวกันนะ 🧣☕"
      : "Brrr, freezing out there! Warm up with spiced sarsaparilla and sweet caramel! 🧣☕";
  }

  // 5. Extreme Heat
  if (tempC >= 32) {
    return isThai
      ? "แดดร้อนเปรี้ยงเลย! ต้องรูทเบียร์เย็นเจี๊ยบโปะไอศกรีมวานิลลาฉ่ำๆ แล้ว! ☀️🍦"
      : "Sizzling hot outside! Time for a frosty ice-cold root beer float with extra ice! ☀️🍦";
  }

  // 6. Peaceful Night
  if (isNight) {
    return isThai
      ? "คืนนี้ดาวสวยสงบ จิบรูทเบียร์เย็นๆ ชิลๆ ก่อนเข้านอนนะ ✨🍺"
      : "Quiet starry night. A relaxing mug of chilled root beer hits the spot! ✨🍺";
  }

  // Default Mascot Catchphrase
  return mascot.quote;
}

/**
 * Web Audio API gentle chime sound (100% offline & zero external assets)
 */
export function playCozyChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.46);
  } catch {}
}
