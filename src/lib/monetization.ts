// src/lib/monetization.ts
export type RootBeerTier = "free" | "small" | "medium" | "large" | "party";

export interface PaidTierConfig {
  id: string;
  tierKey: RootBeerTier;
  bmcUrl: string;
  priceUsd: number;
  adFreeForever?: boolean;
  durationDays?: number;
  bonus: {
    permanentCitySlots: number;
    aiBackgrounds: number;
  };
}

export const PAID_TIERS_CONFIG: Record<string, PaidTierConfig> = {
  small_root_beer_tier: {
    id: "small_root_beer_tier",
    tierKey: "small",
    bmcUrl: "https://buymeacoffee.com/rod1974b/e/349474",
    priceUsd: 1,
    bonus: { permanentCitySlots: 2, aiBackgrounds: 2 },
  },
  medium_root_beer_tier: {
    id: "medium_root_beer_tier",
    tierKey: "medium",
    bmcUrl: "https://buymeacoffee.com/rod1974b/e/349475",
    priceUsd: 3,
    durationDays: 30,
    bonus: { permanentCitySlots: 4, aiBackgrounds: 4 },
  },
  large_root_beer_tier: {
    id: "large_root_beer_tier",
    tierKey: "large",
    bmcUrl: "https://buymeacoffee.com/rod1974b/e/349476",
    priceUsd: 5,
    durationDays: 365,
    bonus: { permanentCitySlots: 6, aiBackgrounds: 6 },
  },
  party_pack_root_beer_tier: {
    id: "party_pack_root_beer_tier",
    tierKey: "party",
    bmcUrl: "https://buymeacoffee.com/rod1974b/e/349477",
    priceUsd: 10,
    adFreeForever: true,
    bonus: { permanentCitySlots: 999, aiBackgrounds: 999 },
  },
};

export const ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE = [
  {
    id: "small_root_beer_tier",
    title: "Small Root Beer",
    tagline: "Cool & Refreshing Supporter",
    price: "$1",
    perks: ["2 Permanent City Slots", "2 Permanent AI Backgrounds"],
  },
  {
    id: "medium_root_beer_tier",
    title: "Medium Frosty Mug",
    tagline: "30-Day Ad-Free Sip",
    price: "$3",
    perks: ["30 Days 100% Ad-Free", "4 Permanent City Slots", "4 Permanent AI Backgrounds"],
  },
  {
    id: "large_root_beer_tier",
    title: "Large Frosted Float",
    tagline: "1 Full Year of Comfort",
    price: "$5",
    perks: ["1 Year Ad-Free Experience", "6 Permanent City Slots", "6 Permanent AI Backgrounds"],
  },
  {
    id: "party_pack_root_beer_tier",
    title: "Root Beer Party Pack",
    tagline: "Lifetime VIP Supporter",
    price: "$10",
    badge: "BEST VALUE",
    perks: ["Lifetime 100% Ad-Free", "Unlimited City Slots", "Unlimited AI Backgrounds"],
  },
];

const PAID_TIER_KEY = "weather:paid-tier";
const AD_FREE_EXPIRY_KEY = "weather:adfree-expiry";
const PENDING_TIER_KEY = "weather:pending-donation-tier";
const AD_BONUS_KEY = "weather:ad-slot-bonus";

const TIER_ALIASES: Record<string, string> = {
  small: "small_root_beer_tier",
  medium: "medium_root_beer_tier",
  large: "large_root_beer_tier",
  party: "party_pack_root_beer_tier",
};

export function isValidTierId(tierId: string): boolean {
  return tierId in PAID_TIERS_CONFIG;
}

export function getTierById(tierId: string): PaidTierConfig | null {
  return PAID_TIERS_CONFIG[tierId] ?? null;
}

export function resolveTierId(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (isValidTierId(lower)) return lower;
  if (Object.prototype.hasOwnProperty.call(TIER_ALIASES, lower)) {
    return TIER_ALIASES[lower] ?? null;
  }
  return null;
}

export type DonationProvider = "googlepay" | "buymeacoffee" | "paypal" | "stripe" | "kofi";

export const DONATION_CONFIG = {
  buyMeACoffeePage: "https://buymeacoffee.com/rod1974b",
};

export function isMedianAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    ua.includes("median") ||
    ua.includes("gonative") ||
    Boolean((window as unknown as { median?: unknown }).median)
  );
}

export function getDonationUrl(provider: DonationProvider, tierId?: string): string {
  const config = tierId ? getTierById(tierId) : null;
  if (config?.bmcUrl) {
    return config.bmcUrl;
  }
  return DONATION_CONFIG.buyMeACoffeePage;
}

export async function purchaseTierViaGooglePlay(tierId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const medianWindow = window as unknown as {
    median?: {
      iap?: {
        purchase?: (opts: { productID: string }) => void;
      };
    };
  };

  if (medianWindow.median?.iap?.purchase) {
    try {
      medianWindow.median.iap.purchase({ productID: tierId });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function saveThankYouBackgroundForever(tierId: string): void {
  if (typeof window === "undefined") return;
  try {
    const config = getTierById(tierId);
    localStorage.setItem(PAID_TIER_KEY, tierId);

    if (config?.adFreeForever) {
      localStorage.setItem(AD_FREE_EXPIRY_KEY, "forever");
    } else if (config?.durationDays) {
      const expiry = Date.now() + config.durationDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(AD_FREE_EXPIRY_KEY, String(expiry));
    }
  } catch {}
}

export function getPaidTier(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PAID_TIER_KEY);
  } catch {
    return null;
  }
}

export function isThankYouBackgroundUnlocked(tierId: string): boolean {
  const active = getPaidTier();
  if (!active) return false;
  if (active === tierId) return true;
  if (active === "party_pack_root_beer_tier") return true;
  return false;
}

export function isAdFreeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const exp = localStorage.getItem(AD_FREE_EXPIRY_KEY);
    if (!exp) return false;
    if (exp === "forever") return true;
    const timestamp = Number(exp);
    return Number.isFinite(timestamp) && timestamp > Date.now();
  } catch {
    return false;
  }
}

export function setPendingDonationTier(tierId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_TIER_KEY, tierId);
  } catch {}
}

export function getPendingDonationTier(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_TIER_KEY);
  } catch {
    return null;
  }
}

export function clearPendingDonationTier(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_TIER_KEY);
  } catch {}
}

export function triggerAdSlotBonus(): void {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(AD_BONUS_KEY, String(expiresAt));
  } catch {}
}

export function hasActiveAdSlotBonus(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(AD_BONUS_KEY);
    if (!raw) return false;
    return Number(raw) > Date.now();
  } catch {
    return false;
  }
}
