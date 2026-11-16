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
