// src/lib/i18n.ts
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

function buildResourceBundle(langJson: Record<string, string>, langCode: string) {
  return {
    translation: {
      ...enJson,
      ...(extraResources["en"] || {}),
      ...(extraResourcesPart2["en"] || {}),
      ...(extraResourcesPart3["en"] || {}),
      ...(extraResourcesPart4["en"] || {}),
      ...(extraResources[langCode] || {}),
      ...(extraResourcesPart2[langCode] || {}),
      ...(extraResourcesPart3[langCode] || {}),
      ...(extraResourcesPart4[langCode] || {}),
      ...langJson,
    },
  };
}

export const resources: Record<string, { translation: Record<string, string> }> = {
  en: {
    translation: {
      ...enJson,
      ...(extraResources["en"] || {}),
      ...(extraResourcesPart2["en"] || {}),
      ...(extraResourcesPart3["en"] || {}),
      ...(extraResourcesPart4["en"] || {}),
    },
  },
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
  lng: "en",
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
  const lng = detectInitialLanguage();
  if (lng && lng !== i18n.language) {
    void i18n.changeLanguage(lng);
  }
}

export default i18n;
