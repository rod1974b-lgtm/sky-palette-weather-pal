// src/routes/privacy.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applyPersistedLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — My Weather Pal" },
      {
        name: "description",
        content:
          "Privacy Policy for My Weather Pal: private local weather, AI watercolor generation, on-device IndexedDB storage, and Google Play Data Safety.",
      },
      { property: "og:title", content: "Privacy Policy — My Weather Pal" },
      {
        property: "og:description",
        content:
          "Privacy Policy for My Weather Pal: private local weather, AI watercolor generation, on-device IndexedDB storage, and Google Play Data Safety.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacy,
});

const EMAIL = "rod1974b@gmail.com";
const ANDROID_PACKAGE = "co.median.android.odeqrey";

function Privacy() {
  const { t, i18n } = useTranslation();

  // The route's static head() is English-only, so keep the browser tab title and
  // social preview text in step with the chosen language.
  useEffect(() => {
    applyPersistedLanguage();
    const title = t("privacy_meta_title", "Privacy Policy — My Weather Pal");
    const desc = t(
      "privacy_meta_desc",
      "Privacy Policy for My Weather Pal: private local weather, AI watercolor generation, on-device IndexedDB storage, and Google Play Data Safety.",
    );
    document.title = title;
    const setMeta = (selector: string, content: string) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', desc);
  }, [t, i18n.language]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-foreground">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:underline">
        {t("privacy_back", "← Back to weather")}
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("privacy_title", "Privacy Policy")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("privacy_updated", "Last updated: November 15, 2026")}</p>

      <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p>
          {t(
            "privacy_intro",
            "This Privacy Policy explains how My Weather Pal handles information. We are committed to private-by-default software: no mandatory accounts, no surveillance, and transparent on-device storage."
          )}{" "}
          (Android package <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{ANDROID_PACKAGE}</code>)
        </p>

        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t("privacy_s1_title", "1. No Account Required")}</h2>
          <p>
            {t(
              "privacy_s1_body",
              "You can use all features of My Weather Pal without signing up, logging in, or providing personal details such as your name, email address, phone number, or social logins."
            )}
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("privacy_s2_title", "2. Weather & Location Data")}
          </h2>
          <p>
            {t(
              "privacy_s2_body",
              "When you tap the location button, the App requests your device's GPS coordinates solely to fetch live local forecasts, air quality indices, and disaster alerts for your area:"
            )}
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>{t("privacy_s2_item1_label", "On-Demand Only:")}</strong>{" "}
              {t(
                "privacy_s2_item1",
                "Location is only accessed when you explicitly tap the GPS button. You can always choose to search for a city manually instead."
              )}
            </li>
            <li>
              <strong>{t("privacy_s2_item2_label", "Reverse Geocoding:")}</strong>{" "}
              {t(
                "privacy_s2_item2",
                "Coordinates are resolved to a readable place name using the privacy-focused Photon service."
              )}
            </li>
            <li>
              <strong>{t("privacy_s2_item3_label", "Zero Movement Tracking:")}</strong>{" "}
              {t(
                "privacy_s2_item3",
                "We do not log your movement, record travel history, or store GPS coordinates on our servers."
              )}
            </li>
            <li>
              <strong>{t("privacy_s2_item4_label", "Permission Controls:")}</strong>{" "}
              {t(
                "privacy_s2_item4",
                "You can revoke location access at any time in your device or browser settings."
              )}
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("privacy_s3_title", "3. AI Gallery & Image Processing")}
          </h2>
          <p>
            {t(
              "privacy_s3_body",
              "My Weather Pal features an AI Watercolor Gallery that displays city landmark art, allows generating custom watercolor scenes, and supports personal background photos:"
            )}
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>{t("privacy_s3_item1_label", "AI Scene Generation:")}</strong>{" "}
              {t(
                "privacy_s3_item1",
                "Text prompts are transmitted securely over HTTPS to synthesize artwork and are not linked to any user identity."
              )}
            </li>
            <li>
              <strong>{t("privacy_s3_item2_label", "User-Uploaded Photos:")}</strong>{" "}
              {t(
                "privacy_s3_item2",
                "Uploaded photos are processed entirely on-device and are never uploaded to cloud storage."
              )}
            </li>
            <li>
              <strong>{t("privacy_s3_item3_label", "Local IndexedDB Storage:")}</strong>{" "}
              {t(
                "privacy_s3_item3",
                "All created watercolor scenes and background photos are stored exclusively on your device inside WeatherPalArtDB."
              )}
            </li>
            <li>
              <strong>{t("privacy_s3_item4_label", "Landmark Photography:")}</strong>{" "}
              {t(
                "privacy_s3_item4",
                "Landmark photographs are loaded from Wikipedia and Wikimedia Commons with no personal data sent."
              )}
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("privacy_s4_title", "4. On-Device Storage (LocalStorage & IndexedDB)")}
          </h2>
          <p>
            {t(
              "privacy_s4_body",
              "The App uses on-device browser storage (localStorage and IndexedDB) to preserve your preferences and enable offline functionality:"
            )}
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>{t("privacy_s4_item1", "Favorite cities and recent searches (weather:favorites).")}</li>
            <li>{t("privacy_s4_item2", "Measurement units and text size preferences.")}</li>
            <li>{t("privacy_s4_item3", "Sky background themes and clothing occasion filters.")}</li>
            <li>{t("privacy_s4_item4", "Selected language preference (weather:lang).")}</li>
            <li>{t("privacy_s4_item5", "Cached weather forecasts for instant loading.")}</li>
            <li>{t("privacy_s4_item6", "Your custom artwork collection and city backgrounds in IndexedDB.")}</li>
          </ul>
          <p className="mt-2">
            {t(
              "privacy_s4_footer",
              "This data never leaves your device. You can erase all stored data at any time by clearing browser site data or App storage."
            )}
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("privacy_s5_title", "5. Third-Party Data Providers & Android SDKs")}
          </h2>
          <p>
            {t(
              "privacy_s5_body",
              "To deliver real-time weather, warnings, artwork, and app functionality, the App interacts with these services:"
            )}
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <a className="underline hover:text-foreground" href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">
                Open-Meteo
              </a>{" "}
              — {t("privacy_s5_openmeteo", "Hourly/7-day weather forecasts, air quality (AQI), UV index, and river flood advisories.")}
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://photon.komoot.io" target="_blank" rel="noreferrer">
                Photon (Komoot / OpenStreetMap)
              </a>{" "}
              — {t("privacy_s5_photon", "City name search and GPS reverse-geocoding.")}
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://data.tmd.go.th" target="_blank" rel="noreferrer">
                Thai Meteorological Department (TMD)
              </a>{" "}
              — {t("privacy_s5_tmd", "Official weather warnings and monsoon bulletins for Thailand.")}
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://www.usgs.gov/privacy-policies" target="_blank" rel="noreferrer">
                USGS
              </a>{" "}
              — {t("privacy_s5_usgs", "Global seismic activity feeds (M4.5+).")}
            </li>
            <li>
              <a className="underline hover:text-foreground" href="https://www.weather.gov/privacy" target="_blank" rel="noreferrer">
                U.S. National Weather Service (NWS)
              </a>{" "}
              — {t("privacy_s5_nws", "Severe weather warnings and watches.")}
            </li>
            <li>
              <strong>{t("privacy_s5_google_play_label", "Google Play In-App Billing:")}</strong>{" "}
              {t("privacy_s5_google_play", "Handles secure purchases of supporter tiers without exposing card details to us.")}
            </li>
            <li>
              <strong>{t("privacy_s5_admob_label", "Google AdMob (Android App):")}</strong>{" "}
              {t("privacy_s5_admob", "Used exclusively for optional rewarded ads (e.g. unlocking a temporary 24-hour gallery slot).")}
            </li>
            <li>
              <strong>{t("privacy_s5_median_label", "Median.co:")}</strong>{" "}
              {t("privacy_s5_median", "The native application shell packaging the web experience for Android devices.")}
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t("privacy_s6_title", "6. What We Never Do")}</h2>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>{t("privacy_s6_item1", "We do not sell, rent, broker, or monetize your personal data.")}</li>
            <li>{t("privacy_s6_item2", "We do not track you across other apps or websites for targeted advertising.")}</li>
            <li>{t("privacy_s6_item3", "We do not access your address book, microphone, contacts, or calendar.")}</li>
            <li>{t("privacy_s6_item4", "We do not transmit personal photos from your device to any cloud server.")}</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {t("privacy_s7_title", "7. Data Retention & Deletion Rights (GDPR & CCPA)")}
          </h2>
          <p>
            {t(
              "privacy_s7_body",
              "Because we do not operate a centralized database or store user accounts, we do not retain identifiable personal records:"
            )}
          </p>
          <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
            <li>
              <strong>{t("privacy_s7_item1_label", "Delete Stored Data:")}</strong>{" "}
              {t("privacy_s7_item1", "Clear App storage or browser cache to wipe all saved cities, settings, and paintings immediately.")}
            </li>
            <li>
              <strong>{t("privacy_s7_item2_label", "Revoke Permissions:")}</strong>{" "}
              {t("privacy_s7_item2", "Disable Location access anytime in Android device settings.")}
            </li>
            <li>
              <strong>{t("privacy_s7_item3_label", "Uninstall:")}</strong>{" "}
              {t("privacy_s7_item3", "Removing the App completely removes all local data files created by the App.")}
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t("privacy_s8_title", "8. Children's Privacy")}</h2>
          <p>
            {t(
              "privacy_s8_body",
              "My Weather Pal is a general-audience utility designed to be safe for all ages. We do not knowingly collect personal information from children under 13."
            )}
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t("privacy_s9_title", "9. Changes to This Policy")}</h2>
          <p>
            {t(
              "privacy_s9_body",
              "We may occasionally update this Privacy Policy as new features or data providers are integrated. Any changes will be published directly on this page."
            )}
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-2 border-t border-border/40 pt-4">
          <h2 className="text-lg font-semibold text-foreground">{t("privacy_s10_title", "10. Contact Us")}</h2>
          <p>
            {t("privacy_s10_body", "If you have questions, feedback, or data privacy requests regarding My Weather Pal, please reach out directly:")}
          </p>
          <p>
            {t("privacy_s10_email_label", "Email:")}{" "}
            <a className="font-medium underline hover:text-foreground" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
