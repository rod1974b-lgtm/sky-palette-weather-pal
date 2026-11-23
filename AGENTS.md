<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep weather lookup client-side through Open-Meteo and cache only the latest forecast in browser storage, because the app is intentionally account-free and private.
- Do not register a service worker; public/sw.js is a self-destructing stub and the root unregisters leftovers, because an old offline cache kept serving a crashing outdated build.

# DO NOT BREAK - Protected Areas

## AI Gallery - DO NOT TOUCH WITHOUT EXPLICIT PERMISSION
- Do NOT modify: src/components/AIGallery.tsx (replace with your real file)
- Do NOT change: gallery data source, image URLs, layout, filters, or grid logic
- Do NOT "improve" or "clean up" the gallery while working on another feature
- If a new feature needs gallery data, read it, do not rewrite it

## Translations - DO NOT TOUCH WITHOUT EXPLICIT PERMISSION
- NEVER hardcode user-facing text in .tsx / .ts files. Use t('key') only.
- NEVER edit src/locales/*.json to fix UI layout. Translation files are source of truth for text only.
- NEVER add a new UI string without adding a key to en.json and all other locales: en, th, [your languages]
- NEVER use a runtime translation widget or auto-translate on the page. Translations must come from committed locale files.
- If a key is missing, add the key, do not paste English text into the component.
