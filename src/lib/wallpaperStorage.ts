// src/lib/wallpaperStorage.ts
// Native IndexedDB Storage for My Weather Pal Gallery & Wallpapers with integrated save utilities
// Keeps all IndexedDB methods intact for gallery.tsx & AiGalleryModal.tsx while wrapping saveWallpaperToDownloads

import { saveWallpaperToDownloads, type SaveResult } from "@/lib/saveWallpaper";

export interface SavedItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  city?: string;
}

const DB_NAME = "MyWeatherPalDB";
const DB_VERSION = 1;
const STORE_NAME = "wallpapers";

const memoryCache: Map<string, string> = new Map();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getWallpaperItem(key: string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null;
  }

  if (typeof window === "undefined") return null;

  try {
    const db = await openDB();
    return await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = (req.result as string) || null;
        if (result) {
          memoryCache.set(key, result);
          resolve(result);
        } else {
          try {
            const fallback = localStorage.getItem(key);
            if (fallback) {
              memoryCache.set(key, fallback);
              resolve(fallback);
              return;
            }
          } catch {}
          resolve(null);
        }
      };

      req.onerror = () => {
        try {
          resolve(localStorage.getItem(key));
        } catch {
          resolve(null);
        }
      };
    });
  } catch {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

export async function setWallpaperItem(key: string, value: string): Promise<void> {
  memoryCache.set(key, value);

  if (typeof window === "undefined") return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
}

export async function deleteWallpaperItem(key: string): Promise<void> {
  memoryCache.delete(key);

  if (typeof window === "undefined") return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}

  try {
    localStorage.removeItem(key);
  } catch {}
}

export async function getSavedArtworks(): Promise<SavedItem[]> {
  try {
    const raw = await getWallpaperItem("weather:custom-art-saved");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as SavedItem[];
      }
    }
  } catch {}

  try {
    const local = localStorage.getItem("weather:custom-art-saved");
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        return parsed as SavedItem[];
      }
    }
  } catch {}

  return [];
}

export async function saveSavedArtworks(items: SavedItem[]): Promise<void> {
  const json = JSON.stringify(items);
  await setWallpaperItem("weather:custom-art-saved", json);
}

export async function clearAllArtworksFromDB(): Promise<void> {
  memoryCache.delete("weather:custom-art-saved");
  await deleteWallpaperItem("weather:custom-art-saved");
}

export async function applyCustomWallpaper(
  targetOrCity: string,
  currentCityName?: string,
  imageUrl?: string
): Promise<void> {
  let targetUrl = targetOrCity;
  let city = currentCityName || "";
  let currentCity = currentCityName || "";

  if (imageUrl) {
    city = targetOrCity;
    currentCity = currentCityName || targetOrCity;
    targetUrl = imageUrl;
  }

  const cityKey = city ? `weather:custom-bg:${city.toLowerCase().trim()}` : null;
  const currentCityKey = currentCity ? `weather:custom-bg:${currentCity.toLowerCase().trim()}` : null;

  const promises: Promise<void>[] = [
    setWallpaperItem("weather:custom-bg:current", targetUrl),
  ];
  if (cityKey) promises.push(setWallpaperItem(cityKey, targetUrl));
  if (currentCityKey) promises.push(setWallpaperItem(currentCityKey, targetUrl));

  await Promise.all(promises);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("weather:custom-hero-art", targetUrl);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("weather:custom-bg-change", {
        detail: { city, currentCity, url: targetUrl },
      })
    );
  }
}

function fileNameFromUrl(url: string, prefix = "weather-pal"): string {
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
 * Direct file download into device Downloads folder.
 */
export async function downloadArtwork(
  imageUrl: string,
  fileName?: string
): Promise<SaveResult> {
  const name = fileName || fileNameFromUrl(imageUrl, "weather-pal");
  return await saveWallpaperToDownloads(imageUrl, name);
}

/**
 * Native mobile share sheet / Photos / Gallery saver.
 */
export async function shareArtwork(
  imageUrl: string,
  _title?: string
): Promise<SaveResult> {
  const name = fileNameFromUrl(imageUrl, "weather-pal");
  return await saveWallpaperToDownloads(imageUrl, name);
}

export async function saveArtwork(imageUrl: string): Promise<SaveResult> {
  return await downloadArtwork(imageUrl);
}

export async function saveArtImageToDevice(
  imageUrl: string,
  fileName?: string,
  _title = "Weather Wallpaper"
): Promise<{ success: boolean; method: "share" | "download" | "tab" | "failed" }> {
  try {
    const res = await downloadArtwork(imageUrl, fileName);
    const methodMap: Record<string, "share" | "download" | "tab" | "failed"> = {
      saved: "download",
      shared: "share",
      opened: "tab",
      error: "failed",
    };
    return {
      success: res.status !== "error",
      method: methodMap[res.status] || "download",
    };
  } catch {
    return { success: false, method: "failed" };
  }
}

export const downloadWallpaper = downloadArtwork;
export const shareWallpaper = shareArtwork;
export const saveWallpaper = downloadArtwork;

export async function migrateLegacyLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const legacySlots = localStorage.getItem("weather:custom-art-saved");
    if (legacySlots) {
      await setWallpaperItem("weather:custom-art-saved", legacySlots);
      localStorage.removeItem("weather:custom-art-saved");
    }

    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("weather:custom-bg:") || k.startsWith("weather:custom-art:"))) {
        keysToMigrate.push(k);
      }
    }

    for (const key of keysToMigrate) {
      const val = localStorage.getItem(key);
      if (val) {
        await setWallpaperItem(key, val);
        localStorage.removeItem(key);
      }
    }
  } catch {}
}
