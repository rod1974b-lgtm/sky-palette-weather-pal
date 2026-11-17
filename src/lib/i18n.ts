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

// Import supplemental dictionaries to ensure legacy backward-compatibility
import { extraResources } from "./i18nExtra";
import { extraResourcesPart2 } from "./i18nExtraPart2";

export const baseKeys = enJson;

// Helper to assemble resources with enJson fallback and supplemental overrides
function buildResourceBundle(langJson: Record<string, string>, langCode: string) {
  return {
    translation: {
      ...enJson,
      ...(extraResources[langCode] || {}),
      ...(extraResourcesPart2[langCode] || {}),
      ...langJson,
    },
  };
}

export const resources: Record<string, { translation: Record<string, string> }> = {
  en: { translation: { ...enJson, ...(extraResources.en || {}) } },
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
        localStorage.getItem("app_language") ||
        localStorage.getItem("i18nextLng") ||
        localStorage.getItem("language");

      if (stored && Object.prototype.hasOwnProperty.call(resources, stored)) {
        return stored;
      }

      const navLang = navigator.language || (navigator as any).userLanguage || "";
      const code = navLang.toLowerCase().split("-")[0];
      if (code && Object.prototype.hasOwnProperty.call(resources, code)) {
        return code;
      }
    }
  } catch {
    // Fall back to default on storage errors
  }
  return "en";
}

const savedLang = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already safeguards against XSS
  },
  returnNull: false,
  returnEmptyString: false,
});

// Sync document attributes (lang, dir) and localStorage across language changes
export function applyLanguageSettings(lang: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("weather:lang", lang);
      localStorage.setItem("app_language", lang);
      localStorage.setItem("i18nextLng", lang);
    } catch {
      // Ignore storage write issues in restricted webviews
    }
  }
}

if (typeof window !== "undefined") {
  // Listen for custom language change events fired across components
  window.addEventListener("weather:lang-change", (e: any) => {
    const raw = e?.detail;
    const nextLang = typeof raw === "string" ? raw : raw?.lang || raw?.code;
    if (nextLang && Object.prototype.hasOwnProperty.call(resources, nextLang)) {
      i18n.changeLanguage(nextLang);
      applyLanguageSettings(nextLang);
    }
  });

  // Keep document attributes in sync whenever i18n triggers a change
  i18n.on("languageChanged", (lng) => {
    applyLanguageSettings(lng);
  });
}

// Initial document setup
if (typeof document !== "undefined") {
  applyLanguageSettings(savedLang);
}

export default i18n;
