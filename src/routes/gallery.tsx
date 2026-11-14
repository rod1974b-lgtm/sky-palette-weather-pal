import type { TFunction } from "i18next";
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
      tierLevel: 0,
    };
  }

  const isParty = localStorage.getItem("thankyou_unlocked_party_pack_root_beer_tier") === "true";
  const isLarge = localStorage.getItem("thankyou_unlocked_large_root_beer_tier") === "true";
  const isMedium = localStorage.getItem("thankyou_unlocked_medium_root_beer_tier") === "true";
  const isSmall = localStorage.getItem("thankyou_unlocked_small_root_beer_tier") === "true";

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

// Client-Side Canvas Image Compression helper
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

function compressImageFile(file: File, maxDim = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      compressImageDataUrl(src, maxDim, quality).then(resolve).catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeSetStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("weather:custom-bg:") && k !== key && k !== "weather:custom-bg:current") {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(key, value);
    } catch {}
  }
}

export function ArtGalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [currentPlace, setCurrentPlace] = useState<Place>(() => {
    if (typeof window !== "undefined") {
      try {
        const last = localStorage.getItem("weather:last-place");
        if (last) return JSON.parse(last);
      } catch {}
    }
    return { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018 };
  });

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [isAiExpanded, setIsAiExpanded] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [paymentModalTier, setPaymentModalTier] = useState<string | null>(null);

  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [slotLimits, setSlotLimits] = useState(getUserSlotLimits);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("weather:custom-art-saved");
      if (raw) setSavedArtworks(JSON.parse(raw));
    } catch {}
  }, []);

  const saveArtworkList = (items: SavedItem[]) => {
    setSavedArtworks(items);
    try {
      localStorage.setItem("weather:custom-art-saved", JSON.stringify(items));
    } catch {
      try {
        localStorage.setItem("weather:custom-art-saved", JSON.stringify(items.slice(0, 6)));
      } catch {}
    }
  };

  const handleWatchAd = () => {
    if (slotLimits.hasAdBonus) {
      alert(t("alert_ad_already_active", `You already have an active Ad Slot (+1 slot) for ${slotLimits.adHoursLeft} more hours!`, { hours: slotLimits.adHoursLeft }));
      return;
    }
    setIsWatchingAd(true);
    setTimeout(() => {
      try {
        localStorage.setItem("weather:gallery-ad-bonus-time", Date.now().toString());
        setSlotLimits(getUserSlotLimits());
        alert(t("alert_ad_watched_success", "🎉 Ad complete! +1 Temporary Slot unlocked for the next 24 hours. Support with Root Beer to keep it permanently!"));
      } catch {}
      setIsWatchingAd(false);
    }, 2000);
  };

  const landmarkItems = useMemo(() => {
    const list: { city: string; image: string; title: string; region: string }[] = [];
    for (const [cityKey, urls] of Object.entries(LANDMARK_WATERCOLORS)) {
      const capCity = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
      const region = getCityRegion(cityKey);
      urls.forEach((url, idx) => {
        const titleKey = `${cityKey}_${idx}`;
        const title = LANDMARK_TITLES[titleKey] || `${capCity} Watercolor Landmark #${idx + 1}`;
        list.push({ city: capCity, image: url, title, region });
      });
    }
    return list;
  }, []);

  const filteredLandmarks = useMemo(() => {
    return landmarkItems.filter((item) => {
      const matchRegion = selectedRegion === "all" || item.region === selectedRegion;
      const matchSearch =
        searchQuery === "" ||
        item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRegion && matchSearch;
    });
  }, [landmarkItems, selectedRegion, searchQuery]);

  const handleApplyWallpaper = (cityName: string, imageUrl: string) => {
    saveCustomArtChoice(cityName, imageUrl);
    saveCustomArtChoice(currentPlace.name, imageUrl);
    try {
      const cityKey = cityName.toLowerCase().trim();
      const currentCityKey = currentPlace.name.toLowerCase().trim();

      safeSetStorage(`weather:custom-bg:${cityKey}`, imageUrl);
      safeSetStorage(`weather:custom-bg:${currentCityKey}`, imageUrl);
      safeSetStorage("weather:custom-bg:current", imageUrl);
      safeSetStorage("weather:custom-bg-synced-at", Date.now().toString());

      window.dispatchEvent(
        new CustomEvent("weather:custom-bg-change", {
          detail: { city: cityName, currentCity: currentPlace.name, url: imageUrl },
        })
      );
    } catch {}
    alert(t("alert_wallpaper_applied", `Applied wallpaper for ${cityName}! Tap "Back to Forecast" to see it live.`, { city: cityName }));
  };

  const handleViewWeather = (cityName: string) => {
    const key = cityName.toLowerCase();
    const targetPlace = LANDMARK_COORDINATES[key] || {
      name: cityName,
      country: "Global",
      lat: 0,
      lon: 0,
    };
    try {
      localStorage.setItem("weather:last-place", JSON.stringify(targetPlace));
      window.dispatchEvent(new CustomEvent("weather:place-changed", { detail: targetPlace }));
    } catch {}
    navigate({ to: "/" });
  };

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) return;

    if (!slotLimits.isUnlimited && savedArtworks.length >= slotLimits.aiSlots) {
      alert(
        t(
          "alert_slot_limit",
          `AI slot limit reached (${savedArtworks.length}/${slotLimits.aiSlots}). Watch an ad for +1 slot (24h) or upgrade with Root Beer to keep it forever!`,
          { used: savedArtworks.length, max: slotLimits.aiSlots }
        )
      );
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    try {
      const res = await generateWatercolorFn({
        data: {
          city: currentPlace.name,
          userPrompt: aiPrompt.trim(),
          weatherDesc: "fluid watercolor painting, vibrant atmospheric wash, visible paper texture",
        },
      });

      if (res?.imageUrl) {
        const optimizedUrl = await compressImageDataUrl(res.imageUrl, 1024, 0.82);

        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: optimizedUrl,
          title: `${currentPlace.name} — ${aiPrompt.slice(0, 30)}...`,
          timestamp: Date.now(),
        };
        saveArtworkList([newItem, ...savedArtworks]);
        handleApplyWallpaper(currentPlace.name, optimizedUrl);
        setAiPrompt("");
        setUploadedPhoto(null);
        setIsAiExpanded(false);
      } else {
        setAiError(t("error_generate_failed", "Could not generate image. Please try another description."));
      }
    } catch (err: any) {
      setAiError(err?.message || t("error_generation_generic", "Generation failed. Please try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedUrl = await compressImageFile(file, 1024, 0.82);
      setUploadedPhoto(compressedUrl);
      const newItem: SavedItem = {
        id: `photo-${Date.now()}`,
        url: compressedUrl,
        title: `${currentPlace.name} — ${file.name.slice(0, 24)}`,
        timestamp: Date.now(),
      };
      saveArtworkList([newItem, ...savedArtworks]);
      handleApplyWallpaper(currentPlace.name, compressedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const photoUrl = reader.result as string;
        setUploadedPhoto(photoUrl);
        const newItem: SavedItem = {
          id: `photo-${Date.now()}`,
          url: photoUrl,
          title: `${currentPlace.name} — ${file.name.slice(0, 24)}`,
          timestamp: Date.now(),
        };
        saveArtworkList([newItem, ...savedArtworks]);
        handleApplyWallpaper(currentPlace.name, photoUrl);
      };
      reader.readAsDataURL(file);
    }
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
            🍺 {getTierShortName(slotLimits.tierLevel, t)}
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
                  {getTierFullName(slotLimits.tierLevel, t)}
                </span>
                {slotLimits.hasAdBonus && (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                    +1 {t("ad_slot_active_time", `Ad Slot Active (${slotLimits.adHoursLeft}h left)`)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {slotLimits.isUnlimited
                  ? t("slots_unlimited_desc", "Unlimited creations and wallpapers unlocked forever!")
                  : t("slots_meter_desc", `AI Slots: ${savedArtworks.length} of ${slotLimits.aiSlots} used • 1 Free City Wallpaper per city`)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!slotLimits.isUnlimited && (
                <button
                  onClick={handleWatchAd}
                  disabled={isWatchingAd}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  {isWatchingAd ? t("loading_ad", "Loading Ad... ⏳") : t("watch_ad_slot_btn", "📺 +1 Slot (24h Ad)")}
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
                    {currentPlace.name}, {currentPlace.country || t("live_forecast", "Live Forecast")}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition cursor-pointer"
            >
              {isAiExpanded ? t("close_studio", "Close Studio ▲") : t("create_with_ai", "Create with AI ▼")}
            </button>
          </div>

          {/* Collapsible Generation Form */}
          {isAiExpanded && (
            <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  {t("describe_scene", `Describe the scene in ${currentPlace.name}`)}:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t("ai_prompt_placeholder", `e.g. sunset glow, river reflections, floating market lanterns in ${currentPlace.name}...`)}
                    disabled={isGenerating}
                    className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleGenerateAi}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
                  >
                    {isGenerating ? t("painting_dots", "Painting... 🎨") : t("paint_art_btn", "Paint Artwork 🖌️")}
                  </button>
                </div>
              </div>

              {aiError && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5">
                  {aiError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                <span>{t("or_upload_own", "Or upload your own picture")}:</span>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  📁 {t("choose_photo_btn", "Choose Photo")}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Visual Slot Rack (Slots 1 to 6 & Party VIP) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <span>🖼️</span>
              <span>{t("my_artwork_slots", "My Artwork Slots")}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({savedArtworks.length} / {slotLimits.isUnlimited ? "∞" : slotLimits.aiSlots} {t("active", "active")})
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {t("tap_apply_hero", "Tap Apply to display on your weather hero card")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Slot 1: Free Forever */}
            <div className="rounded-2xl border border-primary/30 bg-card p-2.5 flex flex-col justify-between shadow-xs min-h-[170px] relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-bold text-primary mb-1.5">
                <span>{t("slot_1_label", "Slot 1 • Free Forever")}</span>
                <span className="text-emerald-600 dark:text-emerald-400">✓ {t("free", "Free")}</span>
              </div>
              {savedArtworks[0] ? (
                <div className="flex-1 flex flex-col justify-between space-y-1.5">
                  <div
                    onClick={() => setZoomedImage({ url: savedArtworks[0].url, title: savedArtworks[0].title })}
                    className="relative aspect-4/3 rounded-xl overflow-hidden bg-muted cursor-pointer group"
                  >
                    <img
                      src={savedArtworks[0].url}
                      alt={savedArtworks[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{savedArtworks[0].title}</p>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                    <button
                      onClick={() => handleApplyWallpaper(currentPlace.name, savedArtworks[0].url)}
                      className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                    >
                      {t("apply", "Apply")}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedArt(savedArtworks[0].id)}
                      className="px-2 py-1 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsAiExpanded(true)}
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-2 text-center hover:border-primary/40 transition cursor-pointer"
                >
                  <span className="text-xl mb-1">✨</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">{t("empty_slot_1", "Empty Slot 1")}</span>
                  <span className="text-[9px] text-primary mt-0.5">{t("paint_with_ai", "+ Paint with AI")}</span>
                </div>
              )}
            </div>

            {/* Slot 2: Ad Bonus (24h) or Small Root Beer Tier */}
            <div className="rounded-2xl border border-border/80 bg-card p-2.5 flex flex-col justify-between shadow-xs min-h-[170px] relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                <span>{t("slot_2_label", "Slot 2 • Ad / Small Tier")}</span>
                {slotLimits.tierLevel >= 1 ? (
                  <span className="text-amber-600 dark:text-amber-400">🍺 {t("unlocked", "Unlocked")}</span>
                ) : slotLimits.hasAdBonus ? (
                  <span className="text-emerald-600 dark:text-emerald-400">📺 {slotLimits.adHoursLeft}h</span>
                ) : (
                  <span className="text-muted-foreground">🔒</span>
                )}
              </div>
              {slotLimits.aiSlots >= 2 ? (
                savedArtworks[1] ? (
                  <div className="flex-1 flex flex-col justify-between space-y-1.5">
                    <div
                      onClick={() => setZoomedImage({ url: savedArtworks[1].url, title: savedArtworks[1].title })}
                      className="relative aspect-4/3 rounded-xl overflow-hidden bg-muted cursor-pointer group"
                    >
                      <img
                        src={savedArtworks[1].url}
                        alt={savedArtworks[1].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{savedArtworks[1].title}</p>
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                      <button
                        onClick={() => handleApplyWallpaper(currentPlace.name, savedArtworks[1].url)}
                        className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                      >
                        {t("apply", "Apply")}
                      </button>
                      <button
                        onClick={() => handleDeleteSavedArt(savedArtworks[1].id)}
                        className="px-2 py-1 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] transition cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsAiExpanded(true)}
                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-2 text-center hover:border-primary/40 transition cursor-pointer"
                  >
                    <span className="text-xl mb-1">✨</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">{t("empty_slot_2", "Empty Slot 2")}</span>
                    <span className="text-[9px] text-primary mt-0.5">
                      {slotLimits.hasAdBonus
                        ? t("unlocked_hours_left", `Unlocked for ${slotLimits.adHoursLeft} more hours`, { hours: slotLimits.adHoursLeft })
                        : t("paint_with_ai", "+ Paint with AI")}
                    </span>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-xl p-2 text-center space-y-1">
                  <span className="text-base">🔒</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {t("slot_2_unlock_desc", "Watch an ad for 24h or get Small Root Beer ($1) to keep forever.")}
                  </p>
                  <button
                    onClick={handleWatchAd}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    📺 {t("watch_ad", "Watch Ad")}
                  </button>
                </div>
              )}
            </div>

            {/* Slots 3 & 4: Medium Root Beer Tier ($3) */}
            {[2, 3].map((slotIndex) => {
              const slotNumber = slotIndex + 1;
              const isUnlocked = slotLimits.aiSlots >= slotNumber;
              const item = savedArtworks[slotIndex];

              return (
                <div
                  key={slotIndex}
                  className="rounded-2xl border border-border/80 bg-card p-2.5 flex flex-col justify-between shadow-xs min-h-[170px] relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                    <span>{t("slot_n_label", `Slot ${slotNumber} • Medium Tier`, { n: slotNumber })}</span>
                    {isUnlocked ? (
                      <span className="text-amber-600 dark:text-amber-400">🍺 {t("unlocked", "Unlocked")}</span>
                    ) : (
                      <span className="text-muted-foreground">🔒</span>
                    )}
                  </div>

                  {isUnlocked ? (
                    item ? (
                      <div className="flex-1 flex flex-col justify-between space-y-1.5">
                        <div
                          onClick={() => setZoomedImage({ url: item.url, title: item.title })}
                          className="relative aspect-4/3 rounded-xl overflow-hidden bg-muted cursor-pointer group"
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                          <button
                            onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                            className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                          >
                            {t("apply", "Apply")}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedArt(item.id)}
                            className="px-2 py-1 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsAiExpanded(true)}
                        className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-2 text-center hover:border-primary/40 transition cursor-pointer"
                      >
                        <span className="text-xl mb-1">✨</span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {t("empty_slot_n", `Empty Slot ${slotNumber}`, { n: slotNumber })}
                        </span>
                        <span className="text-[9px] text-primary mt-0.5">{t("paint_with_ai", "+ Paint with AI")}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-xl p-2 text-center space-y-1">
                      <span className="text-base">🔒</span>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {t("slot_medium_unlock_desc", "Unlocked with Medium Root Beer ($3). Includes 30 days ad-free.")}
                      </p>
                      <button
                        onClick={() => setPaymentModalTier("medium_root_beer_tier")}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        ⚡ {t("unlock_tier", "Unlock")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Slots 5 & 6: Large Root Beer Tier ($5) */}
            {[4, 5].map((slotIndex) => {
              const slotNumber = slotIndex + 1;
              const isUnlocked = slotLimits.aiSlots >= slotNumber;
              const item = savedArtworks[slotIndex];

              return (
                <div
                  key={slotIndex}
                  className="rounded-2xl border border-border/80 bg-card p-2.5 flex flex-col justify-between shadow-xs min-h-[170px] relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1.5">
                    <span>{t("slot_n_label", `Slot ${slotNumber} • Large Tier`, { n: slotNumber })}</span>
                    {isUnlocked ? (
                      <span className="text-amber-600 dark:text-amber-400">👑 {t("unlocked", "Unlocked")}</span>
                    ) : (
                      <span className="text-muted-foreground">🔒</span>
                    )}
                  </div>

                  {isUnlocked ? (
                    item ? (
                      <div className="flex-1 flex flex-col justify-between space-y-1.5">
                        <div
                          onClick={() => setZoomedImage({ url: item.url, title: item.title })}
                          className="relative aspect-4/3 rounded-xl overflow-hidden bg-muted cursor-pointer group"
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                          <button
                            onClick={() => handleApplyWallpaper(currentPlace.name, item.url)}
                            className="flex-1 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
                          >
                            {t("apply", "Apply")}
                          </button>
                          <button
                            onClick={() => handleDeleteSavedArt(item.id)}
                            className="px-2 py-1 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[11px] transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsAiExpanded(true)}
                        className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl p-2 text-center hover:border-primary/40 transition cursor-pointer"
                      >
                        <span className="text-xl mb-1">✨</span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {t("empty_slot_n", `Empty Slot ${slotNumber}`, { n: slotNumber })}
                        </span>
                        <span className="text-[9px] text-primary mt-0.5">{t("paint_with_ai", "+ Paint with AI")}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-xl p-2 text-center space-y-1">
                      <span className="text-base">🔒</span>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {t("slot_large_unlock_desc", "Unlocked with Large Root Beer ($5). Includes 1 year ad-free.")}
                      </p>
                      <button
                        onClick={() => setPaymentModalTier("large_root_beer_tier")}
                        className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        👑 {t("unlock_tier", "Unlock")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Party Pack VIP Banner */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-200">
                  {t("party_pack_vip_title", "Party Pack ($10) • Unlimited Slots & Ad-Free Forever")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {slotLimits.isUnlimited
                    ? t("party_pack_active_desc", "You have unlimited slots and ad-free experience unlocked permanently!")
                    : t("party_pack_upgrade_desc", "Never worry about slot limits or expiring timers ever again.")}
                </p>
              </div>
            </div>
            {!slotLimits.isUnlimited && (
              <button
                onClick={() => setPaymentModalTier("party_pack_root_beer_tier")}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition cursor-pointer text-xs shrink-0"
              >
                🎉 {t("get_party_pack", "Get Party Pack")}
              </button>
            )}
          </div>
        </section>

        {/* Curated City Landmarks Catalog */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🏛️</span>
                <span>{t("city_landmarks_title", "Worldwide City Landmarks")}</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("free_city_desc", "Every city gets 1 Free Authentic Wallpaper forever. Tap Set Wallpaper to display live.")}
              </p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search_cities_placeholder", "Search city or landmark...")}
              className="w-full sm:w-60 rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedRegion === r.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/60 bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Grid of Landmark Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredLandmarks.map((item, idx) => (
              <div
                key={`${item.city}-${idx}`}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div
                  onClick={() => setZoomedImage({ url: item.image, title: `${item.city} — ${item.title}` })}
                  className="relative aspect-16/10 bg-muted cursor-pointer group overflow-hidden"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                    📍 {item.city}
                  </div>
                  <div className="absolute top-2 right-2 rounded-full bg-emerald-500/80 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">
                    ✓ {t("free_city_slot", "Free City Wallpaper")}
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <p className="text-xs font-bold text-foreground line-clamp-1">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.city} Watercolor</p>
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
                    className="py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition cursor-pointer text-center"
                  >
                    {t("view_forecast", "Forecast")} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Lightbox Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full rounded-2xl overflow-hidden bg-card border border-border/80 shadow-2xl p-2"
          >
            <img
              src={zoomedImage.url}
              alt={zoomedImage.title}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-foreground truncate">{zoomedImage.title}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleApplyWallpaper(currentPlace.name, zoomedImage.url);
                    setZoomedImage(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  {t("apply_to_hero", "Apply to Hero Card")}
                </button>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="px-3 py-1.5 rounded-xl border border-border/60 hover:bg-muted text-xs font-semibold transition cursor-pointer"
                >
                  ✕ {t("close", "Close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment / Tier Upgrade Modal */}
      {paymentModalTier && (
        <PaymentModal
          isOpen={true}
          onClose={() => {
            setPaymentModalTier(null);
            setSlotLimits(getUserSlotLimits());
          }}
          tierId={paymentModalTier}
        />
      )}
    </div>
  );
}
