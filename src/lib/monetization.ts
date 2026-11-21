// src/lib/monetization.ts
// Multi-Tier Monetization & Google Play / Web Payment Integration for My Weather Pal

export interface RootBeerTier {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  durationDays: number | null;
  adFreeForever: boolean;
  bonus: {
    customBackgrounds: number;
    aiBackgrounds: number;
    noAdsForever: boolean;
    label: string;
  };
  tagline: string;
  badge: string;
  productId: string;
  perks?: {
    backgrounds?: string;
    aiGenerations?: string;
    adFree?: string;
    celebration?: string;
  };
}

export const ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE: RootBeerTier[] = [
  {
    id: "small_root_beer_tier",
    name: "Small Root Beer",
    price: 1.0,
    displayPrice: "$1.00",
    durationDays: null,
    adFreeForever: false,
    bonus: {
      customBackgrounds: 2,
      aiBackgrounds: 2,
      noAdsForever: false,
      label: "2 Permanent Slots (City + AI)",
    },
    tagline: "2 Permanent Wallpaper & AI Slots",
    badge: "🍺 Supporter",
    productId: "small_root_beer_tier",
    perks: {
      backgrounds: "2 permanent slots for city landmark wallpapers",
      aiGenerations: "2 permanent slots for AI watercolor generator",
      adFree: "Standard rewarded ad support (+1 bonus slot / 24h)",
      celebration: "Warm supporter badge & special mascot thank-you",
    },
  },
  {
    id: "medium_root_beer_tier",
    name: "Medium Root Beer",
    price: 3.0,
    displayPrice: "$3.00",
    durationDays: 30,
    adFreeForever: false,
    bonus: {
      customBackgrounds: 4,
      aiBackgrounds: 4,
      noAdsForever: false,
      label: "4 Permanent Slots + 30 Days Ad-Free",
    },
    tagline: "4 Slots + 30 Days Ad-Free",
    badge: "🌟 Enthusiast",
    productId: "medium_root_beer_tier",
    perks: {
      backgrounds: "4 permanent slots for city landmark wallpapers",
      aiGenerations: "4 permanent slots for AI watercolor generator",
      adFree: "30 days 100% ad-free experience",
      celebration: "Enthusiast badge & special mascot dialogues",
    },
  },
  {
    id: "large_root_beer_tier",
    name: "Large Root Beer",
    price: 5.0,
    displayPrice: "$5.00",
    durationDays: 365,
    adFreeForever: false,
    bonus: {
      customBackgrounds: 6,
      aiBackgrounds: 6,
      noAdsForever: false,
      label: "6 Permanent Slots + 1 Year Ad-Free",
    },
    tagline: "6 Slots + 1 Full Year Ad-Free",
    badge: "👑 VIP Member",
    productId: "large_root_beer_tier",
    perks: {
      backgrounds: "6 permanent slots for city landmark wallpapers",
      aiGenerations: "6 permanent slots for AI watercolor generator",
      adFree: "365 days 100% ad-free experience",
      celebration: "VIP badge & complete mascot wardrobe access",
    },
  },
  {
    id: "party_pack_root_beer_tier",
    name: "Party Pack Root Beer",
    price: 10.0,
    displayPrice: "$10.00",
    durationDays: null,
    adFreeForever: true,
    bonus: {
      // 999 is the existing sentinel for "unlimited" in this codebase.
      // Kept for backward compat — do not treat it as a literal count.
      customBackgrounds: 999,
      aiBackgrounds: 999,
      noAdsForever: true,
      label: "Unlimited Slots + Ad-Free FOREVER",
    },
    tagline: "Unlimited Slots & Lifetime Ad-Free",
    badge: "🎉 Lifetime VIP",
    productId: "party_pack_root_beer_tier",
    perks: {
      backgrounds: "Unlimited custom wallpaper slots forever",
      aiGenerations: "Unlimited AI watercolor generation slots forever",
      adFree: "Lifetime 100% ad-free experience guaranteed",
      celebration: "Lifetime VIP golden badge & root beer mascot buddy forever",
    },
  },
];

export const ROOT_BEER_TIERS = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE;

// ---------------------------------------------------------------------------
// Tier helpers — single source of truth for validation.
// Every function that accepts a tierId MUST go through these, otherwise
// a URL param / localStorage value like "__proto__" or "free_hack" can
// create a fake unlock.
// ---------------------------------------------------------------------------

