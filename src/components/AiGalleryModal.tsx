// src/components/AiGalleryModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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

export interface AiGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName?: string;
  country?: string;
  weatherCode?: number;
  weatherDesc?: string;
  onApplyArtwork?: (artworkUrl: string) => void;
  onOpenPaymentModal?: () => void;
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
  cityName,
  onApplyArtwork,
  onOpenPaymentModal,
  ...props
}: AiGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<"curated" | "saved" | "ai">("curated");
  const [curatedArts, setCuratedArts] = useState<SavedItem[]>([]);
  const [savedArts, setSavedArts] = useState<SavedItem[]>([]);
  const [selectedArt, setSelectedArt] = useState<SavedItem | null>(null);

  // AI Generation Form States
  const [customPrompt, setCustomPrompt] = useState("");
  const [customStyle, setCustomStyle] = useState(FALLBACK_STYLES[0]);
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const [includeWeather, setIncludeWeather] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArtUrl, setGeneratedArtUrl] = useState<string | null>(null);

  // Filter & Search
  const [filterCity, setFilterCity] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status feedback
  const [appliedUrl, setAppliedUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Tier info for display
  const [tierName, setTierName] = useState("Free");

  useEffect(() => {
    try {
      const isParty = localStorage.getItem("weather:is_party_pack") === "true";
      const isAdFree = localStorage.getItem("weather:ad_free_forever") === "true";
      const paidTier = localStorage.getItem("weather:paid_tier") || "";
      if (isParty || isAdFree) setTierName("Party Pack (Unlimited)");
      else if (paidTier.toLowerCase().includes("large")) setTierName("Large Tier");
      else if (paidTier.toLowerCase().includes("medium")) setTierName("Medium Tier");
      else if (paidTier.toLowerCase().includes("small")) setTierName("Small Tier");
      else setTierName("Free Plan");
    } catch {}
  }, [isOpen]);

  const activeCity = cityName || "Bangkok";

  // Derive catalog cities
  const catalogCityKeys = Object.keys(LANDMARK_WATERCOLORS);

  const getCityDisplayName = (key: string): string => {
    return key
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const getArtworkTitle = (url: string, city: string, index: number): string => {
    const cityKey = city.toLowerCase().trim();
    if (LANDMARK_TITLES[cityKey] && LANDMARK_TITLES[cityKey][index]) {
      return LANDMARK_TITLES[cityKey][index];
    }
    const cleanCity = getCityDisplayName(cityKey);
    const styles = ["Watercolor View", "Morning Light", "Heritage Landmark", "Evening Skyline"];
    return `${cleanCity} — ${styles[index % styles.length]}`;
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load curated artworks and persistent IndexedDB collection
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);

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
          : getAllAvailableArtworks(
              activeCity,
              props.weatherCode ?? 0,
              props.weatherDesc ?? "clear",
              props.country
            );

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

      getSavedArtworks()
        .then((dbArts) => setSavedArts(dbArts))
        .catch((err) => console.error("Could not load saved wallpapers from DB:", err));

      try {
        const currentHero = localStorage.getItem("weather:custom-hero-art");
        if (currentHero) setAppliedUrl(currentHero);
      } catch {}
    }
  }, [isOpen, activeCity, props.weatherCode, props.weatherDesc, props.country]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { t } = useTranslation();

  const handleApply = (art: SavedItem) => {
    try {
      applyCustomWallpaper(art.url);
      setAppliedUrl(art.url);
      if (onApplyArtwork) {
        onApplyArtwork(art.url);
      }
    } catch (e) {
      console.error("Failed to apply custom wallpaper:", e);
    }
  };

  const handleSaveToCollection = async (art: SavedItem) => {
    try {
      const alreadySaved = savedArts.some((item) => item.url === art.url);
      if (alreadySaved) {
        return;
      }

      const updated = [
        {
          ...art,
          id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        },
        ...savedArts,
      ];

      setSavedArts(updated);
      await saveSavedArtworks(updated);
    } catch (e) {
      console.error("Failed to save to collection:", e);
    }
  };

  const handleDeleteSingleSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = savedArts.filter((item) => item.id !== id);
      setSavedArts(updated);
      await saveSavedArtworks(updated);
      if (selectedArt?.id === id) {
        setSelectedArt(null);
      }
    } catch (err) {
      console.error("Failed to delete wallpaper:", err);
    }
  };

  const handleGenerateAiScene = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedArtUrl(null);
    setErrorMessage(null);

    try {
      let promptBuilder = `${activeCity} ${props.country ? ", " + props.country : ""}`;
      if (customPrompt.trim()) {
        promptBuilder += `, ${customPrompt.trim()}`;
      }
      if (includeWeather && props.weatherDesc) {
        promptBuilder += `, ${props.weatherDesc} weather atmosphere`;
      }
      promptBuilder += `, ${timeOfDay} light, ${customStyle}, detailed watercolor painting on textured paper, vibrant artistic hues, professional fine art`;

      const result = await generateWatercolorFn({ data: { prompt: promptBuilder } });

      if (result && result.imageUrl) {
        setGeneratedArtUrl(result.imageUrl);
        const newItem: SavedItem = {
          id: `ai-${Date.now()}`,
          url: result.imageUrl,
          title: customPrompt.trim() ? `${activeCity}: ${customPrompt.slice(0, 24)}...` : `${activeCity} AI Scene`,
          city: activeCity,
          timestamp: Date.now(),
        };

        const updated = [newItem, ...savedArts];
        setSavedArts(updated);
        await saveSavedArtworks(updated);
        setSelectedArt(newItem);
      } else {
        throw new Error(result?.error || "AI Generation failed to return an image.");
      }
    } catch (err: any) {
      console.error("AI Scene Generation Error:", err);
      setErrorMessage(
        err?.message || "Generation paused. An API key or image quota is needed."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setUploadPreview(base64Url);
        const customItem: SavedItem = {
          id: `upload-${Date.now()}`,
          url: base64Url,
          title: `${file.name.slice(0, 20)} (Photo)`,
          city: activeCity,
          timestamp: Date.now(),
        };

        const updated = [customItem, ...savedArts];
        setSavedArts(updated);
        await saveSavedArtworks(updated);
        setSelectedArt(customItem);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSaved = async () => {
    if (window.confirm(t("gallery_clear_confirm", "Remove all saved artworks from your gallery?"))) {
      try {
        await clearAllArtworksFromDB();
        setSavedArts([]);
      } catch (err) {
        console.error("Failed to clear DB:", err);
      }
    }
  };

  const handleClose = () => {
    setSelectedArt(null);
    setUploadPreview(null);
    setGeneratedArtUrl(null);
    onClose();
  };

  const filteredCurated = curatedArts.filter((art) => {
    const matchCity = filterCity ? art.city?.toLowerCase() === filterCity.toLowerCase() : true;
    const matchSearch = searchQuery
      ? art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.city?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchCity && matchSearch;
  });

  const filteredSaved = savedArts.filter((art) => {
    const matchSearch = searchQuery
      ? art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (art.city && art.city.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchSearch;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-white/20 bg-card/95 text-card-foreground shadow-2xl backdrop-blur-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-border/60 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎨</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {t("gallery_title", "Watercolor Art Gallery")}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t("gallery_subtitle", "Curated landmarks, AI generated scenes & custom hero wallpapers")}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label={t("close", "Close")}
          >
            ✕
          </button>
        </div>

        {/* Tab Selection & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5 border-b border-border/40 bg-card/60">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab("curated")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "curated"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏛️ {t("city_wallpapers", "Curated Landmarks")} ({curatedArts.length})
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "saved"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⭐ {t("saved_wallpapers", "Saved Collection")} ({savedArts.length})
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "ai"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ✨ {t("ai_generated", "AI Studio")}
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder={t("search_placeholder", "Filter by landmark or city...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-input/60 bg-background/80 px-3 py-1.5 pr-7 focus:outline-hidden focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/70"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Curated Landmarks Gallery */}
        {activeTab === "curated" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* City Catalog Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[11px] text-muted-foreground font-semibold shrink-0">City:</span>
              <button
                onClick={() => setFilterCity("")}
                className={`px-2.5 py-1 rounded-full text-xs shrink-0 cursor-pointer border transition ${
                  filterCity === ""
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                    : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Cities
              </button>
              {catalogCityKeys.map((cityKey) => (
                <button
                  key={cityKey}
                  onClick={() => setFilterCity(cityKey)}
                  className={`px-2.5 py-1 rounded-full text-xs shrink-0 cursor-pointer border transition ${
                    filterCity.toLowerCase() === cityKey.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                      : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {getCityDisplayName(cityKey)}
                </button>
              ))}
            </div>

            {/* Grid of Curated Artworks */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredCurated.map((art) => {
                const isApplied = appliedUrl === art.url;
                const isSaved = savedArts.some((item) => item.url === art.url);

                return (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArt(art)}
                    className="group relative flex flex-col rounded-xl overflow-hidden border border-border/60 bg-muted/20 hover:border-primary/60 transition shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/60">
                      <img
                        src={art.url}
                        alt={art.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {isApplied && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-md">
                          ✓ {t("applied", "Active")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToCollection(art);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full text-xs shadow-md transition backdrop-blur-md ${
                          isSaved
                            ? "bg-amber-500 text-white"
                            : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60"
                        }`}
                        title={isSaved ? "Saved in collection" : "Save to collection"}
                      >
                        {isSaved ? "★" : "☆"}
                      </button>
                    </div>

                    <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
                      <div className="truncate text-xs font-semibold" title={art.title}>
                        {art.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate">{art.city}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(art);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                            isApplied
                              ? "bg-primary/20 text-primary"
                              : "bg-primary text-primary-foreground hover:opacity-90"
                          }`}
                        >
                          {isApplied ? t("applied", "Applied") : t("apply_wallpaper", "Apply")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Saved Collection (IndexedDB) */}
        {activeTab === "saved" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {savedArts.length} {savedArts.length === 1 ? "artwork" : "artworks"} saved on this device (IndexedDB)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition text-xs font-semibold cursor-pointer"
                >
                  📁 Upload Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {savedArts.length > 0 && (
                  <button
                    onClick={handleClearSaved}
                    className="text-destructive hover:underline text-xs"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {savedArts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <p>{t("no_saved_artworks", "No saved artworks yet.")}</p>
                <p className="text-[11px]">
                  Bookmark scenes with ★ from the Curated tab, create new ones with AI, or upload your own photos!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredSaved.map((art) => {
                  const isApplied = appliedUrl === art.url;

                  return (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArt(art)}
                      className="group relative flex flex-col rounded-xl overflow-hidden border border-border/60 bg-muted/20 hover:border-primary/60 transition shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/60">
                        <img
                          src={art.url}
                          alt={art.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {isApplied && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground shadow-md">
                            ✓ {t("applied", "Active")}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleSaved(art.id, e)}
                          title={t("remove_saved", "Remove from saved")}
                          className="absolute top-2 right-2 p-1 rounded-full text-xs bg-black/40 text-white/80 hover:text-destructive hover:bg-black/60 transition backdrop-blur-md cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
                        <div className="truncate text-xs font-semibold" title={art.title}>
                          {art.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">{art.city || "Custom"}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(art);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                              isApplied
                                ? "bg-primary/20 text-primary"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                          >
                            {isApplied ? t("applied", "Applied") : t("apply_wallpaper", "Apply")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: AI Scene Studio */}
        {activeTab === "ai" && (
          <form
            onSubmit={handleGenerateAiScene}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs"
          >
            {/* Status & Plan Info */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-primary">✨ AI Watercolor Generator</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Generates 1024×1024 watercolor scenery based on local weather & landmark cues.
                </p>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-md bg-muted font-mono font-semibold">
                {tierName}
              </span>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive space-y-1">
                <p className="font-semibold">Notice</p>
                <p className="text-[11px]">{errorMessage}</p>
                {onOpenPaymentModal && (
                  <button
                    type="button"
                    onClick={onOpenPaymentModal}
                    className="mt-1 inline-block text-[11px] font-bold underline hover:opacity-80 cursor-pointer"
                  >
                    View Root Beer Tiers to unlock unlimited slots & scenes →
                  </button>
                )}
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Scene Subject / Landmark (City: <span className="text-primary">{activeCity}</span>)
              </label>
              <input
                type="text"
                placeholder="e.g. ancient temple with cherry blossoms, floating market at dawn..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full text-xs rounded-xl border border-input bg-background/80 px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Style Selector */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Watercolor Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FALLBACK_STYLES.map((style) => (
                  <button
                    type="button"
                    key={style}
                    onClick={() => setCustomStyle(style)}
                    className={`p-2 rounded-xl text-left border text-[11px] transition cursor-pointer capitalize ${
                      customStyle === style
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Time of Day & Atmosphere</label>
                <div className="flex gap-1.5">
                  {(["day", "sunset", "night"] as const).map((tVal) => (
                    <button
                      type="button"
                      key={tVal}
                      onClick={() => setTimeOfDay(tVal)}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold capitalize transition cursor-pointer ${
                        timeOfDay === tVal
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      {tVal === "day" ? "☀️ Day" : tVal === "sunset" ? "🌅 Sunset" : "🌙 Night"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="includeWeatherCheck"
                  checked={includeWeather}
                  onChange={(e) => setIncludeWeather(e.target.checked)}
                  className="rounded-sm border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="includeWeatherCheck" className="text-xs text-foreground cursor-pointer">
                  Reflect current weather ({props.weatherDesc || "clear conditions"})
                </label>
              </div>
            </div>

            {/* Generated Art Preview */}
            {generatedArtUrl && (
              <div className="p-3 rounded-xl border border-primary/40 bg-card space-y-2">
                <p className="font-bold text-primary text-xs">Generated Artwork Preview:</p>
                <div className="aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-border shadow-md">
                  <img src={generatedArtUrl} alt="AI Scene" className="h-full w-full object-cover" />
                </div>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      applyCustomWallpaper(generatedArtUrl);
                      setAppliedUrl(generatedArtUrl);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs cursor-pointer"
                  >
                    {t("apply_wallpaper", "Apply as Hero Wallpaper")}
                  </button>
                  <a
                    href={generatedArtUrl}
                    download={`${activeCity}_ai_artwork.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs inline-flex items-center gap-1"
                  >
                    ⬇️ {t("download", "Download")}
                  </a>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin inline-block">↻</span>
                    <span>{t("generating_art", "Generating Art...")}</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>{t("generate_scene", "Generate Scene")}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Selected Artwork Detail Modal Overlay */}
        {selectedArt && (
          <div
            className="absolute inset-0 z-10 flex flex-col justify-end sm:justify-center items-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setSelectedArt(null)}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-card p-4 sm:p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden border border-border">
                <img
                  src={selectedArt.url}
                  alt={selectedArt.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground">{selectedArt.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedArt.city || "Custom Scenery"}</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedArt(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  {t("close", "Close")}
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedArt.url}
                    download={`${selectedArt.title.replace(/\s+/g, "_")}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs font-semibold cursor-pointer"
                  >
                    ⬇️ {t("download", "Download")}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      handleApply(selectedArt);
                      setSelectedArt(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-95 cursor-pointer"
                  >
                    {t("apply_wallpaper", "Apply as Wallpaper")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
