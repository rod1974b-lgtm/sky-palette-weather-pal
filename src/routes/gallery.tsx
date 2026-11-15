// src/routes/gallery.tsx
import type { TFunction } from "i18next";
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
import {
  showRewardedAdViaMedian,
} from "@/lib/monetization";
import {
  type SavedItem,
  getSavedArtworks,
  saveSavedArtworks,
  applyCustomWallpaper,
  migrateLegacyLocalStorage,
} from "@/lib/wallpaperStorage";

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

  // Targeted slot index (0 for Slot 1, 1 for Slot 2, etc.)
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);

  const [savedArtworks, setSavedArtworks] = useState<SavedItem[]>([]);
  const [slotLimits, setSlotLimits] = useState(getUserSlotLimits);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  // Load artworks from IndexedDB on mount and run one-time legacy localStorage migration
  useEffect(() => {
    migrateLegacyLocalStorage().then(() => {
      getSavedArtworks().then((items) => setSavedArtworks(items));
    });
  }, []);

  const saveArtworkList = async (items: SavedItem[]) => {
    setSavedArtworks(items);
    await saveSavedArtworks(items);
  };

  const handleSelectTargetSlot = (slotIndex: number) => {
    setTargetSlotIndex(slotIndex);
    setIsAiExpanded(true);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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

  const handleApplyWallpaper = async (cityName: string, imageUrl: string) => {
    saveCustomArtChoice(cityName, imageUrl);
    saveCustomArtChoice(currentPlace.name, imageUrl);
    await applyCustomWallpaper(cityName, currentPlace.name, imageUrl);
    alert(t("alert_wallpaper_applied", `Applied wallpaper for ${cityName}! Tap "Back to Forecast" to see it live.`, { city: cityName }));
  };

  const handleDownloadArt = (item: SavedItem, slotNum: number) => {
    try {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = `${currentPlace.name.toLowerCase().replace(/\s+/g, "-")}-slot-${slotNum}.png`;
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
      await saveArtworkList(updated);
    }
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

        const updated = [...savedArtworks];
        if (targetSlotIndex < updated.length) {
          updated[targetSlotIndex] = newItem;
        } else {
          updated.push(newItem);
        }

        await saveArtworkList(updated);
        await handleApplyWallpaper(currentPlace.name, optimizedUrl);
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

      const updated = [...savedArtworks];
      if (targetSlotIndex < updated.length) {
        updated[targetSlotIndex] = newItem;
      } else {
        updated.push(newItem);
      }

      await saveArtworkList(updated);
      await handleApplyWallpaper(currentPlace.name, compressedUrl);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-20 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium text-sm transition"
        >
          ← {t("nav_back_forecast", "Back to Forecast")}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            📍 {currentPlace.name}
          </span>
          <button
            onClick={() => setPaymentModalTier("small_root_beer_tier")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow transition"
          >
            🍺 {t("nav_support_root_beer", "Support with Root Beer")}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        {/* Tier & Slot Status Banner */}
        <section className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <h1 className="text-xl font-bold text-white tracking-wide">
                  {t("gallery_title", "AI Watercolor Studio & Landmarks")}
                </h1>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                {t("gallery_tier_label", "Your Plan:")}{" "}
                <span className="font-semibold text-amber-400">
                  {getTierFullName(slotLimits.tierLevel, t)}
                </span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-300">
                <span className="bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  🖼️ {t("gallery_slots_available", "Active Slots:")}{" "}
                  <strong className="text-white">
                    {slotLimits.isUnlimited ? t("slot_unlimited", "Unlimited") : slotLimits.aiSlots}
                  </strong>
                </span>
                {slotLimits.hasAdBonus && (
                  <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2.5 py-1 rounded-md">
                    🎁 {t("gallery_ad_bonus_active", "Ad Bonus Active:")} +1 slot ({slotLimits.adHoursLeft}h left)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!slotLimits.hasAdBonus && !slotLimits.isUnlimited && (
                <button
                  onClick={handleWatchAd}
                  disabled={isWatchingAd}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 transition flex items-center gap-1.5"
                >
                  {isWatchingAd ? "⏳ " + t("btn_watching_ad", "Watching...") : "📺 " + t("btn_watch_ad_bonus", "Watch Ad (+1 Slot / 24h)")}
                </button>
              )}
              <button
                onClick={() => setPaymentModalTier("small_root_beer_tier")}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-lg transition"
              >
                ⚡ {t("btn_unlock_more_slots", "Unlock More Slots")}
              </button>
            </div>
          </div>
        </section>

        {/* Visual Slots Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🖼️</span> {t("heading_saved_wallpaper_slots", "Your Wallpaper Slots")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  "subheading_click_slot_target",
                  "Tap any unlocked slot to target it for new AI watercolor art or photo uploads."
                )}
              </p>
            </div>
            <span className="text-xs text-amber-400 font-medium">
              {getTierShortName(slotLimits.tierLevel, t)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
              const slotNumber = slotIdx + 1;
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
                      handleSelectTargetSlot(slotIdx);
                    } else {
                      setPaymentModalTier(tierCode);
                    }
                  }}
                  className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col justify-between ${
                    isTargeted && isUnlocked
                      ? "ring-2 ring-amber-400 border-amber-400 bg-slate-800/95 shadow-lg shadow-amber-500/10 scale-[1.01]"
                      : isUnlocked
                      ? "border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800"
                      : "border-slate-800/80 bg-slate-900/60 opacity-80 hover:opacity-100 hover:border-amber-500/40"
                  }`}
                >
                  <div className="p-3.5 flex items-center justify-between border-b border-slate-700/60 text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      {isUnlocked ? "🎨" : "🔒"} {t("slot_label", "Slot")} {slotNumber}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        isUnlocked
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                          : "bg-slate-800 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {isUnlocked ? t("status_unlocked", "Unlocked") : tierRequired}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[170px]">
                    {item?.url ? (
                      <div className="w-full space-y-2">
                        <div className="relative group rounded-xl overflow-hidden aspect-video bg-slate-950">
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage({ url: item.url, title: item.title });
                            }}
                            className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                            title={t("btn_zoom", "Zoom")}
                          >
                            🔍
                          </button>
                        </div>
                        <p className="text-xs text-slate-200 font-medium truncate" title={item.title}>
                          {item.title}
                        </p>
                      </div>
                    ) : isUnlocked ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-slate-700/60 flex items-center justify-center mx-auto mb-2 text-xl text-amber-400">
                          +
                        </div>
                        <p className="text-xs font-semibold text-white">
                          {t("slot_empty_cta", "Empty Slot")} {slotNumber}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {isTargeted
                            ? `🎯 ${t("slot_active_target", "Active target for new art")}`
                            : t("slot_tap_to_target", "Tap to paint or upload here")}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 text-xl text-slate-400">
                          🔒
                        </div>
                        <p className="text-xs font-semibold text-slate-300">
                          {t("slot_locked_title", "Slot Locked")}
                        </p>
                        <p className="text-[11px] text-amber-400/90 mt-1">
                          {slotIdx === 1
                            ? t("slot_unlock_ad_or_small", "Watch ad or unlock for $1")
                            : t("slot_tap_to_unlock", "Tap to unlock with Root Beer")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs">
                    {item?.url ? (
                      <div className="flex items-center gap-1.5 w-full justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyWallpaper(currentPlace.name, item.url);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition text-[11px]"
                        >
                          ✓ {t("btn_apply_wallpaper", "Apply")}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadArt(item, slotNumber);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title={t("btn_download", "Download")}
                          >
                            💾
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlot(slotIdx);
                            }}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 transition"
                            title={t("btn_delete", "Delete")}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTargetSlot(slotIdx);
                        }}
                        className={`w-full py-1.5 rounded-lg font-semibold transition text-xs ${
                          isTargeted
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
                        }`}
                      >
                        {isTargeted ? `✓ ${t("btn_targeted", "Target Selected")}` : `+ ${t("btn_paint_with_ai", "Paint with AI")}`}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentModalTier(tierCode);
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold transition text-xs border border-amber-500/30"
                      >
                        ⚡ {t("btn_unlock_slot", "Unlock Slot")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* AI Painting Studio & Custom Upload Section */}
        <section
          ref={studioRef}
          className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🎨</span> {t("heading_ai_studio", "AI Painting Studio for")} {currentPlace.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t("studio_target_label", "Saving to:")}{" "}
                <span className="font-semibold text-amber-400">
                  {t("slot_label", "Slot")} {targetSlotIndex + 1}
                </span>{" "}
                ({targetSlotIndex < slotLimits.aiSlots ? t("status_unlocked", "Unlocked") : t("status_locked", "Locked")})
              </p>
            </div>
            <button
              onClick={() => setIsAiExpanded(!isAiExpanded)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold self-start sm:self-auto cursor-pointer"
            >
              {isAiExpanded ? t("btn_collapse", "Collapse ▲") : t("btn_open_generator", "Open Studio ▼")}
            </button>
          </div>

          {isAiExpanded && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t("label_describe_watercolor", "Describe your custom watercolor scene for")} {currentPlace.name}:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t(
                      "placeholder_ai_prompt",
                      "e.g., sunset over temple towers with golden glow and paper texture"
                    )}
                    className="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleGenerateAi();
                    }}
                  />
                  <button
                    onClick={handleGenerateAi}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-sm hover:brightness-110 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? "⏳ " + t("btn_painting", "Painting...") : "🎨 " + t("btn_generate_ai", "Generate")}
                  </button>
                </div>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
                  ⚠️ {aiError}
                </div>
              )}

              {/* Photo Upload alternative */}
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t("upload_or_device_photo", "Or upload your own photo for Slot")} {targetSlotIndex + 1}:
                </span>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  📁 {t("btn_upload_photo", "Upload Photo")}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Curated City Landmarks Catalog */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏛️</span> {t("heading_city_landmarks", "Curated City Landmarks")}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  "subheading_free_wallpapers",
                  "Includes 1 free authentic watercolor wallpaper for every supported city."
                )}
              </p>
            </div>

            {/* Filter buttons & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {["all", "thailand", "asia", "europe", "americas"].map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                    selectedRegion === region
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  }`}
                >
                  {region}
                </button>
              ))}
              <input
                type="text"
                placeholder={t("placeholder_search_city", "Search city...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white placeholder-slate-500 w-32 sm:w-40 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLandmarks.map((item, idx) => (
              <div
                key={`${item.city}-${idx}`}
                className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow hover:border-slate-600 transition flex flex-col justify-between"
              >
                <div className="relative group aspect-video bg-slate-950">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={() => setZoomedImage({ url: item.image, title: item.title })}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    🔍
                  </button>
                </div>

                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                    <p className="text-xs text-slate-400">{item.city}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                    <button
                      onClick={() => handleApplyWallpaper(item.city, item.image)}
                      className="flex-1 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                    >
                      ✓ {t("btn_apply_wallpaper", "Apply Wallpaper")}
                    </button>
                    <button
                      onClick={() => handleViewWeather(item.city)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 text-xs transition border border-slate-700 cursor-pointer"
                      title={t("btn_view_weather", "View Weather")}
                    >
                      ⛅
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Lightbox / Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">{zoomedImage.title}</h3>
              <button
                onClick={() => setZoomedImage(null)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 max-h-[80vh] flex items-center justify-center bg-black">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment / Tier Modal */}
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

export default ArtGalleryPage;
