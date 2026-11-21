// src/routes/__root.tsx
// FIXED — v2 — Rebuilt from the REAL pasted file.
// WHAT WAS BROKEN — READ THIS, DO NOT REVERT:
// BUG 1 — <html lang="en" dir="ltr"> hardcoded, never updated.
//   Pasted RootShell rendered <html lang="en" dir="ltr"> always. If the user
//   saved Thai or Arabic, the HTML still said lang="en" dir="ltr". Screen
//   readers announced the wrong language, Arabic stayed left-to-right, and
//   SEO / browser translate got the wrong language.
//   i18n.fixed.ts DOES set documentElement.lang/dir on languageChanged, but
//   languageChanged only fires when the language CHANGES, not on init. If the
//   user starts in Arabic (stored lang = ar), init sets lng = ar but no
//   languageChanged fires, so the <html> stayed en / ltr until the user
//   changed language again. FIX: RootShell now renders
//   <html lang={i18n.language} dir={getDir(i18n.language)}> for the first
//   paint, and RootComponent has a useEffect that syncs documentElement.lang
//   and dir on mount AND on every languageChanged. getDir returns "rtl" only
//   for ar (plus he / fa / ur for future), "ltr" for the other 13 languages.
//   NOTE: RootShell is shellComponent — it does NOT re-render on language
//   change. The live update comes from the RootComponent effect that writes
//   directly to document.documentElement. Do NOT try to make RootShell reactive
//   by putting useState in it; the effect is the correct fix.
// BUG 2 — 404 + error screens hardcoded English.
//   Pasted NotFoundComponent showed "Page not found" + "Back to Forecast"
//   in English always. RootErrorComponent showed "Something went wrong" +
//   "Try Again" + "Return Home" in English always. A Thai or Arabic user who
//   hit a 404 or a crash saw English, even though the rest of the app is in
//   14 languages. FIX: Both now use useTranslation with existing locale keys:
//   404 uses t("error_404_title", "Page not found") + t("error_404_desc",
//   "The page you're looking for doesn't exist or has been moved.") — both
//   exist in all 14 main locales. Error uses t("error_boundary_title",
//   "This page didn't load") + t("error_boundary_desc", "Something went wrong
//   on our end. You can try refreshing or head back home.") — both exist in
//   all 14. Buttons use t("btn_try_again", "Try again") and
//   t("nav_back_forecast", "Back to Forecast") (extras, with English fallback).
//   No new locale keys were invented.
// BUG 3 — Error screen leaked raw error.message to the user.
//   Pasted RootErrorComponent rendered error.message directly. If the error
//   contained a fetch URL, coords, an API key fragment, or an internal path,
//   it leaked to the screen and to screenshots. FIX: Error screen now shows
//   only the generic translated error_boundary_desc. Raw error.message is
//   shown ONLY in dev, inside a <details> block, via import.meta.env.DEV.
//   In production it is never rendered. The error is still logged to console
//   in dev for debugging.
// BUG 4 — Service-worker cleanup left stale caches when no SW was registered.
//   Pasted code deleted caches ONLY if regs.length > 0. If a previous version
//   had already unregistered the SW but left its caches, the next load saw
//   regs.length = 0 and skipped cache deletion, so stale caches stayed forever
//   and devices could keep running a stale build. FIX: Always delete caches,
//   not only when regs.length > 0. Unregister + delete caches on every mount.
//   This is intentional — this app is NOT offline / PWA. Do NOT re-add a
//   service worker without removing this cleanup first.
// BUG 5 — Font size did not apply on 404 / error / gallery / privacy pages.
//   Pasted font-size logic lived only in AppMenu, which only mounts on the
//   home page. If the user set 130% then went to /gallery or hit a 404, the
//   page rendered at 100%. FIX: RootComponent now applies the persisted font
//   size on mount, validated to 100% / 115% / 130% only. Same validation as
//   AppMenu.fixed.tsx. Tampered localStorage like "999%" is ignored and falls
//   back to 100%. AppMenu still owns the font-size UI; Root just applies it
//   on every page so 404 / error are not left at 100%.
// BUG 6 — "Return Home" used SPA navigation, could re-trigger the same crash.
//   Pasted RootErrorComponent did navigate({ to: "/" }). If the crash was in
//   the home page itself, SPA navigation re-ran the same crashing code and
//   showed the error again, with no way out. FIX: "Return Home" now does
//   window.location.href = "/" — a full hard reload that clears bad React
//   state. "Try Again" still uses reset() (SPA retry) for transient errors.
//   Keep that distinction.
// KEPT AS-IS: createRootRouteWithContext, head meta (charSet, viewport,
//   theme-color #0284c7, application-name, apple-mobile-web-app-*, format-
//   detection, description, og:site_name), favicon link, shellComponent,
//   component, notFoundComponent, errorComponent, ScrollRestoration inside
//   I18nextProvider, service-worker unregister intent, 404 "404" number,
//   error layout / classes, export default RootComponent.
import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

