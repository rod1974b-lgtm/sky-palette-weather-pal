// src/components/PaymentModal.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  SUPPORTED_TIERS,
  unlockTierLocally,
  saveTierPurchaseReceipt,
  type SupporterTier,
} from "@/lib/monetization";
import { redeemPromoCode, type PromoRedeemResult } from "@/lib/promoCodes";

interface PaymentModalProps {
  tierId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaymentModal({ tierId, onClose, onSuccess }: PaymentModalProps) {
  const { t } = useTranslation();
  const [selectedTierId, setSelectedTierId] = useState<string>(tierId);
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const tier: SupporterTier =
    SUPPORTED_TIERS.find((t) => t.id === selectedTierId) || SUPPORTED_TIERS[0]!;

  const handleSimulatePurchase = (method: "Card" | "GPay" | "ApplePay") => {
    setIsProcessing(true);
    setTimeout(() => {
      unlockTierLocally(tier.id);
      saveTierPurchaseReceipt({
        orderId: `SIM-${Date.now()}`,
        tierId: tier.id,
        tierName: tier.name,
        amount: tier.price,
        currency: "USD",
        method,
        timestamp: Date.now(),
      });
      setIsProcessing(false);
      alert(t("payment_success", `Thank you for your ${tier.name} support!`));
      onSuccess?.();
      onClose();
    }, 800);
  };

  const handleRedeemPromo = async () => {
    if (!promoInput.trim()) return;
    setIsProcessing(true);
    setPromoStatus(null);
    try {
      const res: PromoRedeemResult = await redeemPromoCode(promoInput.trim(), tier.name);
      if (res.success) {
        unlockTierLocally(tier.id);
        setPromoStatus(t("promo_success", "Code applied! Enjoy your unlocked slots."));
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setPromoStatus(res.message || t("promo_invalid", "Invalid or expired promo code"));
      }
    } catch {
      setPromoStatus(t("promo_error", "Failed to verify promo code"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-5 rounded-3xl bg-background border border-border shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>{t("supporter_tiers", "Supporter Tiers")}</DialogTitle>
          <DialogDescription>
            {t("unlock_with_root_beer", "Unlock with Root Beer")}
          </DialogDescription>
        </VisuallyHidden>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>⚡</span>
              <span>{t("supporter_tiers", "Supporter Tiers")}</span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Tier Selector Chips */}
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_TIERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTierId(item.id)}
                className={`p-2 rounded-2xl border text-center transition cursor-pointer ${
                  selectedTierId === item.id
                    ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                    : "border-border/60 bg-card text-muted-foreground hover:border-border"
                }`}
              >
                <p className="text-xs font-bold truncate">
                  {item.id === "small_root_beer_tier"
                    ? t("small_root_beer", "Small Root Beer")
                    : item.name}
                </p>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {item.displayPrice}
                </p>
              </button>
            ))}
          </div>

          {/* Tier Details Card */}
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {tier.id === "small_root_beer_tier"
                    ? t("small_root_beer", "Small Root Beer")
                    : tier.name}
                </h3>
                <p className="text-xs text-muted-foreground">{tier.tagline}</p>
              </div>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">
                {tier.displayPrice}
              </span>
            </div>

            {/* Perks list */}
            <div className="space-y-1.5 text-xs text-foreground/90 pt-1">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">✓</span>
                <span>
                  {t(
                    "paywall_benefit_city_landmark",
                    "2 permanent slots for city landmark wallpapers"
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">✓</span>
                <span>
                  {tier.bonus.aiBackgrounds} {t("ai_studio", { slot: tier.bonus.aiBackgrounds })}
                </span>
              </div>
              {tier.durationDays && (
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>{tier.durationDays} {t("days_ad_free", "Days Ad-Free")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Actions */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSimulatePurchase("Card")}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:brightness-105 transition cursor-pointer disabled:opacity-50"
            >
              ⚡ {t("unlock_with_root_beer", "Unlock with Root Beer")} ({tier.displayPrice})
            </button>
          </div>

          {/* Promo Code Input */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t("have_promo_code", "Have an offline promo code?")}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="WPL-XXXX-XXXX"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-background uppercase font-mono"
              />
              <button
                type="button"
                disabled={isProcessing || !promoInput.trim()}
                onClick={handleRedeemPromo}
                className="px-3 py-2 rounded-xl bg-muted font-bold text-xs hover:bg-muted/80 transition cursor-pointer disabled:opacity-50"
              >
                {t("apply", "Apply")}
              </button>
            </div>
            {promoStatus && (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {promoStatus}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
