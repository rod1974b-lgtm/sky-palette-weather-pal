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
        window.dispatchEvent(
          new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId: tier.id } })
        );
        if (onSuccess) onSuccess(tier.id);
        onClose();
      },
      (err: any) => {
        setPlayBillingLoading(false);
        setErrorMessage(
          err?.message || t("google_play_cancelled", "Google Play billing was cancelled or unavailable.")
        );
      }
    );
  };

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    setRedeemLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const res = await redeemPromoCode(promoCodeInput);
      if (res.success && res.tierId) {
        setPromoSuccess(res.message);
        if (onSuccess) onSuccess(res.tierId);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setPromoError(res.message);
      }
    } catch {
      setPromoError("Failed to redeem code. Please try again.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card/95 border-2 border-amber-500/40 rounded-3xl shadow-2xl p-4 sm:p-5 overflow-hidden text-foreground max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber Glow Accent Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close", "Close")}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-sm transition cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-1 pt-1 space-y-3.5">
          {/* Tier Header */}
          <div className="flex items-center gap-3 pr-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/30 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {tier.files?.staticTransparent ? (
                <img
                  src={tier.files.staticTransparent}
                  alt={tier.name}
                  className="w-10 h-10 object-contain drop-shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                "🍺"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground truncate">
                  {tier.name}
                </h3>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0">
                  {tier.displayPrice}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                {tier.bonus.label}
              </p>
            </div>
          </div>

          {/* Tier Perks Breakdown Card */}
          {tier.perks && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2">
              {tier.tagline && (
                <p className="text-[11px] italic text-amber-700 dark:text-amber-300 font-medium pb-1.5 border-b border-amber-500/20">
                  "{tier.tagline}"
                </p>
              )}
              <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🎨</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">{t("perk_skies", "Skies:")}</strong> {tier.perks.backgrounds}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">✨</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">{t("perk_ai", "AI Art:")}</strong> {tier.perks.aiGenerations}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🐻</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">{t("perk_mascots", "Mascots:")}</strong> {tier.perks.mascots}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🚫</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">{t("perk_ad_free", "Ad-Free:")}</strong> {tier.perks.adFree}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">🎉</span>
                  <span className="text-foreground">
                    <strong className="font-semibold text-foreground">{t("perk_celebration", "Celebration:")}</strong> {tier.perks.celebration}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error notification if any */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMessage}
            </div>
          )}

          {/* Payment Selection Options */}
          {!hasOpenedCheckout ? (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                {t("select_support_method", "Select how you'd like to support:")}
              </p>

              {/* Buy Me a Coffee Option */}
              <button
                type="button"
                onClick={() => handleOpenWebPayment("buymeacoffee", "Buy Me a Coffee")}
                className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border-2 border-amber-500/70 hover:border-amber-400 transition shadow-sm cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">☕</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>Buy Me a Coffee</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shrink-0">
                        {tier.displayPrice}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-medium line-clamp-1">
                      {t("bmc_sub", "Card, Apple Pay, Google Pay • No account")}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform shrink-0">
                  →
                </span>
              </button>

              {/* Native Google Play In-App Billing (Android Median app) */}
              {isAndroidMedian && (
                <button
                  type="button"
                  disabled={playBillingLoading}
                  onClick={handleGooglePlayPurchase}
                  className="w-full text-left p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30 border-2 border-emerald-500/70 hover:border-emerald-400 transition shadow-sm cursor-pointer flex items-center justify-between gap-3 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">▶️</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>Google Play Billing</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">
                          {tier.displayPrice}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium line-clamp-1">
                        {playBillingLoading ? t("connecting", "Connecting...") : t("google_play_sub", "Google Play Account balance")}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0">
                    →
                  </span>
                </button>
              )}

              {/* PROMO / GIFT CODE REDEMPTION BOX */}
              <div className="mt-4 pt-3.5 border-t border-border/60">
                <form onSubmit={handleRedeemCode} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>🎁</span>
                      <span>{t("have_promo_code", "Have a Gift or Promo Code?")}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="PAL-XXXX-XXXX"
                      value={promoCodeInput}
                      onChange={(e) => {
                        setPromoCodeInput(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-border bg-muted/50 text-xs font-mono font-bold tracking-wider uppercase text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={redeemLoading || !promoCodeInput.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-xs disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      {redeemLoading ? "..." : t("redeem", "Redeem")}
                    </button>
                  </div>

                  {promoError && (
                    <p className="text-[11px] text-destructive font-medium pl-1">
                      ⚠️ {promoError}
                    </p>
                  )}

                  {promoSuccess && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pl-1 animate-in fade-in">
                      {promoSuccess}
                    </p>
                  )}
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-2xl bg-muted/40 border border-border text-center">
              <span className="text-3xl">☕</span>
              <h4 className="text-xs font-bold text-foreground">
                {t("checkout_opened_title", "Checkout Tab Opened")}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {t("checkout_opened_sub", "After completing your contribution on Buy Me a Coffee, tap the button below to activate your perks:")}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveThankYouBackgroundForever(tier.id);
                    window.dispatchEvent(
                      new CustomEvent("weather:trigger-tier-thankyou", { detail: { tierId: tier.id } })
                    );
                    if (onSuccess) onSuccess(tier.id);
                    onClose();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  ✓ {t("i_completed_payment", "I Completed My Support!")}
                </button>
                <button
                  type="button"
                  onClick={() => setHasOpenedCheckout(false)}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ← {t("back_to_methods", "Back to payment options")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="mt-3 pt-2.5 border-t border-border/50 text-center shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {t("payment_disclaimer", "100% private & tracker-free. Unlocks artwork across this device instantly.")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
