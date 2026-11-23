// src/lib/promoCodes.ts
// Hash-list verifier - NO SECRET, NO ENV NEEDED.

export const VALID_CODE_HASHES: Record<string, { plan: string; campaign: string; tier: string; slots: string; adFree: string; redeemBy: string }> = {
  // PASTE HASH LIST HERE FROM GENERATOR
};

export async function computeCodeHash(code: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await window.crypto.subtle.digest("SHA-256", enc.encode(code.trim().toUpperCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPromoCode(rawCode: string) {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  const parts = code.split("-");
  if (parts.length < 6 || parts[0] !== "WPL") return { valid: false, message: "Invalid code format." };
  const hash = await computeCodeHash(code);
  const entry = VALID_CODE_HASHES[hash];
  if (!entry) return { valid: false, message: "Invalid code." };
  if (new Date() > new Date(entry.redeemBy + "T23:59:59Z")) return { valid: false, message: "Giveaway / Party Pack has ended" };
  return { valid: true, plan: entry.plan, campaign: entry.campaign, tier: entry.tier, slots: entry.slots, adFree: entry.adFree };
}

export async function claimPromoCode(rawCode: string) {
  const check = await verifyPromoCode(rawCode);
  if (!check.valid) return { success: false, message: check.message || "Invalid promo code." };
  const codeHash = await computeCodeHash(rawCode.trim().toUpperCase());
  try {
    localStorage.setItem("weather:pro_tier", (check as any).tier);
    localStorage.setItem("weather:pro_slots", (check as any).slots);
    localStorage.setItem("weather:pro_adfree", (check as any).adFree);
    localStorage.setItem("weather:pro_plan", (check as any).plan);
    if ((check as any).tier === "Party Pack Root Beer") {
      localStorage.setItem("weather:monetization:party_pack_root_beer_tier", "true");
      localStorage.setItem("weather:pro_lifetime", "true");
      localStorage.setItem("weather:pro_until", "2099-12-31");
    }
    localStorage.setItem(`weather:claimed_code:${codeHash}`, "true");
    window.dispatchEvent(new CustomEvent("weather:pro-unlocked", { detail: { plan: (check as any).plan, tier: (check as any).tier, slots: (check as any).slots, adFree: (check as any).adFree } }));
  } catch {}
  return { success: true, message: `${(check as any).tier} unlocked. This code is now deactivated.` };
}

export async function redeemPromoCode(inputCode: string) {
  const res = await claimPromoCode(inputCode);
  return { success: res.success, message: res.message, tierId: "party_pack_root_beer_tier" };
}
