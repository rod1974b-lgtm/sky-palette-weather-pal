// src/lib/promoCodes.ts
// Hash-list verifier - NO SECRET, NO HMAC, NO SIGNATURE.

export interface PromoValidationResult {
  valid: boolean;
  message?: string;
  isLifetime?: boolean;
  formattedDate?: string;
  plan?: string;
  campaign?: string;
  tier?: string;
  slots?: string;
  adFree?: string;
  redeemBy?: string;
}

export async function computeCodeHash(code: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(code.trim().toUpperCase()));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const VALID_CODE_HASHES: Record<
  string,
  { plan: string; campaign: string; tier: string; slots: string; adFree: string; redeemBy: string }
> = {
  "26b704774f06ccc4baf1a78336a80fa9e583c4c27ee68b73218f42e23095a907": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "eb8a87c6d9c1e547ed51f38fd100e96d17c73a90bdf500afe21a1eb0afb18e55": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "0b7b225576c022f87f5239bf719e8b3a919827fa4c415d863f30b5c895de5bd5": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "2459e59ea44124e8e353670bbcfcff7fbc1383ee2120872be3dbeec051305676": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "6e9668327ec0373b0c292068c9ecc7de1f0d92151fcfc643db6e2f324480b0d5": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "df731f5539e2c0c8c84c50c33725141b06a74244f55e953bb7a269ab0e918f3d": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "480c539d2dd8468bfefac163e1ff5258a72d70652054f87e12feb3e96387153a": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "88f6b6f9bd1519bd3592d0814cbf1faa864fe8ca56fe7b26b01906e69f5dac05": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "c493a1977faa79e97ab86d4f4c3df74d6e1c4f97ab66a9ec00a1674cb31c71c9": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
  "8dab831169d106db81134d83811de9536a1e14b853098e9032e46f11271c1009": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-23" },
};

export async function verifyPromoCode(rawCode
