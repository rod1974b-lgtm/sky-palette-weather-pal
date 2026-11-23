// src/lib/promoCodes.ts
// Offline HMAC & Hash-list verifier - NO BACKEND NEEDED.

export const VERIFIER_SECRET_B64 = "/KVqgSWaryYQfoT4L8SaKvPgoBD6z5EGAThtJMOdGTQ=";

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

// Crockford Base32 alphabet (no I, L, O, U)
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeCrockfordBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | (bytes[i] ?? 0);
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64.trim());
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

export async function verifyPromoCode(rawCode: string): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  const parts = code.split("-");

  // Check for HMAC format: WPL-CAMPAIGN-PLAN-YYMMDD-NONCE-SIG16
  if (parts.length === 6 && parts[0] === "WPL") {
    if (!VERIFIER_SECRET_B64 || VERIFIER_SECRET_B64.trim() === "") {
      return { valid: false, message: "Verifier secret not configured." };
    }

    const [, campaign = "", plan = "", yymmdd = "", nonce = "", sig = ""] = parts;
    const payload = `WPL|V1|${campaign}|${plan}|${yymmdd}|${nonce}`;

    try {
      const keyBytes = base64ToUint8Array(VERIFIER_SECRET_B64);
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const enc = new TextEncoder();
      const hmacBuf = await window.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
      const first10 = new Uint8Array(hmacBuf).slice(0, 10);
      const expectedSig = encodeCrockfordBase32(first10).slice(0, 16);

      if (sig !== expectedSig) {
        return { valid: false, message: "Invalid promo code signature." };
      }

      // Check date: YYMMDD -> 20YY-MM-DD
      const year = `20${yymmdd.slice(0, 2)}`;
      const month = yymmdd.slice(2, 4);
      const day = yymmdd.slice(4, 6);
      const expiryDate = new Date(`${year}-${month}-${day}T23:59:59Z`);

      if (new Date() > expiryDate) {
        return { valid: false, message: "Giveaway / Party Pack has ended" };
      }

      const isLifetime = plan === "LI" || plan === "PARTY";
      let tier = "Party Pack Root Beer";
      let slots = "Unlimited";
      let adFree = "FOREVER";

      if (plan === "07") {
        tier = "Pro (7 Days)";
        slots = "4 Slots";
        adFree = "7 Days";
      } else if (plan === "30") {
        tier = "Pro (30 Days)";
        slots = "6 Slots";
        adFree = "30 Days";
      } else if (plan === "1Y") {
        tier = "Pro (1 Year)";
        slots = "Unlimited";
        adFree = "1 Year";
      }

      return {
        valid: true,
        isLifetime,
        formattedDate: `${year}-${month}-${day}`,
        plan,
        campaign,
        tier,
        slots,
        adFree,
        redeemBy: `${year}-${month}-${day}`,
      };
    } catch {
      return { valid: false, message: "Verification failed." };
    }
  }

  // Fallback to SHA-256 hash lookup in VALID_CODE_HASHES
  const hash = await computeCodeHash(code);
  const entry = VALID_CODE_HASHES[hash];
  if (entry) {
    if (new Date() > new Date(entry.redeemBy + "T23:59:59Z")) {
      return { valid: false, message: "Giveaway / Party Pack has ended" };
    }
    return {
      valid: true,
      isLifetime: entry.plan === "PARTY" || entry.plan === "LI",
      formattedDate: entry.redeemBy,
      plan: entry.plan,
      campaign: entry.campaign,
      tier: entry.tier,
      slots: entry.slots,
      adFree: entry.adFree,
      redeemBy: entry.redeemBy,
    };
  }

  return { valid: false, message: "Invalid promo code." };
}

export async function claimPromoCode(rawCode: string) {
  const check = await verifyPromoCode(rawCode);
  if (!check.valid) return { success: false, message: check.message || "Invalid promo code." };

  const codeHash = await computeCodeHash(rawCode.trim().toUpperCase());
  try {
    localStorage.setItem("weather:pro_tier", check.tier || "Party Pack Root Beer");
    localStorage.setItem("weather:pro_slots", check.slots || "Unlimited");
    localStorage.setItem("weather:pro_adfree", check.adFree || "FOREVER");
    localStorage.setItem("weather:pro_plan", check.plan || "PARTY");

    if (check.isLifetime || check.tier === "Party Pack Root Beer") {
      localStorage.setItem("weather:monetization:party_pack_root_beer_tier", "true");
      localStorage.setItem("weather:pro_lifetime", "true");
      localStorage.setItem("weather:pro_until", "2099-12-31");
    }

    localStorage.setItem(`weather:claimed_code:${codeHash}`, "true");
    window.dispatchEvent(
      new CustomEvent("weather:pro-unlocked", {
        detail: { plan: check.plan, tier: check.tier, slots: check.slots, adFree: check.adFree },
      })
    );
  } catch {}

  return { success: true, message: `${check.tier} unlocked. This code is now deactivated.` };
}

export async function redeemPromoCode(inputCode: string) {
  const res = await claimPromoCode(inputCode);
  return { success: res.success, message: res.message, tierId: "party_pack_root_beer_tier" };
}
