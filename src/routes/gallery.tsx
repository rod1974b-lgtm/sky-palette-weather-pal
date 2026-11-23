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
  LANDMARK_WATERCOLORS,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyPersistedLanguage();
    const last = loadLastPlace();
    if (last) setCurrentPlace(last);

    void migrateLegacyLocalStorage().then(() => {
      void getSavedArtworks().then((items) => setSavedArtworks(items));
    });
  }, []);

  const paidTierId = getPaidTier();
  const tierConfig = paidTierId ? getTierById(paidTierId) : null;
  const adBonus = hasActiveAdSlotBonus();

  const maxSlots = useMemo(() => {
    if (tierConfig?.bonus?.aiBackgrounds) {
      return Math.min(6, tierConfig.bonus.aiBackgrounds);
    }
    return adBonus ? 2 : 1;
  }, [tierConfig, adBonus]);

  const handleWatchAd = () => {
    showRewardedAdViaMedian(
      () => {
        triggerAdSlotBonus();
        alert(t("ad_bonus_unlocked", "Bonus slot unlocked for 24 hours!"));
      },
      (err) => {
        alert(err.message || "Could not show rewarded ad.");
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
    await saveArtImageToDevice(item.url, filename, title);
  };

  const handleGenerateAi = async () => {
    if (targetSlot >= maxSlots) {
      alert(t("slot_limit_reached", "Slot limit reached! Unlock more slots with supporter tiers or rewarded ads."));
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const city = currentPlace.name === "Your Location" ? "Bangkok" : currentPlace.name;
      const res = await generateWatercolorFn({
        data: { city, userPrompt: aiPrompt.slice(0, 200) },
      });
      if (!res?.imageUrl) {
        throw new Error("Generation failed");
      }
      const newArt: SavedItem = {
        id: `ai-${Date.now()}`,
        url: res.imageUrl,
        title: aiPrompt ? aiPrompt.slice(0, 30) : `${city} AI Art`,
        city,
        timestamp: Date.now(),
      };
      const updated = [...savedArtworks];
      updated[targetSlot] = newArt;
      await saveSavedArtworks(updated);
      setSavedArtworks(updated);
      setAiPrompt("");
      setActiveTab("slots");
      await handleApplyArt(res.imageUrl);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Error generating art");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    if (targetSlot >= maxSlots) {
      alert(t("slot_limit_reached", "Slot limit reached! Unlock more slots with supporter tiers or rewarded ads."));
      return;
    }

    try {
      const compressed = await compressImageFile(file, 1024, 0.82);
      const newArt: SavedItem = {
        id: `upload-${Date.now()}`,
        url: compressed,
        title: file.name.slice(0, 30),
        city: currentPlace.name,
        timestamp: Date.now(),
      };
      const updated = [...savedArtworks];
      updated[targetSlot] = newArt;
      await saveSavedArtworks(updated);
      setSavedArtworks(updated);
      await handleApplyArt(compressed);
    } catch {
      alert("Failed to process uploaded photo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const curatedList = useMemo(() => {
    const raw = getAllAvailableArtworks(currentPlace.name, 0, "clear", currentPlace.country);
    return (raw || []).map((u, i) => ({
      id: `curated-${i}`,
      url: typeof u === "string" ? u : (u as any)?.url || "",
      title: `${currentPlace.name} Landmark ${i + 1}`,
      city: currentPlace.name,
      timestamp: Date.now(),
    }));
  }, [currentPlace]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
          <span>←</span>
          <span>{t("back_to_weather", "Back to Forecast")}</span>
        </Link>
        <h1 className="text-sm font-bold text-foreground">
          {t("gallery_title", "Watercolor Art Gallery & Studio")}
        </h1>
        <div className="w-12" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Slot Limits & Status Header */}
        <section className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                📍 {getLocalizedCity(currentPlace.name, i18n.language)}
                {currentPlace.country ? `, ${getLocalizedCountry(currentPlace.country, i18n.language)}` : ""}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                {savedArtworks.filter(Boolean).length} / {maxSlots} Slots Unlocked
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {tierConfig ? tierConfig.name : "Free Tier (1 Permanent Slot + 1 Bonus Ad Slot)"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!adBonus && maxSlots < 6 && (
              <button
                type="button"
                onClick={handleWatchAd}
                className="px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
              >
                📺 Watch Ad (+1 Slot / 24h)
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaymentModalTier("small_root_beer_tier")}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold transition hover:brightness-105 cursor-pointer"
            >
              ⚡ Supporter Tiers
            </button>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "slots" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            🖼️ Your Slots ({savedArtworks.filter(Boolean).length}/6)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("curated")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "curated" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            🏛️ Curated Landmarks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`py-2 px-4 border-b-2 transition cursor-pointer ${
              activeTab === "studio" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            }`}
          >
            ✨ AI Studio (Target: Slot {targetSlot + 1})
          </button>
        </div>

        {/* TAB 1: SLOTS */}
        {activeTab === "slots" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isUnlocked = idx < maxSlots;
              const item = savedArtworks[idx];
              const isTarget = targetSlot === idx;

              return (
                <div
                  key={idx}
                  onClick={() => isUnlocked && setTargetSlot(idx)}
                  className={`rounded-2xl border p-3 flex flex-col justify-between transition cursor-pointer ${
                    isTarget && isUnlocked
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : isUnlocked
                      ? "border-border/80 bg-card hover:border-border"
                      : "border-border/40 bg-muted/20 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs font-bold">
                    <span>{isUnlocked ? "🎨" : "🔒"} Slot {idx + 1}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {isUnlocked ? (isTarget ? "Target" : "Unlocked") : "Locked"}
                    </span>
                  </div>

                  <div className="py-3 flex-1 flex flex-col items-center justify-center min-h-[140px]">
                    {item?.url ? (
                      <div className="w-full space-y-1">
                        <img src={item.url} alt={item.title} className="w-full aspect-video object-cover rounded-xl" />
                        <p className="text-xs font-semibold truncate">{item.title}</p>
                      </div>
                    ) : isUnlocked ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <span className="text-2xl font-bold">+</span>
                        <p className="text-xs font-medium">Empty Slot</p>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <span className="text-2xl">🔒</span>
                        <p className="text-xs">Supporter Slot</p>
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
                          className="px-3 py-1 rounded-lg bg-primary text-primary-foreground font-bold"
                        >
                          ✓ Apply
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownloadSlotArt(item, idx);
                            }}
                            className="px-2 py-1 rounded-lg bg-muted text-foreground font-bold hover:bg-muted/80"
                            title={t("btn_download", "Download")}
                          >
                            💾
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteArt(idx);
                            }}
                            className="px-2 py-1 rounded-lg bg-destructive/10 text-destructive font-bold hover:bg-destructive/20"
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
                        className="w-full py-1 rounded-lg bg-muted font-bold"
                      >
                        + Paint with AI
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPaymentModalTier("small_root_beer_tier")}
                        className="w-full py-1 rounded-lg bg-amber-500/10 text-amber-600 font-bold"
                      >
                        ⚡ Unlock
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
              <div key={art.id} className="rounded-2xl border border-border/70 overflow-hidden bg-card p-3 space-y-2">
                <img src={art.url} alt={art.title} className="w-full aspect-video object-cover rounded-xl" />
                <h4 className="text-xs font-bold truncate">{art.title}</h4>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyArt(art.url)}
                    className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToSlot(targetSlot, art)}
                    className="px-2.5 py-1 rounded-lg bg-muted text-xs font-bold"
                  >
                    💾 Slot {targetSlot + 1}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: STUDIO */}
        {activeTab === "studio" && (
          <div className="rounded-3xl border border-border p-5 bg-card space-y-4 max-w-xl mx-auto">
            <h3 className="text-sm font-bold">✨ Paint with AI for Slot {targetSlot + 1}</h3>
            {generationError && (
              <p className="text-xs text-destructive font-semibold">{generationError}</p>
            )}
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe scenery, landmarks, mist, or lighting..."
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
                className="px-3 py-1.5 rounded-xl bg-muted text-xs font-semibold"
              >
                📁 Upload Photo
              </button>
              <button
                type="button"
                disabled={isGenerating || !aiPrompt.trim()}
                onClick={handleGenerateAi}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
              >
                {isGenerating ? "⏳ Painting..." : "✨ Paint Artwork"}
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
