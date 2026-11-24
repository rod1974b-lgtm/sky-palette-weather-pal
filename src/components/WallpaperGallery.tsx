// src/components/WallpaperGallery.tsx
// FULL REPLACEMENT - Gallery view that CAN save on phone
// Before: Gallery only had img + anchor href - iOS ignored download, Android blocked cross-origin
// After: Save button uses saveWallpaperToDownloads() - Share sheet on iPhone, Downloads on Android/Desktop

import { useEffect, useState, useCallback } from "react";
import { saveWallpaperToDownloads, isIOS, isMobile } from "@/lib/saveWallpaper";

export interface GalleryWallpaper {
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  // If your AI gallery uses data: URLs, put them in url - saveWallpaper handles it
}

interface Props {
  open: boolean;
  wallpapers: GalleryWallpaper[];
  startIndex?: number;
  onClose: () => void;
  onSetAsBackground?: (wallpaper: GalleryWallpaper) => void;
}

export function WallpaperGallery({ open, wallpapers, startIndex = 0, onClose, onSetAsBackground }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Reset to startIndex every time gallery opens
  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setToast(null);
      setSaving(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, startIndex]);

  // ESC to close, arrows to navigate
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => wallpapers.length > 0 ? (i + 1) % wallpapers.length : 0);
      if (e.key === "ArrowLeft") setIndex((i) => wallpapers.length > 0 ? (i - 1 + wallpapers.length) % wallpapers.length : 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, wallpapers.length]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleSave = useCallback(async () => {
    const current = wallpapers[index];
    if (!current || saving) return;
    setSaving(true);
    try {
      const result = await saveWallpaperToDownloads(current.url, `weather-pal-${current.id}`);
      showToast(result.message);
    } catch {
      showToast("Could not save. Long-press the image → Save Image.");
    } finally {
      setSaving(false);
    }
  }, [wallpapers, index, saving]);

  const handleShare = useCallback(async () => {
    // Share = same function on mobile, but we force the share path by just calling save
    await handleSave();
  }, [handleSave]);

  const safeIndex = wallpapers.length > 0 ? Math.min(Math.max(index, 0), wallpapers.length - 1) : 0;
  const current = wallpapers[safeIndex];

  if (!open || wallpapers.length === 0 || !current) return null;
  const saveLabel = saving
    ? "Saving…"
    : isIOS()
      ? "Save to Photos / Files"
      : isMobile()
        ? "Save to Downloads"
        : "Save to Downloads";

  return (
    <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Wallpaper gallery">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="font-bold truncate">{current.title}</p>
          <p className="text-xs text-white/70 truncate">
            {current.subtitle || `${index + 1} of ${wallpapers.length}`} • Tap Save — works on iPhone + Android
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 ml-3 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl"
          aria-label="Close gallery"
        >
          ✕
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-2">
        <img
          src={current.url}
          alt={current.title}
          className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
        {wallpapers.length > 1 && (
          <>
            <button
              onClick={() => setIndex((i) => (i - 1 + wallpapers.length) % wallpapers.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl flex items-center justify-center"
              aria-label="Previous wallpaper"
            >
              ‹
            </button>
            <button
              onClick={() => setIndex((i) => (i + 1) % wallpapers.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl flex items-center justify-center"
              aria-label="Next wallpaper"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {wallpapers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {wallpapers.map((w, i) => (
            <button
              key={w.id}
              onClick={() => setIndex(i)}
              className={`shrink-0 w-16 h-10 rounded-lg overflow-hidden ring-2 ${i === index ? "ring-amber-400" : "ring-transparent opacity-60"}`}
            >
              <img src={w.url} alt={w.title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Actions - THIS IS THE FIX: Save button calls saveWallpaperToDownloads, not anchor download */}
      <div className="p-4 bg-black/40 backdrop-blur">
        <div className="flex gap-2 max-w-md mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-full shadow-lg active:scale-[0.98] transition"
          >
            {saving ? "⏳ Saving…" : `⬇️ ${saveLabel}`}
          </button>
          <button
            onClick={handleShare}
            disabled={saving}
            className="px-4 py-3.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold"
          >
            ↗ Share
          </button>
          {onSetAsBackground && (
            <button
              onClick={() => onSetAsBackground(current)}
              className="px-4 py-3.5 rounded-full bg-white text-black font-semibold"
            >
              Set BG
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-white/60 mt-2 leading-relaxed">
          {isIOS()
            ? "iPhone: Tap Save → Share sheet → Save Image or Save to Files. Safari cannot download directly."
            : "Android / Desktop: Saves straight to Downloads. If a new tab opens, long-press → Download image."}
        </p>

        {toast && (
          <div className="mt-3 mx-auto max-w-md bg-white text-black text-sm font-medium px-4 py-3 rounded-xl shadow-xl text-center">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
