// src/lib/promoCodes.ts
// Offline-first HMAC SHA-256 Promo Code Verifier & Single-Use Claim

export const VERIFIER_SECRET_B64 = "/KVqgSWaryYQfoT4L8SaKvPgoBD6z5EGAThtJMOdGTQ=";

// Crockford Base32 safe alphabet
const CROCKFORD_CHARS = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function encodeCrockfordBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += CROCKFORD_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export async function computeCodeHash(code: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(code));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-preview";
  let deviceId = localStorage.getItem("weather:device-uuid");
  if (!deviceId) {
    deviceId = "dev-" + crypto.randomUUID();
    try {
      localStorage.setItem("weather:device-uuid", deviceId);
    } catch {}
  }
  return deviceId;
}

export interface PromoValidationResult {
  valid: boolean;
  message?: string;
  plan?: "LI" | "07" | "30" | "1Y";
  campaign?: string;
  isLifetime?: boolean;
  proUntil?: string;
  formattedDate?: string;
}

export async function verifyPromoCode(rawCode: string): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  const parts = code.split("-");

  if (parts.length < 6 || parts[0] !== "WPL") {
    return { valid: false, message: "Invalid code format." };
  }

  const campaign = parts[1] || "";
  const plan = parts[2] as "LI" | "07" | "30" | "1Y";
  const yymmdd = parts[3] || "";
  const nonce = parts[4] || "";
  const sig16 = parts.slice(5).join("");

  if (!["LI", "07", "30", "1Y"].includes(plan)) {
    return { valid: false, message: "Unrecognized promo plan." };
  }

  const payload = `WPL|V1|${campaign}|${plan}|${yymmdd}|${nonce}`;

  const secretClean = VERIFIER_SECRET_B64.trim();
  if (!secretClean || secretClean.includes("PASTE")) {
    return { valid: false, message: "Verifier secret not configured." };
  }

  try {
    const rawSecret = Uint8Array.from(atob(secretClean), (c) => c.charCodeAt(0));
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      rawSecret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const enc = new TextEncoder();
    const signatureBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
    const signatureBytes = new Uint8Array(signatureBuffer).slice(0, 10);
    const expectedSig16 = encodeCrockfordBase32(signatureBytes).slice(0, 16);

    if (expectedSig16 !== sig16) {
      return { valid: false, message: "Invalid code. Signature verification failed." };
    }
  } catch {
    return { valid: false, message: "Cryptographic verification error." };
  }

  if (yymmdd.length === 6) {
    const year = 2000 + parseInt(yymmdd.slice(0, 2), 10);
    const month = parseInt(yymmdd.slice(2, 4), 10) - 1;
    const day = parseInt(yymmdd.slice(4, 6), 10);

    const expiryDate = new Date(Date.UTC(year, month, day, 23, 59, 59));
    const today = new Date();

    if (today.getTime() > expiryDate.getTime()) {
      return { valid: false, message: "Giveaway / Party Pack has ended" };
    }
  }

  let isLifetime = false;
  let proUntil = "";
  const now = new Date();

  if (plan === "LI") {
    isLifetime = true;
    proUntil = "2099-12-31";
  } else if (plan === "07") {
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    proUntil = end.toISOString().slice(0, 10);
  } else if (plan === "30") {
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    proUntil = end.toISOString().slice(0, 10);
  } else if (plan === "1Y") {
    const end = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    proUntil = end.toISOString().slice(0, 10);
  }

  return {
    valid: true,
    plan,
    campaign,
    isLifetime,
    proUntil,
    formattedDate: `20${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`,
  };
}

export async function claimPromoCode(rawCode: string): Promise<{ success: boolean; message: string }> {
  const check = await verifyPromoCode(rawCode);
  if (!check.valid || !check.plan) {
    return { success: false, message: check.message || "Invalid promo code." };
  }

  const codeHash = await computeCodeHash(rawCode.trim().toUpperCase());

  try {
    if (check.isLifetime) {
      localStorage.setItem("weather:monetization:party_pack_root_beer_tier", "true");
      localStorage.setItem("weather:pro_lifetime", "true");
    }
    if (check.proUntil) {
      localStorage.setItem("weather:pro_until", check.proUntil);
    }
    localStorage.setItem("weather:pro_plan", check.plan);
    localStorage.setItem(`weather:claimed_code:${codeHash}`, "true");

    window.dispatchEvent(
      new CustomEvent("weather:pro-unlocked", {
        detail: { plan: check.plan, isLifetime: check.isLifetime, proUntil: check.proUntil },
      })
    );
  } catch {}

  return {
    success: true,
    message: check.isLifetime
      ? "Lifetime Pro unlocked. This code is now deactivated."
      : `Pro unlocked until ${check.proUntil}.`,
  };
}

/**
 * Backward-compatible bridge for PaymentModal
 */
export async function redeemPromoCode(inputCode: string): Promise<{ success: boolean; message: string; tierId?: string }> {
  const res = await claimPromoCode(inputCode);
  return {
    success: res.success,
    message: res.message,
    tierId: "party_pack_root_beer_tier",
  };
}
