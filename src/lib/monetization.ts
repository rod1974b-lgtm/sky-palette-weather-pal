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
      adFree: "Standard rewarded ad support",
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

const findTier = (tierId: string) =>
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((t) => t.id === tierId);

export const getDonationUrl = (
  tierId: string,
  provider: DonationProvider
): string => {
  const tier = findTier(tierId);
  const amount = tier?.price ? tier.price.toFixed(2) : "1.00";
  const note = encodeURIComponent(tier?.name || "My Weather Pal support");

  switch (provider) {
    case "googlepay": {
      const gPayLink = DONATION_CONFIG.googlePayLinks?.[tierId] || DONATION_CONFIG.stripeLinks?.[tierId];
      if (gPayLink) return gPayLink;
      const bmcExtra = DONATION_CONFIG.buyMeACoffeeExtras[tierId];
      if (bmcExtra) return bmcExtra;
      return DONATION_CONFIG.buyMeACoffeePage || "https://buymeacoffee.com/rod1974b";
    }
    case "buymeacoffee": {
      const directExtraUrl = DONATION_CONFIG.buyMeACoffeeExtras[tierId];
      if (directExtraUrl) return directExtraUrl;
      const base = DONATION_CONFIG.buyMeACoffeePage || "https://buymeacoffee.com/rod1974b";
      return tier?.price ? `${base}?amount=${tier.price}` : base;
    }
    case "stripe": {
      const link = DONATION_CONFIG.stripeLinks[tierId];
      if (link) return link;
      return `https://buy.stripe.com/${tierId}`;
    }
    case "kofi": {
      return DONATION_CONFIG.kofiPage || "https://ko-fi.com/";
    }
    case "paypal":
    default: {
      const user = DONATION_CONFIG.paypalUsername || "rod1974b";
      return `https://www.paypal.com/paypalme/${user}/${amount}?item_name=${note}`;
    }
  }
};

// Pending Donation Tracking Helpers
const PENDING_TIER_KEY = "weather:pending-donation-tier";

export const setPendingDonationTier = (tierId: string) => {
  try {
    localStorage.setItem(PENDING_TIER_KEY, tierId);
  } catch {}
};

export const getPendingDonationTier = (): string | null => {
  try {
    return localStorage.getItem(PENDING_TIER_KEY);
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
  return (
    localStorage.getItem(`thankyou_unlocked_${tierId}`) === "true" ||
    localStorage.getItem(`weather:monetization:${tierId}`) === "true"
  );
};

export const getAllUnlockedThankYouBackgrounds = (): string[] => {
  if (typeof window === "undefined") return [];
  return ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.filter((t) =>
    isThankYouBackgroundUnlocked(t.id)
  ).map((t) => t.id);
};

export const saveThankYouBackgroundForever = (tierId: string) => {
  try {
    localStorage.setItem(`weather:monetization:${tierId}`, "true");
    localStorage.setItem(`thankyou_unlocked_${tierId}`, "true");
    localStorage.setItem("weather:last-unlocked-tier", tierId);
    window.dispatchEvent(new CustomEvent("weather:monetization-updated", { detail: { tierId } }));
  } catch {}
};

// MEDIAN.CO ANDROID WRAPPER & GOOGLE PLAY BILLING BRIDGE
export const isMedianAndroidApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    median?: unknown;
    MedIAN?: unknown;
    Median?: unknown;
  };
  return (
    typeof w.median !== "undefined" ||
    typeof w.MedIAN !== "undefined" ||
    typeof w.Median !== "undefined" ||
    /median/i.test(navigator.userAgent || "") ||
    /gonative/i.test(navigator.userAgent || "")
  );
};

export const purchaseTierViaGooglePlay = (
  tierId: string,
  onSuccess: () => void,
  onError: (err: any) => void
) => {
  if (typeof window === "undefined") {
    onError(new Error("Window object unavailable"));
    return;
  }

  const w = window as unknown as {
    median?: {
      iap?: {
        purchase?: (opts: {
          productId: string;
          callback?: (res: any) => void;
        }) => void;
      };
    };
    Median?: {
      iap?: {
        purchase?: (opts: {
          productId: string;
          callback?: (res: any) => void;
        }) => void;
      };
    };
  };

  const iapBridge = w.median?.iap || w.Median?.iap;

  if (iapBridge && typeof iapBridge.purchase === "function") {
    try {
      iapBridge.purchase({
        productId: tierId,
        callback: (res: any) => {
          if (res?.success || res?.status === "success") {
            onSuccess();
          } else {
            onError(new Error(res?.message || "Purchase cancelled or failed"));
          }
        },
      });
    } catch (e) {
      onError(e);
    }
  } else {
    // Simulated browser fallback for testing outside Median environment
    const proceed = confirm(
      `[Google Play In-App Billing]\nConfirm test simulated purchase for tier:\n${tierId}?`
    );
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
  onError: (err: any) => void
) => {
  if (typeof window === "undefined") {
    onError(new Error("Window object unavailable"));
    return;
  }

  const w = window as unknown as {
    median?: {
      admob?: {
        rewarded?: {
          show?: (opts: { callback?: (res: any) => void }) => void;
        };
      };
    };
    Median?: {
      admob?: {
        rewarded?: {
          show?: (opts: { callback?: (res: any) => void }) => void;
        };
      };
    };
  };

  const admobRewarded = w.median?.admob?.rewarded || w.Median?.admob?.rewarded;

  if (admobRewarded && typeof admobRewarded.show === "function") {
    try {
      admobRewarded.show({
        callback: (res: any) => {
          if (res?.rewarded || res?.success || res?.status === "completed") {
            onRewarded();
          } else {
            onError(new Error(res?.message || "Ad did not complete"));
          }
        },
      });
    } catch (e) {
      onError(e);
    }
  } else {
    // Simulated ad playback for web preview
    const proceed = confirm(
      "[AdMob Rewarded Video Ad]\nSimulate watching a 30-second rewarded sponsor ad to unlock +1 Wallpaper Slot for 24 hours?"
    );
    if (proceed) {
      onRewarded();
    } else {
      onError(new Error("Ad viewing cancelled"));
    }
  }
};
