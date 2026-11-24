// src/lib/wallpaperStorage.ts
// Native Zero-Dependency IndexedDB Storage for My Weather Pal Gallery & Wallpapers
// Replaces fragile 5MB localStorage with 50MB-1GB+ quota-free storage.

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

// In-memory hot cache for instant zero-flicker synchronous retrieval
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

/**
 * Retrieve an item from IndexedDB with in-memory caching and localStorage fallback.
 */
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
          // Fallback to localStorage for unmigrated data
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

/**
 * Store an item in IndexedDB safely without blowing localStorage quotas.
 */
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
    // Graceful fallback to localStorage if IndexedDB is blocked
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
}

/**
 * Remove an item from both IndexedDB and localStorage.
 */
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

/**
 * Get all saved slot artworks. Preserves exact slot order for 6 slots.
 */
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

  // Fallback to legacy localStorage
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

/**
 * Save user slot artworks.
 */
export async function saveSavedArtworks(items: SavedItem[]): Promise<void> {
  const json = JSON.stringify(items);
  await setWallpaperItem("weather:custom-art-saved", json);
}

/**
 * Clear all saved artworks from IndexedDB and local storage.
 */
export async function clearAllArtworksFromDB(): Promise<void> {
  memoryCache.delete("weather:custom-art-saved");
  await deleteWallpaperItem("weather:custom-art-saved");
}

/**
 * Apply wallpaper and broadcast live event to WeatherView and Index routes.
 * Supports both applyCustomWallpaper(url) and applyCustomWallpaper(cityName, currentCityName, imageUrl).
 */
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

/**
 * Helper to convert any image URL (including data URI) into a Blob reliably.
 */
async function resolveImageBlob(imageUrl: string): Promise<Blob> {
  if (imageUrl.startsWith("data:")) {
    const parts = imageUrl.split(",");
    const header = parts[0] || "";
    const b64 = parts[1] || "";
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(b64);
    const len = binary.length;
    const u8arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      u8arr[i] = binary.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  }

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Fetch failed");
  return await res.blob();
}

/**
 * Saves artwork to the device.
 * 1. Resolves base64 or fetches the image as a blob and creates a File.
 * 2. Uses navigator.share with files so iOS Safari displays native "Save Image".
 * 3. Falls back to an anchor object URL download with delayed URL revocation.
 * 4. Falls back to opening a new tab only if blob creation fails.
 */
export async function saveArtwork(imageUrl: string): Promise<void> {
  try {
    const blob = await resolveImageBlob(imageUrl);
    const file = new File([blob], "weatherpal-artwork.png", {
      type: blob.type || "image/png",
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "WeatherPal Artwork",
        });
        return;
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") {
          return;
        }
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = "weatherpal-artwork.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Keep object URL active for 60 seconds so browser download stream finishes
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  } catch {
    try {
      window.open(imageUrl, "_blank");
    } catch {}
  }
}

/**
 * Backward-compatible helper for slot download buttons.
 */
export async function saveArtImageToDevice(
  imageUrl: string,
  _fileName?: string,
  _title = "Weather Wallpaper"
): Promise<{ success: boolean; method: "share" | "download" | "tab" | "failed" }> {
  try {
    await saveArtwork(imageUrl);
    return { success: true, method: "share" };
  } catch {
    return { success: false, method: "failed" };
  }
}

/**
 * Seamlessly migrates existing legacy localStorage wallpapers to IndexedDB
 * and removes them from localStorage to permanently free up the 5MB browser quota.
 */
export async function migrateLegacyLocalStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    // 1. Migrate saved gallery slot items
    const legacySlots = localStorage.getItem("weather:custom-art-saved");
    if (legacySlots) {
      await setWallpaperItem("weather:custom-art-saved", legacySlots);
      localStorage.removeItem("weather:custom-art-saved");
    }

    // 2. Migrate per-city custom wallpapers
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
