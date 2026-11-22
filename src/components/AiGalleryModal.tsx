// src/components/AiGalleryModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Place } from "@/lib/weather";
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

  const isPartyPack = localStorage.getItem("weather:party-pack-unlocked") === "true";
  const rawTier = localStorage.getItem("weather:paid-tier");
  const parsedTier = rawTier ? Number(rawTier) : 0;
  const tierLevel = isPartyPack ? 4 : parsedTier;

  const bonusExpiry = Number(localStorage.getItem("weather:ad-slot-bonus-expiry") || "0");
  const now = Date.now();
  const hasAdBonus = bonusExpiry > now;
  const adHoursLeft = hasAdBonus ? Math.ceil((bonusExpiry - now) / (1000 * 60 * 60)) : 0;

  if (tierLevel >= 4) {
    return {
      citySlots: 999,
      aiSlots: 999,
      baseSlots: 999,
      isUnlimited: true,
      hasAdBonus: false,
      adHoursLeft: 0,
      tierLevel,
    };
  }

  let base = 1;
  if (tierLevel === 1) base = 2;
  if (tierLevel === 2) base = 4;
  if (tierLevel === 3) base = 6;

  const bonus = hasAdBonus ? 1 : 0;

  return {
    citySlots: base + bonus,
    aiSlots: base + bonus,
    baseSlots: base,
    isUnlimited: false,
    hasAdBonus,
    adHoursLeft,
    tierLevel,
  };
}

