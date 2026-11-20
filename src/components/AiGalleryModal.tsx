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

export interface AiGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  city?: string;
  cityName?: string;
  currentCity?: string;
  country?: string;
  weatherCode?: number;
  currentWeatherCode?: number;
  weatherDesc?: string;
  onSelectBackground?: (url: string) => void | Promise<void>;
  onSelectBg?: (url: string) => void | Promise<void>;
  onApplyBackground?: (url: string) => void | Promise<void>;
  onApplyArtwork?: (artworkUrl: string) => void;
  onOpenPaymentModal?: () => void;
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

  const isParty =
    localStorage.getItem("thankyou_unlocked_party_pack_root_beer_tier") === "true" ||
    localStorage.getItem("weather:is_party_pack") === "true" ||
    localStorage.getItem("weather:ad_free_forever") === "true";
  const isLarge =
    localStorage.getItem("thankyou_unlocked_large_root_beer_tier") === "true";
  const isMedium =
    localStorage.getItem("thankyou_unlocked_medium_root_beer_tier") === "true";
  const isSmall =
    localStorage.getItem("thankyou_unlocked_small_root_beer_tier") === "true";

  let tierLevel = 0;
  let baseSlots = 1;
  let isUnlimited = false;

  if (isParty) {
    tierLevel = 4;
    baseSlots = 999;
    isUnlimited = true;
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
      return t("tier_party_vip", "Party Pack VIP (Unlimited Slots & Ad-Free Forever)");
    case 3:
      return t("tier_large", "Large Root Beer Tier (6 Slots + 1 Year Ad-Free)");
    case 2:
      return t("tier_medium", "Medium Root Beer Tier (4 Slots + 30 Days Ad-Free)");
    case 1:
      return t("tier_small", "Small Root Beer Tier (2 Permanent Slots)");
    default:
      return t("tier_free", "Free Tier (1 Permanent Slot)");
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
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const FALLBACK_STYLES = [
  "watercolor painting",
  "vibrant colors, soft edges",
  "golden hour sunlight",
  "misty rain atmosphere",
  "traditional ink and wash",
  "impressionist brushstrokes",
];

export function AiGalleryModal({
  isOpen,
  onClose,
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
  const { t } = useTranslation();

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

  const activeCity = currentCity || cityName || city || "Bangkok";
  const activeCode = currentWeatherCode ?? weatherCode ?? 0;

  // Refresh slot limits & load IndexedDB saved slots whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSlotLimits(getUserSlotLimits());
      getSavedArtworks()
        .then((items) => setSavedArtworks(items))
        .catch(() => {});

      try {
        const currentHero = localStorage.getItem("weather:custom-hero-art");
        if (currentHero) setAppliedUrl(currentHero);
      } catch {}
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
          : getAllAvailableArtworks(activeCity, activeCode, weatherDesc ?? "clear", country);

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
  }, [isOpen, activeCity, activeCode, weatherDesc, country]);

  const getArtworkTitle = (url: string, cName: string, index: number): string => {
    const cityKey = cName.toLowerCase().trim();
    if (LANDMARK_TITLES[cityKey] && LANDMARK_TITLES[cityKey][index]) {
      return LANDMARK_TITLES[cityKey][index];
    }
    const cleanCity = cName.charAt(0).toUpperCase() + cName.slice(1);
    const styles = ["Watercolor View", "Morning Light", "Heritage Landmark", "Evening Skyline"];
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
    } catch (e) {
      console.error("Failed to apply custom wallpaper:", e);
    }
  };

  const handleSelectTargetSlot = (slotIndex: number) => {
    setTargetSlotIndex(slotIndex);
  };

  const handleWatchAd = () => {
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
        } finally {
          setIsWatchingAd(false);
        }
      },
      (err) => {
        setIsWatchingAd(false);
        alert(err?.message || "Failed to load rewarded video ad. Please try again.");
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

  const handleDeleteSlot = async (index: number) => {
    const slotNum = index + 1;
    if (confirm(t("confirm_delete_slot", `Delete artwork in Slot ${slotNum}?`, { slot: slotNum }))) {
      const updated = [...savedArtworks];
      updated.splice(index, 1);
      setSavedArtworks(updated);
      await saveSavedArtworks(updated);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!slotLimits.isUnlimited && targetSlotIndex >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `Slot ${targetSlotIndex + 1} is locked. Watch an ad for +1 slot (24h) or upgrade with Root Beer!`,
          { slot: targetSlotIndex + 1 }
        )
      );
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
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
        setActiveTab("slots");
      };
      reader.readAsDataURL(file);
    } catch {
      alert("Failed to process photo upload.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateAiScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    if (!slotLimits.isUnlimited && targetSlotIndex >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `Slot ${targetSlotIndex + 1} is locked. Watch an ad for +1 slot (24h) or upgrade with Root Beer to unlock it permanently!`,
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
        setActiveTab("slots");
      } else {
        throw new Error(res?.error || "AI generation failed. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate AI artwork.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBookmarkCuratedToSlot = async (art: SavedItem) => {
    if (!slotLimits.isUnlimited && targetSlotIndex >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `Slot ${targetSlotIndex + 1} is locked. Watch an ad for +1 slot (24h) or upgrade with Root Beer!`,
          { slot: targetSlotIndex + 1 }
        )
      );
      return;
    }

    const newItem: SavedItem = {
      ...art,
      id: `slot-${Date.now()}-${targetSlotIndex}`,
      timestamp: Date.now(),
    };
    const updated = [...savedArtworks];
    updated[targetSlotIndex] = newItem;
    setSavedArtworks(updated);
    await saveSavedArtworks(updated);
    alert(t("toast_artwork_saved", `Artwork saved to Slot ${targetSlotIndex + 1}!`, { slot: targetSlotIndex + 1 }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-3xl border border-white/20 bg-card text-card-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/60 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                {t("gallery_title", "Watercolor Art Gallery & Slots")}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {activeCity} • {t("gallery_subtitle", "Manage wallpaper slots, watch ads for bonus slots, and paint with AI")}
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

              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-foreground">
                🖼️ {t("gallery_slots_available", "Active Slots:")}{" "}
                <strong>{slotLimits.isUnlimited ? t("slot_unlimited", "Unlimited") : slotLimits.aiSlots}</strong>
              </span>

              {slotLimits.hasAdBonus && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  🎁 {t("gallery_ad_bonus_active", "Ad Bonus Active:")} +1 slot ({slotLimits.adHoursLeft}h left)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!slotLimits.hasAdBonus && !slotLimits.isUnlimited && (
              <button
                type="button"
                onClick={handleWatchAd}
                disabled={isWatchingAd}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-background hover:bg-muted text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isWatchingAd ? "⏳" : "📺"}</span>
                <span>{isWatchingAd ? t("btn_watching_ad", "Watching...") : t("btn_watch_ad_bonus", "Watch Ad (+1 Slot / 24h)")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPaymentModalTier("small_root_beer_tier")}
              className="text-xs font-black px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{t("btn_unlock_more_slots", "Upgrade Slots")}</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("slots")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "slots"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🖼️</span>
              <span>{t("heading_saved_wallpaper_slots", "Wallpaper Slots")} (6)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("curated")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "curated"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>🏛️</span>
              <span>{t("city_wallpapers", "Curated Landmarks")} ({curatedArts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === "ai"
                  ? "bg-background text-foreground shadow-xs font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>✨</span>
              <span>{t("ai_generated", "AI Studio")}</span>
            </button>
          </div>

          {activeTab === "slots" && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition cursor-pointer"
              >
                📁 {t("upload_photo", "Upload Photo")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Visual Wallpaper Slots Grid (6 Slots) */}
        {activeTab === "slots" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t(
                  "subheading_click_slot_target",
                  "Tap any unlocked slot to target it for painting. Tap Apply to set as your live wallpaper."
                )}
              </span>
              <span className="font-bold text-primary">
                {t("studio_target_label", `Target: Slot ${targetSlotIndex + 1}`, { slot: targetSlotIndex + 1 })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                const slotNumber = slotIdx + 1;
                const isUnlocked = slotLimits.isUnlimited || slotIdx < slotLimits.aiSlots;
                const item = savedArtworks[slotIdx];
                const isTargeted = targetSlotIndex === slotIdx;
                const isApplied = item && appliedUrl === item.url;

                let tierRequired = "Free";
                let tierCode = "small_root_beer_tier";
                if (slotIdx === 1) {
                  tierRequired = slotLimits.hasAdBonus
                    ? t("slot_ad_active", "Ad Bonus Active")
                    : t("slot_small_or_ad", "Ad or Small Tier ($1)");
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
                        handleSelectTargetSlot(slotIdx);
                      } else if (slotIdx === 1 && !slotLimits.hasAdBonus) {
                        if (confirm("Slot 2 can be unlocked for 24h by watching an ad, or permanently with Small Root Beer ($1). Watch ad now?")) {
                          handleWatchAd();
                        } else {
                          setPaymentModalTier(tierCode);
                        }
                      } else {
                        setPaymentModalTier(tierCode);
                      }
                    }}
                    className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                      isTargeted && isUnlocked
                        ? "ring-2 ring-primary border-primary bg-card shadow-lg"
                        : isUnlocked
                        ? "border-border/80 bg-card/60 hover:border-primary/60 hover:bg-card"
                        : "border-border/40 bg-muted/20 opacity-75 hover:opacity-100 hover:border-amber-500/50"
                    }`}
                  >
                    {/* Slot Header */}
                    <div className="p-3 flex items-center justify-between border-b border-border/50 text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        {isUnlocked ? "🎨" : "🔒"} {t("slot_label", "Slot")} {slotNumber}
                        {isTargeted && isUnlocked && (
                          <span className="text-[10px] text-primary font-bold">
                            ({t("slot_active_target", "Active Target")})
                          </span>
                        )}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isUnlocked
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {isUnlocked ? t("status_unlocked", "Unlocked") : tierRequired}
                      </span>
                    </div>

                    {/* Slot Preview Body */}
                    <div className="relative aspect-16/10 w-full bg-muted/40 overflow-hidden flex items-center justify-center">
                      {item ? (
                        <>
                          <img
                            src={item.url}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-300 hover:scale-105"
                          />
                          {isApplied && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-md">
                              ✓ {t("applied", "Active Live Wallpaper")}
                            </span>
                          )}
                        </>
                      ) : isUnlocked ? (
                        <div className="text-center p-4 space-y-1">
                          <span className="text-2xl">🖌️</span>
                          <p className="text-xs font-bold text-foreground">
                            {t("slot_empty_cta", "Empty Slot")} {slotNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {isTargeted
                              ? t("slot_active_target", "Active target for new art")
                              : t("slot_tap_to_target", "Tap to paint or upload here")}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center p-4 space-y-1.5">
                          <span className="text-2xl">🔒</span>
                          <p className="text-xs font-bold text-foreground">
                            {t("slot_locked_title", "Slot Locked")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {slotIdx === 1
                              ? t("slot_unlock_ad_or_small", "Watch ad for 24h or get Small Root Beer ($1)")
                              : t("slot_tap_to_unlock", "Tap to unlock with Root Beer")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Slot Footer Actions */}
                    <div className="p-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                      {item ? (
                        <div className="w-full flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(item.url);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isApplied
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                          >
                            {isApplied ? t("applied", "Applied") : t("apply_wallpaper", "Apply")}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadArt(item, slotNumber);
                              }}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition cursor-pointer"
                              title={t("download", "Download PNG")}
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSlot(slotIdx);
                              }}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted text-xs transition cursor-pointer"
                              title={t("delete", "Delete")}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ) : isUnlocked ? (
                        <div className="w-full flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTargetSlot(slotIdx);
                              setActiveTab("ai");
                            }}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            ✨ {t("paint_with_ai", "Paint with AI")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTargetSlot(slotIdx);
                              fileInputRef.current?.click();
                            }}
                            className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            📁 {t("upload", "Upload Photo")}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (slotIdx === 1 && !slotLimits.hasAdBonus) {
                              handleWatchAd();
                            } else {
                              setPaymentModalTier(tierCode);
                            }
                          }}
                          className="w-full text-center text-xs font-bold text-amber-500 hover:underline cursor-pointer"
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

        {/* Tab 2: Curated Landmarks */}
        {activeTab === "curated" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder={t("search_placeholder", "Filter landmarks by name...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-xs text-xs rounded-xl border border-input/60 bg-background/80 px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                {curatedArts.length} landmarks
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {curatedArts
                .filter((art) => !searchQuery || art.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((art) => {
                  const isApplied = appliedUrl === art.url;

                  return (
                    <div
                      key={art.id}
                      className="group relative flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-muted/20 hover:border-primary/60 transition shadow-xs hover:shadow-md"
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/60">
                        <img
                          src={art.url}
                          alt={art.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {isApplied && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-md">
                            ✓ {t("applied", "Active")}
                          </span>
                        )}
                      </div>

                      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 space-y-1.5">
                        <div className="truncate text-xs font-bold" title={art.title}>
                          {art.title}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleApply(art.url)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
                          >
                            {isApplied ? t("applied", "Applied") : t("apply_wallpaper", "Apply")}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBookmarkCuratedToSlot(art)}
                            className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                            title={`Save to Slot ${targetSlotIndex + 1}`}
                          >
                            ★ Save Slot {targetSlotIndex + 1}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: AI Scene Studio */}
        {activeTab === "ai" && (
          <form
            onSubmit={handleGenerateAiScene}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs"
          >
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <span>✨</span>
                  <span>{t("label_describe_watercolor", `Painting into Slot ${targetSlotIndex + 1} for ${activeCity}`, { slot: targetSlotIndex + 1, city: activeCity })}</span>
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
                placeholder={`e.g., An ancient pagoda overlooking the mist in ${activeCity}, glowing lantern reflections, gentle watercolor wash...`}
                className="w-full text-xs rounded-xl border border-input/60 bg-background/80 p-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Style Wash:</label>
                <select
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-input/60 bg-background/80 p-2"
                >
                  {FALLBACK_STYLES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Lighting & Mood:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["day", "sunset", "night"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimeOfDay(m)}
                      className={`p-2 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                        timeOfDay === m
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !customPrompt.trim()}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? "🖌️ Painting Watercolor with AI..." : `Paint into Slot ${targetSlotIndex + 1} 🖌️`}
            </button>
          </form>
        )}

        {/* Tier Upgrade Modal (Root Beer) */}
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
    </div>
  );
}

export default AiGalleryModal;
