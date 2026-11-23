// src/components/RedeemPromoModal.tsx
import React, { useState, useEffect } from "react";
import { verifyPromoCode, claimPromoCode, type PromoValidationResult } from "@/lib/promoCodes";


interface RedeemPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RedeemPromoModal({ isOpen, onClose }: RedeemPromoModalProps) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<PromoValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live validation on code input
  useEffect(() => {
    const formatted = code.trim().toUpperCase();
    if (formatted.length >= 20) {
      verifyPromoCode(formatted).then((res) => {
        if (res.valid) {
          setPreview(res);
          setErrorMsg(null);
        } else {
          setPreview(null);
        }
      });
    } else {
      setPreview(null);
    }
  }, [code]);

  if (!isOpen) return null;

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await claimPromoCode(code);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message);
      setCode("");
      setPreview(null);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl text-card-foreground space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>🎁</span>
            <span>Redeem Promo Code</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Enter your WPL voucher code to activate Lifetime Party Pack or Temporary Pro access.
        </p>

        <div className="space-y-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WPL-PARTY-LI-YYMMDD-XXXXX-XXXXXXXX"
            className="w-full text-xs font-mono uppercase rounded-xl border border-input/60 bg-background/90 p-3 focus:outline-hidden focus:ring-1 focus:ring-primary"
          />

          {/* Dynamic Live Preview Banner */}
          {preview && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <p className="font-bold">
                {preview.isLifetime
                  ? `🌟 Lifetime Party Pack — Redeem by ${preview.formattedDate}`
                  : `⏳ Giveaway (${preview.plan}) — Ends on ${preview.formattedDate}`}
              </p>
              <p className="text-[11px] opacity-90">
                Campaign: {preview.campaign} • Ready to claim
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            ✓ {successMsg}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-muted text-xs font-bold text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRedeem}
            disabled={isLoading || !code.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Redeem Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
