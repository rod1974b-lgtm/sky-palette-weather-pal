// src/components/AiGalleryModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  getAllAvailableArtworks,
  LANDMARK_TITLES,
  LANDMARK_WATERCOLORS,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";
import {
  type SavedItem,
  getSavedArtworks,
  saveSavedArtworks,
  applyCustomWallpaper,
  clearAllArtworksFromDB,
} from "@/lib/wallpaperStorage";
import { showRewardedAdViaMedian } from "@/lib/monetization";
import { PaymentModal } from "@/components/PaymentModal";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";
import type { Place } from "@/lib/weather";

export interface AiGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlace?: Place | undefined;
  city?: string | undefined;
  cityName?: string | undefined;
  currentCity?: string | undefined;
  country?: string | undefined;
  weatherCode?: number | undefined;
  currentWeatherCode?: number | undefined;
  weatherDesc?: string | undefined;
  onSelectBackground?: ((url: string) => void | Promise<void>) | undefined;
  onSelectBg?: ((url: string) => void | Promise<void>) | undefined;
  onApplyBackground?: ((url: string) => void | Promise<void>) | undefined;
  onApplyArtwork?: ((artworkUrl: string) => void) | undefined;
  onOpenPaymentModal?: (() => void) | undefined;
}

export interface UserSlotLimits {
  citySlots: number;
  aiSlots: number;
  baseSlots: number;
  isUnlimited: boolean;
  hasAdBonus: boolean;
  adHoursLeft: number;
  tierLevel: number;
}

export function getUserSlotLimits(): UserSlotLimits {
  if (typeof window === "undefined") {
    return {
      citySlots: 1,
      aiSlots: 1,
      baseSlots: 1,
      isUnlimited: false,
      hasAdBonus: false,
      adHoursLeft: 0,
      tierLevel: 0,
    };
  }

  const isPartyVip = localStorage.getItem("weather:monetization:party_pack_root_beer_tier") === "true";
  const isLarge = localStorage.getItem("weather:monetization:large_root_beer_tier") === "true";
  const isMedium = localStorage.getItem("weather:monetization:medium_root_beer_tier") === "true";
  const isSmall = localStorage.getItem("weather:monetization:small_root_beer_tier") === "true";

  let baseSlots = 1;
  let isUnlimited = false;
  let tierLevel = 0;

  if (isPartyVip) {
    tierLevel = 4;
    isUnlimited = true;
    baseSlots = 999;
  } else if (isLarge) {
    tierLevel = 3;
    baseSlots = 6;
  } else if (isMedium) {
    tierLevel = 2;
    baseSlots = 4;
  } else if (isSmall) {
    tierLevel = 1;
    baseSlots = 2;
  }

  let hasAdBonus = false;
  let adHoursLeft = 0;
  try {
    const adTimestamp = localStorage.getItem("weather:gallery-ad-bonus-time");
    if (adTimestamp) {
      const elapsed = Date.now() - parseInt(adTimestamp, 10);
      const remainingMs = 24 * 60 * 60 * 1000 - elapsed;
      if (remainingMs > 0) {
        hasAdBonus = true;
        adHoursLeft = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));
      } else {
        localStorage.removeItem("weather:gallery-ad-bonus-time");
      }
    }
  } catch {}

  const effectiveAiSlots = isUnlimited ? 999 : baseSlots + (hasAdBonus ? 1 : 0);
  const effectiveCitySlots = isUnlimited ? 999 : 1 + (hasAdBonus ? 1 : 0);

  return {
    citySlots: effectiveCitySlots,
    aiSlots: effectiveAiSlots,
    baseSlots,
    isUnlimited,
    hasAdBonus,
    adHoursLeft,
    tierLevel,
  };
}

