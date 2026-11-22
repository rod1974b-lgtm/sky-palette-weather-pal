// src/lib/i18n.ts
// FIXED — Batch 6: merge order for all 4 i18nExtra parts, verified + fixed.
// PLAIN-WORDS SUMMARY:
// Your merge order was almost right. Do NOT reverse it. The order below is correct:
//   1. English main file (en.json) — so nothing is ever blank
//   2. English extras Part 1-4 — fallback if a translation is missing
//   3. Translated extras Part 1-4 for this language — Part 4 last
//   4. Main file for this language (th.json, etc.) — wins for normal words like Delete / Saved / Continue
//   5. 3 new alias keys (see below) — so the thank_you collision stops breaking one UI
//
// WHAT WAS WRONG:
// BUG 1 — English was built differently: en was hand-written (extras win over en.json),
//   but th/es/ja/... used buildResourceBundle (main file wins over extras).
//   So the same button showed one text in English and a different text in Thai.
//   Example: `continue` = "Continue to Weather" in English (from Part 4) but generic "Continue"
//   in Thai (from th.json). FIXED: en now uses the SAME buildResourceBundle as everyone else.
//   Now: main file always wins for generic keys, in ALL languages. Extras only fill gaps.
// BUG 2 — App always started in English: i18n.init used lng: "en" hardcoded, and
//   detectInitialLanguage() was never used at startup. Saved Thai was ignored until
//   applyPersistedLanguage() was called somewhere (if it was called at all).
//   FIXED: lng is now detectInitialLanguage(), so saved language loads immediately, no flash.
// BUG 3 — thank_you_unlocked collision (cannot be fixed by re-ordering alone):
//   Part 1 (supporter) and Part 4 (background) use the SAME key with DIFFERENT sentences.
//   Current order: Part 4 spread last, so Part 4 wins. Background UI is correct,
//   supporter ThankYouModal shows the background sentence (wrong).
//   No order can make BOTH right — one must lose. So this file KEEPS Part 4 winning
//   (no surprise change to working background code) AND adds 3 new safe alias keys:
//     - thank_you_bg_unlocked = Part 4 value (background)
//     - thank_you_supporter_unlocked = Part 1 value (supporter)
//     - continue_to_weather = Part 4 value for `continue` (background button)
//   Later, change ONE line in code: background UI -> t('thank_you_bg_unlocked') and
//   t('continue_to_weather'), supporter UI -> t('thank_you_supporter_unlocked').
//   Then both UIs are correct, no matter what merge order you use.
//   Until you change that code, nothing breaks — old keys keep working as before.
// WHAT WAS NOT A BUG: Spreading en.json first, then extras, then main file last.
//   That looks backwards, but it is the correct fallback chain. Do not put extras last,
//   or generic words (Delete, Saved, Continue) would be overwritten by Part 4 in every language.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import all 14 locale dictionaries from src/locales/
import enJson from "@/locales/en.json";
import thJson from "@/locales/th.json";
import esJson from "@/locales/es.json";
import jaJson from "@/locales/ja.json";
import zhJson from "@/locales/zh.json";
import hiJson from "@/locales/hi.json";
import frJson from "@/locales/fr.json";
import deJson from "@/locales/de.json";
import ptJson from "@/locales/pt.json";
import ruJson from "@/locales/ru.json";
import arJson from "@/locales/ar.json";
import koJson from "@/locales/ko.json";
import idJson from "@/locales/id.json";
import viJson from "@/locales/vi.json";

import { extraResources } from "./i18nExtra";
import { extraResourcesPart2 } from "./i18nExtraPart2";
import { extraResourcesPart3 } from "./i18nExtraPart3";
import { extraResourcesPart4 } from "./i18nExtraPart4";

export const baseKeys = enJson;

export type SupportedLang =
  | "en" | "th" | "es" | "ja" | "zh" | "hi" | "fr" | "de" | "pt" | "ru" | "ar" | "ko" | "id" | "vi";

const SUPPORTED_LANG_CODES: readonly string[] = [
  "en", "th", "es", "ja", "zh", "hi", "fr", "de", "pt", "ru", "ar", "ko", "id", "vi",
];

export function normalizeLangCode(input: unknown): SupportedLang | null {
  if (typeof input !== "string") return null;
  const parts = input.toLowerCase().split("-");
  const firstPart = parts[0] ?? "";
  const subParts = firstPart.split("_");
  const code = (subParts[0] ?? "").trim();
  if (!code) return null;
  if (SUPPORTED_LANG_CODES.includes(code as SupportedLang)) return code as SupportedLang;
  return null;
}

