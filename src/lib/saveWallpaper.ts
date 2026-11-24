// src/lib/saveWallpaper.ts
// FREE universal wallpaper download & share utility
// Solves:
//  - iOS Safari ignores <a download> (requires Web Share with File to offer "Save Image")
//  - Android Chrome downloads directly to Downloads folder with <a download>
//  - AI images / Unsplash / external URLs with CORS restrictions use Canvas fallback
//  - Works in Lovable iframe preview, PWA, Capacitor, and standalone mobile browsers

export type SaveStatus = "saved" | "shared" | "opened" | "error";

export interface SaveResult {
  status: SaveStatus;
  message: string;
}

export interface SaveOptions {
  mode?: "download" | "share";
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return (
    isIOS() ||
    isAndroid() ||
    (typeof navigator !== "undefined" && /Mobi|Mobile/.test(navigator.userAgent))
  );
}

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function cleanFileName(name: string, fallback = "weather-pal-wallpaper"): string {
  const cleaned =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || fallback;

  return cleaned.endsWith(".jpg") || cleaned.endsWith(".png") || cleaned.endsWith(".webp")
    ? cleaned
    : `${cleaned}.jpg`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] || res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, data] = dataUrl.split(",");
    const mime = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
    if (header?.includes("base64")) {
      const bin = atob(data || "");
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data || "")], { type: mime });
  } catch {
    return null;
  }
}

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
    setTimeout(() => resolve(null), 8000);
  });
}

export async function urlToBlob(imageUrl: string): Promise<Blob | null> {
  if (imageUrl.startsWith("data:")) {
    return dataUrlToBlob(imageUrl);
  }
  try {
    const res = await fetch(imageUrl, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    }
  } catch {
    // CORS blocked - fall through to canvas
  }
  return await canvasFallbackBlob(imageUrl);
}

async function tryCapacitorSave(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: { Filesystem?: { writeFile: (args: unknown) => Promise<{ uri: string }>; Directory?: { Cache: unknown } }; Share?: { share: (args: unknown) => Promise<unknown> } } } }).Capacitor;
    if (!cap || !cap.Plugins?.Filesystem) return false;
    const { Filesystem, Directory } = cap.Plugins;
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory?.Cache,
    });
    if (cap.Plugins.Share) {
      await cap.Plugins.Share.share({
        title: "Weather Pal Wallpaper",
        url: saved.uri,
        dialogTitle: "Save wallpaper",
      });
      return true;
    }
    window.open(saved.uri, "_blank");
    return true;
  } catch {
    return false;
  }
}

async function tryWebShare(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const nav = navigator as unknown as {
      share?: (data: unknown) => Promise<void>;
      canShare?: (data: unknown) => boolean;
    };
    if (!nav.share || !nav.canShare) return false;
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({
      files: [file],
      title: "Weather Pal Wallpaper",
      text: "My Weather Pal wallpaper",
    });
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === "AbortError") return true;
    return false;
  }
}

function anchorDownload(blob: Blob, fileName: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Universal wallpaper saver supporting both direct download and native share modes.
 */
export async function saveWallpaperToDownloads(
  imageUrl: string,
  rawFileName: string,
  options?: SaveOptions
): Promise<SaveResult> {
  const mode = options?.mode || "download";
  const fileName = cleanFileName(rawFileName);

  if (!imageUrl) {
    return { status: "error", message: "No image to save." };
  }

  const blob = await urlToBlob(imageUrl);

  if (!blob) {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
    return {
      status: "opened",
      message: isIOS()
        ? "Opened in new tab. Long-press the image → Save to Photos."
        : "Opened in new tab. Long-press the image → Download image / Save.",
    };
  }

  // 1. Explicit SHARE mode (user clicked Save to Gallery / Share)
  if (mode === "share") {
    if (await tryCapacitorSave(blob, fileName)) {
      return { status: "saved", message: "Saved! Check Photos / Gallery / Downloads." };
    }
    if (await tryWebShare(blob, fileName)) {
      return {
        status: "shared",
        message: isIOS()
          ? "Share sheet opened. Tap Save Image or Save to Files."
          : "Share sheet opened. Tap Save to Photos / Gallery.",
      };
    }
  }

  // 2. Direct DOWNLOAD mode on iPhone: Safari ignores <a download>, so share sheet is required
  if (isIOS()) {
    if (await tryCapacitorSave(blob, fileName)) {
      return { status: "saved", message: "Saved! Check Photos / Gallery / Downloads." };
    }
    if (await tryWebShare(blob, fileName)) {
      return {
        status: "shared",
        message: "Share sheet opened. Tap Save Image or Save to Files.",
      };
    }
  }

  // 3. Direct DOWNLOAD mode on Android / Desktop:
  // If in Lovable preview iframe, anchor downloads are restricted; open object URL
  if (isInIframe()) {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
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

  // Fallback to share sheet if anchor download failed
  if (await tryWebShare(blob, fileName)) {
    return {
      status: "shared",
      message: "Share sheet opened. Tap Save to Downloads / Save to Files.",
    };
  }

  // Ultimate fallback
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  return {
    status: "opened",
    message: isIOS()
      ? "Opened in new tab. Long-press the image → Save to Photos."
      : "Opened in new tab. Long-press the image → Download image.",
  };
}