import "@/styles.css";

interface MyRouterContext {
  queryClient: QueryClient;
}

// FIXED BUG 1: dir helper — only ar is RTL among the 14 shipped languages.
// he / fa / ur included for future, so a future locale does not stay LTR.
function getDir(lang: string): "rtl" | "ltr" {
  const code = (lang || "en").toLowerCase().split("-")[0];
  return code === "ar" || code === "he" || code === "fa" || code === "ur"
    ? "rtl"
    : "ltr";
}

// FIXED BUG 5: Validate font size — same allow-list as AppMenu.fixed.tsx.
function getPersistedFontSize(): string {
  try {
    if (typeof window === "undefined") return "100%";
    const stored = window.localStorage.getItem("weather:font-size") || "100%";
    if (stored === "100%" || stored === "115%" || stored === "130%") {
      return stored;
    }
  } catch {}
  return "100%";
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0284c7" },
      { name: "application-name", content: "My Weather Pal" },
      { name: "apple-mobile-web-app-title", content: "Weather Pal" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "format-detection", content: "telephone=no" },
      {
        name: "description",
        content:
          "Private local weather with atmospheric art. No accounts, no trackers.",
      },
      {
        property: "og:site_name",
        content: "My Weather Pal",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // FIXED BUG 1: Do NOT hardcode lang="en" dir="ltr". Use the current
  // i18n language for the first paint. On the server i18n.language is "en"
  // (no localStorage), on the client it is the saved language. The live
  // update on language change comes from the RootComponent effect below,
  // because shellComponent does not re-render on language change.
  const lang = i18n.language || "en";
  return (
    <html lang={lang} dir={getDir(lang)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // FIXED BUG 1: Sync <html> lang + dir on mount and on every language change.
  // i18n.fixed.ts already does this on languageChanged, but that event does
  // NOT fire on init, so a user starting in Arabic would stay en / ltr.
  // This effect fixes the init case. It is safe to run twice — same values.
  useEffect(() => {
    const syncLangDir = (lng: string) => {
      try {
        document.documentElement.lang = lng || "en";
        document.documentElement.dir = getDir(lng || "en");
      } catch {}
    };
    syncLangDir(i18n.language || "en");
    const onLangChanged = (lng: string) => syncLangDir(lng);
    i18n.on("languageChanged", onLangChanged);
    return () => {
      i18n.off("languageChanged", onLangChanged);
    };
  }, []);

  // FIXED BUG 5: Apply persisted font size on every page, not only home.
  useEffect(() => {
    try {
      document.documentElement.style.fontSize = getPersistedFontSize();
    } catch {}
  }, []);

  // Remove any offline copy left by older versions so devices never run a stale build.
  // FIXED BUG 4: Always delete caches, not only when regs.length > 0.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => void r.unregister());
        // Always clear caches — a previous run may have unregistered the SW
        // but left its caches, and regs.length would be 0 on the next load.
        if ("caches" in window) {
          void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Outlet />
      <ScrollRestoration />
    </I18nextProvider>
  );
}

function NotFoundComponent() {
  // FIXED BUG 2: Translated 404 — was hardcoded English.
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-2">404</h1>
      <p className="text-muted-foreground mb-2">
        {t("error_404_title", "Page not found")}
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        {t(
          "error_404_desc",
          "The page you're looking for doesn't exist or has been moved."
        )}
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-95 transition"
      >
        {t("nav_back_forecast", "Back to Forecast")}
      </Link>
    </div>
  );
}

function RootErrorComponent({ error, reset }: ErrorComponentProps) {
  // FIXED BUG 2 + BUG 3: Translated, generic message. No raw error leak.
  const { t } = useTranslation();

  // Show raw error only in dev, inside <details>. Never in production.
  const isDev =
    typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  // Log for debugging in dev only — do not render it in production.
  useEffect(() => {
    if (isDev && error) {
      // eslint-disable-next-line no-console
      console.error("[My Weather Pal] Route error:", error);
    }
  }, [error, isDev]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">
        {t("error_boundary_title", "This page didn't load")}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {t(
          "error_boundary_desc",
          "Something went wrong on our end. You can try refreshing or head back home."
        )}
      </p>
      {isDev && rawMessage && (
        <details className="max-w-md mb-6 text-left text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
          <summary className="cursor-pointer font-semibold">Error details (dev only)</summary>
          <p className="mt-2 break-words">{rawMessage}</p>
        </details>
      )}
      <div className="flex items-center gap-3">
        {reset && (
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold transition cursor-pointer"
          >
            {t("btn_try_again", "Try again")}
          </button>
        )}
        <button
          type="button"
          // FIXED BUG 6: Hard reload, not SPA navigate. If the crash was in
          // the home page, SPA navigate would re-run the same crashing code.
          onClick={() => {
            window.location.href = "/";
          }}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-95 transition cursor-pointer"
        >
          {t("nav_back_forecast", "Back to Forecast")}
        </button>
      </div>
    </div>
  );
}

export default RootComponent;
