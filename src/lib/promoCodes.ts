// src/lib/promoCodes.ts
// Offline Hash-list verifier - NO SECRET, NO BACKEND, NO ENV NEEDED.

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

function isCodeAlreadyClaimed(codeHash: string): boolean {
  try {
    return localStorage.getItem(`weather:claimed_code:${codeHash}`) === "true";
  } catch {
    return false;
  }
}

export const VALID_CODE_HASHES: Record<
  string,
  { plan: string; campaign: string; tier: string; slots: string; adFree: string; redeemBy: string }
> = {
  // ===== PARTY PACK - KEEP AS IS - ALREADY WORKING =====
  const VALID_CODE_HASHES = {
   "219349f74b014c3c39a19e4e708f1f8b246d2bd422eec843b1463de496739976": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "45606187aef68e7d0820fce1374b0969159557cd1802b8290536b32dea4f4e27": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "f651faa2de74277093cccfcd8fa2978a17cc50e2517e69ab1c0f0a0bbfb5a22b": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "287268b03c4ecbc30eb8f01e54a21a80c80cc32ad6e50b6697bc190136d408fa": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "ac3a96f7a9f2e841e8fabcad62c0383eae06674aba509aa98fcaed72a4322b60": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "44cb369a2c9bc71a9731015e89f4d3a974bc3a96ff958575feb303c3345d9455": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "b53d3c067be183d05f9d859bde11fa928f2088f86bce97c0f029e6f15d4f7267": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "3516345c58afb7be2a8960d601ce1444afd14a76e670bcdf9403e0ec60f86753": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "1f5084ad19205406bc814358aae1025e25e2645b5d4d2ad07b53a472870fe18b": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
  "ada517a04dcfb9db178905648c8ff0973fd900094d52551c04873eee2f0eedc3": { plan: "PARTY", campaign: "PARTY", tier: "Party Pack Root Beer", slots: "Unlimited", adFree: "FOREVER", redeemBy: "2026-12-24" },
};

  // ===== GENERIC - SMALL ROOT BEER - $1.00 / 2 slots / 0 days ad-free =====
const VALID_CODE_HASHES = {
  "57216b7c780277541405ede967dae8624643b81c41ba13e308faffd7de391baf": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "4024bb5c8bd389f68532bf6cb83b67a75c5943599aac254a4f50c55768e3b4fd": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "8ee571a044a97b48eedaa25ef9df2740e209a8ba81e38221b68dff3cba165024": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "85041e04b5a587dfbf90bbe65315a7bfe01f0cbc4334cae54cac4c6867f269c8": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "a4ba6804322ac2318f8ca07e50a2081014c0a970f26e8768253e47f4f9d03582": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "4af5041537f45bb413be5d80372fc370cbab8443d432a799acc603f58258fcbd": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "54f87709fd8979033c3ec1601bf58619771cb2ca26047922dbf4660343d9335a": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "47bd6a13105b6c143da35e799be859a163e81a254945972ee5f8b9f697506cc8": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "5f26b2c6a9f3fdcb551413826b549082a43aa92578adbd28334128ac22cb740b": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
  "6e017819139acdcafa615bc70dcdd813ef17c7a5547d9b2988a6b7953997f3cf": { plan: "SMALL", campaign: "SMALL", tier: "Small Root Beer", slots: 2, adFree: "0 days", redeemBy: "2026-12-24" },
};
  
  // ===== GENERIC - MEDIUM ROOT BEER - $3.00 / 4 slots / 30 days ad-free =====
 const VALID_CODE_HASHES = {
  "0ad37f79941a035a3942f7675254a5dfa0d6f95b1f2d3f93388c03a7193fc90d": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "c2c4bf759057773b49a00092249c2700f920f120916311264320cfce9bfc6f3e": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "fe6508fc12162f18c38ff5d62790cc42889bba98ebb2c11668a458bf60174eff": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "214803b0a3a771f796cece45348dd77d845f1cf61172167a23f3e1c17bcbd4a3": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "dd1e35dbfbe822ec40615d30f3f6679e66da35b72861a644caff94c1b51e895c": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "c9df71d4af034333e8c9ddcb59a6f45b97d5d9655a55d45bfbab69854c8348b5": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "5170714359e1dfe4aea294a0dee4aee65dfda5ec04e6464c8ba4119dce9c1e59": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "efc53ca7765f274924759d462eccbea57d8333c521cc58fec6af03c618972c2a": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "1da0f64a9336081938e2a17420a11211ccacf3742d046ef1f1a75435c5e9eea3": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
  "f44e393571e037f099de40b4a9e6861b74099f84a9c672d766ba142b889d90fa": { plan: "MEDIUM", campaign: "MEDIUM", tier: "Medium Root Beer", slots: 4, adFree: "30 days", redeemBy: "2026-12-24" },
};
  // ===== GENERIC - LARGE ROOT BEER - $5.00 / 6 slots / 365 days ad-free =====
const VALID_CODE_HASHES = {
  "84468fa9cad6652c33737deeda265b1900d8f287ff92b14e8c7c212c20f6613a": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "9b5b1dce49f7e7cceb90efed21c7c127ae2b9780af5804cec67803b8fdf7156d": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "c1e9ba6bb42414e7788f57b73c72c1d68b04062a8d548defd224e473c2d72bbd": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "b2207c074ed777081aa4302fa401d980c270b9c35777ea8ee498346164f96977": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "5b3c90f7f86e82d1f71bd484d2e1aad5e2a12f377f3e87b5b1c5ca4c42ed00ff": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "bfa829906107868421243cab8cee702bcd5096f1357a3f6b50833c6e8706f78b": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "65d0636139b3970b47b5ef54ccd6567fee90389e43f6d8ac0459041641825065": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "7ff912fc388a57f9ffa0ec89cab32cfb8352e4a9c33cdf775f827d713c78bc8d": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "0aad0ba92dbe601829559570fba428acae0ecb0f5a5108e4c36cad47736cde6b": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
  "d5c6ffdc083bd8bfc7b6ad0d18deb9415e65cc143bdb1d3fde85c144f5632219": { plan: "LARGE", campaign: "LARGE", tier: "Large Root Beer", slots: 6, adFree: "365 days", redeemBy: "2026-12-24" },
};

export async function verifyPromoCode(rawCode: string, expectedTier?: string): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  const hash = await computeCodeHash(code);

  // 1-use check - if already claimed on this device, reject
  if (isCodeAlreadyClaimed(hash)) {
    return { valid: false, message: "This code has already been used." };
  }

  // Hash list only - no secret, no HMAC
  const entry = VALID_CODE_HASHES[hash];
  if (!entry) {
    return { valid: false, message: "Invalid promo code." };
  }

  if (new Date() > new Date(entry.redeemBy + "T23:59:59Z")) {
    return { valid: false, message: "Giveaway / Party Pack has ended" };
  }

  // Tier check - code must match the tier the user selected
  if (expectedTier && entry.tier !== expectedTier) {
    return { valid: false, message: `This code is for ${entry.tier}, not ${expectedTier}.` };
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

export async function claimPromoCode(rawCode: string, expectedTier?: string) {
  const check = await verifyPromoCode(rawCode, expectedTier);
  if (!check.valid) return { success: false, message: check.message || "Invalid promo code." };

  const codeHash = await computeCodeHash(rawCode.trim().toUpperCase());
  if (isCodeAlreadyClaimed(codeHash)) {
    return { success: false, message: "This code has already been used." };
  }

  try {
    localStorage.setItem("weather:pro_tier", check.tier || "Party Pack Root Beer");
    localStorage.setItem("weather:pro_slots", check.slots || "Unlimited");
    localStorage.setItem("weather:pro_adfree", check.adFree || "FOREVER");
    localStorage.setItem("weather:pro_plan", check.plan || "PARTY");

    if (check.isLifetime || check.tier === "Party Pack Root Beer") {
      localStorage.setItem("weather:monetization:party_pack_root_beer_tier", "true");
      localStorage.setItem("weather:pro_lifetime", "true");
      localStorage.setItem("weather:pro_until", "2099-12-31");
    } else if (check.adFree === "30 Days") {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      localStorage.setItem("weather:pro_until", until.toISOString().slice(0, 10));
      localStorage.removeItem("weather:pro_lifetime");
    } else if (check.adFree === "365 Days") {
      const until = new Date();
      until.setDate(until.getDate() + 365);
      localStorage.setItem("weather:pro_until", until.toISOString().slice(0, 10));
      localStorage.removeItem("weather:pro_lifetime");
    } else {
      localStorage.removeItem("weather:pro_lifetime");
      localStorage.removeItem("weather:pro_until");
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

export async function redeemPromoCode(inputCode: string, expectedTier?: string) {
  const res = await claimPromoCode(inputCode, expectedTier);
  return { success: res.success, message: res.message, tierId: "party_pack_root_beer_tier" };
}