function getTierFullName(tierLevel: number, t: TFunction): string {
  switch (tierLevel) {
    case 4:
      return `🎉 ${t("tier_party_vip", "Party Pack VIP (Unlimited Slots & Ad-Free Forever)")}`;
    case 3:
      return `👑 ${t("tier_large", "Large Root Beer Tier (6 Slots + 1 Year Ad-Free)")}`;
    case 2:
      return `🌟 ${t("tier_medium", "Medium Root Beer Tier (4 Slots + 30 Days Ad-Free)")}`;
    case 1:
      return `🍺 ${t("tier_small", "Small Root Beer Tier (2 Permanent Slots)")}`;
    default:
      return `🆓 ${t("tier_free", "Free Tier (1 Slot + Watch Ad for +1 Slot / 24h)")}`;
  }
}

function getTierShortName(tierLevel: number, t: TFunction): string {
  switch (tierLevel) {
    case 4:
      return t("tier_short_party", "Party VIP (Unlimited)");
    case 3:
      return t("tier_short_large", "Large Tier (6 Slots)");
    case 2:
      return t("tier_short_medium", "Medium Tier (4 Slots)");
    case 1:
      return t("tier_short_small", "Small Tier (2 Slots)");
    default:
      return t("tier_short_free", "Free Tier (1 Slot)");
  }
}

function compressImageDataUrl(dataUrl: string, maxDim = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl.startsWith("data:")) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const webp = canvas.toDataURL("image/webp", quality);
        if (webp.startsWith("data:image/webp")) return resolve(webp);
      } catch {}

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const FALLBACK_STYLES = [
  "classical transparent watercolor, luminous glazes, soft paper blooms",
  "bold contemporary ink & watercolor wash, vibrant pigments",
  "delicate Japanese mokuhanga watercolor, atmospheric mist",
  "dramatic stormy watercolor wash, granulating pigments, dynamic sky",
];

