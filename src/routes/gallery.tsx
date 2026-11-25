// src/routes/gallery.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { applyPersistedLanguage } from "@/lib/i18n";
import {
  type SavedItem,
  getSavedArtworks,
  saveSavedArtworks,
  applyCustomWallpaper,
  saveArtImageToDevice,
  migrateLegacyLocalStorage,
} from "@/lib/wallpaperStorage";
import {
  saveCustomArtChoice,
  compressImageFile,
  getAllAvailableArtworks,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";
import { PaymentModal } from "@/components/PaymentModal";
import { getLocalizedCity, getLocalizedCountry } from "@/lib/placeLocalization";
import { loadLastPlace, type Place } from "@/lib/weather";
import {
  showRewardedAdViaMedian,
  getPaidTier,
  getTierById,
  triggerAdSlotBonus,
  hasActiveAdSlotBonus,
} from "@/lib/monetization";
import { useProStatus } from "@/lib/proStatus";

const DESC =
  "Explore curated city landmark watercolors, create custom AI scenes, and personalize your forecast wallpaper.";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Art Gallery — My Weather Pal" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Art Gallery — My Weather Pal" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArtGalleryPage,
});

export function ArtGalleryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const proStatus = useProStatus();

  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [currentPlace, setCurrentPlace] = useState<Place>({
    name: "Bangkok",
    lat: 13.7563,
    lon: 100.5018,
    country: "Thailand",
  });
  const [activeTab, setActiveTab] = useState<"slots" | "curated" | "studio">("slots");
  const [targetSlot, setTargetSlot] = useState<number>(0);
  const [paymentModalTier, setPaymentModalTier] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [adBonusState, setAdBonusState] = useState<boolean>(() => hasActiveAdSlotBonus());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAdHoursRemaining = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("weather_pal_ad_slot_bonus_until");
      if (raw) {
        const rem = Number(raw) - Date.now();
        if (rem > 0) return Math.max(1, Math.ceil(rem / (60 * 60 * 1000)));
      }
      const rawAlt = localStorage.getItem("weather:gallery-ad-bonus-time");
      if (rawAlt) {
        const elapsed = Date.now() - parseInt(rawAlt, 10);
        const rem = 24 * 60 * 60 * 1000 - elapsed;
        if (rem > 0) return Math.max(1, Math.ceil(rem / (60 * 60 * 1000)));
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const adHoursLeft = getAdHoursRemaining();

  useEffect(() => {
    applyPersistedLanguage();
    const last = loadLastPlace();
    if (last) setCurrentPlace(last);

    void migrateLegacyLocalStorage().then(() => {
      void getSavedArtworks().then((items) => setSavedArtworks(items));
    });
  }, []);

  const paidTierId = proStatus.tierId || getPaidTier();
  const tierConfig = paidTierId ? getTierById(paidTierId) : null;
  const isPermanentSlot2 = proStatus.effectiveSlots >= 2 || (tierConfig?.bonus?.aiBackgrounds ?? 0) >= 2;

  // Max unlocked slots: takes the highest between pro package, monetization tier, or temporary ad bonus
  const maxSlots = useMemo(() => {
    if (proStatus.slots === "Unlimited") return 6;
    if (proStatus.effectiveSlots > 1) {
      return Math.min(6, proStatus.effectiveSlots);
    }
    if (tierConfig?.bonus?.aiBackgrounds) {
      return Math.min(6, tierConfig.bonus.aiBackgrounds);
    }
    return adBonusState ? 2 : 1;
  }, [proStatus, tierConfig, adBonusState]);

  const handleWatchAd = () => {
    showRewardedAdViaMedian(
      () => {
        triggerAdSlotBonus();
        try {
          localStorage.setItem("weather:gallery-ad-bonus-time", String(Date.now()));
        } catch {}
        setAdBonusState(true);
        alert(t("ad_bonus_unlocked", "Slot 2 unlocked for 24 hours!"));
      },
      (err) => {
        alert(err.message || t("ad_error", "Could not show rewarded ad."));
      }
    );
  };

  const handleApplyArt = async (artUrl: string) => {
    await applyCustomWallpaper(currentPlace.name, artUrl);
    saveCustomArtChoice(currentPlace.name, artUrl);
    alert(t("wallpaper_applied", "Artwork applied to weather screen!"));
    void navigate({ to: "/" });
  };

  const handleDeleteArt = async (slotIdx: number) => {
    const updated = [...savedArtworks];
    delete updated[slotIdx];
    await saveSavedArtworks(updated);
    setSavedArtworks(updated);
  };

  const handleSaveToSlot = async (slotIdx: number, item: SavedItem) => {
    const updated = [...savedArtworks];
    updated[slotIdx] = item;
    await saveSavedArtworks(updated);
    setSavedArtworks(updated);
  };

  const handleDownloadSlotArt = async (item: SavedItem, slotIndex: number) => {
    const filename = `${currentPlace.name.toLowerCase().replace(/\s+/g, "-")}-slot-${slotIndex + 1}`;
    const title = `${currentPlace.name} Artwork`;
    const ok = await saveArtImageToDevice(item.url, filename, title);
    if (!ok) {
      window.open(item.url, "_blank");
    }
  };

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const fullPrompt = `${aiPrompt.trim()}, watercolor painting of ${currentPlace.name}`;
      const result = await generateWatercolorFn({
        data: {
          prompt: fullPrompt,
          cityName: currentPlace.name,
          weatherCondition: "clear",
        },
      });

      if (result.success && result.imageUrl) {
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: result.imageUrl,
          title: `${currentPlace.name} (AI)`,
          city: currentPlace.name,
          timestamp: Date.now(),
        };
        await handleSaveToSlot(targetSlot, newItem);
        setActiveTab("slots");
        setAiPrompt("");
      } else {
        setGenerationError(result.error || t("ai_generation_failed", "Could not generate artwork."));
      }
    } catch (e: any) {
      setGenerationError(e?.message || t("ai_generation_failed", "Could not generate artwork."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageFile(file);
      const newItem: SavedItem = {
        id: `upload-${Date.now()}`,
        url: compressedDataUrl,
        title: file.name.replace(/\.[^/.]+$/, ""),
        city: currentPlace.name,
        timestamp: Date.now(),
      };
      await handleSaveToSlot(targetSlot, newItem);
      setActiveTab("slots");
    } catch {
      alert(t("upload_error", "Failed to load photo."));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const curatedList = useMemo(() => {
    const raw = getAllAvailableArtworks(currentPlace.name, 0, "clear", currentPlace.country);
    return (raw || []).map((art: any, i: number) => ({
      id: `curated-${i}`,
      url: typeof art === "string" ? art : art.url,
      title: typeof art === "string" ? `${currentPlace.name} Landmark` : art.title || currentPlace.name,
      city: currentPlace.name,
      timestamp: Date.now(),
    }));
  }, [currentPlace]);

  const savedCount = savedArtworks.filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <Link
          to="/"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <span>←</span>
          <span>{t("back_to_forecast", "Back to Forecast")}</span>
        </Link>
        <h1 className="text-sm font-bold text-foreground">
          {t("art_gallery", "Art Gallery")}
        </h1>
        <div className="w-12" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Slot Limits & Status Header */}
        <section className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                📍 {getLocalizedCity(currentPlace.name, i18n.language)}
                {currentPlace.country ? `, ${getLocalizedCountry(currentPlace.country, i18n.language)}` : ""}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                {savedCount} / {proStatus.slots === "Unlimited" ? "∞" : maxSlots} {t("unlocked_label", "Unlocked")}
              </span>
              {adBonusState && !isPermanentSlot2 && !proStatus.adFree && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                  🎁 {t("slot_label", { slot: 2 })} ({adHoursLeft}h)
                </span>
              )}
              {proStatus.adFree && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                  🛡️ {proStatus.isLifetime ? "Ad-Free Forever" : "Ad-Free"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {proStatus.isUnlocked
                ? `🍺 ${proStatus.tier} • ${proStatus.slots === "Unlimited" ? "Unlimited Slots" : `${proStatus.slots} Slots`} • ${proStatus.adFree ? "Ads Off" : "Standard Ads"}`
                : tierConfig
                ? tierConfig.name
                : t("free_plan_card", "Free Plan (Slot 1 Permanent • Slot 2 via 24h Ad or Small Root Beer)")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!proStatus.adFree && !adBonusState && maxSlots < 6 && (
              <button
                type="button"
                onClick={handleWatchAd}
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
              >
                📺 {t("watch_ad_btn", "Watch Ad")} ({t("slot_label", { slot: 2 })} 24h)
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaymentModalTier("small_root_beer_tier")}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold transition hover:brightness-105 cursor-pointer"
            >
              {proStatus.isUnlocked ? "🍺 Upgrade / Tiers" : `⚡ ${t("supporter_tiers", "Supporter Tiers")}`}
            </button>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "slots"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            🖼️ {t("your_slots", { count: savedCount })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "curated"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            🏛️ {t("curated_landmarks", "Curated Landmarks")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "studio"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            }`}
          >
            ✨ {t("ai_studio", { slot: targetSlot + 1 })}
          </button>
        </div>

        {/* TAB 1: SLOTS */}
        {activeTab === "slots" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isUnlocked = idx < maxSlots;
              const item = savedArtworks[idx];
              const isTarget = targetSlot === idx;
              const isSlot2 = idx === 1;

              return (
                <div
                  key={idx}
                  onClick={() => isUnlocked && setTargetSlot(idx)}
                  className={`rounded-2xl border p-3 flex flex-col justify-between transition cursor-pointer ${
                    isTarget && isUnlocked
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : isUnlocked
                      ? "border-border/80 bg-card hover:border-border"
                      : "border-border/40 bg-muted/20 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs font-bold">
                    <span>
                      {isUnlocked ? "🎨" : "🔒"} {t("slot_label", { slot: idx + 1 })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {isUnlocked
                        ? isSlot2 && adBonusState && !isPermanentSlot2 && !proStatus.adFree
                          ? `🎁 24h (${adHoursLeft}h)`
                          : isTarget
                          ? t("target_label", "Target")
                          : t("unlocked_label", "Unlocked")
                        : isSlot2
                        ? t("ad_or_dollar_tier", "Ad or $1")
                        : t("locked_label", "Locked")}
                    </span>
                  </div>

                  <div className="py-3 flex-1 flex flex-col items-center justify-center min-h-[140px]">
                    {item?.url ? (
                      <div className="w-full space-y-1">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full aspect-video object-cover rounded-xl"
                        />
                        <p className="text-xs font-semibold truncate">{item.title}</p>
                      </div>
                    ) : isUnlocked ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <span className="text-2xl font-bold">+</span>
                        <p className="text-xs font-medium">
                          {t("slot_label", { slot: idx + 1 })}
                        </p>
                        {isSlot2 && adBonusState && !isPermanentSlot2 && !proStatus.adFree && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                            {t("ad_bonus_active_hours", "24h Ad Active ({{hours}}h)", { hours: adHoursLeft })}
                          </p>
                        )}
                      </div>
                    ) : isSlot2 ? (
                      <div className="text-center py-3 text-muted-foreground space-y-1">
                        <span className="text-2xl">🔒</span>
                        <p className="text-xs font-bold text-foreground">
                          {t("slot_label", { slot: 2 })}
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          {t("slot2_unlock_desc", "Watch ad for 24h or unlock with Small Root Beer ($1)")}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground space-y-1">
                        <span className="text-2xl">🔒</span>
                        <p className="text-xs font-semibold">
                          {t("slot_locked", { slot: idx + 1 })}
                        </p>
                        <p className="text-[10px]">
                          {idx <= 3 ? "Medium Root Beer ($3)" : "Large Root Beer ($5)"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1 text-xs">
                    {item?.url ? (
                      <div className="flex items-center justify-between w-full gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleApplyArt(item.url);
                          }}
                          className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold cursor-pointer"
                        >
                          ✓ {t("apply", "Apply")}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownloadSlotArt(item, idx);
                            }}
                            className="px-2 py-1 rounded-lg bg-muted text-foreground font-bold hover:bg-muted/80 cursor-pointer"
                            title={t("save_wallpaper", "Save Wallpaper")}
                          >
                            💾
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteArt(idx);
                            }}
                            className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 cursor-pointer"
                            title={t("btn_delete", "Delete")}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab("studio")}
                        className="w-full py-1 rounded-lg bg-muted font-bold hover:bg-muted/80 transition cursor-pointer"
                      >
                        + {t("paint_artwork", "Paint Artwork")}
                      </button>
                    ) : isSlot2 ? (
                      <div className="w-full flex items-center gap-1.5">
                        {!proStatus.adFree && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWatchAd();
                            }}
                            className="flex-1 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30 text-[11px] transition cursor-pointer"
                          >
                            📺 {t("watch_ad_btn", "Watch Ad")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentModalTier("small_root_beer_tier");
                          }}
                          className="flex-1 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30 text-[11px] transition cursor-pointer"
                        >
                          🍺 {t("small_root_beer", "Small Root Beer")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentModalTier(
                            idx <= 3 ? "medium_root_beer_tier" : "large_root_beer_tier"
                          );
                        }}
                        className="w-full py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition cursor-pointer"
                      >
                        ⚡ {t("unlock_with_root_beer", "Unlock with Root Beer")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CURATED */}
        {activeTab === "curated" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curatedList.map((art) => (
              <div
                key={art.id}
                className="rounded-2xl border border-border/70 overflow-hidden bg-card p-3 space-y-2"
              >
                <img
                  src={art.url}
                  alt={art.title}
                  className="w-full aspect-video object-cover rounded-xl"
                />
                <h4 className="text-xs font-bold truncate">{art.title}</h4>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyArt(art.url)}
                    className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                  >
                    {t("apply", "Apply")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToSlot(targetSlot, art)}
                    className="px-2.5 py-1 rounded-lg bg-muted text-xs font-bold cursor-pointer"
                  >
                    💾 {t("slot_label", { slot: targetSlot + 1 })}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: STUDIO */}
        {activeTab === "studio" && (
          <div className="rounded-3xl border border-border p-5 bg-card space-y-4 max-w-xl mx-auto">
            <h3 className="text-sm font-bold">
              ✨ {t("paint_with_ai_for_slot", { slot: targetSlot + 1 })}
            </h3>
            {generationError && (
              <p className="text-xs text-destructive font-semibold">{generationError}</p>
            )}
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={t("ai_studio_placeholder", "Describe scenery, landmarks, mist, or lighting...")}
              className="w-full text-xs rounded-xl border p-2.5 bg-background"
            />
            <div className="flex justify-between items-center pt-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-muted text-xs font-semibold cursor-pointer"
              >
                📁 {t("upload_photo", "Upload Photo")}
              </button>
              <button
                type="button"
                disabled={isGenerating || !aiPrompt.trim()}
                onClick={handleGenerateAi}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {isGenerating
                  ? `⏳ ${t("painting", "Painting...")}`
                  : `✨ ${t("paint_artwork", "Paint Artwork")}`}
              </button>
            </div>
          </div>
        )}
      </main>

      {paymentModalTier && (
        <PaymentModal
          tierId={paymentModalTier}
          onClose={() => setPaymentModalTier(null)}
        />
      )}
    </div>
  );
}