function hasOwn(obj: unknown, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

const TIER_ORDER = [
  "small_root_beer_tier",
  "medium_root_beer_tier",
  "large_root_beer_tier",
  "party_pack_root_beer_tier",
] as const;

const TIER_ID_SET = new Set<string>(TIER_ORDER);

export function isValidTierId(id: unknown): id is string {
  return typeof id === "string" && TIER_ID_SET.has(id);
}

export function getTierById(tierId: string): RootBeerTier | undefined {
  if (!isValidTierId(tierId)) return undefined;
  return ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);
}

// Short aliases accepted in ?paid= / ?tier= URLs.
// Exact match only — NEVER use .includes() here. The old code did
// `lower.includes("party")`, so "?paid=party-pooper" or "?paid=myparty"
// would unlock Party Pack. Same for "rootbeer" / "true" -> Small.
const TIER_ALIASES: Record<string, string> = {
  small: "small_root_beer_tier",
  small_root_beer: "small_root_beer_tier",
  medium: "medium_root_beer_tier",
  medium_root_beer: "medium_root_beer_tier",
  large: "large_root_beer_tier",
  large_root_beer: "large_root_beer_tier",
  party: "party_pack_root_beer_tier",
  party_pack: "party_pack_root_beer_tier",
  party_pack_root_beer: "party_pack_root_beer_tier",
};

export function resolveTierId(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (isValidTierId(lower)) return lower;
  if (hasOwn(TIER_ALIASES, lower)) return TIER_ALIASES[lower];
  return null;
}

export type DonationProvider = "googlepay" | "buymeacoffee" | "paypal" | "stripe" | "kofi";

export const DONATION_CONFIG = {
  paypalUsername: "rod1974b",
  buyMeACoffeePage: "https://buymeacoffee.com/rod1974b",
  buyMeACoffeeExtras: {
    small_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595466",
    medium_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595468",
    large_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595470",
    party_pack_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595471",
  } as Record<string, string>,
  // NOTE: These are currently BuyMeACoffee URLs, not real Google Pay links.
  // Kept as-is for backward compat — rename / replace when real Google Pay
  // links exist, do not assume these go through Google Pay.
  googlePayLinks: {
    small_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595466",
    medium_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595468",
    large_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595470",
    party_pack_root_beer_tier: "https://buymeacoffee.com/rod1974b/e/595471",
  } as Record<string, string>,
  kofiPage: "",
  stripeLinks: {
    small_root_beer_tier: "",
    medium_root_beer_tier: "",
    large_root_beer_tier: "",
    party_pack_root_beer_tier: "",
    ai_gallery_lifetime_unlock: "",
  } as Record<string, string>,
};

function getConfigLink(
  map: Record<string, string> | undefined,
  tierId: string
): string | null {
  if (!map || !isValidTierId(tierId)) return null;
  // hasOwn, not truthy lookup — prevents "__proto__" / "constructor" returning Object.
  if (!hasOwn(map, tierId)) return null;
  const link = map[tierId];
  return link ? link : null;
}

export const getDonationUrl = (
  tierId: string,
  provider: DonationProvider
): string => {
  const tier = getTierById(tierId);
  const fallbackPage =
    DONATION_CONFIG.buyMeACoffeePage || "https://buymeacoffee.com/rod1974b";

  switch (provider) {
    case "googlepay": {
      return (
        getConfigLink(DONATION_CONFIG.googlePayLinks, tierId) ??
        getConfigLink(DONATION_CONFIG.stripeLinks, tierId) ??
        getConfigLink(DONATION_CONFIG.buyMeACoffeeExtras, tierId) ??
        fallbackPage
      );
    }
    case "buymeacoffee": {
      const direct = getConfigLink(DONATION_CONFIG.buyMeACoffeeExtras, tierId);
      if (direct) return direct;
      return tier ? `${fallbackPage}?amount=${tier.price}` : fallbackPage;
    }
    case "stripe": {
      const link = getConfigLink(DONATION_CONFIG.stripeLinks, tierId);
      if (link) return link;
      // FIX: Old code fabricated `https://buy.stripe.com/${tierId}`.
      // tierId is "small_root_beer_tier", not a Stripe Payment Link ID,
      // so that URL 404'd. And if tierId was user-controlled it could
      // produce an arbitrary URL. Fall back to BuyMeACoffee instead.
      return fallbackPage;
    }
    case "kofi": {
      return DONATION_CONFIG.kofiPage || "https://ko-fi.com/";
    }
    case "paypal":
    default: {
      const user = DONATION_CONFIG.paypalUsername || "rod1974b";
      if (!tier) return `https://www.paypal.com/paypalme/${user}`;
      const amount = tier.price.toFixed(2);
      const note = encodeURIComponent(tier.name || "My Weather Pal support");
      return `https://www.paypal.com/paypalme/${user}/${amount}?item_name=${note}`;
    }
  }
};

