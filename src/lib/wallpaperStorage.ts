// src/lib/wallpaperStorage.ts
// FULL REPLACEMENT - FIXED version
// Before: downloadArtwork / shareArtwork used anchor download or window.open, which iOS ignores and Android blocks for cross-origin
// After: both use saveWallpaperToDownloads with correct mode, so every caller is fixed at once
// Keep the same export names and signatures, so WeatherView, AiGalleryModal, and any other file that imports these keeps working with no other change.

import { saveWallpaperToDownloads, type SaveResult } from "@/lib/saveWallpaper";

function fileNameFromUrl(url: string, prefix: string): string {
  try {
    const clean = url.split("?")[0] || "";
    const last = clean.split("/").pop() || "";
    const base = last.replace(/\.[a-zA-Z0-9]+$/, "") || "wallpaper";
    return `${prefix}-${base}`;
  } catch {
    return `${prefix}-wallpaper`;
  }
}

/**
 * Save directly to Downloads folder.
 * On Android/Desktop: anchor download to Downloads.
 * On iPhone: must use Share sheet, then Save Image / Save to Files, because Safari cannot download directly.
 */
export async function downloadArtwork(url: string): Promise<SaveResult> {
  const name = fileNameFromUrl(url, "weather-pal");
  return await saveWallpaperToDownloads(url, name, { mode: "download" });
}

/**
 * Save to Photo Gallery / Open Share Sheet.
 * On mobile: opens native Share sheet, user picks Save Image / Save to Files / Photos / Gallery.
 * On desktop: falls back to Downloads if Share is not available.
 */
export async function shareArtwork(url: string): Promise<SaveResult> {
  const name = fileNameFromUrl(url, "weather-pal");
  return await saveWallpaperToDownloads(url, name, { mode: "share" });
}

// Backwards compat: some files may import these alternate names
export const downloadWallpaper = downloadArtwork;
export const shareWallpaper = shareArtwork;
export const saveWallpaper = downloadArtwork;
