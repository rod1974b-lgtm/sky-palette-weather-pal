// src/lib/proStatus.ts
import { useState, useEffect, useCallback } from "react";

export interface ProPackageStatus {
  isUnlocked: boolean;
  tier: string;
  tierId: string;
  slots: number | "Unlimited";
  effectiveSlots: number;
  adFree: boolean;
  adFreeDesc: string;
  plan: string;
  until: string | null;
  isLifetime: boolean;
}

export function readProPackage(): ProPackageStatus {
  if (typeof window === "undefined") {
    return {
      isUnlocked: false,
      tier: "Free",
      tierId: "",
      slots: 1,
      effectiveSlots: 1,
      adFree: false,
      adFreeDesc: "",
      plan: "",
      until: null,
      isLifetime: false,
    };
  }

  try {
    const proTier = localStorage.getItem("weather:pro_tier");
    const proSlotsRaw = localStorage.getItem("weather:pro_slots");
    const proAdFreeRaw = localStorage.getItem("weather:pro_adfree");
    const proTierId = localStorage.getItem("weather:pro_tier_id") || "";
    const proUntil = localStorage.getItem("weather:pro_until");
    const adFreeRaw = localStorage.getItem("weather:adfree");
    const proLifetime = localStorage.getItem("weather:pro_lifetime") === "true";

    // Ad-free check: true if weather:adfree is "true" or pro_until is in the future
    let adFree = adFreeRaw === "true";
    if (proUntil) {
      const untilDate = new Date(proUntil);
      if (!isNaN(untilDate.getTime()) && untilDate.getTime() > Date.now()) {
        adFree = true;
      }
    }

    // Default slots
    let slots: number | "Unlimited" = 1;
    if (proSlotsRaw) {
      if (proSlotsRaw.toLowerCase() === "unlimited") {
        slots = "Unlimited";
      } else {
        const parsed = parseInt(proSlotsRaw, 10);
        slots = isNaN(parsed) ? 1 : parsed;
      }
    }

    // Specific rules:
    // - Small: 2 slots, ads still on
    // - Medium: 4 slots, ads off for 30 days
    // - Large: 6 slots, ads off for 365 days
    // - Party Pack: Unlimited slots, ads off forever
    const lowerTier = (proTier || "").toLowerCase();
    const isSmall = lowerTier.includes("small") || proTierId.includes("small");
    const isMedium = lowerTier.includes("medium") || proTierId.includes("medium");
    const isLarge = lowerTier.includes("large") || proTierId.includes("large");
    const isParty = lowerTier.includes("party") || proTierId.includes("party") || proLifetime;

    if (isParty) {
      slots = "Unlimited";
      adFree = true;
    } else if (isLarge) {
      slots = 6;
      adFree = true;
    } else if (isMedium) {
      slots = 4;
      adFree = true;
    } else if (isSmall) {
      slots = 2;
      adFree = false; // Ads still on for Small
    }

    const isUnlocked =
      Boolean(proTier && proTier !== "Free") ||
      proLifetime ||
      slots === "Unlimited" ||
      (typeof slots === "number" && slots > 1);

    const effectiveSlots = slots === "Unlimited" ? 999 : Number(slots);

    return {
      isUnlocked,
      tier: proTier || (isUnlocked ? "Supporter" : "Free"),
      tierId: proTierId,
      slots,
      effectiveSlots,
      adFree,
      adFreeDesc: proAdFreeRaw || (adFree ? (isParty ? "FOREVER" : "Active") : "Standard ads"),
      plan: localStorage.getItem("weather:pro_plan") || "",
      until: proUntil,
      isLifetime: isParty,
    };
  } catch {
    return {
      isUnlocked: false,
      tier: "Free",
      tierId: "",
      slots: 1,
      effectiveSlots: 1,
      adFree: false,
      adFreeDesc: "",
      plan: "",
      until: null,
      isLifetime: false,
    };
  }
}

export function useProStatus() {
  const [status, setStatus] = useState<ProPackageStatus>(readProPackage);

  const refresh = useCallback(() => {
    setStatus(readProPackage());
  }, []);

  useEffect(() => {
    refresh();

    const handleUnlock = () => {
      refresh();
    };

    window.addEventListener("weather:pro-unlocked", handleUnlock);
    window.addEventListener("storage", handleUnlock);

    return () => {
      window.removeEventListener("weather:pro-unlocked", handleUnlock);
      window.removeEventListener("storage", handleUnlock);
    };
  }, [refresh]);

  return { ...status, refresh };
}