export function AiGalleryModal({
  isOpen,
  onClose,
  currentPlace,
  city,
  cityName,
  currentCity,
  country,
  onApplyBackground,
  onSelectBackground,
  onSelectBg,
  onApplyArtwork,
  onOpenPaymentModal,
}: AiGalleryModalProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeCity = currentPlace?.name || city || cityName || currentCity || "Bangkok";
  const activeCountry = currentPlace?.country || country || "Thailand";

  const [activeTab, setActiveTab] = useState<"curated" | "ai" | "custom">("curated");
  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [slotLimits, setSlotLimits] = useState<UserSlotLimits>(getUserSlotLimits);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTierId, setPaymentTierId] = useState<string>("small_root_beer_tier");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshArtworks = useCallback(() => {
    getSavedArtworks().then((list) => {
      setSavedArtworks(list);
    });
    setSlotLimits(getUserSlotLimits());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshArtworks();
    }
  }, [isOpen, refreshArtworks]);

  const handleApply = async (url: string) => {
    await applyCustomWallpaper(url);
    onApplyBackground?.(url);
    onSelectBackground?.(url);
    onSelectBg?.(url);
    onApplyArtwork?.(url);
    onClose();
  };

  const handleWatchAdBonus = async () => {
    try {
      const rewarded = await showRewardedAdViaMedian();
      if (rewarded) {
        const expiry = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem("weather:ad-slot-bonus-expiry", expiry.toString());
        setSlotLimits(getUserSlotLimits());
        setStatusMessage(t("ad_bonus_unlocked", "Bonus slot unlocked for 24 hours!"));
      }
    } catch {
      setStatusMessage(t("ad_failed", "Ad was not completed"));
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!slotLimits.isUnlimited && savedArtworks.length >= slotLimits.citySlots) {
      setStatusMessage(t("slots_full", "Slots are full. Watch an ad or upgrade!"));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const newItem: SavedItem = {
        id: `upload-${Date.now()}`,
        url: dataUrl,
        city: activeCity,
        title: `${activeCity} - Custom Upload`,
        createdAt: Date.now(),
        isAi: false,
      };
      const updated = [newItem, ...savedArtworks];
      await saveSavedArtworks(updated);
      setSavedArtworks(updated);
      setStatusMessage(t("photo_saved", "Photo saved to your gallery!"));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAi = async () => {
    if (!generationPrompt.trim()) return;
    if (!slotLimits.isUnlimited && savedArtworks.filter((a) => a.isAi).length >= slotLimits.aiSlots) {
      setStatusMessage(t("ai_slots_full", "AI slots full! Watch an ad or upgrade."));
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const res = await generateWatercolorFn({
        data: {
          city: activeCity,
          weatherCondition: "atmospheric scenery",
          userPrompt: generationPrompt,
        },
      });

      if (res?.imageUrl) {
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: res.imageUrl,
          city: activeCity,
          title: `${activeCity} • AI Watercolor`,
          createdAt: Date.now(),
          isAi: true,
        };
        const updated = [newItem, ...savedArtworks];
        await saveSavedArtworks(updated);
        setSavedArtworks(updated);
        setGenerationPrompt("");
        setStatusMessage(t("ai_saved", "AI Artwork created & saved!"));
      } else {
        setStatusMessage(t("ai_failed", "Could not generate artwork. Try again."));
      }
    } catch {
      setStatusMessage(t("ai_failed", "Could not generate artwork. Try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const curatedList = getAllAvailableArtworks();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl rounded-3xl bg-card border border-border/80 p-5 sm:p-6 shadow-2xl text-card-foreground space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <span>🎨</span>
              <span>{t("gallery_title", "Atmospheric Art Gallery")}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              📍 {getLocalizedCity(activeCity, i18n.language)}, {getLocalizedCountry(activeCountry, i18n.language)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground text-sm transition"
            aria-label={t("close", "Close")}
          >
            ✕
          </button>
        </div>

        {/* Slot Limits Status Banner */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-foreground">
              {slotLimits.isUnlimited
                ? "✨ " + t("party_pack_active", "Party Pack: Unlimited Slots!")
                : `${t("slots", "Slots")}: ${savedArtworks.length} / ${slotLimits.citySlots}`}
            </span>
            {slotLimits.hasAdBonus && (
              <span className="ml-2 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                +1 Bonus Slot ({slotLimits.adHoursLeft}h left)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!slotLimits.isUnlimited && (
              <button
                type="button"
                onClick={handleWatchAdBonus}
                className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold transition text-[11px]"
              >
                🎬 {t("watch_ad_bonus", "+1 Slot (Watch Ad)")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onOpenPaymentModal) onOpenPaymentModal();
                else setPaymentModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-bold transition text-[11px]"
            >
              ⭐ {t("unlock_more", "Unlock All")}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/25 text-xs text-center text-primary font-semibold">
            {statusMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === "curated"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            🏛 {t("tab_curated", "Curated Artworks")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === "ai"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            ✨ {t("tab_ai", "AI Generator")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === "custom"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            📁 {t("tab_saved", "My Saved Art")} ({savedArtworks.length})
          </button>
        </div>

        {/* Tab 1: Curated Wallpapers */}
        {activeTab === "curated" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
            {curatedList.map((art) => (
              <div
                key={art.url}
                className="group relative aspect-16/10 rounded-2xl overflow-hidden border border-border/60 bg-muted hover:shadow-lg transition cursor-pointer"
                onClick={() => handleApply(art.url)}
              >
                <img src={art.url} alt={art.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[11px] font-semibold text-white drop-shadow-sm truncate">{art.title}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: AI Watercolor Generator */}
        {activeTab === "ai" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {t("ai_desc", "Generate a custom watercolor wallpaper depicting")} <strong>{activeCity}</strong>.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder={t("ai_prompt_placeholder", "e.g. golden temple during sunset with rainy mist")}
                className="flex-1 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                disabled={isGenerating || !generationPrompt.trim()}
                onClick={handleGenerateAi}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs disabled:opacity-50 transition cursor-pointer"
              >
                {isGenerating ? "⏳..." : t("generate", "Generate")}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Saved & Uploaded */}
        {activeTab === "custom" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition cursor-pointer"
              >
                📤 {t("upload_wallpaper", "Upload Photo")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadPhoto}
              />
            </div>

            {savedArtworks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("no_saved_art", "No saved artworks yet.")}</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {savedArtworks.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-16/10 rounded-2xl overflow-hidden border border-border/60 bg-muted hover:shadow-lg transition cursor-pointer"
                    onClick={() => handleApply(item.url)}
                  >
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[11px] font-semibold text-white drop-shadow-sm truncate">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {paymentModalOpen && (
          <PaymentModal
            isOpen={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSlotLimits(getUserSlotLimits());
            }}
            initialTierId={paymentTierId}
          />
        )}
      </div>
    </div>
  );
}
