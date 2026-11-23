// src/lib/promo.ts
// Direct alias and re-export of promo verification module

export {
  VERIFIER_SECRET_B64,
  verifyPromoCode,
  claimPromoCode,
  redeemPromoCode,
  type PromoValidationResult,
} from "./promoCodes";
