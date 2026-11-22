// src/lib/promoCodes.ts
import { saveThankYouBackgroundForever } from "@/lib/monetization";

const REDEEMED_CODES_KEY = "weather:redeemed-promo-codes";

/**
 * SHA-256 Hashes of the 20 single-use master codes.
 * Raw codes are strictly excluded from comments and source code.
 */
const VAULT_CODE_HASHES = new Set<string>([
  "0c0aada6d38255ee2e72e4cffc5a15d55421fab4c02faf7ce078e829fbab153b",
  "c2e600c025e432ed7ce36a03f12116c61b742573b7086987559066c95dc176b1",
  "eb12240b2c9eaeacd589b2f94e4506a453a4b25f5f89d8dc550e62288a768fed",
  "413a04fee2ba4a8db649f8ba7fbefb766e662fadcaaaab9f60972f6eeeb924d8",
  "264a5de763c5095be4d20fb553a81bd9298f3933feea62091291bbcf258432cf",
  "29473928c1a98325884bc5292a4d1d42cf686c63f6ada41ec5d3f666e5de3a79",
  "5ec7a7522297940700e6535a069f066b76f82131ec4247ef450c692ff2d0958f",
  "a5e9f9c9cfd6604ae01da60fbe018bac26fd189f7ef74c626005cda3f3ad6c48",
  "c1bb79c97a530b886bb72c6cd1ce368f7f81859db45850e24f59187a177392d6",
  "9762d617d2d8cbcb07fca614fee459198d3243042b0aec27f84ef5d8511ced14",
  "c027bf8c239486504ef37ad7cb1a6b907fafb10ca5b077914150eb9a51c2542e",
  "4785a959483c64f54634bc663d783e8df3d79c2956571e09c5f038ffbabf5cae",
  "44d4f10f10e2a348781d54f49263f80b5f64e1213511add4fd241315553780f3",
  "67c9b1647eff54d9be70842af4c162364e37329356d969fa0fec0efae87c76d8",
  "69c35090fa14194d4144b0bd4102d0416f1cad14e8fdecb26aa09f1a1d36b74e",
  "ea3869a31f45a40741ef500d33bcd36049e7a95201669576834dabc06ce78c62",
  "037b1ba23a5d7e3a574deac36f21cc451dd1f5407325839806a25b183e2394ca",
  "423a480d0177f5ebbe3a42ab2c5ad6d53206e6c08f6557ff9a894ad6f4d688be",
  "36b78a00db5ecc790efab783dedb7e46e009a4fe510bac010316f231cc165c5e",
  "36eb8e964f80dc6e6df0e58490d1ea38195d4ef089058c70cd2144f7bcf5d07d",
]);

/**
 * Browser-native SHA-256 hasher using Web Crypto API.
 */
async function computeSha256(str: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Standardize code string: handles lowercase, spaces, missing dashes,
 * and formats consistently as PAL-XXXX-XXXX.
 */
export function normalizePromoCode(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  cleaned = cleaned.replace(/[^A-Z0-9-]/g, "");

  if (/^PAL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned)) {
    return cleaned;
  }

  const noDashes = cleaned.replace(/-/g, "");
  if (noDashes.startsWith("PAL") && noDashes.length === 11) {
    return `PAL-${noDashes.slice(3, 7)}-${noDashes.slice(7, 11)}`;
  }
  if (noDashes.length === 8) {
    return `PAL-${noDashes.slice(0, 4)}-${noDashes.slice(4, 8)}`;
  }

  return cleaned;
}

export function getRedeemedHashes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REDEEMED_CODES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markHashRedeemed(hash: string): void {
  if (typeof window === "undefined") return;
  try {
    const redeemed = getRedeemedHashes();
    if (!redeemed.includes(hash)) {
      redeemed.push(hash);
      localStorage.setItem(REDEEMED_CODES_KEY, JSON.stringify(redeemed));
    }
  } catch {}
}

export interface PromoRedeemResult {
  success: boolean;
  message: string;
  tierId?: string;
}

/**
 * Validates the entered code against the cryptographic vault.
 * Burns and expires the code upon single-use redemption on this device.
 */
export async function redeemPromoCode(inputCode: string): Promise<PromoRedeemResult> {
  const normalized = normalizePromoCode(inputCode);
  if (!normalized) {
    return { success: false, message: "Please enter a valid promo code." };
  }

  const hash = await computeSha256(normalized);

  const redeemed = getRedeemedHashes();
  if (redeemed.includes(hash)) {
    return {
      success: false,
      message: "This code has already been redeemed and has expired.",
    };
  }

  if (!VAULT_CODE_HASHES.has(hash)) {
    return {
      success: false,
      message: "Invalid code. Please check and try again.",
    };
  }

  markHashRedeemed(hash);

  const partyTierId = "party_pack_root_beer_tier";
  saveThankYouBackgroundForever(partyTierId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("weather:trigger-tier-thankyou", {
        detail: { tierId: partyTierId },
      })
    );
  }

  return {
    success: true,
    message: "VIP Party Pack successfully unlocked!",
    tierId: partyTierId,
  };
}
