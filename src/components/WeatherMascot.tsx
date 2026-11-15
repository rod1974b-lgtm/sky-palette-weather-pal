// src/components/WeatherMascot.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Weather } from "@/lib/weather";
import {
  MASCOTS,
  type Mascot,
  getActiveMascot,
  setActiveMascot,
  isMascotUnlocked,
  isMascotVisible,
  setMascotVisible,
  getMascotSpeech,
  playCozyChime,
} from "@/lib/mascots";
import { PaymentModal } from "@/components/PaymentModal";

interface WeatherMascotProps {
  weather: Weather | null;
  className?: string;
}

export const WeatherMascot: React.FC<WeatherMascotProps> = ({ weather, className = "" }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language?.toLowerCase().split("-")[0] || "en";

  const [activeMascot, setCurrentMascot] = useState<Mascot>(() => getActiveMascot());
  const [visible, setVisible] = useState<boolean>(() => isMascotVisible());
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [paymentModalTier, setPaymentModalTier] = useState<string | null>(null);

  useEffect(() => {
    const handleMascotChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mascotId: string }>;
      if (customEvent.detail?.mascotId) {
        const found = MASCOTS.find((m) => m.id === customEvent.detail.mascotId);
        if (found) setCurrentMascot(found);
      }
    };

    const handleVisibilityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ visible: boolean }>;
      if (typeof customEvent.detail?.visible === "boolean") {
        setVisible(customEvent.detail.visible);
      }
    };

    window.addEventListener("weather:mascot-change", handleMascotChange);
    window.addEventListener("weather:mascot-visibility-change", handleVisibilityChange);

    return () => {
      window.removeEventListener("weather:mascot-change", handleMascotChange);
      window.removeEventListener("weather:mascot-visibility-change", handleVisibilityChange);
    };
  }, []);

  const handleTapMascot = () => {
    playCozyChime();
    const dialogue = getMascotSpeech(activeMascot, weather, lang);
    setSpeechBubble(dialogue);

    // Auto dismiss bubble after 6 seconds
    setTimeout(() => {
      setSpeechBubble((prev) => (prev === dialogue ? null : prev));
    }, 6000);
  };

  const handleSelectMascot = (m: Mascot) => {
    if (!isMascotUnlocked(m.id)) {
      // Map mascot required tier to payment tier id
      const tierIdMap: Record<string, string> = {
        small: "small_root_beer_tier",
        medium: "medium_root_beer_tier",
        large: "large_root_beer_tier",
        party: "party_root_beer_tier",
      };
      setPaymentModalTier(tierIdMap[m.minTier] || "small_root_beer_tier");
      return;
    }

    setActiveMascot(m.id);
    setCurrentMascot(m);
    playCozyChime();
  };

  if (!visible) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Interactive Mascot Avatar */}
      <div className="relative group cursor-pointer" onClick={handleTapMascot}>
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-300 hover:scale-110 active:scale-95 select-none ${
            activeMascot.isAnimated ? "animate-bounce" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: activeMascot.avatarSvg }}
          title={`${activeMascot.name} — ${t("tap_to_chat", "Tap to speak!")}`}
        />

        {/* Small Companion Picker Badge Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModalOpen(true);
          }}
          className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md transition hover:scale-110 cursor-pointer"
          title={t("change_mascot", "Choose Companion Mascot")}
        >
          🐾
        </button>
      </div>

      {/* Floating Speech Bubble */}
      {speechBubble && (
        <div
          className="absolute -top-16 left-0 sm:left-auto sm:right-0 z-30 max-w-[210px] sm:max-w-[260px] rounded-2xl border border-border/80 bg-card/95 px-3 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95"
          onClick={() => setSpeechBubble(null)}
        >
          <div className="flex items-start justify-between gap-1.5">
            <p className="leading-snug">{speechBubble}</p>
            <button
              className="text-muted-foreground hover:text-foreground text-[10px] p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                setSpeechBubble(null);
              }}
            >
              ✕
            </button>
          </div>
          {/* Triangular Bubble Tail */}
          <div className="absolute -bottom-1.5 left-6 w-3 h-3 rotate-45 bg-card/95 border-r border-b border-border/80" />
        </div>
      )}

      {/* Mascot Companion Selector Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>🐾</span>
                  <span>{t("mascot_pals_title", "Root Beer Mascot Companions")}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("mascot_pals_sub", "Your weather sidekick unlocked with Root Beer tiers")}
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mascots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MASCOTS.map((m) => {
                const unlocked = isMascotUnlocked(m.id);
                const active = activeMascot.id === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMascot(m)}
                    className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border transition text-center cursor-pointer ${
                      active
                        ? "border-amber-500 bg-amber-500/10 shadow-sm"
                        : unlocked
                        ? "border-border/70 bg-card hover:bg-muted/60"
                        : "border-border/40 bg-muted/20 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* SVG Avatar */}
                    <div
                      className="w-14 h-14 mb-2 select-none"
                      dangerouslySetInnerHTML={{ __html: m.avatarSvg }}
                    />

                    <div className="w-full">
                      <span className="font-bold text-xs text-foreground block truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate mb-1">
                        {m.title}
                      </span>

                      {/* Status / Unlock Pill */}
                      {active ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                          ✓ {t("active", "Active")}
                        </span>
                      ) : unlocked ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {t("unlocked", "Unlocked")}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground border border-border/60">
                          🔒 {m.tierLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visibility Toggle Switch */}
            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {t("show_mascot_on_hero", "Show companion on weather card")}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !visible;
                  setVisible(next);
                  setMascotVisible(next);
                }}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                  visible
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {visible ? t("enabled", "Enabled") : t("hidden", "Hidden")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Root Beer Donation Modal Trigger for Locked Mascots */}
      {paymentModalTier && (
        <PaymentModal
          tierId={paymentModalTier}
          onClose={() => setPaymentModalTier(null)}
          onSuccess={() => {
            setPaymentModalTier(null);
          }}
        />
      )}
    </div>
  );
};

export default WeatherMascot;