// Pending Donation Tracking Helpers
const PENDING_TIER_KEY = "weather:pending-donation-tier";

export const setPendingDonationTier = (tierId: string): boolean => {
  // FIX: Old code stored any string, including invalid / tampered tiers.
  if (!isValidTierId(tierId)) return false;
  try {
    localStorage.setItem(PENDING_TIER_KEY, tierId);
    return true;
  } catch {
    return false;
  }
};

export const getPendingDonationTier = (): string | null => {
  try {
    const stored = localStorage.getItem(PENDING_TIER_KEY);
    if (!stored || !isValidTierId(stored)) {
      // Clear stale / tampered values so they can't be used later.
      if (stored) {
        try {
          localStorage.removeItem(PENDING_TIER_KEY);
        } catch {}
      }
      return null;
    }
    return stored;
  } catch {
    return null;
  }
};

export const clearPendingDonationTier = () => {
  try {
    localStorage.removeItem(PENDING_TIER_KEY);
  } catch {}
};

export const isThankYouBackgroundUnlocked = (tierId: string): boolean => {
  if (typeof window === "undefined") return false;
  if (!isValidTierId(tierId)) return false;
  // Background slots are PERMANENT, even after ad-free expires.
  // Do NOT check expiry here — see isAdFreeActive() for the time-limited part.
  try {
    return (
      localStorage.getItem(`thankyou_unlocked_${tierId}`) === "true" ||
      localStorage.getItem(`weather:monetization:${tierId}`) === "true"
    );
  } catch {
    return false;
  }
};

export const getAllUnlockedThankYouBackgrounds = (): string[] => {
  if (typeof window === "undefined") return [];
  return ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.filter((t) =>
    isThankYouBackgroundUnlocked(t.id)
  ).map((t) => t.id);
};

// --- Ad-free expiry (time-limited tiers) -----------------------------------
// durationDays is the AD-FREE duration, not the background duration.
// Backgrounds are permanent. Medium = 30 days ad-free, Large = 365 days,
// Small = no ad-free, Party = ad-free forever. The old code saved all tiers
// "forever" with no expiry, so a 30-day Medium purchase gave lifetime ad-free.
const PAID_TIER_KEY = "weather:paid_tier";
const PAID_TIER_EXPIRES_KEY = "weather:paid_tier_expires";

