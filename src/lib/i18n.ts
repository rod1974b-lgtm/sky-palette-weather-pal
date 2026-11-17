// src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enJson from "@/locales/en.json";
import { extraResources } from "./i18nExtra";
import { extraResourcesPart2 } from "./i18nExtraPart2";

export const baseKeys = enJson;

// Combine primary and extra resource dictionaries
const mergedEn = { ...enJson, ...(extraResources.en || {}) };

const resources: Record<string, { translation: Record<string, string> }> = {
  en: { translation: mergedEn },
  th: { translation: { ...mergedEn, ...(extraResources.th || {}), ...(extraResourcesPart2.th || {}) } },
  es: { translation: { ...mergedEn, ...(extraResources.es || {}), ...(extraResourcesPart2.es || {}) } },
  ja: { translation: { ...mergedEn, ...(extraResources.ja || {}), ...(extraResourcesPart2.ja || {}) } },
  zh: { translation: { ...mergedEn, ...(extraResources.zh || {}), ...(extraResourcesPart2.zh || {}) } },
  hi: { translation: { ...mergedEn, ...(extraResources.hi || {}), ...(extraResourcesPart2.hi || {}) } },
  fr: { translation: { ...mergedEn, ...(extraResources.fr || {}), ...(extraResourcesPart2.fr || {}) } },
  de: { translation: { ...mergedEn, ...(extraResources.de || {}), ...(extraResourcesPart2.de || {}) } },
  pt: { translation: { ...mergedEn, ...(extraResources.pt || {}), ...(extraResourcesPart2.pt || {}) } },
  ru: { translation: { ...mergedEn, ...(extraResources.ru || {}), ...(extraResourcesPart2.ru || {}) } },
  ar: { translation: { ...mergedEn, ...(extraResources.ar || {}), ...(extraResourcesPart2.ar || {}) } },
  ko: { translation: { ...mergedEn, ...(extraResources.ko || {}), ...(extraResourcesPart2.ko || {}) } },
  id: { translation: { ...mergedEn, ...(extraResources.id || {}), ...(extraResourcesPart2.id || {}) } },
  vi: { translation: { ...mergedEn, ...(extraResources.vi || {}), ...(extraResourcesPart2.vi || {}) } },
};

function detectInitialLanguage(): string {
  try {
    if (typeof window !== "undefined") {
      const stored =
        localStorage.getItem("weather:lang") ||
        localStorage.getItem("app_language") ||
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
  } catch {}
  return "en";
}

const savedLang = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  returnEmptyString: false,
});

if (typeof window !== "undefined") {
  window.addEventListener("weather:lang-change", (e: any) => {
    const raw = e?.detail;
    const nextLang = typeof raw === "string" ? raw : raw?.lang || raw?.code;
    if (nextLang && Object.prototype.hasOwnProperty.call(resources, nextLang)) {
      i18n.changeLanguage(nextLang);
      localStorage.setItem("weather:lang", nextLang);
      localStorage.setItem("app_language", nextLang);
      document.documentElement.lang = nextLang;
    }
  });
}

if (typeof document !== "undefined") {
  document.documentElement.lang = savedLang;
}

export default i18n;
