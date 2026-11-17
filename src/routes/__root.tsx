// src/routes/__root.tsx
import {
  Outlet,
  ScrollRestoration,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

import "@/styles.css";

interface MyRouterContext {
  queryClient: QueryClient;
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
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
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
  // Remove any offline copy left by older versions so devices never run a stale build.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => void r.unregister());
        if (regs.length && "caches" in window) {
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
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link
        to="/"
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-95 transition"
      >
        Back to Forecast
      </Link>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {error.message || "An unexpected error occurred while loading this view."}
      </p>
      <button
        type="button"
        onClick={() => navigate({ to: "/" })}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-95 transition cursor-pointer"
      >
        Return Home
      </button>
    </div>
  );
}

export default RootComponent;
