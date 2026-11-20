import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type ThankYouModalProps = {
  tier: string;
  onClose: () => void;
};

const TIER_LABELS: Record<string, string> = {
  small_root_beer_tier: "Small Root Beer",
  medium_root_beer_tier: "Medium Root Beer",
  large_root_beer_tier: "Large Root Beer",
  party_pack_root_beer_tier: "Party Pack Root Beer",
};

const TIER_MESSAGES: Record<string, string> = {
  small_root_beer_tier: "You unlocked a special thank-you background. Cheers!",
  medium_root_beer_tier: "You unlocked a special thank-you background + extra art. Cheers!",
  large_root_beer_tier: "You unlocked the full thank-you collection. Thank you so much!",
  party_pack_root_beer_tier: "You unlocked everything in the party pack. You're legendary!",
};

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

  const label = TIER_LABELS[tier] ?? tier;
  const message =
    TIER_MESSAGES[tier] ??
    "Your thank-you background is unlocked forever. Thank you!";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Thank you"
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

        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        <p className="text-xs text-muted-foreground">
          {t(
            "thank_you_unlocked",
            "Your thank-you background is now saved forever on this device."
          )}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:opacity-90 transition cursor-pointer"
        >
          {t("continue", "Continue to Weather")}
        </button>
      </div>
    </div>
  );
}

export default ThankYouModal;
