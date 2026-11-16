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
  // 1. FREE TIER COMPANION (Unlocked for all users)
  {
    id: "nimbus",
    name: "Nimbus",
    title: "The Cheerful Cloud Pal",
    species: "Cloud",
    isAnimated: false,
    minTier: "free",
    tierLabel: "Free Baseline",
    quote: "Always watching the sky with you!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <path d="M28 68h44a18 18 0 005-35.3 22 22 0 00-41.8-6A16 16 0 0028 68z" fill="#E0F2FE" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>
        <circle cx="42" cy="48" r="3.5" fill="#0F172A"/>
        <circle cx="58" cy="48" r="3.5" fill="#0F172A"/>
        <circle cx="38" cy="52" r="3" fill="#FDA4AF" opacity="0.8"/>
        <circle cx="62" cy="52" r="3" fill="#FDA4AF" opacity="0.8"/>
        <path d="M47 54c1.5 2 4.5 2 6 0" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
    `,
  },

  // 2. SMALL ROOT BEER TIER ($1) — 1 Static Mascot
  {
    id: "frothy",
    name: "Frothy",
    title: "The Bubbly Root Beer Mug",
    species: "Root Beer Float",
    isAnimated: false,
    minTier: "small",
    tierLabel: "Small Root Beer ($1)",
    quote: "Stay chilled and cozy, rain or shine!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Mug body -->
        <rect x="25" y="32" width="45" height="48" rx="8" fill="#8B4513" stroke="#D97706" stroke-width="3"/>
        <!-- Amber Liquid Fill -->
        <rect x="28" y="38" width="39" height="38" rx="4" fill="#B45309"/>
        <!-- Handle -->
        <path d="M70 42h8a8 8 0 018 8v12a8 8 0 01-8 8h-8" stroke="#D97706" stroke-width="4.5" stroke-linecap="round"/>
        <!-- Creamy Foam Top -->
        <path d="M22 34c0-7 6-12 14-12 4 0 8 3 11 1 3-4 10-4 14 0 5 1 12 4 12 11H22z" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2.5"/>
        <!-- Happy Face -->
        <circle cx="41" cy="54" r="3" fill="#FFFBEB"/>
        <circle cx="55" cy="54" r="3" fill="#FFFBEB"/>
        <circle cx="36" cy="58" r="2.5" fill="#F87171" opacity="0.8"/>
        <circle cx="60" cy="58" r="2.5" fill="#F87171" opacity="0.8"/>
        <path d="M45 61c2 2.5 6 2.5 8 0" stroke="#FFFBEB" stroke-width="2.2" stroke-linecap="round"/>
        <!-- Foam bubbles -->
        <circle cx="34" cy="20" r="3" fill="#FFFBEB"/>
        <circle cx="58" cy="18" r="2" fill="#FFFBEB"/>
      </svg>
    `,
  },

  // 3. MEDIUM ROOT BEER TIER ($3) — 2 Static + 1 Animated
  {
    id: "puddle",
    name: "Puddle",
    title: "The Rainy Duckling",
    species: "Duck",
    isAnimated: false,
    minTier: "medium",
    tierLabel: "Medium Root Beer ($3)",
    quote: "Quack! Every puddle is an adventure!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Duck body -->
        <circle cx="48" cy="55" r="22" fill="#FACC15" stroke="#CA8A04" stroke-width="3"/>
        <!-- Head -->
        <circle cx="60" cy="38" r="14" fill="#FACC15" stroke="#CA8A04" stroke-width="3"/>
        <!-- Beak -->
        <ellipse cx="76" cy="40" rx="7" ry="4" fill="#F97316"/>
        <!-- Eye -->
        <circle cx="63" cy="35" r="2.5" fill="#1E293B"/>
        <!-- Raincoat hood -->
        <path d="M48 24c8 0 16 4 18 12l-14 4-4-16z" fill="#38BDF8"/>
        <!-- Wing -->
        <path d="M38 52c-4 0-8 6-6 12 6 2 12-4 12-8z" fill="#EAB308"/>
      </svg>
    `,
  },
  {
    id: "sol",
    name: "Sol",
    title: "The Sunny Bear",
    species: "Sun Bear",
    isAnimated: true,
    minTier: "medium",
    tierLabel: "Medium Root Beer ($3)",
    quote: "Soaking up the warm rays in style!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-bounce">
        <!-- Bear Head -->
        <circle cx="50" cy="50" r="24" fill="#92400E" stroke="#78350F" stroke-width="3"/>
        <!-- Ears -->
        <circle cx="32" cy="32" r="8" fill="#92400E" stroke="#78350F" stroke-width="2.5"/>
        <circle cx="68" cy="32" r="8" fill="#92400E" stroke="#78350F" stroke-width="2.5"/>
        <circle cx="32" cy="32" r="4" fill="#FDE68A"/>
        <circle cx="68" cy="32" r="4" fill="#FDE68A"/>
        <!-- Snout -->
        <ellipse cx="50" cy="56" rx="10" ry="7" fill="#FDE68A"/>
        <ellipse cx="50" cy="53" rx="4" ry="2.5" fill="#1E293B"/>
        <path d="M47 58c1.5 2 4.5 2 6 0" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Cool Sunglasses -->
        <rect x="34" y="42" width="13" height="8" rx="2" fill="#0F172A"/>
        <rect x="53" y="42" width="13" height="8" rx="2" fill="#0F172A"/>
        <line x1="47" y1="45" x2="53" y2="45" stroke="#0F172A" stroke-width="2.5"/>
      </svg>
    `,
  },

  // 4. LARGE ROOT BEER TIER ($5) — 4 Static + 2 Animated
  {
    id: "misty",
    name: "Misty",
    title: "The Calico Cat",
    species: "Cat",
    isAnimated: false,
    minTier: "large",
    tierLabel: "Large Root Beer ($5)",
    quote: "Purring through breezy afternoons.",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Cat Body & Head -->
        <circle cx="50" cy="52" r="22" fill="#FFFBEB" stroke="#D97706" stroke-width="3"/>
        <!-- Ears -->
        <polygon points="34,36 40,18 48,32" fill="#F97316" stroke="#C2410C" stroke-width="2"/>
        <polygon points="66,36 60,18 52,32" fill="#78350F" stroke="#451A03" stroke-width="2"/>
        <!-- Eyes -->
        <ellipse cx="42" cy="49" rx="3" ry="4" fill="#15803D"/>
        <ellipse cx="58" cy="49" rx="3" ry="4" fill="#15803D"/>
        <!-- Pink Nose & Whiskers -->
        <polygon points="48,54 52,54 50,57" fill="#F43F5E"/>
        <line x1="32" y1="52" x2="22" y2="50" stroke="#78350F" stroke-width="1.5"/>
        <line x1="32" y1="56" x2="22" y2="57" stroke="#78350F" stroke-width="1.5"/>
        <line x1="68" y1="52" x2="78" y2="50" stroke="#78350F" stroke-width="1.5"/>
        <line x1="68" y1="56" x2="78" y2="57" stroke="#78350F" stroke-width="1.5"/>
      </svg>
    `,
  },
  {
    id: "sprout",
    name: "Sprout",
    title: "The Rain Tree Frog",
    species: "Tree Frog",
    isAnimated: false,
    minTier: "large",
    tierLabel: "Large Root Beer ($5)",
    quote: "Ribbit! The moisture feels wonderful!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Frog Head -->
        <ellipse cx="50" cy="54" rx="24" ry="18" fill="#4ADE80" stroke="#16A34A" stroke-width="3"/>
        <!-- Big Eyes -->
        <circle cx="36" cy="38" r="9" fill="#4ADE80" stroke="#16A34A" stroke-width="2.5"/>
        <circle cx="64" cy="38" r="9" fill="#4ADE80" stroke="#16A34A" stroke-width="2.5"/>
        <circle cx="36" cy="38" r="4.5" fill="#0F172A"/>
        <circle cx="64" cy="38" r="4.5" fill="#0F172A"/>
        <!-- Smile -->
        <path d="M38 58c6 5 18 5 24 0" stroke="#15803D" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Lotus Leaf Hat -->
        <path d="M42 22c8-6 22-2 26 6-12 1-20-2-26-6z" fill="#22C55E"/>
      </svg>
    `,
  },
  {
    id: "frosty",
    name: "Frosty",
    title: "The Winter Penguin",
    species: "Penguin",
    isAnimated: true,
    minTier: "large",
    tierLabel: "Large Root Beer ($5)",
    quote: "Brrr! Bundle up tight!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-pulse">
        <!-- Penguin Body -->
        <ellipse cx="50" cy="54" rx="20" ry="26" fill="#1E293B" stroke="#0F172A" stroke-width="3"/>
        <!-- White Belly -->
        <ellipse cx="50" cy="57" rx="13" ry="19" fill="#F8FAFC"/>
        <!-- Eyes -->
        <circle cx="44" cy="42" r="2.5" fill="#0F172A"/>
        <circle cx="56" cy="42" r="2.5" fill="#0F172A"/>
        <!-- Beak -->
        <polygon points="47,46 53,46 50,51" fill="#F97316"/>
        <!-- Knit Red Scarf -->
        <path d="M34 50c10 4 22 4 32 0l-3 6c-8 3-18 3-26 0z" fill="#EF4444"/>
        <rect x="52" y="52" width="7" height="15" rx="2" fill="#EF4444"/>
      </svg>
    `,
  },

  // 5. PARTY PACK VIP TIER ($10) — 8 Static + 4 Animated (All Unlocked)
  {
    id: "breeze",
    name: "Breeze",
    title: "The Wise Wind Owl",
    species: "Owl",
    isAnimated: false,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Hoo-hoo! I sense changes on the horizon.",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Owl Body -->
        <ellipse cx="50" cy="54" rx="22" ry="25" fill="#78350F" stroke="#451A03" stroke-width="3"/>
        <!-- Feathers -->
        <ellipse cx="50" cy="58" rx="14" ry="16" fill="#FEF3C7"/>
        <!-- Huge Eyes -->
        <circle cx="40" cy="42" r="8" fill="#FDE047" stroke="#CA8A04" stroke-width="2"/>
        <circle cx="60" cy="42" r="8" fill="#FDE047" stroke="#CA8A04" stroke-width="2"/>
        <circle cx="40" cy="42" r="4" fill="#0F172A"/>
        <circle cx="60" cy="42" r="4" fill="#0F172A"/>
        <!-- Beak -->
        <polygon points="48,46 52,46 50,52" fill="#D97706"/>
        <!-- Ear tufts -->
        <polygon points="34,26 40,34 32,36" fill="#78350F"/>
        <polygon points="66,26 60,34 68,36" fill="#78350F"/>
      </svg>
    `,
  },
  {
    id: "sparky",
    name: "Sparky",
    title: "The Thunder Fox",
    species: "Fox",
    isAnimated: true,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Electrifying forecasts ahead!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-bounce">
        <!-- Fox Head -->
        <polygon points="26,38 74,38 50,72" fill="#EA580C" stroke="#C2410C" stroke-width="3"/>
        <polygon points="38,44 62,44 50,68" fill="#FFFBEB"/>
        <!-- Ears -->
        <polygon points="28,38 34,16 46,38" fill="#EA580C" stroke="#C2410C" stroke-width="2"/>
        <polygon points="72,38 66,16 54,38" fill="#EA580C" stroke="#C2410C" stroke-width="2"/>
        <!-- Snout -->
        <circle cx="50" cy="69" r="3.5" fill="#0F172A"/>
        <!-- Eyes -->
        <path d="M40 48c2 2 4 2 6 0" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M54 48c2 2 4 2 6 0" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Lightning Spark -->
        <path d="M72 26l-6 10h6l-8 14" stroke="#FACC15" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `,
  },
  {
    id: "clover",
    name: "Clover",
    title: "The Bouncing Bunny",
    species: "Bunny",
    isAnimated: false,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Hop into fresh breezes and sunny fields!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Ears -->
        <ellipse cx="42" cy="24" rx="5" ry="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5"/>
        <ellipse cx="42" cy="24" rx="2.5" ry="11" fill="#FBCFE8"/>
        <ellipse cx="58" cy="24" rx="5" ry="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5"/>
        <ellipse cx="58" cy="24" rx="2.5" ry="11" fill="#FBCFE8"/>
        <!-- Head -->
        <circle cx="50" cy="54" r="22" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/>
        <!-- Eyes -->
        <circle cx="43" cy="50" r="3" fill="#0F172A"/>
        <circle cx="57" cy="50" r="3" fill="#0F172A"/>
        <circle cx="38" cy="55" r="2.5" fill="#F472B6" opacity="0.8"/>
        <circle cx="62" cy="55" r="2.5" fill="#F472B6" opacity="0.8"/>
        <!-- Nose -->
        <polygon points="48,56 52,56 50,59" fill="#F472B6"/>
      </svg>
    `,
  },
  {
    id: "glow",
    name: "Glow",
    title: "The Firefly Lantern",
    species: "Firefly",
    isAnimated: true,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Lighting your path through night and fog.",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md animate-pulse">
        <!-- Lantern Frame -->
        <rect x="36" y="34" width="28" height="38" rx="6" fill="#1E293B" stroke="#D97706" stroke-width="2.5"/>
        <!-- Glowing Core -->
        <circle cx="50" cy="53" r="11" fill="#FEF08A" opacity="0.95"/>
        <circle cx="50" cy="53" r="16" fill="#FDE047" opacity="0.35"/>
        <!-- Lantern Cap -->
        <path d="M32 34l8-10h20l8 10z" fill="#D97706"/>
        <circle cx="50" cy="18" r="4" stroke="#D97706" stroke-width="2" fill="none"/>
        <!-- Cute Eyes inside Glow -->
        <circle cx="47" cy="51" r="2" fill="#854D0E"/>
        <circle cx="53" cy="51" r="2" fill="#854D0E"/>
      </svg>
    `,
  },
  {
    id: "amber",
    name: "Amber",
    title: "The Golden Champion",
    species: "VIP Guardian",
    isAnimated: false,
    minTier: "party",
    tierLabel: "Party Pack ($10 VIP)",
    quote: "Thank you for supporting My Weather Pal forever!",
    avatarSvg: `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-md">
        <!-- Golden Shield -->
        <path d="M50 18l26 12v22c0 20-14 32-26 38-12-6-26-18-26-38V30l26-12z" fill="#F59E0B" stroke="#B45309" stroke-width="3"/>
        <!-- Inner Star -->
        <polygon points="50,32 55,42 66,43 58,51 60,62 50,56 40,62 42,51 34,43 45,42" fill="#FEF3C7"/>
        <circle cx="50" cy="48" r="4" fill="#B45309"/>
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
  if (typeof window === "undefined") return mascotId === "nimbus";
  if (mascotId === "nimbus") return true; // Baseline free

  const isSmall = isThankYouBackgroundUnlocked("small_root_beer_tier");
  const isMedium = isThankYouBackgroundUnlocked("medium_root_beer_tier");
  const isLarge = isThankYouBackgroundUnlocked("large_root_beer_tier");
  const isParty = isThankYouBackgroundUnlocked("party_root_beer_tier");

  const m = MASCOTS.find((x) => x.id === mascotId);
  if (!m) return false;

  if (m.minTier === "free") return true;
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
  return fallback; // Nimbus default
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
 * Weather-aware dialogue engine in English and Thai with fallback
 */
export function getMascotSpeech(
  mascot: Mascot,
  weather: Weather | null,
  lang: string = "en"
): string {
  if (!weather) return mascot.quote;

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
      ? "วันนี้ฝุ่น PM2.5 สูงนะ! อย่าลืมใส่หน้ากาก N95 นะครับ 😷"
      : "Smoggy air today! Please wear your N95 mask outdoors! 😷";
  }

  // 2. Severe Thunderstorm
  if (code >= 95) {
    return isThai
      ? "ฟ้าคำรามเสียงดัง! อยู่ในที่ปลอดภัยในอาคารกันเถอะ ⚡"
      : "Thunder rumbles loud! Stay safe and cozy indoors! ⚡";
  }

  // 3. Rain / Showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return isThai
      ? "ฝนกำลังตกฉ่ำ! อย่าลืมพกร่มกันฝนคันเก่งนะ 🌧️"
      : "Pitter-patter rain! Don't forget your trusty umbrella! 🌧️";
  }

  // 4. Freezing Cold
  if (tempC <= 5) {
    return isThai
      ? "หนาวจับใจเลย! พันผ้าพันคอและใส่เสื้อหนาๆ นะ 🧣"
      : "Brrr, it's chilly! Bundle up with warm layers and tea! 🧣";
  }

  // 5. Extreme Heat
  if (tempC >= 34) {
    return isThai
      ? "แดดร้อนเปรี้ยงเลย! จิบน้ำเย็นบ่อยๆ และทาครีมกันแดดด้วยนะ 🥤"
      : "Phew, it's scorching! Sip cold water and find some shade! 🥤";
  }

  // 6. Peaceful Night
  if (isNight) {
    return isThai
      ? "คืนนี้ท้องฟ้าสงบดีจัง หลับฝันดีใต้แสงดาวนะ ✨"
      : "Starry and serene tonight. Sleep well under the moon! ✨";
  }

  // Default Mascot Catchphrase
  return mascot.quote;
}

/**
 * Web Audio API gentle chime sound (100% offline & zero external assets)
 */
export function playCozyChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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
