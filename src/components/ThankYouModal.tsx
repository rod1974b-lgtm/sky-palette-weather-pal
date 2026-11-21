// src/components/ThankYouModal.tsx
// FIXED — v2
// WHAT WAS BROKEN:
// 1. TIER_LABELS + TIER_MESSAGES were hardcoded English. In Thai / Spanish / etc. the modal
//    still showed "Small Root Beer" + "You unlocked a special thank-you background. Cheers!"
//    even though translations ALREADY existed in locales/*.json + i18nExtra Part 1/2:
//      thank_you_message_small_root_beer_tier, ..._medium_..., ..._large_..., ..._party_pack_...
//    FIX: Messages now use t(`thank_you_message_${tier}`, englishFallback). Labels use
//    monetization as source of truth (see #2). English fallbacks below are ONLY fallbacks
//    if i18n is missing — they are the same English strings as before, not the display source.
// 2. TIER_LABELS duplicated monetization. PaymentModal already shows tier.name from
//    ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE. If you renamed a tier in monetization.ts,
//    ThankYouModal would still show the old hardcoded name. FIX: Label now comes from
//    ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find(t => t.id === tier)?.name.
//    Tier names are product names, so they stay in English in all languages — same as
//    PaymentModal's header. That is intentional, not a missing translation.
// 3. NO tier validation: unknown tier showed raw tier id as label + generic message, no crash,
//    but also no clear fallback. FIX: isKnownTier check. Unknown tier -> label = raw tier id
//    (same as before, no crash) + generic message + NO ad-free line.
// 4. NO ad-free duration line at all: Medium (30 days) and Large (365 days) and Party Pack
//    (forever) all looked the same. FIX: New ad-free line from monetization source of truth:
//      - Party Pack: adFreeForever=true  -> t("thank_you_adfree_forever")
//      - Medium: durationDays=30         -> t("thank_you_adfree_days", { days: 30 })
//      - Large:  durationDays=365        -> t("thank_you_adfree_days", { days: 365 })
//      - Small:  durationDays=null, adFreeForever=false -> NO line (Small has no ad-free).
//    Keys thank_you_adfree_forever / thank_you_adfree_days already exist in all 14 main
//    locales with {{days}} placeholder. No new locale keys needed.
// 5. thank_you_unlocked collision: Part 1 + Part 4 + main all have thank_you_unlocked with
//    slightly different wording per language (e.g. Thai differs). i18n.ts already creates
//    safe aliases thank_you_supporter_unlocked (Part 1) + thank_you_bg_unlocked (Part 4).
//    FIX: This supporter modal now uses t("thank_you_supporter_unlocked") explicitly.
// 6. continue collision: main has NO continue key, so t("continue") fell through to Part 4.
//    That happened to work, but would break if main ever adds generic continue="Continue".
//    i18n.ts already creates continue_to_weather = Part 4's "Continue to Weather".
//    FIX: Button now uses t("continue_to_weather", "Continue to Weather") explicitly.
// 7. aria-label="Thank you" was hardcoded English. FIX: aria-label now uses t("thank_you_title").
// KEPT AS-IS: Escape closes, role="dialog" aria-modal, click backdrop closes, click card stops
// propagation, layout / classes / emoji, default export.
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE } from "@/lib/monetization";

type ThankYouModalProps = {
  tier: string;
  onClose: () => void;
};

// English fallbacks ONLY — used if i18n key is missing. Display source is locales/*.json.
// Same English strings as the old hardcoded TIER_MESSAGES, kept so fallback behaviour is identical.
const TIER_MESSAGE_FALLBACKS: Record<string, string> = {
  small_root_beer_tier: "You unlocked a special thank-you background. Cheers!",
  medium_root_beer_tier: "You unlocked a special thank-you background + extra art. Cheers!",
  large_root_beer_tier: "You unlocked the full thank-you collection. Thank you so much!",
  party_pack_root_beer_tier: "You unlocked everything in the party pack. You're legendary!",
};

const GENERIC_MESSAGE_FALLBACK =
  "Your thank-you background is unlocked forever. Thank you!";

export function ThankYouModal({ tier, onClose }: ThankYouModalProps) {
  const { t } = useTranslation();

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // FIXED #2 + #3: Single source of truth = monetization. Validate tier.
  const tierObj = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find((x) => x.id === tier);
  const isKnownTier = !!tierObj;
  // Label from monetization. Unknown tier -> show raw tier id, same as before, no crash.
  const label = tierObj?.name ?? tier;

  // FIXED #1: Message from i18n. Unknown tier -> generic message.
  const message = isKnownTier
    ? t(`thank_you_message_${tier}`, TIER_MESSAGE_FALLBACKS[tier] ?? GENERIC_MESSAGE_FALLBACK)
    : t("thank_you_message_generic", GENERIC_MESSAGE_FALLBACK);

  // FIXED #4: Correct ad-free duration from monetization. Small -> no line.
  const adFreeLine = (() => {
    if (!tierObj) return null;
    if (tierObj.adFreeForever) {
      return t("thank_you_adfree_forever", "Ad-free forever");
    }
    if (tierObj.durationDays) {
      return t("thank_you_adfree_days", "Ad-free for {{days}} days — backgrounds stay forever", {
        days: tierObj.durationDays,
      });
    }
    return null;
  })();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("thank_you_title", "Thank You!")}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-card text-card-foreground border border-border shadow-2xl p-6 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl">🍺</div>

        <div>
          <h2 className="text-xl font-black tracking-tight">
            {t("thank_you_title", "Thank You!")}
          </h2>
          <p className="text-sm font-bold text-primary mt-1">{label}</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>

        {adFreeLine && (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {adFreeLine}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {t(
            // FIXED #5: was thank_you_unlocked (collides Part 1 / Part 4 / main). Now explicit supporter alias.
            "thank_you_supporter_unlocked",
            "Your thank-you background is now saved forever on this device."
          )}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:opacity-90 transition cursor-pointer"
        >
          {t("continue_to_weather", "Continue to Weather")}
        </button>
      </div>
    </div>
  );
}

export default ThankYouModal;