export const getPaidTier = (): string | null => {
  try {
    const stored = localStorage.getItem(PAID_TIER_KEY);
    return stored && isValidTierId(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const getPaidTierExpiry = (): number | null => {
  try {
    const raw = localStorage.getItem(PAID_TIER_EXPIRES_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

export const isAdFreeActive = (): boolean => {
  if (typeof window === "undefined") return false;
  const tierId = getPaidTier();
  if (!tierId) return false;
  const tier = getTierById(tierId);
  if (!tier) return false;
  if (tier.adFreeForever) return true;
  if (tier.durationDays == null) return false;
  const expiry = getPaidTierExpiry();
  // Legacy unlocks from before expiry was stored have no expiry key.
  // Grandfather them instead of revoking a purchase they already made.
  if (expiry == null) return true;
  return Date.now() < expiry;
};

/**
 * Saves a purchased tier and cascades unlocks to all lower tiers so all
 * backgrounds and mascot perks remain unlocked.
 *
 * Backgrounds: permanent. Ad-free: time-limited per durationDays
 * (except Party Pack, which is forever). See isAdFreeActive().
 */
export const saveThankYouBackgroundForever = (tierId: string): boolean => {
  if (typeof window === "undefined") return false;
  // FIX: Old code accepted ANY string and wrote
  // `weather:monetization:<anything> = true` + `weather:paid_tier = <anything>`.
  // Combined with the old processPaymentReturnParams defaulting to Small,
  // `?paid=false` unlocked Small for free. Now invalid tiers are rejected.
  if (!isValidTierId(tierId)) return false;
  try {
    // FIX: Old code used a hardcoded if/else cascade that would silently
    // break if a new tier was added. Now derived from TIER_ORDER.
    const idx = TIER_ORDER.indexOf(tierId as (typeof TIER_ORDER)[number]);
    const tiersToUnlock = TIER_ORDER.slice(0, idx + 1);

    for (const id of tiersToUnlock) {
      localStorage.setItem(`weather:monetization:${id}`, "true");
      localStorage.setItem(`thankyou_unlocked_${id}`, "true");
    }

    const tier = getTierById(tierId);
    localStorage.setItem(PAID_TIER_KEY, tierId);
    localStorage.setItem("weather:last-unlocked-tier", tierId);

    if (tier?.adFreeForever || tier?.durationDays == null) {
      // Forever / no ad-free — no expiry.
      localStorage.removeItem(PAID_TIER_EXPIRES_KEY);
    } else {
      const expiry = Date.now() + tier.durationDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(PAID_TIER_EXPIRES_KEY, String(expiry));
    }

    clearPendingDonationTier();

    window.dispatchEvent(
      new CustomEvent("weather:monetization-updated", { detail: { tierId } })
    );
    window.dispatchEvent(
      new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId } })
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * Processes URL query parameters on return redirects (e.g. ?paid=... or ?tier=...)
 *
 * FIX — this was a free-unlock vulnerability:
 * Old code: `let tier = "small_root_beer_tier"; if (lower.includes("party")) ...`
 * - `?paid=false`, `?paid=cancelled`, `?paid=xyz`, `?tier=anything`
 *   all fell through to the default and unlocked Small for free.
 * - `?paid=true` with no tier also unlocked Small by guessing.
 * - `.includes("party")` meant `?paid=party-pooper` unlocked Party Pack.
 *
 * New rules:
 * - Exact tier ID or exact alias only. Unknown strings -> null, no unlock.
 * - `?paid=false` / `cancelled` / `failed` / `status=cancelled` -> null, no unlock,
 *   even if a tier param is also present.
 * - `?paid=true` with no tier -> use the pending tier saved before redirect
 *   (setPendingDonationTier), otherwise null — never guess Small.
 * - Only on a valid tier do we call saveThankYouBackgroundForever().
 */
export const processPaymentReturnParams = (
  searchParams: URLSearchParams | string
): string | null => {
  try {
    const params =
      typeof searchParams === "string"
        ? new URLSearchParams(searchParams)
        : searchParams;

    // Failure signals override everything.
    const status = (
      params.get("status") ||
      params.get("payment_status") ||
      params.get("result") ||
      ""
    )
      .trim()
      .toLowerCase();
    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "failed" ||
      status === "failure" ||
      status === "error" ||
      status === "declined"
    ) {
      return null;
    }

    const paidRaw = params.get("paid");
    if (paidRaw !== null) {
      const paidLower = paidRaw.trim().toLowerCase();
      if (
        paidLower === "false" ||
        paidLower === "0" ||
        paidLower === "no" ||
        paidLower === "cancelled" ||
        paidLower === "canceled" ||
        paidLower === "failed" ||
        paidLower === "failure" ||
        paidLower === "error" ||
        paidLower === "declined"
      ) {
        return null;
      }
    }

    // Precedence: explicit ?tier= / ?unlocked= wins over ?paid=.
    const explicitTierRaw = params.get("tier") || params.get("unlocked");
    let tier = resolveTierId(explicitTierRaw);

    if (!tier && paidRaw !== null) {
      const paidLower = paidRaw.trim().toLowerCase();
      if (
        paidLower === "true" ||
        paidLower === "1" ||
        paidLower === "success" ||
        paidLower === "yes" ||
        paidLower === "paid"
      ) {
        // Boolean success, no tier in URL — use pending tier from before redirect.
        tier = getPendingDonationTier();
        if (!tier) return null;
      } else {
        // ?paid=<tier-id-or-alias>
        tier = resolveTierId(paidRaw);
        if (!tier) return null;
      }
    }

    if (!tier) return null;

    const saved = saveThankYouBackgroundForever(tier);
    return saved ? tier : null;
  } catch {
    return null;
  }
};

// MEDIAN.CO ANDROID WRAPPER & GOOGLE PLAY BILLING BRIDGE
export const isMedianAndroidApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    median?: unknown;
    MedIAN?: unknown;
    Median?: unknown;
  };
  let ua = "";
  try {
    ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  } catch {
    ua = "";
  }
  return (
    typeof w.median !== "undefined" ||
    typeof w.MedIAN !== "undefined" ||
    typeof w.Median !== "undefined" ||
    /median/i.test(ua) ||
    /gonative/i.test(ua)
  );
};

type MedianIapResult = {
  success?: boolean;
  status?: string;
  message?: string;
};

type MedianAdResult = {
  rewarded?: boolean;
  success?: boolean;
  status?: string;
  message?: string;
};

function isDevPreview(): boolean {
  try {
    const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
    if (env?.DEV) return true;
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return true;
    }
  } catch {}
  return false;
}

export const purchaseTierViaGooglePlay = (
  tierId: string,
  onSuccess: () => void,
  onError: (err: Error) => void
) => {
  if (typeof window === "undefined") {
    onError(new Error("Window object unavailable"));
    return;
  }
  // FIX: Old code passed any tierId straight to Median IAP.
  if (!isValidTierId(tierId)) {
    onError(new Error(`Unknown tier: ${tierId}`));
    return;
  }

  const w = window as unknown as {
    median?: {
      iap?: {
        purchase?: (opts: {
          productId: string;
          callback?: (res: unknown) => void;
        }) => void;
      };
    };
    Median?: {
      iap?: {
        purchase?: (opts: {
          productId: string;
          callback?: (res: unknown) => void;
        }) => void;
      };
    };
  };

  const iapBridge = w.median?.iap || w.Median?.iap;

  if (iapBridge && typeof iapBridge.purchase === "function") {
    // Save pending so a return / restart can still resolve the tier.
    setPendingDonationTier(tierId);
    try {
      iapBridge.purchase({
        productId: tierId,
        callback: (res: unknown) => {
          const r = (res ?? {}) as MedianIapResult;
          if (r?.success || r?.status === "success") {
            onSuccess();
          } else {
            onError(new Error(r?.message || "Purchase cancelled or failed"));
          }
        },
      });
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)));
    }
  } else {
    // FIX: Old code showed a `confirm()` in production web and granted the
    // purchase if the user clicked OK — free unlock without paying.
    // Simulated purchases are now dev-preview only.
    if (!isDevPreview()) {
      onError(
        new Error("Google Play billing is only available in the Android app.")
      );
      return;
    }
    const proceed =
      typeof confirm !== "undefined"
        ? confirm(
            `[Google Play In-App Billing]\nConfirm test simulated purchase for tier:\n${tierId}?`
          )
        : false;
    if (proceed) {
      onSuccess();
    } else {
      onError(new Error("Test purchase cancelled by user"));
    }
  }
};

