// src/routes/gallery.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  LANDMARK_WATERCOLORS,
  LANDMARK_TITLES,
  saveCustomArtChoice,
} from "@/lib/aiWatercolorGenerator";
import { generateWatercolorFn } from "@/lib/aiWatercolor.functions";
import { PaymentModal } from "@/components/PaymentModal";
import type { Place } from "@/lib/weather";

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

const LANDMARK_COORDINATES: Record<string, Place> = {
  ratchaburi: { name: "Ratchaburi", country: "Thailand", lat: 13.5283, lon: 99.8134 },
  bangkok: { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 },
  "chiang mai": { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853 },
  phuket: { name: "Phuket", country: "Thailand", lat: 7.8804, lon: 98.3923 },
  krabi: { name: "Krabi", country: "Thailand", lat: 8.0863, lon: 98.9063 },
  pattaya: { name: "Pattaya", country: "Thailand", lat: 12.9276, lon: 100.8771 },
  singapore: { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198 },
  tokyo: { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  kyoto: { name: "Kyoto", country: "Japan", lat: 35.0116, lon: 135.7681 },
  osaka: { name: "Osaka", country: "Japan", lat: 34.6937, lon: 135.5023 },
  seoul: { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.978 },
  taipei: { name: "Taipei", country: "Taiwan", lat: 25.033, lon: 121.5654 },
  "hong kong": { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  hanoi: { name: "Hanoi", country: "Vietnam", lat: 21.0285, lon: 105.8542 },
  "ho chi minh city": { name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lon: 106.6297 },
  bali: { name: "Bali", country: "Indonesia", lat: -8.3405, lon: 115.092 },
  "kuala lumpur": { name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lon: 101.6869 },
  sydney: { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093 },
  melbourne: { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631 },
  paris: { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  london: { name: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278 },
  rome: { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964 },
  venice: { name: "Venice", country: "Italy", lat: 45.4408, lon: 12.3155 },
  barcelona: { name: "Barcelona", country: "Spain", lat: 41.3879, lon: 2.1699 },
  amsterdam: { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041 },
  berlin: { name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  zurich: { name: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417 },
  prague: { name: "Prague", country: "Czech Republic", lat: 50.0755, lon: 14.4378 },
  "new york": { name: "New York", country: "United States", lat: 40.7128, lon: -74.006 },
  "san francisco": { name: "San Francisco", country: "United States", lat: 37.7749, lon: -122.4194 },
  "los angeles": { name: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437 },
  vancouver: { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207 },
  toronto: { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832 },
  cairo: { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357 },
  dubai: { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708 },
};

function getCityRegion(cityName: string): string {
  const c = cityName.toLowerCase();
  if (["ratchaburi", "bangkok", "chiang mai", "phuket", "krabi", "pattaya"].includes(c)) return "thailand";
  if (["singapore", "tokyo", "kyoto", "osaka", "seoul", "taipei", "hong kong", "hanoi", "ho chi minh city", "bali", "kuala lumpur", "sydney", "melbourne"].includes(c)) return "asia";
  if (["paris", "london", "rome", "venice", "barcelona", "amsterdam", "berlin", "zurich", "prague"].includes(c)) return "europe";
  return "americas";
}

interface SavedItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

export function getUserSlotLimits() {
  if (typeof window === "undefined") {
    return {
      citySlots: 1,
      aiSlots: 1,
      baseSlots: 1,
      isUnlimited: false,
      hasAdBonus: false,
      adHoursLeft: 0,
      tierName: "Free Tier",
      tierLevel: 0,
    };
  }

  const isParty = localStorage.getItem("thankyou_unlocked_party_pack_root_beer_tier") === "true";
  const isLarge = localStorage.getItem("thankyou_unlocked_large_root_beer_tier") === "true";
  const isMedium = localStorage.getItem("thankyou_unlocked_medium_root_beer_tier") === "true";
  const isSmall = localStorage.getItem("thankyou_unlocked_small_root_beer_tier") === "true";

  let baseSlots = 1;
  let tierName = "Free Tier";
  let tierLevel = 0;
  let isUnlimited = false;

  if (isParty) {
    baseSlots = 9999;
    tierName = "Party Pack VIP (Unlimited)";
    tierLevel = 4;
    isUnlimited = true;
  } else if (isLarge) {
    baseSlots = 6;
    tierName = "Large Root Beer (6 Slots)";
    tierLevel = 3;
  } else if (isMedium) {
    baseSlots = 4;
    tierName = "Medium Root Beer (4 Slots)";
    tierLevel = 2;
  } else if (isSmall) {
    baseSlots = 2;
    tierName = "Small Root Beer (2 Slots)";
    tierLevel = 1;
  }

  const adUntilStr = localStorage.getItem("weather:ad-unlocked-slots-until");
  const adUntil = adUntilStr ? parseInt(adUntilStr, 10) : 0;
  const now = Date.now();
  const hasAdBonus = adUntil > now;
  const adHoursLeft = hasAdBonus ? Math.ceil((adUntil - now) / (1000 * 60 * 60)) : 0;

  const totalSlots = isUnlimited ? Infinity : baseSlots + (hasAdBonus ? 1 : 0);

  return {
    citySlots: totalSlots,
    aiSlots: totalSlots,
    baseSlots,
    tierLevel,
    isUnlimited,
    hasAdBonus,
    adHoursLeft,
    tierName,
  };
}

function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  // Current City Lock
  const [currentPlace, setCurrentPlace] = useState<Place>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("weather:last-place");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return { name: "Ratchaburi", country: "Thailand", lat: 13.5283, lon: 99.8134 };
  });

  // Slot System State
  const [slotLimits, setSlotLimits] = useState(getUserSlotLimits);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [paymentModalTier, setPaymentModalTier] = useState<string | null>(null);

  // Expandable AI Creator state
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saved Art state
  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh slots on mount and storage events
  useEffect(() => {
    setSlotLimits(getUserSlotLimits());
    try {
      const raw = localStorage.getItem("weather:custom-art-saved");
      if (raw) setSavedArtworks(JSON.parse(raw));
    } catch {}
  }, []);

  const saveArtworkList = (items: SavedItem[]) => {
    setSavedArtworks(items);
    try {
      localStorage.setItem("weather:custom-art-saved", JSON.stringify(items));
    } catch {}
  };

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    setTimeout(() => {
      const until = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem("weather:ad-unlocked-slots-until", until.toString());
      setSlotLimits(getUserSlotLimits());
      setIsWatchingAd(false);
      alert("✨ Ad watched! +1 City slot & +1 AI slot unlocked for the next 24 hours.");
    }, 1500);
  };

  // Curated Landmark items
  const landmarkItems = useMemo(() => {
    const list: Array<{ city: string; title: string; image: string; region: string; isFreeForever: boolean }> = [];
    for (const [cityKey, images] of Object.entries(LANDMARK_WATERCOLORS)) {
      if (!images || images.length === 0) continue;
      const formattedCity = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
      const title = LANDMARK_TITLES[cityKey]?.[0] || `${formattedCity} Landmark`;
      list.push({
        city: formattedCity,
        title,
        image: images[0]!,
        region: getCityRegion(cityKey),
        isFreeForever: true,
      });
    }
    return list;
  }, []);

  const filteredLandmarks = useMemo(() => {
    return landmarkItems.filter((item) => {
      const matchesSearch =
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === "all" || item.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [landmarkItems, searchQuery, selectedRegion]);

  const handleApplyWallpaper = (cityName: string, imageUrl: string) => {
    saveCustomArtChoice(cityName, imageUrl);
    const key = cityName.toLowerCase().trim();
    try {
      localStorage.setItem(`weather:custom-bg:${key}`, imageUrl);
      localStorage.setItem(`weather:custom-art:${key}`, imageUrl);
      localStorage.setItem("weather:custom-bg-current", imageUrl);
    } catch {}
    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { city: key, url: imageUrl },
      })
    );
    alert(`Applied wallpaper for ${cityName}!`);
  };

  const handleViewWeather = (cityName: string) => {
    const key = cityName.toLowerCase();
    const directCoords = LANDMARK_COORDINATES[key];

    const placeToSave: Place = directCoords || {
      name: cityName,
      country: "",
      lat: 13.7563,
      lon: 100.5018,
    };

    try {
      localStorage.setItem("weather:gallery-selected-place", JSON.stringify(placeToSave));
      localStorage.setItem("weather:last-place", JSON.stringify(placeToSave));
    } catch {}

    navigate({ to: "/" });
  };

  // AI Generation with City-Lock & Slot Check
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;

    // Slot Limit Enforcement
    if (!slotLimits.isUnlimited && savedArtworks.length >= slotLimits.aiSlots) {
      setAiError(
        `AI slot limit reached (${savedArtworks.length}/${slotLimits.aiSlots}). Watch an ad for +1 slot (24h) or upgrade with Root Beer to keep it forever!`
      );
      return;
    }

    setIsGenerating(true);
    setAiError(null);

    try {
      const result = await generateWatercolorFn({
        data: {
          city: currentPlace.name,
          userPrompt: aiPrompt,
        },
      });

      if (result && result.imageUrl) {
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: result.imageUrl,
          title: `${currentPlace.name} — ${aiPrompt.slice(0, 30)}...`,
          timestamp: Date.now(),
        };
        const updated = [newItem, ...savedArtworks];
        saveArtworkList(updated);
        handleApplyWallpaper(currentPlace.name, result.imageUrl);
        setAiPrompt("");
        setUploadedPhoto(null);
        setIsAiExpanded(false);
      } else {
        setAiError("Could not generate image. Please try another description.");
      }
    } catch (err: any) {
      setAiError(err?.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSavedArt = (id: string) => {
    const updated = savedArtworks.filter((item) => item.id !== id);
    saveArtworkList(updated);
  };

  const REGIONS = [
    { id: "all", label: t("region_all", "All Cities") },
    { id: "thailand", label: t("region_thailand", "Thailand") },
    { id: "asia", label: t("region_asia", "Asia & Pacific") },
    { id: "europe", label: t("region_europe", "Europe") },
    { id: "americas", label: t("region_americas", "Americas") },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            ← {t("back_to_forecast", "Back to Forecast")}
          </Link>
          <h1 className="text-sm font-bold tracking-tight">🎨 {t("gallery_title", "Art & Wallpaper Studio")}</h1>
          <button
            onClick={() => setPaymentModalTier("small_root_beer_tier")}
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
          >
            🍺 {slotLimits.tierName.split(" ")[0]}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Tier & Slot Meter Card */}
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">🍺</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  {slotLimits.tierName}
                </span>
                {slotLimits.hasAdBonus && (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                    +1 Ad Slot Active ({slotLimits.adHoursLeft}h left)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {slotLimits.isUnlimited
                  ? "Unlimited creations and wallpapers unlocked forever!"
                  : `AI Slots: ${savedArtworks.length} of ${slotLimits.aiSlots} used • 1 Free City Wallpaper per city`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!slotLimits.isUnlimited && (
                <button
                  onClick={handleWatchAd}
                  disabled={isWatchingAd}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  {isWatchingAd ? "Loading Ad... ⏳" : "📺 +1 Slot (24h Ad)"}
                </button>
              )}
              <button
                onClick={() => setPaymentModalTier("small_root_beer_tier")}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs hover:bg-amber-700 transition cursor-pointer"
              >
                ⚡ {t("unlock_more_slots", "Upgrade Slots")}
              </button>
            </div>
          </div>
        </section>

        {/* Expandable City-Locked AI Studio Bar */}
        <section className="rounded-2xl border border-primary/20 bg-card/60 p-4 shadow-xs backdrop-blur-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✨</span>
              <div>
                <h2 className="text-sm font-bold">{t("gallery_ai_title", "AI Watercolor Creator")}</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>📍 {t("locked_to_city", "Locked to")}:</span>
                  <span className="font-semibold text-foreground underline decoration-primary">
                    {currentPlace.name}, {currentPlace.country || "Live Forecast"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="px-3 py-1.5 rounded-xl border border-border/60 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition cursor-pointer"
            >
              {isAiExpanded ? t("close_studio", "Close Studio ▲") : t("create_with_ai", "Create with AI ▼")}
            </button>
          </div>

          {isAiExpanded && (
            <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {t("scene_description", "Describe your custom watercolor scene")}
                </label>
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`e.g. Misty sunrise over ${currentPlace.name} with warm golden reflections...`}
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-border/60 text-xs font-medium hover:bg-muted/80 transition cursor-pointer"
                  >
                    📷 {uploadedPhoto ? t("change_photo", "Change Photo") : t("upload_photo", "Upload Reference Photo")}
                  </button>
                  {uploadedPhoto && (
                    <button
                      onClick={() => setUploadedPhoto(null)}
                      className="text-xs text-destructive hover:underline cursor-pointer"
                    >
                      {t("remove_photo", "Remove Photo")}
                    </button>
                  )}
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                >
                  {isGenerating ? t("painting_scene", "Painting Scene... ⏳") : t("paint_watercolor", "Paint Watercolor 🎨")}
                </button>
              </div>

              {aiError && (
                <p className="text-xs text-destructive font-medium pt-1">⚠️ {aiError}</p>
              )}
            </div>
          )}
        </section>

        {/* VISUAL ARTWORK SLOTS SECTION */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight">🖼️ {t("artwork_slots_title", "Your Artwork Slots")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("slots_sub", "Your active creations, 24-hour ad bonuses, and permanent Root Beer tier slots.")}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border/60">
              {slotLimits.isUnlimited ? "Unlimited" : `${savedArtworks.length} / ${slotLimits.aiSlots} Active`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* SLOT 1: Free Forever */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs flex flex-col min-h-[220px]">
              <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Slot 1 • Free Forever</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ✨ Permanent
                </span>
              </div>
              {(() => {
                const item = savedArtworks[0];
                if (item) {
                  return (
                    <div className="flex-1 flex flex-col">
                      <div
                        className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden group"
                        onClick={() => setPreviewImage(item.url)}
                      >
                        <img
                          src={item.url}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                          <button
                            onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                            className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                          >
                            {t("apply", "Apply")}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedArt(item.id)}
                            className="px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive text-[11px] font-semibold hover:bg-destructive/10 transition cursor-pointer"
                          >
                            {t("delete", "Delete")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                      ✨
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Empty Slot 1</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Paint custom art or upload a photo</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsAiExpanded(true);
                        window.scrollTo({ top: 120, behavior: "smooth" });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
                    >
                      + Paint with AI
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* SLOT 2: 24h Ad or Small Root Beer */}
            {(() => {
              const isSlot2Unlocked = slotLimits.aiSlots >= 2;
              const isPermanentSlot2 = slotLimits.tierLevel >= 1;
              const item = savedArtworks[1];

              return (
                <div
                  className={`rounded-2xl border overflow-hidden shadow-xs flex flex-col min-h-[220px] ${
                    isSlot2Unlocked ? "border-border/60 bg-card" : "border-amber-500/30 bg-amber-500/5 border-dashed"
                  }`}
                >
                  <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Slot 2 • Ad / Small Tier</span>
                    {isPermanentSlot2 ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        🍺 Small Tier
                      </span>
                    ) : isSlot2Unlocked ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ⏳ {slotLimits.adHoursLeft}h left
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        🔒 Locked
                      </span>
                    )}
                  </div>

                  {isSlot2Unlocked ? (
                    item ? (
                      <div className="flex-1 flex flex-col">
                        <div
                          className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden group"
                          onClick={() => setPreviewImage(item.url)}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                            <button
                              onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                              className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                            >
                              {t("apply", "Apply")}
                            </button>
                            <button
                              onClick={() => handleDeleteSavedArt(item.id)}
                              className="px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive text-[11px] font-semibold hover:bg-destructive/10 transition cursor-pointer"
                            >
                              {t("delete", "Delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg">
                          ✨
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Empty Slot 2</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isPermanentSlot2 ? "Permanent slot ready" : `Unlocked for ${slotLimits.adHoursLeft} more hours`}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsAiExpanded(true);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
                        >
                          + Paint with AI
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg">
                        🔒
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Slot 2 is Locked</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Unlock for 24h with a quick ad, or make permanent for $1
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleWatchAd}
                          disabled={isWatchingAd}
                          className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/20 transition cursor-pointer"
                        >
                          {isWatchingAd ? "Ad... ⏳" : "📺 24h Ad"}
                        </button>
                        <button
                          onClick={() => setPaymentModalTier("small_root_beer_tier")}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition cursor-pointer"
                        >
                          🍺 Small ($1)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SLOTS 3 & 4: Medium Root Beer Tier ($3) */}
            {[2, 3].map((slotIndex) => {
              const slotNumber = slotIndex + 1;
              const isUnlocked = slotLimits.aiSlots >= slotNumber;
              const item = savedArtworks[slotIndex];

              return (
                <div
                  key={`slot-${slotNumber}`}
                  className={`rounded-2xl border overflow-hidden shadow-xs flex flex-col min-h-[220px] ${
                    isUnlocked ? "border-border/60 bg-card" : "border-border/40 bg-muted/10 border-dashed"
                  }`}
                >
                  <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Slot {slotNumber} • Medium Tier</span>
                    {isUnlocked ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        🍺 Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        🔒 Medium Tier
                      </span>
                    )}
                  </div>

                  {isUnlocked ? (
                    item ? (
                      <div className="flex-1 flex flex-col">
                        <div
                          className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden group"
                          onClick={() => setPreviewImage(item.url)}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                            <button
                              onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                              className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                            >
                              {t("apply", "Apply")}
                            </button>
                            <button
                              onClick={() => handleDeleteSavedArt(item.id)}
                              className="px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive text-[11px] font-semibold hover:bg-destructive/10 transition cursor-pointer"
                            >
                              {t("delete", "Delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                          ✨
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Empty Slot {slotNumber}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Permanent slot ready for art</p>
                        </div>
                        <button
                          onClick={() => {
                            setIsAiExpanded(true);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
                        >
                          + Paint with AI
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                      <span className="text-2xl">🔒</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Slot {slotNumber} Locked</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Unlocks with Medium Root Beer (4 Slots + 30 Days Ad-Free)
                        </p>
                      </div>
                      <button
                        onClick={() => setPaymentModalTier("medium_root_beer_tier")}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition cursor-pointer mt-1"
                      >
                        🍺 Medium Tier ($3)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* SLOTS 5 & 6: Large Root Beer Tier ($5) */}
            {[4, 5].map((slotIndex) => {
              const slotNumber = slotIndex + 1;
              const isUnlocked = slotLimits.aiSlots >= slotNumber;
              const item = savedArtworks[slotIndex];

              return (
                <div
                  key={`slot-${slotNumber}`}
                  className={`rounded-2xl border overflow-hidden shadow-xs flex flex-col min-h-[220px] ${
                    isUnlocked ? "border-border/60 bg-card" : "border-border/40 bg-muted/10 border-dashed"
                  }`}
                >
                  <div className="px-3 py-2 border-b border-border/40 bg-muted/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Slot {slotNumber} • Large Tier</span>
                    {isUnlocked ? (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        🍺 Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        🔒 Large Tier
                      </span>
                    )}
                  </div>

                  {isUnlocked ? (
                    item ? (
                      <div className="flex-1 flex flex-col">
                        <div
                          className="relative aspect-video w-full bg-muted cursor-pointer overflow-hidden group"
                          onClick={() => setPreviewImage(item.url)}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                            <button
                              onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                              className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                            >
                              {t("apply", "Apply")}
                            </button>
                            <button
                              onClick={() => handleDeleteSavedArt(item.id)}
                              className="px-2.5 py-1 rounded-lg border border-destructive/30 text-destructive text-[11px] font-semibold hover:bg-destructive/10 transition cursor-pointer"
                            >
                              {t("delete", "Delete")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                          ✨
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Empty Slot {slotNumber}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Permanent slot ready for art</p>
                        </div>
                        <button
                          onClick={() => {
                            setIsAiExpanded(true);
                            window.scrollTo({ top: 120, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
                        >
                          + Paint with AI
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                      <span className="text-2xl">🔒</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">Slot {slotNumber} Locked</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Unlocks with Large Root Beer (6 Slots + 1 Year Ad-Free)
                        </p>
                      </div>
                      <button
                        onClick={() => setPaymentModalTier("large_root_beer_tier")}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 transition cursor-pointer mt-1"
                      >
                        🍺 Large Tier ($5)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Party Pack VIP Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <p className="text-xs font-bold text-foreground">Party Pack VIP — Unlimited Slots Forever</p>
                <p className="text-[11px] text-muted-foreground">
                  Never worry about limits again. Unlimited art slots, all mascots, and Ad-Free Forever!
                </p>
              </div>
            </div>
            {!slotLimits.isUnlimited ? (
              <button
                onClick={() => setPaymentModalTier("party_pack_root_beer_tier")}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition cursor-pointer shrink-0 shadow-xs"
              >
                🎉 Party Pack VIP ($10)
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-bold shrink-0">
                ✨ Unlimited VIP Active
              </span>
            )}
          </div>
        </section>

        {/* City Wallpapers Section (Wallpapers First) */}
        <section className="space-y-4 pt-4 border-t border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold tracking-tight">{t("city_wallpapers", "City & Landmark Wallpapers")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("wallpapers_sub", "Set as forecast wallpaper or jump directly into that city's live forecast.")}
              </p>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_landmarks", "Search landmarks or cities...")}
              className="w-full sm:w-64 rounded-xl border border-border/60 bg-card/80 px-3 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Region Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  selectedRegion === r.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Landmark Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredLandmarks.map((item, idx) => (
              <div
                key={`${item.city}-${idx}`}
                className="group relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs hover:shadow-md transition flex flex-col"
              >
                <div
                  className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setPreviewImage(item.image)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  
                  {/* Free Forever Badge */}
                  {item.isFreeForever && (
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-emerald-500/90 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
                      ✨ Free Forever
                    </div>
                  )}

                  <div className="absolute bottom-2 left-3 right-3 text-white">
                    <p className="text-xs font-bold leading-tight drop-shadow-md">{item.city}</p>
                    <p className="text-[10px] text-white/80 truncate drop-shadow-sm">{item.title}</p>
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between gap-2 border-t border-border/40 mt-auto">
                  <button
                    onClick={() => handleApplyWallpaper(item.city, item.image)}
                    className="flex-1 py-1.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-foreground text-[11px] font-semibold transition cursor-pointer text-center"
                  >
                    {t("set_wallpaper", "Set Wallpaper")}
                  </button>
                  <button
                    onClick={() => handleViewWeather(item.city)}
                    className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer text-center"
                  >
                    {t("view_weather", "View Weather 🌤️")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={previewImage}
              alt="Artwork preview"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Root Beer Payment Modal */}
      {paymentModalTier && (
        <PaymentModal
          tierId={paymentModalTier}
          onClose={() => setPaymentModalTier(null)}
          onSuccess={() => {
            setSlotLimits(getUserSlotLimits());
            setPaymentModalTier(null);
          }}
        />
      )}
    </div>
  );
}

export default ArtGalleryPage;