export function AiGalleryModal({
  isOpen,
  onClose,
  currentPlace,
  city,
  cityName,
  currentCity,
  weatherCode,
  currentWeatherCode,
  weatherDesc,
  country,
  onSelectBackground,
  onSelectBg,
  onApplyBackground,
  onApplyArtwork,
  onOpenPaymentModal,
}: AiGalleryModalProps) {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<"slots" | "curated" | "ai">("slots");
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);
  const [slotLimits, setSlotLimits] = useState<UserSlotLimits>(getUserSlotLimits);
  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [curatedArts, setCuratedArts] = useState<SavedItem[]>([]);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [paymentModalTier, setPaymentModalTier] = useState<string | null>(null);

  // AI Generation Form States
  const [customPrompt, setCustomPrompt] = useState("");
  const [customStyle, setCustomStyle] = useState(FALLBACK_STYLES[0]);
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search filter for curated tab
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedUrl, setAppliedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCity = currentPlace?.name || currentCity || cityName || city || "Bangkok";
  const activeCountry = currentPlace?.country || country || "Thailand";
  const activeCode = currentWeatherCode ?? weatherCode ?? 0;

  // Refresh slot limits & load IndexedDB saved slots whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSlotLimits(getUserSlotLimits());
      getSavedArtworks()
        .then((items) => setSavedArtworks(items))
        .catch(() => {});
    }
  }, [isOpen]);

  // Load curated landmarks
  useEffect(() => {
    if (isOpen) {
      const cityKey = activeCity.toLowerCase().trim();
      let cityCatalogUrls: string[] = [];
      for (const [name, urls] of Object.entries(LANDMARK_WATERCOLORS)) {
        if (cityKey.includes(name)) {
          cityCatalogUrls = urls;
          break;
        }
      }

      const rawList =
        cityCatalogUrls.length > 0
          ? cityCatalogUrls
          : getAllAvailableArtworks(activeCity, activeCode, weatherDesc ?? "clear", activeCountry);

      const normalized = (rawList || [])
        .map((item: any, idx: number) => {
          const url = typeof item === "string" ? item : item?.url || "";
          if (!url) return null;
          return {
            id: `curated-${activeCity}-${idx}-${url.slice(-15)}`,
            url,
            title: getArtworkTitle(url, activeCity, idx),
            city: activeCity,
            timestamp: Date.now(),
          } as SavedItem;
        })
        .filter(Boolean) as SavedItem[];

      setCuratedArts(normalized);
    }
  }, [isOpen, activeCity, activeCode, weatherDesc, activeCountry]);

  const getArtworkTitle = (url: string, cName: string, index: number): string => {
    const cityKey = cName.toLowerCase().trim();
    if (LANDMARK_TITLES[cityKey] && LANDMARK_TITLES[cityKey][index]) {
      return LANDMARK_TITLES[cityKey][index];
    }
    const cleanCity = cName.charAt(0).toUpperCase() + cName.slice(1);
    const styles = ["Skyline at Dawn", "Historic Center", "Atmospheric Sunset", "Old Town Harbor"];
    return `${cleanCity} — ${styles[index % styles.length]}`;
  };

  const handleApply = (url: string) => {
    try {
      applyCustomWallpaper(activeCity, activeCity, url);
      setAppliedUrl(url);
      if (onApplyBackground) onApplyBackground(url);
      if (onSelectBackground) onSelectBackground(url);
      if (onSelectBg) onSelectBg(url);
      if (onApplyArtwork) onApplyArtwork(url);
    } catch {}
  };

  const handleSaveArtworkToSlot = async (slotIndex: number, item: SavedItem) => {
    const updated = [...savedArtworks];
    updated[slotIndex] = item;
    setSavedArtworks(updated);
    await saveSavedArtworks(updated);
  };

  const handleDeleteArtworkFromSlot = async (slotIndex: number) => {
    const updated = [...savedArtworks];
    updated.splice(slotIndex, 1);
    setSavedArtworks(updated);
    await saveSavedArtworks(updated);
  };

  const handleWatchRewardedAd = () => {
    if (slotLimits.hasAdBonus) {
      alert(
        t(
          "alert_ad_already_active",
          `You already have an active Ad Slot (+1 slot) for ${slotLimits.adHoursLeft} more hours!`,
          { hours: slotLimits.adHoursLeft }
        )
      );
      return;
    }

    setIsWatchingAd(true);

    showRewardedAdViaMedian(
      () => {
        try {
          localStorage.setItem("weather:gallery-ad-bonus-time", Date.now().toString());
          setSlotLimits(getUserSlotLimits());
          alert(
            t(
              "alert_ad_watched_success",
              "🎉 Ad complete! +1 Temporary Slot unlocked for the next 24 hours. Support with Root Beer to keep it permanently!"
            )
          );
        } catch {}
        setIsWatchingAd(false);
      },
      (err) => {
        setIsWatchingAd(false);
        if (err?.message) {
          alert(err.message);
        }
      }
    );
  };

  const handleDownloadArt = (item: SavedItem, slotNum: number) => {
    try {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = `${activeCity.toLowerCase().replace(/\s+/g, "-")}-slot-${slotNum}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!slotLimits.isUnlimited && targetSlotIndex >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `Slot ${targetSlotIndex + 1} is locked. Watch an ad or upgrade with Root Beer to unlock it!`,
          { slot: targetSlotIndex + 1 }
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const src = ev.target?.result as string;
        const compressed = await compressImageDataUrl(src, 1024, 0.82);
        const newItem: SavedItem = {
          id: `upload-${Date.now()}`,
          url: compressed,
          title: `${activeCity} — ${file.name.slice(0, 24)}`,
          city: activeCity,
          timestamp: Date.now(),
        };

        const updated = [...savedArtworks];
        updated[targetSlotIndex] = newItem;
        setSavedArtworks(updated);
        await saveSavedArtworks(updated);
        handleApply(compressed);
        setActiveTab("slots");
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiScene = async () => {
    if (!customPrompt.trim()) {
      setErrorMessage(t("error_prompt_empty", "Please describe the watercolor scene first."));
      return;
    }

    if (!slotLimits.isUnlimited && targetSlotIndex >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `Slot ${targetSlotIndex + 1} is locked. Watch an ad or upgrade with Root Beer to unlock it!`,
          { slot: targetSlotIndex + 1 }
        )
      );
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const fullPrompt = `${customPrompt.trim()}, ${customStyle}, ${timeOfDay} light, watercolor on textured paper`;
      const res = await generateWatercolorFn({
        data: {
          city: activeCity,
          userPrompt: fullPrompt,
          weatherDesc: "fluid watercolor painting, soft vibrant atmospheric wash",
        },
      });

      if (res?.imageUrl) {
        const optimizedUrl = await compressImageDataUrl(res.imageUrl, 1024, 0.82);
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: optimizedUrl,
          title: `${activeCity} — ${customPrompt.slice(0, 28)}`,
          city: activeCity,
          timestamp: Date.now(),
        };

        const updated = [...savedArtworks];
        updated[targetSlotIndex] = newItem;
        setSavedArtworks(updated);
        await saveSavedArtworks(updated);
        handleApply(optimizedUrl);
        setCustomPrompt("");
        setActiveTab("slots");
      } else {
        setErrorMessage(t("error_generate_failed", "Failed to generate artwork. Please try again."));
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t("error_generation_generic", "An error occurred during generation."));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const filteredCurated = curatedArts.filter((item) =>
    searchQuery === ""
      ? true
      : item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden text-card-foreground animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Localized City and Country */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/60 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {t("gallery_title", "Watercolor Art Gallery & Slots")}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {getLocalizedCity(activeCity, i18n.language)}
                {activeCountry ? `, ${getLocalizedCountry(activeCountry, i18n.language)}` : ""} •{" "}
                {t("gallery_subtitle", "Manage wallpaper slots, watch ads for bonus slots, and paint with AI")}
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

        {/* Tier Status & Ad Bonus Header Bar */}
        <div className="p-3 sm:px-6 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">
                {t("gallery_tier_label", "Your Plan:")}{" "}
                <span className="text-amber-500 dark:text-amber-400">
                  {getTierFullName(slotLimits.tierLevel, t)}
                </span>
              </span>

              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                {slotLimits.isUnlimited ? t("slot_unlimited", "Unlimited") : `${slotLimits.aiSlots} Slots`}
              </span>

              {slotLimits.hasAdBonus && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                  🎁 {t("gallery_ad_bonus_active", "Ad Bonus Active:")} +1 slot ({slotLimits.adHoursLeft}h left)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!slotLimits.hasAdBonus && !slotLimits.isUnlimited && (
              <button
                type="button"
                onClick={handleWatchRewardedAd}
                disabled={isWatchingAd}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isWatchingAd ? "⏳ " + t("btn_watching_ad", "Watching...") : "📺 " + t("btn_watch_ad_bonus", "Watch Ad (+1 Slot / 24h)")}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onOpenPaymentModal) onOpenPaymentModal();
                else setPaymentModalTier("small_root_beer_tier");
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-105 shadow-xs transition cursor-pointer"
            >
              ⚡ {t("btn_unlock_more_slots", "Unlock More Slots")}
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-4 sm:px-6 border-b border-border/60 bg-muted/20 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "slots"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🖼️</span>
            <span>{t("tab_your_slots", "Your Wallpaper Slots")}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
              {savedArtworks.filter(Boolean).length}/6
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "curated"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🏛️</span>
            <span>{t("tab_curated_landmarks", "Curated Landmarks")}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-normal">
              {curatedArts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>✨</span>
            <span>{t("tab_ai_generator", "AI Watercolor Studio")}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
              Target Slot {targetSlotIndex + 1}
            </span>
          </button>
        </div>

        {/* TAB 1: WALLPAPER SLOTS GRID */}
        {activeTab === "slots" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t(
                  "subheading_click_slot_target",
                  "Tap any unlocked slot to target it for new AI watercolor art or photo uploads."
                )}
              </p>
              <span className="text-xs font-medium text-amber-500">
                {getTierShortName(slotLimits.tierLevel, t)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                const slotNum = slotIdx + 1;
                const isUnlocked = slotLimits.isUnlimited || slotIdx < slotLimits.aiSlots;
                const item = savedArtworks[slotIdx];
                const isTargeted = targetSlotIndex === slotIdx;

                let tierRequired = "Free";
                let tierCode = "small_root_beer_tier";
                if (slotIdx === 1) {
                  tierRequired = slotLimits.hasAdBonus ? t("slot_ad_active", "Ad Bonus Active") : t("slot_small_or_ad", "Ad or Small Tier ($1)");
                  tierCode = "small_root_beer_tier";
                } else if (slotIdx >= 2 && slotIdx <= 3) {
                  tierRequired = t("slot_medium_tier", "Medium Tier ($3)");
                  tierCode = "medium_root_beer_tier";
                } else if (slotIdx >= 4) {
                  tierRequired = t("slot_large_tier", "Large Tier ($5)");
                  tierCode = "large_root_beer_tier";
                }

                return (
                  <div
                    key={slotIdx}
                    onClick={() => {
                      if (isUnlocked) {
                        setTargetSlotIndex(slotIdx);
                      } else {
                        setPaymentModalTier(tierCode);
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                      isTargeted && isUnlocked
                        ? "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
                        : isUnlocked
                        ? "border-border/80 bg-card hover:bg-muted/40 hover:border-border"
                        : "border-border/40 bg-muted/20 opacity-75 hover:opacity-100 hover:border-amber-500/40"
                    }`}
                  >
                    {/* Slot Header */}
                    <div className="p-3 flex items-center justify-between border-b border-border/50 text-xs">
                      <span className="font-bold flex items-center gap-1.5">
                        {isUnlocked ? "🎨" : "🔒"} {t("slot_label", "Slot")} {slotNum}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isUnlocked
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {isUnlocked ? t("status_unlocked", "Unlocked") : tierRequired}
                      </span>
                    </div>

                    {/* Slot Content Preview */}
                    <div className="p-3 flex-1 flex flex-col items-center justify-center min-h-[140px]">
                      {item?.url ? (
                        <div className="w-full space-y-1.5">
                          <div className="relative group rounded-xl overflow-hidden aspect-video bg-muted border border-border/50">
                            <img
                              src={item.url}
                              alt={item.title || `Slot ${slotNum}`}
                              className="w-full h-full object-cover transition group-hover:scale-105"
                            />
                            {appliedUrl === item.url && (
                              <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                ✓ Applied
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-foreground truncate" title={item.title}>
                            {item.title}
                          </p>
                        </div>
                      ) : isUnlocked ? (
                        <div className="text-center py-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-1.5 text-base font-bold text-muted-foreground">
                            +
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {t("slot_empty_cta", "Empty Slot")} {slotNum}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {isTargeted
                              ? `🎯 ${t("slot_active_target", "Active target for new art")}`
                              : t("slot_tap_to_target", "Tap to target for new art")}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-1.5 text-base text-muted-foreground">
                            🔒
                          </div>
                          <p className="text-xs font-bold text-muted-foreground">
                            {t("slot_locked_title", "Slot Locked")}
                          </p>
                          <p className="text-[10px] text-amber-500/90 mt-0.5">
                            {slotIdx === 1
                              ? t("slot_unlock_ad_or_small", "Watch ad or unlock for $1")
                              : t("slot_tap_to_unlock", "Tap to unlock with Root Beer")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Slot Actions Footer */}
                    <div className="p-2.5 bg-muted/40 border-t border-border/50 flex items-center justify-between text-xs">
                      {item?.url ? (
                        <div className="flex items-center gap-1.5 w-full justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(item.url);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs transition active:scale-95 cursor-pointer"
                          >
                            ✓ {t("btn_apply_wallpaper", "Apply")}
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadArt(item, slotNum);
                              }}
                              className="p-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition"
                              title={t("btn_download", "Download")}
                            >
                              💾
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteArtworkFromSlot(slotIdx);
                              }}
                              className="p-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition"
                              title={t("btn_delete", "Delete")}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : isUnlocked ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetSlotIndex(slotIdx);
                            setActiveTab("ai");
                          }}
                          className={`w-full py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                            isTargeted
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          }`}
                        >
                          {isTargeted ? `✓ ${t("btn_targeted", "Target Selected")}` : `+ ${t("btn_paint_with_ai", "Paint with AI")}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModalTier(tierCode);
                          }}
                          className="w-full py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold transition text-xs border border-amber-500/30 cursor-pointer"
                        >
                          ⚡ {t("btn_unlock_slot", "Unlock Slot")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CURATED CITY LANDMARKS */}
        {activeTab === "curated" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <p className="text-xs text-muted-foreground">
                {t("subheading_curated_desc", "Authentic watercolors curated for this city and surrounding regions.")}
              </p>
              <input
                type="text"
                placeholder={t("placeholder_search_art", "Search artwork...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs rounded-xl border border-input/60 bg-background/80 px-3 py-1.5 w-full sm:w-48 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCurated.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-border transition flex flex-col justify-between"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden group">
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover transition group-hover:scale-105"
                    />
                    {appliedUrl === item.url && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                        ✓ Applied Live
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{getLocalizedCity(item.city || activeCity, i18n.language)}</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => handleApply(item.url)}
                        className="flex-1 py-1 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold text-xs transition cursor-pointer"
                      >
                        ✓ {t("btn_apply_wallpaper", "Apply")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveArtworkToSlot(targetSlotIndex, item)}
                        className="px-2.5 py-1 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition cursor-pointer"
                        title={`Save into Slot ${targetSlotIndex + 1}`}
                      >
                        💾 Slot {targetSlotIndex + 1}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AI WATERCOLOR STUDIO */}
        {activeTab === "ai" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <span>✨</span>
                  <span>
                    {t(
                      "label_describe_watercolor",
                      `Painting into Slot ${targetSlotIndex + 1} for ${getLocalizedCity(activeCity, i18n.language)}`,
                      { slot: targetSlotIndex + 1, city: getLocalizedCity(activeCity, i18n.language) }
                    )}
                  </span>
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generates an atmospheric 1024×1024 watercolor scenery saved directly into Slot {targetSlotIndex + 1}.
                </p>
              </div>

              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-muted font-bold">
                Slot {targetSlotIndex + 1} {targetSlotIndex < slotLimits.aiSlots ? "✓ Unlocked" : "🔒 Locked"}
              </span>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-destructive space-y-1">
                <p className="font-bold">Notice</p>
                <p className="text-[11px]">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">
                Scene Description:
              </label>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={`e.g., An ancient pagoda overlooking the mist in ${getLocalizedCity(activeCity, i18n.language)}, glowing lantern reflections, gentle watercolor wash...`}
                className="w-full text-xs rounded-xl border border-input/60 bg-background/80 p-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Style Wash:</label>
                <select
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-input/60 bg-background/80 p-2 focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  {FALLBACK_STYLES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Atmospheric Light:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["day", "sunset", "night"] as const).map((tod) => (
                    <button
                      key={tod}
                      type="button"
                      onClick={() => setTimeOfDay(tod)}
                      className={`py-1.5 rounded-xl border font-bold capitalize transition cursor-pointer ${
                        timeOfDay === tod
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tod}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleUploadPhoto}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold transition border border-border/60 cursor-pointer"
                >
                  📁 Upload Photo for Slot {targetSlotIndex + 1}
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiScene}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold hover:brightness-105 active:scale-95 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? "⏳ " + t("btn_painting", "Painting Scene...") : "✨ " + t("btn_generate_ai", "Paint Watercolor with AI")}
              </button>
            </div>
          </div>
        )}
      </div>

      {paymentModalTier && (
        <PaymentModal
          tierId={paymentModalTier}
          onClose={() => {
            setPaymentModalTier(null);
            setSlotLimits(getUserSlotLimits());
          }}
        />
      )}
    </div>
  );
}

export default AiGalleryModal;