// MEDIAN ADMOB REWARDED VIDEO ADS BRIDGE
export const showRewardedAdViaMedian = (
  onRewarded: () => void,
  onError: (err: Error) => void
) => {
  if (typeof window === "undefined") {
    onError(new Error("Window object unavailable"));
    return;
  }

  const w = window as unknown as {
    median?: {
      admob?: {
        rewarded?: {
          show?: (opts: { callback?: (res: unknown) => void }) => void;
        };
      };
    };
    Median?: {
      admob?: {
        rewarded?: {
          show?: (opts: { callback?: (res: unknown) => void }) => void;
        };
      };
    };
  };

  const admobRewarded = w.median?.admob?.rewarded || w.Median?.admob?.rewarded;

  if (admobRewarded && typeof admobRewarded.show === "function") {
    try {
      admobRewarded.show({
        callback: (res: unknown) => {
          const r = (res ?? {}) as MedianAdResult;
          if (r?.rewarded || r?.success || r?.status === "completed") {
            onRewarded();
          } else {
            onError(new Error(r?.message || "Ad did not complete"));
          }
        },
      });
    } catch (e) {
      onError(e instanceof Error ? e : new Error(String(e)));
    }
  } else {
    // FIX: Same as purchase — old code granted +1 slot for 24h if the user
    // clicked OK on a confirm() in production web, without watching an ad.
    // Simulated ads are now dev-preview only.
    if (!isDevPreview()) {
      onError(new Error("Rewarded ads are only available in the Android app."));
      return;
    }
    const proceed =
      typeof confirm !== "undefined"
        ? confirm(
            "[AdMob Rewarded Video Ad]\nSimulate watching a 30-second rewarded sponsor ad to unlock +1 Wallpaper Slot for 24 hours?"
          )
        : false;
    if (proceed) {
      onRewarded();
    } else {
      onError(new Error("Ad viewing cancelled"));
    }
  }
};
