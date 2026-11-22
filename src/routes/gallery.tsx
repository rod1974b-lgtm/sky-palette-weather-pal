// src/routes/gallery.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { applyPersistedLanguage } from "@/lib/i18n";
import {
  type SavedArtwork,
  getSavedArtworks,
  saveArtworkToDB,
  deleteArtworkFromDB,
  migrateLegacyLocalStorage,
} from "@/lib/wallpaperStorage";
import {
  generateAiWatercolor,
  isAiGenerationConfigured,
  compressImage,
} from "@/lib/aiWatercolorGenerator";
import {
  getPaidTier,
  getTierById,
  isAdFreeActive,
  triggerAdSlotBonus,
  hasActiveAdSlotBonus,
} from "@/lib/monetization";
import { PaymentModal } from "@/components/PaymentModal";
import { getLocalizedCity } from "@/lib/placeLocalization";
import { loadLastPlace, saveLastPlace, type Place } from "@/lib/weather";

export const Route = createFileRoute("/gallery")({
  component: ArtGalleryPage,
});

export function ArtGalleryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>([]);
  const [currentPlace, setCurrentPlace] = useState<Place>({ name: "Bangkok", lat: 13.7563, lon: 100.5018, country: "Thailand" });
  const [activeTab, setActiveTab] = useState<"slots" | "studio">("slots");
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
    triggerAdSlotBonus();
    alert(t("ad_bonus_unlocked", "Bonus slot unlocked for 24 hours!"));
  };

  const handleApplyArt = async (art: SavedArtwork) => {
    localStorage.setItem("weather:custom-hero-art", art.url);
    saveLastPlace(currentPlace);
    alert(t("wallpaper_applied", "Artwork applied to weather screen!"));
    void navigate({ to: "/" });
  };

  const handleDeleteArt = async (id: string) => {
    await deleteArtworkFromDB(id);
    const updated = await getSavedArtworks();
    setSavedArtworks(updated);
  };

  const handleGenerateAi = async () => {
    if (savedArtworks.length >= maxSlots) {
      alert(t("slot_limit_reached", "Slot limit reached! Unlock more slots with supporter tiers or rewarded ads."));
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    try {
      const city = currentPlace.name === "Your Location" ? "Bangkok" : currentPlace.name;
      const res = await generateAiWatercolor(city, 0, aiPrompt.slice(0, 200));
      if (!res.success || !res.url) {
        throw new Error(res.error || "Generation failed");
      }
      const newArt: SavedArtwork = {
        id: `ai-${Date.now()}`,
        url: res.url,
        title: aiPrompt ? aiPrompt.slice(0, 30) : `${city} AI Art`,
        city,
        createdAt: Date.now(),
        type: "ai",
      };
      await saveArtworkToDB(newArt);
      const updated = await getSavedArtworks();
      setSavedArtworks(updated);
      setAiPrompt("");
      setActiveTab("slots");
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

    if (savedArtworks.length >= maxSlots) {
      alert(t("slot_limit_reached", "Slot limit reached! Unlock more slots with supporter tiers or rewarded ads."));
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawUrl = ev.target?.result as string;
        if (!rawUrl) return;
        const compressed = await compressImage(rawUrl, 1024, 0.82);
        const newArt: SavedArtwork = {
          id: `upload-${Date.now()}`,
          url: compressed,
          title: file.name.slice(0, 30),
          city: currentPlace.name,
          createdAt: Date.now(),
          type: "custom",
        };
        await saveArtworkToDB(newArt);
        const updated = await getSavedArtworks();
        setSavedArtworks(updated);
      };
      reader.readAsDataURL(file);
    } catch {
      alert("Failed to process uploaded photo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
        {/* Tier Status Banner */}
        <section className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h2 className="text-base font-bold text-foreground">
                {tierConfig ? tierConfig.tierKey.toUpperCase() + " VIP" : t("tier_free", "Free Tier")}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {savedArtworks.length} / {maxSlots} {t("slots_used", "Slots Used")}
              {adBonus && ` • ${t("ad_bonus_active", "24h Ad Bonus Active")}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!adBonus && (
              <button
                type="button"
                onClick={handleWatchAd}
                className="px-3 py-1.5 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition cursor-pointer"
              >
                📺 +1 {t("bonus_slot_ad", "Slot (24h Ad)")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaymentModalTier("party_pack_root_beer_tier")}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:brightness-105 transition shadow-xs cursor-pointer"
            >
              ⭐ {t("upgrade_tier", "Unlock All Slots")}
            </button>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "slots" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🖼 {t("my_slots", "My Artwork Slots")} ({savedArtworks.length}/{maxSlots})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "studio" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ✨ {t("ai_generator", "AI Scene Generator")}
          </button>
        </div>

        {activeTab === "slots" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {t("saved_paintings", "Saved Artwork Collection")}
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>📷</span>
                <span>{t("upload_photo", "Upload Photo")}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, idx) => {
                const art = savedArtworks[idx];
                const isUnlocked = idx < maxSlots;

                if (art) {
                  return (
                    <div key={art.id} className="group relative rounded-2xl overflow-hidden border border-border/60 bg-muted aspect-16/10 flex flex-col justify-end p-3 shadow-xs">
                      <img src={art.url} alt={art.title} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <div className="relative z-10 space-y-1">
                        <span className="text-xs font-bold text-white block truncate">{art.title}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApplyArt(art)}
                            className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition cursor-pointer"
                          >
                            {t("apply_wallpaper", "Apply")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteArt(art.id)}
                            className="px-2 py-1 rounded-lg bg-rose-500/80 text-white text-[10px] font-bold hover:bg-rose-600 transition cursor-pointer"
                          >
                            {t("delete", "Delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`slot-${idx}`}
                    className={`rounded-2xl border aspect-16/10 flex flex-col items-center justify-center p-4 text-center transition ${
                      isUnlocked
                        ? "border-dashed border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer"
                        : "border-border/30 bg-muted/10 opacity-60"
                    }`}
                    onClick={() => {
                      if (isUnlocked) setActiveTab("studio");
                      else setPaymentModalTier("small_root_beer_tier");
                    }}
                  >
                    <span className="text-2xl mb-1">{isUnlocked ? "➕" : "🔒"}</span>
                    <span className="text-xs font-semibold text-foreground">
                      {isUnlocked ? t("empty_slot", "Empty Slot") : t("locked_slot", "Locked Slot")}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {isUnlocked ? t("tap_to_create", "Tap to create art") : t("tap_to_unlock", "Tap to unlock")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "studio" && (
          <section className="p-5 rounded-3xl bg-card border border-border/70 space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t("ai_scene_studio", "AI Scene Synthesizer")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("ai_scene_desc", "Generate watercolor weather scenes for")} <strong>{getLocalizedCity(currentPlace.name, i18n.language)}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("ai_prompt_placeholder", "e.g., Grand Palace with golden spires in morning sunlight...")}
                rows={3}
                maxLength={200}
                className="w-full p-3 rounded-2xl bg-muted/50 border border-border/60 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground block text-right">
                {aiPrompt.length}/200
              </span>
            </div>

            {generationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                {generationError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin inline-block">✨</span>
                  <span>{t("generating_ai", "Synthesizing Artwork...")}</span>
                </>
              ) : (
                <>
                  <span>🎨</span>
                  <span>{t("generate_artwork", "Generate Watercolor Painting")}</span>
                </>
              )}
            </button>
          </section>
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

export default ArtGalleryPage;
