// src/components/PaymentModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE,
  getDonationUrl,
  isMedianAndroidApp,
  purchaseTierViaGooglePlay,
  saveThankYouBackgroundForever,
  setPendingDonationTier,
  type RootBeerTier,
  type DonationProvider,
} from "@/lib/monetization";
import { redeemPromoCode } from "@/lib/promoCodes";

interface PaymentModalProps {
  tierId: string;
  onClose: () => void;
  onSuccess?: (tierId: string) => void;
}

export function PaymentModal({ tierId, onClose, onSuccess }: PaymentModalProps) {
  const { t } = useTranslation();
  const [hasOpenedCheckout, setHasOpenedCheckout] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [playBillingLoading, setPlayBillingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Promo Code Redemption State
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const tier: RootBeerTier | undefined = ROOT_BEER_TIERS_DEEPER_AMBER_NO_PRICE.find(
    (t) => t.id === tierId
  );

  if (!tier) return null;

  const isAndroidMedian = typeof window !== "undefined" && isMedianAndroidApp();

  const handleOpenWebPayment = (provider: DonationProvider, label: string) => {
    try {
      setPendingDonationTier(tier.id);
      const url = getDonationUrl(tier.id, provider);
      setSelectedProvider(label);
      setHasOpenedCheckout(true);
      setErrorMessage(null);

      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = url;
      }
    } catch {
      setErrorMessage(t("pay_error_link", "Could not open payment link. Please try again."));
    }
  };

  const handleGooglePlayPurchase = () => {
    setPlayBillingLoading(true);
    setErrorMessage(null);

    purchaseTierViaGooglePlay(
      tier.id,
      () => {
        setPlayBillingLoading(false);
        saveThankYouBackgroundForever(tier.id);
        if (onSuccess) {
          onSuccess(tier.id);
        } else {
          onClose();
        }
      },
      (err) => {
        setPlayBillingLoading(false);
        setErrorMessage(
          err?.message ||
            t(
              "pay_error_google_play",
              "Google Play purchase could not be completed. You can also support via Buy Me a Coffee below."
            )
        );
      }
    );
  };

  const handleManualConfirmDonation = () => {
    saveThankYouBackgroundForever(tier.id);
    if (onSuccess) {
      onSuccess(tier.id);
    } else {
      onClose();
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;
    setRedeemLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    const result = await redeemPromoCode(promoCodeInput);
    setRedeemLoading(false);

    if (result.success) {
      setPromoSuccess(result.message);
      setPromoCodeInput("");
      setTimeout(() => {
        if (onSuccess) {
          onSuccess("party_pack_root_beer_tier");
        } else {
          onClose();
        }
      }, 1200);
    } else {
      setPromoError(result.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-amber-900/10 dark:border-amber-500/20 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber Header Band */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white p-5 text-center relative">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close", "Close")}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
          <div className="text-3xl mb-1">🍺</div>
          <h2 className="text-xl font-bold tracking-tight">{tier.name}</h2>
          <p className="text-xs text-amber-100/90 mt-1">{tier.displayPrice} • {tier.tagline}</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-zinc-800 dark:text-zinc-200 text-sm">
          {/* Perks Summary */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 space-y-2">
            <h3 className="font-semibold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">
              {t("pay_perks_title", "What You Unlock Forever")}
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>{tier.perks?.backgrounds || tier.bonus.label}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>{tier.perks?.aiGenerations || `+${tier.bonus.aiBackgrounds} AI slots`}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>{tier.perks?.adFree || (tier.bonus.noAdsForever ? "Lifetime Ad-Free" : "Standard ads")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span>{tier.perks?.celebration || "Supporter thank-you & mascot"}</span>
              </li>
            </ul>
          </div>

          {/* Android Google Play In-App Billing Option */}
          {isAndroidMedian && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleGooglePlayPurchase}
                disabled={playBillingLoading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {playBillingLoading ? (
                  <span>{t("processing", "Connecting to Google Play...")}</span>
                ) : (
                  <>
                    <span>Google Play Billing ({tier.displayPrice})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Web Payment Options (Buy Me a Coffee & PayPal) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {isAndroidMedian
                ? t("pay_or_web", "Or Support via Web Checkout")
                : t("pay_support_via", "Support via Online Checkout")}
            </h4>

            {/* Direct BMC Extra link for this exact tier */}
            <button
              type="button"
              onClick={() => handleOpenWebPayment("buymeacoffee", "Buy Me a Coffee")}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>☕</span>
              <span>Buy Me a Coffee ({tier.displayPrice})</span>
            </button>

            {/* PayPal Option */}
            <button
              type="button"
              onClick={() => handleOpenWebPayment("paypal", "PayPal")}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all flex items-center justify-center gap-2"
            >
              <span>🅿️</span>
              <span>PayPal ({tier.displayPrice})</span>
            </button>
          </div>

          {/* Post-Checkout Confirmation Button */}
          {hasOpenedCheckout && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/50 rounded-2xl space-y-2 text-center animate-in fade-in duration-300">
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                {t("pay_opened_notice", "Opened {{provider}} in your browser. Completed your contribution?", {
                  provider: selectedProvider || "checkout",
                })}
              </p>
              <button
                type="button"
                onClick={handleManualConfirmDonation}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
              >
                {t("pay_confirm_unlock", "I Contributed — Unlock My Perks Now! 🎉")}
              </button>
            </div>
          )}

          {/* Promo Code Vault Entry */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <form onSubmit={handleRedeemPromo} className="space-y-2">
              <label htmlFor="promo_code_input" className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {t("promo_code_label", "Have a VIP / Supporter Code?")}
              </label>
              <div className="flex gap-2">
                <input
                  id="promo_code_input"
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  placeholder="PAL-XXXX-XXXX"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={redeemLoading || !promoCodeInput.trim()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-40"
                >
                  {redeemLoading ? "..." : t("redeem", "Redeem")}
                </button>
              </div>
              {promoError && <p className="text-[11px] text-red-600 dark:text-red-400">{promoError}</p>}
              {promoSuccess && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{promoSuccess}</p>}
            </form>
          </div>

          {errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center font-medium bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-200 dark:border-red-800/40">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