// Pick one key from an extra file: try this language first, fall back to English.
function getExtra(
  bundle: Record<string, Record<string, string>>,
  langCode: string,
  key: string
): string | undefined {
  return bundle[langCode]?.[key] ?? bundle["en"]?.[key];
}

function buildResourceBundle(langJson: Record<string, string>, langCode: string) {
  // Aliases for the collision in BUG 3 — computed BEFORE merging, so they survive
  // even if the main file later adds thank_you_unlocked / continue itself.
  const bgUnlocked = getExtra(extraResourcesPart4, langCode, "thank_you_unlocked");
  const supporterUnlocked = getExtra(extraResources, langCode, "thank_you_unlocked");
  const continueToWeather = getExtra(extraResourcesPart4, langCode, "continue");

  return {
    translation: {
      // 1. English main file — base, so missing keys fall back to English, never blank.
      ...enJson,
      // 2. English extras — fallback if a translated extra is missing.
      ...(extraResources["en"] || {}),
      ...(extraResourcesPart2["en"] || {}),
      ...(extraResourcesPart3["en"] || {}),
      ...(extraResourcesPart4["en"] || {}),
      // 3. Translated extras for this language — Part 4 last, so Part 4 wins over Part 1
      // for thank_you_unlocked (kept as-is, see BUG 3). This is the only place Part 4 beats Part 1.
      ...(extraResources[langCode] || {}),
      ...(extraResourcesPart2[langCode] || {}),
      ...(extraResourcesPart3[langCode] || {}),
      ...(extraResourcesPart4[langCode] || {}),
      // 4. Main file for this language — wins for generic keys (delete, saved, favorite,
      // continue, tomorrow, fair, outfit, etc.). This makes en and th/es/ja/... behave the same.
      ...langJson,
      // 5. Aliases — new keys, not in main files, so they never clash with main.
      ...(bgUnlocked ? { thank_you_bg_unlocked: bgUnlocked } : {}),
      ...(supporterUnlocked ? { thank_you_supporter_unlocked: supporterUnlocked } : {}),
      ...(continueToWeather ? { continue_to_weather: continueToWeather } : {}),
    },
  };
}

export const resources: Record<string, { translation: Record<string, string> }> = {
  // FIXED BUG 1: en now uses the SAME builder as every other language.
  // Before, en was hand-written and behaved differently.
  en: buildResourceBundle(enJson, "en"),
  th: buildResourceBundle(thJson, "th"),
  es: buildResourceBundle(esJson, "es"),
  ja: buildResourceBundle(jaJson, "ja"),
  zh: buildResourceBundle(zhJson, "zh"),
  hi: buildResourceBundle(hiJson, "hi"),
  fr: buildResourceBundle(frJson, "fr"),
  de: buildResourceBundle(deJson, "de"),
  pt: buildResourceBundle(ptJson, "pt"),
  ru: buildResourceBundle(ruJson, "ru"),
  ar: buildResourceBundle(arJson, "ar"),
  ko: buildResourceBundle(koJson, "ko"),
  id: buildResourceBundle(idJson, "id"),
  vi: buildResourceBundle(viJson, "vi"),
};

function detectInitialLanguage(): string {
  try {
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("weather:lang") ||
        localStorage.getItem("i18nextLng");
      if (stored && resources[stored]) {
        return stored;
      }
      const navLang = (navigator.language || "en").toLowerCase();
      const code = navLang.split("-")[0];
      if (code && resources[code]) {
        return code;
      }
    }
  } catch {
    // ignore
  }
  return "en";
}

i18n.use(initReactI18next).init({
  resources,
  // FIXED BUG 2: was hardcoded "en" — now starts in the saved / browser language.
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

if (typeof document !== "undefined") {
  i18n.on("languageChanged", (lng) => {
    try {
      localStorage.setItem("weather:lang", lng);
    } catch {
      // ignore
    }
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  });
}

export function applyPersistedLanguage(): void {
  // Kept for backwards compatibility — init already uses the saved language now,
  // so this is usually a no-op. Safe to keep calling it from App if you already do.
  const lng = detectInitialLanguage();
  if (lng && lng !== i18n.language) {
    void i18n.changeLanguage(lng);
  }
}

export default i18n;
