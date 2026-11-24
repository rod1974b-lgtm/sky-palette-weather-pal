// src/lib/saveWallpaper.ts
// FREE fix for: Gallery opens wallpaper but Save to Downloads does nothing on phone
// Why it failed before:
//  - iOS Safari IGNORES anchor download attribute - it just opens the image, never saves it
//  - Android Chrome blocks anchor download attribute for cross-origin URLs and for blob URLs inside Lovable's iframe preview
//  - AI images / Unsplash / external URLs often fail CORS fetch, so blob was never created
// Fix: fetch -> blob -> try Capacitor (if installed) -> try navigator.share with File (iOS/Android) -> try anchor download with blob -> fallback open in new tab + long-press
// No paid plugin, no new dependency. Works in Lovable preview, PWA, and installed app.

export type SaveStatus = "saved" | "shared" | "opened" | "error";

export interface SaveResult {
  status: SaveStatus;
  message: string;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return isIOS() || isAndroid() || (typeof navigator !== "undefined" && /Mobi|Mobile/.test(navigator.userAgent));
}

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function cleanFileName(name: string, fallback = "weather-pal-wallpaper"): string {
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
  // Keep .jpg by default - smallest + universal for Photos / Downloads / Gallery
  return cleaned.endsWith(".jpg") || cleaned.endsWith(".png") || cleaned.endsWith(".webp") ? cleaned : `${cleaned}.jpg`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      // Strip data:...;base64, prefix - Capacitor Filesystem wants raw base64
      resolve(res.split(",")[1] || res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    if (header.includes("base64")) {
      const bin = atob(data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  } catch {
    return null;
  }
}

// Try to get a Blob even when CORS blocks fetch - draw via <img> + canvas
async function canvasFallbackBlob(imageUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
    // Timeout - don't hang the Save button
    setTimeout(() => resolve(null), 8000);
  });
}

export async function urlToBlob(imageUrl: string): Promise<Blob | null> {
  // 1) data: URL (AI Gallery often returns base64) - no fetch needed
  if (imageUrl.startsWith("data:")) {
    return dataUrlToBlob(imageUrl);
  }
  // 2) Normal fetch -> blob (best quality, keeps original)
  try {
    const res = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    // CORS blocked - fall through to canvas
  }
  // 3) Canvas fallback for cross-origin images
  return await canvasFallbackBlob(imageUrl);
}

// --- Capacitor (optional, FREE if you already use Capacitor) ---
// If your app is built with Capacitor, this writes to Cache then shares via native Share sheet
// which puts it in Photos / Gallery / Downloads. If Capacitor is NOT installed, this is skipped.
async function tryCapacitorSave(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const cap = (window as any).Capacitor;
    if (!cap || !cap.Plugins?.Filesystem) return false;
    const { Filesystem, Directory } = cap.Plugins;
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    // Try native Share - this is what actually puts it in Gallery on Android/iOS
    if (cap.Plugins.Share) {
      await cap.Plugins.Share.share({
        title: "Weather Pal Wallpaper",
        url: saved.uri,
        dialogTitle: "Save wallpaper",
      });
      return true;
    }
    // No Share plugin - at least file is in Cache, open it
    window.open(saved.uri, "_blank");
    return true;
  } catch {
    return false;
  }
}

// --- Web Share API - THE fix for iPhone ---
async function tryWebShare(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const nav = navigator as any;
    if (!nav.share || !nav.canShare) return false;
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({
      files: [file],
      title: "Weather Pal Wallpaper",
      text: "My Weather Pal wallpaper",
    });
    return true;
  } catch (err: any) {
    // User closed share sheet = AbortError - treat as cancelled, not failed
    if (err?.name === "AbortError") return true;
    return false;
  }
}

function anchorDownload(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    // Must be in DOM for Firefox / mobile WebView
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after a delay - iOS needs time to open it
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

/**
 * MAIN FUNCTION - call this from Hero Card + AI Gallery Save buttons
 * Usage: const result = await saveWallpaperToDownloads(imageUrl, "weather-pal-clear-day")
 */
export async function saveWallpaperToDownloads(imageUrl: string, rawFileName: string): Promise<SaveResult> {
  const fileName = cleanFileName(rawFileName);

  if (!imageUrl) {
    return { status: "error", message: "No image to save." };
  }

  // Get blob first - everything else needs it
  const blob = await urlToBlob(imageUrl);

  if (!blob) {
    // Last resort: open original in new tab so user can long-press -> Save Image
    window.open(imageUrl, "_blank", "noopener,noreferrer");
    return {
      status: "opened",
      message: isIOS()
        ? "Opened in new tab. Long-press the image → Save to Photos."
        : "Opened in new tab. Long-press the image → Download image / Save.",
    };
  }

  // 1) Capacitor native path (if app is Capacitor-wrapped) - best for installed app
  if (await tryCapacitorSave(blob, fileName)) {
    return { status: "saved", message: "Saved! Check Photos / Gallery / Downloads." };
  }

  // 2) iPhone / iPad MUST use Share sheet - anchor download does nothing on iOS Safari
  //    Also best on Android PWA - Share -> Save to Files / Downloads / Photos
  if (isMobile()) {
    if (await tryWebShare(blob, fileName)) {
      return {
        status: "shared",
        message: isIOS()
          ? "Share sheet opened. Tap Save Image or Save to Files."
          : "Share sheet opened. Tap Save to Downloads / Save to Files.",
      };
    }
    // Share failed / not supported - fall through to anchor download
  }

  // 3) Desktop + Android Chrome - blob + anchor download works
  //    In Lovable iframe preview, download is blocked, so open in new tab instead
  if (isInIframe()) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return {
      status: "opened",
      message: isIOS()
        ? "Opened in new tab (preview blocks download). Long-press → Save to Photos."
        : "Opened in new tab (preview blocks download). Long-press → Download image.",
    };
  }

  if (anchorDownload(blob, fileName)) {
    return { status: "saved", message: "Saved to Downloads! Check your Downloads folder." };
  }

  // 4) Ultimate fallback
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  return {
    status: "opened",
    message: isIOS()
      ? "Opened in new tab. Long-press the image → Save to Photos."
      : "Opened in new tab. Long-press the image → Download image.",
  };
}
