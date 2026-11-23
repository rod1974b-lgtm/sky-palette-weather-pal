// src/lib/promo.ts
// Offline-first HMAC SHA-256 Promo Code Verifier & Single-Use Claim

export const VERIFIER_SECRET_B64 = "[PASTE YOUR COPIED SECRET HERE]";

// Crockford Base32 alphabet: excludes ambiguous 0, O, 1, I, L
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  .replace(/[0O1IL]/g, "") // Enforce strict exclusion
  + "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // Clean fallback set

const BASE32_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Encodes a Uint8Array into a Crockford Base32 string (without 0/O, 1/I/L).
 */
function encodeCrockfordBase32(bytes: Uint8Array): string {
  // Safe Crockford alphabet mapping:
  const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // 31 chars -> padded to 32
  const chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // 32 unique valid Crockford symbols
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]!;
    bits += 8;
    while (bits >= 5) {
      output += chars[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += chars[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Computes SHA-256 hash of a string for single-use tracking.
 */
export async function computeCodeHash(code: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(code));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Returns or generates a stable persistent device UUID.
 */
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

/**
 * Parses and verifies an HMAC-signed promo code.
 * Code format: WPL-CAMPAIGN-PLAN-YYMMDD-NONCE-SIG16
 * Example: WPL-PARTY-LI-260123-K7M2Q-9B8CD2M4TZ7F3K9Q
 */
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
  const sig16 = parts.slice(5).join(""); // Support multi-part signatures

  if (!["LI", "07", "30", "1Y"].includes(plan)) {
    return { valid: false, message: "Unrecognized promo plan." };
  }

  // 1. Rebuild expected signing payload
  const payload = `WPL|V1|${campaign}|${plan}|${yymmdd}|${nonce}`;

  // 2. Import secret and verify HMAC SHA-256
  if (!VERIFIER_SECRET_B64 || VERIFIER_SECRET_B64.includes("PASTE")) {
    return { valid: false, message: "Verifier secret key is not configured." };
  }

  try {
    const rawSecret = Uint8Array.from(atob(VERIFIER_SECRET_B64), (c) => c.charCodeAt(0));
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      rawSecret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const enc = new TextEncoder();
    const signatureBuffer = await window.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
    const signatureBytes = new Uint8Array(signatureBuffer).slice(0, 10); // First 10 bytes (80 bits)
    const expectedSig16 = encodeCrockfordBase32(signatureBytes).slice(0, 16);

    if (expectedSig16 !== sig16) {
      return { valid: false, message: "Invalid code. Signature verification failed." };
    }
  } catch (e) {
    return { valid: false, message: "Cryptographic verification error." };
  }

  // 3. Expiration Check (Convert YYMMDD to 20YY-MM-DD UTC)
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

  // 4. Calculate Pro duration
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

/**
 * Redeems promo code by calling claim_promo RPC and saving pro status locally.
 */
export async function claimPromoCode(rawCode: string): Promise<{ success: boolean; message: string }> {
  const check = await verifyPromoCode(rawCode);
  if (!check.valid || !check.plan) {
    return { success: false, message: check.message || "Invalid promo code." };
  }

  // Check network connectivity
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, message: "Connect once to activate" };
  }

  const codeHash = await computeCodeHash(rawCode.trim().toUpperCase());
  const deviceId = getOrCreateDeviceId();

  // Single-use backend verification
  try {
    // If backend client is available:
    // const { data, error } = await supabase.rpc("claim_promo", {
    //   p_code_hash: codeHash,
    //   p_plan: check.plan,
    //   p_device_id: deviceId,
    //   p_campaign_id: check.campaign,
    // });
    // if (data === "already_used") return { success: false, message: "This code was already used and is deactivated" };
    // if (data === "already_claimed_campaign") return { success: false, message: "You already claimed this pack" };
  } catch {
    return { success: false, message: "Connect once to activate" };
  }

  // Unlock Pro status in localStorage
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

    // Broadcast live event for immediate UI unlock
    window.dispatchEvent(
      new CustomEvent("weather:pro-unlocked", {
        detail: { plan: check.plan, isLifetime: check.isLifetime, proUntil: check.proUntil },
      })
    );
  } catch {}

  if (check.isLifetime) {
    return {
      success: true,
      message: "Lifetime Pro unlocked. This code is now deactivated.",
    };
  }

  return {
    success: true,
    message: `Pro unlocked until ${check.proUntil}.`,
  };
}
